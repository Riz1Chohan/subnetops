# Phase 5 — Engine 2 Enterprise IPAM / Durable Allocation Workflow

## Purpose

Phase 5 hardens Engine 2 as the durable enterprise IPAM authority. This phase does not redo Engine 1 CIDR math. It reconciles Engine 1 mathematical planning with durable IPAM records and exposes split-brain risk.

The relationship is now explicit:

- Engine 1 = mathematical planner
- Engine 2 = durable IPAM authority
- Design-core = reconciler and consumer

Engine 2 owns durable truth for route domains, pools, allocations, DHCP scopes, reservations, brownfield conflicts, approvals, and ledger state. Engine 1 can propose a subnet, but Engine 2 decides whether it is durable, approved, conflicted, stale, blocked, or review-required.

## Contract marker

`PHASE5_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW`

## Source files

- `backend/src/services/designCore/designCore.phase5EnterpriseIpamTruthControl.ts`
- `backend/src/lib/enterpriseAddressAllocator.ts`
- `backend/src/services/enterpriseIpam.service.ts`
- `backend/src/services/designCore.service.ts`
- `backend/src/services/designCore.types.ts`
- `backend/src/services/validation.service.ts`
- `backend/src/services/exportDesignCoreReport.service.ts`
- `backend/src/services/export.service.ts`
- `frontend/src/lib/designCoreSnapshot.ts`
- `frontend/src/pages/ProjectOverviewPage.tsx`
- `backend/src/lib/phase5EnterpriseIpam.selftest.ts`
- `scripts/check-phase5-enterprise-ipam.cjs`

## Requirement propagation rule

Requirement-driven address needs must land in one of these states:

1. Engine 1 proposal only
2. Engine 2 durable allocation candidate
3. Engine 2 approved allocation
4. Engine 2 conflict/review blocker
5. Engine 2 stale allocation review

No requirement should create a pretty subnet row while Engine 2 says the pool is blocked, the allocation is stale, a brownfield overlap exists, a reserved/deprecated pool needs review, a DHCP scope conflicts, a reservation conflicts, or approval evidence is missing.

The Phase 5 matrix covers these requirement keys:

- `usersPerSite`
- `siteCount`
- `guestAccess`
- `guestWifi`
- `voice`
- `managementAccess`
- `management`
- `printers`
- `iot`
- `cameras`
- `wireless`
- `dualIsp`
- `cloudHybrid`
- `cloudConnected`
- `remoteAccess`
- `growthBufferModel`

## Durable authority states

Phase 5 reconciliation rows use these states:

- `ENGINE1_PROPOSAL_ONLY`
- `ENGINE2_DURABLE_CANDIDATE`
- `ENGINE2_APPROVED_ALLOCATION`
- `ENGINE2_APPROVED_WITH_REVIEW_NOTES`
- `ENGINE2_CONFLICT_REVIEW_BLOCKER`
- `ENGINE2_STALE_ALLOCATION_REVIEW`
- `ENGINE2_POOL_BLOCKED`
- `ENGINE2_DHCP_CONFLICT_REVIEW`
- `ENGINE2_RESERVATION_CONFLICT_REVIEW`

These states are surfaced in `phase5EnterpriseIpamTruth.reconciliationRows`.

## What Phase 5 adds

The design-core snapshot now exposes:

```text
phase5EnterpriseIpamTruth
```

It includes:

- Engine 1 / Engine 2 relationship summary
- route-domain count
- durable pool count
- durable allocation count
- DHCP scope count
- reservation count
- brownfield network count
- approval count
- ledger entry count
- current Engine 2 input hash
- overall readiness
- Engine 1 proposal-only count
- durable candidate count
- approved allocation count
- stale allocation count
- conflict blocker count
- review-required count
- DHCP conflict count
- reservation conflict count
- brownfield conflict count
- reserve policy conflict count
- active requirement IPAM gap count
- reconciliation rows
- requirement-to-IPAM matrix
- conflict/finding rows

## Validation impact

Validation now reads Phase 5 evidence and emits readiness gates:

- `IPAM_DURABLE_AUTHORITY_BLOCKED`
- `IPAM_DURABLE_AUTHORITY_REVIEW_REQUIRED`
- `IPAM_REQUIREMENT_PROPAGATION_GAP`

This prevents implementation readiness from passing when Engine 1 math is clean but Engine 2 durable IPAM is not.

## Frontend impact

Project Overview now shows a Phase 5 Enterprise IPAM durable authority panel with:

- overall IPAM readiness
- proposal-only rows
- approved allocations
- blocking/review count
- Engine 1 / Engine 2 reconciliation rows
- requirement-to-IPAM matrix
- Engine 2 findings

The frontend does not compute this truth locally. It only displays the backend `phase5EnterpriseIpamTruth` snapshot.

## Report/export impact

Exports now include Phase 5 truth evidence:

- Phase 5 Enterprise IPAM Durable Authority
- Phase 5 Engine 1 / Engine 2 Reconciliation
- Phase 5 Requirement-to-IPAM Matrix
- Phase 5 Enterprise IPAM Findings

The report/export layer must not claim implementation-ready addressing when Engine 2 says review or blocked.

## Acceptance scenarios

Phase 5 is designed to expose these scenarios:

- new greenfield project
- approved allocation from Engine 2
- stale allocation hash
- brownfield overlap
- reserved pool
- deprecated pool
- DHCP conflict
- reservation conflict
- IPv4 and IPv6 pool coexistence
- multi-VRF overlapping address space

## Do not use Phase 5 to

- rewrite Engine 1 CIDR math
- invent durable allocations from text-only requirements
- fake ISP circuits
- fake cloud route tables
- fake VPCs or VNets
- fake VPN gateways
- fake private links
- approve an allocation without a current Engine 2 input hash
- mark an Engine 1 proposal as implementation-ready without Engine 2 reconciliation

## Proof gates

Run:

```bash
npm run check:phase5-enterprise-ipam
npm run check:phase5-107-release
```

Backend selftest hook:

```bash
cd backend
npm run engine:selftest:phase5-enterprise-ipam
```

The backend selftest proves:

- an approved allocation with the current hash passes
- an Engine 1 row without durable allocation stays proposal-only
- a stale approved allocation hash blocks Phase 5

## Ruthless boundary

Phase 5 is not a pretty IPAM page cleanup. It is a split-brain prevention phase.

If Engine 1 says a subnet is mathematically clean but Engine 2 says the pool/allocation/DHCP/brownfield/approval state is unresolved, the design is not implementation-ready. Anything else is fake confidence.
