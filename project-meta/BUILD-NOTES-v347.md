# SubnetOps v347

This pass pushes the main diagram canvas further toward a real blueprint surface and keeps the page centered on the live canvas rather than secondary summary furniture.

## Changes
- made the live diagram toolbar sticky within the canvas stage
- allowed the canvas outline dock to be shown or hidden from the toolbar
- tightened the page copy so the canvas appears even more diagram-first
- strengthened the physical SVG with:
  - explicit internet exchange and perimeter control containers
  - a primary hub backbone zone
  - full-width branch corridor containers by row
  - branch transport-spine capsules with WAN label, VLAN count, and service count
  - richer primary-site metrics in the hub header
  - branch numbering markers and header metrics inside each site card

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/src/styles.css`
- `project-meta/BUILD-NOTES-v347.md`
