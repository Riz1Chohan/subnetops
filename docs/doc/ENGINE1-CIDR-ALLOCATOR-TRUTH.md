# Engine 1 CIDR Allocator Truth

Engine 1 owns CIDR math, subnet canonicalization, usable-host behavior, role-aware buffered capacity planning, gateway usability checks, parent-block containment, deterministic address allocation, and the explanation text needed to understand those decisions.

Engine 1 does not own routing protocol design, firewall policy semantics, NAT implementation, device-specific configuration, live discovery, or final production approval. Those downstream engines must consume Engine 1 truth instead of recomputing subnet math in the browser.

## Backend inputs

Engine 1 consumes the project base private range, site default address blocks, saved VLAN subnet CIDRs, saved gateway IPs, estimated host counts, DHCP flags, requirement profile context, and the saved explicit VLAN `segmentRole` field. If `segmentRole` is missing, backend inference is allowed only as fallback evidence.

## Backend outputs

Engine 1 outputs canonical subnet facts, network and broadcast addresses, first and last usable addresses, masks and wildcard masks, total and usable address counts, estimated and required usable host counts, recommended prefixes, capacity headroom, capacity state, gateway state, proposed gateway, proposed subnet corrections, allocator explanations, role source, role confidence, role evidence, and the final `engine1Explanation` string.

## Role truth

Explicit saved role wins. Inferred role is fallback only. Unknown is allowed and is safer than pretending. Every row should carry `role`, `roleSource`, `roleConfidence`, and `roleEvidence` so engineers can see whether capacity and placement decisions came from user intent or text inference.

## Frontend consumers

The frontend stores user inputs and displays backend truth. It must not run a hidden subnet planner. The design-core query key includes an Engine 1 input fingerprint covering project base range, site blocks, VLAN subnet, gateway, estimated hosts, DHCP, department, notes, purpose, requirements profile, and segment role so edited sites/VLANs refresh backend truth.

## Diagram consumers

The diagram is a renderer, not the source of subnet truth. Site and VLAN records are merged from project-embedded data and fetched records by ID before rendering. If diagram render input is unavailable while sites/VLANs exist, the UI must report stale/missing renderer input, not falsely claim the project has no sites or VLANs.

## Proof commands

Run these from the repository root:

```bash
npm run check:engine1-cidr-output
npm run check:engine1-cidr
npm run check:engine1-final-trust
cd backend && npm run build
cd frontend && npm run build
```

## Known risks

Runtime/build proof still depends on a clean dependency install. Previous sandbox attempts hit npm timeouts and `tsx: Permission denied`; that must be diagnosed as tooling/dependency execution risk, not hand-waved as product proof.
