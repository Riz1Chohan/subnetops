import type { SecurityPolicyFinding } from './types.js';

export type SecurityPolicyReviewClass =
  | 'STRUCTURAL_BLOCKER'
  | 'DIRECT_POLICY_CONFLICT_BLOCKER'
  | 'PLANNING_REVIEW_ITEM'
  | 'ADVISORY_ITEM';

const STRUCTURAL_BLOCKER_CODES = new Set([
  'SECURITY_POLICY_SOURCE_ZONE_MISSING',
  'SECURITY_POLICY_DESTINATION_ZONE_MISSING',
  'SECURITY_NAT_SOURCE_ZONE_MISSING',
  'SECURITY_NAT_DESTINATION_ZONE_MISSING',
]);

const DIRECT_POLICY_CONFLICT_CODES = new Set([
  'SECURITY_FLOW_POLICY_CONFLICT',
  'SECURITY_DEFAULT_DENY_WEAKENED_BY_ALLOW',
  'SECURITY_WAN_INBOUND_NOT_DMZ',
]);

const PLANNING_REVIEW_CODES = new Set([
  'SECURITY_FLOW_POLICY_MISSING',
  'SECURITY_FLOW_NAT_MISSING',
  'SECURITY_NAT_REQUIRED_FLOW_UNCOVERED',
  'SECURITY_NAT_RULE_WITHOUT_COVERED_FLOW',
  'SECURITY_NAT_REVIEW_REQUIRED',
  'SECURITY_IMPLICIT_DENY_NOT_MODELED',
  'SECURITY_BROAD_PERMIT_TO_TRUSTED_ZONE',
  'SECURITY_RULE_BROAD_ALLOW_REQUIRES_REVIEW',
  'SECURITY_RULE_SHADOWED_BY_EARLIER_RULE',
  'SECURITY_RULE_SHADOWS_LATER_RULE',
  'SECURITY_LOGGING_EVIDENCE_GAP',
]);

export function classifySecurityPolicyFinding(finding: Pick<SecurityPolicyFinding, 'code' | 'severity'>): SecurityPolicyReviewClass {
  if (STRUCTURAL_BLOCKER_CODES.has(finding.code)) return 'STRUCTURAL_BLOCKER';
  if (DIRECT_POLICY_CONFLICT_CODES.has(finding.code)) return 'DIRECT_POLICY_CONFLICT_BLOCKER';
  if (PLANNING_REVIEW_CODES.has(finding.code)) return 'PLANNING_REVIEW_ITEM';
  if (finding.severity === 'ERROR') return 'STRUCTURAL_BLOCKER';
  if (finding.severity === 'WARNING') return 'PLANNING_REVIEW_ITEM';
  return 'ADVISORY_ITEM';
}

export function severityForSecurityPolicyReviewClass(reviewClass: SecurityPolicyReviewClass): SecurityPolicyFinding['severity'] {
  if (reviewClass === 'STRUCTURAL_BLOCKER' || reviewClass === 'DIRECT_POLICY_CONFLICT_BLOCKER') return 'ERROR';
  if (reviewClass === 'PLANNING_REVIEW_ITEM') return 'WARNING';
  return 'INFO';
}

export function readinessForSecurityPolicyReviewClass(reviewClass: SecurityPolicyReviewClass): 'ready' | 'review' | 'blocked' {
  if (reviewClass === 'STRUCTURAL_BLOCKER' || reviewClass === 'DIRECT_POLICY_CONFLICT_BLOCKER') return 'blocked';
  if (reviewClass === 'PLANNING_REVIEW_ITEM') return 'review';
  return 'ready';
}
