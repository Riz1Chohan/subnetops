export type V1ProofReadiness = "PROOF_READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type V1ReleaseGateState = "PASSED" | "REVIEW_REQUIRED" | "BLOCKED";

export type V1ProofStageKey =
  | "V1TraceabilityControl"
  | "V1RequirementsMaterialization"
  | "V1RequirementsClosure"
  | "V1CidrAddressingTruth"
  | "V1EnterpriseIpamTruth"
  | "V1DesignCoreOrchestrator"
  | "V1StandardsRulebookControl"
  | "V1ValidationReadiness"
  | "V1NetworkObjectModel"
  | "V1DesignGraph"
  | "V1RoutingSegmentation"
  | "V1SecurityPolicyFlow"
  | "V1ImplementationPlanning"
  | "V1ImplementationTemplates"
  | "V1ReportExportTruth"
  | "V1DiagramTruth"
  | "V1PlatformBomFoundation"
  | "V1DiscoveryCurrentState"
  | "V1AiDraftHelper";

export type V1ProofContext = {
  projectName?: string;
  siteCount?: number;
  vlanCount?: number;
  issueCount?: number;
  V1TraceabilityControl?: object | null;
  V1RequirementsMaterialization?: object | null;
  V1RequirementsClosure?: object | null;
  V1CidrAddressingTruth?: object | null;
  V1EnterpriseIpamTruth?: object | null;
  V1DesignCoreOrchestrator?: object | null;
  V1StandardsRulebookControl?: object | null;
  V1ValidationReadiness?: object | null;
  V1NetworkObjectModel?: object | null;
  V1DesignGraph?: object | null;
  V1RoutingSegmentation?: object | null;
  V1SecurityPolicyFlow?: object | null;
  V1ImplementationPlanning?: object | null;
  V1ImplementationTemplates?: object | null;
  V1ReportExportTruth?: object | null;
  V1DiagramTruth?: object | null;
  V1PlatformBomFoundation?: object | null;
  V1DiscoveryCurrentState?: object | null;
  V1AiDraftHelper?: object | null;
  requirementsScenarioProof?: object | null;
  reportTruth?: object | null;
  diagramTruth?: object | null;
};

export interface V1ProofModuleRow {
  contract: "V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT";
  stage: number;
  engineKey: string;
  expectedContract: string;
  status: "PROVEN" | "REVIEW_REQUIRED" | "BLOCKED" | "MISSING" | "CONTRACT_GAP";
  readinessImpact: V1ProofReadiness;
  proofFocus: string;
  evidence: string[];
  blockers: string[];
}

export interface V1ScenarioProofRow {
  contract: "V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT";
  scenarioKey: string;
  scenarioName: string;
  requirementsCovered: string[];
  expectedProofChain: string[];
  expectedEngineStages: number[];
  actualEvidence: string[];
  missingEvidence: string[];
  readinessImpact: V1ProofReadiness;
  notes: string[];
}

export interface V1ReleaseGateRow {
  contract: "V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT";
  gateKey: string;
  gate: string;
  required: true;
  state: V1ReleaseGateState;
  evidence: string[];
  remediation: string;
}

export interface V1ProofFinding {
  severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED";
  code: string;
  title: string;
  detail: string;
  affectedItems: string[];
  readinessImpact: V1ProofReadiness;
  remediation: string;
}

export interface V1FinalProofPassControlSummary {
  contract: "V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT";
  role: "FINAL_CROSS_ENGINE_REQUIREMENT_TO_RELEASE_PROOF_GATE";
  releaseTarget: "A_MINUS_A_PLANNING_PLATFORM_NOT_A_PLUS";
  sourceOfTruthLevel: "final-cross-engine-proof-gate";
  overallReadiness: V1ProofReadiness;
  scenarioCount: number;
  scenarioProofReadyCount: number;
  scenarioReviewCount: number;
  scenarioBlockedCount: number;
  engineProofCount: number;
  engineProofReadyCount: number;
  engineProofReviewCount: number;
  engineProofBlockedCount: number;
  gateCount: number;
  passedGateCount: number;
  reviewGateCount: number;
  blockedGateCount: number;
  scenarioRows: V1ScenarioProofRow[];
  engineProofRows: V1ProofModuleRow[];
  releaseGates: V1ReleaseGateRow[];
  findings: V1ProofFinding[];
  proofBoundary: string[];
  notes: string[];
}

export type V1ExpectedProofModule = {
  stage: number;
  engineKey: V1ProofStageKey;
  expectedContract: string;
  proofFocus: string;
};

export type V1ScenarioDefinition = {
  scenarioKey: string;
  scenarioName: string;
  requirementsCovered: string[];
  expectedStageNumbers: number[];
  notes: string[];
};
