# SubnetOps v359

This pass fixes the broken diagram workspace behavior that appeared in v358.

## Fixes
- kept the left pane as the primary control surface
- kept the top canvas toolbar row
- forced externally controlled diagram pages into the minimal canvas path so the large review/narrative workspace no longer appears above the diagram
- removed stale duplicate `.js` source files from `frontend/src` that were shadowing newer `.ts` / `.tsx` files during the frontend build
- fixed a React hook-order issue in `ProjectDiagramPage.tsx` that could trigger the repeated reload / minified React #310 error
- rebuilt the frontend `dist` bundle from the corrected TypeScript/TSX source

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- removed stale duplicate JS source files under `frontend/src`
- refreshed `frontend/dist/*`
- `project-meta/BUILD-NOTES-v359.md`

## Validation
- TypeScript check passed
- frontend production build passed
