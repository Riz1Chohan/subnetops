# SubnetOps v364

This pass focuses on topology line routing and view separation.

## Main fixes
- replaced the most visible diagonal inter-site links with orthogonal routed paths
- improved primary-to-branch link anchoring in the physical topology view
- changed logical topology to a more abstract site-block composition instead of tiny physical-device cards
- increased primary-site device spacing in the physical view
- changed branch wireless links to orthogonal access paths instead of diagonal overlaps

## Files changed
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/dist/*`
- `project-meta/BUILD-NOTES-v364.md`

## Validation
- `npm ci --ignore-scripts --include=dev`
- `npm run build`
