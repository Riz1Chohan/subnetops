# SubnetOps v361

This pass locks the diagram workspace to a simpler control model.

## Left pane
- kept View
- kept Scope
- kept Annotations
- moved optional layers into a collapsed `More layers` section
- removed visible controls for Zones, Redundancy, and Traffic emphasis
- removed focus preset clutter from the left pane

## Diagram area
- kept only the top canvas toolbar row above the diagram
- removed the extra page-level diagram narration and support chrome from the canvas path
- kept the diagram canvas as the main visible surface

## Wiring
- linked left-pane View, Scope, Annotations, and More layers directly to the rendered diagram state
- Boundaries scope now drives the security/boundary reading without needing a separate visible layer toggle
- WAN / Cloud scope now drives transport emphasis without separate preset buttons

## Diagram noise reduction
- reduced overlay note chips in bare canvas mode so the diagram is quieter by default
- label detail and link-note detail are now controlled by the left-pane annotation toggles instead of being forced by unrelated overlay logic

## Files changed
- frontend/src/pages/ProjectDiagramPage.tsx
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- frontend/dist/*
- project-meta/BUILD-NOTES-v361.md
