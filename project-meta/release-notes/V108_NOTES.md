# SubnetOps v108 — Design Engine Foundation

This package continues the recovery roadmap by formalizing the generated design-engine layer around explicit synthesized objects rather than generic report text.

## What was added

- Added a new `designEngineFoundation` object to the synthesized logical design model in `frontend/src/lib/designSynthesis.ts`.
- Added a new `DesignEngineFoundation` interface with:
  - stage label
  - summary
  - object counts
  - strongest current layer
  - next priority
  - coverage status entries
- Updated design synthesis messaging from older `v93` wording to `v108` wording.
- Surfaced the v108 design-engine foundation block in:
  - `frontend/src/pages/ProjectOverviewPage.tsx`
  - `frontend/src/pages/ProjectAddressingPage.tsx`
  - `frontend/src/pages/ProjectReportPage.tsx`

## Purpose of this version

v108 is meant to make the app visibly behave more like a requirements-to-logical-design engine by exposing the internal synthesized objects and their current coverage.

## Files changed

- `frontend/src/lib/designSynthesis.ts`
- `frontend/src/pages/ProjectOverviewPage.tsx`
- `frontend/src/pages/ProjectAddressingPage.tsx`
- `frontend/src/pages/ProjectReportPage.tsx`
- `V108_NOTES.md`

## Build note

A full frontend dependency install/build could not be completed in this container because npm package installation was blocked by environment/package-auth issues, so this package is provided as source-updated v108 code for your repo and deployment workflow.
