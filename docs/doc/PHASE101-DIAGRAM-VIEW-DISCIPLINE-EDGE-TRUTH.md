# Phase 101 — Diagram View Discipline and Edge Truth

Marker: `PHASE_101_DIAGRAM_VIEW_DISCIPLINE_EDGE_TRUTH`

Phase 101 is a diagram trust pass. It does not add another engine. It tightens the existing professional renderer so the views stop leaking the wrong type of evidence into the wrong canvas.

## Fixes

- Physical views are now equipment/path views only. VLAN, subnet, and DHCP planning rows stay out of Physical / Global and Physical / Per-site.
- Logical views remain the place for VLAN/subnet cards and segmentation detail.
- Local Internet/ISP underlay is rendered as its own transport handoff, not as a VPN tunnel.
- VPN overlay tunnels are classified from structured relationship/label text first so generic notes cannot accidentally make every line dashed blue.
- VPN tunnels prefer the site firewall/security edge when present, then fall back to gateway/router if no firewall exists.
- Firewall-to-core handoff is rendered explicitly so the firewall no longer looks like a disconnected decoration.
- Site containers are visually stronger and titled like engineering site blocks.
- Topology legend is limited to Physical/WAN canvases and no longer pollutes logical views.
- Security matrix rows now include compact action badges (`ALLOW`, `REVIEW`, `DENY`) and reduce repeated implementation-blocked noise.

## Verification boundary

Static gates prove that the source contains the Phase 101 controls, release markers, and artifact discipline. Render deployment and live screenshots remain the proof that the browser is running the latest bundle and that no stale cached layout is being shown.
