# SubnetOps v351

This pass shifts the frontend deployment path to a prebuilt static deployment model for Render while also fixing a TypeScript regression in the diagram page.

## Why
Recent Render failures were occurring during Render's automatic frontend npm dependency installation step, before the frontend build command even began. The frontend dependency manifest itself did not change between v342 and later passes, so this pass changes the frontend deployment strategy instead of continuing to rely on Render's automatic npm install phase.

## Changes
- fixed missing `focusGlobalCanvas` and `focusSiteCanvas` handlers in `frontend/src/pages/ProjectDiagramPage.tsx`
- changed the frontend Render static-site build command to a no-op validation that uses committed `frontend/dist`
- added `SKIP_INSTALL_DEPS=true` to the frontend Render service so Render skips automatic npm dependency installation for that static site
- prepared the package to include a prebuilt `frontend/dist`

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `render.yaml`
- `frontend/dist/**`
- `project-meta/BUILD-NOTES-v351.md`

## Validation target
- local frontend TypeScript + Vite build attempted from the packaged source using matching frontend dependencies
- package intended to avoid frontend npm installation during Render deploys
