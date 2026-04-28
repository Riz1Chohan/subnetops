# Phase 36B — Graph-Driven Implementation Dependency Compiler

## Purpose

Phase 36B hardens the Phase 36 implementation planning engine. Phase 36 created engineer-facing implementation steps; Phase 36B makes those steps depend on exact backend-modeled objects instead of broad category-level gates.

The engine no longer accepts weak logic like:

```text
Security depends on routing generally.
```

It now resolves dependencies through backend design graph/object-model relationships such as:

```text
Internal-to-WAN egress depends on:
- source/destination security zones
- zone-bound routed interfaces
- route-domain route intent
- NAT review coverage
- graph edges tying the flow to the implementation step
```

## Backend changes

Phase 36B adds:

- `ImplementationDependencyGraph`
- `ImplementationDependencyGraphEdge`
- `ImplementationPlanStep.dependencyObjectIds`
- `ImplementationPlanStep.graphDependencyEdgeIds`
- `ImplementationPlanSummary.graphDependencyEdgeCount`
- `ImplementationPlanSummary.graphBackedStepDependencyCount`
- `ImplementationPlanSummary.preciseSecurityDependencyCount`

## Engine behavior

The implementation engine now builds dependency context from:

- backend design graph nodes and edges
- source and destination security zones
- zone-bound interfaces
- route domains
- route intents
- NAT reviews
- security flow requirements
- upstream graph/routing/security findings

Security and NAT implementation steps now receive graph-derived dependencies where available. The engine no longer relies on the old broad route-slice dependency shortcut for security flows.

## Guardrail

If a security flow cannot resolve exact graph-driven interface or route prerequisites, the step is marked for engineer review with a specific reason. The engine does not silently pretend that generic routing readiness is enough.

## Selftest coverage

The Phase 36 selftest now also proves Phase 36B behavior:

- implementation steps still carry evidence, blast-radius, and rollback metadata
- route steps depend on exact next-hop interface steps
- security flow steps depend on source-zone interface and exact egress route steps
- NAT steps depend on source-zone interface and covered flow context
- uncovered NAT-required flows remain blocked
- dependency graph and precise security dependency counts are exposed in the summary

## Still not vendor commands

This phase does not generate Cisco, Palo Alto, Fortinet, Juniper, or Linux commands.

That is intentional. The engine remains implementation-neutral until the dependency model is strong enough for vendor translation.

## Remaining work

Next hardening phases:

1. Phase 36C — Operational Safety / Device-Level Change Plan
2. Phase 36D — Verification Matrix + Selftest Expansion
3. Phase 36E — Build / Runtime / Release Proof
4. Phase 37 — Report + Diagram Truth
