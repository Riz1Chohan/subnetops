# Phase 32 — Frontend Authority Wiring

## Purpose

Phase 32 tightens the boundary between the backend design engine and the browser UI.

The backend design-core is the planning authority. The frontend may display, explain, filter, visualize, and export the resolved design view. It must not silently generate a competing network plan.

## What changed

- Added an explicit frontend preview boundary: `frontend/src/lib/frontendPreviewDesign.ts`.
- Added authority state and warning UI: `frontend/src/lib/designAuthority.tsx`.
- Updated `useAuthoritativeDesign()` so project workspaces receive:
  - backend design-core snapshot data when available,
  - a labeled frontend fallback when backend authority is unavailable,
  - explicit authority metadata for UI banners.
- Expanded `designCoreAdapter.ts` so backend data drives presentation fields for:
  - addressing rows,
  - routing plan rows,
  - security zones,
  - security policy matrix rows,
  - traffic-flow display rows,
  - implementation posture,
  - implementation phases,
  - cutover checklist,
  - rollback actions,
  - validation evidence plan,
  - implementation risks.
- Removed direct frontend design synthesis from the diagram page and diagram renderer.
- Updated implementation, report, diagram, routing, security, and platform/BOM surfaces to disclose backend authority or frontend fallback state.
- Added `scripts/check-frontend-authority.cjs` to prevent future direct use of `synthesizeLogicalDesign()` outside the explicit preview wrapper.

## What remains intentionally unchanged

- `designSynthesis.ts` still exists as a compatibility/draft-preview engine. It is now boxed behind `frontendPreviewDesign.ts` instead of being used directly by main project views.
- The requirements page still uses a frontend draft preview because it shows unsaved requirement edits before the backend snapshot can know about them.
- This phase does not upgrade routing math, security policy depth, or implementation sequencing logic. Those belong to later engine phases.

## Verification gates

Phase 32 adds and preserves these source gates:

```bash
bash scripts/assert-release-discipline.sh
node scripts/check-release-artifacts.cjs
node scripts/check-production-readiness.cjs
node scripts/check-relative-imports.cjs backend/src frontend/src
node scripts/check-design-authority.cjs
node scripts/check-frontend-authority.cjs
node scripts/check-design-core-modularity.cjs
node scripts/check-frontend-engine-modularity.cjs
node scripts/check-behavioral-test-matrix.cjs
node scripts/check-security-hardening.cjs
node scripts/check-product-realism.cjs
node scripts/check-final-trust-cleanup.cjs
```

`npm ci` and full frontend/backend build proof still require a live dependency install environment.

## Ruthless status

This phase removes a major architecture lie: the frontend should no longer quietly act as a second design authority for core project views. The frontend still has a compatibility preview layer, but it is explicit, labeled, and guarded by static checks.

Next phase should harden engine tests, not add UI polish.
