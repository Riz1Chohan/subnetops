import type { SecurityPolicyMatrixRow } from './types.js';

export function matrixRowReadiness(row: SecurityPolicyMatrixRow): 'ready' | 'review' | 'blocked' {
  if (row.state === 'blocked' || row.V1PolicyState === 'BLOCKED') return 'blocked';
  if (row.state === 'review' || row.V1PolicyState === 'MISSING' || row.V1PolicyState === 'REVIEW_REQUIRED') return 'review';
  return 'ready';
}
