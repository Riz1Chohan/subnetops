#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function fail(message) { console.error(`[implementation-execution-gates] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }

const gate = read('backend/src/domain/implementation/execution-gates.ts');
for (const token of [
  'EXECUTION_AUTHORITY_TRUTH_STATES',
  'evaluateImplementationExecutionGate',
  'implementationExecutionAllowed',
  'EXECUTION_READY',
  'PLANNING_CANDIDATE',
  'REVIEW_REQUIRED',
  'STRUCTURAL_BLOCKER',
  'Rollback requirement is missing',
  'Verification evidence is missing',
  'Requirement lineage is missing',
  'High-risk step lacks an operational safety dependency',
]) assert(gate.includes(token), `execution gate contract must include ${token}`);
assert(!gate.includes("'durable'"), 'durable/candidate-style source truth must not be enough for execution authority');

const control = read('backend/src/services/designCore/designCore.implementationPlanningControl.ts');
for (const token of [
  'evaluateImplementationExecutionGate',
  'executionGateFailures',
  'executionGateReviewReasons',
  'operationalSafetyGateRequired',
  'operationalSafetyGatePresent',
  'executionReadyStepCount',
  'planningCandidateStepCount',
  'structuralBlockedStepCount',
]) assert(control.includes(token), `implementation planning control must consume execution gate field ${token}`);
assert(control.includes('Execution disposition=${gateDecision.executionDisposition}'), 'step evidence must expose the backend execution disposition');
assert(control.includes('Implementation output is split into execution-ready steps, planning candidates, review-required steps, and structural blockers'), 'implementation control notes must describe the split');

const backendTypes = read('backend/src/services/designCore.types.ts');
for (const token of ['executionGateFailures', 'executionGateReviewReasons', 'operationalSafetyGateRequired', 'operationalSafetyGatePresent', 'planningCandidateStepCount', 'executionReadyStepCount', 'structuralBlockedStepCount']) {
  assert(backendTypes.includes(token), `backend design-core types must expose ${token}`);
}

const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
for (const token of ['V1ImplementationExecutionDisposition', 'planningCandidateStepCount', 'executionReadyStepCount', 'structuralBlockedStepCount']) {
  assert(frontendTypes.includes(token), `frontend snapshot types must expose ${token}`);
}

const evidenceView = read('backend/src/domain/reporting/report-evidence-view.ts');
assert(evidenceView.includes('V1ImplementationPlanning.planningCandidateStepCount'), 'canonical evidence view must consume exact planning-candidate count');
assert(evidenceView.includes('V1ImplementationPlanning.executionReadyStepCount'), 'canonical evidence view must consume exact execution-ready count');
assert(evidenceView.includes('V1ImplementationPlanning.structuralBlockedStepCount'), 'canonical evidence view must consume exact structural-blocked count');
assert(!evidenceView.includes(') - executableSteps'), 'canonical evidence view must not infer planning candidates by subtracting executable steps from total');

const report = read('backend/src/services/exportDesignCoreReport.service.ts');
assert(report.includes('Implementation Candidate Queue'), 'professional export must label implementation output as a candidate queue');
assert(report.includes('planning candidates ${reportEvidenceView.implementation.planningCandidateSteps}'), 'report evidence summary must show planning candidates separately');
assert(report.includes('execution-ready; ${V1ImplementationPlanning.planningCandidateStepCount'), 'implementation appendix must show execution-ready and planning-candidate counts separately');

const frontend = read('frontend/src/pages/ProjectImplementationPage.tsx');
for (const token of ['Execution-ready', 'Planning candidates', 'Implementation candidate queue displayed']) {
  assert(frontend.includes(token), `frontend implementation page must display ${token}`);
}

const backendPkg = JSON.parse(read('backend/package.json'));
assert(String(backendPkg.scripts['selftest:implementation-execution-gates'] || '').includes('execution-gates.selftest.ts'), 'backend package must expose implementation execution-gates selftest');
assert(String(backendPkg.scripts['selftest:domain'] || '').includes('selftest:implementation-execution-gates'), 'domain selftests must include implementation execution-gates selftest');

const rootPkg = JSON.parse(read('package.json'));
assert(String(rootPkg.scripts['check:quality'] || '').includes('check-implementation-execution-gates.cjs'), 'check:quality must include implementation execution-gates guard');

const readme = read('README.md');
assert(readme.includes('Implementation execution gates'), 'README must document implementation execution gates');
assert(readme.includes('check-implementation-execution-gates.cjs'), 'README must document the implementation execution-gates guard');

console.log('[implementation-execution-gates] ok');
