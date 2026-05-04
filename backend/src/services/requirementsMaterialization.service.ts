import { addChangeLog } from "./changeLog.service.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { buildRequirementImpactInventory } from "../domain/requirements/impact-registry.js";
import { buildRequirementMaterializationPolicySummary, type RequirementMaterializationPolicySummary } from "../domain/requirements/policy.js";
import { asNumber, asString, joinNotes, mergeNotes, parseRequirementsJson, textIncludes } from "../domain/requirements/normalize.js";
import { buildRequirementSegments, buildSegmentAddressingPlans, buildSiteBlock, buildVlanCidr } from "../domain/requirements/apply.js";
import { consumedRequirementFields } from "../domain/requirements/traceability.js";
import type { RequirementsInput, SegmentPlan } from "../domain/requirements/types.js";

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

function isRequirementManagedVlan(vlan: { vlanName?: string | null; purpose?: string | null; notes?: string | null }, segment: SegmentPlan) {
  return String(vlan.vlanName ?? "").toUpperCase() === segment.vlanName
    || textIncludes(vlan.purpose, "Requirement-derived")
    || textIncludes(vlan.notes, `Requirement materialization for ${segment.vlanName}`);
}

function exclusionRangesForGateway(cidr: string, gateway?: string) {
  if (!gateway) return "[]";
  return JSON.stringify([{ start: gateway, end: gateway, reason: "default gateway reserved by requirement materializer" }]);
}

async function upsertRequirementDhcpScope(
  tx: MaterializerTx,
  projectId: string,
  siteId: string,
  vlanRecord: { id: string; vlanId: number; vlanName?: string | null; subnetCidr?: string | null; gatewayIp?: string | null; dhcpEnabled?: boolean | null },
  segment: SegmentPlan,
  notes: string,
) {
  if (!tx.designDhcpScope || !vlanRecord.dhcpEnabled || !vlanRecord.subnetCidr) return "skipped" as const;

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
    vlanRecord.gatewayIp ? `Default gateway: ${vlanRecord.gatewayIp}.` : "Default gateway requires review.",
    "DNS servers, helper/relay targets, reservations, and lease options still require implementation review.",
    notes,
  ]);

  const scopeData = {
    siteId,
    vlanId: vlanRecord.id,
    addressFamily: "IPV4",
    scopeCidr: vlanRecord.subnetCidr,
    defaultGateway: vlanRecord.gatewayIp || null,
    excludedRangesJson: exclusionRangesForGateway(vlanRecord.subnetCidr, vlanRecord.gatewayIp || undefined),
    leaseSeconds: 86400,
    source: "requirements-materializer",
    serverLocation: "engineer-review",
    notes: mergeNotes(existing?.notes, scopeNotes),
  };

  if (existing) {
    await tx.designDhcpScope.update({ where: { id: existing.id }, data: scopeData });
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
  const project = await tx.project.findUnique({ where: { id: projectId }, select: { id: true, basePrivateRange: true, requirementsJson: true } });
  const requirementsSource = typeof options?.requirementsJson === "string" ? options.requirementsJson : project?.requirementsJson;
  const requirements = parseRequirementsJson(requirementsSource);
  if (!project || !requirements) return null;

  const siteCount = asNumber(requirements.siteCount, 1, 1, 500);
  const existingSites = await tx.site.findMany({ where: { projectId }, include: { vlans: true }, orderBy: { createdAt: "asc" } });
  const segments = buildRequirementSegments(requirements);
  const impactInventory = buildRequirementImpactInventory(requirements);
  const V1MaterializationPolicyBefore = buildRequirementMaterializationPolicySummary(requirements, {
    sites: existingSites,
    dhcpScopes: [],
  });
  const directImpactCount = impactInventory.filter((item) => item.impact === "direct" && item.captured).length;
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
  const materializedSites: any[] = [...existingSites];

  for (let index = 0; index < siteCount; index += 1) {
    const siteNumber = index + 1;
    const existing = materializedSites[index];
    const isHq = siteNumber === 1;
    const siteName = existing?.name || (isHq ? "Site 1 - HQ" : `Site ${siteNumber}`);
    const siteCode = existing?.siteCode || (isHq ? "HQ" : `S${siteNumber}`);
    const defaultAddressBlock = existing && !isRequirementManagedSite(existing)
      ? existing.defaultAddressBlock || buildSiteBlock(project.basePrivateRange, index)
      : buildSiteBlock(project.basePrivateRange, index);
    const siteNotes = joinNotes([
      `Requirement materialization: ${siteName} exists because requirements requested ${siteCount} site(s).`,
      `Site role model: ${asString(requirements.siteRoleModel, "unspecified")}`,
      `Site identity capture: ${asString(requirements.siteIdentityCapture, "unspecified")}`,
      `Layout: ${asString(requirements.siteLayoutModel, "unspecified")}`,
      `Physical scope: ${asString(requirements.physicalScope, "unspecified")}`,
      `Buildings/floors/closets: ${asString(requirements.buildingCount, "1")} building(s), ${asString(requirements.floorCount, "1")} floor(s), ${asString(requirements.closetModel, "unspecified")}`,
      `Edge footprint: ${asString(requirements.edgeFootprint, "unspecified")}`,
    ]);

    if (existing) {
      const nextSite = await tx.site.update({
        where: { id: existing.id },
        data: {
          siteCode,
          defaultAddressBlock,
          notes: mergeNotes(existing.notes, siteNotes),
        },
        include: { vlans: true },
      });
      materializedSites[index] = nextSite;
      updatedSites += 1;
    } else {
      const created = await tx.site.create({
        data: {
          projectId,
          name: siteName,
          location: siteName,
          siteCode,
          defaultAddressBlock,
          notes: siteNotes,
        },
        include: { vlans: true },
      });
      materializedSites.push(created);
      createdSites += 1;
    }
  }

  for (let index = 0; index < siteCount; index += 1) {
    const site = materializedSites[index];
    if (!site) continue;
    const existingVlans = await tx.vlan.findMany({ where: { siteId: site.id }, orderBy: { vlanId: "asc" } });
    const segmentAddressingPlans = buildSegmentAddressingPlans(project.basePrivateRange, index, segments, requirements);

    for (const segment of segments) {
      const matching = existingVlans.find((vlan) => vlan.vlanId === segment.vlanId || vlan.vlanName.toUpperCase() === segment.vlanName.toUpperCase());
      const addressing = segmentAddressingPlans.get(segment.vlanId) ?? buildVlanCidr(project.basePrivateRange, index, segment.vlanId);
      const notes = joinNotes([
        `Requirement materialization for ${segment.vlanName}.`,
        `Required by: ${segment.requiredBy.join(", ")}.`,
        `Direct design driver output: ${segment.estimatedHosts} requested host(s), ${addressing.requiredUsableHosts} required usable address(es), /${addressing.recommendedPrefix} recommended prefix, ${addressing.cidr} selected for this site.`,
        addressing.gateway ? `Gateway convention ${asString(requirements.gatewayConvention, "first usable address as default gateway")}: ${addressing.gateway}.` : "Gateway requires review for this segment role.",
        addressing.allocatorExplanation ?? "Addressing was generated from deterministic requirement materialization.",
        ...segment.reviewNotes,
      ]);

      if (matching) {
        const nextVlan = await tx.vlan.update({
          where: { id: matching.id },
          data: {
            vlanName: isRequirementManagedVlan(matching, segment) ? segment.vlanName : matching.vlanName || segment.vlanName,
            purpose: isRequirementManagedVlan(matching, segment) ? segment.purpose : matching.purpose || segment.purpose,
            segmentRole: isRequirementManagedVlan(matching, segment) ? segment.segmentRole : matching.segmentRole || segment.segmentRole,
            subnetCidr: isRequirementManagedVlan(matching, segment) ? addressing.cidr : matching.subnetCidr || addressing.cidr,
            gatewayIp: isRequirementManagedVlan(matching, segment) ? (addressing.gateway ?? matching.gatewayIp) : matching.gatewayIp || addressing.gateway || "",
            dhcpEnabled: isRequirementManagedVlan(matching, segment) ? segment.dhcpEnabled : matching.dhcpEnabled ?? segment.dhcpEnabled,
            estimatedHosts: isRequirementManagedVlan(matching, segment) ? segment.estimatedHosts : matching.estimatedHosts || segment.estimatedHosts,
            department: isRequirementManagedVlan(matching, segment) ? segment.department : matching.department || segment.department,
            notes: mergeNotes(matching.notes, notes),
          },
        });
        const scopeResult = await upsertRequirementDhcpScope(tx, projectId, site.id, nextVlan, segment, notes);
        if (scopeResult === "created") createdDhcpScopes += 1;
        if (scopeResult === "updated") updatedDhcpScopes += 1;
        updatedVlans += 1;
      } else {
        const nextVlan = await tx.vlan.create({
          data: {
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
          },
        });
        const scopeResult = await upsertRequirementDhcpScope(tx, projectId, site.id, nextVlan, segment, notes);
        if (scopeResult === "created") createdDhcpScopes += 1;
        if (scopeResult === "updated") updatedDhcpScopes += 1;
        createdVlans += 1;
      }
    }
  }

  const refreshedSitesForPolicy = await tx.site.findMany({ where: { projectId }, include: { vlans: true }, orderBy: { createdAt: "asc" } });
  const refreshedDhcpScopesForPolicy = tx.designDhcpScope
    ? await Promise.all(refreshedSitesForPolicy.map(async (site) => tx.designDhcpScope?.findFirst({ where: { projectId, siteId: site.id, addressFamily: "IPV4" } }))).then((rows) => rows.filter(Boolean) as Array<{ id?: string; vlanId?: string | null; scopeCidr?: string | null }>)
    : [];
  const V1MaterializationPolicy = buildRequirementMaterializationPolicySummary(requirements, {
    sites: refreshedSitesForPolicy,
    dhcpScopes: refreshedDhcpScopesForPolicy,
  });

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
    reviewNotes: [
      ...reviewNotes,
      `V1 materialization policy evaluated ${V1MaterializationPolicy.totalPolicyCount} requirement field policy row(s); ${V1MaterializationPolicy.silentDropCount} active field(s) are silently dropped.`,
      `Pre-save materialization policy active fields: ${V1MaterializationPolicyBefore.activeFieldCount}.`,
    ],
    V1MaterializationPolicy,
  };

  if (createdSites || updatedSites || createdVlans || updatedVlans || createdDhcpScopes || updatedDhcpScopes) {
    await addChangeLog(projectId, `Requirements materialized into ${createdSites} new site(s), ${createdVlans} new VLAN(s), ${updatedVlans} refreshed VLAN(s), ${createdDhcpScopes} new DHCP scope(s), and ${updatedDhcpScopes} refreshed DHCP scope(s).`, actorLabel, tx as any);
  }

  return summary;
}

export type RequirementsReadRepairSummary = {
  reason: string;
  repaired: boolean;
  before: { sites: number; vlans: number; addressingRows: number; dhcpScopes: number; dhcpEnabledVlans: number };
  after: { sites: number; vlans: number; addressingRows: number; dhcpScopes: number; dhcpEnabledVlans: number };
  selectedSiteCount: number;
  expectedSegmentFamilies: string[];
  expectedMinimumVlans: number;
  expectedMinimumDhcpScopes: number;
  materialization: RequirementsMaterializationSummary | null;
};

function countMaterializedRows(project: { sites?: Array<{ vlans?: Array<{ subnetCidr?: string | null; gatewayIp?: string | null; dhcpEnabled?: boolean | null }> }>; dhcpScopes?: Array<{ id?: string }> }) {
  const sites = project.sites ?? [];
  const vlans = sites.flatMap((site) => site.vlans ?? []);
  const dhcpEnabledVlans = vlans.filter((vlan) => Boolean(vlan.dhcpEnabled && vlan.subnetCidr)).length;
  return {
    sites: sites.length,
    vlans: vlans.length,
    addressingRows: vlans.filter((vlan) => Boolean(vlan.subnetCidr && vlan.gatewayIp)).length,
    dhcpScopes: (project.dhcpScopes ?? []).length,
    dhcpEnabledVlans,
  };
}

function readRepairGap(counts: { sites: number; vlans: number; addressingRows: number; dhcpScopes: number; dhcpEnabledVlans: number }, selectedSiteCount: number, expectedMinimumVlans: number, expectedMinimumDhcpScopes = 0) {
  return counts.sites < selectedSiteCount
    || counts.vlans < expectedMinimumVlans
    || (counts.vlans > 0 && counts.addressingRows === 0)
    || counts.dhcpScopes < Math.max(expectedMinimumDhcpScopes, counts.dhcpEnabledVlans);
}

export async function ensureRequirementsMaterializedForRead(
  projectId: string,
  actorLabel?: string,
  reason = "read-repair",
): Promise<RequirementsReadRepairSummary | null> {
  return prisma.$transaction(async (tx: any) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        requirementsJson: true,
        sites: {
          select: {
            id: true,
            vlans: { select: { id: true, subnetCidr: true, gatewayIp: true, dhcpEnabled: true } },
          },
        },
        dhcpScopes: { select: { id: true } },
      },
    });

    if (!project?.requirementsJson) return null;
    const requirements = parseRequirementsJson(project.requirementsJson);
    if (!requirements) return null;

    const selectedSiteCount = asNumber(requirements.siteCount, 1, 1, 500);
    const expectedSegmentFamilies = buildRequirementSegments(requirements).map((segment) => segment.vlanName).sort();
    const expectedMinimumVlans = selectedSiteCount * expectedSegmentFamilies.length;
    const expectedMinimumDhcpScopes = selectedSiteCount * buildRequirementSegments(requirements).filter((segment) => segment.dhcpEnabled).length;
    const before = countMaterializedRows(project);

    if (!readRepairGap(before, selectedSiteCount, expectedMinimumVlans, expectedMinimumDhcpScopes)) {
      return {
        reason,
        repaired: false,
        before,
        after: before,
        selectedSiteCount,
        expectedSegmentFamilies,
        expectedMinimumVlans,
        expectedMinimumDhcpScopes,
        materialization: null,
      };
    }

    const materialization = await materializeRequirementsForProject(tx, projectId, actorLabel, { requirementsJson: project.requirementsJson });
    const repairedProject = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        sites: {
          select: {
            id: true,
            vlans: { select: { id: true, subnetCidr: true, gatewayIp: true, dhcpEnabled: true } },
          },
        },
        dhcpScopes: { select: { id: true } },
      },
    });
    const after = countMaterializedRows(repairedProject ?? { sites: [], dhcpScopes: [] });

    if (readRepairGap(after, selectedSiteCount, expectedMinimumVlans, expectedMinimumDhcpScopes)) {
      throw new ApiError(
        500,
        `Requirements read-repair failed during ${reason}: selected ${selectedSiteCount} site(s), expected at least ${expectedMinimumVlans} VLAN/segment row(s) and ${expectedMinimumDhcpScopes} DHCP scope(s), observed ${after.sites} site(s), ${after.vlans} VLAN(s), ${after.addressingRows} addressing row(s), and ${after.dhcpScopes} DHCP scope(s).`,
      );
    }

    await addChangeLog(
      projectId,
      `V1 read-repair materialized saved requirements during ${reason}: ${before.sites}->${after.sites} site(s), ${before.vlans}->${after.vlans} VLAN(s), ${before.addressingRows}->${after.addressingRows} addressing row(s), ${before.dhcpScopes}->${after.dhcpScopes} DHCP scope(s).`,
      actorLabel,
      tx as any,
    );

    return {
      reason,
      repaired: true,
      before,
      after,
      selectedSiteCount,
      expectedSegmentFamilies,
      expectedMinimumVlans,
      expectedMinimumDhcpScopes,
      materialization,
    };
  });
}
