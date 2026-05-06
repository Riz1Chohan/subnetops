#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
function fail(message) { console.error(`[runtime-export-consistency-kill-switches] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }

assert(exists('backend/src/domain/reporting/export-consistency.ts'), 'missing runtime export consistency module');
const proof = read('backend/src/domain/reporting/export-consistency.ts');
for (const token of ['V1_RUNTIME_EXPORT_CONSISTENCY_KILL_SWITCH_CONTRACT','JSON_CSV_PDF_DOCX_FRONTEND_COUNTS_DERIVE_FROM_V1_REPORT_EVIDENCE_VIEW','canonicalRootBlockerCount','surfaceRootBlockerCounts','candidateIpamRowsLabelledApprovedAuthority','implementationBlockedButExecutableClaimed','blockedRequirementRowsWithoutProof','killSwitchPassed']) {
  assert(proof.includes(token), `runtime proof missing ${token}`);
}
for (const surface of ['JSON','CSV','PDF','DOCX','FRONTEND']) assert(proof.includes(`"${surface}"`), `runtime proof missing ${surface}`);
assert(proof.includes('row?.lifecycleStatus') && proof.includes('lifecycleProofStatus') && proof.includes('blockedReason'), 'blocked requirements must require blocker proof');
assert(proof.includes('ENGINE2_CANDIDATE_ALLOCATION') && proof.includes('CANDIDATE_IPAM'), 'candidate IPAM must stay separate from approved authority');

const reportTruth = read('backend/src/domain/reporting/report-export-truth.ts');
assert(reportTruth.includes('buildRuntimeExportConsistencyProof') && reportTruth.includes('exportConsistencyProof'), 'report export truth must build and return consistency proof');
const exportService = read('backend/src/services/export.service.ts');
assert(exportService.includes('V1 Export Consistency Proof'), 'CSV export must include consistency proof');
assert(exportService.includes('getJsonExport') && exportService.includes('JSON_EXPORT_CONSUMES_V1_REPORT_EVIDENCE_VIEW'), 'JSON evidence export must exist and consume evidence view');
assert(exportService.includes('CSV root blockers') && exportService.includes('PDF root blockers') && exportService.includes('DOCX root blockers') && exportService.includes('frontend root blockers'), 'CSV proof row must expose per-format counts');
assert(read('backend/src/controllers/export.controller.ts').includes('exportJson') && read('backend/src/controllers/export.controller.ts').includes('getJsonExport'), 'export controller must expose JSON export');
assert(read('backend/src/routes/export.routes.ts').includes('/projects/:projectId/json'), 'export route must include JSON export');
const reportComposer = read('backend/src/services/exportDesignCoreReport.service.ts');
assert(reportComposer.includes('Export consistency proof') && reportComposer.includes('JSON/CSV/PDF/DOCX/frontend'), 'PDF/DOCX report content must include all-surface consistency proof');
const frontend = read('frontend/src/pages/ProjectReportPage.tsx');
assert(frontend.includes('getCanonicalReportEvidenceView(designCore)') && frontend.includes('BackendEvidenceTruthCards'), 'frontend report page must consume backend evidence view');
const backendPackage = JSON.parse(read('backend/package.json'));
assert(String(backendPackage.scripts['selftest:export-consistency'] || '').includes('export-consistency.selftest.ts'), 'backend must expose export consistency selftest');
assert(String(backendPackage.scripts['selftest:reporting-domain'] || '').includes('selftest:export-consistency'), 'reporting selftests must include export consistency');
console.log('[runtime-export-consistency-kill-switches] ok');
