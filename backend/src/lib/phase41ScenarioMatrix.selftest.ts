import assert from "node:assert/strict";
import { buildDesignCoreSnapshot } from "../services/designCore.service.js";
import { PHASE41_SCENARIOS, type Phase41ScenarioFixture } from "./phase41ScenarioMatrix.fixtures.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

type Snapshot = NonNullable<ReturnType<typeof buildDesignCoreSnapshot>>;
type FindingLike = { code?: string };

function codesFrom(values: FindingLike[]) {
  return values.map((item) => item.code).filter((code): code is string => Boolean(code));
}

function collectFindingCodes(snapshot: Snapshot) {
  const buckets: FindingLike[][] = [
    snapshot.issues,
    snapshot.networkObjectModel.designGraph.integrityFindings,
    snapshot.networkObjectModel.routingSegmentation.routeConflictReviews,
    snapshot.networkObjectModel.routingSegmentation.reachabilityFindings,
    snapshot.networkObjectModel.securityPolicyFlow.findings,
    snapshot.networkObjectModel.implementationPlan.findings,
  ];

  return new Set(buckets.flatMap(codesFrom));
}

function assertAtLeast(actual: number, minimum: number | undefined, label: string, scenario: Phase41ScenarioFixture) {
  if (minimum === undefined) return;
  assert.ok(actual >= minimum, `${scenario.id}: expected at least ${minimum} ${label}, got ${actual}`);
}

function assertScenario(scenario: Phase41ScenarioFixture) {
  const snapshot = buildDesignCoreSnapshot(scenario.project as never);
  assert.ok(snapshot, `${scenario.id}: snapshot was not generated`);

  const expected = scenario.expected;
  const findingCodes = collectFindingCodes(snapshot);
  const zoneRoles = new Set<string>(snapshot.networkObjectModel.securityZones.map((zone) => zone.zoneRole));
  const overlayKeys = new Set(snapshot.diagramTruth.renderModel.overlays.map((overlay) => overlay.key));
  const standardsViolations = new Set(snapshot.standardsAlignment.violatedRuleIds);

  assert.equal(snapshot.authority.source, "backend-design-core", `${scenario.id}: scenario must use backend design core authority`);
  assert.equal(snapshot.diagramTruth.renderModel.summary.backendAuthored, true, `${scenario.id}: diagram render model must be backend-authored`);
  assert.ok(expected.readinessOneOf.includes(snapshot.reportTruth.overallReadiness), `${scenario.id}: expected readiness in ${expected.readinessOneOf.join(", ")}, got ${snapshot.reportTruth.overallReadiness}`);

  for (const code of expected.requiredCodes ?? []) {
    assert.ok(findingCodes.has(code), `${scenario.id}: expected finding code ${code}`);
  }

  for (const code of expected.forbiddenCodes ?? []) {
    assert.equal(findingCodes.has(code), false, `${scenario.id}: forbidden finding code ${code} appeared`);
  }

  for (const ruleId of expected.requiredStandardsViolations ?? []) {
    assert.ok(standardsViolations.has(ruleId), `${scenario.id}: expected standards violation ${ruleId}`);
  }

  for (const zoneRole of expected.requiredZoneRoles ?? []) {
    assert.ok(zoneRoles.has(zoneRole), `${scenario.id}: expected zone role ${zoneRole}`);
  }

  for (const overlayKey of expected.requiredOverlayKeys ?? []) {
    assert.ok(overlayKeys.has(overlayKey as never), `${scenario.id}: expected backend render overlay ${overlayKey}`);
  }

  assertAtLeast(snapshot.summary.siteCount, expected.minSites, "sites", scenario);
  assertAtLeast(snapshot.summary.vlanCount, expected.minVlans, "VLAN/address rows", scenario);
  assertAtLeast(snapshot.networkObjectModel.devices.length, expected.minDevices, "devices", scenario);
  assertAtLeast(snapshot.networkObjectModel.interfaces.length, expected.minInterfaces, "interfaces", scenario);
  assertAtLeast(snapshot.networkObjectModel.links.length, expected.minLinks, "links", scenario);
  assertAtLeast(snapshot.networkObjectModel.routingSegmentation.summary.routeIntentCount, expected.minRouteIntents, "route intents", scenario);
  assertAtLeast(snapshot.networkObjectModel.securityPolicyFlow.summary.flowRequirementCount, expected.minSecurityFlows, "security flow requirements", scenario);
  assertAtLeast(snapshot.networkObjectModel.implementationPlan.summary.stepCount, expected.minImplementationSteps, "implementation steps", scenario);
  assertAtLeast(snapshot.networkObjectModel.implementationPlan.verificationChecks.length, expected.minVerificationChecks, "verification checks", scenario);
  assertAtLeast(snapshot.networkObjectModel.implementationPlan.rollbackActions.length, expected.minRollbackActions, "rollback actions", scenario);
  assertAtLeast(snapshot.diagramTruth.renderModel.nodes.length, expected.minDiagramRenderNodes, "backend render nodes", scenario);
  assertAtLeast(snapshot.reportTruth.implementationReviewQueue.length, expected.minImplementationReviewQueue, "implementation review queue items", scenario);

  if (expected.mustHaveProposal) {
    assert.ok(snapshot.proposedRows.length > 0, `${scenario.id}: expected at least one allocator proposal`);
  }

  if (expected.mustHaveTransitPlan) {
    assert.ok(snapshot.transitPlan.length > 0, `${scenario.id}: expected backend transit plan rows`);
  }

  if (expected.mustHaveLoopbackPlan) {
    assert.ok(snapshot.loopbackPlan.length > 0, `${scenario.id}: expected backend loopback plan rows`);
  }

  if (expected.mustHaveBlockedReportTruth) {
    assert.equal(snapshot.reportTruth.overallReadiness, "blocked", `${scenario.id}: blocked scenario must remain blocked in reportTruth`);
    assert.ok(snapshot.reportTruth.blockedFindings.length > 0, `${scenario.id}: blocked scenario must expose blocked findings`);
  }

  if (expected.mustDocumentKnownGap) {
    assert.ok(scenario.knownGaps.length > 0, `${scenario.id}: known-gap scenario must document the current product limitation`);
  }
}

run("phase 41 scenario library is broad enough to be useful", () => {
  assert.ok(PHASE41_SCENARIOS.length >= 8, "Phase 41 needs at least eight scenario fixtures, not a toy matrix.");
  const riskClasses = new Set(PHASE41_SCENARIOS.map((scenario) => scenario.riskClass));
  for (const required of ["baseline", "security", "routing", "addressing", "implementation", "known-gap"] as const) {
    assert.ok(riskClasses.has(required), `Phase 41 matrix is missing risk class ${required}`);
  }
});

for (const scenario of PHASE41_SCENARIOS) {
  run(`phase 41 scenario: ${scenario.id}`, () => assertScenario(scenario));
}

run("phase 41 scenario matrix protects export/report/diagram truth from drift", () => {
  const blockedScenarioCount = PHASE41_SCENARIOS.filter((scenario) => scenario.expected.mustHaveBlockedReportTruth).length;
  const diagramScenarioCount = PHASE41_SCENARIOS.filter((scenario) => (scenario.expected.minDiagramRenderNodes ?? 0) > 0).length;
  const verificationScenarioCount = PHASE41_SCENARIOS.filter((scenario) => (scenario.expected.minVerificationChecks ?? 0) > 0).length;

  assert.ok(blockedScenarioCount >= 6, "Most Phase 41 scenarios should intentionally prove blocked truth, not greenwashed readiness.");
  assert.equal(diagramScenarioCount, PHASE41_SCENARIOS.length, "Every scenario must protect backend diagram render truth.");
  assert.equal(verificationScenarioCount, PHASE41_SCENARIOS.length, "Every scenario must protect verification matrix generation.");
});
