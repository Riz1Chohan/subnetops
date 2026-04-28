import assert from "node:assert/strict";
import { applyDesignCoreSnapshotToDisplayDesign } from "../frontend/src/lib/designCoreAdapter";
import { buildBackendOnlyDisplayDesign } from "../frontend/src/lib/backendDesignDisplayModel";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

const localDesign = buildBackendOnlyDisplayDesign({
  id: "project-1",
  name: "Authority Overlay Test",
} as any);

const backendSnapshot = {
  projectId: "project-1",
  projectName: "Authority Overlay Test",
  generatedAt: "2026-04-27T00:00:00.000Z",
  authority: {
    source: "backend-design-core",
    mode: "authoritative",
    generatedAt: "2026-04-27T00:00:00.000Z",
    requiresEngineerReview: true,
  },
  organizationBlock: {
    sourceValue: "10.90.0.10/16",
    canonicalCidr: "10.90.0.0/16",
    validationState: "valid",
    notes: [],
  },
  summary: {
    siteCount: 1,
    vlanCount: 2,
    validSiteBlockCount: 1,
    validSubnetCount: 1,
    issueCount: 2,
    proposedSiteBlockCount: 0,
    proposalCount: 1,
    planningInputNotReflectedCount: 0,
    traceabilityCount: 1,
    summarizationReviewCount: 1,
    transitPlanCount: 0,
    loopbackPlanCount: 0,
    readyForBackendAuthority: false,
    readyForLiveMappingSplit: true,
  },
  siteBlocks: [
    {
      siteId: "site-1",
      siteName: "HQ",
      siteCode: "HQ",
      canonicalCidr: "10.90.0.0/24",
      truthState: "configured",
      validationState: "valid",
      inOrganizationBlock: true,
      overlapsWithSiteIds: [],
      notes: [],
    },
  ],
  addressingRows: [
    {
      id: "backend-row-configured",
      siteId: "site-1",
      siteName: "HQ",
      siteCode: "HQ",
      vlanId: 10,
      vlanName: "Backend Users",
      role: "USER",
      truthState: "configured",
      sourceSubnetCidr: "10.90.0.10/26",
      canonicalSubnetCidr: "10.90.0.0/26",
      sourceGatewayIp: "10.90.0.1",
      effectiveGatewayIp: "10.90.0.1",
      siteBlockCidr: "10.90.0.0/24",
      inSiteBlock: true,
      estimatedHosts: 40,
      usableHosts: 62,
      capacityState: "fits",
      gatewayState: "valid",
      gatewayConvention: "first-usable",
      dhcpEnabled: true,
      notes: ["backend checked row"],
    },
    {
      id: "backend-row-proposed",
      siteId: "site-1",
      siteName: "HQ",
      siteCode: "HQ",
      vlanId: 20,
      vlanName: "Backend Servers",
      role: "SERVER",
      truthState: "proposed",
      sourceSubnetCidr: "",
      proposedSubnetCidr: "10.90.0.64/27",
      sourceGatewayIp: "",
      proposedGatewayIp: "10.90.0.65",
      siteBlockCidr: "10.90.0.0/24",
      inSiteBlock: true,
      estimatedHosts: 20,
      usableHosts: 30,
      capacityState: "fits",
      gatewayState: "fallback",
      gatewayConvention: "first-usable",
      dhcpEnabled: false,
      notes: ["backend proposal row"],
    },
  ],
  proposedRows: [],
  issues: [
    {
      severity: "ERROR",
      code: "SUBNET_UNDERSIZED",
      title: "Undersized subnet",
      detail: "The backend found an undersized segment.",
      entityType: "VLAN",
      entityId: "backend-row-configured",
    },
    {
      severity: "INFO",
      code: "SUBNET_CANONICAL_FORM",
      title: "Canonical form",
      detail: "Canonical form available.",
      entityType: "VLAN",
      entityId: "backend-row-configured",
    },
  ],
} as any;

run("authority overlay returns the backend-only display shell unchanged until a backend snapshot exists", () => {
  const result = applyDesignCoreSnapshotToDisplayDesign(localDesign, undefined);
  assert.equal(result, localDesign);
});

run("authority overlay replaces local addressing with backend checked rows", () => {
  const result = applyDesignCoreSnapshotToDisplayDesign(localDesign, backendSnapshot);
  assert.equal(result.addressingPlan.length, 2);
  assert.equal(result.addressingPlan[0].id, "backend-row-configured");
  assert.equal(result.addressingPlan[0].subnetCidr, "10.90.0.0/26");
  assert.equal(result.addressingPlan[1].source, "proposed");
  assert.equal(result.addressingPlan[1].subnetCidr, "10.90.0.64/27");
});

run("authority overlay updates organization block and backend stats", () => {
  const result = applyDesignCoreSnapshotToDisplayDesign(localDesign, backendSnapshot);
  assert.equal(result.organizationBlock, "10.90.0.0/16");
  assert.equal(result.stats.configuredSegments, 1);
  assert.equal(result.stats.proposedSegments, 1);
  assert.equal(result.stats.missingSiteBlocks, 0);
});

run("authority overlay promotes backend blockers into open issues and review state", () => {
  const result = applyDesignCoreSnapshotToDisplayDesign(localDesign, backendSnapshot);
  assert.deepEqual(result.openIssues, ["Undersized subnet: The backend found an undersized segment."]);
  assert.equal(result.designReview.at(-1)?.kind, "risk");
  assert.match(result.designReview.at(-1)?.detail ?? "", /1\/2 subnet rows are valid/);
});

console.log("\nFrontend/backend authority display self-test complete.");
