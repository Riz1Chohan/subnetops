#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const fail = (message) => { console.error(`Report/export overclaim check failed: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };
const includes = (text, needle, label) => assert(text.includes(needle), `${label} must include ${needle}`);

const domain = read('backend/src/domain/reporting/report-export-truth.ts');
const types = read('backend/src/domain/reporting/types.ts');
const gates = read('backend/src/domain/reporting/export-gates.ts');
const sectionModel = read('backend/src/domain/reporting/section-model.ts');
const reportService = read('backend/src/services/exportDesignCoreReport.service.ts');
const csvExport = read('backend/src/services/export.service.ts');
const backendTypes = read('backend/src/services/designCore.types.ts');
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
const rootPackage = JSON.parse(read('package.json'));
const backendPackage = JSON.parse(read('backend/package.json'));

assert((domain.match(/let overallReadiness/g) || []).length === 1, 'report export truth domain must not contain duplicate overallReadiness declarations');
for (const needle of [
  'buildAntiOverclaimRules',
  'antiOverclaimRules',
  'implementationReadyClaimAllowed',
  'productionReadyClaimAllowed',
  'fullMachineReadableAppendix',
  'omittedEvidenceSummaries',
  'fullEvidenceInventory',
]) includes(domain, needle, 'report export truth domain');

for (const needle of [
  'V1ReportAntiOverclaimRule',
  'V1ReportFullEvidenceAppendix',
  'implementationReadyClaimAllowed',
  'productionReadyClaimAllowed',
  'omittedEvidenceSummaries',
  'fullEvidenceInventory',
  'antiOverclaimRules',
]) {
  includes(types, needle, 'reporting types');
  includes(backendTypes, needle, 'backend design-core public types');
  includes(frontendTypes, needle, 'frontend design-core public types');
}

for (const forbidden of ['ready for deployment', 'validated', 'complete', 'best practice compliant', 'production-ready', 'implementation-ready']) {
  includes(gates, forbidden, 'anti-overclaim gate');
}
includes(gates, 'reportCanClaimReady', 'anti-overclaim gate');
includes(gates, 'findOverclaimRisks', 'anti-overclaim gate');
includes(gates, 'rewriteForbiddenReportClaim', 'anti-overclaim gate');
includes(gates, 'canClaimImplementationReady', 'anti-overclaim gate');
includes(sectionModel, 'canClaimImplementationReady', 'report evidence document builder');
includes(sectionModel, 'omittedEvidenceSummaries', 'report evidence document builder');

for (const needle of [
  'rewriteForbiddenReportClaim',
  'applyReportOverclaimGuard',
  'cleanReportClaimsAllowed',
  'Full Evidence Appendix',
  'Omitted Evidence Summary',
  'Full Evidence Inventory',
  'Anti-overclaim Rules',
  'reportCanClaimReady',
  'findOverclaimRisks',
]) includes(reportService, needle, 'professional report export service');

for (const needle of [
  'V1 Report Omitted Evidence',
  'V1 Report Full Evidence Inventory',
  'V1 Report Anti-Overclaim Rules',
  'V1 Report Machine-Readable Appendix',
  'omittedEvidenceSummaries',
  'fullEvidenceInventory',
  'antiOverclaimRules',
  'fullMachineReadableAppendix',
]) includes(csvExport, needle, 'CSV/export evidence service');

assert(String(rootPackage.scripts['check:quality'] || '').includes('check-no-report-overclaim.cjs'), 'root check:quality must include report overclaim regression gate');
assert(String(rootPackage.scripts['check:trust'] || '').includes('selftest:reporting-domain'), 'root trust gate must run reporting domain selftest');
assert(String(backendPackage.scripts['selftest:reporting-domain'] || '').includes('reporting-domain.selftest.ts'), 'backend must expose reporting domain selftest');

console.log('Report/export overclaim check passed.');
