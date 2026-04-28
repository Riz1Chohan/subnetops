import assert from "node:assert/strict";
import { buildImplementationPlanModel } from "../services/designCore/designCore.implementationPlan.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

const interfaceId = "interface-hq-users-gateway";
const routeIntentId = "route-intent-hq-default";
const securityFlowId = "security-flow-internal-to-wan";
const natRuleId = "nat-internal-egress";

function implementationPlanNetworkObjectModel() {
  return {
      devices: [
        {
          id: "device-hq-core",
          name: "HQ Core",
          siteId: "site-hq",
          siteName: "HQ",
          siteCode: "HQ",
          deviceRole: "core-layer3-switch",
          truthState: "proposed",
          routeDomainIds: ["route-domain-corporate"],
          securityZoneIds: ["zone-internal"],
          notes: [],
        },
      ],
      interfaces: [
        {
          id: interfaceId,
          name: "HQ Users Gateway",
          deviceId: "device-hq-core",
          siteId: "site-hq",
          interfaceRole: "vlan-gateway",
          truthState: "proposed",
          vlanId: 10,
          subnetCidr: "10.36.10.0/24",
          ipAddress: "10.36.10.1",
          routeDomainId: "route-domain-corporate",
          securityZoneId: "zone-internal",
          notes: [],
        },
      ],
      securityZones: [
        {
          id: "zone-internal",
          name: "Internal",
          zoneRole: "internal",
          truthState: "proposed",
          siteIds: ["site-hq"],
          vlanIds: [10],
          subnetCidrs: ["10.36.10.0/24"],
          routeDomainId: "route-domain-corporate",
          isolationExpectation: "restricted",
          notes: [],
        },
        {
          id: "zone-wan",
          name: "WAN",
          zoneRole: "wan",
          truthState: "proposed",
          siteIds: ["site-hq"],
          vlanIds: [],
          subnetCidrs: [],
          routeDomainId: "route-domain-corporate",
          isolationExpectation: "restricted",
          notes: [],
        },
      ],
      policyRules: [],
      natRules: [
        {
          id: natRuleId,
          name: "Internal Egress NAT",
          sourceZoneId: "zone-internal",
          destinationZoneId: "zone-wan",
          sourceSubnetCidrs: ["10.36.10.0/24"],
          translatedAddressMode: "interface-overload",
          truthState: "proposed",
          status: "required",
          notes: [],
        },
      ],
      dhcpPools: [
        {
          id: "dhcp-hq-users",
          name: "HQ Users DHCP",
          siteId: "site-hq",
          vlanId: 10,
          subnetCidr: "10.36.10.0/24",
          gatewayIp: "10.36.10.1",
          truthState: "proposed",
          allocationState: "proposed",
          notes: [],
        },
      ],
      designGraph: {
        summary: {
          nodeCount: 6,
          edgeCount: 5,
          requiredEdgeCount: 5,
          connectedObjectCount: 6,
          orphanObjectCount: 0,
          integrityFindingCount: 0,
          blockingFindingCount: 0,
          relationshipCoveragePercent: 100,
          notes: [],
        },
        nodes: [
          { id: "node-interface-hq-users", objectType: "network-interface", objectId: interfaceId, label: "HQ Users Gateway", siteId: "site-hq", truthState: "proposed", notes: [] },
          { id: "node-route-intent-hq-default", objectType: "route-intent", objectId: routeIntentId, label: "HQ Default Route", siteId: "site-hq", truthState: "proposed", notes: [] },
          { id: "node-zone-internal", objectType: "security-zone", objectId: "zone-internal", label: "Internal", siteId: "site-hq", truthState: "proposed", notes: [] },
          { id: "node-zone-wan", objectType: "security-zone", objectId: "zone-wan", label: "WAN", siteId: "site-hq", truthState: "proposed", notes: [] },
          { id: "node-security-flow-internal-to-wan", objectType: "security-flow", objectId: securityFlowId, label: "Internal to WAN egress", siteId: "site-hq", truthState: "proposed", notes: [] },
          { id: "node-nat-internal-egress", objectType: "nat-rule", objectId: natRuleId, label: "Internal Egress NAT", siteId: "site-hq", truthState: "proposed", notes: [] },
        ],
        edges: [
          { id: "edge-interface-to-internal-zone", relationship: "interface-belongs-to-security-zone", sourceNodeId: "node-interface-hq-users", targetNodeId: "node-zone-internal", truthState: "proposed", required: true, notes: [] },
          { id: "edge-route-exits-interface", relationship: "route-intent-exits-interface", sourceNodeId: "node-route-intent-hq-default", targetNodeId: "node-interface-hq-users", truthState: "proposed", required: true, notes: [] },
          { id: "edge-internal-initiates-flow", relationship: "security-zone-initiates-security-flow", sourceNodeId: "node-zone-internal", targetNodeId: "node-security-flow-internal-to-wan", truthState: "proposed", required: true, notes: [] },
          { id: "edge-flow-targets-wan", relationship: "security-flow-targets-security-zone", sourceNodeId: "node-security-flow-internal-to-wan", targetNodeId: "node-zone-wan", truthState: "proposed", required: true, notes: [] },
          { id: "edge-flow-uses-nat", relationship: "security-flow-uses-nat-rule", sourceNodeId: "node-security-flow-internal-to-wan", targetNodeId: "node-nat-internal-egress", truthState: "proposed", required: true, notes: [] },
        ],
        integrityFindings: [],
      },
      routingSegmentation: {
        summary: {
          routeIntentCount: 1,
          routeTableCount: 1,
          connectedRouteCount: 0,
          defaultRouteCount: 1,
          staticRouteCount: 0,
          summaryRouteCount: 0,
          missingRouteCount: 0,
          segmentationExpectationCount: 0,
          satisfiedSegmentationExpectationCount: 0,
          missingPolicyCount: 0,
          conflictingPolicyCount: 0,
          reachabilityFindingCount: 0,
          blockingFindingCount: 0,
          routeEntryCount: 1,
          routeConflictCount: 0,
          siteReachabilityCheckCount: 0,
          missingForwardPathCount: 0,
          missingReturnPathCount: 0,
          nextHopReviewCount: 0,
          routingReadiness: "ready",
          segmentationReadiness: "ready",
          notes: [],
        },
        routeTables: [],
        routeIntents: [
          {
            id: routeIntentId,
            name: "HQ Default Route",
            routeDomainId: "route-domain-corporate",
            routeDomainName: "Corporate",
            siteId: "site-hq",
            routeKind: "default",
            destinationCidr: "0.0.0.0/0",
            nextHopType: "connected-interface",
            nextHopObjectId: interfaceId,
            administrativeState: "proposed",
            truthState: "proposed",
            routePurpose: "Internet egress through firewall/transit path",
            evidence: ["Default route is required for controlled internet egress."],
            notes: [],
          },
        ],
        routeEntries: [],
        routeConflictReviews: [],
        siteReachabilityChecks: [],
        segmentationExpectations: [],
        reachabilityFindings: [],
      },
      securityPolicyFlow: {
        summary: {
          serviceObjectCount: 0,
          serviceGroupCount: 0,
          policyMatrixRowCount: 0,
          ruleOrderReviewCount: 0,
          natReviewCount: 1,
          flowRequirementCount: 1,
          satisfiedFlowCount: 0,
          missingPolicyCount: 0,
          conflictingPolicyCount: 0,
          missingNatCount: 1,
          broadPermitFindingCount: 0,
          shadowedRuleCount: 0,
          implicitDenyGapCount: 0,
          loggingGapCount: 0,
          findingCount: 1,
          blockingFindingCount: 1,
          policyReadiness: "blocked",
          natReadiness: "blocked",
          notes: [],
        },
        serviceObjects: [],
        serviceGroups: [],
        policyMatrix: [],
        ruleOrderReviews: [],
        natReviews: [
          {
            id: "nat-review-internal-egress",
            natRuleId,
            natRuleName: "Internal Egress NAT",
            sourceZoneId: "zone-internal",
            sourceZoneName: "Internal",
            destinationZoneId: "zone-wan",
            destinationZoneName: "WAN",
            translatedAddressMode: "interface-overload",
            status: "required",
            coveredFlowRequirementIds: [],
            missingFlowRequirementIds: [securityFlowId],
            state: "blocked",
            notes: ["Regression fixture: NAT must not pass when required flow coverage is missing."],
          },
        ],
        flowRequirements: [
          {
            id: securityFlowId,
            name: "Internal to WAN egress",
            sourceZoneId: "zone-internal",
            sourceZoneName: "Internal",
            destinationZoneId: "zone-wan",
            destinationZoneName: "WAN",
            expectedAction: "allow",
            observedPolicyAction: "allow",
            observedPolicyRuleId: "policy-internal-egress",
            observedPolicyRuleName: "Internal Egress",
            serviceNames: ["dns", "http", "https"],
            matchedPolicyRuleIds: ["policy-internal-egress"],
            natRequired: true,
            matchedNatRuleIds: [],
            state: "missing-nat",
            severityIfMissing: "ERROR",
            ruleOrderSensitive: true,
            implicitDenyExpected: false,
            loggingRequired: true,
            rationale: "Internal users require controlled internet egress through NAT.",
            truthState: "proposed",
            notes: [],
          },
        ],
        findings: [
          {
            severity: "ERROR",
            code: "SECURITY_NAT_REQUIRED_FLOW_UNCOVERED",
            title: "NAT-required flow is uncovered",
            detail: "Internal egress requires NAT but has no matching NAT rule coverage.",
            affectedObjectIds: [securityFlowId, natRuleId],
            remediation: "Add or repair NAT rule coverage before implementation.",
          },
        ],
      },
  } as never;
}

function implementationPlanFixture(mutator?: (model: any) => void) {
  const model = implementationPlanNetworkObjectModel() as any;
  mutator?.(model);
  return buildImplementationPlanModel({ networkObjectModel: model });
}

run("phase 36 adds engineering metadata to every implementation step", () => {
  const plan = implementationPlanFixture();
  assert.ok(plan.steps.length >= 5);
  for (const step of plan.steps) {
    assert.ok(step.readinessReasons.length >= 1, `${step.id} missing readiness reasons`);
    assert.ok(step.blastRadius.length >= 1, `${step.id} missing blast radius`);
    assert.ok(step.requiredEvidence.length >= 1, `${step.id} missing required evidence`);
    assert.ok(step.acceptanceCriteria.length >= 1, `${step.id} missing acceptance criteria`);
    assert.ok(step.rollbackIntent.length >= 1, `${step.id} missing rollback intent`);
  }
});

run("phase 36 models real dependencies instead of a flat checklist", () => {
  const plan = implementationPlanFixture();
  const routeStep = plan.steps.find((step) => step.targetObjectId === routeIntentId);
  assert.ok(routeStep);
  assert.ok(routeStep.dependencies.some((dependency) => dependency.stepId === `implementation-step-interface-${interfaceId}`));
  assert.ok(plan.steps.filter((step) => step.id !== "implementation-step-review-authoritative-design-findings").every((step) => step.dependencies.length >= 1));
  assert.ok(plan.summary.dependencyCount >= plan.steps.length - 1);
});

run("phase 36B compiles graph-driven dependencies for security and NAT steps", () => {
  const plan = implementationPlanFixture();
  const flowStep = plan.steps.find((step) => step.targetObjectId === securityFlowId);
  const natStep = plan.steps.find((step) => step.targetObjectId === natRuleId);
  assert.ok(flowStep);
  assert.ok(natStep);
  assert.ok(flowStep.dependencies.some((dependency) => dependency.stepId === `implementation-step-interface-${interfaceId}`), "security flow should depend on the source zone interface");
  assert.ok(flowStep.dependencies.some((dependency) => dependency.stepId === `implementation-step-route-intent-${routeIntentId}`), "security flow should depend on the exact egress route intent");
  assert.ok(flowStep.dependencyObjectIds.includes("zone-internal"));
  assert.ok(flowStep.graphDependencyEdgeIds.some((edgeId) => edgeId.includes("edge-internal-initiates-flow")));
  assert.ok(natStep.dependencies.some((dependency) => dependency.stepId === `implementation-step-interface-${interfaceId}`), "NAT should depend on the source-zone interface");
  assert.ok(plan.dependencyGraph.preciseSecurityDependencyCount >= 3);
  assert.ok(plan.summary.preciseSecurityDependencyCount >= 3);
  assert.ok(plan.summary.graphDependencyEdgeCount >= plan.dependencyGraph.edgeCount);
});

run("phase 36 treats uncovered NAT-required flows as implementation blockers", () => {
  const plan = implementationPlanFixture();
  const flowStep = plan.steps.find((step) => step.targetObjectId === securityFlowId);
  const natStep = plan.steps.find((step) => step.targetObjectId === natRuleId);
  assert.equal(flowStep?.readiness, "blocked");
  assert.equal(natStep?.readiness, "blocked");
  assert.ok(flowStep?.blockers.some((blocker) => blocker.toLowerCase().includes("nat")));
  assert.ok(natStep?.blockers.some((blocker) => blocker.toLowerCase().includes("cover")));
  assert.equal(plan.summary.implementationReadiness, "blocked");
});

run("phase 36 exposes evidence, rollback, and blast-radius summary proof", () => {
  const plan = implementationPlanFixture();
  assert.equal(plan.summary.stepWithBlastRadiusCount, plan.steps.length);
  assert.equal(plan.summary.stepWithRequiredEvidenceCount, plan.steps.length);
  assert.equal(plan.summary.stepWithRollbackIntentCount, plan.steps.length);
  assert.ok(plan.verificationChecks.some((check) => check.id === "implementation-check-step-level-evidence"));
  assert.ok(plan.rollbackActions.some((action) => action.id === "rollback-action-stop-blocked-execution"));
});

run("phase 36C creates device operational-safety gates", () => {
  const plan = implementationPlanFixture();
  const safetyStep = plan.steps.find((step) => step.category === "operational-safety" && step.targetObjectId === "device-hq-core");
  assert.ok(safetyStep, "device operational-safety step should exist");
  assert.equal(safetyStep.readiness, "blocked");
  assert.ok(safetyStep.blockers.some((blocker) => blocker.toLowerCase().includes("management ip")));
  assert.ok(safetyStep.requiredEvidence.some((evidence) => evidence.toLowerCase().includes("backup")));
  assert.ok(safetyStep.requiredEvidence.some((evidence) => evidence.toLowerCase().includes("rollback")));
  assert.ok(plan.summary.operationalSafetyGateCount >= 1);
  assert.ok(plan.summary.operationalSafetyBlockedGateCount >= 1);
  assert.ok(plan.verificationChecks.some((check) => check.id === "implementation-check-operational-safety-device-hq-core"));
});

run("phase 36C gates risky route security and NAT steps on operational safety", () => {
  const plan = implementationPlanFixture();
  const safetyStepId = "implementation-step-operational-safety-device-hq-core";
  const routeStep = plan.steps.find((step) => step.targetObjectId === routeIntentId);
  const flowStep = plan.steps.find((step) => step.targetObjectId === securityFlowId);
  const natStep = plan.steps.find((step) => step.targetObjectId === natRuleId);
  assert.ok(routeStep);
  assert.ok(flowStep);
  assert.ok(natStep);
  assert.ok(routeStep.dependencies.some((dependency) => dependency.stepId === safetyStepId), "route step should depend on device safety gate");
  assert.ok(flowStep.dependencies.some((dependency) => dependency.stepId === safetyStepId), "security flow should depend on device safety gate");
  assert.ok(natStep.dependencies.some((dependency) => dependency.stepId === safetyStepId), "NAT step should depend on device safety gate");
  assert.ok(routeStep.blockers.some((blocker) => blocker.toLowerCase().includes("operational safety")));
  assert.ok(plan.findings.some((finding) => finding.code === "IMPLEMENTATION_OPERATIONAL_SAFETY_BLOCKED"));
  assert.ok(plan.rollbackActions.some((action) => action.id === "rollback-action-operational-safety-stop"));
});


run("phase 36D generates object-level and flow-level verification matrix checks", () => {
  const plan = implementationPlanFixture();
  assert.ok(plan.summary.objectLevelVerificationCheckCount >= 3, "interface, NAT, and DHCP object-level checks should be generated");
  assert.ok(plan.summary.routeLevelVerificationCheckCount >= 1, "route-level verification check should be generated");
  assert.ok(plan.summary.flowLevelVerificationCheckCount >= 1, "security-flow verification check should be generated");
  assert.ok(plan.summary.rollbackVerificationCheckCount >= 1, "rollback verification check should be generated");
  assert.ok(plan.summary.blockedVerificationCheckCount >= 1, "blocked implementation steps should propagate into verification readiness");

  for (const check of plan.verificationChecks) {
    assert.ok(check.verificationScope, `${check.id} missing verification scope`);
    assert.ok(check.sourceEngine, `${check.id} missing source engine`);
    assert.ok(check.relatedStepIds.length >= 1, `${check.id} missing related step IDs`);
    assert.ok(check.relatedObjectIds.length >= 1, `${check.id} missing related object IDs`);
    assert.ok(check.requiredEvidence.length >= 1, `${check.id} missing required evidence`);
    assert.ok(check.acceptanceCriteria.length >= 1, `${check.id} missing acceptance criteria`);
    assert.ok(check.readiness, `${check.id} missing readiness`);
  }

  assert.ok(plan.verificationChecks.some((check) => check.id === `implementation-check-route-intent-${routeIntentId}`));
  assert.ok(plan.verificationChecks.some((check) => check.id === `implementation-check-security-flow-${securityFlowId}`));
  assert.ok(plan.verificationChecks.some((check) => check.id === `implementation-check-nat-rule-${natRuleId}`));
  assert.ok(plan.verificationChecks.some((check) => check.id === "implementation-check-rollback-readiness"));
});

run("phase 36D keeps route missing next-hop as a route-step blocker", () => {
  const plan = implementationPlanFixture((model) => {
    model.routingSegmentation.routeIntents[0].nextHopObjectId = undefined;
    model.routingSegmentation.routeIntents[0].nextHopType = "transit-link";
  });
  const routeStep = plan.steps.find((step) => step.targetObjectId === routeIntentId);
  assert.ok(routeStep);
  assert.equal(routeStep.readiness, "blocked");
  assert.ok(routeStep.blockers.some((blocker) => blocker.toLowerCase().includes("concrete next-hop")));
  const routeCheck = plan.verificationChecks.find((check) => check.id === `implementation-check-route-intent-${routeIntentId}`);
  assert.ok(routeCheck);
  assert.equal(routeCheck.readiness, "blocked");
  assert.ok(routeCheck.blockingStepIds.includes(routeStep.id));
});

run("phase 36D keeps DHCP without a matching gateway interface blocked", () => {
  const plan = implementationPlanFixture((model) => {
    model.dhcpPools[0].gatewayIp = undefined;
    model.interfaces = [];
  });
  const dhcpStep = plan.steps.find((step) => step.targetObjectId === "dhcp-hq-users");
  assert.ok(dhcpStep);
  assert.equal(dhcpStep.readiness, "blocked");
  assert.ok(dhcpStep.blockers.some((blocker) => blocker.toLowerCase().includes("default gateway")));
  assert.ok(dhcpStep.blockers.some((blocker) => blocker.toLowerCase().includes("matching vlan gateway")));
  const dhcpCheck = plan.verificationChecks.find((check) => check.id === "implementation-check-dhcp-pool-dhcp-hq-users");
  assert.ok(dhcpCheck);
  assert.equal(dhcpCheck.readiness, "blocked");
});

run("phase 36D keeps missing security policy as a security-step blocker", () => {
  const plan = implementationPlanFixture((model) => {
    model.securityPolicyFlow.flowRequirements[0].state = "missing-policy";
    model.securityPolicyFlow.flowRequirements[0].natRequired = false;
    model.securityPolicyFlow.flowRequirements[0].matchedNatRuleIds = [];
    model.securityPolicyFlow.natReviews = [];
    model.natRules = [];
  });
  const flowStep = plan.steps.find((step) => step.targetObjectId === securityFlowId);
  assert.ok(flowStep);
  assert.equal(flowStep.readiness, "blocked");
  assert.ok(flowStep.blockers.some((blocker) => blocker.toLowerCase().includes("security policy")));
  const flowCheck = plan.verificationChecks.find((check) => check.id === `implementation-check-security-flow-${securityFlowId}`);
  assert.ok(flowCheck);
  assert.equal(flowCheck.readiness, "blocked");
});

run("phase 36D propagates upstream routing ERROR findings into affected implementation steps", () => {
  const plan = implementationPlanFixture((model) => {
    model.routingSegmentation.reachabilityFindings.push({
      severity: "ERROR",
      code: "ROUTE_NEXT_HOP_UNREACHABLE",
      title: "Route next hop is unreachable",
      detail: "Regression fixture: route cannot be implemented safely when next hop is unreachable.",
      routeDomainId: "route-domain-corporate",
      affectedObjectIds: [routeIntentId],
      remediation: "Repair or replace the next hop before implementation.",
    });
  });
  const routeStep = plan.steps.find((step) => step.targetObjectId === routeIntentId);
  assert.ok(routeStep);
  assert.equal(routeStep.readiness, "blocked");
  assert.ok(routeStep.upstreamFindingIds.some((id) => id.includes("route-next-hop-unreachable")));
  assert.ok(routeStep.blockers.some((blocker) => blocker.includes("ROUTE_NEXT_HOP_UNREACHABLE")));
});

run("phase 36D allows valid covered NAT to avoid blocked readiness", () => {
  const plan = implementationPlanFixture((model) => {
    model.devices[0].managementIp = "10.36.99.10";
    model.devices[0].notes = [
      "management access verified",
      "configuration snapshot baseline captured",
      "rollback path via console fallback access",
    ];
    model.securityPolicyFlow.flowRequirements[0].state = "satisfied";
    model.securityPolicyFlow.flowRequirements[0].matchedNatRuleIds = [natRuleId];
    model.securityPolicyFlow.natReviews[0].coveredFlowRequirementIds = [securityFlowId];
    model.securityPolicyFlow.natReviews[0].missingFlowRequirementIds = [];
    model.securityPolicyFlow.natReviews[0].state = "ready";
    model.securityPolicyFlow.findings = [];
  });
  const natStep = plan.steps.find((step) => step.targetObjectId === natRuleId);
  assert.ok(natStep);
  assert.notEqual(natStep.readiness, "blocked");
  assert.ok(!natStep.blockers.some((blocker) => blocker.toLowerCase().includes("cover required flow")));
  const natCheck = plan.verificationChecks.find((check) => check.id === `implementation-check-nat-rule-${natRuleId}`);
  assert.ok(natCheck);
  assert.notEqual(natCheck.readiness, "blocked");
});

run("phase 36D turns upstream security WARNING into affected-step review metadata", () => {
  const plan = implementationPlanFixture((model) => {
    model.devices[0].managementIp = "10.36.99.10";
    model.devices[0].notes = [
      "management access verified",
      "configuration snapshot baseline captured",
      "rollback path via console fallback access",
    ];
    model.securityPolicyFlow.flowRequirements[0].state = "satisfied";
    model.securityPolicyFlow.flowRequirements[0].matchedNatRuleIds = [natRuleId];
    model.securityPolicyFlow.natReviews[0].coveredFlowRequirementIds = [securityFlowId];
    model.securityPolicyFlow.natReviews[0].missingFlowRequirementIds = [];
    model.securityPolicyFlow.natReviews[0].state = "ready";
    model.securityPolicyFlow.findings = [
      {
        severity: "WARNING",
        code: "SECURITY_LOGGING_REVIEW",
        title: "Security logging requires review",
        detail: "Regression fixture: warning should not block but must be visible.",
        affectedObjectIds: [securityFlowId],
        remediation: "Confirm logging action before implementation.",
      },
    ];
  });
  const flowStep = plan.steps.find((step) => step.targetObjectId === securityFlowId);
  assert.ok(flowStep);
  assert.equal(flowStep.readiness, "review");
  assert.ok(flowStep.upstreamFindingIds.some((id) => id.includes("security-logging-review")));
  assert.ok(flowStep.readinessReasons.some((reason) => reason.includes("SECURITY_LOGGING_REVIEW")));
});
