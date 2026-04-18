# BUILD NOTES v367

## Diagram workspace cleanup pass

This pass reduces diagram indecision at the code-structure level by separating shared diagram workspace rules from the oversized renderer.

### What changed

- Added `frontend/src/features/diagram/diagramTypes.ts`
  - shared diagram mode/scope/overlay/focus type definitions
- Added `frontend/src/features/diagram/diagramWorkspace.ts`
  - baseline state rules
  - review presets
  - active preset detection
  - decision summary helper
  - shared page control metadata
  - focus derivation helpers
- Updated `ProjectDiagram.tsx`
  - removed embedded workspace state model helpers from the renderer file
  - imports shared workspace rules instead of defining them inline
- Updated `ProjectDiagramPage.tsx`
  - imports shared control metadata and focus derivation logic instead of duplicating them locally

### Why this matters

The diagram engine was still behaving like one oversized file that both rendered the topology and decided how the workspace should think. That made later fixes harder and encouraged drift between page controls and canvas behavior.

This pass creates a cleaner split:

- renderer file = drawing behavior
- workspace model files = decision rules / view baselines / preset logic / shared control metadata

### Outcome

The app is now closer to a proper locked diagram architecture where future passes can:

1. split logical and physical renderers further
2. centralize spacing / anchor grammar
3. reduce mixed conditional logic inside `ProjectDiagram.tsx`
4. keep page state and diagram state aligned from one source of truth
