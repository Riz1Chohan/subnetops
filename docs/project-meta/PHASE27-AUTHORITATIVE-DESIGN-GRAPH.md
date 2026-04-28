# Phase 27 — Authoritative Design Graph

## Purpose

Phase 26 created first-class backend network objects. Phase 27 connects those objects into an explicit authoritative design graph.

The goal is to stop treating devices, interfaces, links, route domains, zones, policies, NAT intent, DHCP pools, reservations, VLANs, and subnets as separate lists. A serious network design engine must answer relationship questions:

- Which site owns this VLAN?
- Which VLAN uses this subnet?
- Which device owns this gateway interface?
- Which interface owns this gateway IP reservation?
- Which route domain carries this subnet?
- Which security zone protects this subnet?
- Which policy rule references this source and destination zone?
- Which NAT rule translates traffic from which zone?
- Which DHCP pool serves which subnet?
- Which link terminates on which device/interface?

## Added engine objects

Phase 27 adds these backend design-graph types:

- `DesignGraph`
- `DesignGraphNode`
- `DesignGraphEdge`
- `DesignGraphIntegrityFinding`
- `DesignGraphSummary`
- `DesignGraphNodeObjectType`
- `DesignGraphRelationship`

The graph is exposed at:

```text
snapshot.networkObjectModel.designGraph
```

The authoritative snapshot summary also now includes:

```text
summary.designGraphNodeCount
summary.designGraphEdgeCount
summary.designGraphIntegrityFindingCount
summary.designGraphBlockingFindingCount
```

## Relationship coverage

The graph currently models these relationships:

- `site-contains-device`
- `site-contains-vlan`
- `vlan-uses-subnet`
- `device-owns-interface`
- `interface-uses-subnet`
- `interface-binds-link`
- `interface-belongs-to-route-domain`
- `interface-belongs-to-security-zone`
- `route-domain-carries-subnet`
- `security-zone-protects-subnet`
- `security-zone-applies-policy`
- `nat-rule-translates-zone`
- `dhcp-pool-serves-subnet`
- `ip-reservation-belongs-to-subnet`
- `ip-reservation-owned-by-interface`
- `network-link-terminates-on-device`
- `network-link-terminates-on-interface`

## Integrity findings

The graph creates dedicated integrity findings for broken object relationships. These are separate from normal subnet/CIDR validation.

Examples:

- VLAN without usable subnet
- Device without site ownership
- Interface without device ownership
- Interface referencing a missing route domain
- Interface referencing a missing security zone
- Link endpoint referencing a missing device/interface
- Policy rule referencing a missing source or destination zone
- NAT rule referencing a missing zone
- DHCP pool without a modeled subnet
- IP reservation without subnet ownership
- IP reservation referencing a missing interface owner
- Route domain referencing a missing interface
- Device present without modeled interfaces

Error-level graph findings block backend authority readiness.

## Reporting/export impact

Phase 27 report output now includes:

- Design graph summary table
- Design graph integrity findings table
- Authoritative design graph relationship table
- Phase 27-labeled device/interface/route-domain/security-zone/policy/NAT/DHCP sections

## Human-readable naming rule

This phase intentionally avoids placeholder object names such as `foo`, `bar`, `baz`, or `xyz`. Engine vocabulary uses readable network engineering terms such as `DesignGraph`, `NetworkDevice`, `NetworkInterface`, `RouteDomain`, `SecurityZone`, `PolicyRule`, `NatRule`, `DhcpPool`, and `IpReservation`.

## Verification performed in this environment

Focused TypeScript checks passed for the newly added/modified engine files:

```bash
tsc --noEmit --pretty false --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck   src/services/designCore.types.ts   src/services/designCore/designCore.graph.ts   src/services/designCore/designCore.networkObjectModel.ts
```

Focused TypeScript check passed for the frontend snapshot type file using the frontend compiler mode:

```bash
tsc --noEmit --pretty false --target ES2020 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --jsx react-jsx   src/lib/designCoreSnapshot.ts
```

Focused TypeScript check passed for the backend design-core report enrichment file:

```bash
tsc --noEmit --pretty false --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck   src/services/exportDesignCoreReport.service.ts
```

Full dependency install/build was not executed here because this environment does not have the package dependencies installed.
