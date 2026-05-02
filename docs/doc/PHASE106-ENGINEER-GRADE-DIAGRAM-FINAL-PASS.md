# Phase 106 — Engineer-Grade Diagram Final Pass

Marker: `PHASE_106_ENGINEER_GRADE_DIAGRAM_FINAL_PASS`

Phase 106 is the one-pass cleanup after the Phase 105 screenshots showed the diagram was close but still not presentation-grade.

## Problems fixed

- WAN / Cloud still had repeated tiny tunnel labels on every branch stub.
- Branch ISP badges were shifted left and visually leaked outside branch site cards.
- Enterprise site cards were too tall and made the canvas feel like a scroll wall.
- Physical / Global still risked showing a disconnected HQ core gateway when the edge-to-core handoff was not discovered through strict site matching.
- Enterprise canvas bounds were too loose and produced excess dead space.
- Physical / Global legend still mentioned VPN overlay even though that view must not own overlay fabric.

## Changes

- Branch cards now center their local ISP underlay and gateway/edge stack.
- WAN / Cloud now suppresses repeated branch tunnel labels; the shared fabric rail carries the WAN meaning.
- Physical / Global keeps only local ISP underlay and internal site handoff meaning.
- HQ edge-to-core handoff uses a stronger fallback finder so the core gateway does not sit as disconnected decoration.
- Enterprise branch grids use compact 5-column / 2-row composition for 10-site projects.
- Canvas bounds are tighter for enterprise physical, WAN, and global logical summary boards.
- Site card and guide dimensions were reduced so the diagram reads as an engineered overview, not a crowded graph output.

## Intended result

For a 10-site project:

- WAN / Cloud should read as a clean hub-and-spoke overlay fabric.
- Physical / Global should read as a clean site/equipment estate overview.
- Logical / Global should remain a compact site summary board.
- Logical / Per-site should remain the detailed VLAN/subnet engineering board.

This phase does not add engines or new product scope. It fixes the diagram renderer.
