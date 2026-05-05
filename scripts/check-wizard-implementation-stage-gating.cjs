#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function fail(message) { console.error(`[wizard-implementation-stage-gating] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }

const migration = read('backend/src/domain/implementation/migration-plan.ts');
assert(migration.includes('routeIntent.administrativeState === "missing" || routeIntent.administrativeState === "review") return "review"'), 'missing route intent must be review-required, not a hard blocker, for wizard planning output');
assert(migration.includes('flowRequirement.state === "missing-policy" || flowRequirement.state === "missing-nat" || flowRequirement.state === "review") return "review"'), 'missing policy/NAT flow coverage must be review-required after security matrix completion');
assert(migration.includes('Operational safety review: no affected device could be resolved'), 'missing live device authority must be operational-safety review, not a generated blocker');
assert(migration.includes('planning candidates remain review-required'), 'implementation summary notes must document planning-candidate classification');

const planning = read('backend/src/services/designCore/designCore.implementationPlanningControl.ts');
for (const token of ['V1ImplementationExecutionDisposition', 'executionDisposition', 'PLANNING_CANDIDATE', 'STRUCTURAL_BLOCKER', 'structuralBlocker', 'planningCandidateStepCount', 'structuralBlockedStepCount', 'V1_PLANNING_CANDIDATE_STEPS_PRESENT', 'V1_STRUCTURAL_BLOCKED_STEPS_PRESENT']) {
  assert(planning.includes(token), `implementation planning control must include ${token}`);
}
assert(planning.includes('readiness === "BLOCKED" ? "REVIEW_REQUIRED"'), 'non-structural blocked source steps must de-escalate to review-required in V1 gates');

const templates = read('backend/src/services/designCore/designCore.implementationTemplatesControl.ts');
for (const token of ['hasStructuralTemplateDefect', 'stepGate?.structuralBlocker', 'stepGate?.executionDisposition === "PLANNING_CANDIDATE"', 'V1_STRUCTURAL_BLOCKED_TEMPLATES_PRESENT']) {
  assert(templates.includes(token), `template control must include ${token}`);
}

const types = read('backend/src/services/designCore.types.ts');
for (const token of ['V1ImplementationExecutionDisposition', 'planningCandidateStepCount', 'executionReadyStepCount', 'structuralBlockedStepCount', 'executionDisposition', 'structuralBlocker']) {
  assert(types.includes(token), `design-core types must expose ${token}`);
}

const pkg = JSON.parse(read('package.json'));
const quality = String(pkg.scripts['check:quality'] || '');
assert(quality.includes('check-wizard-implementation-stage-gating.cjs'), 'check:quality must include wizard implementation stage-gating guard');

const readme = read('README.md');
assert(readme.includes('Wizard implementation stage gating'), 'README must document wizard implementation stage gating');
assert(readme.includes('check-wizard-implementation-stage-gating.cjs'), 'README must document the wizard implementation stage-gating guard');

console.log('[wizard-implementation-stage-gating] ok');
