# SubnetOps v98 Notes

## Main focus
v98 deepens the topology-diagram rebuild by making the visual output more explicit and easier to cross-check against the report and validation workspaces.

## What changed
- Added stronger topology-specific layout behavior in the logical diagram.
  - Single-site designs are centered.
  - Hub-and-spoke layouts now place the primary site above branch sites instead of forcing a flat row.
  - Non-hub layouts still render in a simpler left-to-right pattern.
- Added clearer per-link labels.
  - Inter-site links now surface transit subnet labels when available.
  - Internal links now surface labels such as inside / transit, server trunk, AP uplink, and related addressing hints.
- Added clearer DMZ host placement.
  - If a DMZ service exists, the diagram now shows a dedicated DMZ host visually attached to the perimeter firewall instead of only implying it in text.
- Tightened diagram/report/validation coupling.
  - Diagram workspace now includes a report cross-check panel.
  - Diagram workspace now surfaces active validation items with direct fix links.
  - Report now includes stronger diagram cross-check guidance in the diagram preview section.

## Files changed
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- frontend/src/pages/ProjectDiagramPage.tsx
- frontend/src/pages/ProjectReportPage.tsx
- V98_NOTES.md

## Remaining gaps
- Link labels are still logical hints, not full interface names from a persisted port model.
- The diagram is still synthesized from current design objects rather than a dedicated interface-level topology database.
- A future version should add per-interface naming, stronger DMZ subnet/device separation, and deeper validation-to-diagram highlighting.
