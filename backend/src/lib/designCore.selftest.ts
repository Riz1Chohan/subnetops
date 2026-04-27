import assert from "node:assert/strict";
import { buildDesignCoreSnapshot } from "../services/designCore.service.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

const projectFixture = {
  id: "project-1",
  name: "Engine Test",
  basePrivateRange: "10.10.0.0/23",
  requirementsJson: JSON.stringify({
    planningFor: "Branch refresh",
    primaryGoal: "Standardize VLAN and subnet design",
    guestWifi: true,
    remoteAccess: true,
    usersPerSite: 60,
  }),
  discoveryJson: JSON.stringify({
    topologyBaseline: "Brownfield multi-site network",
    addressingVlanBaseline: "Legacy addressing with inconsistent subnet sizes",
  }),
  platformProfileJson: JSON.stringify({
    routingPosture: "OSPF summarized hub-and-spoke",
    firewallPosture: "Default deny with segmented trust zones",
    wanPosture: "Hub-and-spoke WAN",
  }),
  sites: [
    {
      id: "site-a",
      name: "HQ",
      siteCode: "HQ",
      defaultAddressBlock: "10.10.0.0/24",
      vlans: [
        {
          id: "vlan-10",
          vlanId: 10,
          vlanName: "Users",
          purpose: "User access",
          department: null,
          notes: null,
          subnetCidr: "10.10.0.10/26",
          gatewayIp: "10.10.0.1",
          estimatedHosts: 40,
          dhcpEnabled: true,
        },
      ],
    },
    {
      id: "site-b",
      name: "Branch",
      siteCode: "BR",
      defaultAddressBlock: null,
      vlans: [
        {
          id: "vlan-20",
          vlanId: 20,
          vlanName: "Servers",
          purpose: "Server farm",
          department: null,
          notes: null,
          subnetCidr: "10.10.2.0/28",
          gatewayIp: "10.10.2.1",
          estimatedHosts: 20,
          dhcpEnabled: false,
        },
      ],
    },
  ],
} as const;

run("design core canonicalizes saved subnet rows", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(snapshot?.addressingRows[0]?.canonicalSubnetCidr, "10.10.0.0/26");
});

run("design core proposes a site block when one is missing", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  const branchSite = snapshot?.siteBlocks.find((item) => item.siteId === "site-b");
  assert.ok(branchSite?.proposedCidr);
});

run("design core proposes a corrective subnet when demand exceeds the current subnet", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  const proposal = snapshot?.proposedRows.find((item) => item.vlanId === 20);
  assert.ok(proposal?.proposedSubnetCidr);
});

run("design core builds requirement and discovery traceability", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal((snapshot?.traceability.length ?? 0) > 0, true);
});

run("design core builds site summarization reviews", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal((snapshot?.siteSummaries.length ?? 0) >= 1, true);
});

run("design core can propose transit planning for multi-site projects", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal((snapshot?.transitPlan.filter((item) => item.kind === "proposed").length ?? 0) >= 1, true);
});

run("design core can propose loopback planning where none exists", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal((snapshot?.loopbackPlan.filter((item) => item.kind === "proposed").length ?? 0) >= 1, true);
});


run("design core reports WAN, brownfield, and allocator summaries", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(typeof snapshot?.wanPlan?.recommendedModel, "string");
  assert.equal(typeof snapshot?.brownfieldReadiness?.importReadiness, "string");
  assert.equal(typeof snapshot?.allocatorConfidence?.state, "string");
});


run("design core reports route-domain, implementation, and engine confidence summaries", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(typeof snapshot?.routeDomain?.domainModel, "string");
  assert.equal(typeof snapshot?.implementationReadiness?.state, "string");
  assert.equal(typeof snapshot?.engineConfidence?.score, "number");
});

run("design core reports discovered-state import and policy consequence summaries", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(Array.isArray(snapshot?.discoveredStateImportPlan?.requiredNormalizations), true);
  assert.equal(typeof snapshot?.policyConsequences?.managementPlaneProtectionState, "string");
});

run("design core exposes a standards rulebook and standards alignment summary", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal((snapshot?.standardsRulebook.length ?? 0) > 0, true);
  assert.equal(typeof snapshot?.standardsAlignment.rulebook.formalStandardCount, "number");
});

run("design core exposes planning input audit coverage", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal((snapshot?.planningInputAudit.length ?? 0) > 0, true);
  assert.equal(Array.isArray(snapshot?.planningInputCoverage.notYetImplementedKeys), true);
});

run("standards alignment distinguishes applied, review, and violated rule states", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(Array.isArray(snapshot?.standardsAlignment.evaluations), true);
  assert.equal(snapshot?.standardsAlignment.appliedRuleIds.includes("ADDR-PRIVATE-IPV4"), true);
  assert.equal(snapshot?.standardsAlignment.reviewRuleIds.includes("GUEST-ISOLATION"), true);
});

run("planning input coverage exposes active inputs and not-yet-implemented counts", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal((snapshot?.planningInputCoverage.activeInputs.length ?? 0) > 0, true);
  assert.equal(typeof snapshot?.planningInputCoverage.activeNotYetImplementedCount, "number");
});


run("planning input discipline exposes reflected and not-reflected counts", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(typeof snapshot?.planningInputDiscipline.notReflectedCount, "number");
  assert.equal(Array.isArray(snapshot?.planningInputDiscipline.notReflectedKeys), true);
});

run("allocator determinism summary exposes stable proposal order", () => {
  const snapshotA = buildDesignCoreSnapshot(projectFixture as never);
  const snapshotB = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshotA && snapshotB);
  assert.deepEqual(snapshotA?.allocatorDeterminism.evaluationOrder, snapshotB?.allocatorDeterminism.evaluationOrder);
});

run("standards alignment can report a violation for non-private organization space", () => {
  const publicRangeFixture = {
    ...projectFixture,
    basePrivateRange: "8.8.8.0/24",
  };
  const snapshot = buildDesignCoreSnapshot(publicRangeFixture as never);
  assert(snapshot);
  assert.equal(snapshot?.standardsAlignment.violatedRuleIds.includes("ADDR-PRIVATE-IPV4"), true);
});

run("design core exposes allocator determinism state", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(typeof snapshot?.allocatorDeterminism.state, "string");
  assert.equal(Array.isArray(snapshot?.allocatorDeterminism.evaluationOrder), true);
});

console.log("\nDesign core self-test complete.");


// Additional backend design-intent checks should assert routing, security, and traceability summaries as this engine grows.
