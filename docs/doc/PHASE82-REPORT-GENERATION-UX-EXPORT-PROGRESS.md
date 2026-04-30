# Phase 82 — Report Generation UX and Export Progress

Phase 82 fixes the product-trust bug where a large professional report could take several minutes to generate while the frontend appeared idle.

## Problem

The Phase 81 report now contains real generated evidence: materialized sites, addressing rows, validation posture, security policy sections, diagram truth, implementation review data, and detailed appendices. Large reports can legitimately take minutes to compose, but the UI gave weak feedback during export.

That made a working request look broken.

## Changes

- Added a visible report-processing modal for PDF, DOCX, and CSV export actions.
- Disabled export buttons while one export request is active.
- Added elapsed-time display so users can tell the request is still alive.
- Added staged processing copy: addressing schedule, validation summary, diagram evidence, implementation appendix, and finalization.
- Added long-running expectation text: large multi-site designs can take 1–4 minutes.
- Added clear duplicate-click prevention messaging.
- Added success timing copy after the file is returned.
- Added a failure message if the backend does not return a downloadable file.
- Updated backend health marker to `PHASE_82_REPORT_GENERATION_UX_EXPORT_PROGRESS`.

## Non-goals

- This phase does not pretend the export is instant.
- This phase does not hide remaining implementation-readiness issues.
- This phase does not replace backend report composition with a fake client-side download.

## Acceptance

When a user clicks export, the interface must immediately show that report generation is running and must prevent duplicate export clicks until the current request finishes.
