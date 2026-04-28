# Phase 22 — Backend Authority Enforcement

Phase 22 moves the main project workspace surfaces behind one shared frontend authority hook.

## What changed

- Added `useAuthoritativeDesign` in `frontend/src/features/designCore/hooks.ts`.
- The hook still builds a browser-side preview first, but immediately overlays the backend design-core snapshot through `applyDesignCoreSnapshotToSynthesis`.
- Main project surfaces now consume the shared hook instead of calling `synthesizeLogicalDesign` directly:
  - Project shell/header
  - Overview
  - Discovery
  - Addressing
  - Core model
  - Implementation
  - Routing
  - Security
  - Standards
  - Validation
  - Report
- Strengthened `scripts/check-design-authority.cjs` so these surfaces fail verification if they bypass the shared authority hook.

## Why this matters

This does not delete the legacy frontend synthesis engine yet. That is Phase 3. It does, however, stop the major user-facing design pages from presenting frontend-only allocation as if it were authoritative. The backend design core is now the normal authority overlay path for the main workspace.

## Remaining debt

- The diagram workspace still has specialized seed/fallback synthesis logic and should be converted carefully in the diagram pass.
- The platform/BOM page still leans on platform-specific synthesis and should be reconciled after the shared design model is split.
- `frontend/src/lib/designSynthesis.ts` is still too large and remains the main Phase 3 cleanup target.
