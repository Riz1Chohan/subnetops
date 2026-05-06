import type { ImplementationPlanStep, ImplementationPlanVerificationCheck } from './types.js';

export function verificationChecksForStep(step: ImplementationPlanStep, checks: ImplementationPlanVerificationCheck[]): ImplementationPlanVerificationCheck[] {
  return checks.filter((check) => check.relatedStepIds.includes(step.id));
}

export function hasVerificationCoverage(step: ImplementationPlanStep, checks: ImplementationPlanVerificationCheck[]): boolean {
  return verificationChecksForStep(step, checks).some((check) =>
    check.relatedObjectIds.length > 0 &&
    check.requiredEvidence.length > 0 &&
    check.acceptanceCriteria.length > 0,
  );
}

export function findVerificationGaps(steps: ImplementationPlanStep[], checks: ImplementationPlanVerificationCheck[]): string[] {
  return steps
    .filter((step) => step.targetObjectType !== 'design-graph')
    .filter((step) => !hasVerificationCoverage(step, checks))
    .map((step) => step.id);
}
