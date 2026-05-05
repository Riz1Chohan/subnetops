#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const frontendReport = fs.readFileSync(path.join(root, 'frontend/src/pages/ProjectReportPage.tsx'), 'utf8');
const frontendApi = fs.readFileSync(path.join(root, 'frontend/src/lib/api.ts'), 'utf8');
const exportController = fs.readFileSync(path.join(root, 'backend/src/controllers/export.controller.ts'), 'utf8');

const failures = [];
function mustContain(label, haystack, needle) {
  if (!haystack.includes(needle)) failures.push(`${label} missing required guard: ${needle}`);
}

mustContain('ProjectReportPage export recovery', frontendReport, 'AbortController');
mustContain('ProjectReportPage export recovery', frontendReport, 'EXPORT_TIMEOUT_MS');
mustContain('ProjectReportPage export recovery', frontendReport, 'cancelActiveExport');
mustContain('ProjectReportPage export recovery', frontendReport, 'window.clearTimeout(timeoutId)');
mustContain('ProjectReportPage export recovery', frontendReport, 'setActiveExport(null)');
mustContain('ProjectReportPage export recovery', frontendReport, 'signal: controller.signal');
mustContain('apiBlob download validation', frontendApi, 'parseBlobError');
mustContain('apiBlob download validation', frontendApi, 'blob.size === 0');
mustContain('apiBlob download validation', frontendApi, 'application/json');
mustContain('apiBlob download validation', frontendApi, 'text/html');
mustContain('backend interactive export stabilization', exportController, 'stabilizeReportForInteractiveExport');
mustContain('backend interactive export stabilization', exportController, 'INTERACTIVE_EXPORT_ROW_LIMITS');
mustContain('backend interactive export stabilization', exportController, 'Export Stability Appendix');
mustContain('backend interactive export stabilization', exportController, 'setExportResponseHeaders');

if (!/buildPdf[\s\S]*stabilizeReportForInteractiveExport\(report, "pdf", reportMode\)/.test(exportController)) {
  failures.push('PDF builder must stabilize/bound report rows before rendering.');
}
if (!/buildDocx[\s\S]*stabilizeReportForInteractiveExport\(report, "docx", reportMode\)/.test(exportController)) {
  failures.push('DOCX builder must stabilize/bound report rows before rendering.');
}

if (failures.length > 0) {
  console.error('Export failure recovery gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Export failure recovery gate passed.');
