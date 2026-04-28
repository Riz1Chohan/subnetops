# Phase 36 — Implementation Planning Engine

## Purpose

Phase 36 upgrades the backend implementation planning engine from a broad implementation-neutral checklist into a stronger change-plan compiler.

The implementation engine now consumes the backend authoritative outputs from:

- network object model
- design graph integrity findings
- routing/segmentation engine
- security policy flow engine
- NAT review output
- DHCP/interface objects

It then produces ordered implementation steps with explicit engineering metadata.

## What changed

### Step-level engineering metadata

Every `ImplementationPlanStep` now includes:

- `readinessReasons`
- `blockers`
- `upstreamFindingIds`
- `blastRadius`
- `requiredEvidence`
- `acceptanceCriteria`
- `rollbackIntent`

This prevents the plan from being a shallow checklist. A step must now explain why it is ready/review/blocked, what it can affect, what evidence is required, what proves acceptance, and how to reverse it.

### Dependency model

Phase 36 adds a stronger dependency model:

- every non-preparation step depends on the authoritative design review gate
- DHCP depends on the matching VLAN gateway/interface when modeled
- route intent depends on the next-hop interface when modeled
- NAT steps depend on the flow steps they cover
- security steps depend on routing verification gates before flow validation

This is not vendor command generation yet. It is backend sequencing logic.

### Upstream finding propagation

Design graph, routing, and security findings are normalized into upstream implementation findings. A step affected by upstream ERROR findings becomes blocked. A step affected by WARNING findings requires review.

This means implementation readiness cannot claim ready while the source engines are screaming.

### NAT and security consumption

Phase 36 consumes `securityPolicyFlow.natReviews` instead of guessing NAT readiness from raw NAT rule status. NAT implementation steps now reflect:

- covered NAT-required flows
- missing NAT-required flows
- NAT review readiness
- concrete translation mode
- NAT blast radius
- NAT verification evidence

### Verification and rollback

The implementation model now includes a Phase 36 guardrail verification check:

- every implementation step must have evidence, blast radius, acceptance criteria, and rollback proof

Rollback actions now include a stop condition when blocked steps remain.

## Selftest

Added backend selftest:

```bash
npm run engine:selftest:phase36-implementation
```

It proves:

- every implementation step carries engineering metadata
- dependencies exist instead of a flat checklist
- uncovered NAT-required flows become implementation blockers
- evidence, rollback, and blast-radius summary proof exists

`engine:selftest:all` now includes the Phase 36 selftest.

## Static seam check

Added:

```bash
node scripts/check-implementation-planning-engine-upgrade.cjs
```

This check is included in both:

- `scripts/final-preflight.sh`
- `scripts/verify-build.sh`

## Boundary intentionally preserved

Phase 36 does **not** add vendor-specific Cisco/Palo Alto commands.

That is intentional. The implementation engine now describes what must happen, why it must happen, what depends on it, what can break, what evidence proves it, and how to roll it back. Vendor-specific command rendering should come later after the backend plan is trustworthy.

## Current limitation

This phase improves implementation planning logic and static/source checks. Full install/build proof still requires running `bash scripts/verify-build.sh` in a clean Node 20.12.2 environment with npm dependency installation available.


## Phase 36B update

Phase 36B strengthens this engine with a graph-driven dependency compiler. The implementation plan now exposes dependency graph edges, dependency object IDs, graph edge IDs, and precise security/NAT dependency counts. Security flow steps no longer depend on a broad slice of routing work; they resolve prerequisites from source/destination zones, zone-bound interfaces, route domains, route intents, NAT reviews, and backend design-graph relationships.

See `docs/doc/PHASE36B-GRAPH-DRIVEN-IMPLEMENTATION-DEPENDENCY-COMPILER.md`.

## Phase 36C update

Phase 36C adds operational-safety and device-level change planning. The implementation engine now creates per-device safety gates and ties risky route, security, NAT, DHCP, and interface steps to those gates.

Operational safety evidence includes management access, current configuration backup/baseline, fallback or out-of-band recovery path, and change-owner approval before the maintenance window. If management access is not modeled for an affected device, risky steps are blocked instead of appearing ready.

See `docs/doc/PHASE36C-OPERATIONAL-SAFETY-DEVICE-CHANGE-PLAN.md`.
