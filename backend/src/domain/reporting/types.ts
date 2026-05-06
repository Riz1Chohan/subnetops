import type { OmittedEvidenceDecisionSummary, OmittedEvidenceSummary } from "../evidence/index.js";
export type ReportExportReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type DesignTruthReadiness = "ready" | "review" | "blocked" | "unknown" | string;

export type V1ReportTruthLabel =
  | "USER_PROVIDED"
  | "REQUIREMENT_MATERIALIZED"
  | "BACKEND_COMPUTED"
  | "DURABLE_IPAM"
  | "INFERRED"
  | "ESTIMATED"
  | "REVIEW_REQUIRED"
  | "BLOCKED"
  | "UNSUPPORTED";

export interface V1ReportSectionGateRow {
  sectionKey: string;
  title: string;
  required: boolean;
  readinessImpact: ReportExportReadiness;
  reportSection: string;
  frontendLocation: string;
  truthLabels: V1ReportTruthLabel[];
  evidence: string[];
  blockers: string[];
}

export interface V1ReportTraceabilityMatrixRow {
  requirementKey: string;
  requirementLabel: string;
  designConsequence: string;
  enginesAffected: string[];
  frontendLocation: string;
  reportSection: string;
  diagramImpact: string;
  readinessStatus: ReportExportReadiness;
  missingConsumers: string[];
  sourceObjectIds: string[];
}

export interface V1ReportTruthLabelRow {
  truthLabel: V1ReportTruthLabel;
  count: number;
  reportUsage: string;
  readinessImpact: ReportExportReadiness;
  evidence: string[];
}

export interface V1ReportExportTruthFinding {
  severity: "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED";
  code: string;
  title: string;
  detail: string;
  affectedSectionKeys: string[];
  readinessImpact: ReportExportReadiness;
  remediation: string;
}

export interface V1ReportAntiOverclaimRule {
  phrase: string;
  allowedOnlyWhen: "IMPLEMENTATION_READY" | "BACKEND_PROOF_SUPPORTS";
  claimAllowed: boolean;
  replacement: string;
  evidence: string[];
}

export interface V1ReportFullEvidenceAppendix {
  machineReadable: true;
  generatedFrom: "V1ReportExportTruth";
  includesRequirementTraceability: boolean;
  includesSectionGates: boolean;
  includesTruthLabels: boolean;
  includesFindings: boolean;
  includesOmittedEvidenceSummaries: boolean;
  includesFullEvidenceInventory: boolean;
  exportFormats: Array<"PDF" | "DOCX" | "CSV" | "JSON">;
}


export interface V1ReportEvidenceView {
  contract: "V1_REPORT_EVIDENCE_VIEW_CONTRACT";
  role: "CANONICAL_EXPORT_EVIDENCE_VIEW_FOR_DOCX_PDF_CSV_JSON_FRONTEND";
  readiness: { designReview: ReportExportReadiness; implementation: ReportExportReadiness; reportExport: ReportExportReadiness; diagram: ReportExportReadiness };
  validation: { rootBlockerCount: number; propagatedBlockerCount: number; derivedImpactCount: number; reviewItemCount: number; warningCount: number };
  requirements: { materializedCount: number; blockedCount: number; reviewRequiredCount: number; missingMandatoryConsumerCount: number };
  ipam: { plannedRows: number; candidateAllocations: number; approvedAllocations: number; staleAllocations: number; conflictBlockers: number };
  implementation: { executableSteps: number; planningCandidateSteps: number; blockedSteps: number; reviewSteps: number };
  omittedEvidence: { hiddenBlockerSurfaces: number; hiddenReviewSurfaces: number; omittedRows: number; blockingSurfaces: string[]; reviewSurfaces: string[]; implementationAffected: boolean; reportAffected: boolean; diagramAffected: boolean; decisionImpact: "NONE" | "REVIEW" | "BLOCKING" };
  sourceInvariant: "ALL_EXPORT_FORMATS_CONSUME_THIS_VIEW_NO_RECOMPUTED_COUNTS";
}

export type V1ExportConsistencySurface = "JSON" | "CSV" | "PDF" | "DOCX" | "FRONTEND";
export interface V1ExportConsistencySurfaceRow { surface: V1ExportConsistencySurface; sourcePath: string; rootBlockerCount: number; consumesEvidenceView: boolean; }
export interface V1ExportConsistencyProof { contract: "V1_RUNTIME_EXPORT_CONSISTENCY_KILL_SWITCH_CONTRACT"; sourceInvariant: "JSON_CSV_PDF_DOCX_FRONTEND_COUNTS_DERIVE_FROM_V1_REPORT_EVIDENCE_VIEW"; canonicalRootBlockerCount: number; countsAgree: boolean; surfaces: V1ExportConsistencySurfaceRow[]; candidateIpamRowsLabelledApprovedAuthority: number; implementationReadyClaimAllowed: boolean; implementationBlockedButExecutableClaimed: boolean; blockedRequirementRowsWithoutProof: number; blockedRequirementProofFailures: string[]; killSwitchPassed: boolean; failures: string[]; }

export interface V1ReportExportTruthControlSummary {
  contract: "V1_REPORT_EXPORT_TRUTH_CONTRACT";
  role: "REPORT_EXPORT_BACKEND_TRUTH_REQUIREMENT_TRACEABILITY_DELIVERABLE_GATE";
  overallReadiness: ReportExportReadiness;
  requiredSectionCount: number;
  readySectionCount: number;
  reviewSectionCount: number;
  blockedSectionCount: number;
  traceabilityRowCount: number;
  missingTraceabilityConsumerCount: number;
  truthLabelRowCount: number;
  blockedTruthLabelCount: number;
  pdfDocxCsvCovered: boolean;
  fullMachineReadableAppendix: V1ReportFullEvidenceAppendix;
  implementationReadyClaimAllowed: boolean;
  productionReadyClaimAllowed: boolean;
  findingCount: number;
  blockedFindingCount: number;
  reviewFindingCount: number;
  sectionGates: V1ReportSectionGateRow[];
  traceabilityMatrix: V1ReportTraceabilityMatrixRow[];
  truthLabelRows: V1ReportTruthLabelRow[];
  findings: V1ReportExportTruthFinding[];
  proofBoundary: string[];
  omittedEvidenceSummaries: OmittedEvidenceSummary[];
  omittedEvidenceDecisionSummary: OmittedEvidenceDecisionSummary;
  fullEvidenceInventory: { collection: string; totalCount: number; surfacedCount: number; omittedCount: number; readinessImpact: string }[];
  antiOverclaimRules: V1ReportAntiOverclaimRule[];
  evidenceView: V1ReportEvidenceView;
  exportConsistencyProof: V1ExportConsistencyProof;
  notes: string[];
}

export type NetworkObjectModel = any;
export type BackendDiagramTruthModel = any;
export type BackendReportTruthModel = any;
export type V1RoutingSegmentationControlSummary = any;
export type V1SecurityPolicyFlowControlSummary = any;
export type V1ImplementationPlanningControlSummary = any;
export type V1ImplementationTemplateControlSummary = any;
export type V1RequirementsClosureControlSummary = any;
export type V1CidrAddressingTruthControlSummary = any;
export type V1EnterpriseIpamTruthControlSummary = any;
export type V1ValidationReadinessControlSummary = any;
export type V1NetworkObjectModelControlSummary = any;

export interface ReportExportSection {
  key: string;
  title: string;
  status: "verified" | "partial" | "requires_review" | "not_available" | "not_supported";
  summary: string;
  facts: string[];
  findings: V1ReportExportTruthFinding[];
  evidence: string[];
  limitations: string[];
  recommendedActions: string[];
}

export interface ReportExportEvidenceDocument {
  readiness: ReportExportReadiness;
  sections: ReportExportSection[];
  findings: V1ReportExportTruthFinding[];
  proofBoundary: string[];
  omittedEvidenceSummaries: OmittedEvidenceSummary[];
  omittedEvidenceDecisionSummary: OmittedEvidenceDecisionSummary;
  fullEvidenceInventory: { collection: string; totalCount: number; surfacedCount: number; omittedCount: number; readinessImpact: string }[];
  antiOverclaimRules: V1ReportAntiOverclaimRule[];
  canClaimImplementationReady: boolean;
  canClaimProductionReady: boolean;
}
