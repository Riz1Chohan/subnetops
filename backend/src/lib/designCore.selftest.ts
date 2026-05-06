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


run("design core uses buffered CIDR capacity, not raw host fit only", () => {
  const fixture = {
    ...projectFixture,
    sites: [
      {
        ...projectFixture.sites[0],
        vlans: [
          {
            ...projectFixture.sites[0].vlans[0],
            id: "vlan-buffer",
            subnetCidr: "10.10.0.0/26",
            gatewayIp: "10.10.0.1",
            estimatedHosts: 50,
          },
        ],
      },
    ],
  };
  const snapshot = buildDesignCoreSnapshot(fixture as never);
  const row = snapshot?.addressingRows.find((item) => item.id === "vlan-buffer");
  assert.equal(row?.requiredUsableHosts, 65);
  assert.equal(row?.recommendedPrefix, 25);
  assert.equal(row?.capacityState, "undersized");
  assert.ok(row?.proposedSubnetCidr);
});

run("design core exposes CIDR facts for frontend consumption", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  const row = snapshot?.addressingRows[0];
  assert.equal(row?.dottedMask, "255.255.255.192");
  assert.equal(row?.wildcardMask, "0.0.0.63");
  assert.equal(row?.networkAddress, "10.10.0.0");
  assert.equal(row?.broadcastAddress, "10.10.0.63");
  assert.equal(typeof snapshot?.organizationBlock?.totalAddresses, "number");
  assert.equal(typeof snapshot?.siteBlocks[0]?.totalAddresses, "number");
});


// Additional backend design-intent checks should assert routing, security, and traceability summaries as this engine grows.

run("design core builds a first-class network object model", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal((snapshot.networkObjectModel.devices.length ?? 0) >= 1, true);
  assert.equal((snapshot.networkObjectModel.interfaces.length ?? 0) >= 1, true);
  assert.equal((snapshot.networkObjectModel.routeDomains.length ?? 0) >= 1, true);
  assert.equal((snapshot.networkObjectModel.securityZones.length ?? 0) >= 1, true);
});

run("network object model keeps inferred and proposed objects separate from configured truth", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(typeof snapshot.networkObjectModel.summary.configuredObjectCount, "number");
  assert.equal(typeof snapshot.networkObjectModel.summary.inferredObjectCount, "number");
  assert.equal(typeof snapshot.networkObjectModel.summary.proposedObjectCount, "number");
  assert.equal(snapshot.summary.networkObjectCount >= snapshot.networkObjectModel.summary.deviceCount, true);
});


run("V1 design graph connects devices, interfaces, zones, route domains, VLANs, and subnets", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  const designGraph = snapshot.networkObjectModel.designGraph;
  assert.equal(designGraph.summary.nodeCount > 0, true);
  assert.equal(designGraph.summary.edgeCount > 0, true);
  assert.equal(designGraph.nodes.some((node) => node.objectType === "network-device"), true);
  assert.equal(designGraph.nodes.some((node) => node.objectType === "network-interface"), true);
  assert.equal(designGraph.nodes.some((node) => node.objectType === "security-zone"), true);
  assert.equal(designGraph.nodes.some((node) => node.objectType === "route-domain"), true);
  assert.equal(designGraph.nodes.some((node) => node.objectType === "vlan"), true);
  assert.equal(designGraph.nodes.some((node) => node.objectType === "subnet"), true);
  assert.equal(designGraph.edges.some((edge) => edge.relationship === "device-owns-interface"), true);
  assert.equal(designGraph.edges.some((edge) => edge.relationship === "interface-belongs-to-route-domain"), true);
  assert.equal(designGraph.edges.some((edge) => edge.relationship === "security-zone-protects-subnet"), true);
});

run("V1 design graph exposes graph health in the authoritative summary", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(snapshot.summary.designGraphNodeCount, snapshot.networkObjectModel.designGraph.summary.nodeCount);
  assert.equal(snapshot.summary.designGraphEdgeCount, snapshot.networkObjectModel.designGraph.summary.edgeCount);
  assert.equal(snapshot.summary.designGraphIntegrityFindingCount, snapshot.networkObjectModel.designGraph.summary.integrityFindingCount);
  assert.equal(typeof snapshot.networkObjectModel.designGraph.summary.relationshipCoveragePercent, "number");
});


run("V1 builds neutral route intent and segmentation expectation models", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  const routingSegmentation = snapshot.networkObjectModel.routingSegmentation;
  assert.equal(routingSegmentation.summary.routeIntentCount > 0, true);
  assert.equal(routingSegmentation.routeIntents.some((routeIntent) => routeIntent.routeKind === "connected"), true);
  assert.equal(routingSegmentation.segmentationExpectations.length > 0, true);
  assert.equal(typeof routingSegmentation.summary.routingReadiness, "string");
});

run("V1 design graph connects route intents and segmentation flows", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  const designGraph = snapshot.networkObjectModel.designGraph;
  assert.equal(designGraph.nodes.some((node) => node.objectType === "route-intent"), true);
  assert.equal(designGraph.edges.some((edge) => edge.relationship === "route-domain-owns-route"), true);
  assert.equal(designGraph.edges.some((edge) => edge.relationship === "route-intent-targets-subnet"), true);
  assert.equal(designGraph.nodes.some((node) => node.objectType === "segmentation-flow"), true);
  assert.equal(designGraph.edges.some((edge) => edge.relationship === "security-zone-expects-flow"), true);
});

run("V1 exposes routing and segmentation counts in the authoritative summary", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(snapshot.summary.routeIntentCount, snapshot.networkObjectModel.routingSegmentation.summary.routeIntentCount);
  assert.equal(snapshot.summary.routingReachabilityFindingCount, snapshot.networkObjectModel.routingSegmentation.summary.reachabilityFindingCount);
  assert.equal(snapshot.summary.segmentationExpectationCount, snapshot.networkObjectModel.routingSegmentation.summary.segmentationExpectationCount);
});

run("V1 builds explicit security policy flow requirements", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  const securityPolicyFlow = snapshot.networkObjectModel.securityPolicyFlow;
  assert.equal(securityPolicyFlow.summary.flowRequirementCount > 0, true);
  assert.equal(securityPolicyFlow.flowRequirements.some((flowRequirement) => flowRequirement.sourceZoneId && flowRequirement.destinationZoneId), true);
  assert.equal(securityPolicyFlow.serviceObjects.length > 0, true);
  assert.equal(typeof securityPolicyFlow.summary.policyReadiness, "string");
});

run("V1 design graph connects security flows to zones and policy coverage", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  const designGraph = snapshot.networkObjectModel.designGraph;
  assert.equal(designGraph.nodes.some((node) => node.objectType === "security-flow"), true);
  assert.equal(designGraph.edges.some((edge) => edge.relationship === "security-zone-initiates-security-flow"), true);
  assert.equal(designGraph.edges.some((edge) => edge.relationship === "security-flow-targets-security-zone"), true);
});

run("V1 exposes security policy counts in the authoritative summary", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(snapshot.summary.securityFlowRequirementCount, snapshot.networkObjectModel.securityPolicyFlow.summary.flowRequirementCount);
  assert.equal(snapshot.summary.securityPolicyFindingCount, snapshot.networkObjectModel.securityPolicyFlow.summary.findingCount);
  assert.equal(snapshot.summary.securityPolicyBlockingFindingCount, snapshot.networkObjectModel.securityPolicyFlow.summary.blockingFindingCount);
});


run("V1 builds an implementation-neutral plan with ordered steps", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  const implementationPlan = snapshot.networkObjectModel.implementationPlan;
  assert.equal(implementationPlan.summary.stepCount > 0, true);
  assert.equal(implementationPlan.stages.some((stage) => stage.stageType === "routing"), true);
  assert.equal(implementationPlan.steps.some((step) => step.targetObjectType === "route-intent"), true);
  assert.equal(implementationPlan.steps.some((step) => step.targetObjectType === "security-flow"), true);
  assert.equal(typeof implementationPlan.summary.implementationReadiness, "string");
});

run("V1 includes verification checks and rollback actions", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  const implementationPlan = snapshot.networkObjectModel.implementationPlan;
  assert.equal(implementationPlan.verificationChecks.length > 0, true);
  assert.equal(implementationPlan.rollbackActions.length > 0, true);
  assert.equal(implementationPlan.verificationChecks.some((check) => check.checkType === "routing" || check.checkType === "policy"), true);
});

run("V1 exposes implementation-plan counts in the authoritative summary", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  assert.equal(snapshot.summary.implementationPlanStepCount, snapshot.networkObjectModel.implementationPlan.summary.stepCount);
  assert.equal(snapshot.summary.implementationPlanBlockedStepCount, snapshot.networkObjectModel.implementationPlan.summary.blockedStepCount);
  assert.equal(snapshot.summary.implementationPlanBlockingFindingCount, snapshot.networkObjectModel.implementationPlan.summary.blockingFindingCount);
});

run("V1 design graph connects implementation stages and steps", () => {
  const snapshot = buildDesignCoreSnapshot(projectFixture as never);
  assert(snapshot);
  const designGraph = snapshot.networkObjectModel.designGraph;
  assert.equal(designGraph.nodes.some((node) => node.objectType === "implementation-stage"), true);
  assert.equal(designGraph.nodes.some((node) => node.objectType === "implementation-step"), true);
  assert.equal(designGraph.edges.some((edge) => edge.relationship === "implementation-stage-contains-step"), true);
});

console.log("\nDesign core self-test complete.");
