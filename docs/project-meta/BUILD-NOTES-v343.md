# SubnetOps v343

## This pass adds
- removed the architecture snapshot preview from the diagram page
- made the live diagram canvas the single primary diagram surface
- added a compact canvas-primary context strip above the workspace shortcuts
- added passive context pills directly in the canvas toolbar
- updated the physical canvas title to read more like a network blueprint

## Files changed
- frontend/src/pages/ProjectDiagramPage.tsx
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- frontend/src/styles.css

## Notes
- This pass intentionally removes the duplicate snapshot/preview experience so the page focuses on the actual diagram canvas.
- The next pass should continue deeper realism inside the main rendered topology itself.
