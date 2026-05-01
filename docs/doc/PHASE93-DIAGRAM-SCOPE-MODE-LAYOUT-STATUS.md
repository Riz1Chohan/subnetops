# Phase 93 — Diagram Scope, Mode Layout, and Status Separation

Runtime marker: `PHASE_93_DIAGRAM_SCOPE_MODE_LAYOUT_STATUS`

Phase 93 fixes the remaining diagram failures found after the Phase 92 deployment screenshots.

## What changed

- Per-site canvas isolation now receives the selected site ID and filters visible topology objects to that site plus explicit external anchors such as WAN/Internet and route-domain references.
- Physical, logical, WAN/cloud, and security/boundary views now use separate frontend placement logic instead of recycling the same graph layout.
- Logical view now has backend render nodes for VLAN and subnet evidence, built from the authoritative design graph relationships.
- Security/boundary view suppresses generic zone-boundary graph edges and focuses on zone/policy relationships so it does not become a spaghetti wiring diagram.
- Physical view stays focused on sites, gateways, firewalls, WAN/Internet, and major site/WAN paths. DHCP summaries only appear when the services overlay is explicitly enabled.
- The sidebar separates design evidence from implementation/execution readiness so design objects do not look invalid just because operational safety is still blocked.
- User-facing badges now report sites shown, devices shown, relationship count, and hidden proof object count instead of raw group/overlay counters.

## Non-goals

- This does not make implementation execution ready.
- This does not model vendor-specific firewall/router configuration.
- This does not prove full frontend/backend build in the sandbox.

## Verification

Run:

```bash
npm run check:phase93-diagram-scope-mode-layout-status
npm run check:phase84-93-release
```
