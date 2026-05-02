# Phase 107 — Diagram Layout Contract Rewrite

Marker: `PHASE_107_DIAGRAM_LAYOUT_CONTRACT_REWRITE`

Phase 107 stops treating the topology renderer as one generic graph with minor spacing patches. The screenshots after Phase 106 showed the same root problem repeatedly: Physical Global, WAN / Cloud, Logical Global, and Logical Per-site were still sharing too much layout behavior, so a fix in one view could create overlap or wasted canvas in another.

## Scope

Phase 107 is a diagram-rendering pass only. It does not change network-design calculations, allocation logic, saved project data, requirements materialization, or security-policy evidence.

## What changed

- Added a hard layout marker: `PHASE_107_DIAGRAM_LAYOUT_CONTRACT_REWRITE`.
- Root package version is now `0.107.0`.
- Added dedicated Phase 107 geometry helpers for enterprise branch grids, branch card placement, summary-board columns, and site-card metrics.
- Physical / Global now uses its own equipment-estate contract:
  - no VPN fabric furniture;
  - no cross-site tunnel overlay;
  - HQ internet, firewall/security edge, and core gateway stay visually connected;
  - branch local ISP and branch gateway sit inside their cards instead of bleeding through card borders.
- WAN / Cloud now uses a separate overlay-fabric contract:
  - HQ is centered above the fabric;
  - fabric rail is centered on the branch grid instead of the entire SVG stage;
  - branch VPN drops terminate on the branch WAN/security edge;
  - branch ISP underlay is offset away from the VPN drop so labels do not collide.
- Logical / Global remains a summary board, but 10-site projects now use a tighter five-column summary layout instead of leaving a third row and more dead space.
- Logical / Per-site now uses a distribution-to-segment contract:
  - raw site-to-VLAN family-tree edges are suppressed;
  - core/distribution attaches to VLAN segments through generated presentation edges;
  - subnets sit directly under their VLANs;
  - site membership evidence remains available, but it no longer dominates the drawing.
- Canvas bounds were tightened so large diagrams are based more on rendered content than old oversized minimum boards.

## Acceptance targets

Phase 107 is intended to fix the exact Phase 106 screenshot failures:

1. Branch gateway icons must not sit on or below card borders.
2. Branch gateway labels must not collide with the branch role tag.
3. WAN VPN drops must not run through local ISP labels.
4. Physical / Global must not show VPN fabric or tunnel overlay furniture.
5. WAN / Cloud must own the VPN overlay fabric view.
6. Logical / Global must remain summary-only.
7. Logical / Per-site must no longer look like a site-to-VLAN family tree.
8. The SVG canvas should reduce unnecessary right-side dead space.

## Proof limits

Static release checks prove the Phase 107 layout contract is present in source and that previous release discipline is preserved. The final visual proof still comes from deploying to Render and inspecting the actual browser screenshots, because static checks cannot guarantee visual polish.
