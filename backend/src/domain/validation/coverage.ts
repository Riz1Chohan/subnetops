import type { ValidationCoverageSummary, ValidationFinding } from './types.js';
import { deriveReadinessFromFindings } from './readiness.js';

export function buildCoverageSummary(input: {
  domain: string;
  sourcePath: string;
  findings: ValidationFinding[];
  evidence?: string[];
}): ValidationCoverageSummary {
  const readiness = deriveReadinessFromFindings(input.findings);
  return {
    domain: input.domain,
    sourcePath: input.sourcePath,
    readiness: readiness.readiness,
    label: readiness.label,
    findingCount: readiness.findingCount,
    openFindingCount: readiness.openFindingCount,
    acceptedRiskCount: readiness.acceptedRiskCount,
    criticalCount: readiness.openSeverityCounts.critical,
    highCount: readiness.openSeverityCounts.high,
    mediumCount: readiness.openSeverityCounts.medium,
    lowCount: readiness.openSeverityCounts.low,
    infoCount: readiness.openSeverityCounts.info,
    evidence: input.evidence ?? [],
  };
}
