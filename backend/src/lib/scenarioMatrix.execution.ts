import { buildDesignCoreSnapshot } from "../services/designCore.service.js";
import type { V1ScenarioAssertion, V1ScenarioExecutionResult } from "../domain/proof/index.js";
import { V1_SCENARIOS, type V1ScenarioFixture, type V1ExpectedReadiness } from "./scenarioMatrix.fixtures.js";

type Snapshot = NonNullable<ReturnType<typeof buildDesignCoreSnapshot>>;
type FindingLike = { code?: string };

type AssertionStatus = V1ScenarioAssertion["status"];

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

function statusFor(condition: boolean, reviewInsteadOfFail = false): AssertionStatus {
  if (condition) return "PASS";
  return reviewInsteadOfFail ? "REVIEW" : "FAIL";
}

function assertion(params: {
  assertionId: string;
  description: string;
  expected: unknown;
  actual: unknown;
  condition: boolean;
  reviewInsteadOfFail?: boolean;
}): V1ScenarioAssertion {
  return {
    assertionId: params.assertionId,
    description: params.description,
    expected: params.expected,
    actual: params.actual,
    status: statusFor(params.condition, params.reviewInsteadOfFail),
  };
}

function assertAtLeastAssertion(actual: number, minimum: number | undefined, label: string, scenario: V1ScenarioFixture): V1ScenarioAssertion[] {
  if (minimum === undefined) return [];
  return [
    assertion({
      assertionId: `${scenario.id}:${label}:minimum`,
      description: `Scenario must produce at least ${minimum} ${label}.`,
      expected: minimum,
      actual,
      condition: actual >= minimum,
    }),
  ];
}

function scenarioCategoryFor(scenario: V1ScenarioFixture): string {
  if (scenario.id.includes("small-office")) return "clean small branch network";
  if (scenario.id.includes("multi-site")) return "multi-site enterprise";
  if (scenario.id.includes("invalid-gateway")) return "invalid gateway";
  if (scenario.id.includes("public-organization-range")) return "invalid CIDR or address policy";
  if (scenario.id.includes("overlap") || scenario.id.includes("dhcp-conflict")) return "overlapping subnet";
  if (scenario.id.includes("empty-site")) return "routing required but missing WAN/topology intent";
  if (scenario.riskClass === "security") return "security policy review required";
  if (scenario.riskClass === "known-gap") return "known gap explicitly documented";
  if (scenario.riskClass === "implementation") return "implementation blocked by unresolved review item";
  return scenario.riskClass;
}

export function executeV1Scenario(scenario: V1ScenarioFixture, executedAt = new Date().toISOString()): V1ScenarioExecutionResult {
  const snapshot = buildDesignCoreSnapshot(scenario.project as never);
  const expected = scenario.expected;
  const findingCodes = collectFindingCodes(snapshot);
  const zoneRoles = new Set<string>(snapshot.networkObjectModel.securityZones.map((zone) => zone.zoneRole));
  const overlayKeys = new Set(snapshot.diagramTruth.renderModel.overlays.map((overlay) => overlay.key));
  const standardsViolations = new Set(snapshot.standardsAlignment.violatedRuleIds);
  const assertions: V1ScenarioAssertion[] = [];

  assertions.push(
    assertion({
      assertionId: `${scenario.id}:backend-authority`,
      description: "Scenario snapshot must come from backend design-core authority.",
      expected: "backend-design-core",
      actual: snapshot.authority.source,
      condition: snapshot.authority.source === "backend-design-core",
    }),
    assertion({
      assertionId: `${scenario.id}:backend-diagram-authority`,
      description: "Scenario diagram render model must be backend-authored.",
      expected: true,
      actual: snapshot.diagramTruth.renderModel.summary.backendAuthored,
      condition: snapshot.diagramTruth.renderModel.summary.backendAuthored === true,
    }),
    assertion({
      assertionId: `${scenario.id}:readiness`,
      description: "Scenario report readiness must match the expected readiness envelope.",
      expected: expected.readinessOneOf,
      actual: snapshot.reportTruth.overallReadiness,
      condition: expected.readinessOneOf.includes(snapshot.reportTruth.overallReadiness as V1ExpectedReadiness),
    }),
  );

  for (const code of expected.requiredCodes ?? []) {
    assertions.push(assertion({ assertionId: `${scenario.id}:required-code:${code}`, description: `Scenario must expose required finding code ${code}.`, expected: code, actual: Array.from(findingCodes), condition: findingCodes.has(code) }));
  }

  for (const code of expected.forbiddenCodes ?? []) {
    assertions.push(assertion({ assertionId: `${scenario.id}:forbidden-code:${code}`, description: `Scenario must not expose forbidden finding code ${code}.`, expected: `not ${code}`, actual: Array.from(findingCodes), condition: !findingCodes.has(code) }));
  }

  for (const ruleId of expected.requiredStandardsViolations ?? []) {
    assertions.push(assertion({ assertionId: `${scenario.id}:standards:${ruleId}`, description: `Scenario must expose standards violation ${ruleId}.`, expected: ruleId, actual: Array.from(standardsViolations), condition: standardsViolations.has(ruleId) }));
  }

  for (const zoneRole of expected.requiredZoneRoles ?? []) {
    assertions.push(assertion({ assertionId: `${scenario.id}:zone:${zoneRole}`, description: `Scenario must include security zone role ${zoneRole}.`, expected: zoneRole, actual: Array.from(zoneRoles), condition: zoneRoles.has(zoneRole) }));
  }

  for (const overlayKey of expected.requiredOverlayKeys ?? []) {
    assertions.push(assertion({ assertionId: `${scenario.id}:overlay:${overlayKey}`, description: `Scenario must include backend render overlay ${overlayKey}.`, expected: overlayKey, actual: Array.from(overlayKeys), condition: overlayKeys.has(overlayKey as never) }));
  }

  assertions.push(
    ...assertAtLeastAssertion(snapshot.summary.siteCount, expected.minSites, "sites", scenario),
    ...assertAtLeastAssertion(snapshot.summary.vlanCount, expected.minVlans, "VLAN/address rows", scenario),
    ...assertAtLeastAssertion(snapshot.networkObjectModel.devices.length, expected.minDevices, "devices", scenario),
    ...assertAtLeastAssertion(snapshot.networkObjectModel.interfaces.length, expected.minInterfaces, "interfaces", scenario),
    ...assertAtLeastAssertion(snapshot.networkObjectModel.links.length, expected.minLinks, "links", scenario),
    ...assertAtLeastAssertion(snapshot.networkObjectModel.routingSegmentation.summary.routeIntentCount, expected.minRouteIntents, "route intents", scenario),
    ...assertAtLeastAssertion(snapshot.networkObjectModel.securityPolicyFlow.summary.flowRequirementCount, expected.minSecurityFlows, "security flow requirements", scenario),
    ...assertAtLeastAssertion(snapshot.networkObjectModel.implementationPlan.summary.stepCount, expected.minImplementationSteps, "implementation steps", scenario),
    ...assertAtLeastAssertion(snapshot.networkObjectModel.implementationPlan.verificationChecks.length, expected.minVerificationChecks, "verification checks", scenario),
    ...assertAtLeastAssertion(snapshot.networkObjectModel.implementationPlan.rollbackActions.length, expected.minRollbackActions, "rollback actions", scenario),
    ...assertAtLeastAssertion(snapshot.diagramTruth.renderModel.nodes.length, expected.minDiagramRenderNodes, "backend render nodes", scenario),
    ...assertAtLeastAssertion(snapshot.reportTruth.implementationReviewQueue.length, expected.minImplementationReviewQueue, "implementation review queue items", scenario),
  );

  if (expected.mustHaveProposal) {
    assertions.push(assertion({ assertionId: `${scenario.id}:allocator-proposal`, description: "Scenario must produce at least one allocator proposal.", expected: ">0", actual: snapshot.proposedRows.length, condition: snapshot.proposedRows.length > 0 }));
  }

  if (expected.mustHaveTransitPlan) {
    assertions.push(assertion({ assertionId: `${scenario.id}:transit-plan`, description: "Scenario must produce backend transit plan rows.", expected: ">0", actual: snapshot.transitPlan.length, condition: snapshot.transitPlan.length > 0 }));
  }

  if (expected.mustHaveLoopbackPlan) {
    assertions.push(assertion({ assertionId: `${scenario.id}:loopback-plan`, description: "Scenario must produce backend loopback plan rows.", expected: ">0", actual: snapshot.loopbackPlan.length, condition: snapshot.loopbackPlan.length > 0 }));
  }

  if (expected.mustHaveBlockedReportTruth) {
    assertions.push(
      assertion({ assertionId: `${scenario.id}:blocked-report-readiness`, description: "Blocked scenario must remain blocked in report truth.", expected: "blocked", actual: snapshot.reportTruth.overallReadiness, condition: snapshot.reportTruth.overallReadiness === "blocked" }),
      assertion({ assertionId: `${scenario.id}:blocked-report-findings`, description: "Blocked scenario must expose blocked findings.", expected: ">0", actual: snapshot.reportTruth.blockedFindings.length, condition: snapshot.reportTruth.blockedFindings.length > 0 }),
    );
  }

  if (expected.mustDocumentKnownGap) {
    assertions.push(assertion({ assertionId: `${scenario.id}:known-gap-documented`, description: "Known-gap scenario must document the current product limitation.", expected: ">0 known gaps", actual: scenario.knownGaps.length, condition: scenario.knownGaps.length > 0 }));
  }

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    scenarioCategory: scenarioCategoryFor(scenario),
    inputFixture: {
      id: scenario.id,
      name: scenario.name,
      riskClass: scenario.riskClass,
      intent: scenario.intent,
      knownGapCount: scenario.knownGaps.length,
    },
    executedAt,
    snapshotResult: {
      projectId: snapshot.projectId,
      overallReadiness: snapshot.reportTruth.overallReadiness,
      siteCount: snapshot.summary.siteCount,
      vlanCount: snapshot.summary.vlanCount,
      issueCount: snapshot.issues.length,
      blockedFindingCount: snapshot.reportTruth.blockedFindings.length,
      diagramNodeCount: snapshot.diagramTruth.renderModel.nodes.length,
      implementationStepCount: snapshot.networkObjectModel.implementationPlan.summary.stepCount,
    },
    assertions,
    affectedEngines: [
      "design-core",
      "validation-readiness",
      "network-object-model",
      "routing-segmentation",
      "security-policy-flow",
      "implementation-planning",
      "report-export-truth",
      "diagram-truth",
      `risk:${scenario.riskClass}`,
    ],
    reportEvidence: [
      `reportReadiness=${snapshot.reportTruth.overallReadiness}`,
      `blockedFindings=${snapshot.reportTruth.blockedFindings.length}`,
      `implementationReviewQueue=${snapshot.reportTruth.implementationReviewQueue.length}`,
    ],
    diagramEvidence: [
      `backendAuthored=${snapshot.diagramTruth.renderModel.summary.backendAuthored}`,
      `diagramNodes=${snapshot.diagramTruth.renderModel.nodes.length}`,
      `overlays=${Array.from(overlayKeys).join(",") || "none"}`,
    ],
    validationEvidence: [
      `issues=${snapshot.issues.length}`,
      `findingCodes=${Array.from(findingCodes).sort().join(",") || "none"}`,
      `standardsViolations=${Array.from(standardsViolations).sort().join(",") || "none"}`,
    ],
  };
}

export function executeV1ScenarioMatrix(scenarios: V1ScenarioFixture[] = V1_SCENARIOS, executedAt = new Date().toISOString()): V1ScenarioExecutionResult[] {
  return scenarios.map((scenario) => executeV1Scenario(scenario, executedAt));
}
