import assert from "node:assert/strict";
import {
  buildV1FinalProofPassControl,
  V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
  V1_PROOF_ROLE,
  V1_RELEASE_TARGET,
} from "../services/designCore/designCore.finalProofPassControl.js";

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

function readyContext() {
  const context: Record<string, object | string | number> = {
    projectName: "V1 Proof Project",
    siteCount: 3,
    vlanCount: 12,
    issueCount: 0,
    reportTruth: { overallReadiness: "READY", blockedFindingCount: 0 },
    diagramTruth: { overallReadiness: "READY", renderModel: { nodes: [] } },
  };
  for (const [key, contract] of contracts) context[key] = { contract, contractVersion: contract, overallReadiness: "READY", findingCount: 0, blockingFindingCount: 0 };
  return context;
}

function runV1FinalProofSelftest() {
  const ready = buildV1FinalProofPassControl(readyContext());
  assert.equal(ready.contract, V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT);
  assert.equal(ready.role, V1_PROOF_ROLE);
  assert.equal(ready.releaseTarget, V1_RELEASE_TARGET);
  assert.equal(ready.engineProofCount, 19);
  assert.equal(ready.scenarioCount, 12);
  assert.equal(ready.gateCount, 8);
  assert.equal(ready.overallReadiness, "PROOF_READY");
  assert.ok(ready.releaseGates.some((gate) => gate.gateKey === "no-a-plus-overclaim" && gate.state === "PASSED"));
  assert.ok(ready.scenarioRows.every((row) => row.expectedProofChain.includes("test/golden scenario proof")));
  assert.ok(ready.findings.some((finding) => finding.code === "V1_FINAL_PROOF_CONTROLLED"));

  const reviewContext = readyContext();
  reviewContext.V1DiscoveryCurrentState = { contract: "V1_DISCOVERY_CURRENT_STATE_CONTRACT", overallReadiness: "REVIEW_REQUIRED", findingCount: 1 };
  const review = buildV1FinalProofPassControl(reviewContext);
  assert.equal(review.overallReadiness, "REVIEW_REQUIRED");
  assert.ok(review.findings.some((finding) => finding.code === "V1_REVIEW_REQUIRED_LIMITATIONS"));
  assert.ok(review.scenarioRows.some((row) => row.scenarioKey === "brownfield-migration" && row.readinessImpact === "REVIEW_REQUIRED"));

  const blockedContext = readyContext();
  delete blockedContext.V1ValidationReadiness;
  const blocked = buildV1FinalProofPassControl(blockedContext);
  assert.equal(blocked.overallReadiness, "BLOCKED");
  assert.ok(blocked.engineProofRows.some((row) => row.engineKey === "V1ValidationReadiness" && row.status === "MISSING"));
  assert.ok(blocked.findings.some((finding) => finding.code === "V1_ENGINE_CONTRACT_GAP"));
}

runV1FinalProofSelftest();
console.log("[V1] final cross-engine proof pass selftest passed");
