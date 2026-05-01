#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`Phase 88 check failed: ${message}`); process.exit(1); } }

const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const report = read('backend/src/services/exportDesignCoreReport.service.ts');
const phase84 = read('scripts/check-phase84-design-trust-policy.cjs');
const phase85 = read('scripts/check-phase85-render-compile-fixes.cjs');
const phase86 = read('scripts/check-phase86-render-build-cleanup.cjs');
const pkg = read('package.json');
const docs = read('docs/doc/PHASE88-PROFESSIONAL-REPORT-RELEASE-DISCIPLINE.md');

assert(runtime.includes('professionalReportHardening: "PHASE_88_PROFESSIONAL_REPORT_RELEASE_DISCIPLINE"'), 'runtime Phase 88 marker missing');
assert(runtime.includes('version: "0.88.0"'), 'runtime version not advanced to 0.88.0');
assert(pkg.includes('"version": "0.88.0"'), 'root package version not advanced to 0.88.0');
assert(pkg.includes('check:phase88-professional-report-release-discipline'), 'Phase 88 check script not wired');
assert(pkg.includes('check:phase84-88-release'), 'Phase 84-88 aggregate check missing');

assert(report.includes('function professionalizeReportForAudience(report: ProfessionalReport)'), 'professional report sanitizer helper missing');
assert(report.includes('sanitizeProfessionalReportText'), 'professional report text sanitizer missing');
assert(report.includes('replace(/\\bPhase\\s+\\d+(?:\\s*[–-]\\s*\\d+)?\\s*/gi'), 'professional report does not strip internal phase-number labels');
assert(report.includes('replace(/\\bPHASE_\\d+_[A-Z0-9_]+\\b/g'), 'professional report does not strip internal release markers');
assert(report.includes('reportMode === "professional" ? professionalizeReportForAudience(report) : report'), 'professional mode is not sanitized while technical/full-proof stays intact');
assert(report.includes('if (reportMode === "full-proof") report.sections.push(phase40Section, phase42Section)'), 'full-proof report mode was accidentally removed');

assert(phase84.includes('compatible runtime version') && phase84.includes('0\\.(8[4-9]|9[0-9])'), 'Phase 84 static check is still pinned to an obsolete runtime version');
assert(phase85.includes('compatible runtime version') && phase85.includes('0\\.(8[5-9]|9[0-9])'), 'Phase 85 static check is still pinned to an obsolete runtime version');
assert(!phase86.includes('runtime version was not advanced to 0.86.0') && phase86.includes('at least 0.86.0'), 'Phase 86 static check is still pinned to exactly 0.86.0');
assert(docs.includes('PHASE_88_PROFESSIONAL_REPORT_RELEASE_DISCIPLINE'), 'Phase 88 doc marker missing');

console.log('Phase 88 professional report and release discipline checks passed.');
process.exit(0);
