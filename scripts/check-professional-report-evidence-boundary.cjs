#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function fail(message) {
  console.error(`professional-report-evidence-boundary check failed: ${message}`);
  process.exit(1);
}

const boundaryPath = 'backend/src/domain/reporting/professional-report-boundary.ts';
const boundary = read(boundaryPath);
const service = read('backend/src/services/exportDesignCoreReport.service.ts');
const pkg = JSON.parse(read('package.json'));
const backendPkg = JSON.parse(read('backend/package.json'));

if (!boundary.includes('V1_PROFESSIONAL_REPORT_EVIDENCE_BOUNDARY')) fail('missing professional report evidence boundary contract');
if (!boundary.includes('isProfessionalMainReportSection') || !boundary.includes('applyProfessionalReportEvidenceBoundary')) fail('boundary does not expose main-section split helpers');
if (!boundary.includes('MAIN_PROFESSIONAL_SECTION_RE')) fail('boundary must keep numbered professional sections in main report');
if (!boundary.includes('INTERNAL_PROOF_TABLE_RE') || !boundary.includes('Anti-overclaim Rules')) fail('boundary must remove product/proof-control tables from professional report appendices');
if (!service.includes('applyProfessionalReportEvidenceBoundary(report);')) fail('professional report service does not apply the evidence boundary before final professionalization');
if (!service.includes('reportMode === "professional"')) fail('boundary must apply only to professional report mode');
if (!service.includes('machine-readable') || !service.includes('detailed')) fail('professional sanitizer must remove machine-readable wording from report text');
if (!String(pkg.scripts['check:quality']).includes('check-professional-report-evidence-boundary.cjs')) fail('check:quality does not include professional report evidence boundary guard');
if (!read('scripts/check-regression-kill-switches.cjs').includes('check-professional-report-evidence-boundary.cjs')) fail('regression kill switches do not include professional report evidence boundary guard');
if (!backendPkg.scripts['selftest:professional-report-boundary']) fail('backend selftest:professional-report-boundary is not wired');
if (!String(backendPkg.scripts['selftest:domain']).includes('selftest:professional-report-boundary')) fail('selftest:domain does not include professional report boundary selftest');

const mdFiles = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (full.includes(`${path.sep}node_modules${path.sep}`) || full.includes(`${path.sep}.git${path.sep}`)) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.md$/i.test(name)) mdFiles.push(path.relative(root, full));
  }
}
walk(root);
const extraMd = mdFiles.filter((file) => file !== 'README.md');
if (extraMd.length) fail(`README-only discipline violated: ${extraMd.join(', ')}`);

console.log('professional-report-evidence-boundary check passed');
