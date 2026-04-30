#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(label) { console.error(`Phase 82 check failed: missing ${label}`); process.exit(1); }
function assertIncludes(source, needle, label) { if (!source.includes(needle)) fail(label); }
const reportPage = read('frontend/src/pages/ProjectReportPage.tsx');
const styles = read('frontend/src/styles.css');
const release = read('backend/src/services/requirementsRuntimeProof.service.ts');
const docs = read('docs/doc/PHASE82-REPORT-GENERATION-UX-EXPORT-PROGRESS.md');
assertIncludes(reportPage, 'ExportProgressModal', 'report export progress modal component');
assertIncludes(reportPage, 'Report processing', 'modal visible processing label');
assertIncludes(reportPage, 'elapsedSeconds', 'elapsed export timer state');
assertIncludes(reportPage, 'This may take 1–4 minutes for large designs', 'long-running export expectation copy');
assertIncludes(reportPage, 'disabled={Boolean(activeExport)}', 'duplicate export button prevention');
assertIncludes(reportPage, 'setActiveExport(null)', 'export completion cleanup');
assertIncludes(styles, '.export-progress-backdrop', 'modal backdrop CSS');
assertIncludes(styles, '.export-progress-spinner', 'modal spinner CSS');
assertIncludes(styles, '@keyframes subnetops-export-spin', 'spinner animation CSS');
if (!release.includes('PHASE_82_REPORT_GENERATION_UX_EXPORT_PROGRESS') && !release.includes('PHASE_83_REQUIREMENT_PROPAGATION_COMPLETION_AUDIT')) fail('Phase 82-or-successor backend health marker');
if (!release.includes('0.82.0') && !release.includes('0.83.0')) fail('Phase 82-or-successor backend version');
assertIncludes(docs, 'Phase 82', 'Phase 82 documentation');
console.log('Phase 82 report generation UX checks passed');
