# Phase 6 — Design-Core Orchestrator Engine

## Scope

Phase 6 adds the design-core orchestrator control surface. This is a control/boundary phase, not a feature expansion phase.

The marker is:

`PHASE6_DESIGN_CORE_ORCHESTRATOR_CONTRACT`

## Ruthless rule

Design-core is a coordinator, not a dumping ground.

The orchestrator may assemble, order, reconcile, and expose engine outputs. It must not become a god-file that invents new engineering facts directly in the snapshot return body, in frontend routes, in report builders, or in diagram renderers.

The contract role is:

`DESIGN_CORE_COORDINATOR_NOT_GOD_FILE`

## Canonical snapshot sections

Phase 6 declares the named backend snapshot sections that downstream consumers must use:

| Section | Purpose |
|---|---|
| `sourceInputs` | Normalized planning inputs, requirement lineage, source/confidence labels |
| `materializedObjects` | Phase 2 materialization outcomes, no-op reasons, review reasons |
| `addressingTruth` | Engine 1 CIDR/addressing planner truth |
| `enterpriseIpamTruth` | Engine 2 durable IPAM authority and reconciliation |
| `standardsTruth` | Standards/rulebook context and blockers |
| `objectModelTruth` | Backend network devices, interfaces, links, zones, policy/DHCP/reservation objects |
| `graphTruth` | Design graph relationships, dependencies, and integrity findings |
| `routingTruth` | Routing/segmentation intent and review-gated reachability evidence |
| `securityTruth` | Security policy flow, NAT, logging, broad-policy, and review evidence |
| `implementationTruth` | Implementation plan, verification, rollback, and vendor-neutral templates |
| `reportTruth` | Backend report/export truth boundary |
| `diagramTruth` | Backend diagram truth/render boundary |
| `readinessTruth` | Aggregated design review and implementation execution readiness |

## Required coordination path

The canonical path is:

```text
sourceInputs
→ materializedObjects
→ addressingTruth
→ enterpriseIpamTruth
→ objectModelTruth
→ graphTruth
→ routingTruth
→ securityTruth
→ implementationTruth
→ reportTruth / diagramTruth
→ readinessTruth
```

This path prevents fake authority. A frontend component, export section, or diagram view cannot skip the backend snapshot and compute engineering truth alone.

## Requirement context rule

Every orchestrator section must carry requirement-context evidence from at least one of:

```text
phase1TraceabilityControl.requirementLineage
phase2RequirementsMaterialization.fieldOutcomes
phase3RequirementsClosure.closureMatrix
```

That means a downstream engine should receive requirement context from the snapshot/control surface, not scrape random project fields.

## What Phase 6 adds

New backend builder:

```text
backend/src/services/designCore/designCore.phase6DesignCoreOrchestratorControl.ts
```

New selftest surface:

```text
backend/src/lib/phase6DesignCoreOrchestrator.selftest.ts
```

New snapshot field:

```text
phase6DesignCoreOrchestrator
```

The snapshot field exposes:

```text
contractVersion
orchestratorRole
coordinatorRule
requirementContextPaths
sectionRows
dependencyEdges
boundaryFindings
frontendIndependentTruthRiskCount
requirementContextGapCount
reportContextGapCount
diagramContextGapCount
readinessContextGapCount
overallReadiness
notes
```

## Section row contract

Every section row declares:

```text
sectionKey
label
snapshotPath
ownerEngine
sourceType
inputPaths
outputPaths
downstreamConsumers
requirementContextRequired
requirementContextEvidence
reportImpact
diagramImpact
validationReadinessImpact
proofGates
present
itemCount
reviewCount
blockerCount
readiness
notes
```

## Dependency edge contract

Every dependency edge declares:

```text
sourceSectionKey
targetSectionKey
relationship
required
evidence
```

Important dependency examples:

```text
sourceInputs → materializedObjects
materializedObjects → addressingTruth
addressingTruth → enterpriseIpamTruth
enterpriseIpamTruth → objectModelTruth
objectModelTruth → graphTruth
graphTruth → routingTruth
routingTruth → securityTruth
securityTruth → implementationTruth
objectModelTruth → diagramTruth
implementationTruth → reportTruth
reportTruth → readinessTruth
```

## Validation impact

Phase 6 exposes boundary findings to validation:

```text
DESIGN_CORE_ORCHESTRATOR_SECTION_MISSING
DESIGN_CORE_ORCHESTRATOR_SECTION_BLOCKED
DESIGN_CORE_ORCHESTRATOR_SECTION_REVIEW_REQUIRED
```

A missing required snapshot section is blocking because downstream consumers would otherwise be tempted to invent missing truth.

## Report/export impact

Reports and CSV exports now include:

```text
Phase 6 Design-Core Orchestrator Contract
Phase 6 Snapshot Boundary Sections
Phase 6 Orchestrator Dependency Edges
Phase 6 Boundary Findings
```

## Frontend impact

Project Overview now shows the Phase 6 orchestrator ledger under the traceability section. It displays backend section rows, dependency edges, and boundary findings.

The frontend is only a consumer. It is not allowed to compute authoritative design truth independently.

## Acceptance proof

Run:

```bash
npm run check:phase6-design-core-orchestrator
npm run check:phase6-107-release
```

Backend selftest script added:

```bash
cd backend
npm run engine:selftest:phase6-design-core-orchestrator
```

## Do not do in Phase 6

Do not upgrade routing logic. That is Phase 11.

Do not upgrade security policy flow. That is Phase 12.

Do not rewrite reports. That is Phase 15.

Do not rewrite diagram layout. That is Phase 16.

Do not touch BOM, discovery, or AI.

Phase 6 is about orchestration discipline and snapshot boundaries only.
