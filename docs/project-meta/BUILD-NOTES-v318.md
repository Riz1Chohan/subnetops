SubnetOps v318 build notes

This pass focuses on the diagram workspace controls.

Changes
- Diagram overlay controls are now independent toggles instead of acting like a radio group.
- Users can keep multiple diagram information layers on at the same time and remove them individually.
- Active diagram control styling now uses a softer transparent green state instead of a solid dark green pill.
- The main diagram keeps devices and traffic lines as the baseline view, with extra information added or removed from the left pane.

Files changed
- frontend/src/pages/ProjectDiagramPage.tsx
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- frontend/src/styles.css
