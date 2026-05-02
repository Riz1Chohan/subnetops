# Phase 104 — Enterprise WAN Fabric Polish

Marker: `PHASE_104_ENTERPRISE_WAN_FABRIC_POLISH`

Version: `0.104.0`

## Why this phase exists

Phase 103 made the first correct move by summarizing large logical/global projects and adding an enterprise WAN fabric. The 10-site screenshots still exposed several unacceptable diagram behaviors:

- Physical / Global still showed cross-site overlay tunnel clutter.
- WAN / Cloud still had repeated dashed and orange lines that read like spaghetti instead of a clean hub-and-spoke overlay fabric.
- Enterprise site cards were too close together and could overlap vertically.
- Logical / Global still had oversized ghost site-lane backgrounds behind summary cards.
- Logical / Per-site no longer guaranteed subnet detail by default, even though per-site logical is where full VLAN/subnet detail belongs.

## What changed

- The enterprise VPN overlay fabric is now owned only by **WAN / Cloud**.
- Large **Physical / Global** suppresses cross-site VPN overlay links and stays focused on physical site/edge/core equipment.
- Large **WAN / Cloud** renders each branch tunnel as a clean vertical stub into one shared fabric rail.
- Duplicate enterprise link labels are suppressed, relying on the legend and fabric rail label instead of repeating the same label nine times.
- WAN and Physical enterprise row spacing was increased to prevent site-card overlap.
- The VPN fabric guide now spans the branch grid instead of sitting as a small center-only rail.
- Logical / Global summary boards suppress the oversized logical site-lane guides.
- Logical / Per-site shows VLAN-to-subnet detail by default, restoring the expected detailed engineering board.

## View contract after Phase 104

- **Physical / Global:** physical site cards, local ISP, firewall/security edge, core gateway; no cross-site tunnel spaghetti.
- **WAN / Cloud:** shared enterprise IPsec overlay fabric rail with clean branch stubs and local ISP underlay per site.
- **Logical / Global:** site summary cards only for 7+ site projects.
- **Logical / Per-site:** full VLAN/subnet/gateway/addressing board.
- **Security / Boundaries:** readable policy matrix, not a relationship graph.

## Verification

Run:

```bash
npm run check:phase104-enterprise-wan-fabric-polish
```

Recommended release-gate chain:

```bash
npm run check:phase84-104-release
```
