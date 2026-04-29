# Phase 51 — Engine 2 Brownfield Import + Conflict Diff

Phase 51 makes Engine 2 compare proposed and durable allocation evidence against imported current-state networks.

## What changed

- Imported brownfield networks are first-class records.
- The enterprise allocator compares current imported CIDRs against:
  - saved VLAN subnets,
  - proposed allocator rows,
  - durable allocation rows,
  - dual-stack pool proposals.
- Same-route-domain overlaps are surfaced as review or blocker findings.

## Boundary

This is a CSV/JSON/IPAM-import-ready data layer, not live network discovery. Live discovery belongs to the future mapping/discovery app and should not be faked here.
