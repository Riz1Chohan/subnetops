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
