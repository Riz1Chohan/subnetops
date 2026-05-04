import type { ImplementationPlanRollbackAction, ImplementationPlanStep } from './types.js';

export function rollbackActionsForStep(step: ImplementationPlanStep, rollbackActions: ImplementationPlanRollbackAction[]): ImplementationPlanRollbackAction[] {
  return rollbackActions.filter((action) => action.relatedStepIds.includes(step.id));
}

export function hasRollbackCoverage(step: ImplementationPlanStep, rollbackActions: ImplementationPlanRollbackAction[]): boolean {
  if (step.rollbackIntent.trim().length === 0) return false;
  if (step.riskLevel === 'high') return rollbackActionsForStep(step, rollbackActions).length > 0;
  return true;
}

export function findRollbackGaps(steps: ImplementationPlanStep[], rollbackActions: ImplementationPlanRollbackAction[]): string[] {
  return steps
    .filter((step) => !hasRollbackCoverage(step, rollbackActions))
    .map((step) => step.id);
}
