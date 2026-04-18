# SubnetOps v366

This pass focuses on topology grammar rather than more page-level UI changes.

## Main changes
- reworked the logical global hub-and-spoke layout so branch sites attach directly to a clean shared bus instead of visually hanging from upper branch sites
- improved the physical global routing geometry by removing the lower artificial branch bus and replacing it with cleaner side-spine distribution from the primary site
- widened branch site cards in the live canvas for better internal breathing room
- enlarged the primary site card and increased internal spacing between routing, switching, services, access, and wireless roles
- kept the left pane and top toolbar model intact while tightening the actual line routing and site composition

## Files changed
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- project-meta/BUILD-NOTES-v366.md
- frontend/dist (rebuilt production bundle)

## Validation
- npm ci --ignore-scripts --include=dev
- npm run build
