import type { ImplementationPlanStep, NetworkObjectTruthState } from './types.js';

export type ImplementationExecutionDisposition = 'EXECUTION_READY' | 'PLANNING_CANDIDATE' | 'REVIEW_REQUIRED' | 'STRUCTURAL_BLOCKER';
export type ImplementationExecutionReadiness = 'READY' | 'REVIEW_REQUIRED' | 'BLOCKED';

export const EXECUTION_AUTHORITY_TRUTH_STATES = new Set<NetworkObjectTruthState>([
  'configured',
  'imported',
  'approved',
  'discovered',
]);

export interface ImplementationExecutionGateInput {
  step: ImplementationPlanStep;
  sourceObjectIds: string[];
  sourceRequirementIds: string[];
  sourceTruthState?: NetworkObjectTruthState;
  preconditions: string[];
  verificationEvidence: string[];
  rollbackStep?: string;
  dependencyStepIds: string[];
}

export interface ImplementationExecutionGateDecision {
  readinessImpact: ImplementationExecutionReadiness;
  executionDisposition: ImplementationExecutionDisposition;
  structuralBlocker: boolean;
  structuralFailures: string[];
  reviewReasons: string[];
  operationalSafetyGateRequired: boolean;
  operationalSafetyGatePresent: boolean;
}

function hasOperationalSafetyDependency(dependencyStepIds: string[]): boolean {
  return dependencyStepIds.some((id) => id.toLowerCase().includes('safety'));
}

function hasStructuralBlockerText(step: ImplementationPlanStep): boolean {
  return step.readiness === 'blocked' && step.blockers.some((blocker) => /conflict|invalid|contradict|no matching vlan gateway|no modeled default gateway/i.test(blocker));
}

export function sourceTruthAllowsExecution(sourceTruthState?: NetworkObjectTruthState): boolean {
  return Boolean(sourceTruthState && EXECUTION_AUTHORITY_TRUTH_STATES.has(sourceTruthState));
}

export function evaluateImplementationExecutionGate(input: ImplementationExecutionGateInput): ImplementationExecutionGateDecision {
  const { step, sourceObjectIds, sourceRequirementIds, sourceTruthState, preconditions, verificationEvidence, rollbackStep, dependencyStepIds } = input;
  const structuralFailures: string[] = [];
  const reviewReasons: string[] = [];
  const operationalSafetyGateRequired = step.riskLevel === 'high' && step.category !== 'preparation';
  const operationalSafetyGatePresent = hasOperationalSafetyDependency(dependencyStepIds);

  if (hasStructuralBlockerText(step)) structuralFailures.push(step.blockers[0] ?? 'Step has a structural blocker.');
  if (step.category !== 'preparation' && sourceObjectIds.length === 0) structuralFailures.push('No backend source object is linked to this implementation step.');
  if (!rollbackStep) structuralFailures.push('Rollback requirement is missing.');
  if (verificationEvidence.length === 0) structuralFailures.push('Verification evidence is missing.');
  if (preconditions.length === 0) structuralFailures.push('Preconditions are missing.');

  if (step.readiness === 'blocked' && !hasStructuralBlockerText(step)) reviewReasons.push(step.blockers[0] ?? 'Step is blocked upstream but no structural implementation defect is proven.');
  if (step.readiness === 'review') reviewReasons.push('Step is marked for engineer review.');
  if (step.readiness === 'deferred') reviewReasons.push('Step is deferred and remains a planning candidate.');
  if (step.engineerReviewRequired) reviewReasons.push('Engineer review is required before execution.');
  if (step.category !== 'preparation' && sourceRequirementIds.length === 0) reviewReasons.push('Requirement lineage is missing.');
  if (step.category !== 'preparation' && sourceObjectIds.length > 0 && !sourceTruthAllowsExecution(sourceTruthState)) {
    reviewReasons.push(sourceTruthState ? `Source truth state is ${sourceTruthState}; execution authority is not proven.` : 'Source truth state is missing; execution authority is not proven.');
  }
  if (operationalSafetyGateRequired && !operationalSafetyGatePresent) reviewReasons.push('High-risk step lacks an operational safety dependency.');

  if (structuralFailures.length > 0) {
    return { readinessImpact: 'BLOCKED', executionDisposition: 'STRUCTURAL_BLOCKER', structuralBlocker: true, structuralFailures, reviewReasons, operationalSafetyGateRequired, operationalSafetyGatePresent };
  }

  if (reviewReasons.length === 0 && sourceTruthAllowsExecution(sourceTruthState)) {
    return { readinessImpact: 'READY', executionDisposition: 'EXECUTION_READY', structuralBlocker: false, structuralFailures, reviewReasons, operationalSafetyGateRequired, operationalSafetyGatePresent };
  }

  const planningCandidate = step.readiness === 'deferred'
    || (step.category !== 'preparation' && sourceObjectIds.length > 0 && !sourceTruthAllowsExecution(sourceTruthState))
    || (step.category !== 'preparation' && sourceRequirementIds.length === 0);

  return {
    readinessImpact: 'REVIEW_REQUIRED',
    executionDisposition: planningCandidate ? 'PLANNING_CANDIDATE' : 'REVIEW_REQUIRED',
    structuralBlocker: false,
    structuralFailures,
    reviewReasons,
    operationalSafetyGateRequired,
    operationalSafetyGatePresent,
  };
}

export function implementationExecutionAllowed(decisions: Pick<ImplementationExecutionGateDecision, 'executionDisposition' | 'readinessImpact'>[]): boolean {
  return decisions.length > 0 && decisions.every((decision) => decision.executionDisposition === 'EXECUTION_READY' && decision.readinessImpact === 'READY');
}
