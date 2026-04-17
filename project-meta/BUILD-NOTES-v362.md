# SubnetOps v362

This pass combines the next four diagram cleanup goals into one release:

## Combined cleanup work
- quieter default diagram state
- simpler site blocks for primary and branch sites
- stronger visual hierarchy by reducing annotation noise around the topology
- better framing and spacing for the live canvas

## Diagram changes
- removed most always-on overlay text from the live bare-canvas diagram path
- suppressed link labels in bare canvas unless full link notes are explicitly enabled
- reduced branch-site metadata shown by default
- removed row/attached-site chips from the default live topology canvas
- limited service and security detail to the cases where the user actually turns those on
- toned down inter-site links in normal global review so they no longer dominate the drawing
- reduced passive context chips in the top toolbar

## Files changed
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/dist/*`
- `project-meta/BUILD-NOTES-v362.md`

## Validation
- TypeScript compile passed
- frontend production build completed successfully
