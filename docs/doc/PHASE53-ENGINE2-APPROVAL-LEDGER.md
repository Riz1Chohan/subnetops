# Phase 53 — Engine 2 Approval Ledger + Stale Allocation Detection

Phase 53 adds the approval/audit layer required before an allocator can be trusted as an enterprise planning system.

## What changed

- Durable allocation approvals are included in design-core data.
- Durable allocation ledger entries are included in design-core data.
- Engine 2 computes a current input hash from VLAN rows, pools, allocations, DHCP scopes, and brownfield imports.
- Approved or implemented allocations with an old input hash are marked stale and blocked from implementation trust.

## Boundary

The engine detects stale approvals and missing approval records. Full reviewer UI/actions still need dedicated screens and API endpoints before this becomes a complete approval workflow.
