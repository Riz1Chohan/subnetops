import assert from "node:assert/strict";
import {
  buildV1FinalProofPassControl,
  V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
  V1_PROOF_ROLE,
  V1_RELEASE_TARGET,
} from "../services/designCore/designCore.finalProofPassControl.js";
import { executeV1ScenarioMatrix } from "./scenarioMatrix.execution.js";
import { V1_SCENARIOS } from "./scenarioMatrix.fixtures.js";
import type { V1ProofContext, V1ScenarioExecutionResult } from "../domain/proof/index.js";

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
  ["V1ReadinessLadder", "V1_READINESS_LADDER_CONTRACT"],
] as const;

const EXECUTED_AT = "2026-01-01T00:00:00.000Z";
const realScenarioExecutionResults = executeV1ScenarioMatrix(V1_SCENARIOS, EXECUTED_AT);

function readyContext(scenarioExecutionResults: V1ScenarioExecutionResult[] = realScenarioExecutionResults): V1ProofContext {
  const context: V1ProofContext = {
    projectName: "V1 Proof Project",
    siteCount: 3,
    vlanCount: 12,
    issueCount: 0,
    reportTruth: { overallReadiness: "READY", blockedFindingCount: 0 },
    diagramTruth: { overallReadiness: "READY", renderModel: { nodes: [] } },
    scenarioExecutionResults,
  };
  for (const [key, contract] of contracts) context[key] = { contract, contractVersion: contract, overallReadiness: "READY", findingCount: 0, blockingFindingCount: 0 };
  return context;
}

function runV1FinalProofSelftest() {
  assert.equal(realScenarioExecutionResults.length, V1_SCENARIOS.length);
  assert.ok(realScenarioExecutionResults.every((result) => result.executedAt === EXECUTED_AT));
  assert.ok(realScenarioExecutionResults.every((result) => result.assertions.length > 0));

  const ready = buildV1FinalProofPassControl(readyContext());
  assert.equal(ready.contract, V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT);
  assert.equal(ready.role, V1_PROOF_ROLE);
  assert.equal(ready.releaseTarget, V1_RELEASE_TARGET);
  assert.equal(ready.engineProofCount, 20);
  assert.equal(ready.scenarioCount, realScenarioExecutionResults.length);
  assert.equal(ready.scenarioExecutionResultCount, realScenarioExecutionResults.length);
  assert.equal(ready.gateCount, 8);
  assert.ok(ready.releaseGates.some((gate) => gate.gateKey === "no-a-plus-overclaim" && gate.state === "PASSED"));
  assert.ok(ready.scenarioRows.every((row) => row.executedAt === EXECUTED_AT && row.assertionCount > 0));
  assert.ok(ready.scenarioRows.every((row) => row.expectedProofChain.includes("test/golden scenario proof")));
  assert.ok(ready.findings.some((finding) => finding.code === "V1_FINAL_PROOF_CONTROLLED") || ready.findings.some((finding) => finding.code === "V1_SCENARIO_BLOCKED"));

  const scenarioFailure = realScenarioExecutionResults.map((result, index) => index === 0 ? { ...result, assertions: [{ ...result.assertions[0], status: "FAIL" as const, actual: "forced failure" }] } : result);
  const blockedByScenario = buildV1FinalProofPassControl(readyContext(scenarioFailure));
  assert.equal(blockedByScenario.overallReadiness, "BLOCKED");
  assert.ok(blockedByScenario.findings.some((finding) => finding.code === "V1_SCENARIO_BLOCKED"));

  const missingExecutionContext = readyContext();
  delete missingExecutionContext.scenarioExecutionResults;
  const missingExecution = buildV1FinalProofPassControl(missingExecutionContext);
  assert.equal(missingExecution.overallReadiness, "BLOCKED");
  assert.ok(missingExecution.scenarioRows.some((row) => row.scenarioKey === "scenario-execution-missing"));

  const reviewContext = readyContext();
  reviewContext.V1DiscoveryCurrentState = { contract: "V1_DISCOVERY_CURRENT_STATE_CONTRACT", overallReadiness: "REVIEW_REQUIRED", findingCount: 1 };
  const review = buildV1FinalProofPassControl(reviewContext);
  assert.ok(["REVIEW_REQUIRED", "BLOCKED"].includes(review.overallReadiness));
  assert.ok(review.findings.some((finding) => finding.code === "V1_REVIEW_REQUIRED_LIMITATIONS") || review.findings.some((finding) => finding.code === "V1_SCENARIO_BLOCKED"));

  const blockedContext = readyContext();
  delete blockedContext.V1ValidationReadiness;
  const blocked = buildV1FinalProofPassControl(blockedContext);
  assert.equal(blocked.overallReadiness, "BLOCKED");
  assert.ok(blocked.engineProofRows.some((row) => row.engineKey === "V1ValidationReadiness" && row.status === "MISSING"));
  assert.ok(blocked.findings.some((finding) => finding.code === "V1_ENGINE_CONTRACT_GAP"));
}

runV1FinalProofSelftest();
console.log("[V1] final cross-engine proof pass selftest passed");
