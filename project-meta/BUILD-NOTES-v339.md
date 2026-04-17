# BUILD NOTES — v339

This pass fixes the Render-reported TypeScript blockers in the diagram component.

## Files changed
- frontend/src/features/diagram/components/ProjectDiagram.tsx

## Fixes
- Added a local `ChipTone` type alias used by `DiagramCanvasBackdrop`.
- Removed an impossible `"none"` comparison from `normalizeActiveOverlays()` because `ActiveOverlayMode` already excludes `"none"`.

## Purpose
Unblock frontend TypeScript build failure reported by Render for:
- TS2304 Cannot find name `ChipTone`
- TS2367 impossible comparison between `ActiveOverlayMode` and `"none"`
