# Phase 99 — Topology Semantics and Real Network Layout

Marker: `PHASE_99_TOPOLOGY_SEMANTICS_REAL_NETWORK_LAYOUT`

## Purpose

Phase 99 fixes the remaining professional topology problem in the Phase 98 diagram canvas: physical and WAN drawings were still treating one WAN/Internet cloud as a universal parent object. That made the topology look like a generic graph rather than an engineer-readable multi-site network.

## Scope

This phase is intentionally narrow:

- separate **local Internet / ISP underlay** from **VPN overlay tunnels**
- add per-site local Internet breakout nodes in physical/WAN views
- stop drawing one global WAN cloud to every site/device
- draw branch-to-HQ overlay as an explicit `IPsec VPN tunnel to HQ`
- keep internal site handoff separate from WAN transport
- add a small legend so line meaning is visible
- keep DHCP/service summaries out of physical global/WAN topology unless explicitly requested in focused site detail
- keep the security/boundaries matrix path separate from topology SVG rendering

## Diagram meaning after Phase 99

### Physical / Global

HQ is treated as the central hub site. Branches are shown as spokes. Each site has its own local Internet underlay breakout. VPN overlay is drawn between the branch edge device and the HQ edge device, not from one cloud to every object.

### WAN / Cloud

WAN view focuses on transport and overlay. Local ISP/Internet underlay appears per site. Overlay tunnels show the enterprise site-to-site relationship.

### Physical / Per-site

Focused site view keeps the local Internet edge, firewall/core handoff, and local site devices. VLAN/subnet/service detail stays gated behind overlays.

## Release proof

Static gate:

```bash
npm run check:phase99-topology-semantics-real-network-layout
```

Full release gate:

```bash
npm run check:phase84-99-release
```

Render deployment and browser screenshots are still required before calling the visual output complete.
