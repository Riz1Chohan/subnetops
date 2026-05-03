# Phase 3 — Requirements Impact, Closure, and Scenario Proof

## Purpose

Phase 3 is the nothing-got-lost checker. It turns the requirements pipeline into a closure gate. Phase 2 declared how each requirement should materialize; Phase 3 proves whether the requirement was actually consumed and exposed downstream.

This phase does **not** add routing depth, security simulation, diagram polish, report redesign, IPAM allocation logic, or AI behavior. It is a proof layer.

## Contract

Backend contract marker:

```text
PHASE3_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF
```

Every captured requirement is checked against this chain:

```text
captured requirement
→ normalized requirement signal
→ materialized source object OR review/block/no-op state
→ backend design-core consumption
→ engine-specific evidence
→ validation/readiness impact
→ frontend visibility
→ report/export evidence
→ diagram impact when relevant
→ golden scenario proof
```

If any part cannot be proven, the row stays visible as partially propagated, review-required, blocked, unsupported, or not captured. No downstream consumer is allowed to silently disappear.

## Added backend surface

```text
backend/src/services/designCore/designCore.phase3RequirementsClosureControl.ts
```

The design-core snapshot now exposes:

```text
phase3RequirementsClosure
```

## Lifecycle states

Phase 3 uses the same lifecycle vocabulary from the requirements propagation contract:

```text
NOT_CAPTURED
CAPTURED_ONLY
MATERIALIZED
PARTIALLY_PROPAGATED
FULLY_PROPAGATED
REVIEW_REQUIRED
BLOCKED
UNSUPPORTED
```

## Closure matrix fields

Each matrix row includes:

```text
requirementId
key
label
category
sourceValue
active
lifecycleStatus
readinessImpact
expectedAffectedEngines
actualAffectedEngines
missingConsumers
consumerCoverage
evidence
reviewReason
```

Consumer coverage includes:

```text
captured
normalized
materialized
backendConsumed
addressingConsumed
routingConsumed
securityConsumed
implementationConsumed
validationConsumed
frontendVisible
reportVisible
diagramVisible
scenarioProven
```

## Golden scenario proof

Phase 3 keeps these scenario families visible:

```text
small-office — small office
multi-site — multi-site
guest-wifi — guest Wi-Fi
voice — voice
cloud-hybrid — cloud/hybrid
remote-access — remote access
dual-isp — dual ISP
healthcare-security-sensitive — healthcare/security-sensitive
brownfield-migration — brownfield migration
```

Each selected scenario reports:

```text
relevant
lifecycleStatus
requiredRequirementKeys
missingRequirementKeys
blockingRequirementKeys
reviewRequirementKeys
evidence
```

## Frontend impact

The Project Overview traceability area now includes a Phase 3 requirements closure matrix showing active/captured requirements, lifecycle status, readiness impact, actual consumers, missing consumers, and selected golden scenario closure.

The frontend does not compute this truth locally. It only displays the backend snapshot.

## Report/export impact

Backend report generation and CSV export now include Phase 3 closure evidence. This is not a report redesign; it is proof evidence so exports do not hide incomplete requirement propagation.

## Proof commands

```bash
npm run check:phase3-requirements-closure
npm run check:phase3-107-release
```

## Non-goals

Phase 3 intentionally does not:

- improve CIDR math
- reconcile Engine 1 and Engine 2
- deepen routing simulation
- deepen security policy analysis
- change diagram layout
- create vendor configs
- create new AI authority
- pretend reports are final A-grade deliverables

Those belong to later phases.
