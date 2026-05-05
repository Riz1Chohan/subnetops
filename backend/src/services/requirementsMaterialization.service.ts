import { addChangeLog } from "./changeLog.service.js";
import { prisma } from "../db/prisma.js";
import { recordSecurityAuditEvent } from "./securityAudit.service.js";
import { ApiError } from "../utils/apiError.js";
import { buildRequirementImpactInventory } from "../domain/requirements/impact-registry.js";
import {
  buildRequirementMaterializationPolicySummary,
  type RequirementMaterializationPolicySummary,
} from "../domain/requirements/policy.js";
import {
  asNumber,
  asString,
  hasCapturedRequirement,
  joinNotes,
  mergeNotes,
  parseRequirementsJson,
  textIncludes,
} from "../domain/requirements/normalize.js";
import {
  buildRequirementSegments,
  buildSegmentAddressingPlans,
  buildSiteBlock,
  buildVlanCidr,
} from "../domain/requirements/apply.js";
import { consumedRequirementFields } from "../domain/requirements/traceability.js";
import type {
  RequirementsInput,
  SegmentPlan,
} from "../domain/requirements/types.js";
import {
  assertGeneratedDhcpScopeAddressingWritable,
  assertGeneratedSiteAddressingWritable,
  assertGeneratedVlanAddressingWritable,
} from "./engineeringWritePaths.js";
import {
  buildReadRepairAuthorization,
  buildReadRepairEvidence,
  buildReadRepairPolicyDecision,
  normalizeReadRepairOperation,
  type ReadRepairAuthorization,
  type ReadRepairEvidence,
  type ReadRepairOperation,
} from "./readRepairPolicy.js";

export type RequirementsMaterializationSummary = {
  createdSites: number;
  updatedSites: number;
  createdVlans: number;
  updatedVlans: number;
  createdDhcpScopes: number;
  updatedDhcpScopes: number;
  consumedFields: string[];
  impactInventoryCount: number;
  directImpactCount: number;
  reviewNotes: string[];
  reviewRequiredObjects: number;
  blockedImplementationObjects: number;
  V1MaterializationPolicy: RequirementMaterializationPolicySummary;
};

type MaterializerTx = {
  project: {
    findUnique: (args: unknown) => Promise<any>;
  };
  site: {
    findMany: (args: unknown) => Promise<any[]>;
    create: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
  };
  vlan: {
    findMany: (args: unknown) => Promise<any[]>;
    create: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
  };
  designDhcpScope?: {
    findFirst: (args: unknown) => Promise<any>;
    create: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
  };
};

function isRequirementManagedSite(site: { notes?: string | null }) {
  return textIncludes(site.notes, "Requirement materialization:");
}

function isRequirementManagedVlan(
  vlan: {
    vlanName?: string | null;
    purpose?: string | null;
    notes?: string | null;
  },
  segment: SegmentPlan,
) {
  return (
    String(vlan.vlanName ?? "").toUpperCase() === segment.vlanName ||
    textIncludes(vlan.purpose, "Requirement-derived") ||
    textIncludes(
      vlan.notes,
      `Requirement materialization for ${segment.vlanName}`,
    )
  );
}

function exclusionRangesForGateway(cidr: string, gateway?: string) {
  if (!gateway) return "[]";
  return JSON.stringify([
    {
      start: gateway,
      end: gateway,
      reason: "default gateway reserved by requirement materializer",
    },
  ]);
}

async function upsertRequirementDhcpScope(
  tx: MaterializerTx,
  projectId: string,
  siteId: string,
  vlanRecord: {
    id: string;
    vlanId: number;
    vlanName?: string | null;
    subnetCidr?: string | null;
    gatewayIp?: string | null;
    dhcpEnabled?: boolean | null;
  },
  segment: SegmentPlan,
  notes: string,
) {
  if (
    segment.implementationBlocked ||
    segment.capacitySourceType === "REVIEW_REQUIRED"
  )
    return "review-required" as const;
  if (!tx.designDhcpScope || !vlanRecord.dhcpEnabled || !vlanRecord.subnetCidr)
    return "skipped" as const;

  const existing = await tx.designDhcpScope.findFirst({
    where: {
      projectId,
      siteId,
      vlanId: vlanRecord.id,
      addressFamily: "IPV4",
    },
  });

  const scopeNotes = joinNotes([
    `Requirement-derived durable DHCP scope for VLAN ${vlanRecord.vlanId} ${segment.vlanName}.`,
    `Required by: ${segment.requiredBy.join(", ")}.`,
    `Scope CIDR: ${vlanRecord.subnetCidr}.`,
    vlanRecord.gatewayIp
      ? `Default gateway: ${vlanRecord.gatewayIp}.`
      : "Default gateway requires review.",
    "DNS servers, helper/relay targets, reservations, and lease options still require implementation review.",
    notes,
  ]);

  const scopeData = {
    siteId,
    vlanId: vlanRecord.id,
    addressFamily: "IPV4",
    scopeCidr: vlanRecord.subnetCidr,
    defaultGateway: vlanRecord.gatewayIp || null,
    excludedRangesJson: exclusionRangesForGateway(
      vlanRecord.subnetCidr,
      vlanRecord.gatewayIp || undefined,
    ),
    leaseSeconds: 86400,
    source: "requirements-materializer",
    serverLocation: "engineer-review",
    notes: mergeNotes(existing?.notes, scopeNotes),
  };

  assertGeneratedDhcpScopeAddressingWritable(
    {
      addressFamily: scopeData.addressFamily,
      scopeCidr: scopeData.scopeCidr,
      defaultGateway: scopeData.defaultGateway,
      parentSubnetCidr: vlanRecord.subnetCidr,
      segmentRole: segment.segmentRole,
    },
    "Requirements materializer",
  );

  if (existing) {
    await tx.designDhcpScope.update({
      where: { id: existing.id },
      data: scopeData,
    });
    return "updated" as const;
  }

  await tx.designDhcpScope.create({ data: { projectId, ...scopeData } });
  return "created" as const;
}

export async function materializeRequirementsForProject(
  tx: MaterializerTx,
  projectId: string,
  actorLabel?: string,
  options?: { requirementsJson?: string | null },
): Promise<RequirementsMaterializationSummary | null> {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, basePrivateRange: true, requirementsJson: true },
  });
  const requirementsSource =
    typeof options?.requirementsJson === "string"
      ? options.requirementsJson
      : project?.requirementsJson;
  const requirements = parseRequirementsJson(requirementsSource);
  if (!project || !requirements) return null;

  const siteCountCaptured = hasCapturedRequirement(requirements, "siteCount");
  const siteCount = asNumber(requirements.siteCount, 1, 1, 500);
  const existingSites = await tx.site.findMany({
    where: { projectId },
    include: { vlans: true },
    orderBy: { createdAt: "asc" },
  });
  const segments = buildRequirementSegments(requirements);
  const impactInventory = buildRequirementImpactInventory(requirements);
  const V1MaterializationPolicyBefore =
    buildRequirementMaterializationPolicySummary(requirements, {
      sites: existingSites,
      dhcpScopes: [],
    });
  const directImpactCount = impactInventory.filter(
    (item) => item.impact === "direct" && item.captured,
  ).length;
  const reviewNotes = [
    "Requirement-derived objects are conservative starting points. They must be reviewed before implementation.",
    `Requirement impact inventory covers ${impactInventory.length} fields and exposes direct/indirect requirement-to-output traceability instead of hiding selections as dead survey text.`,
    `Captured direct-impact requirement fields: ${directImpactCount}.`,
  ];
  let createdSites = 0;
  let updatedSites = 0;
  let createdVlans = 0;
  let updatedVlans = 0;
  let createdDhcpScopes = 0;
  let updatedDhcpScopes = 0;
  let reviewRequiredObjects = 0;
  let blockedImplementationObjects = 0;
  const materializedSites: any[] = [...existingSites];

  for (let index = 0; index < siteCount; index += 1) {
    const siteNumber = index + 1;
    const existing = materializedSites[index];
    const isHq = siteNumber === 1;
    const siteName =
      existing?.name || (isHq ? "Site 1 - HQ" : `Site ${siteNumber}`);
    const siteCode = existing?.siteCode || (isHq ? "HQ" : `S${siteNumber}`);
    const defaultAddressBlock =
      existing && !isRequirementManagedSite(existing)
        ? existing.defaultAddressBlock ||
          buildSiteBlock(project.basePrivateRange, index)
        : buildSiteBlock(project.basePrivateRange, index);
    const siteNotes = joinNotes([
      siteCountCaptured
        ? `Requirement materialization: ${siteName} exists because requirements requested ${siteCount} site(s).`
        : `Requirement materialization: ${siteName} is a baseline site placeholder because siteCount was not captured; site count requires review.`,
      `Source classification: siteCount=${siteCountCaptured ? "USER_PROVIDED" : "REVIEW_REQUIRED"}; implementationBlocked=${siteCountCaptured ? "false" : "true"}.`,
      `Site role model: ${asString(requirements.siteRoleModel, "unspecified")}`,
      `Site identity capture: ${asString(requirements.siteIdentityCapture, "unspecified")}`,
      `Layout: ${asString(requirements.siteLayoutModel, "unspecified")}`,
      `Physical scope: ${asString(requirements.physicalScope, "unspecified")}`,
      `Buildings/floors/closets: ${asString(requirements.buildingCount, "1")} building(s), ${asString(requirements.floorCount, "1")} floor(s), ${asString(requirements.closetModel, "unspecified")}`,
      `Edge footprint: ${asString(requirements.edgeFootprint, "unspecified")}`,
    ]);

    if (existing) {
      const siteData = {
        siteCode,
        defaultAddressBlock,
        notes: mergeNotes(existing.notes, siteNotes),
      };
      assertGeneratedSiteAddressingWritable(
        siteData,
        "Requirements materializer",
      );
      const nextSite = await tx.site.update({
        where: { id: existing.id },
        data: siteData,
        include: { vlans: true },
      });
      materializedSites[index] = nextSite;
      updatedSites += 1;
    } else {
      const siteData = {
        projectId,
        name: siteName,
        location: siteName,
        siteCode,
        defaultAddressBlock,
        notes: siteNotes,
      };
      assertGeneratedSiteAddressingWritable(
        siteData,
        "Requirements materializer",
      );
      const created = await tx.site.create({
        data: siteData,
        include: { vlans: true },
      });
      materializedSites.push(created);
      createdSites += 1;
    }
  }

  for (let index = 0; index < siteCount; index += 1) {
    const site = materializedSites[index];
    if (!site) continue;
    const existingVlans = await tx.vlan.findMany({
      where: { siteId: site.id },
      orderBy: { vlanId: "asc" },
    });
    const segmentAddressingPlans = buildSegmentAddressingPlans(
      project.basePrivateRange,
      index,
      segments,
      requirements,
    );

    for (const segment of segments) {
      const matching = existingVlans.find(
        (vlan) =>
          vlan.vlanId === segment.vlanId ||
          vlan.vlanName.toUpperCase() === segment.vlanName.toUpperCase(),
      );
      const addressing =
        segmentAddressingPlans.get(segment.vlanId) ??
        buildVlanCidr(project.basePrivateRange, index, segment.vlanId);
      if (segment.readinessImpact === "REVIEW") reviewRequiredObjects += 1;
      if (segment.implementationBlocked) blockedImplementationObjects += 1;
      const capacityLine =
        typeof segment.estimatedHosts === "number"
          ? `Direct design driver output: ${segment.estimatedHosts} captured/derived host(s), ${addressing.requiredUsableHosts} required usable address(es), /${addressing.recommendedPrefix} recommended prefix, ${addressing.cidr} selected for this site.`
          : `Capacity review required: ${segment.capacityReviewReason ?? "capacity was not captured"}. ${addressing.cidr} is a provisional planning candidate only, not final prefix-sizing evidence.`;
      const notes = joinNotes([
        `Requirement materialization for ${segment.vlanName}.`,
        `Required by: ${segment.requiredBy.join(", ")}.`,
        `Source classification: segment=${segment.sourceType}; capacity=${segment.capacitySourceType}; readinessImpact=${segment.readinessImpact}; implementationBlocked=${segment.implementationBlocked}.`,
        `Source references: ${segment.sourceRefs.join(", ")}.`,
        capacityLine,
        segment.implementationBlocked
          ? "Implementation status: blocked/review-required until capacity and intent are confirmed; DHCP scope is intentionally not implementation-ready."
          : "Implementation status: planning candidate; still requires normal engineering review before deployment.",
        addressing.gateway
          ? `Gateway convention ${asString(requirements.gatewayConvention, "first usable address as default gateway")}: ${addressing.gateway}.`
          : "Gateway requires review for this segment role.",
        addressing.allocatorExplanation ??
          "Addressing was generated from deterministic requirement materialization.",
        ...segment.reviewNotes,
      ]);

      if (matching) {
        const vlanData = {
          vlanName: isRequirementManagedVlan(matching, segment)
            ? segment.vlanName
            : matching.vlanName || segment.vlanName,
          purpose: isRequirementManagedVlan(matching, segment)
            ? segment.purpose
            : matching.purpose || segment.purpose,
          segmentRole: isRequirementManagedVlan(matching, segment)
            ? segment.segmentRole
            : matching.segmentRole || segment.segmentRole,
          subnetCidr: isRequirementManagedVlan(matching, segment)
            ? addressing.cidr
            : matching.subnetCidr || addressing.cidr,
          gatewayIp: isRequirementManagedVlan(matching, segment)
            ? (addressing.gateway ?? matching.gatewayIp)
            : matching.gatewayIp || addressing.gateway || "",
          dhcpEnabled: isRequirementManagedVlan(matching, segment)
            ? segment.dhcpEnabled
            : (matching.dhcpEnabled ?? segment.dhcpEnabled),
          estimatedHosts: isRequirementManagedVlan(matching, segment)
            ? segment.estimatedHosts
            : matching.estimatedHosts || segment.estimatedHosts,
          department: isRequirementManagedVlan(matching, segment)
            ? segment.department
            : matching.department || segment.department,
          notes: mergeNotes(matching.notes, notes),
        };
        assertGeneratedVlanAddressingWritable(
          vlanData,
          "Requirements materializer",
        );
        const nextVlan = await tx.vlan.update({
          where: { id: matching.id },
          data: vlanData,
        });
        const scopeResult = await upsertRequirementDhcpScope(
          tx,
          projectId,
          site.id,
          nextVlan,
          segment,
          notes,
        );
        if (scopeResult === "created") createdDhcpScopes += 1;
        if (scopeResult === "updated") updatedDhcpScopes += 1;
        if (scopeResult === "review-required") reviewRequiredObjects += 1;
        updatedVlans += 1;
      } else {
        const vlanData = {
          siteId: site.id,
          vlanId: segment.vlanId,
          vlanName: segment.vlanName,
          purpose: segment.purpose,
          segmentRole: segment.segmentRole,
          subnetCidr: addressing.cidr,
          gatewayIp: addressing.gateway ?? "",
          dhcpEnabled: segment.dhcpEnabled,
          estimatedHosts: segment.estimatedHosts,
          department: segment.department,
          notes,
        };
        assertGeneratedVlanAddressingWritable(
          vlanData,
          "Requirements materializer",
        );
        const nextVlan = await tx.vlan.create({
          data: vlanData,
        });
        const scopeResult = await upsertRequirementDhcpScope(
          tx,
          projectId,
          site.id,
          nextVlan,
          segment,
          notes,
        );
        if (scopeResult === "created") createdDhcpScopes += 1;
        if (scopeResult === "updated") updatedDhcpScopes += 1;
        if (scopeResult === "review-required") reviewRequiredObjects += 1;
        createdVlans += 1;
      }
    }
  }

  const refreshedSitesForPolicy = await tx.site.findMany({
    where: { projectId },
    include: { vlans: true },
    orderBy: { createdAt: "asc" },
  });
  const refreshedDhcpScopesForPolicy = tx.designDhcpScope
    ? await Promise.all(
        refreshedSitesForPolicy.map(async (site) =>
          tx.designDhcpScope?.findFirst({
            where: { projectId, siteId: site.id, addressFamily: "IPV4" },
          }),
        ),
      ).then(
        (rows) =>
          rows.filter(Boolean) as Array<{
            id?: string;
            vlanId?: string | null;
            scopeCidr?: string | null;
          }>,
      )
    : [];
  const V1MaterializationPolicy = buildRequirementMaterializationPolicySummary(
    requirements,
    {
      sites: refreshedSitesForPolicy,
      dhcpScopes: refreshedDhcpScopesForPolicy,
    },
  );

  const summary = {
    createdSites,
    updatedSites,
    createdVlans,
    updatedVlans,
    createdDhcpScopes,
    updatedDhcpScopes,
    consumedFields: consumedRequirementFields(requirements),
    impactInventoryCount: impactInventory.length,
    directImpactCount,
    reviewRequiredObjects,
    blockedImplementationObjects,
    reviewNotes: [
      ...reviewNotes,
      `V1 materialization policy evaluated ${V1MaterializationPolicy.totalPolicyCount} requirement field policy row(s); ${V1MaterializationPolicy.silentDropCount} active field(s) are silently dropped.`,
      `Pre-save materialization policy active fields: ${V1MaterializationPolicyBefore.activeFieldCount}.`,
      reviewRequiredObjects > 0
        ? `${reviewRequiredObjects} materialized object(s) require review; ${blockedImplementationObjects} are blocked from implementation-ready output.`
        : "No materialized object required additional review beyond standard engineering review.",
    ],
    V1MaterializationPolicy,
  };

  if (
    createdSites ||
    updatedSites ||
    createdVlans ||
    updatedVlans ||
    createdDhcpScopes ||
    updatedDhcpScopes
  ) {
    await addChangeLog(
      projectId,
      `Requirements materialized into ${createdSites} new site(s), ${createdVlans} new VLAN(s), ${updatedVlans} refreshed VLAN(s), ${createdDhcpScopes} new DHCP scope(s), and ${updatedDhcpScopes} refreshed DHCP scope(s).`,
      actorLabel,
      tx as any,
    );
  }

  return summary;
}

export type RequirementsReadRepairSummary = {
  action: "READ_REPAIR_MATERIALIZATION" | "NO_OP";
  projectId: string;
  operation: ReadRepairOperation;
  reason: string;
  repaired: boolean;
  before: {
    sites: number;
    vlans: number;
    addressingRows: number;
    dhcpScopes: number;
    dhcpEnabledVlans: number;
  };
  after: {
    sites: number;
    vlans: number;
    addressingRows: number;
    dhcpScopes: number;
    dhcpEnabledVlans: number;
  };
  selectedSiteCount: number;
  expectedSegmentFamilies: string[];
  expectedMinimumVlans: number;
  expectedMinimumDhcpScopes: number;
  materialization: RequirementsMaterializationSummary | null;
  authorization: ReadRepairAuthorization;
  evidence: ReadRepairEvidence | null;
};

function countMaterializedRows(project: {
  sites?: Array<{
    vlans?: Array<{
      subnetCidr?: string | null;
      gatewayIp?: string | null;
      dhcpEnabled?: boolean | null;
    }>;
  }>;
  dhcpScopes?: Array<{ id?: string }>;
}) {
  const sites = project.sites ?? [];
  const vlans = sites.flatMap((site) => site.vlans ?? []);
  const dhcpEnabledVlans = vlans.filter((vlan) =>
    Boolean(vlan.dhcpEnabled && vlan.subnetCidr),
  ).length;
  return {
    sites: sites.length,
    vlans: vlans.length,
    addressingRows: vlans.filter((vlan) =>
      Boolean(vlan.subnetCidr && vlan.gatewayIp),
    ).length,
    dhcpScopes: (project.dhcpScopes ?? []).length,
    dhcpEnabledVlans,
  };
}

function readRepairGap(
  counts: {
    sites: number;
    vlans: number;
    addressingRows: number;
    dhcpScopes: number;
    dhcpEnabledVlans: number;
  },
  selectedSiteCount: number,
  expectedMinimumVlans: number,
  expectedMinimumDhcpScopes = 0,
) {
  return (
    counts.sites < selectedSiteCount ||
    counts.vlans < expectedMinimumVlans ||
    (counts.vlans > 0 && counts.addressingRows === 0) ||
    counts.dhcpScopes <
      Math.max(expectedMinimumDhcpScopes, counts.dhcpEnabledVlans)
  );
}

export async function ensureRequirementsMaterializedForRead(
  projectId: string,
  actorLabel?: string,
  reason = "read-repair",
  options: {
    operation?: ReadRepairOperation;
    authorization?: ReadRepairAuthorization;
    surfacedTo?: string[];
  } = {},
): Promise<RequirementsReadRepairSummary | null> {
  const operation = normalizeReadRepairOperation(options.operation ?? reason);
  const authorization = options.authorization
    ? buildReadRepairAuthorization(options.authorization)
    : buildReadRepairAuthorization({
        permission: "system-internal-authorized",
        checkedBy: "",
      });

  return prisma.$transaction(async (tx: any) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        requirementsJson: true,
        sites: {
          select: {
            id: true,
            vlans: {
              select: {
                id: true,
                subnetCidr: true,
                gatewayIp: true,
                dhcpEnabled: true,
              },
            },
          },
        },
        dhcpScopes: { select: { id: true } },
      },
    });

    if (!project?.requirementsJson) return null;
    const requirements = parseRequirementsJson(project.requirementsJson);
    if (!requirements) return null;

    const selectedSiteCount = asNumber(requirements.siteCount, 1, 1, 500);
    const expectedSegmentFamilies = buildRequirementSegments(requirements)
      .map((segment) => segment.vlanName)
      .sort();
    const expectedMinimumVlans =
      selectedSiteCount * expectedSegmentFamilies.length;
    const expectedMinimumDhcpScopes =
      selectedSiteCount *
      buildRequirementSegments(requirements).filter(
        (segment) => segment.dhcpEnabled && !segment.implementationBlocked,
      ).length;
    const before = countMaterializedRows(project);
    const materializationIncomplete = readRepairGap(
      before,
      selectedSiteCount,
      expectedMinimumVlans,
      expectedMinimumDhcpScopes,
    );
    const policyDecision = buildReadRepairPolicyDecision({
      operation,
      authorization,
      requirementsPresent: true,
      materializationIncomplete,
    });

    if (policyDecision.status === "BLOCK_REPAIR") {
      await recordSecurityAuditEvent({
        action: "project.read_repair",
        outcome: "denied",
        projectId,
        targetType: "project",
        targetId: projectId,
        detail: {
          reason,
          operation,
          policyReason: policyDecision.reason,
          beforeState: before,
        },
      }, tx as any);
      throw new ApiError(403, policyDecision.reason);
    }

    if (!policyDecision.allowed) {
      const evidence = buildReadRepairEvidence({
        projectId,
        operation,
        reason,
        authorization,
        beforeState: before,
        afterState: before,
        repaired: false,
        repairLogged: false,
        surfacedTo: options.surfacedTo ?? ["service-response"],
      });
      return {
        action: "NO_OP",
        projectId,
        operation,
        reason,
        repaired: false,
        before,
        after: before,
        selectedSiteCount,
        expectedSegmentFamilies,
        expectedMinimumVlans,
        expectedMinimumDhcpScopes,
        materialization: null,
        authorization,
        evidence,
      };
    }

    const materialization = await materializeRequirementsForProject(
      tx,
      projectId,
      actorLabel,
      { requirementsJson: project.requirementsJson },
    );
    const repairedProject = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        sites: {
          select: {
            id: true,
            vlans: {
              select: {
                id: true,
                subnetCidr: true,
                gatewayIp: true,
                dhcpEnabled: true,
              },
            },
          },
        },
        dhcpScopes: { select: { id: true } },
      },
    });
    const after = countMaterializedRows(
      repairedProject ?? { sites: [], dhcpScopes: [] },
    );

    if (
      readRepairGap(
        after,
        selectedSiteCount,
        expectedMinimumVlans,
        expectedMinimumDhcpScopes,
      )
    ) {
      throw new ApiError(
        500,
        `Requirements read-repair failed during ${reason}: selected ${selectedSiteCount} site(s), expected at least ${expectedMinimumVlans} VLAN/segment row(s) and ${expectedMinimumDhcpScopes} DHCP scope(s), observed ${after.sites} site(s), ${after.vlans} VLAN(s), ${after.addressingRows} addressing row(s), and ${after.dhcpScopes} DHCP scope(s).`,
      );
    }

    const evidence = buildReadRepairEvidence({
      projectId,
      operation,
      reason,
      authorization,
      beforeState: before,
      afterState: after,
      repaired: true,
      materialization,
      repairLogged: true,
      surfacedTo: options.surfacedTo ?? ["service-response", "change-log", "security-audit", "design-core", "report-export"],
    });

    await addChangeLog(
      projectId,
      `V1 explicit read-repair materialized saved requirements during ${reason}: action=${evidence.action}; operation=${operation}; ${before.sites}->${after.sites} site(s), ${before.vlans}->${after.vlans} VLAN(s), ${before.addressingRows}->${after.addressingRows} addressing row(s), ${before.dhcpScopes}->${after.dhcpScopes} DHCP scope(s); reviewRequiredObjects=${evidence.reviewRequiredObjects}; blockedImplementationObjects=${evidence.blockedImplementationObjects}.`,
      actorLabel,
      tx as any,
    );

    await recordSecurityAuditEvent({
      action: "project.read_repair",
      outcome: "updated",
      projectId,
      targetType: "project",
      targetId: projectId,
      detail: evidence as unknown as Record<string, unknown>,
    }, tx as any);

    return {
      action: "READ_REPAIR_MATERIALIZATION",
      projectId,
      operation,
      reason,
      repaired: true,
      before,
      after,
      selectedSiteCount,
      expectedSegmentFamilies,
      expectedMinimumVlans,
      expectedMinimumDhcpScopes,
      materialization,
      authorization,
      evidence,
    };
  });
}
