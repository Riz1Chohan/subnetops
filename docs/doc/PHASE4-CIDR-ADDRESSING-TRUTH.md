# Phase 4 — Engine 1 CIDR / Addressing Truth

Phase 4 hardens the mathematical addressing planner only. It does not touch Enterprise IPAM approval workflows, routing simulation, security policy flow, diagrams, reports, BOM, discovery, or AI authority.

## Boundary

Engine 1 is the mathematical planner:

- IPv4 canonicalization
- invalid CIDR rejection
- /0, /1, /30, /31, and /32 edge handling
- network, broadcast, and role-aware gateway safety
- overlap detection
- role-based prefix sizing
- growth-buffer capacity planning
- deterministic site/VLAN allocation proposals
- site block pressure and exhaustion evidence
- requirement-to-addressing proof

Engine 2 remains the durable IPAM authority and is intentionally deferred to Phase 5.

## Contract marker

`PHASE4_ENGINE1_CIDR_ADDRESSING_TRUTH`

The design-core snapshot now exposes:

`phase4CidrAddressingTruth`

## Requirement propagation rule

Every addressing-relevant requirement must land in one of these outcomes:

1. Concrete addressing evidence exists in a saved or proposed Engine 1 row.
2. The requirement affects host demand, required usable hosts, recommended prefix, capacity state, or site block pressure.
3. The requirement is explicitly review-required because Engine 1 cannot honestly create the subnet yet.
4. The requirement is not applicable.

No requirement is allowed to create a pretty subnet row unless Engine 1 can point to:

- a real saved VLAN/subnet row,
- a backend-computed capacity result,
- a deterministic allocator proposal,
- or an explicit blocker/review reason.

## Requirement fields covered

Phase 4 tracks these addressing-sensitive fields:

- `usersPerSite`
- `siteCount`
- `guestWifi`
- `guestAccess`
- `voice`
- `wireless`
- `printers`
- `iot`
- `cameras`
- `management`
- `managementAccess`
- `remoteAccess`
- `serverPlacement`
- `growthBufferModel`
- `growthHorizon`
- `dualIsp`

## CIDR hardening

The CIDR engine now rejects malformed CIDR prefix forms such as:

- `10.0.0.0/+24`
- `10.0.0.0/24.0`
- `10.0.0.0/024`
- extra slash input
- invalid IPv4 octets
- leading-zero IPv4 octets

The host/gateway usability check is role-aware:

- `/31` endpoints are usable only for `WAN_TRANSIT`.
- `/32` addresses are usable only for `LOOPBACK`.
- normal VLAN networks reject network and broadcast addresses as gateways.

## Snapshot fields

`phase4CidrAddressingTruth` contains:

- `edgeCaseProofs`
- `requirementAddressingMatrix`
- `addressingTruthRows`
- `validSubnetCount`
- `invalidSubnetCount`
- `undersizedSubnetCount`
- `gatewayIssueCount`
- `siteBlockIssueCount`
- `overlapIssueCount`
- `deterministicProposalCount`
- `blockedProposalCount`
- `requirementDrivenAddressingCount`
- `requirementAddressingGapCount`

## Frontend impact

The Project Overview traceability section now shows:

- Phase 4 summary counters
- active requirement-to-addressing matrix rows
- Engine 1 addressing row truth
- CIDR edge-case proof rows

The frontend does not compute this truth locally. It only renders backend snapshot evidence.

## Report/export impact

The DOCX/PDF report builder now adds addressing proof tables under the Addressing section:

- Phase 4 CIDR Addressing Truth
- Phase 4 Requirement Addressing Matrix
- Phase 4 Addressing Row Truth

The CSV export now includes:

- Phase 4 CIDR Addressing Truth
- Phase 4 Requirement Addressing Matrix
- Phase 4 Addressing Row Truth

## Proof identifiers

Phase 4 must keep these exact proof identifiers visible in backend control code, documentation, and release checks:

- `ipv4-canonicalization`
- `invalid-cidr-rejection`
- `boundary-prefixes`
- `network-broadcast-gateway-safety`
- `overlap-detection`
- `deterministic-allocation`
- `site-block-exhaustion`

## Tests and gates

Phase 4 adds:

- `backend/src/lib/phase4CidrAddressing.selftest.ts`
- `scripts/check-phase4-cidr-addressing.cjs`
- `npm run check:phase4-cidr-addressing`
- `npm run check:phase4-107-release`

Existing CIDR and allocator proof files remain part of the proof chain:

- `backend/src/lib/cidr.selftest.ts`
- `backend/src/lib/cidrProof.selftest.ts`
- `backend/src/lib/cidrBoundary.selftest.ts`
- `backend/src/lib/addressAllocator.selftest.ts`

## Explicit non-goals

Do not use Phase 4 to:

- approve durable IPAM allocations,
- create fake ISP circuits,
- create fake cloud route tables,
- upgrade routing simulation,
- upgrade security policy flow,
- redraw diagrams,
- expand reports beyond proof evidence,
- create vendor configs,
- or let AI draft addressing facts.

Those belong to later phases.
