#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readmePath = path.join(root, 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');

function fail(message) {
  console.error(`[readme-proof-map] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const requiredText = [
  'V1_README_PROOF_MAP',
  'SubnetOps V1 proof map',
  'Engineering Truth Contract',
  'Requirement Propagation Contract',
  'README-only documentation rule',
  'Validation gates',
  'Scenario proof matrix',
  'Readiness ladder',
  'Report/export truth rules',
  'Diagram truth rules',
  'CI proof commands',
  'Known limitations',
  'npm run check:docs',
  'npm run check:quality',
  'npm run check:backend',
  'npm run check:frontend',
  'npm run check:trust',
  'npm run check:proof',
  'npm run check:v1',
  'check-readme-only.cjs',
  'check-regression-kill-switches.cjs',
  'READ_REPAIR_MATERIALIZATION',
  'scenarioExecutionResults',
  'omittedHasBlockers',
  'IMPLEMENTATION_READY',
  'production-ready',
  'truthState',
];

for (const text of requiredText) {
  assert(readme.includes(text), `README proof map must include ${text}`);
}

const disallowedDocHints = [
  'docs/doc/',
  'standalone markdown notes',
  'separate pass notes',
];
for (const hint of disallowedDocHints) {
  assert(!readme.includes(`Create ${hint}`), `README must not instruct creation of ${hint}`);
}

assert(/README\.md is the single repository documentation file/i.test(readme), 'README must state README.md is the single documentation file');
assert(/No DB write may create or update engineering address objects/i.test(readme), 'README must state the shared validation write boundary');
assert(/No silent mutation/i.test(readme), 'README must state read-repair cannot silently mutate state');
assert(/Final proof cannot pass/i.test(readme), 'README must state final proof cannot pass from static expectations');
assert(/No blocker can be hidden/i.test(readme), 'README must state omitted evidence cannot hide blockers');

console.log('[readme-proof-map] ok');
