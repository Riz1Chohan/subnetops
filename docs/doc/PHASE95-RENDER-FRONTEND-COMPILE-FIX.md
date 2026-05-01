# Phase 95 — Render Frontend Compile Fix

Marker: `PHASE_95_RENDER_FRONTEND_COMPILE_FIX`

Phase 95 is a narrow deploy recovery patch after the Phase 94 frontend build failed on Render.

## Fixes

- Removed the duplicate closing return statement in `ProjectDiagramPage.tsx` that broke TSX parsing after the Phase 94 truth-panel move.
- Lifted the requirements load error ternary out of JSX in `ProjectRequirementsPage.tsx` so the Render TypeScript parser sees a simple stable prop expression.
- Added an esbuild syntax parse guard for both files when frontend dependencies are installed.
- Kept Phase 94 stale-layout cleanup behavior intact: the canvas still renders before truth/readiness details, and the old legacy diagram fallback remains disabled.

## Boundaries

This phase does not add diagram features. It exists to recover the Render frontend compile path while preserving Phase 94 behavior.
