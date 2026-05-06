function assertOk(value: unknown, message?: string): asserts value {
  if (!value) throw new Error(message ?? 'Assertion failed');
}

import { evaluateImplementationExecutionGate, implementationExecutionAllowed } from './execution-gates.js';
import type { ImplementationPlanStep } from './types.js';

function step(overrides: Partial<ImplementationPlanStep> = {}): ImplementationPlanStep {
  return {
    id: 'step-1',
    title: 'Prepare VLAN gateway',
    stageId: 'stage-1',
    category: 'vlan-and-interface',
    sequence: 1,
    targetObjectType: 'network-interface',
    targetObjectId: 'interface-1',
    action: 'review',
    readiness: 'ready',
    readinessReasons: ['precheck complete'],
    blockers: [],
    riskLevel: 'medium',
    engineerReviewRequired: false,
    dependencies: [],
    dependencyObjectIds: ['interface-1'],
    graphDependencyEdgeIds: [],
    upstreamFindingIds: [],
    blastRadius: ['single VLAN'],
    implementationIntent: 'Review intended gateway change.',
    sourceEvidence: ['source object approved'],
    requiredEvidence: ['gateway reachable'],
    expectedOutcome: 'Gateway prepared.',
    acceptanceCriteria: ['gateway responds'],
    rollbackIntent: 'Restore prior gateway state.',
    notes: [],
    ...overrides,
  };
}

const ready = evaluateImplementationExecutionGate({
  step: step(),
  sourceObjectIds: ['interface-1'],
  sourceRequirementIds: ['management'],
  sourceTruthState: 'approved',
  preconditions: ['precheck complete'],
  verificationEvidence: ['gateway reachable'],
  rollbackStep: 'Restore prior gateway state.',
  dependencyStepIds: [],
});
assertOk(ready.executionDisposition === 'EXECUTION_READY', 'approved source with evidence must be execution-ready');
assertOk(implementationExecutionAllowed([ready]), 'all-ready decisions must allow execution');

const candidate = evaluateImplementationExecutionGate({
  step: step(),
  sourceObjectIds: ['interface-1'],
  sourceRequirementIds: ['management'],
  sourceTruthState: 'planned',
  preconditions: ['precheck complete'],
  verificationEvidence: ['gateway reachable'],
  rollbackStep: 'Restore prior gateway state.',
  dependencyStepIds: [],
});
assertOk(candidate.executionDisposition === 'PLANNING_CANDIDATE', 'planned source truth must stay a planning candidate');
assertOk(candidate.readinessImpact === 'REVIEW_REQUIRED', 'planning candidates must be review-required');

const blocked = evaluateImplementationExecutionGate({
  step: step({ rollbackIntent: '' }),
  sourceObjectIds: ['interface-1'],
  sourceRequirementIds: ['management'],
  sourceTruthState: 'approved',
  preconditions: ['precheck complete'],
  verificationEvidence: ['gateway reachable'],
  rollbackStep: '',
  dependencyStepIds: [],
});
assertOk(blocked.executionDisposition === 'STRUCTURAL_BLOCKER', 'missing rollback must remain structurally blocked');
assertOk(!implementationExecutionAllowed([ready, blocked]), 'blocked decisions must prevent execution');

const highRisk = evaluateImplementationExecutionGate({
  step: step({ riskLevel: 'high' }),
  sourceObjectIds: ['interface-1'],
  sourceRequirementIds: ['management'],
  sourceTruthState: 'approved',
  preconditions: ['precheck complete'],
  verificationEvidence: ['gateway reachable'],
  rollbackStep: 'Restore prior gateway state.',
  dependencyStepIds: [],
});
assertOk(highRisk.executionDisposition === 'REVIEW_REQUIRED', 'high-risk steps without safety dependency must not be execution-ready');
assertOk(highRisk.reviewReasons.some((reason) => reason.includes('operational safety')), 'high-risk safety reason must be explicit');

console.log('[implementation-execution-gates.selftest] ok');
