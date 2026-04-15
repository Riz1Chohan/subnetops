# SubnetOps v95

## Focus of this version
- Rebuilt the report page around explicit design facts instead of generic commentary.
- Added independent scrolling to the left project workspace sidebar so users can control that area without having to scroll the main content all the way down first.

## Main changes

### Report rebuild
The report is now organized into clearer engineering sections:
1. Design assumptions and constraints
2. Topology and site placement
3. Addressing hierarchy
4. Service placement and security boundary design
5. Routing and traffic-flow design
6. Site-by-site low-level design
7. Validation findings
8. Implementation and cutover
9. Open issues and review items
10. Diagram preview

This pulls much more directly from the synthesized design objects already added in v93/v94.

### Sidebar scrolling
The left project workspace sidebar now has its own vertical scrollbar with sticky positioning and a bounded height, so the user can scroll that area independently from the right-hand content pane.

## Files updated
- `frontend/src/pages/ProjectReportPage.tsx`
- `frontend/src/styles.css`

## Remaining gap
The diagram engine is still not yet the real Packet Tracer / Visio-style topology engine described in the recovery roadmap. That remains a later version.
