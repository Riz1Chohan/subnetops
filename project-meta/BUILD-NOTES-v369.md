# BUILD NOTES v369

## Diagram cleanup pass

This pass moves the duplicated renderer helper grammar out of the split logical/physical components and into a shared module:

- Added `frontend/src/features/diagram/components/diagramRendererShared.tsx`
- Moved shared diagram helper functions, SVG primitives, focus helpers, overlay helpers, validation helpers, and orthogonal routing helpers into that shared module
- Updated `LogicalTopologyDiagram.tsx` to import from the shared renderer module
- Updated `PhysicalTopologyDiagram.tsx` to import from the shared renderer module

## Intent

This reduces the risk of logical and physical renderers drifting apart in helper behavior while still allowing their main layout bodies to evolve independently.

## Remaining next step

The next cleanup pass should extract explicit layout constants / grammar objects per mode so logical and physical spacing systems become centrally defined rather than remaining inline inside each renderer body.
