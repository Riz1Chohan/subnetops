#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
function fail(message) {
  console.error(`[regression-kill-switches] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const requiredScripts = [
  'scripts/check-no-frontend-engineering-facts.cjs',
  'scripts/check-no-report-overclaim.cjs',
  'scripts/check-no-diagram-clean-inference.cjs',
  'scripts/check-readme-only.cjs',
  'scripts/check-service-validation-coverage.cjs',
  'scripts/check-final-proof-scenario-execution.cjs',
  'scripts/check-no-silent-read-repair.cjs',
  'scripts/check-omitted-evidence-counters.cjs',
  'scripts/check-requirement-materialization-source-truth.cjs',
  'scripts/check-project-cidr-validation.cjs',
  'scripts/check-readiness-ladder-enforcement.cjs',
  'scripts/check-api-service-database-integration-proof.cjs',
  'scripts/check-readme-proof-map.cjs',
];

const packageJson = JSON.parse(read('package.json'));
const quality = String(packageJson.scripts['check:quality'] || '');
for (const script of requiredScripts) {
  assert(exists(script), `missing kill-switch script ${script}`);
  assert(quality.includes(path.basename(script)), `check:quality must include ${path.basename(script)}`);
}

const readmeCheck = read('scripts/check-readme-only.cjs');
assert(readmeCheck.includes('README.md'), 'README-only kill switch must name README.md');
assert(readmeCheck.includes('.md'), 'README-only kill switch must scan Markdown files');

const frontendCheck = read('scripts/check-no-frontend-engineering-facts.cjs');
assert(frontendCheck.includes('calculateSubnet') && frontendCheck.includes('canonicalizeCidr'), 'frontend kill switch must detect subnet/CIDR fact generation');
assert(frontendCheck.includes('isUsingFrontendFallback: false'), 'frontend kill switch must protect backend-only authority mode');

const reportCheck = read('scripts/check-no-report-overclaim.cjs');
for (const phrase of ['production-ready', 'implementation-ready', 'ready for deployment', 'best practice compliant']) {
  assert(reportCheck.includes(phrase), `report overclaim kill switch must guard ${phrase}`);
}

const diagramCheck = read('scripts/check-no-diagram-clean-inference.cjs');
assert(diagramCheck.includes('V1_DIAGRAM_CLEAN_INFERENCE_LEAK'), 'diagram clean-inference kill switch must target the backend control finding');
assert(diagramCheck.includes('readinessImpact === "NONE"'), 'diagram clean-inference kill switch must reject clean inferred evidence');

const finalProofCheck = read('scripts/check-final-proof-scenario-execution.cjs');
assert(finalProofCheck.includes('executeV1ScenarioMatrix') && finalProofCheck.includes('scenarioExecutionResults'), 'final proof kill switch must require executed scenario results');

const readRepairCheck = read('scripts/check-no-silent-read-repair.cjs');
assert(readRepairCheck.includes('authorization') && readRepairCheck.includes('surfacedTo'), 'read-repair kill switch must require authorization and surfaced evidence');

const omittedCheck = read('scripts/check-omitted-evidence-counters.cjs');
assert(omittedCheck.includes('omittedHasBlockers') && omittedCheck.includes('omittedSeveritySummary'), 'omitted evidence kill switch must guard hidden blocker counters');

const readme = read('README.md');
assert(readme.includes('Regression kill-switch checks'), 'README must document regression kill-switch checks');
assert(readme.includes('V1_README_PROOF_MAP'), 'README must document the consolidated proof map');
assert(readme.includes('check-no-frontend-engineering-facts.cjs'), 'README must document frontend engineering-facts guard');
assert(readme.includes('check-no-diagram-clean-inference.cjs'), 'README must document diagram clean-inference guard');

console.log('[regression-kill-switches] ok');
