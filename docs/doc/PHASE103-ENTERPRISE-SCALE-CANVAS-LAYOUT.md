# Phase 103 — Enterprise Scale Canvas and Large Topology Layout

Marker: `PHASE_103_ENTERPRISE_SCALE_CANVAS_AND_LAYOUT`

Version: `0.103.0`

## Purpose

Phase 103 fixes the 10-site diagram failure where global topology views still behaved like small 3-site views. The previous renderer was technically improved, but it still tried to draw too much detail globally, which produced empty-looking site areas, cluttered branches, and WAN tunnel spaghetti.

## What changed

- Added enterprise-scale detection for 7+ site diagrams.
- Logical / Global now collapses large projects into site summary cards instead of rendering every VLAN and subnet globally.
- Logical / Per-site remains the detailed VLAN/subnet/gateway review surface.
- Physical / Global and WAN / Cloud now add a shared IPsec VPN overlay fabric rail for large projects so branch tunnels do not render as 9+ long diagonal lines into HQ.
- WAN layout now uses a bounded grid for branches instead of expanding branches endlessly to the right.
- Canvas bounds now scale with large-site summary boards and enterprise branch rows.
- Site summary cards expose site role, inferred site block, VLAN/subnet count, major segment families, and readiness posture.
- Empty or collapsed global site summaries state that detailed VLAN/subnet data belongs in Logical / Per-site.
- Overlay controls are view-specific: physical, WAN, security, and large global summary views hide IP/service layer toggles when they do not create meaningful output.
- Existing Phase 102 edge truth is preserved: `Local ISP / Internet → Security/VPN Edge → Core Gateway`.

## Non-goals

This phase does not add a new planning engine and does not change allocator math. It is a diagram scalability and presentation-truth pass only.

## Expected behavior

For a 10-site project:

- Logical / Global should look like an architecture summary board, not a giant repeated VLAN chart.
- Logical / Per-site should show the full VLAN/subnet board for the selected site.
- Physical / Global should show site containers, local ISP underlay, security edge, and core gateway only.
- WAN / Cloud should show a readable VPN fabric and local internet underlays instead of diagonal tunnel spaghetti.
- Irrelevant overlay buttons should not pretend to add detail where the current view intentionally suppresses it.
