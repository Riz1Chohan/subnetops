import type { SiteSummarizationReview } from './types.js';

export function summarizationReadiness(siteSummaries: SiteSummarizationReview[]): 'ready' | 'review' | 'blocked' {
  if (siteSummaries.some((summary) => summary.status === 'missing')) return 'blocked';
  if (siteSummaries.some((summary) => summary.status === 'review')) return 'review';
  return 'ready';
}

export function summaryCidrs(siteSummaries: SiteSummarizationReview[]): string[] {
  return siteSummaries.map((summary) => summary.minimumRequiredSummary).filter((value): value is string => Boolean(value));
}
