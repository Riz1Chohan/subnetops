import { buildOmittedEvidenceSummary, evidenceWindow, mergeOmittedEvidenceSummaries } from "./omitted-evidence.js";

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

console.log("omitted evidence selftest passed");
