#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'backend/src/domain/evidence/omitted-evidence.ts',
  'backend/src/domain/evidence/omitted-evidence.selftest.ts',
  'backend/src/domain/diagram/types.ts',
  'backend/src/domain/diagram/render-model.ts',
  'backend/src/domain/reporting/types.ts',
  'backend/src/domain/reporting/report-export-truth.ts',
  'backend/src/services/exportDesignCoreReport.service.ts',
];

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => {
  console.error(`Omitted evidence counter check failed: ${message}`);
  process.exit(1);
};

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
}

const helper = read('backend/src/domain/evidence/omitted-evidence.ts');
for (const token of [
  'shownCount',
  'totalCount',
  'omittedCount',
  'omittedHasBlockers',
  'omittedHasReviewRequired',
  'omittedSeveritySummary',
  'readinessImpact',
  'buildOmittedEvidenceSummary',
  'mergeOmittedEvidenceSummaries',
]) {
  if (!helper.includes(token)) fail(`helper does not expose ${token}`);
}

const diagramTypes = read('backend/src/domain/diagram/types.ts');
if (!diagramTypes.includes('omittedEvidenceSummaries: OmittedEvidenceSummary[]')) fail('diagram render model does not expose omittedEvidenceSummaries');
if (!diagramTypes.includes('omittedEvidenceHasBlockers')) fail('diagram summary does not expose hidden blocker flag');

const diagramRender = read('backend/src/domain/diagram/render-model.ts');
for (const token of ['diagram security zones', 'diagram policy rules', 'diagram hotspots', 'mergeOmittedEvidenceSummaries']) {
  if (!diagramRender.includes(token)) fail(`diagram render model missing ${token} counter`);
}

const reportingTypes = read('backend/src/domain/reporting/types.ts');
if (!reportingTypes.includes('omittedEvidenceSummaries: OmittedEvidenceSummary[]')) fail('report/export truth summary does not expose omitted summaries');
if (!reportingTypes.includes('fullEvidenceInventory')) fail('report/export truth summary does not expose fullEvidenceInventory');

const reportTruth = read('backend/src/domain/reporting/report-export-truth.ts');
for (const token of ['evidenceWindow', 'requirement traceability matrix', 'fullEvidenceInventory', 'omittedEvidenceSummaries']) {
  if (!reportTruth.includes(token)) fail(`report/export truth missing ${token}`);
}

const exportReport = read('backend/src/services/exportDesignCoreReport.service.ts');
for (const token of [
  'V1 Omitted Evidence Summary',
  'Omitted Evidence Counters',
  'Hidden blockers',
  'Hidden review',
  'requirements traceability rows',
  'validation checks',
  'diagram nodes',
  'diagram edges',
  'routing rows',
  'security flow requirements',
  'implementation steps',
  'vendor-neutral templates',
]) {
  if (!exportReport.includes(token)) fail(`report export missing ${token}`);
}

const rootPackage = JSON.parse(read('package.json'));
if (!rootPackage.scripts?.['check:quality']?.includes('check-omitted-evidence-counters.cjs')) {
  fail('root check:quality does not include omitted evidence counter gate');
}
const backendPackage = JSON.parse(read('backend/package.json'));
if (!backendPackage.scripts?.['selftest:omitted-evidence']) fail('backend package missing selftest:omitted-evidence');
if (!backendPackage.scripts?.['selftest:all']?.includes('selftest:omitted-evidence')) fail('backend selftest:all does not include omitted evidence selftest');

console.log('omitted evidence counter check passed');
