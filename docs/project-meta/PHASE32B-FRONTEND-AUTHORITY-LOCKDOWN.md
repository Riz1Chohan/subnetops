# Phase 32B — Frontend Authority Lockdown

## Purpose

Phase 32B finishes the authority correction started in Phase 32. The frontend must not act as a second design engine. Its job is now limited to displaying, explaining, filtering, and visualizing backend design-core facts.

## What changed

- Removed the runtime browser-side planning path:
  - `frontend/src/lib/frontendPreviewDesign.ts`
  - `frontend/src/lib/designSynthesis.ts`
  - `frontend/src/lib/designSynthesis.implementation.ts`
  - `frontend/src/lib/designSynthesis.topology.ts`
- Replaced the old frontend draft preview with `backendDesignDisplayModel.ts`, which creates only an empty display shell when backend data is missing.
- Added `backendSnapshotViewModel.ts`, which maps backend design-core snapshots into UI view models without allocating, inferring, or synthesizing new network design facts in the browser.
- Updated `useAuthoritativeDesign()` so it starts from backend-only display state and overlays backend snapshot data only.
- Removed the requirements-page early design preview. Requirements collection now saves inputs only; backend design-core owns design generation after save.
- Rewrote the design-truth model file to be type-only. Browser-side route/boundary/topology builders were removed.
- Updated frontend authority banners so missing backend data is shown as unavailable instead of a frontend fallback.
- Strengthened `scripts/check-frontend-authority.cjs` so future commits fail if frontend planning modules or calls return.

## Guardrail

The allowed frontend role is:

- display backend design facts
- explain backend design facts
- filter backend design facts
- visualize backend design facts

The banned frontend role is:

- allocate subnets
- infer gateways
- infer topology
- generate route intent
- generate security policy
- generate implementation plans
- generate a fallback network design when backend is unavailable

## Validation notes

Static source checks were updated to enforce the backend-authority boundary. Full dependency install/build proof still requires running:

```bash
bash scripts/verify-build.sh
```

