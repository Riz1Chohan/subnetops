# SubnetOps v357

This pass focuses on making the diagram workspace diagram-first and removing the extra top clutter.

## Changes
- removed the extra diagram header block above the live canvas
- removed the top preset strip above the diagram
- kept the top canvas toolbar row only
- reduced the left pane to the main controls users actually need first:
  - View
  - Scope
  - Layers
- kept deeper controls inside the collapsed Advanced controls section
- made the live canvas use a bare canvas mode so the left pane drives the diagram state instead of duplicate controls above the diagram
- stripped most explanatory chrome from the generated diagram canvas in bare mode so the page emphasizes the actual topology drawing

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/dist/*`
- `project-meta/BUILD-NOTES-v357.md`

## Validation
- `node node_modules/typescript/bin/tsc -p ./tsconfig.json` passed
- `node node_modules/vite/bin/vite.js build` completed successfully
