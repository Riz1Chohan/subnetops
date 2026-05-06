import assert from "node:assert/strict";
import { buildReportEvidenceView } from "./report-evidence-view.js";

const view = buildReportEvidenceView({
  V1ValidationReadiness: {
    overallReadiness: "BLOCKING",
    findings: [
      { category: "BLOCKING", findingClass: "ROOT_BLOCKER" },
      { category: "BLOCKING", findingClass: "PROPAGATED_BLOCKER" },
      { category: "REVIEW_REQUIRED", findingClass: "REVIEW_ITEM" },
    ],
    warningFindingCount: 7,
  },
  V1RequirementsClosure: {
    closureMatrix: [
      { lifecycleStatus: "FULLY_PROPAGATED" },
      { lifecycleStatus: "BLOCKED", missingConsumers: ["report"] },
    ],
  },
  V1EnterpriseIpamTruth: {
    candidateAllocationCount: 39,
    approvedAllocationCount: 0,
    staleAllocationCount: 0,
    conflictBlockerCount: 0,
  },
  V1ImplementationPlanning: {
    overallReadiness: "BLOCKED",
    stepGateCount: 168,
    blockedStepGateCount: 1,
    reviewStepGateCount: 167,
  },
  reportExportReadiness: "BLOCKED",
  omittedEvidenceSummaries: [
    { collection: "diagram nodes", surface: "Report.DiagramRenderNodes", omittedCount: 10, omittedHasBlockers: true, omittedHasReviewRequired: false, readinessImpact: "BLOCKING" },
    { collection: "implementation steps", surface: "Report.ImplementationSteps", omittedCount: 5, omittedHasBlockers: false, omittedHasReviewRequired: true, readinessImpact: "REVIEW" },
  ],
});

assert.equal(view.contract, "V1_REPORT_EVIDENCE_VIEW_CONTRACT");
assert.equal(view.sourceInvariant, "ALL_EXPORT_FORMATS_CONSUME_THIS_VIEW_NO_RECOMPUTED_COUNTS");
assert.equal(view.validation.rootBlockerCount, 1);
assert.equal(view.validation.propagatedBlockerCount, 1);
assert.equal(view.validation.reviewItemCount, 1);
assert.equal(view.ipam.candidateAllocations, 39);
assert.equal(view.ipam.approvedAllocations, 0);
assert.equal(view.implementation.blockedSteps, 1);
assert.equal(view.implementation.reviewSteps, 167);
assert.equal(view.omittedEvidence.hiddenBlockerSurfaces, 1);
assert.equal(view.omittedEvidence.hiddenReviewSurfaces, 1);
assert.equal(view.omittedEvidence.omittedRows, 15);
assert.equal(view.omittedEvidence.decisionImpact, "BLOCKING");
assert.equal(view.omittedEvidence.diagramAffected, true);
assert.equal(view.omittedEvidence.implementationAffected, true);
assert.ok(view.omittedEvidence.blockingSurfaces.some((surface) => surface.includes("diagram nodes")));
assert.ok(view.omittedEvidence.reviewSurfaces.some((surface) => surface.includes("implementation steps")));
assert.equal(view.readiness.implementation, "BLOCKED");

console.log("[report-evidence-view] OK");
