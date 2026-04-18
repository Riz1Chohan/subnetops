# SubnetOps v365

This pass focuses on topology routing and mode separation.

## Main changes
- logical hub-and-spoke layout now uses a more balanced branch grid, especially for 4-branch cases
- logical mode branch links now follow a cleaner bus-and-drop structure instead of looser direct drops
- physical mode branch routing now uses a central distribution bus with left and right vertical spines
- physical inter-site links now enter branch cards from cleaner side anchors instead of long diagonal slashes from the primary site
- removed the older per-branch direct inter-site routing in physical view so the new bus/spine routing is the only active path

## Files changed
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/dist/*`
- `project-meta/BUILD-NOTES-v365.md`

## Validation
- `npm ci --ignore-scripts --include=dev`
- `npm run build`
