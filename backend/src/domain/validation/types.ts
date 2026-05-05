export type ValidationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ValidationStatus = 'open' | 'resolved' | 'accepted_risk';
export type ValidationCategory =
  | 'Requirements'
  | 'Addressing'
  | 'IPAM'
  | 'Topology'
  | 'Routing'
  | 'Security'
  | 'Implementation'
  | 'Reporting'
  | 'Diagram'
  | 'Platform'
  | 'Discovery'
  | 'Validation'
  | 'Project'
  | string;

export type ValidationReadinessState = 'ready' | 'ready_with_warnings' | 'needs_review' | 'blocked' | 'incomplete';
export type ValidationReadinessLadderState = 'BLOCKED' | 'REVIEW_REQUIRED' | 'DRAFT' | 'PLANNING_READY' | 'IMPLEMENTATION_READY';
export type ValidationReadinessLabel = 'Ready' | 'Ready with warnings' | 'Needs review' | 'Blocked' | 'Incomplete';
export type LegacyValidationCategory = 'BLOCKING' | 'REVIEW_REQUIRED' | 'WARNING' | 'INFO' | 'PASSED';

export interface ValidationEvidenceRef {
  source: string;
  path?: string;
  objectId?: string;
  detail?: string;
}

export interface ValidationFindingInput {
  id?: string;
  ruleCode?: string;
  severity: unknown;
  status?: unknown;
  category: unknown;
  title: string;
  detail: string;
  affectedObjects?: string[];
  evidence?: ValidationEvidenceRef[];
  recommendedAction?: string;
  createdAt?: string;
  resolvedAt?: string;
  acceptedRiskBy?: string;
  sourcePath?: string;
}

export interface ValidationFinding {
  id: string;
  ruleCode?: string;
  severity: ValidationSeverity;
  status: ValidationStatus;
  category: ValidationCategory;
  title: string;
  detail: string;
  affectedObjects: string[];
  evidence: ValidationEvidenceRef[];
  recommendedAction?: string;
  createdAt?: string;
  resolvedAt?: string;
  acceptedRiskBy?: string;
  sourcePath?: string;
}

export interface ValidationSeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ValidationStatusCounts {
  open: number;
  resolved: number;
  acceptedRisk: number;
}

export interface ValidationReadinessSummary {
  readiness: ValidationReadinessState;
  label: ValidationReadinessLabel;
  score: number;
  implementationGateAllows: boolean;
  readinessLadder: ValidationReadinessLadderState;
  findingCount: number;
  openFindingCount: number;
  acceptedRiskCount: number;
  resolvedFindingCount: number;
  severityCounts: ValidationSeverityCounts;
  openSeverityCounts: ValidationSeverityCounts;
  notes: string[];
}

export interface ValidationCoverageSummary {
  domain: string;
  sourcePath: string;
  readiness: ValidationReadinessState;
  label: ValidationReadinessLabel;
  findingCount: number;
  openFindingCount: number;
  acceptedRiskCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  evidence: string[];
}

export interface LegacyValidationCategoryCounts {
  blockingCount: number;
  reviewRequiredCount: number;
  warningCount: number;
  infoCount: number;
  passedCount: number;
}
