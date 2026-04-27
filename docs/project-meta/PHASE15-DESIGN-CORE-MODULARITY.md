# Phase 15 — Design Core Modularity Hardening

This pass intentionally avoided new user-facing features. The goal was to reduce backend design-core risk.

## Changes

- Extracted design traceability construction from `backend/src/services/designCore.service.ts` into `backend/src/services/designCore/designCore.traceability.ts`.
- Extracted requirement coverage construction into `backend/src/services/designCore/designCore.requirementsCoverage.ts`.
- Added `scripts/check-design-core-modularity.cjs` to prevent these extracted seams from being collapsed back into the large service.
- Updated `scripts/verify-build.sh` to run the modularity check.
- Updated `backend/package.json` so `engine:selftest:all` now includes the design-core self-test.

## Ruthless note

The design core is still large. This pass does not magically make the architecture clean. It creates two real seams and adds a guardrail. More extraction should happen in later passes, but only around stable business logic that can be tested without breaking the allocator.
