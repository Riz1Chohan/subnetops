export type OmittedEvidenceSeverity = "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFO" | "PASSED" | "UNKNOWN";

export interface OmittedEvidenceSummary {
  collection: string;
  surface: string;
  shownCount: number;
  totalCount: number;
  omittedCount: number;
  omittedHasBlockers: boolean;
  omittedHasReviewRequired: boolean;
  omittedSeveritySummary: Record<OmittedEvidenceSeverity, number>;
  readinessImpact: "NONE" | "REVIEW" | "BLOCKING";
  exportImpact: string;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function normalizedText(value: unknown): string {
  if (typeof value === "string") return value.toUpperCase();
  if (Array.isArray(value)) return value.map(normalizedText).join(" ");
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).map(normalizedText).join(" ");
  return String(value ?? "").toUpperCase();
}

export function normalizeOmittedEvidenceSeverity(item: unknown): OmittedEvidenceSeverity {
  const row = asRecord(item);
  const raw = normalizedText(row.severity ?? row.readinessImpact ?? row.readiness ?? row.status ?? row.lifecycleStatus ?? row.truthState ?? row.implementationReadiness ?? item);
  if (/\b(BLOCKING|BLOCKED|ERROR|FAIL|FAILED|INVALID|IMPLEMENTATION_BLOCKED)\b/.test(raw)) return "BLOCKING";
  if (/\b(REVIEW_REQUIRED|REQUIRES_REVIEW|REVIEW|ASSUMED|INFERRED|PROPOSED|PLANNED|NOT_CAPTURED|PARTIAL|PARTIALLY_PROPAGATED)\b/.test(raw)) return "REVIEW_REQUIRED";
  if (/\b(WARNING|WARN|DEFERRED|UNKNOWN|NOT_READY)\b/.test(raw)) return "WARNING";
  if (/\b(PASSED|PASS|READY|VERIFIED|CONFIGURED|APPROVED|DURABLE|MATERIALIZED)\b/.test(raw)) return "PASSED";
  if (/\b(INFO|ADVISORY)\b/.test(raw)) return "INFO";
  return "UNKNOWN";
}

export function omittedEvidenceHasBlocker(item: unknown): boolean {
  const row = asRecord(item);
  if (normalizeOmittedEvidenceSeverity(item) === "BLOCKING") return true;
  if (Array.isArray(row.blockers) && row.blockers.length > 0) return true;
  if (Array.isArray(row.blockingRequirementKeys) && row.blockingRequirementKeys.length > 0) return true;
  if (Array.isArray(row.blockingStepIds) && row.blockingStepIds.length > 0) return true;
  if (row.implementationBlocked === true || row.canClaimReady === false && normalizedText(row.readinessImpact).includes("BLOCK")) return true;
  return false;
}

export function omittedEvidenceHasReviewRequired(item: unknown): boolean {
  const row = asRecord(item);
  const severity = normalizeOmittedEvidenceSeverity(item);
  if (severity === "REVIEW_REQUIRED" || severity === "WARNING") return true;
  if (Array.isArray(row.reviewReasons) && row.reviewReasons.length > 0) return true;
  if (Array.isArray(row.reviewRequirementKeys) && row.reviewRequirementKeys.length > 0) return true;
  if (Array.isArray(row.missingConsumers) && row.missingConsumers.length > 0) return true;
  if (row.reviewRequired === true || row.requiresReview === true) return true;
  return false;
}

export function buildOmittedEvidenceSummary(params: {
  collection: string;
  surface: string;
  items: unknown[];
  shownCount: number;
  exportImpact?: string;
}): OmittedEvidenceSummary {
  const totalCount = params.items.length;
  const shownCount = Math.max(0, Math.min(params.shownCount, totalCount));
  const omittedItems = params.items.slice(shownCount);
  const omittedSeveritySummary = {
    BLOCKING: 0,
    REVIEW_REQUIRED: 0,
    WARNING: 0,
    INFO: 0,
    PASSED: 0,
    UNKNOWN: 0,
  } satisfies Record<OmittedEvidenceSeverity, number>;
  for (const item of omittedItems) omittedSeveritySummary[normalizeOmittedEvidenceSeverity(item)] += 1;
  const omittedHasBlockers = omittedItems.some(omittedEvidenceHasBlocker);
  const omittedHasReviewRequired = omittedItems.some(omittedEvidenceHasReviewRequired);
  const readinessImpact = omittedHasBlockers ? "BLOCKING" : omittedHasReviewRequired ? "REVIEW" : "NONE";
  return {
    collection: params.collection,
    surface: params.surface,
    shownCount,
    totalCount,
    omittedCount: Math.max(0, totalCount - shownCount),
    omittedHasBlockers,
    omittedHasReviewRequired,
    omittedSeveritySummary,
    readinessImpact,
    exportImpact: params.exportImpact ?? (totalCount > shownCount
      ? "Visible summary must warn that full evidence continues in export/source data."
      : "No omitted rows for this surface."),
  };
}

export function evidenceWindow<T>(params: {
  collection: string;
  surface: string;
  items: T[];
  limit: number;
  exportImpact?: string;
}): { shown: T[]; summary: OmittedEvidenceSummary } {
  const shown = params.items.slice(0, params.limit);
  return {
    shown,
    summary: buildOmittedEvidenceSummary({
      collection: params.collection,
      surface: params.surface,
      items: params.items,
      shownCount: shown.length,
      exportImpact: params.exportImpact,
    }),
  };
}

export function mergeOmittedEvidenceSummaries(summaries: OmittedEvidenceSummary[]) {
  return {
    surfaceCount: summaries.length,
    totalShownCount: summaries.reduce((sum, row) => sum + row.shownCount, 0),
    totalEvidenceCount: summaries.reduce((sum, row) => sum + row.totalCount, 0),
    totalOmittedCount: summaries.reduce((sum, row) => sum + row.omittedCount, 0),
    omittedHasBlockers: summaries.some((row) => row.omittedHasBlockers),
    omittedHasReviewRequired: summaries.some((row) => row.omittedHasReviewRequired),
    blockingSurfaceCount: summaries.filter((row) => row.readinessImpact === "BLOCKING").length,
    reviewSurfaceCount: summaries.filter((row) => row.readinessImpact === "REVIEW").length,
  };
}
