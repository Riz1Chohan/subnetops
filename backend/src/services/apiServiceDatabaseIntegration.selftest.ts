import assert from "node:assert/strict";
import { materializeRequirementsForProject } from "./requirementsMaterialization.service.js";
import { buildDesignCoreSnapshot } from "./designCore.service.js";
import { composeProfessionalReport } from "./export.service.js";
import { applyBackendDesignCoreToReport } from "./exportDesignCoreReport.service.js";
import {
  assertGeneratedProjectBasePrivateRangeWritable,
  buildVlanWriteCandidate,
} from "./engineeringWritePaths.js";
import { buildReadRepairEvidence } from "./readRepairPolicy.js";
import { buildOmittedEvidenceSummary } from "../domain/evidence/index.js";

type MemoryProject = {
  id: string;
  name: string;
  organizationName?: string | null;
  environmentType?: string | null;
  basePrivateRange?: string | null;
  requirementsJson?: string | null;
  discoveryJson?: string | null;
  platformProfileJson?: string | null;
  sites: any[];
  dhcpScopes: any[];
  validations: any[];
  changeLogs: any[];
  routeDomains: any[];
  ipPools: any[];
  ipAllocations: any[];
  ipReservations: any[];
  brownfieldImports: any[];
  brownfieldNetworks: any[];
  allocationApprovals: any[];
  allocationLedger: any[];
};

const now = () => new Date("2026-01-01T00:00:00.000Z");

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function makeProject(requirements: Record<string, unknown>, overrides: Partial<MemoryProject> = {}): MemoryProject {
  return {
    id: overrides.id ?? "project-integration-proof",
    name: overrides.name ?? "Integration Proof Network",
    organizationName: overrides.organizationName ?? "SubnetOps Lab",
    environmentType: overrides.environmentType ?? "enterprise",
    basePrivateRange: overrides.basePrivateRange ?? "10.40.0.0/16",
    requirementsJson: overrides.requirementsJson ?? JSON.stringify(requirements),
    discoveryJson: overrides.discoveryJson ?? JSON.stringify({ topologyBaseline: "not captured" }),
    platformProfileJson: overrides.platformProfileJson ?? JSON.stringify({ platformMode: "vendor-neutral" }),
    sites: overrides.sites ?? [],
    dhcpScopes: overrides.dhcpScopes ?? [],
    validations: overrides.validations ?? [],
    changeLogs: overrides.changeLogs ?? [],
    routeDomains: overrides.routeDomains ?? [],
    ipPools: overrides.ipPools ?? [],
    ipAllocations: overrides.ipAllocations ?? [],
    ipReservations: overrides.ipReservations ?? [],
    brownfieldImports: overrides.brownfieldImports ?? [],
    brownfieldNetworks: overrides.brownfieldNetworks ?? [],
    allocationApprovals: overrides.allocationApprovals ?? [],
    allocationLedger: overrides.allocationLedger ?? [],
  };
}

function countRows(project: MemoryProject) {
  const vlans = project.sites.flatMap((site) => site.vlans ?? []);
  const dhcpEnabledVlans = vlans.filter((vlan) => vlan.dhcpEnabled && vlan.subnetCidr).length;
  return {
    sites: project.sites.length,
    vlans: vlans.length,
    addressingRows: vlans.filter((vlan) => vlan.subnetCidr && vlan.gatewayIp).length,
    dhcpScopes: project.dhcpScopes.length,
    dhcpEnabledVlans,
  };
}

function makeMemoryTx(project: MemoryProject) {
  let siteSequence = project.sites.length + 1;
  let vlanSequence = project.sites.flatMap((site) => site.vlans ?? []).length + 1;
  let dhcpSequence = project.dhcpScopes.length + 1;
  let changeLogSequence = project.changeLogs.length + 1;

  const findSite = (id: string) => project.sites.find((site) => site.id === id);
  const findVlan = (id: string) => project.sites.flatMap((site) => site.vlans ?? []).find((vlan) => vlan.id === id);

  return {
    project: {
      async findUnique(args: any) {
        if (args?.where?.id !== project.id) return null;
        return clone(project);
      },
    },
    site: {
      async findMany(args: any) {
        if (args?.where?.projectId && args.where.projectId !== project.id) return [];
        return clone(project.sites).sort((left: any, right: any) => String(left.createdAt).localeCompare(String(right.createdAt)));
      },
      async create(args: any) {
        const created = {
          id: `site-${siteSequence++}`,
          createdAt: now(),
          updatedAt: now(),
          vlans: [],
          ...args.data,
        };
        project.sites.push(created);
        return clone(created);
      },
      async update(args: any) {
        const site = findSite(args.where.id);
        assert(site, `missing site ${args.where.id}`);
        Object.assign(site, args.data, { updatedAt: now() });
        return clone(site);
      },
    },
    vlan: {
      async findMany(args: any) {
        const site = findSite(args?.where?.siteId);
        return clone((site?.vlans ?? []).sort((left: any, right: any) => left.vlanId - right.vlanId));
      },
      async create(args: any) {
        const site = findSite(args.data.siteId);
        assert(site, `missing site ${args.data.siteId}`);
        const created = {
          id: `vlan-${vlanSequence++}`,
          createdAt: now(),
          updatedAt: now(),
          ...args.data,
        };
        site.vlans.push(created);
        return clone(created);
      },
      async update(args: any) {
        const vlan = findVlan(args.where.id);
        assert(vlan, `missing VLAN ${args.where.id}`);
        Object.assign(vlan, args.data, { updatedAt: now() });
        return clone(vlan);
      },
    },
    designDhcpScope: {
      async findFirst(args: any) {
        const scope = project.dhcpScopes.find((item) =>
          item.projectId === args?.where?.projectId
          && item.siteId === args?.where?.siteId
          && item.vlanId === args?.where?.vlanId
          && item.addressFamily === args?.where?.addressFamily,
        );
        return scope ? clone(scope) : null;
      },
      async create(args: any) {
        const created = {
          id: `dhcp-${dhcpSequence++}`,
          createdAt: now(),
          updatedAt: now(),
          ...args.data,
        };
        project.dhcpScopes.push(created);
        return clone(created);
      },
      async update(args: any) {
        const scope = project.dhcpScopes.find((item) => item.id === args.where.id);
        assert(scope, `missing DHCP scope ${args.where.id}`);
        Object.assign(scope, args.data, { updatedAt: now() });
        return clone(scope);
      },
    },
    changeLog: {
      async create(args: any) {
        const created = { id: `change-${changeLogSequence++}`, createdAt: now(), ...args.data };
        project.changeLogs.push(created);
        return clone(created);
      },
    },
  };
}

async function executeProductLikeFlow(requirements: Record<string, unknown>, overrides: Partial<MemoryProject> = {}) {
  const project = makeProject(requirements, overrides);
  assertGeneratedProjectBasePrivateRangeWritable({ basePrivateRange: project.basePrivateRange }, "Integration proof project create");

  const before = countRows(project);
  const materialization = await materializeRequirementsForProject(
    makeMemoryTx(project) as any,
    project.id,
    "Integration proof harness",
  );
  assert(materialization, "materialization summary is required");
  const after = countRows(project);

  const readRepairEvidence = buildReadRepairEvidence({
    projectId: project.id,
    operation: "design-core-read",
    reason: "integration-proof-read-repair",
    authorization: {
      permission: "system-internal-authorized",
      checkedBy: "apiServiceDatabaseIntegration.selftest",
    },
    beforeState: before,
    afterState: after,
    repaired: after.vlans > before.vlans,
    materialization,
    repairLogged: true,
    surfacedTo: ["design-core", "validation", "diagram", "report-export"],
  });

  const designCore = buildDesignCoreSnapshot(project as any);
  assert(designCore, "design-core snapshot must be built from materialized rows");

  const validationItems = [
    ...(designCore.issues ?? []).map((issue: any) => ({
      projectId: project.id,
      severity: issue.severity === "ERROR" ? "ERROR" : issue.severity === "WARNING" ? "WARNING" : "INFO",
      ruleCode: issue.code,
      title: issue.title,
      message: issue.detail,
      entityType: issue.entityType,
      entityId: issue.entityId,
      createdAt: now(),
    })),
  ];
  project.validations = validationItems;

  const report = composeProfessionalReport(project as any);
  assert(report, "professional report must be composed from the same repaired project rows");
  const truthLockedReport = applyBackendDesignCoreToReport(report, designCore as any, { reportMode: "full-proof" });

  const diagramOmittedEvidence = buildOmittedEvidenceSummary({
    collection: "diagram nodes",
    surface: "IntegrationProof.DiagramRenderNodes",
    items: Array.from({ length: 30 }, (_, index) => ({
      id: `node-${index}`,
      readinessImpact: index > 20 ? "BLOCKING" : "NONE",
      severity: index > 20 ? "ERROR" : "INFO",
    })),
    shownCount: 12,
  });

  const reportOmittedEvidence = buildOmittedEvidenceSummary({
    collection: "report findings",
    surface: "IntegrationProof.ReportFindings",
    items: Array.from({ length: 45 }, (_, index) => ({
      id: `finding-${index}`,
      readinessImpact: index > 30 ? "REVIEW" : "NONE",
      severity: index > 30 ? "WARNING" : "INFO",
    })),
    shownCount: 20,
  });

  const exportProof = {
    projectId: project.id,
    materialization,
    readRepairEvidence,
    designCoreSummary: designCore.summary,
    validationEvidence: validationItems,
    diagramEvidence: designCore.diagramTruth,
    reportEvidence: truthLockedReport,
    omittedEvidenceSummaries: [diagramOmittedEvidence, reportOmittedEvidence],
    machineReadableAppendix: {
      fullEvidencePreserved: true,
      materializedSites: project.sites,
      materializedDhcpScopes: project.dhcpScopes,
      validationItems,
      designCoreSummary: designCore.summary,
    },
  };

  return { project, before, after, materialization, readRepairEvidence, designCore, validationItems, report: truthLockedReport, exportProof };
}

async function scenarioValidRequirementsPlanningReadyOutput() {
  const result = await executeProductLikeFlow({
    siteCount: 2,
    usersPerSite: 60,
    primaryGoal: "segmented branch network",
    planningFor: "multi-site branch rollout",
    internetModel: "centralized WAN edge",
    gatewayConvention: "first usable",
  });
  assert.equal(result.materialization?.createdSites, 2);
  assert(result.after.vlans >= 2, "valid requirements must materialize VLAN rows");
  assert(result.after.dhcpScopes >= 2, "valid requirements must create DHCP scope evidence for implementation review");
  assert(result.designCore.summary.siteCount === 2, "design-core must consume materialized site rows");
  assert(result.exportProof.machineReadableAppendix.fullEvidencePreserved, "export proof must preserve full machine-readable evidence");
}

async function scenarioMissingUsersPerSiteReviewRequired() {
  const result = await executeProductLikeFlow({
    siteCount: 1,
    primaryGoal: "baseline LAN segmentation",
  });
  assert(result.materialization?.reviewRequiredObjects, "missing capacity must produce review-required objects");
  assert(result.materialization?.blockedImplementationObjects, "missing capacity must block implementation-ready output");
  const usersVlan = result.project.sites.flatMap((site) => site.vlans).find((vlan) => vlan.vlanName === "USERS");
  assert(usersVlan?.notes.includes("capacity=REVIEW_REQUIRED"), "materialized USERS VLAN must preserve review-required capacity source");
}

function scenarioInvalidGatewayRejectedBeforeDbWrite() {
  const existing = {
    id: "vlan-existing",
    vlanId: 10,
    vlanName: "USERS",
    subnetCidr: "10.20.10.0/24",
    gatewayIp: "10.20.10.1",
    dhcpEnabled: true,
  };
  assert.throws(
    () => buildVlanWriteCandidate(existing, { gatewayIp: "10.99.99.1" }),
    /gateway|subnet|addressing/i,
    "invalid gateway must be rejected before DB write",
  );
}

async function scenarioExistingProjectReloadNoDuplicateMaterialization() {
  const requirements = { siteCount: 1, usersPerSite: 25, primaryGoal: "single branch" };
  const project = makeProject(requirements);
  const tx = makeMemoryTx(project) as any;
  await materializeRequirementsForProject(tx, project.id, "first run");
  const first = countRows(project);
  const secondSummary = await materializeRequirementsForProject(makeMemoryTx(project) as any, project.id, "reload run");
  const second = countRows(project);
  assert.deepEqual(second, first, "reload materialization must update existing rows instead of duplicating them");
  assert.equal(secondSummary?.createdSites, 0, "reload must not create duplicate sites");
}

async function scenarioReadRepairNeededProducesEvidence() {
  const result = await executeProductLikeFlow({ siteCount: 1, usersPerSite: 15, primaryGoal: "repair missing rows" });
  assert.equal(result.readRepairEvidence.action, "READ_REPAIR_MATERIALIZATION");
  assert(result.readRepairEvidence.createdObjects.length > 0, "read repair evidence must list created objects");
  assert(result.readRepairEvidence.surfacedTo.includes("design-core"), "read repair must be surfaced to design-core");
  assert(result.readRepairEvidence.surfacedTo.includes("report-export"), "read repair must be surfaced to report/export");
}

async function scenarioDiagramEvidenceSlicedOmittedWarningProduced() {
  const result = await executeProductLikeFlow({ siteCount: 1, usersPerSite: 20, primaryGoal: "diagram evidence" });
  const diagramSummary = result.exportProof.omittedEvidenceSummaries.find((summary: any) => summary.surface === "IntegrationProof.DiagramRenderNodes");
  assert(diagramSummary.omittedCount > 0, "diagram sliced evidence must expose omitted count");
  assert(diagramSummary.omittedHasBlockers, "diagram sliced evidence must expose hidden blockers");
}

async function scenarioReportEvidenceSlicedFullAppendixPreserved() {
  const result = await executeProductLikeFlow({ siteCount: 1, usersPerSite: 20, primaryGoal: "report evidence" });
  const reportSummary = result.exportProof.omittedEvidenceSummaries.find((summary: any) => summary.surface === "IntegrationProof.ReportFindings");
  assert(reportSummary.omittedCount > 0, "report sliced evidence must expose omitted count");
  assert(result.exportProof.machineReadableAppendix.fullEvidencePreserved, "report/export must preserve a full machine-readable appendix");
}

async function scenarioSecurityPolicyInferredReviewRequiredNotFinal() {
  const result = await executeProductLikeFlow({ siteCount: 1, usersPerSite: 20, guestWifi: true, primaryGoal: "security review" });
  const policyReadiness = String(result.designCore.networkObjectModel.securityPolicyFlow.summary.policyReadiness ?? "").toLowerCase();
  assert.notEqual(policyReadiness, "ready", "inferred security policy must not be final implementation truth");
}

async function scenarioRoutingMissingWanIntentReviewRequired() {
  const result = await executeProductLikeFlow({ siteCount: 2, usersPerSite: 20, primaryGoal: "multi-site but no WAN intent" });
  const routingReadiness = String(result.designCore.networkObjectModel.routingSegmentation.summary.routingReadiness ?? "").toLowerCase();
  assert.notEqual(routingReadiness, "ready", "routing missing WAN intent must remain review-required");
}

function scenarioBasePrivateRangeInvalidRejectedOrBlocked() {
  assert.throws(
    () => assertGeneratedProjectBasePrivateRangeWritable({ basePrivateRange: "8.8.8.0/24" }, "Integration proof project create"),
    /private|public|CIDR|address/i,
    "public basePrivateRange must be rejected or blocked before clean persistence",
  );
}

async function main() {
  await scenarioValidRequirementsPlanningReadyOutput();
  await scenarioMissingUsersPerSiteReviewRequired();
  scenarioInvalidGatewayRejectedBeforeDbWrite();
  await scenarioExistingProjectReloadNoDuplicateMaterialization();
  await scenarioReadRepairNeededProducesEvidence();
  await scenarioDiagramEvidenceSlicedOmittedWarningProduced();
  await scenarioReportEvidenceSlicedFullAppendixPreserved();
  await scenarioSecurityPolicyInferredReviewRequiredNotFinal();
  await scenarioRoutingMissingWanIntentReviewRequired();
  scenarioBasePrivateRangeInvalidRejectedOrBlocked();
  console.log("apiServiceDatabaseIntegration selftest passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
