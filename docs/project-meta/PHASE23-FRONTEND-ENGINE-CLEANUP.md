# Phase 23 — Frontend Engine Cleanup

Phase 23 reduces the biggest frontend architecture smell without trying to rewrite the application in one dangerous pass.

## What changed

- Split public synthesis contracts out of `frontend/src/lib/designSynthesis.ts` into `frontend/src/lib/designSynthesis.types.ts`.
- Split implementation/cutover/validation planning helpers into `frontend/src/lib/designSynthesis.implementation.ts`.
- Split topology, placement, boundary, traffic-flow, and flow-coverage helpers into `frontend/src/lib/designSynthesis.topology.ts`.
- Kept `synthesizeLogicalDesign(...)` as the compatibility entry point so existing pages and the Phase 22 backend-authority overlay keep working.
- Updated type-only frontend consumers to import contracts from `designSynthesis.types.ts` instead of pulling the main synthesis orchestrator into their module graph.
- Added `scripts/check-frontend-engine-modularity.cjs` so the main synthesis file cannot silently grow back into the same monster.
- Added the modularity check to `scripts/verify-build.sh`.

## Why this matters

Before this phase, `designSynthesis.ts` mixed public contracts, implementation planning, topology placement, traffic-flow modelling, security/routing helpers, and the final orchestration function in one very large file. That made it too easy for the browser-side preview engine to become an unreviewable second source of truth.

Phase 23 does not remove frontend synthesis. It makes the remaining frontend synthesis easier to police while preserving the backend-authority direction from Phase 22.

## Still not done

- The frontend synthesis layer is still larger than it should be.
- Routing/security/addressing helper groups should eventually be split into their own focused modules.
- The backend design core still needs stronger ownership over final allocator and policy outputs.
- Full clean `npm ci` + backend/frontend build verification is still the real deployment gate.
