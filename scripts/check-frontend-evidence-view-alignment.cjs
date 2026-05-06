#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
function fail(message) { console.error(`[frontend-evidence-view-alignment] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }

const helperPath = 'frontend/src/lib/reportEvidenceView.tsx';
assert(exists(helperPath), 'missing shared frontend evidence-view helper');
const helper = read(helperPath);
for (const token of [
  'V1_FRONTEND_TRUTH_CARDS_BACKEND_EVIDENCE_CONTRACT',
  'FRONTEND_EVIDENCE_VIEW_SOURCE_PATH',
  'V1ReportExportTruth.evidenceView',
  'getCanonicalReportEvidenceView',
  'BackendEvidenceTruthCards',
  'readiness.designReview',
  'readiness.implementation',
  'validation.rootBlockerCount',
  'validation.propagatedBlockerCount',
  'validation.reviewItemCount',
  'ipam.candidateAllocations',
  'ipam.approvedAllocations',
  'omittedEvidence.hiddenBlockerSurfaces',
  'omittedEvidence.hiddenReviewSurfaces',
]) assert(helper.includes(token), `helper must include ${token}`);

for (const page of ['ProjectOverviewPage.tsx','ProjectReportPage.tsx','ProjectDiagramPage.tsx','ProjectEnterpriseIpamPage.tsx','ProjectImplementationPage.tsx']) {
  const rel = `frontend/src/pages/${page}`;
  const text = read(rel);
  assert(text.includes('getCanonicalReportEvidenceView(designCore)'), `${page} must resolve backend evidence view through shared helper`);
  assert(text.includes('BackendEvidenceTruthCards'), `${page} must display shared backend evidence truth cards`);
  assert(!text.includes('V1ReportExportTruth?.evidenceView'), `${page} must not bypass shared helper for evidence view`);
}
const overview = read('frontend/src/pages/ProjectOverviewPage.tsx');
assert(overview.includes('reportEvidenceView.validation.rootBlockerCount') && overview.includes('reportEvidenceView.validation.reviewItemCount'), 'overview validation summary must use evidence-view counts');
const implementation = read('frontend/src/pages/ProjectImplementationPage.tsx');
assert(implementation.includes('reportEvidenceView.implementation.executableSteps') && implementation.includes('reportEvidenceView.implementation.planningCandidateSteps') && implementation.includes('reportEvidenceView.implementation.blockedSteps'), 'implementation cards must use evidence-view implementation counts');
const report = read('frontend/src/pages/ProjectReportPage.tsx');
for (const token of ['reportEvidenceView.readiness.designReview','reportEvidenceView.readiness.implementation','reportEvidenceView.validation.rootBlockerCount','reportEvidenceView.validation.propagatedBlockerCount','reportEvidenceView.validation.reviewItemCount','reportEvidenceView.ipam.candidateAllocations','reportEvidenceView.ipam.approvedAllocations','reportEvidenceView.omittedEvidence.hiddenBlockerSurfaces','reportEvidenceView.omittedEvidence.hiddenReviewSurfaces']) assert(report.includes(token), `report page missing ${token}`);
console.log('[frontend-evidence-view-alignment] ok');
