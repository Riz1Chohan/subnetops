#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function fail(message) {
  console.error(`[final-proof-scenario-execution] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const finalProof = read('backend/src/domain/proof/final-proof.ts');
const proofTypes = read('backend/src/domain/proof/types.ts');
const scenarioSelftest = read('backend/src/lib/scenarioMatrix.selftest.ts');
const finalProofSelftest = read('backend/src/lib/finalProofPass.selftest.ts');
const rootPackage = JSON.parse(read('package.json'));
const backendPackage = JSON.parse(read('backend/package.json'));

assert(exists('backend/src/lib/scenarioMatrix.execution.ts'), 'missing scenarioMatrix.execution.ts');
const scenarioExecution = read('backend/src/lib/scenarioMatrix.execution.ts');

assert(proofTypes.includes('interface V1ScenarioExecutionResult'), 'proof domain must model scenario execution results');
assert(proofTypes.includes('assertions: V1ScenarioAssertion[]'), 'scenario execution results must preserve assertion arrays');
assert(proofTypes.includes('snapshotResult: unknown'), 'scenario execution results must preserve snapshot result evidence');
assert(proofTypes.includes('reportEvidence: string[]'), 'scenario execution results must preserve report evidence');
assert(proofTypes.includes('diagramEvidence: string[]'), 'scenario execution results must preserve diagram evidence');
assert(proofTypes.includes('validationEvidence: string[]'), 'scenario execution results must preserve validation evidence');

assert(finalProof.includes('scenarioExecutionResults'), 'final proof must consume scenarioExecutionResults from context');
assert(finalProof.includes('execution.assertions.filter'), 'final proof must grade scenario assertion statuses');
assert(finalProof.includes('scenario-execution-missing'), 'final proof must block when scenario execution is missing');
assert(finalProof.includes('Final proof cannot pass from static expected summaries'), 'final proof must explicitly reject static summary proof');
assert(!/const\s+SCENARIOS\s*:\s*V1ScenarioDefinition\[\]/.test(finalProof), 'final proof must not keep a static scenario registry as proof');
assert(!finalProof.includes('expectedStageNumbers.map'), 'final proof must not derive scenario pass/fail from expected stage numbers');

assert(scenarioExecution.includes('buildDesignCoreSnapshot'), 'scenario execution must run real backend design-core snapshots');
assert(scenarioExecution.includes('executeV1ScenarioMatrix'), 'scenario execution must expose executeV1ScenarioMatrix');
assert(scenarioExecution.includes('snapshotResult'), 'scenario execution must return snapshotResult evidence');
assert(scenarioExecution.includes('assertions'), 'scenario execution must emit executable assertions');
assert(scenarioExecution.includes('reportEvidence') && scenarioExecution.includes('diagramEvidence') && scenarioExecution.includes('validationEvidence'), 'scenario execution must preserve report/diagram/validation evidence');

assert(scenarioSelftest.includes('executeV1ScenarioMatrix'), 'scenario matrix selftest must use scenario execution results');
assert(scenarioSelftest.includes('failed assertions'), 'scenario matrix selftest must fail on failed execution assertions');
assert(finalProofSelftest.includes('executeV1ScenarioMatrix'), 'final proof selftest must feed real scenario execution results into final proof');
assert(finalProofSelftest.includes('scenarioExecutionResultCount'), 'final proof selftest must assert scenario execution result count');

assert(rootPackage.scripts['check:quality'].includes('check-final-proof-scenario-execution.cjs'), 'root check:quality must include final proof scenario execution kill-switch');
assert(backendPackage.scripts['selftest:scenario-matrix'].includes('scenarioMatrix.selftest.ts'), 'backend scenario matrix selftest script must remain wired');
assert(backendPackage.scripts['selftest:final-proof'].includes('finalProofPass.selftest.ts'), 'backend final proof selftest script must remain wired');

console.log('[final-proof-scenario-execution] ok');
