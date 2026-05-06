import type {
  ImplementationPlanFinding,
  ImplementationPlanModel,
  ImplementationPlanStep,
  ImplementationPlanSummary,
} from './types.js';

export type ImplementationTaskReadiness = ImplementationPlanStep['readiness'];
export type ImplementationTaskRisk = ImplementationPlanStep['riskLevel'];

export function sortImplementationTasks(tasks: ImplementationPlanStep[]): ImplementationPlanStep[] {
  return [...tasks].sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
}

export function deriveTaskReadiness(task: Pick<ImplementationPlanStep, 'blockers' | 'readinessReasons' | 'readiness'>): ImplementationTaskReadiness {
  if (task.blockers.length > 0) return 'blocked';
  if (task.readiness === 'blocked') return 'blocked';
  if (task.readiness === 'deferred') return 'deferred';
  if (task.readinessReasons.some((reason) => /review|confirm|approve|missing/i.test(reason))) return 'review';
  return task.readiness;
}

export function summarizeImplementationTasks(params: {
  steps: ImplementationPlanStep[];
  findings: ImplementationPlanFinding[];
  partialSummary?: Partial<ImplementationPlanSummary>;
}): Pick<ImplementationPlanSummary, 'readyStepCount' | 'reviewStepCount' | 'blockedStepCount' | 'deferredStepCount' | 'findingCount' | 'blockingFindingCount' | 'implementationReadiness'> {
  const readyStepCount = params.steps.filter((step) => step.readiness === 'ready').length;
  const reviewStepCount = params.steps.filter((step) => step.readiness === 'review').length;
  const blockedStepCount = params.steps.filter((step) => step.readiness === 'blocked').length;
  const deferredStepCount = params.steps.filter((step) => step.readiness === 'deferred').length;
  const blockingFindingCount = params.findings.filter((finding) => finding.severity === 'ERROR').length;

  return {
    readyStepCount,
    reviewStepCount,
    blockedStepCount,
    deferredStepCount,
    findingCount: params.findings.length,
    blockingFindingCount,
    implementationReadiness: blockingFindingCount > 0 || blockedStepCount > 0
      ? 'blocked'
      : reviewStepCount > 0 || deferredStepCount > 0
        ? 'review'
        : 'ready',
  };
}

export function implementationGateAllowsExecution(plan: Pick<ImplementationPlanModel, 'summary'>): boolean {
  return plan.summary.implementationReadiness === 'ready' && plan.summary.blockedStepCount === 0 && plan.summary.blockingFindingCount === 0;
}
