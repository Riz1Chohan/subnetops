# Phase 90 — Diagram Professional Topology Layout

Runtime marker: `PHASE_90_DIAGRAM_PROFESSIONAL_TOPOLOGY_LAYOUT`

## Purpose

Phase 90 fixes the diagram quality problem that survived the earlier report cleanup phases.

The old canvas was technically connected to the backend design graph, but it was still the wrong user experience: it exposed too many raw graph objects, used backend/debug language, displayed internal IDs, and could show dozens of nodes with weak topology meaning. That is not acceptable for a network planning product.

## What changed

- Replaced the primary diagram render model with a professional topology layout builder.
- The render model now creates readable topology objects:
  - site groups
  - core/branch gateway nodes
  - firewall / WAN / Internet edge nodes
  - route-domain node
  - security zone nodes
  - collapsed DHCP summary nodes
  - policy nodes only when useful for boundary review
- Added hub-and-spoke routing edges derived from the multi-site model.
- Added WAN/Internet edge relationships for routing and NAT review.
- Collapsed DHCP scope evidence into per-site summary nodes instead of flooding the canvas with raw objects.
- Changed the render model layout marker to `professional-topology-layout`.
- Updated frontend diagram wording from backend/debug language to user-facing topology language.
- Removed raw object ID display from the default sidebar.
- Added canvas label cleanup to hide UUID/device-reference noise.
- Kept detailed proof hidden unless an overlay requests it.

## Important boundary

This phase does not pretend implementation is ready.

Implementation execution remains blocked until operational safety, management IP evidence, backups, rollback paths, and vendor-specific execution details are modeled and approved.

## Verification

Added static proof:

```bash
npm run check:phase90-diagram-professional-topology-layout
```

Also added aggregate proof:

```bash
npm run check:phase84-90-release
```

## Result

The diagram should now behave as a professional network topology canvas instead of a raw backend object dump. Physical/default views should focus on sites, gateways, firewall/WAN edge, and route relationships. Boundary/security views should focus on zones and policy relationships. Addressing overlays can reveal DHCP summary evidence without overwhelming the diagram.
