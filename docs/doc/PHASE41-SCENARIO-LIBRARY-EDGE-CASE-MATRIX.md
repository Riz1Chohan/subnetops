# Phase 41 — Scenario Library + Edge Case Matrix

## Purpose

Phase 41 adds a backend scenario library and edge case matrix for SubnetOps.

This phase is not a UI polish pass. It is a regression shield for the core product rule:

> Backend decides truth. Frontend displays truth. Exports preserve truth. No hidden frontend planning engine.

The goal is to prove that realistic network inputs produce explicit backend truth across addressing, routing, security, implementation planning, verification, rollback, report truth, and diagram truth.

## What changed

Phase 41 adds:

- `backend/src/lib/phase41ScenarioMatrix.fixtures.ts`
- `backend/src/lib/phase41ScenarioMatrix.selftest.ts`
- `scripts/check-phase41-scenario-matrix.cjs`
- `docs/doc/PHASE41-SCENARIO-LIBRARY-EDGE-CASE-MATRIX.md`

The backend package also exposes:

```bash
npm run engine:selftest:phase41-scenarios
```

The root package exposes:

```bash
npm run check:phase41-scenario-matrix
```

`engine:selftest:all` now includes the Phase 41 scenario runner.

## Scenario Library

The scenario library covers nine deliberately different cases:

1. Small office baseline with management and users
2. Multi-site enterprise with guest, DMZ, management, NAT, and WAN truth
3. Overlapping site summary blocks
4. Public organization range violating private-address planning standards
5. Undersized subnet requiring backend allocator proposal
6. Invalid and unusable gateway addresses
7. Exhausted site block where allocation cannot safely fit
8. Empty site with no VLAN/interface evidence
9. Local overlapping DHCP-enabled VLANs as a current DHCP-depth regression gap

## edge case matrix

The matrix intentionally checks for hard blockers and review conditions including:

- `SITE_BLOCK_OVERLAP`
- `SUBNET_OVERLAP_LOCAL`
- `SUBNET_OVERLAP_CROSS_SITE`
- `SUBNET_UNDERSIZED`
- `SUBNET_PROPOSAL_UNAVAILABLE`
- `GATEWAY_INVALID`
- `GATEWAY_UNUSABLE`
- `SITE_BLOCK_OUTSIDE_ORG_RANGE`
- `STANDARDS_REQUIRED_RULE_BLOCKER`
- `DESIGN_GRAPH_DEVICE_WITHOUT_INTERFACES`
- `IMPLEMENTATION_OPERATIONAL_SAFETY_BLOCKED`

The matrix also verifies that scenario outputs preserve:

- backend authority
- report truth readiness
- blocked findings
- implementation review queue
- verification checks
- rollback actions
- backend-authored diagram render model
- diagram overlays
- required security zone roles
- standards rulebook violations
- known gaps

## Important behavior

Blocked scenarios must stay blocked.

If the backend says the design is blocked, downstream reports and exports must not soften it. The correct meaning is:

> This design is not implementation-ready.

Phase 41 helps prevent future code from quietly turning dangerous or incomplete designs into fake confidence.

## known gaps documented by this phase

Phase 41 does not pretend SubnetOps is vendor-grade yet.

Known gaps are explicitly documented inside scenario fixtures, including:

- device management IPs are not yet first-class imported project inputs
- vendor ACL/NAT command compilation is not complete
- live topology discovery import remains future integration work
- DHCP option, lease pool, helper-address, exclusion-range, and server-behavior modeling is still shallow

The DHCP overlap scenario is especially important. The current engine catches the overlapping subnet truth, but richer DHCP conflict modeling must still become a future engine pass.

## Why this matters

Before Phase 42 vendor-neutral implementation templates or Phase 43 vendor-specific command generation, SubnetOps needs a stronger proof base.

Without this scenario matrix, command generation would be premature. It would risk generating polished implementation artifacts from weak or incomplete design truth.

Phase 41 raises the maturity bar: SubnetOps must survive ugly inputs and still tell the truth.

## Minimum proof commands

Run:

```bash
node scripts/check-phase41-scenario-matrix.cjs
node scripts/check-release-artifacts.cjs
bash scripts/assert-release-discipline.sh
node scripts/check-export-truth-hardening.cjs
node scripts/check-backend-report-diagram-truth.cjs
node scripts/check-backend-diagram-render-model.cjs
```

When dependencies are available, also run:

```bash
cd backend
npm run engine:selftest:phase41-scenarios
npm run engine:selftest:all
npm run build
```

If dependency installation or TypeScript execution cannot be proven in the sandbox, GitHub and Render remain final proof.
