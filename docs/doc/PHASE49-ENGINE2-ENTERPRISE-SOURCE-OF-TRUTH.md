# Phase 49 — Engine 2 Enterprise Source-of-Truth Data Model

Phase 49 adds durable database objects for the address allocator instead of forcing Engine 2 to infer enterprise objects from `Project`, `Site`, and `Vlan` rows only.

## Added source-of-truth models

- `DesignRouteDomain` for VRF / route-domain boundaries.
- `DesignIpPool` for IPv4 and IPv6 parent pools.
- `DesignIpAllocation` for durable allocation records.
- `DesignDhcpScope` for scope-level DHCP truth.
- `DesignIpReservation` for reserved IP evidence.
- `DesignBrownfieldImport` and `DesignBrownfieldNetwork` for imported current-state evidence.
- `DesignAllocationApproval` for human review decisions.
- `DesignAllocationLedgerEntry` for audit/history events.

## Why this matters

Without these objects, Engine 2 can only produce a proposed plan from thin VLAN rows. That is useful, but not enterprise-grade. Phase 49 gives later allocator phases real objects to consume.

## Boundary

This phase adds the schema, migration, repository inclusion, design-core posture propagation, frontend visibility, and export visibility. It does not claim that live IPAM discovery exists.
