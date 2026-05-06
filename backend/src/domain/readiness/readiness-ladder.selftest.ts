import assert from 'node:assert/strict';
import { deriveReadinessLadder, V1_READINESS_LADDER_CONTRACT } from './readiness-ladder.js';

const blocked = deriveReadinessLadder({ invalidAddressingCount: 1, materializedObjectCount: 2, validatedObjectCount: 2 });
assert.equal(blocked.contract, V1_READINESS_LADDER_CONTRACT);
assert.equal(blocked.overallReadiness, 'BLOCKED');
assert.equal(blocked.implementationOutputAllowed, false);
assert.ok(blocked.reasons.some((reason) => reason.code === 'READINESS_INVALID_ADDRESSING_BLOCKER'));

const review = deriveReadinessLadder({ missingCapacitySourceCount: 1, inferredSecurityPolicyCount: 1, materializedObjectCount: 2, validatedObjectCount: 2 });
assert.equal(review.overallReadiness, 'REVIEW_REQUIRED');
assert.equal(review.reportMayClaimImplementationReady, false);
assert.ok(review.reasons.some((reason) => reason.code === 'READINESS_MISSING_CAPACITY_REVIEW_REQUIRED'));
assert.ok(review.reasons.some((reason) => reason.code === 'READINESS_INFERRED_SECURITY_POLICY_REVIEW_REQUIRED'));

const draft = deriveReadinessLadder({ materializedObjectCount: 0, validatedObjectCount: 0 });
assert.equal(draft.overallReadiness, 'DRAFT');
assert.equal(draft.planningOutputAllowed, false);

const planning = deriveReadinessLadder({ warningFindingCount: 1, materializedObjectCount: 3, validatedObjectCount: 3 });
assert.equal(planning.overallReadiness, 'PLANNING_READY');
assert.equal(planning.implementationOutputAllowed, false);
assert.equal(planning.planningOutputAllowed, true);

const ready = deriveReadinessLadder({ materializedObjectCount: 3, validatedObjectCount: 3, implementationPlanningReadiness: 'READY', implementationTemplateReadiness: 'READY', reportExportReadiness: 'READY', diagramReadiness: 'READY' });
assert.equal(ready.overallReadiness, 'IMPLEMENTATION_READY');
assert.equal(ready.implementationOutputAllowed, true);
assert.equal(ready.reportMayClaimImplementationReady, true);

console.log('[V1] readiness ladder selftest passed');
