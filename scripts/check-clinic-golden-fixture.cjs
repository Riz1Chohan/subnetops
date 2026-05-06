#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
function fail(message) {
  console.error(`[clinic-golden-fixture] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const fixturePath = 'backend/src/services/goldenFixtures/clinicNetworkPlan.fixture.ts';
const selftestPath = 'backend/src/services/clinicGoldenExport.selftest.ts';
assert(exists(fixturePath), `missing ${fixturePath}`);
assert(exists(selftestPath), `missing ${selftestPath}`);

const fixture = read(fixturePath);
for (const token of [
  'V1_CLINIC_GOLDEN_EXPORT_FIXTURE',
  'README.md',
  'executiveSummaryRootBlockers: 11',
  'legacyValidationRollupRootBlockers: 50',
  'executiveSummaryWarnings: 174',
  'addressingRows: 39',
  'omittedEvidenceRows: 543',
  'ipamCandidateAllocations: 39',
  'ipamApprovedAllocations: 0',
  'candidateIpamMustNotBeCalledReadyAuthority: true',
  'professionalReportContainsNoDeveloperRepairNarrative: true',
]) {
  assert(fixture.includes(token), `clinic golden fixture must include ${token}`);
}
for (const forbiddenBoundary of ['developer note', 'selftest', 'fixture', 'repair phase', 'chat commentary', 'debug dump', 'code snippet']) {
  assert(fixture.includes(forbiddenBoundary), `professional report boundary must include ${forbiddenBoundary}`);
}

const selftest = read(selftestPath);
for (const token of [
  'notEqual',
  '11-vs-50 blocker-count contradiction',
  'candidateIpamIsReviewRequiredNotApprovedAuthority',
  'professionalReportContainsNoDeveloperRepairNarrative',
]) {
  assert(selftest.includes(token), `clinic golden selftest must assert ${token}`);
}

const backendPackage = JSON.parse(read('backend/package.json'));
assert(backendPackage.scripts['selftest:clinic-golden-export'] === 'tsx src/services/clinicGoldenExport.selftest.ts', 'backend package must expose selftest:clinic-golden-export');
assert(String(backendPackage.scripts['selftest:services'] || '').includes('selftest:clinic-golden-export'), 'selftest:services must include clinic golden export selftest');

const rootPackage = JSON.parse(read('package.json'));
assert(String(rootPackage.scripts['check:quality'] || '').includes('check-clinic-golden-fixture.cjs'), 'check:quality must include clinic golden fixture guard');

const regression = read('scripts/check-regression-kill-switches.cjs');
assert(regression.includes('check-clinic-golden-fixture.cjs'), 'regression kill-switch umbrella must include clinic golden fixture guard');

const readme = read('README.md');
for (const token of [
  'V1_CLINIC_GOLDEN_EXPORT_FIXTURE',
  'Clinic golden export fixture',
  'Professional report boundary',
  'check-clinic-golden-fixture.cjs',
  'no developer commentary, code snippets, repair notes, chat commentary, or debug language',
]) {
  assert(readme.includes(token), `README must document ${token}`);
}

console.log('[clinic-golden-fixture] ok');
