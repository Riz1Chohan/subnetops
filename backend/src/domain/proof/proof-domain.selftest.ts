import assert from "node:assert/strict";
import {
  buildV1FinalProofPassControl,
  V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
  V1_PROOF_ROLE,
  V1_RELEASE_TARGET,
  type V1ProofContext,
  type V1ScenarioExecutionResult,
} from "./index.js";

const contracts = [
  ["V1TraceabilityControl", "V1_PLANNING_INPUT_DISCIPLINE_TRACEABILITY"],
  ["V1RequirementsMaterialization", "V1_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT"],
  ["V1RequirementsClosure", "V1_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF"],
  ["V1CidrAddressingTruth", "V1_ENGINE1_CIDR_ADDRESSING_TRUTH"],
  ["V1EnterpriseIpamTruth", "V1_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW"],
  ["V1DesignCoreOrchestrator", "V1_DESIGN_CORE_ORCHESTRATOR_CONTRACT"],
  ["V1StandardsRulebookControl", "V1_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT"],
  ["V1ValidationReadiness", "V1_VALIDATION_READINESS_AUTHORITY_CONTRACT"],
  ["V1NetworkObjectModel", "V1_NETWORK_OBJECT_MODEL_TRUTH_CONTRACT"],
  ["V1DesignGraph", "V1_DESIGN_GRAPH_DEPENDENCY_INTEGRITY_CONTRACT"],
  ["V1RoutingSegmentation", "V1_ROUTING_SEGMENTATION_PROTOCOL_AWARE_PLANNING_CONTRACT"],
  ["V1SecurityPolicyFlow", "V1_SECURITY_POLICY_FLOW_CONTRACT"],
  ["V1ImplementationPlanning", "V1_IMPLEMENTATION_PLANNING_CONTRACT"],
  ["V1ImplementationTemplates", "V1_VENDOR_NEUTRAL_IMPLEMENTATION_TEMPLATES_CONTRACT"],
  ["V1ReportExportTruth", "V1_REPORT_EXPORT_TRUTH_CONTRACT"],
  ["V1DiagramTruth", "V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT"],
  ["V1PlatformBomFoundation", "V1_PLATFORM_BOM_FOUNDATION_CONTRACT"],
  ["V1DiscoveryCurrentState", "V1_DISCOVERY_CURRENT_STATE_CONTRACT"],
  ["V1AiDraftHelper", "V1_AI_DRAFT_HELPER_CONTRACT"],
] as const;

const scenarioIds = [
  "clean-small-branch-network",
  "multi-site-enterprise",
  "missing-capacity-input",
  "invalid-gateway",
  "invalid-cidr",
  "overlapping-subnet",
  "partial-vlan-update",
  "routing-required-missing-wan-intent",
  "security-policy-review-required",
  "diagram-omitted-evidence",
  "report-blocked-unresolved-review-item",
  "read-repair-materialization",
  "project-reload-after-saved-requirements",
];

function scenarioExecutionResults(reviewScenarioId?: string, failedScenarioId?: string): V1ScenarioExecutionResult[] {
  return scenarioIds.map((scenarioId) => ({
    scenarioId,
    scenarioName: scenarioId.replace(/-/g, " "),
    scenarioCategory: scenarioId,
    inputFixture: { scenarioId, source: "proof-domain-selftest-fixture" },
    executedAt: "2026-01-01T00:00:00.000Z",
    snapshotResult: { overallReadiness: failedScenarioId === scenarioId ? "blocked" : reviewScenarioId === scenarioId ? "review" : "ready" },
    assertions: [
      {
        assertionId: `${scenarioId}:executed`,
        description: "Scenario execution result must come from a completed scenario run.",
        expected: "PASS",
        actual: failedScenarioId === scenarioId ? "FAIL" : reviewScenarioId === scenarioId ? "REVIEW" : "PASS",
        status: failedScenarioId === scenarioId ? "FAIL" : reviewScenarioId === scenarioId ? "REVIEW" : "PASS",
      },
    ],
    affectedEngines: ["scenario-matrix", "design-core", "validation", "report-export", "diagram-truth"],
    reportEvidence: [`report=${scenarioId}`],
    diagramEvidence: [`diagram=${scenarioId}`],
    validationEvidence: [`validation=${scenarioId}`],
  }));
}

function readyContext(): V1ProofContext {
  const context: V1ProofContext = {
    projectName: "V1 Proof Project",
    siteCount: 3,
    vlanCount: 12,
    issueCount: 0,
    reportTruth: { overallReadiness: "READY", blockedFindingCount: 0 },
    diagramTruth: { overallReadiness: "READY", renderModel: { nodes: [] } },
    scenarioExecutionResults: scenarioExecutionResults(),
  };
  for (const [key, contract] of contracts) {
    context[key] = { contract, contractVersion: contract, overallReadiness: "READY", findingCount: 0, blockingFindingCount: 0 };
  }
  return context;
}

const ready = buildV1FinalProofPassControl(readyContext());
assert.equal(ready.contract, V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT);
assert.equal(ready.role, V1_PROOF_ROLE);
assert.equal(ready.releaseTarget, V1_RELEASE_TARGET);
assert.equal(ready.engineProofCount, 19);
assert.equal(ready.scenarioCount, scenarioIds.length);
assert.equal(ready.scenarioExecutionResultCount, scenarioIds.length);
assert.equal(ready.gateCount, 8);
assert.equal(ready.overallReadiness, "PROOF_READY");
assert.ok(ready.releaseGates.some((gate) => gate.gateKey === "no-a-plus-overclaim" && gate.state === "PASSED"));
assert.ok(ready.scenarioRows.every((row) => row.executedAt && row.assertionCount > 0));
assert.ok(ready.scenarioRows.every((row) => row.expectedProofChain.includes("test/golden scenario proof")));
assert.ok(ready.findings.some((finding) => finding.code === "V1_FINAL_PROOF_CONTROLLED"));

const scenarioReviewContext = readyContext();
scenarioReviewContext.scenarioExecutionResults = scenarioExecutionResults("missing-capacity-input");
const scenarioReview = buildV1FinalProofPassControl(scenarioReviewContext);
assert.equal(scenarioReview.overallReadiness, "REVIEW_REQUIRED");
assert.ok(scenarioReview.scenarioRows.some((row) => row.scenarioKey === "missing-capacity-input" && row.readinessImpact === "REVIEW_REQUIRED"));

const reviewContext = readyContext();
reviewContext.V1DiscoveryCurrentState = { contract: "V1_DISCOVERY_CURRENT_STATE_CONTRACT", overallReadiness: "REVIEW_REQUIRED", findingCount: 1 };
const review = buildV1FinalProofPassControl(reviewContext);
assert.equal(review.overallReadiness, "REVIEW_REQUIRED");
assert.ok(review.findings.some((finding) => finding.code === "V1_REVIEW_REQUIRED_LIMITATIONS"));

const blockedContext = readyContext();
delete blockedContext.V1ValidationReadiness;
const blocked = buildV1FinalProofPassControl(blockedContext);
assert.equal(blocked.overallReadiness, "BLOCKED");
assert.ok(blocked.engineProofRows.some((row) => row.engineKey === "V1ValidationReadiness" && row.status === "MISSING"));
assert.ok(blocked.findings.some((finding) => finding.code === "V1_ENGINE_CONTRACT_GAP"));

const missingExecutionContext = readyContext();
delete missingExecutionContext.scenarioExecutionResults;
const missingExecution = buildV1FinalProofPassControl(missingExecutionContext);
assert.equal(missingExecution.overallReadiness, "BLOCKED");
assert.ok(missingExecution.scenarioRows.some((row) => row.scenarioKey === "scenario-execution-missing" && row.readinessImpact === "BLOCKED"));

console.log("[V1] proof domain selftest passed");
