import type {
  LegacyValidationCategory,
  LegacyValidationCategoryCounts,
  ValidationFinding,
  ValidationReadinessLabel,
  ValidationReadinessState,
  ValidationReadinessSummary,
  ValidationSeverity,
  ValidationSeverityCounts,
} from './types.js';
import { normalizeValidationSeverity } from './findings.js';

export const LEGACY_VALIDATION_CATEGORIES: readonly LegacyValidationCategory[] = ['BLOCKING', 'REVIEW_REQUIRED', 'WARNING', 'INFO', 'PASSED'] as const;

const emptySeverityCounts = (): ValidationSeverityCounts => ({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });

function labelForReadiness(readiness: ValidationReadinessState): ValidationReadinessLabel {
  if (readiness === 'ready') return 'Ready';
  if (readiness === 'ready_with_warnings') return 'Ready with warnings';
  if (readiness === 'needs_review') return 'Needs review';
  if (readiness === 'blocked') return 'Blocked';
  return 'Incomplete';
}

function penaltyForFinding(finding: ValidationFinding): number {
  if (finding.status === 'resolved') return 0;
  if (finding.status === 'accepted_risk') {
    if (finding.severity === 'critical' || finding.severity === 'high') return 8;
    if (finding.severity === 'medium') return 3;
    return 0;
  }
  if (finding.severity === 'critical') return 50;
  if (finding.severity === 'high') return 25;
  if (finding.severity === 'medium') return 10;
  if (finding.severity === 'low') return 3;
  return 0;
}

export function countValidationSeverities(findings: ValidationFinding[]): ValidationSeverityCounts {
  const counts = emptySeverityCounts();
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

export function countOpenValidationSeverities(findings: ValidationFinding[]): ValidationSeverityCounts {
  const counts = emptySeverityCounts();
  for (const finding of findings.filter((item) => item.status === 'open')) counts[finding.severity] += 1;
  return counts;
}

export function deriveReadinessFromFindings(
  findings: ValidationFinding[],
  options: { noFindingState?: 'ready' | 'incomplete'; minimumScore?: number } = {},
): ValidationReadinessSummary {
  const severityCounts = countValidationSeverities(findings);
  const openSeverityCounts = countOpenValidationSeverities(findings);
  const acceptedRiskCount = findings.filter((item) => item.status === 'accepted_risk').length;
  const resolvedFindingCount = findings.filter((item) => item.status === 'resolved').length;
  const openFindingCount = findings.filter((item) => item.status === 'open').length;

  let readiness: ValidationReadinessState;
  const notes: string[] = [];

  if (findings.length === 0 && options.noFindingState === 'incomplete') {
    readiness = 'incomplete';
    notes.push('No validation findings were supplied, so readiness cannot be proven yet.');
  } else if (openSeverityCounts.critical > 0) {
    readiness = 'blocked';
    notes.push('Open critical findings block readiness.');
  } else if (openSeverityCounts.high > 0) {
    readiness = 'needs_review';
    notes.push('Open high-severity findings require review before implementation.');
  } else if (openSeverityCounts.medium > 0 || openSeverityCounts.low > 0 || acceptedRiskCount > 0) {
    readiness = 'ready_with_warnings';
    if (openSeverityCounts.medium > 0 || openSeverityCounts.low > 0) notes.push('Open warnings remain and must stay visible in UI, reports, and exports.');
    if (acceptedRiskCount > 0) notes.push('Accepted-risk findings do not disappear; they remain explicit readiness evidence.');
  } else {
    readiness = 'ready';
    notes.push('No open critical, high, medium, or low findings remain.');
  }

  const rawScore = 100 - findings.reduce((sum, finding) => sum + penaltyForFinding(finding), 0);
  const minimumScore = options.minimumScore ?? 0;
  const score = Math.max(minimumScore, Math.min(100, rawScore));
  const implementationGateAllows = readiness === 'ready' || readiness === 'ready_with_warnings';

  return {
    readiness,
    label: labelForReadiness(readiness),
    score,
    implementationGateAllows,
    findingCount: findings.length,
    openFindingCount,
    acceptedRiskCount,
    resolvedFindingCount,
    severityCounts,
    openSeverityCounts,
    notes,
  };
}

export function normalizeLegacyReadinessCategory(value: unknown): LegacyValidationCategory {
  const normalized = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (['BLOCKING', 'BLOCKED', 'ERROR', 'BLOCKER', 'CRITICAL'].includes(normalized)) return 'BLOCKING';
  if (['REVIEW_REQUIRED', 'REVIEW', 'HIGH', 'PARTIAL', 'PARTIALLY_PROPAGATED', 'MATERIALIZED', 'CAPTURED_ONLY', 'NEEDS_REVIEW'].includes(normalized)) return 'REVIEW_REQUIRED';
  if (['WARNING', 'WARN', 'MEDIUM', 'LOW'].includes(normalized)) return 'WARNING';
  if (['INFO', 'INFORMATIONAL', 'NOT_APPLICABLE', 'UNSUPPORTED'].includes(normalized)) return 'INFO';
  if (['PASSED', 'PASS', 'READY', 'FULLY_PROPAGATED', 'RESOLVED'].includes(normalized)) return 'PASSED';
  return 'INFO';
}

export function legacyCategoryForFinding(finding: { severity?: unknown; status?: unknown }): LegacyValidationCategory {
  const status = String(finding.status ?? 'open').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (status === 'resolved') return 'PASSED';
  if (status === 'accepted_risk') return 'REVIEW_REQUIRED';
  const severity = normalizeValidationSeverity(finding.severity);
  if (severity === 'critical') return 'BLOCKING';
  if (severity === 'high') return 'REVIEW_REQUIRED';
  if (severity === 'medium' || severity === 'low') return 'WARNING';
  return 'INFO';
}

export function countLegacyFindingCategories<T extends { category?: unknown }>(findings: T[]): LegacyValidationCategoryCounts {
  const counts: LegacyValidationCategoryCounts = {
    blockingCount: 0,
    reviewRequiredCount: 0,
    warningCount: 0,
    infoCount: 0,
    passedCount: 0,
  };
  for (const finding of findings) {
    const category = normalizeLegacyReadinessCategory(finding.category);
    if (category === 'BLOCKING') counts.blockingCount += 1;
    else if (category === 'REVIEW_REQUIRED') counts.reviewRequiredCount += 1;
    else if (category === 'WARNING') counts.warningCount += 1;
    else if (category === 'PASSED') counts.passedCount += 1;
    else counts.infoCount += 1;
  }
  return counts;
}

export function legacyReadinessFromCounts(blockingCount: number, reviewRequiredCount: number, warningCount: number): LegacyValidationCategory {
  if (blockingCount > 0) return 'BLOCKING';
  if (reviewRequiredCount > 0) return 'REVIEW_REQUIRED';
  if (warningCount > 0) return 'WARNING';
  return 'PASSED';
}

export function severityToLegacyCategory(severity: ValidationSeverity): LegacyValidationCategory {
  if (severity === 'critical') return 'BLOCKING';
  if (severity === 'high') return 'REVIEW_REQUIRED';
  if (severity === 'medium' || severity === 'low') return 'WARNING';
  return 'INFO';
}
