# Phase 36E Frontend Build Correction

This correction closes the Render frontend TypeScript failures observed after the Phase 36E backend deployment.

## Fixed

- Added a compatibility `frontend/src/lib/designSynthesis.ts` facade so stale repository copies cannot keep compiling an old browser-side synthesis engine.
- Added a safe `buildUnifiedDesignTruthModel` compatibility export that returns an empty backend-only truth model instead of generating frontend truth.
- Added `planner-preview` to the weak authority-source union so older display data can compile while still being treated as non-authoritative.
- Fixed optional `networkObjectModel` access in project security and validation pages.

## Authority posture

These fixes do not reintroduce frontend planning authority. The compatibility code deliberately returns backend-unavailable display shells and does not synthesize addressing, routing, security, topology, implementation, or report truth.

## Required GitHub hygiene

If this package is copied into an existing repository, remove stale files that are not present in the package. The previous Render failure indicates the repository likely kept an old `frontend/src/lib/designSynthesis.ts` from an older phase.
