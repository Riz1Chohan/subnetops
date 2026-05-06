<<<<<<< HEAD
import { buildOmittedEvidenceDecisionSummary, buildOmittedEvidenceSummary, evidenceWindow, mergeOmittedEvidenceSummaries } from "./omitted-evidence.js";
=======
import { buildOmittedEvidenceSummary, evidenceWindow, mergeOmittedEvidenceSummaries } from "./omitted-evidence.js";
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const rows = [
  { severity: "PASSED", title: "shown safe" },
  { severity: "REVIEW_REQUIRED", title: "hidden review" },
  { readinessImpact: "BLOCKED", title: "hidden blocker", blockers: ["bad gateway"] },
];

const window = evidenceWindow({ collection: "validation checks", surface: "report", items: rows, limit: 1 });
assert(window.shown.length === 1, "window should keep only requested visible rows");
assert(window.summary.totalCount === 3, "summary should preserve total count");
assert(window.summary.omittedCount === 2, "summary should count omitted rows");
assert(window.summary.omittedHasBlockers, "summary should detect hidden blocker");
assert(window.summary.omittedHasReviewRequired, "summary should detect hidden review row");
assert(window.summary.readinessImpact === "BLOCKING", "hidden blocker should block readiness");

const noOmission = buildOmittedEvidenceSummary({ collection: "diagram nodes", surface: "diagram", items: rows, shownCount: rows.length });
assert(noOmission.omittedCount === 0, "no omitted rows when all rows shown");
assert(noOmission.readinessImpact === "NONE", "no omission should have no readiness impact");

const merged = mergeOmittedEvidenceSummaries([window.summary, noOmission]);
assert(merged.totalOmittedCount === 2, "merged summary should preserve omitted count");
assert(merged.omittedHasBlockers, "merged summary should preserve blocker flag");

<<<<<<< HEAD
const decision = buildOmittedEvidenceDecisionSummary([
  window.summary,
  buildOmittedEvidenceSummary({
    collection: "implementation steps",
    surface: "Report.ImplementationSteps",
    items: [{ severity: "PASSED" }, { severity: "REVIEW_REQUIRED", reviewRequired: true }],
    shownCount: 1,
  }),
  noOmission,
]);
assert(decision.totalSurfaces === 3, "decision summary should preserve surface count");
assert(decision.totalOmittedRows === 3, "decision summary should total omitted rows");
assert(decision.blockingSurfaces.some((surface) => surface.includes("validation checks")), "decision summary should list blocking surfaces");
assert(decision.reviewSurfaces.some((surface) => surface.includes("implementation steps")), "decision summary should list review surfaces");
assert(decision.implementationAffected, "implementation surfaces should affect implementation decision");
assert(decision.reportAffected, "report surfaces should affect report decision");
assert(decision.decisionImpact === "BLOCKING", "hidden blockers should drive decision impact");

=======
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
console.log("omitted evidence selftest passed");
