import assert from "node:assert/strict";
import { buildRuntimeExportConsistencyProof } from "./export-consistency.js";

const evidenceView = {
  contract: "V1_REPORT_EVIDENCE_VIEW_CONTRACT" as const,
  role: "CANONICAL_EXPORT_EVIDENCE_VIEW_FOR_DOCX_PDF_CSV_JSON_FRONTEND" as const,
  readiness: { designReview: "BLOCKED" as const, implementation: "BLOCKED" as const, reportExport: "BLOCKED" as const, diagram: "REVIEW_REQUIRED" as const },
  validation: { rootBlockerCount: 2, propagatedBlockerCount: 4, derivedImpactCount: 1, reviewItemCount: 7, warningCount: 3 },
  requirements: { materializedCount: 3, blockedCount: 1, reviewRequiredCount: 2, missingMandatoryConsumerCount: 1 },
  ipam: { plannedRows: 4, candidateAllocations: 4, approvedAllocations: 0, staleAllocations: 0, conflictBlockers: 0 },
  implementation: { executableSteps: 0, planningCandidateSteps: 5, blockedSteps: 1, reviewSteps: 3 },
  omittedEvidence: { hiddenBlockerSurfaces: 1, hiddenReviewSurfaces: 2, omittedRows: 11, blockingSurfaces: ["diagram"], reviewSurfaces: ["implementation"], implementationAffected: true, reportAffected: true, diagramAffected: true, decisionImpact: "BLOCKING" as const },
  sourceInvariant: "ALL_EXPORT_FORMATS_CONSUME_THIS_VIEW_NO_RECOMPUTED_COUNTS" as const,
};

const proof = buildRuntimeExportConsistencyProof({
  designCore: {
    V1ReportExportTruth: { evidenceView },
    V1RequirementsClosure: {
      closureMatrix: [{ key: "REQ-1", lifecycleStatus: "BLOCKED", lifecycleProofStatus: "PROVEN", blockedReason: "mandatory consumer missing" }],
    },
    V1EnterpriseIpamTruth: {
      allocationRows: [{ authorityState: "ENGINE2_CANDIDATE_ALLOCATION", sourceTruth: "CANDIDATE_IPAM", authorityLabel: "Candidate allocation" }],
    },
  },
});

assert.equal(proof.contract, "V1_RUNTIME_EXPORT_CONSISTENCY_KILL_SWITCH_CONTRACT");
assert.equal(proof.sourceInvariant, "JSON_CSV_PDF_DOCX_FRONTEND_COUNTS_DERIVE_FROM_V1_REPORT_EVIDENCE_VIEW");
assert.equal(proof.canonicalRootBlockerCount, 2);
assert.equal(proof.surfaces.length, 5);
assert.ok(proof.surfaces.every((surface) => surface.rootBlockerCount === 2));
assert.equal(proof.candidateIpamRowsLabelledApprovedAuthority, 0);
assert.equal(proof.blockedRequirementRowsWithoutProof, 0);
assert.equal(proof.killSwitchPassed, true);

const failed = buildRuntimeExportConsistencyProof({
  designCore: {
    V1ReportExportTruth: { evidenceView },
    V1RequirementsClosure: { closureMatrix: [{ key: "REQ-2", lifecycleStatus: "BLOCKED" }] },
    V1EnterpriseIpamTruth: { allocationRows: [{ authorityState: "ENGINE2_CANDIDATE_ALLOCATION", sourceTruth: "CANDIDATE_IPAM", authorityLabel: "APPROVED_AUTHORITY" }] },
  },
  evidenceView,
  surfaceRootBlockerCounts: { PDF: 99 },
});
assert.equal(failed.killSwitchPassed, false);
assert.ok(failed.failures.length >= 2);

console.log("[export-consistency] OK");
