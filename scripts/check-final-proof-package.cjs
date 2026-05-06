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
  console.error(`[final-proof-package] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const requiredFiles = [
  'backend/src/domain/proof/types.ts',
  'backend/src/domain/proof/final-proof.ts',
  'backend/src/domain/proof/index.ts',
  'backend/src/domain/proof/proof-domain.selftest.ts',
  'backend/src/services/designCore/designCore.finalProofPassControl.ts',
  'backend/src/lib/finalProofPass.selftest.ts',
  'backend/src/lib/scenarioMatrix.fixtures.ts',
  'backend/src/lib/scenarioMatrix.selftest.ts',
  'backend/src/lib/scenarioMatrix.execution.ts',
];
for (const rel of requiredFiles) assert(exists(rel), `missing ${rel}`);

const backendPackage = JSON.parse(read('backend/package.json'));
assert(backendPackage.version === '1.0.0', 'backend package version must remain 1.0.0');
assert(backendPackage.scripts['selftest:proof-domain'] === 'tsx src/domain/proof/proof-domain.selftest.ts', 'backend must expose selftest:proof-domain');
assert(backendPackage.scripts['selftest:all'].includes('selftest:proof-domain'), 'selftest:all must include proof-domain selftest');

const rootPackage = JSON.parse(read('package.json'));
assert(rootPackage.version === '1.0.0', 'root package version must remain 1.0.0');
assert(rootPackage.scripts['check:v1'].includes('check:quality'), 'root check:v1 must run the quality gate');
assert(rootPackage.scripts['check:quality'].includes('check-final-proof-package.cjs'), 'root check:quality must include final proof package check');

const proofDomain = read('backend/src/domain/proof/final-proof.ts');
const forbiddenImports = [
  /from\s+["'][^"']*express[^"']*["']/,
  /from\s+["'][^"']*prisma[^"']*["']/,
  /from\s+["'][^"']*controller[^"']*["']/,
  /from\s+["'][^"']*service[^"']*["']/,
  /from\s+["'][^"']*react[^"']*["']/i,
];
for (const pattern of forbiddenImports) assert(!pattern.test(proofDomain), `proof domain has forbidden import matching ${pattern}`);
assert(proofDomain.includes('V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT'), 'proof domain must preserve existing V1 compatibility contract');
assert(proofDomain.includes('buildV1FinalProofPassControl'), 'proof domain must own final proof builder');
assert(proofDomain.includes('scenarioExecutionResults'), 'final proof must consume scenario execution results');
assert(proofDomain.includes('scenario-execution-missing'), 'final proof must block when scenario execution evidence is absent');
assert(!/const\s+SCENARIOS\s*:\s*V1ScenarioDefinition\[\]/.test(proofDomain), 'final proof must not keep static scenario definitions as proof');

const wrapper = read('backend/src/services/designCore/designCore.finalProofPassControl.ts');
assert(wrapper.includes('../../domain/proof/index.js'), 'design-core final proof control must be a compatibility wrapper over the proof domain');
assert(!wrapper.includes('const EXPECTED_ENGINES'), 'compatibility wrapper must not keep duplicated final proof registry logic');

const fixtures = read('backend/src/lib/scenarioMatrix.fixtures.ts');
const scenarioExecution = read('backend/src/lib/scenarioMatrix.execution.ts');
assert(scenarioExecution.includes('buildDesignCoreSnapshot'), 'scenario execution must execute real design-core snapshots');
assert(scenarioExecution.includes('executeV1ScenarioMatrix'), 'scenario execution must expose a matrix runner');
const requiredScenarioNeedles = [
  'small-office-baseline-review-gated',
  'multi-site-guest-dmz-security-boundary',
  'overlapping-site-blocks-hard-blocker',
  'local-overlap-dhcp-conflict-regression-gap',
];
for (const needle of requiredScenarioNeedles) assert(fixtures.includes(needle), `scenario matrix is missing ${needle}`);
for (const riskClass of ['baseline', 'security', 'routing', 'addressing', 'implementation', 'known-gap']) {
  assert(fixtures.includes(`riskClass: "${riskClass}"`), `scenario matrix is missing risk class ${riskClass}`);
}

const markdownFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.md$/i.test(entry.name)) markdownFiles.push(path.relative(root, full).replace(/\\/g, '/'));
  }
}
walk(root);
assert(markdownFiles.length === 1 && markdownFiles[0] === 'README.md', `README.md must remain the only Markdown file, found: ${markdownFiles.join(', ')}`);

console.log('[final-proof-package] ok');
