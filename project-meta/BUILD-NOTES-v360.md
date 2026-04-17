# SubnetOps v360

This pass applies the diagram cleanup spec directly to the live canvas path.

## What changed
- kept the left pane intact
- kept the top canvas toolbar row
- made the live canvas default quieter with essential labels and minimal link notes
- strengthened the left-pane-to-canvas wiring so view/scope/layer changes drive the actual diagram state
- reduced on-canvas clutter in bare canvas mode by hiding narrative and validation-heavy text unless the related overlay is active
- rebuilt the prebuilt frontend dist bundle for the current deployment model

## Files changed
- frontend/src/pages/ProjectDiagramPage.tsx
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- frontend/dist/*
- project-meta/DIAGRAM-CLEANUP-SPEC-v360.md
- project-meta/BUILD-NOTES-v360.md
