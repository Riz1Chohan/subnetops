# Phase 105 — Engineer-Grade WAN Topology Cleanup

Marker: `PHASE_105_ENGINEER_GRADE_WAN_TOPOLOGY`

Phase 105 is a ruthless cleanup of the remaining 10-site diagram failure exposed after Phase 104.

## What was still wrong

Phase 104 reduced some WAN clutter, but the screenshots still proved the renderer was not strict enough:

- Physical / Global could still show cross-site relationship clutter through raw model edges.
- WAN / Cloud still looked too busy because the enterprise branch grid was too tall and site containers were generated from member bounds instead of fixed topology cards.
- Logical / Global summary was usable, but the full topology surface still carried too much old graph-layout behavior.
- The security matrix still repeated weak execution-evidence text in every source row.

## Fixes

- Physical and WAN canvases now discard raw backend relationship edges and rebuild only deterministic presentation edges.
- Security policy evidence stays in the Security / Boundaries matrix, not in the physical/WAN topology drawing.
- Physical / Global is now a site/equipment estate view only: local Internet/ISP underlay and inside edge/core devices, with no VPN fabric and no cross-site tunnels.
- WAN / Cloud is now the only enterprise overlay view: one shared VPN fabric rail and vertical branch stubs.
- Enterprise site containers use fixed cards, avoiding the overlapping dynamic container problem.
- Ten-site branch layout uses a compact 5-column enterprise grid instead of a 3-column scroll wall.
- Security matrix source rows stop repeating low-value “Needs implementation evidence” noise unless a row is truly blocked.

## Intended result

For a 10-site project:

- Physical / Global should look like a clean site/equipment estate overview.
- WAN / Cloud should look like a hub-and-spoke overlay summary, not tunnel spaghetti.
- Logical / Global should remain a site summary board.
- Logical / Per-site should remain the detailed VLAN/subnet board.

This phase does not add new engines. It fixes diagram truth, scale, and professional readability.
