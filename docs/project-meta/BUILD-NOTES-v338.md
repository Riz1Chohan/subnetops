# SubnetOps v338 build notes

## Purpose
Produce a deployment-safe package after the Render frontend TypeScript failure reported against `ProjectLayout.tsx`.

## Fix applied
- `frontend/src/layouts/ProjectLayout.tsx`
  - Centralized action severity handling into helper functions.
  - Replaced inline action-center severity class branching with `actionSeverityClass(...)`.
  - Replaced blocker counting logic with `isBlockingActionSeverity(...)` so the allowed severity states stay explicit and type-safe.

## Reason
Render reported TS2367 for an impossible severity comparison in `ProjectLayout.tsx`. This pass hardens the severity logic so the layout only works with the supported values:
- `primary`
- `warning`
- `secondary`

This is intended as a clean deployment-fix package.
