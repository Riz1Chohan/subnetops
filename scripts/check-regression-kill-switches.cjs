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
  'scripts/check-diagram-graph-lineage-enforcement.cjs',
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
  'scripts/check-wizard-blocker-taxonomy.cjs',
  'scripts/check-wizard-base-range-source-truth.cjs',
  'scripts/check-requirement-consumer-closure-registry.cjs',
  'scripts/check-security-policy-matrix-completion.cjs',
  'scripts/check-security-policy-review-classification.cjs',
  'scripts/check-platform-bom-discovery-state-cleanup.cjs',
  'scripts/check-deployment-api-stability.cjs',
  'scripts/check-frontend-evidence-view-alignment.cjs',
  'scripts/check-runtime-export-consistency-kill-switches.cjs',
  'scripts/check-wizard-implementation-stage-gating.cjs',
  'scripts/check-implementation-execution-gates.cjs',
  'scripts/check-wizard-design-graph-lineage-completion.cjs',
  'scripts/check-report-professional-compression.cjs',
  'scripts/check-clinic-golden-fixture.cjs',
  'scripts/check-export-validation-ledger-consumer.cjs',
  'scripts/check-validation-ledger-authority.cjs',
  'scripts/check-root-blocker-taxonomy-authority.cjs',
  'scripts/check-requirement-closure-blocker-proof.cjs',
  'scripts/check-ipam-authority-state.cjs',
  'scripts/check-report-evidence-view.cjs',
  'scripts/check-professional-report-evidence-boundary.cjs',
  'scripts/check-omitted-evidence-decision-summary.cjs',
  'scripts/check-final-readme-only-cleanup-pass.cjs',
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
assert(readme.includes('Diagram graph lineage enforcement'), 'README must document diagram graph lineage enforcement');
assert(readme.includes('check-diagram-graph-lineage-enforcement.cjs'), 'README must document diagram graph lineage guard');
assert(readme.includes('check-wizard-base-range-source-truth.cjs'), 'README must document wizard base-range source-truth guard');
assert(readme.includes('Requirement-consumer closure registry'), 'README must document requirement-consumer closure registry');
assert(readme.includes('check-requirement-consumer-closure-registry.cjs'), 'README must document requirement-consumer closure registry guard');
assert(readme.includes('Security-policy matrix completion'), 'README must document security-policy matrix completion');
assert(readme.includes('check-security-policy-matrix-completion.cjs'), 'README must document security-policy matrix completion guard');
assert(readme.includes('Security policy / NAT review classification'), 'README must document security policy / NAT review classification');
assert(readme.includes('check-security-policy-review-classification.cjs'), 'README must document security policy review classification guard');
assert(readme.includes('Platform/BOM and discovery state cleanup'), 'README must document Platform/BOM and discovery state cleanup');
assert(readme.includes('check-platform-bom-discovery-state-cleanup.cjs'), 'README must document Platform/BOM discovery state cleanup guard');
assert(readme.includes('Deployment/API stability hardening'), 'README must document deployment/API stability hardening');
assert(readme.includes('check-deployment-api-stability.cjs'), 'README must document deployment/API stability guard');
assert(readme.includes('Runtime CI/export consistency kill switches'), 'README must document runtime export consistency kill switches');
assert(readme.includes('check-runtime-export-consistency-kill-switches.cjs'), 'README must document runtime export consistency guard');
assert(readme.includes('Frontend truth cards / backend evidence alignment'), 'README must document frontend evidence-view alignment');
assert(readme.includes('check-frontend-evidence-view-alignment.cjs'), 'README must document frontend evidence-view alignment guard');
assert(readme.includes('Wizard implementation stage gating'), 'README must document wizard implementation stage gating');
assert(readme.includes('check-wizard-implementation-stage-gating.cjs'), 'README must document wizard implementation stage-gating guard');
assert(readme.includes('Implementation execution gates'), 'README must document implementation execution gates');
assert(readme.includes('check-implementation-execution-gates.cjs'), 'README must document implementation execution-gates guard');
assert(readme.includes('Wizard design-graph lineage completion'), 'README must document wizard design-graph lineage completion');
assert(readme.includes('check-wizard-design-graph-lineage-completion.cjs'), 'README must document wizard design-graph lineage guard');
assert(readme.includes('Report professional compression'), 'README must document report professional compression');
assert(readme.includes('check-report-professional-compression.cjs'), 'README must document report professional compression guard');
assert(readme.includes('V1 validation ledger authority'), 'README must document validation ledger authority');
assert(readme.includes('Export validation ledger consumer'), 'README must document export validation ledger consumer');
assert(readme.includes('check-export-validation-ledger-consumer.cjs'), 'README must document export validation ledger consumer guard');
assert(readme.includes('check-validation-ledger-authority.cjs'), 'README must document validation ledger guard');
assert(readme.includes('Root blocker taxonomy authority'), 'README must document root blocker taxonomy authority');
assert(readme.includes('check-root-blocker-taxonomy-authority.cjs'), 'README must document root blocker taxonomy guard');
assert(readme.includes('Requirement closure blocker proof'), 'README must document requirement closure blocker proof');
assert(readme.includes('Canonical report evidence view'), 'README must document canonical report evidence view');
assert(readme.includes('check-report-evidence-view.cjs'), 'README must document report evidence view guard');
assert(readme.includes('Professional report evidence boundary'), 'README must document professional report evidence boundary');
assert(readme.includes('Omitted evidence decision summary'), 'README must document omitted evidence decision summary');
assert(readme.includes('check-professional-report-evidence-boundary.cjs'), 'README must document professional report evidence boundary guard');
assert(readme.includes('check-omitted-evidence-decision-summary.cjs'), 'README must document omitted evidence decision-summary guard');
assert(readme.includes('check-requirement-closure-blocker-proof.cjs',
  'scripts/check-ipam-authority-state.cjs'), 'README must document requirement closure blocker-proof guard');

console.log('[regression-kill-switches] ok');
