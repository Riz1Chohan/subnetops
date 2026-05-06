#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`[report-evidence-view] ${message}`); process.exit(1); };
const mustInclude = (rel, marker) => { if (!read(rel).includes(marker)) fail(`${rel} missing ${marker}`); };

mustInclude('backend/src/domain/reporting/report-evidence-view.ts', 'V1_REPORT_EVIDENCE_VIEW_CONTRACT');
mustInclude('backend/src/domain/reporting/report-evidence-view.ts', 'CANONICAL_EXPORT_EVIDENCE_VIEW_FOR_DOCX_PDF_CSV_JSON_FRONTEND');
mustInclude('backend/src/domain/reporting/report-evidence-view.ts', 'ALL_EXPORT_FORMATS_CONSUME_THIS_VIEW_NO_RECOMPUTED_COUNTS');
mustInclude('backend/src/domain/reporting/report-evidence-view.ts', 'rootBlockerCount');
mustInclude('backend/src/domain/reporting/report-evidence-view.ts', 'candidateAllocations');
mustInclude('backend/src/domain/reporting/report-evidence-view.ts', 'approvedAllocations');
mustInclude('backend/src/domain/reporting/report-evidence-view.ts', 'executableSteps');
mustInclude('backend/src/domain/reporting/report-evidence-view.ts', 'hiddenBlockerSurfaces');

mustInclude('backend/src/domain/reporting/report-export-truth.ts', 'buildReportEvidenceView');
mustInclude('backend/src/domain/reporting/report-export-truth.ts', 'evidenceView');
mustInclude('backend/src/domain/reporting/types.ts', 'V1ReportEvidenceView');
mustInclude('backend/src/services/designCore.types.ts', 'V1ReportEvidenceView');

mustInclude('backend/src/services/export.service.ts', 'buildReportEvidenceView');
mustInclude('backend/src/services/export.service.ts', 'V1 Report Evidence View');
mustInclude('backend/src/services/exportDesignCoreReport.service.ts', 'reportEvidenceView');
mustInclude('backend/src/services/exportDesignCoreReport.service.ts', 'Authoritative evidence view');

mustInclude('frontend/src/pages/ProjectReportPage.tsx', 'reportEvidenceView');
mustInclude('frontend/src/pages/ProjectReportPage.tsx', 'IPAM candidates');
mustInclude('frontend/src/pages/ProjectReportPage.tsx', 'Execution-ready steps');

mustInclude('backend/package.json', 'selftest:report-evidence-view');
mustInclude('package.json', 'check-report-evidence-view.cjs');
mustInclude('scripts/check-regression-kill-switches.cjs', 'check-report-evidence-view.cjs');
mustInclude('README.md', 'Canonical report evidence view');
mustInclude('README.md', 'Professional reports may show engineer-facing evidence summaries');

console.log('[report-evidence-view] ok');
