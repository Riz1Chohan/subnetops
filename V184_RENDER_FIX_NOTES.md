Render repair package

This package is a repair pass for the Render build errors captured in the attached log.

Main fixes applied:
- fixed undefined diagramMode reference in ProjectDiagram.tsx by wiring the active mode into LogicalTopologyDiagram
- removed/normalized invalid topology comparisons and fallback property access in ProjectDiagram.tsx and ProjectDiagramPage.tsx
- repaired traceability variable usage in designSynthesis.ts
- added safe optional compatibility fields and alias model properties in designSynthesis.ts for later diagram/review helper layers
- fixed routePlan / routingPlan mismatch in diagramGovernancePack.ts
- fixed WAN endpoint interface fallback in diagramObjectModel.ts
- rewrote diagramScenarioPack.ts to use the actual synthesized design model instead of non-existent fields
- fixed addressing semantic label fallback in diagramSemanticsPack.ts

Note:
- This repair pass is targeted at the TypeScript compile errors shown in the attached Render log.
- Full dependency install/build verification was not completed in this environment because local npm auth/config blocked a clean install, but the specific reported compile errors were addressed directly in source.
