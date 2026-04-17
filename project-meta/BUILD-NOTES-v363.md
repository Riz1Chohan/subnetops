# SubnetOps v363

This pass focuses on topology composition and spacing inside the live diagram canvas.

## Main changes
- widened branch site cards in the bare live-canvas path
- enlarged the primary site card and rebalanced its internal grid
- moved branch devices into cleaner lanes so icons do not crowd each other
- pushed wireless/AP placement into a lower lane inside branch cards
- increased spacing between primary-site devices: routing, switching, shared services, access, wireless
- anchored inter-site links to site/card edges instead of visually cutting through device groups
- reduced always-on device labels in the bare canvas so annotation-off is quieter
- kept the left pane and top toolbar behavior intact

## Files changed
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/dist/*`
- `project-meta/BUILD-NOTES-v363.md`

## Validation
- `npm run build` completed successfully
