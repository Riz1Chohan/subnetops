# Phase 86 — Render Build Cleanup

Marker: `PHASE_86_RENDER_BUILD_CLEANUP`

Phase 86 is a narrow forward patch on top of Phase 85. It does not undo Phase 79–85 requirement propagation, design trust, hydration, topology, summary evidence, or policy reconciliation work.

## Why this phase exists

Render exposed two remaining build-cleanliness failures:

- Backend TypeScript still referenced `networkObjectModel.summary.networkObjectCount`, but `NetworkObjectModelSummary` does not define that property.
- Backend inferred `designReviewReadiness` as a broad string instead of the declared `DesignTruthReadiness` union.
- Frontend `ProjectRequirementsPage.tsx` was accidentally truncated, leaving a dangling JSX ternary at the project-load error state.
- The package was also missing frontend build-time files required by Vite/TypeScript: logo asset, router module, report page module, and Vite env typings.

## Fixes

- Added `countNetworkObjectModelObjects()` and reused the computed count for design evidence readiness and summary output.
- Explicitly typed `designReviewReadiness` as `DesignTruthReadiness`.
- Restored the full `ProjectRequirementsPage.tsx` from the last complete working requirements page instead of leaving the truncated Phase 84/85 file.
- Restored missing frontend source/build files from the working package baseline.
- Advanced runtime release metadata to `0.86.0` with the Phase 86 marker.
- Added `scripts/check-phase86-render-build-cleanup.cjs`.

## Proof performed

- Backend `npm run build` passed locally after dependencies were installed.
- Frontend `npm run build` passed locally after dependencies were installed.
- Phase 84, Phase 85, and Phase 86 static checks passed.

## Boundary

This phase is compile/build cleanup only. It does not add new product features and does not roll back requirement materialization or Phase 84 policy/trust work.
