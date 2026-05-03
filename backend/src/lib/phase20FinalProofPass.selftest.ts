import assert from "node:assert/strict";
import {
  buildPhase20FinalProofPassControl,
  PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
  PHASE20_PROOF_ROLE,
  PHASE20_RELEASE_TARGET,
} from "../services/designCore/designCore.phase20FinalProofPassControl.js";

const contracts = [
  ["phase1TraceabilityControl", "PHASE1_PLANNING_INPUT_DISCIPLINE_TRACEABILITY"],
  ["phase2RequirementsMaterialization", "PHASE2_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT"],
  ["phase3RequirementsClosure", "PHASE3_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF"],
  ["phase4CidrAddressingTruth", "PHASE4_ENGINE1_CIDR_ADDRESSING_TRUTH"],
  ["phase5EnterpriseIpamTruth", "PHASE5_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW"],
  ["phase6DesignCoreOrchestrator", "PHASE6_DESIGN_CORE_ORCHESTRATOR_CONTRACT"],
  ["phase7StandardsRulebookControl", "PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT"],
  ["phase8ValidationReadiness", "PHASE8_VALIDATION_READINESS_AUTHORITY_CONTRACT"],
  ["phase9NetworkObjectModel", "PHASE9_NETWORK_OBJECT_MODEL_TRUTH_CONTRACT"],
  ["phase10DesignGraph", "PHASE10_DESIGN_GRAPH_DEPENDENCY_INTEGRITY_CONTRACT"],
  ["phase11RoutingSegmentation", "PHASE11_ROUTING_SEGMENTATION_PROTOCOL_AWARE_PLANNING_CONTRACT"],
  ["phase12SecurityPolicyFlow", "PHASE12_SECURITY_POLICY_FLOW_CONTRACT"],
  ["phase13ImplementationPlanning", "PHASE13_IMPLEMENTATION_PLANNING_CONTRACT"],
  ["phase14ImplementationTemplates", "PHASE14_VENDOR_NEUTRAL_IMPLEMENTATION_TEMPLATES_CONTRACT"],
  ["phase15ReportExportTruth", "PHASE15_REPORT_EXPORT_TRUTH_CONTRACT"],
  ["phase16DiagramTruth", "PHASE16_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT"],
  ["phase17PlatformBomFoundation", "PHASE17_PLATFORM_BOM_FOUNDATION_CONTRACT"],
  ["phase18DiscoveryCurrentState", "PHASE18_DISCOVERY_CURRENT_STATE_CONTRACT"],
  ["phase19AiDraftHelper", "PHASE19_AI_DRAFT_HELPER_CONTRACT"],
] as const;

function readyContext() {
  const context: Record<string, object | string | number> = {
    projectName: "Phase 20 Proof Project",
    siteCount: 3,
    vlanCount: 12,
    issueCount: 0,
    reportTruth: { overallReadiness: "READY", blockedFindingCount: 0 },
    diagramTruth: { overallReadiness: "READY", renderModel: { nodes: [] } },
  };
  for (const [key, contract] of contracts) context[key] = { contract, contractVersion: contract, overallReadiness: "READY", findingCount: 0, blockingFindingCount: 0 };
  return context;
}

function runPhase20FinalProofSelftest() {
  const ready = buildPhase20FinalProofPassControl(readyContext());
  assert.equal(ready.contract, PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT);
  assert.equal(ready.role, PHASE20_PROOF_ROLE);
  assert.equal(ready.releaseTarget, PHASE20_RELEASE_TARGET);
  assert.equal(ready.engineProofCount, 19);
  assert.equal(ready.scenarioCount, 12);
  assert.equal(ready.gateCount, 8);
  assert.equal(ready.overallReadiness, "PROOF_READY");
  assert.ok(ready.releaseGates.some((gate) => gate.gateKey === "no-a-plus-overclaim" && gate.state === "PASSED"));
  assert.ok(ready.scenarioRows.every((row) => row.expectedProofChain.includes("test/golden scenario proof")));
  assert.ok(ready.findings.some((finding) => finding.code === "PHASE20_FINAL_PROOF_CONTROLLED"));

  const reviewContext = readyContext();
  reviewContext.phase18DiscoveryCurrentState = { contract: "PHASE18_DISCOVERY_CURRENT_STATE_CONTRACT", overallReadiness: "REVIEW_REQUIRED", findingCount: 1 };
  const review = buildPhase20FinalProofPassControl(reviewContext);
  assert.equal(review.overallReadiness, "REVIEW_REQUIRED");
  assert.ok(review.findings.some((finding) => finding.code === "PHASE20_REVIEW_REQUIRED_LIMITATIONS"));
  assert.ok(review.scenarioRows.some((row) => row.scenarioKey === "brownfield-migration" && row.readinessImpact === "REVIEW_REQUIRED"));

  const blockedContext = readyContext();
  delete blockedContext.phase8ValidationReadiness;
  const blocked = buildPhase20FinalProofPassControl(blockedContext);
  assert.equal(blocked.overallReadiness, "BLOCKED");
  assert.ok(blocked.engineProofRows.some((row) => row.engineKey === "phase8ValidationReadiness" && row.status === "MISSING"));
  assert.ok(blocked.findings.some((finding) => finding.code === "PHASE20_ENGINE_CONTRACT_GAP"));
}

runPhase20FinalProofSelftest();
console.log("[phase20] final cross-engine proof pass selftest passed");
