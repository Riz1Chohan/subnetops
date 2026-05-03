import { buildPhase8ValidationReadinessControl, PHASE8_VALIDATION_READINESS_AUTHORITY_CONTRACT } from "../services/designCore/designCore.phase8ValidationReadinessControl.js";
import type {
  BackendDiagramTruthModel,
  BackendReportTruthModel,
  NetworkObjectModel,
  Phase3RequirementsClosureControlSummary,
  Phase4CidrAddressingTruthControlSummary,
  Phase5EnterpriseIpamTruthControlSummary,
  Phase6DesignCoreOrchestratorControlSummary,
  Phase7StandardsAlignmentRulebookControlSummary,
} from "../services/designCore.types.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[phase8] ${message}`);
}

const phase3 = {
  activeRequirementCount: 2,
  fullPropagatedCount: 1,
  missingConsumerCount: 1,
  closureMatrix: [
    {
      requirementId: "req-guestWifi",
      key: "guestWifi",
      label: "Guest Wi-Fi",
      active: true,
      lifecycleStatus: "PARTIALLY_PROPAGATED",
      readinessImpact: "REVIEW_REQUIRED",
      expectedAffectedEngines: ["requirements", "security", "diagram"],
      actualAffectedEngines: ["requirements"],
      missingConsumers: ["diagram", "report"],
      consumerCoverage: { frontendVisible: true, reportVisible: false, diagramVisible: false },
      evidence: ["Guest requirement exists but missing downstream consumers."],
    },
    {
      requirementId: "req-usersPerSite",
      key: "usersPerSite",
      label: "Users per site",
      active: true,
      lifecycleStatus: "FULLY_PROPAGATED",
      readinessImpact: "PASSED",
      expectedAffectedEngines: ["addressing"],
      actualAffectedEngines: ["addressing"],
      missingConsumers: [],
      consumerCoverage: { frontendVisible: true, reportVisible: true, diagramVisible: true },
      evidence: ["Addressing demand exists."],
    },
  ],
  goldenScenarioClosures: [
    {
      id: "guest-wifi",
      label: "Guest Wi-Fi",
      relevant: true,
      requiredRequirementKeys: ["guestWifi"],
      lifecycleStatus: "review-required",
      missingRequirementKeys: [],
      blockingRequirementKeys: [],
      reviewRequirementKeys: ["guestWifi"],
      evidence: ["Guest scenario is not fully closed."],
    },
  ],
} as unknown as Phase3RequirementsClosureControlSummary;

const phase4 = {
  totalAddressRowCount: 1,
  validSubnetCount: 1,
  requirementAddressingGapCount: 0,
  edgeCaseProofs: [{ id: "cidr-/31", label: "/31 WAN proof", status: "passed", evidence: ["/31 accepted only for WAN transit."], selftest: "phase4" }],
  requirementAddressingMatrix: [],
  addressingTruthRows: [
    {
      rowId: "vlan-guest",
      siteName: "HQ",
      vlanId: 20,
      vlanName: "Guest",
      readinessImpact: "PASSED",
      blockers: [],
      evidence: ["Valid subnet."],
    },
  ],
} as unknown as Phase4CidrAddressingTruthControlSummary;

const phase5 = {
  approvedAllocationCount: 0,
  conflictBlockerCount: 1,
  overallReadiness: "BLOCKING",
  reconciliationRows: [
    {
      rowId: "vlan-guest",
      siteName: "HQ",
      vlanId: 20,
      vlanName: "Guest",
      reconciliationState: "ENGINE2_CONFLICT_REVIEW_BLOCKER",
      readinessImpact: "BLOCKING",
      blockers: ["Brownfield overlap exists."],
      reviewReasons: [],
      evidence: ["Engine 2 conflict."],
    },
  ],
  requirementIpamMatrix: [],
  conflictRows: [],
} as unknown as Phase5EnterpriseIpamTruthControlSummary;

const phase6 = {
  presentSnapshotSectionCount: 13,
  requiredSnapshotSectionCount: 13,
  boundaryFindings: [],
} as unknown as Phase6DesignCoreOrchestratorControlSummary;

const phase7 = {
  passRuleCount: 1,
  blockingRuleCount: 1,
  reviewRuleCount: 0,
  warningRuleCount: 0,
  findings: [
    {
      id: "standards-guest",
      severity: "BLOCKING",
      code: "STANDARDS_RULE_BLOCKER",
      ruleId: "GUEST-ISOLATION",
      title: "Guest isolation missing",
      detail: "Guest-to-internal deny evidence is missing.",
      affectedEngine: "Security policy flow",
      affectedObjectIds: ["zone-guest"],
      remediationGuidance: "Add guest isolation evidence.",
    },
  ],
} as unknown as Phase7StandardsAlignmentRulebookControlSummary;

const networkObjectModel = {
  routingSegmentation: { summary: { routingReadiness: "ready", segmentationReadiness: "ready", blockingFindingCount: 0, reachabilityFindingCount: 0, notes: [] } },
  securityPolicyFlow: { summary: { policyReadiness: "blocked", natReadiness: "ready", blockingFindingCount: 1, missingPolicyCount: 1, missingNatCount: 0, notes: ["Guest flow is missing."] } },
  implementationPlan: { summary: { implementationReadiness: "review", blockedStepCount: 0, reviewStepCount: 1, blockingFindingCount: 0, notes: ["Review upstream security." ] } },
} as unknown as NetworkObjectModel;

const reportTruth = {
  overallReadiness: "review",
  overallReadinessLabel: "review",
  blockedFindings: [],
  reviewFindings: [{ title: "Report review", detail: "Traceability review required.", severity: "WARNING", source: "validation" }],
  limitations: ["Report must preserve validation warning."],
} as unknown as BackendReportTruthModel;

const diagramTruth = {
  overallReadiness: "review",
  hasModeledTopology: true,
  hotspots: [{ title: "Diagram review", detail: "Guest zone needs evidence.", readiness: "review", scopeLabel: "security" }],
} as unknown as BackendDiagramTruthModel;

const summary = buildPhase8ValidationReadinessControl({
  projectId: "project-1",
  phase3RequirementsClosure: phase3,
  phase4CidrAddressingTruth: phase4,
  phase5EnterpriseIpamTruth: phase5,
  phase6DesignCoreOrchestrator: phase6,
  phase7StandardsRulebookControl: phase7,
  networkObjectModel,
  reportTruth,
  diagramTruth,
  issues: [],
});

assert(summary.contractVersion === PHASE8_VALIDATION_READINESS_AUTHORITY_CONTRACT, "contract marker mismatch");
assert(summary.validationRole === "STRICT_READINESS_AUTHORITY_NOT_ADVISORY_SUMMARY", "strict validation role missing");
assert(summary.overallReadiness === "BLOCKING", "IPAM/standards blocker must block Phase 8");
assert(summary.validationGateAllowsImplementation === false, "blocked/review findings must prevent implementation gate");
assert(summary.blockingFindingCount >= 2, "expected IPAM and standards blockers");
assert(summary.reviewRequiredFindingCount >= 2, "expected requirement/implementation review findings");
assert(summary.coverageRows.some((row) => row.domain === "Enterprise IPAM" && row.readiness === "BLOCKING"), "IPAM coverage must be blocking");
assert(summary.requirementGateRows.some((row) => row.requirementKey === "guestWifi" && row.readinessImpact === "REVIEW_REQUIRED"), "guestWifi requirement gate must be review-required");
assert(summary.findings.some((finding) => finding.ruleCode === "VALIDATION_IPAM_DURABLE_AUTHORITY_GAP"), "IPAM durable authority gap finding missing");
assert(summary.findings.every((finding) => finding.frontendImpact && finding.reportImpact && finding.diagramImpact && finding.remediation), "every finding needs consumer impact and remediation evidence");

console.log("[phase8] Validation readiness authority selftest passed");
