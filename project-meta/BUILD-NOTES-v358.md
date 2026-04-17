# SubnetOps v358

This pass fixes the diagram workspace cleanup after the previous pass went in the wrong direction.

## What was fixed
- kept the left pane structure intact
- kept the top canvas toolbar row intact
- removed the dependency on the component's larger review workspace when the diagram page is in canvas mode
- forced the live diagram page into the true minimal canvas render path whenever canvas mode is active
- linked left-pane scope/layer actions more directly to diagram focus behavior so turning layers on now also shifts the diagram emphasis instead of only changing the button state

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/dist/*`
- `project-meta/BUILD-NOTES-v358.md`

## Validation
- frontend TypeScript build passed
- Vite production build passed
