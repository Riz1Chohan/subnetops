# Phase 47 — Engine 2 Address Allocator Trust Pass

## Scope

This phase hardens Engine 2: the backend address allocator. The goal is not to add a new toy feature. The goal is to make allocator decisions easier to prove, easier to review in the UI, and harder to misrepresent in exports.

## What changed

- Added allocator capacity telemetry in `backend/src/lib/addressAllocator.ts`:
  - normalized used ranges
  - free ranges
  - used/free address counts
  - utilization percentage
  - largest free range
  - requested block size fit check
- Added `calculateFreeRanges` and `summarizeAllocationCapacity` as first-class allocator helpers.
- Extended allocation results with proof fields:
  - `allocatorParentCidr`
  - `allocatorUsedRangeCount`
  - `allocatorFreeRangeCount`
  - `allocatorLargestFreeRange`
  - `allocatorUtilizationPercent`
  - `allocatorCanFitRequestedPrefix`
- Propagated allocator proof into backend design-core proposal rows and attached proposal assignments.
- Propagated allocator proof through frontend snapshot/types/adapter.
- Added allocator proof to the Addressing page proposal table.
- Added allocator proof to the export report addressing recommendation table.
- Added allocator selftests for free-range calculation, capacity summary, and batch result telemetry.

## Engine 2 truth boundary

Engine 2 is still an IPv4 allocation engine. It is now stronger and more transparent, but it is not yet a full enterprise IPAM engine.

Authoritative today:

- IPv4 parent-block placement
- deterministic first-fit allocation
- used-range normalization and clipping
- configured/proposed range conflict avoidance
- gateway proposal based on site preference
- allocator proof telemetry for UI/export review

Still not authoritative yet:

- IPv6 allocation
- VRF-aware duplicate address domains
- imported brownfield IPAM state
- DHCP option modeling
- reservations by real device inventory
- multi-tenant/NAT domain modeling
- business-unit reserve policy
- allocation approvals/change workflow

## Acceptance checks

Static guard added:

```bash
npm run check:engine2-address-allocator-trust
```

This verifies that allocator telemetry exists, is self-tested, is propagated into design-core types, is mapped by the frontend adapter, is displayed on the Addressing page, and is included in the export report.
