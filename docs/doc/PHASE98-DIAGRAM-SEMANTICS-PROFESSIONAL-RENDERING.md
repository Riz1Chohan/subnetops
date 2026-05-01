# Phase 98 — Diagram Semantics and Professional Rendering

Marker: `PHASE_98_DIAGRAM_SEMANTICS_PROFESSIONAL_RENDERING`
Version: `0.98.0`

Phase 98 is a stronger diagram-correction pass, not a tiny cosmetic patch.

## Problems addressed

The Phase 97 deployment rendered successfully, but the diagrams still behaved too much like graph output:

- physical per-site diagrams could leave the core gateway visually orphaned;
- physical and WAN views looked too similar;
- the security view was improved but still used tiny policy diamonds and line spaghetti;
- user-facing badges still exposed debug-style wording such as hidden proof objects;
- DHCP/service evidence could look attached to the WAN path instead of local site services;
- canvas minimum bounds still allowed too much dead white space.

## Strong pass changes

- Added professional presentation connectors for WAN edge, branch edge, site edge, site core, and firewall-to-core handoff when the authoritative model lacks a clean visual connector.
- Ordered per-site devices by role so firewall/perimeter devices and core gateways are placed intentionally instead of random row order.
- Rebuilt per-site physical placement around a real site path: site context, WAN edge, firewall, core gateway, then local VLAN/subnet/service detail below.
- Reworked WAN/global physical placement so branch edge devices sit under their branch site labels and HQ firewall/gateway placement is predictable.
- Converted Security / Boundaries from a graph-style SVG into a readable policy matrix with Source Zone, Allowed/Permitted, Review Required, and Denied/Isolated columns.
- Security matrix now uses full rule names and clickable rows instead of truncated diamond labels.
- Replaced production-unfriendly `Hidden proof objects` wording with `Filtered evidence`.
- Reduced minimum canvas widths/heights so active topology dominates over dead whitespace.
- Kept object detail panels below the canvas/table so they do not steal drawing width.

## Proof boundary

This phase proves source-level diagram wiring and static release discipline. Final proof still requires Render deployment and screenshot review in the browser.
