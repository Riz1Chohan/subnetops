#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`Phase 82 check failed: missing ${label}`);
    process.exit(1);
  }
}
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
assertIncludes(release, 'PHASE_82_REPORT_GENERATION_UX_EXPORT_PROGRESS', 'Phase 82 backend health marker');
assertIncludes(release, '0.82.0', 'Phase 82 backend version');
assertIncludes(docs, 'Phase 82', 'Phase 82 documentation');
console.log('Phase 82 report generation UX checks passed');
