#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
function fail(message) {
  console.error(`[final-readme-only-cleanup-pass] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const rootPackage = JSON.parse(read('package.json'));
const quality = String(rootPackage.scripts?.['check:quality'] || '');
const regression = read('scripts/check-regression-kill-switches.cjs');
const readme = read('README.md');
const reportService = read('backend/src/services/exportDesignCoreReport.service.ts');
const professionalBoundary = read('backend/src/domain/reporting/professional-report-boundary.ts');

const ignoredDirs = new Set(['.git', 'node_modules']);
const markdownFiles = [];
const forbiddenDirs = [];
const generatedArtifacts = [];
const forbiddenDirectoryNames = new Set(['dist', 'build', '.next', 'coverage']);
const generatedFileExtensions = new Set(['.docx', '.pdf', '.xlsx', '.pptx']);
const generatedFileNames = new Set(['report.csv', 'report.json', 'export.csv', 'export.json']);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      if (forbiddenDirectoryNames.has(entry.name)) forbiddenDirs.push(rel);
      walk(full);
      continue;
    }
    if (/\.(md|markdown)$/i.test(entry.name)) markdownFiles.push(rel);
    const lower = entry.name.toLowerCase();
    const ext = path.extname(lower);
    if (generatedFileExtensions.has(ext) || generatedFileNames.has(lower)) generatedArtifacts.push(rel);
  }
}
walk(root);

assert(markdownFiles.length === 1 && markdownFiles[0] === 'README.md', `README-only documentation violated: ${markdownFiles.join(', ') || 'none'}`);
assert(forbiddenDirs.length === 0, `generated/build directory present in source package: ${forbiddenDirs.join(', ')}`);
assert(generatedArtifacts.length === 0, `generated deliverable artifact present in source package: ${generatedArtifacts.join(', ')}`);
assert(!exists('docs/doc'), 'docs/doc directory must not exist; README.md is the only documentation surface');

const requiredGuards = [
  'check-readme-only.cjs',
  'check-regression-kill-switches.cjs',
  'check-no-report-overclaim.cjs',
  'check-professional-report-evidence-boundary.cjs',
  'check-runtime-export-consistency-kill-switches.cjs',
  'check-frontend-evidence-view-alignment.cjs',
  'check-security-policy-review-classification.cjs',
  'check-platform-bom-discovery-state-cleanup.cjs',
  'check-deployment-api-stability.cjs',
  'check-final-readme-only-cleanup-pass.cjs',
];
for (const guard of requiredGuards) {
  assert(exists(`scripts/${guard}`), `missing required guard script ${guard}`);
  assert(quality.includes(guard), `check:quality must run ${guard}`);
}
assert(regression.includes('check-final-readme-only-cleanup-pass.cjs'), 'regression kill switches must include final cleanup pass guard');

for (const phrase of [
  'V1_FINAL_README_ONLY_CLEANUP_PASS',
  'Final README-only cleanup pass',
  'README.md remains the only Markdown documentation file',
  'No generated build output, dependency folders, coverage output, or report deliverables belong in the source package',
  'Professional reports remain engineer-facing deliverables only',
  'check-final-readme-only-cleanup-pass.cjs',
]) {
  assert(readme.includes(phrase), `README final cleanup proof must include: ${phrase}`);
}

for (const phrase of [
  'developer commentary',
  'code snippets',
  'repair notes',
  'chat commentary',
  'debug language',
]) {
  assert(readme.includes(phrase), `README must preserve professional-report ban for ${phrase}`);
}

assert(reportService.includes('sanitizeProfessionalReportText'), 'professional report service must sanitize report text');
assert(reportService.includes('applyProfessionalReportEvidenceBoundary(report);'), 'professional report service must apply the evidence boundary');
assert(reportService.indexOf('applyProfessionalReportEvidenceBoundary(report);') < reportService.indexOf('professionalizeReportForAudience(report);'), 'professional report boundary must run before final audience cleanup');
for (const term of ['machine-readable', 'debug', 'developer', 'contract', 'backend design-core']) {
  assert(reportService.includes(term), `professional report sanitizer must continue covering ${term}`);
}
assert(professionalBoundary.includes('V1_PROFESSIONAL_REPORT_EVIDENCE_BOUNDARY'), 'professional report boundary contract marker missing');
assert(professionalBoundary.includes('applyProfessionalReportEvidenceBoundary'), 'professional report boundary helper missing');

console.log('[final-readme-only-cleanup-pass] ok');
