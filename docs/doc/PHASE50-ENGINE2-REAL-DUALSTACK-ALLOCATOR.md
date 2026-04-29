# Phase 50 — Engine 2 Real Dual-Stack Allocator

Phase 50 upgrades Engine 2 from IPv4-only allocator posture to real dual-stack planning from durable pools.

## What changed

- Added IPv6 free-range calculation and `findNextAvailableIpv6Prefix`.
- IPv6 LAN allocations request `/64`.
- IPv6 point-to-point transit requests `/127`.
- IPv6 loopback/router identity allocations request `/128`.
- The enterprise allocator builds allocation plan rows from durable pools instead of inventing IPv6 from VLAN text.
- IPv4 durable-pool planning still uses the existing detailed IPv4 allocator proof path.

## Boundary

Allocation plan rows are computed and surfaced, but persistence of newly proposed rows still requires a later create/update workflow. The engine does not silently mark generated proposals as approved.
