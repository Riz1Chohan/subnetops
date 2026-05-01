# Phase 91 — Diagram Visual Regression Patch

Runtime marker: `PHASE_91_DIAGRAM_VISUAL_REGRESSION_PATCH`

Phase 91 fixes the visual regression introduced by the professional topology layout pass.

## Fixed

- Restores the bright, paper-like canvas surface.
- Restores faint graph-paper grid lines instead of a washed-out/hazy overlay.
- Reuses the existing SubnetOps professional device icon family for topology nodes.
- Removes the generic rectangle/square fallback for network devices in the authoritative topology canvas.
- Adds automatic icon scaling so dense or large-company topology views use smaller symbols.
- Makes the topology SVG truly scrollable by preventing CSS from shrinking it to the viewport width.
- Calculates dynamic canvas bounds so the drawing surface expands as topology objects grow.
- Uses explicit SVG colors for labels, links, and status strokes so dark mode does not create white-on-white unreadable diagrams.

## Boundary

No Cisco-owned icon files or vendor trademark artwork are embedded. The app uses recreated, vendor-neutral network-diagram symbols to avoid licensing risk while preserving a professional infrastructure look.
