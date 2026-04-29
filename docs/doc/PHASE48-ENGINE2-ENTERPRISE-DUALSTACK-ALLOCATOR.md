# Phase 48 — Engine 2 Enterprise Dual-Stack Address Allocator

## Goal

Phase 48 hardens Engine 2 without faking enterprise IPAM maturity. The allocator now has explicit enterprise gates for IPv6, VRF/route-domain scope, brownfield/IPAM evidence, DHCP scope review, reservation policy, growth reserve policy, and engineer approval.

## What changed

- Added `backend/src/lib/ipv6Cidr.ts` as a separate IPv6 CIDR math engine instead of corrupting the IPv4 CIDR engine.
- Added `backend/src/lib/enterpriseAddressAllocator.ts` to produce conservative enterprise allocator posture.
- Added backend `enterpriseAllocatorPosture` to the design-core snapshot.
- Added frontend snapshot types and Addressing-page visibility for enterprise allocator readiness.
- Added report/export tables for enterprise allocator readiness and review queue.
- Added static release gate `check:engine2-enterprise-allocator`.

## Truth boundary

This is not pretending to be a live enterprise IPAM. Missing evidence remains review-gated. Brownfield import, VRF overlap approval, DHCP options/reservations, and approval workflow are surfaced as explicit gates instead of silently assumed.

## Correct architecture

IPv6 has its own math layer:

- IPv4 CIDR math: `backend/src/lib/cidr.ts`
- IPv6 prefix math: `backend/src/lib/ipv6Cidr.ts`
- Dual-stack/enterprise allocator posture: `backend/src/lib/enterpriseAddressAllocator.ts`

Engine 2 consumes both address-family layers and exposes proof/readiness to backend snapshots, frontend UI, and exports.

## Remaining non-fake A+ work

To become a full enterprise IPAM implementation engine, the database still needs durable first-class objects for IPv6 prefixes, VRFs, DHCP scopes, reservations, brownfield imports, allocator approvals, and allocation history. This phase creates the proof/posture layer and prevents false readiness; it does not claim live discovery or real IPAM synchronization exists.
