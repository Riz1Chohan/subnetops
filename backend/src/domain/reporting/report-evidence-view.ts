// V1_REPORT_EVIDENCE_VIEW_CONTRACT: one canonical report/export evidence view for DOCX/PDF/CSV/JSON/frontend consumers.
// This file is backend evidence plumbing only. Professional reports must not expose this developer contract text.
import { buildOmittedEvidenceDecisionSummary } from "../evidence/index.js";

export type V1ReportEvidenceReadiness = "READY" | "REVIEW_REQUIRED" | "BLOCKED";

export interface V1ReportEvidenceViewFindingCounts {
  rootBlockerCount: number;
  propagatedBlockerCount: number;
  derivedImpactCount: number;
  reviewItemCount: number;
  warningCount: number;
}

export interface V1ReportEvidenceView {
  contract: "V1_REPORT_EVIDENCE_VIEW_CONTRACT";
  role: "CANONICAL_EXPORT_EVIDENCE_VIEW_FOR_DOCX_PDF_CSV_JSON_FRONTEND";
  readiness: {
    designReview: V1ReportEvidenceReadiness;
    implementation: V1ReportEvidenceReadiness;
    reportExport: V1ReportEvidenceReadiness;
    diagram: V1ReportEvidenceReadiness;
  };
  validation: V1ReportEvidenceViewFindingCounts;
  requirements: {
    materializedCount: number;
    blockedCount: number;
    reviewRequiredCount: number;
    missingMandatoryConsumerCount: number;
  };
  ipam: {
    plannedRows: number;
    candidateAllocations: number;
    approvedAllocations: number;
    staleAllocations: number;
    conflictBlockers: number;
  };
  implementation: {
    executableSteps: number;
    planningCandidateSteps: number;
    blockedSteps: number;
    reviewSteps: number;
  };
  omittedEvidence: {
    hiddenBlockerSurfaces: number;
    hiddenReviewSurfaces: number;
    omittedRows: number;
    blockingSurfaces: string[];
    reviewSurfaces: string[];
    implementationAffected: boolean;
    reportAffected: boolean;
    diagramAffected: boolean;
    decisionImpact: "NONE" | "REVIEW" | "BLOCKING";
  };
  sourceInvariant: "ALL_EXPORT_FORMATS_CONSUME_THIS_VIEW_NO_RECOMPUTED_COUNTS";
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export function normalizeReportEvidenceReadiness(value: unknown): V1ReportEvidenceReadiness {
  const text = String(value ?? "").trim().toUpperCase();
  if (["BLOCKED", "BLOCKING", "ERROR", "NOT_READY", "FAILED"].includes(text)) return "BLOCKED";
  if (["READY", "PASSED", "PASS", "APPROVED", "IMPLEMENTATION_READY"].includes(text)) return "READY";
  return "REVIEW_REQUIRED";
}

function worseReadiness(left: V1ReportEvidenceReadiness, right: V1ReportEvidenceReadiness): V1ReportEvidenceReadiness {
  const rank: Record<V1ReportEvidenceReadiness, number> = { READY: 1, REVIEW_REQUIRED: 2, BLOCKED: 3 };
  return rank[right] > rank[left] ? right : left;
}

function countBy(items: any[], predicate: (item: any) => boolean): number {
  return items.filter(predicate).length;
}

export function buildReportEvidenceView(params: {
  designCore?: any;
  V1ValidationReadiness?: any;
  V1RequirementsClosure?: any;
  V1EnterpriseIpamTruth?: any;
  V1ImplementationPlanning?: any;
  V1ImplementationTemplates?: any;
  V1ReportExportTruth?: any;
  V1DiagramTruth?: any;
  reportTruth?: any;
  diagramTruth?: any;
  networkObjectModel?: any;
  reportExportReadiness?: V1ReportEvidenceReadiness;
  omittedEvidenceSummaries?: any[];
}): V1ReportEvidenceView {
  const designCore = params.designCore ?? {};
  const V1ValidationReadiness = params.V1ValidationReadiness ?? designCore.V1ValidationReadiness ?? {};
  const V1RequirementsClosure = params.V1RequirementsClosure ?? designCore.V1RequirementsClosure ?? {};
  const V1EnterpriseIpamTruth = params.V1EnterpriseIpamTruth ?? designCore.V1EnterpriseIpamTruth ?? {};
  const V1ImplementationPlanning = params.V1ImplementationPlanning ?? designCore.V1ImplementationPlanning ?? {};
  const V1ImplementationTemplates = params.V1ImplementationTemplates ?? designCore.V1ImplementationTemplates ?? {};
  const V1ReportExportTruth = params.V1ReportExportTruth ?? designCore.V1ReportExportTruth ?? {};
  const V1DiagramTruth = params.V1DiagramTruth ?? designCore.V1DiagramTruth ?? {};
  const reportTruth = params.reportTruth ?? designCore.reportTruth ?? {};
  const diagramTruth = params.diagramTruth ?? designCore.diagramTruth ?? {};
  const networkObjectModel = params.networkObjectModel ?? designCore.networkObjectModel ?? {};

  const validationFindings = asArray<any>(V1ValidationReadiness.findings);
  const rootBlockerCount = numberValue(V1ValidationReadiness.rootBlockerCount) || countBy(validationFindings, (finding) => finding?.category === "BLOCKING" && finding?.findingClass === "ROOT_BLOCKER");
  const propagatedBlockerCount = numberValue(V1ValidationReadiness.propagatedBlockerCount) || countBy(validationFindings, (finding) => finding?.findingClass === "PROPAGATED_BLOCKER");
  const derivedImpactCount = numberValue(V1ValidationReadiness.derivedImpactCount) || countBy(validationFindings, (finding) => finding?.findingClass === "DERIVED_IMPACT");
  const reviewItemCount = numberValue(V1ValidationReadiness.reviewItemCount) || countBy(validationFindings, (finding) => finding?.findingClass === "REVIEW_ITEM");

  const closureRows = asArray<any>(V1RequirementsClosure.closureMatrix);
  const materializedCount = numberValue(V1RequirementsClosure.fullPropagatedCount)
    || countBy(closureRows, (row) => ["FULLY_PROPAGATED", "MATERIALIZED"].includes(String(row?.lifecycleStatus ?? "")));
  const blockedCount = numberValue(V1RequirementsClosure.blockedCount)
    || countBy(closureRows, (row) => row?.lifecycleStatus === "BLOCKED");
  const reviewRequiredCount = numberValue(V1RequirementsClosure.reviewRequiredCount)
    || countBy(closureRows, (row) => ["REVIEW_REQUIRED", "PARTIALLY_PROPAGATED", "MATERIALIZED_REVIEW_REQUIRED"].includes(String(row?.lifecycleStatus ?? "")));
  const missingMandatoryConsumerCount = numberValue(V1RequirementsClosure.missingConsumerCount)
    || closureRows.reduce((sum, row) => sum + asArray(row?.missingConsumers).length, 0);

  const candidateAllocations = numberValue(V1EnterpriseIpamTruth.candidateAllocationCount)
    || numberValue(V1EnterpriseIpamTruth.enterpriseAllocatorPosture?.candidateAllocationCount);
  const approvedAllocations = numberValue(V1EnterpriseIpamTruth.approvedAllocationCount)
    || numberValue(V1EnterpriseIpamTruth.enterpriseAllocatorPosture?.approvedAllocationCount);
  const plannedRows = numberValue(V1EnterpriseIpamTruth.plannedAllocationCount)
    || numberValue(V1EnterpriseIpamTruth.allocationLedgerEntryCount)
    || numberValue(V1EnterpriseIpamTruth.enterpriseAllocatorPosture?.allocationLedgerEntryCount)
    || candidateAllocations + approvedAllocations;
  const staleAllocations = numberValue(V1EnterpriseIpamTruth.staleAllocationCount)
    || numberValue(V1EnterpriseIpamTruth.enterpriseAllocatorPosture?.staleAllocationCount);
  const conflictBlockers = numberValue(V1EnterpriseIpamTruth.conflictBlockerCount)
    || numberValue(V1EnterpriseIpamTruth.brownfieldConflictCount)
    || numberValue(V1EnterpriseIpamTruth.enterpriseAllocatorPosture?.brownfieldConflictCount);

  const stepGates = asArray<any>(V1ImplementationPlanning.stepGates);
  const templateGates = asArray<any>(V1ImplementationTemplates.templateGates);
  const blockedSteps = numberValue(V1ImplementationPlanning.structuralBlockedStepCount)
    || numberValue(V1ImplementationPlanning.blockedStepGateCount)
    || numberValue(V1ImplementationPlanning.blockedStepCount)
    || countBy(stepGates, (step) => String(step?.executionDisposition ?? "").toUpperCase() === "STRUCTURAL_BLOCKER");
  const executableSteps = numberValue(V1ImplementationPlanning.executionReadyStepCount)
    || countBy(stepGates, (step) => String(step?.executionDisposition ?? "").toUpperCase() === "EXECUTION_READY");
  const planningCandidateSteps = numberValue(V1ImplementationPlanning.planningCandidateStepCount)
    || countBy(stepGates, (step) => String(step?.executionDisposition ?? "").toUpperCase() === "PLANNING_CANDIDATE");
  const reviewSteps = numberValue(V1ImplementationPlanning.reviewStepGateCount)
    || numberValue(V1ImplementationPlanning.reviewStepCount)
    || countBy(stepGates, (step) => String(step?.executionDisposition ?? "").toUpperCase() === "REVIEW_REQUIRED");

  const omittedEvidenceSummaries = params.omittedEvidenceSummaries
    ?? asArray(V1ReportExportTruth.omittedEvidenceSummaries)
    ?? [];
  const omittedDecisionSummary = buildOmittedEvidenceDecisionSummary(omittedEvidenceSummaries as any[]);
  const hiddenBlockerSurfaces = omittedDecisionSummary.blockingSurfaces.length;
  const hiddenReviewSurfaces = omittedDecisionSummary.reviewSurfaces.length;
  const omittedRows = omittedDecisionSummary.totalOmittedRows;

  let designReview = normalizeReportEvidenceReadiness(reportTruth.overallReadiness ?? V1ReportExportTruth.overallReadiness ?? "REVIEW_REQUIRED");
  designReview = worseReadiness(designReview, normalizeReportEvidenceReadiness(V1ValidationReadiness.overallReadiness));
  if (rootBlockerCount > 0) designReview = "BLOCKED";
  else if (reviewItemCount > 0 || candidateAllocations > approvedAllocations) designReview = worseReadiness(designReview, "REVIEW_REQUIRED");

  let implementation = normalizeReportEvidenceReadiness(V1ImplementationPlanning.overallReadiness ?? reportTruth.readiness?.implementation);
  if (blockedSteps > 0 || rootBlockerCount > 0 || conflictBlockers > 0 || staleAllocations > 0) implementation = "BLOCKED";
  else if (reviewSteps > 0 || candidateAllocations > approvedAllocations) implementation = worseReadiness(implementation, "REVIEW_REQUIRED");

  const reportExport = normalizeReportEvidenceReadiness(params.reportExportReadiness ?? V1ReportExportTruth.overallReadiness);
  let diagram = normalizeReportEvidenceReadiness(V1DiagramTruth.overallReadiness ?? diagramTruth.overallReadiness);
  if (numberValue(V1DiagramTruth.blockedFindingCount) > 0 || numberValue(diagramTruth.blockedFindingCount) > 0) diagram = "BLOCKED";

  return {
    contract: "V1_REPORT_EVIDENCE_VIEW_CONTRACT",
    role: "CANONICAL_EXPORT_EVIDENCE_VIEW_FOR_DOCX_PDF_CSV_JSON_FRONTEND",
    readiness: { designReview, implementation, reportExport, diagram },
    validation: {
      rootBlockerCount,
      propagatedBlockerCount,
      derivedImpactCount,
      reviewItemCount,
      warningCount: numberValue(V1ValidationReadiness.warningFindingCount),
    },
    requirements: {
      materializedCount,
      blockedCount,
      reviewRequiredCount,
      missingMandatoryConsumerCount,
    },
    ipam: {
      plannedRows,
      candidateAllocations,
      approvedAllocations,
      staleAllocations,
      conflictBlockers,
    },
    implementation: {
      executableSteps,
      planningCandidateSteps,
      blockedSteps,
      reviewSteps,
    },
    omittedEvidence: {
      hiddenBlockerSurfaces,
      hiddenReviewSurfaces,
      omittedRows,
      blockingSurfaces: omittedDecisionSummary.blockingSurfaces,
      reviewSurfaces: omittedDecisionSummary.reviewSurfaces,
      implementationAffected: omittedDecisionSummary.implementationAffected,
      reportAffected: omittedDecisionSummary.reportAffected,
      diagramAffected: omittedDecisionSummary.diagramAffected,
      decisionImpact: omittedDecisionSummary.decisionImpact,
    },
    sourceInvariant: "ALL_EXPORT_FORMATS_CONSUME_THIS_VIEW_NO_RECOMPUTED_COUNTS",
  };
}
