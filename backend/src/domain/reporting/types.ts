import type { OmittedEvidenceSummary } from "../evidence/index.js";
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
  fullEvidenceInventory: { collection: string; totalCount: number; surfacedCount: number; omittedCount: number; readinessImpact: string }[];
  antiOverclaimRules: V1ReportAntiOverclaimRule[];
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
  fullEvidenceInventory: { collection: string; totalCount: number; surfacedCount: number; omittedCount: number; readinessImpact: string }[];
  antiOverclaimRules: V1ReportAntiOverclaimRule[];
  canClaimImplementationReady: boolean;
  canClaimProductionReady: boolean;
}
