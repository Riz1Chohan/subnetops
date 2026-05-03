# Phase 15 — Report/export truth

Phase 15 makes the reporting layer a deliverable truth gate, not a cosmetic export pass.

## What changed

- Added `designCore.phase15ReportExportTruthControl` as the backend authority for report/export readiness.
- Added `phase15ReportExportTruth` to the design-core snapshot.
- Added required report section gates for executive summary, readiness, requirement traceability, addressing, Enterprise IPAM, object model, routing, security, implementation, validation, diagram truth, assumptions/limitations, review items, and appendices.
- Added a real requirement traceability matrix with requirement, design consequence, affected engines, frontend location, report section, diagram impact, readiness, missing consumers, and source object IDs.
- Added truth-label rows for `USER_PROVIDED`, `REQUIREMENT_MATERIALIZED`, `BACKEND_COMPUTED`, `ENGINE2_DURABLE`, `INFERRED`, `ESTIMATED`, `REVIEW_REQUIRED`, `BLOCKED`, and `UNSUPPORTED`.
- Added Phase 15 validation findings so blocked/report-review export truth remains visible in readiness checks.
- Added Phase 15 rows to CSV export and visible report/PDF/DOCX report sections.
- Added a Project Report page Phase 15 panel showing section gates, requirement traceability, truth labels, and findings.

## Contract

Requirement input → normalized requirement signal → materialized source object or explicit review/no-op reason → backend design-core input → engine-specific computation → traceability evidence → validation/readiness impact → frontend display → report/export impact → diagram impact where relevant → test/golden scenario proof.

## Boundary

Phase 15 does not prove live device state, cabling, vendor syntax, provider WAN behavior, production firewall rulebase truth, or change-window success. It only proves the exported deliverables are honest about what backend design-core can and cannot prove.

## Proof commands

```bash
npm run check:phase15-report-export-truth
cd backend && npm run engine:selftest:phase15-report-export-truth
```
