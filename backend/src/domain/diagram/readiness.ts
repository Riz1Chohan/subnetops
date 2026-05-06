import type { DiagramReadiness } from './types.js';

export function normalizeDiagramReadiness(value: string | undefined | null): DiagramReadiness {
  return value === 'ready' || value === 'review' || value === 'blocked' || value === 'unknown' ? value : 'unknown';
}

export function rollupDiagramReadiness(values: DiagramReadiness[]): DiagramReadiness {
  if (values.includes('blocked')) return 'blocked';
  if (values.includes('review')) return 'review';
  if (values.includes('ready')) return 'ready';
  return 'unknown';
}

export function readinessFromFindingSeverity(severity: 'ERROR' | 'WARNING' | 'INFO'): DiagramReadiness {
  if (severity === 'ERROR') return 'blocked';
  if (severity === 'WARNING') return 'review';
  return 'ready';
}

export function minimumReadinessForTruthState(truthState: string | undefined | null): DiagramReadiness {
  const normalized = String(truthState ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (normalized === 'blocked') return 'blocked';
  if (['review-required', 'inferred', 'proposed', 'planned', 'imported'].includes(normalized)) return 'review';
  if (['configured', 'discovered', 'materialized', 'durable', 'approved'].includes(normalized)) return 'ready';
  return 'unknown';
}

export function enforceTruthStateReadiness(readiness: DiagramReadiness, truthState: string | undefined | null): DiagramReadiness {
  return rollupDiagramReadiness([readiness, minimumReadinessForTruthState(truthState)]);
}
