# Phase 56 — Engine 2 Write-Time Integrity and Conflict Enforcement

## Purpose

Phase 56 hardens Engine 2 by moving critical IPAM controls from passive review findings into write-time enforcement.

Before this phase, Engine 2 could detect many bad states after they were saved. That was useful, but not A+ behavior. A real enterprise allocator must prevent unsafe state from entering the source of truth unless an explicit review override is recorded.

## What changed

### Pool write integrity

The Engine 2 IPAM service now checks pool writes before persistence:

- duplicate pool CIDRs in the same route domain are blocked
- active overlapping pools in the same route domain are blocked
- intentional hierarchy requires explicit reserved/no-allocate/organization posture
- invalid pool CIDR and family mismatches remain blocked

### Allocation write integrity

Allocation create/update and plan materialization now enforce:

- allocation CIDR must match address family
- allocation must fit inside selected pool
- allocation route domain must match the selected pool route domain
- selected pool cannot be `noAllocate`
- selected pool cannot be `DEPRECATED`
- selected `RESERVED` pools require explicit `REVIEW_REQUIRED` + `RESERVED_POOL_OVERRIDE`
- duplicate allocations in the same route domain are blocked
- overlapping active allocations in the same route domain are blocked
- brownfield overlaps are blocked unless explicitly reviewed with `BROWNFIELD_REVIEWED`
- reserve-policy breaches are blocked unless explicitly reviewed with `RESERVE_OVERRIDE`

### Plan materialization integrity

The materialization endpoint now refuses to persist allocator plan rows when the current Engine 2 posture contains any blocking finding.

This prevents the UI from turning a stale or unsafe computed row into durable source-of-truth state.

### DHCP and reservation integrity

DHCP scope and reservation writes now enforce:

- duplicate DHCP scopes in the same route domain are blocked
- overlapping DHCP scopes in the same route domain are blocked
- DHCP excluded ranges are semantically parsed, not just JSON-validated
- exclusion ranges must sit inside the DHCP scope
- default gateways cannot sit inside exclusion ranges
- reservations cannot duplicate an existing reservation in the same DHCP/allocation context
- reservations cannot sit inside a DHCP exclusion range

Supported exclusion formats:

```json
["10.10.1.20-10.10.1.40", "10.10.1.100", "10.10.1.128/28"]
```

or:

```json
[{ "start": "10.10.1.20", "end": "10.10.1.40" }, { "cidr": "10.10.1.128/28" }]
```

### Approval/hash enforcement

Approval and status changes are now stricter:

- approve/reject/supersede/implement actions require a reviewer summary
- approved allocations must store the current Engine 2 input hash
- approval records now persist `designInputHash`
- the posture engine now flags approvals that lack hashes or were approved against stale hashes

### Frontend typing hardening

The Engine 2 frontend API removed broad `Array<any>` / `api<any>` typing for the management snapshot and now uses named models for route domains, pools, allocations, DHCP scopes, reservations, brownfield networks, approvals, and ledger entries.

## Files changed

- `backend/src/services/enterpriseIpam.service.ts`
- `backend/src/lib/enterpriseAddressAllocator.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260429100000_phase56_engine2_write_integrity/migration.sql`
- `frontend/src/features/enterprise-ipam/api.ts`
- `scripts/check-phase56-engine2-write-integrity.cjs`
- `package.json`

## Boundary

This phase does not build the full brownfield dry-run workflow or conflict-review page. That belongs in the next phase.

Phase 56 closes the most dangerous gap first: unsafe Engine 2 data should not be easy to save.
