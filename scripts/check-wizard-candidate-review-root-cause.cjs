#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function fail(message) { console.error(`[wizard-candidate-review-root-cause] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }

const ipam = read('backend/src/domain/ipam/enterprise-ipam.ts');
assert(ipam.includes('isGatewayReservation'), 'gateway reservations must be recognized as infrastructure reservations');
assert(ipam.includes('!isGatewayReservation(reservation, scope)'), 'DHCP validation must not block wizard gateway reservations as client conflicts');
assert(ipam.includes('CANDIDATE_REVIEW'), 'wizard IPAM candidates must remain explicit candidate-review evidence');

const policy = read('backend/src/domain/requirements/policy.ts');
assert(policy.includes('const VALIDATION_BLOCKER_REQUIREMENTS = new Set<string>([])'), 'wizard/internal policy keys must not be hard-coded validation blockers');
assert(policy.includes('SYSTEM_ADDRESSING_POLICY_REQUIREMENTS'), 'system addressing policy keys must have their own classification');
assert(policy.includes('return "ENGINE_INPUT_SIGNAL"'), 'system addressing policy keys must feed engines instead of becoming root blockers');

const closure = read('backend/src/services/designCore/designCore.requirementsClosureControl.ts');
assert(closure.includes('WIZARD_REVIEW_CONSUMER_GAPS'), 'closure must distinguish review-only consumer gaps');
assert(closure.includes('missingConsumers.some((consumer) => !WIZARD_REVIEW_CONSUMER_GAPS.has(consumer))'), 'closure must block only non-review mandatory consumer gaps');

const graph = read('backend/src/services/designCore/designCore.graph.ts');
assert(graph.includes('Do not pre-create every service object as a graph node'), 'graph builder must avoid unused service catalog orphan nodes');
assert(graph.includes('ensureSecurityServiceNode(String(serviceName)'), 'security-flow service references must create graph nodes only when used');

const graphControl = read('backend/src/services/designCore/designCore.designGraphControl.ts');
assert(graphControl.includes('diagram rendering is a later consumer issue') || graphControl.includes('Diagram rendering is a later consumer issue'), 'diagram-only objects must be review-gated rather than backend root blockers');
assert(graphControl.includes('backendGraphGaps.length > 0 ? "BLOCKING" : "REVIEW_REQUIRED"'), 'requirement dependency path gaps must block only when backend graph nodes are missing');

const ladder = read('backend/src/services/designCore/designCore.readinessLadderControl.ts');
assert(ladder.includes('implementationBlockedObjectCount'), 'readiness ladder must not treat review-only generated objects as unvalidated blockers');
assert(ladder.includes('rootBlockerCount ?? params.V1ValidationReadiness.blockingFindingCount'), 'readiness ladder must block on root blockers, not propagated downstream echoes');

const validation = read('backend/src/services/designCore/designCore.validationReadinessControl.ts');
assert(validation.includes('SYSTEM_POLICY_KEYS'), 'validation taxonomy must handle system policy keys');
assert(validation.includes('missing consumers') && validation.includes('none recorded'), 'validation taxonomy must de-escalate system policy rows with no missing mandatory consumers');
assert(validation.includes('CANDIDATE_REVIEW') && validation.includes('ENGINE2_DURABLE_CANDIDATE'), 'validation taxonomy must treat IPAM candidate/review states as review-required');

const exportService = read('backend/src/services/export.service.ts');
assert(exportService.includes('Root blocker groups:'), 'report must distinguish root blocker groups from affected evidence rows');
assert(exportService.includes('Root blocker groups'), 'summary metrics must use root blocker groups wording');

const pkg = JSON.parse(read('package.json'));
assert(String(pkg.scripts['check:quality'] || '').includes('check-wizard-candidate-review-root-cause.cjs'), 'check:quality must include wizard candidate/review root-cause guard');

const readme = read('README.md');
assert(readme.includes('Wizard candidate/review root-cause classification'), 'README must document this root-cause pass');
assert(readme.includes('check-wizard-candidate-review-root-cause.cjs'), 'README must document this guard');

console.log('[wizard-candidate-review-root-cause] ok');
