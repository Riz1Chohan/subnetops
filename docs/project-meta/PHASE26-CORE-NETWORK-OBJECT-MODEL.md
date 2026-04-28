# Phase 26 — Core Network Object Model

## Purpose

Phase 26 turns the backend design core from an address/VLAN planner into the beginning of a real network design graph.

The phase does **not** pretend to generate production-ready vendor configuration. Instead, it introduces explicit backend objects that later phases can use for routing, security policy, diagrams, reports, implementation plans, brownfield imports, and vendor-specific config generation.

## Added backend design objects

The authoritative design-core snapshot now includes `networkObjectModel` with:

- `NetworkDevice`
- `NetworkInterface`
- `NetworkLink`
- `RouteDomain`
- `SecurityZone`
- `PolicyRule`
- `NatRule`
- `DhcpPool`
- `IpReservation`
- `NetworkObjectModelSummary`

All names use readable engineering terms. No placeholder naming was used.

## Engine behavior

The backend now derives a structured object graph from the existing project, site, VLAN, addressing, transit, and loopback planning data.

The model connects:

- VLAN/subnet rows to gateway interfaces
- Gateway interfaces to inferred layer-3 site devices
- Subnets and interfaces to a corporate route domain
- VLAN roles to security zones
- DHCP-enabled VLANs to DHCP pool objects
- Gateways, loopbacks, and transit endpoints to IP reservations
- Guest/internal/management/DMZ intent to policy-rule objects
- Internet egress intent to NAT-review objects

## Truth-state discipline

Objects are tagged as:

- `configured`
- `inferred`
- `proposed`
- `discovered`

This prevents SubnetOps from confusing a generated recommendation with as-built network truth.

## Report/export integration

Professional reports now include Phase 26 tables for:

- Network devices
- Gateway and routing interfaces
- DHCP pools
- Route domains
- Security zones
- Policy intent
- NAT intent

## Self-test coverage

The design-core self-test now checks that the network object model exists and that configured, inferred, and proposed object counts are exposed through the snapshot.

## Important limitation

This phase creates the object-model skeleton. It is not yet a full routing simulator, firewall compiler, device inventory system, or live-discovery engine. Those should build on this foundation in later phases.
