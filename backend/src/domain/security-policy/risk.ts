import type { SecurityPolicyFinding } from './types.js';

export function securityReadinessFromFindings(findings: SecurityPolicyFinding[]): 'ready' | 'review' | 'blocked' {
  if (findings.some((finding) => finding.severity === 'ERROR')) return 'blocked';
  if (findings.some((finding) => finding.severity === 'WARNING')) return 'review';
  return 'ready';
}
