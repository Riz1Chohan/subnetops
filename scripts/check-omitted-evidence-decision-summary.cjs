#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
function fail(message) {
  console.error(`[omitted-evidence-decision-summary] ${message}`);
  process.exit(1);
}
function mustInclude(rel, marker) {
  if (!exists(rel)) fail(`missing ${rel}`);
  if (!read(rel).includes(marker)) fail(`${rel} missing ${marker}`);
}

mustInclude('backend/src/domain/evidence/omitted-evidence.ts', 'OmittedEvidenceDecisionSummary');
mustInclude('backend/src/domain/evidence/omitted-evidence.ts', 'buildOmittedEvidenceDecisionSummary');
mustInclude('backend/src/domain/evidence/omitted-evidence.ts', 'blockingSurfaces');
mustInclude('backend/src/domain/evidence/omitted-evidence.ts', 'reviewSurfaces');
mustInclude('backend/src/domain/evidence/omitted-evidence.ts', 'implementationAffected');
mustInclude('backend/src/domain/evidence/omitted-evidence.selftest.ts', 'buildOmittedEvidenceDecisionSummary');

mustInclude('backend/src/domain/reporting/report-evidence-view.ts', 'buildOmittedEvidenceDecisionSummary');
mustInclude('backend/src/domain/reporting/report-evidence-view.ts', 'decisionImpact');
mustInclude('backend/src/domain/reporting/report-export-truth.ts', 'omittedEvidenceDecisionSummary');
mustInclude('backend/src/domain/reporting/types.ts', 'OmittedEvidenceDecisionSummary');
mustInclude('backend/src/services/designCore.types.ts', 'OmittedEvidenceDecisionSummary');

mustInclude('backend/src/services/exportDesignCoreReport.service.ts', 'Omitted Evidence Decision Summary');
mustInclude('backend/src/services/exportDesignCoreReport.service.ts', 'Omitted Evidence Affected Surfaces');
mustInclude('backend/src/services/export.service.ts', 'V1 Report Omitted Evidence Decision');
mustInclude('frontend/src/pages/ProjectReportPage.tsx', 'Omitted evidence');
mustInclude('frontend/src/lib/designCoreSnapshot.ts', 'OmittedEvidenceDecisionSummary');

mustInclude('package.json', 'check-omitted-evidence-decision-summary.cjs');
mustInclude('scripts/check-regression-kill-switches.cjs', 'check-omitted-evidence-decision-summary.cjs');
mustInclude('README.md', 'Omitted evidence decision summary');
mustInclude('README.md', 'check-omitted-evidence-decision-summary.cjs');

console.log('[omitted-evidence-decision-summary] ok');
