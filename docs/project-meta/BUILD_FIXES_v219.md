# v219 build fix

Fixed the frontend TypeScript build failure reported by Render.

## Root cause
`src/lib/designSynthesis.ts` inferred the initial `lowLevelDesign` array too narrowly from `buildLowLevelDesign()`. The later truth-enrichment pass returned `LowLevelSiteDesign[]`, which includes an optional `siteCode`, causing a type mismatch during assignment.

## Fix
- Added explicit `LowLevelSiteDesign[]` return types to:
  - `buildLowLevelDesign(...)`
  - `enrichLowLevelDesignWithTruth(...)`
- Added explicit `LowLevelSiteDesign[]` annotation to the `lowLevelDesign` variable before reassignment.

## Validation
- Direct TypeScript compile check passed for `src/lib/designSynthesis.ts`.
- This package is intended to address the specific Render build failure shown in the deployment log.
