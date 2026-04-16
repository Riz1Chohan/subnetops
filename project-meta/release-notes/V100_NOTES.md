# SubnetOps v100 Notes

## Focus of v100
This version tightens diagram and report fidelity rather than adding another broad feature layer.

## What changed
- improved interface naming realism in `designSynthesis.ts` based on topology type
- added device-level validation cues on the diagram for edge and switching roles
- added explicit zone labels on site perimeter/core segments in the diagram
- aligned diagram/report wording so section references and names match more closely
- report now shows boundary attachment details and flow control points more explicitly

## Main files changed
- `frontend/src/lib/designSynthesis.ts`
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/src/pages/ProjectReportPage.tsx`

## Remaining gaps
- validation is still inferred to device roles rather than mapped to exact links/interfaces
- diagram still needs deeper interface-by-interface rendering for every topology
- report section numbering should be fully normalized across the whole page in a later cleanup pass
