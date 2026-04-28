#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const fail = (message) => {
  console.error(`Export truth hardening check failed: ${message}`);
  process.exit(1);
};
const req = (content, needle, message) => {
  if (!content.includes(needle)) fail(message);
};

const exportReport = read('backend/src/services/exportDesignCoreReport.service.ts');
const exportService = read('backend/src/services/export.service.ts');
const docs = read('docs/doc/PHASE40-EXPORT-TRUTH-DOCX-PDF-SUBSTANCE-HARDENING.md');

req(exportReport, 'reportTruth', 'PDF/DOCX export report must consume backend reportTruth.');
req(exportReport, 'diagramTruth', 'PDF/DOCX export report must consume backend diagramTruth.');
req(exportReport, 'implementationPlan', 'PDF/DOCX export report must consume backend implementationPlan.');
req(exportReport, 'verificationChecks', 'PDF/DOCX export report must include verificationChecks.');
req(exportReport, 'rollbackActions', 'PDF/DOCX export report must include rollbackActions.');
req(exportReport, 'Phase 40 Blocking Findings', 'PDF/DOCX export must include blocking findings table.');
req(exportReport, 'Phase 40 Review Findings', 'PDF/DOCX export must include review findings table.');
req(exportReport, 'Phase 40 Proof Boundary and Limitations', 'PDF/DOCX export must include proof boundary / limitations.');
req(exportReport, 'Phase 40 Diagram Truth and Render Model Summary', 'PDF/DOCX export must include diagram render model summary.');
req(exportReport, 'This design is not implementation-ready.', 'PDF/DOCX export must use hard blocked-design language.');
req(exportReport, 'Required evidence', 'Implementation review queue must include required evidence.');
req(exportReport, 'Acceptance criteria', 'Implementation review queue and verification matrix must include acceptance criteria.');
req(exportReport, 'Failure impact', 'Verification matrix must include failure impact.');
req(exportReport, 'Not proven', 'Proof boundary must say what is not proven.');
req(exportReport, 'Engineer review', 'Proof boundary must say what requires engineer review.');

req(exportService, 'Section: "Backend Truth"', 'CSV export must include backend truth rows.');
req(exportService, 'Section: "Implementation Review Queue"', 'CSV export must include implementation review queue rows.');
req(exportService, 'Section: "Verification Matrix"', 'CSV export must include verification matrix rows.');
req(exportService, 'Section: "Rollback Actions"', 'CSV export must include rollback action rows.');
req(exportService, 'Section: "Diagram Truth"', 'CSV export must include diagram truth rows.');
req(exportService, 'Section: "Proof Boundary / Limitations"', 'CSV export must include proof boundary/limitations rows.');
req(exportService, 'This design is not implementation-ready.', 'CSV export must preserve blocked-design language.');

req(docs, 'Phase 40', 'Phase 40 documentation must exist.');
req(docs, 'Backend decides truth', 'Phase 40 documentation must state backend truth ownership.');
req(docs, 'This design is not implementation-ready.', 'Phase 40 documentation must include blocked wording requirement.');

console.log('Export truth hardening check passed.');
