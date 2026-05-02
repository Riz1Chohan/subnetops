# Phase 1 — Planning Input Discipline / Traceability

Marker: `PHASE_1_PLANNING_INPUT_DISCIPLINE_TRACEABILITY`

Phase 1 implements the first real repair after Phase 0. This is still a control phase. It does not add routing depth, diagram polish, report content expansion, BOM logic, discovery importers, or AI authority.

## Boundary

Phase 1 strengthens the guardrail engine:

- `backend/src/lib/planningInputAudit.ts`
- `backend/src/services/designCore/designCore.planningInputDiscipline.ts`
- `backend/src/services/designCore/designCore.traceability.ts`
- `backend/src/services/designCore/designCore.phase1TraceabilityControl.ts`
- `backend/src/services/designCore.service.ts`
- `frontend/src/lib/designCoreSnapshot.ts`
- `frontend/src/pages/ProjectOverviewPage.tsx`

The goal is to make source, proof, confidence, lineage, and consumer paths explicit before touching deeper engines.

## Requirements Propagation Contract

Every changed engine behavior must still obey the full chain:

1. Requirement input
2. normalized requirement signal
3. materialized source object OR explicit no-op/review reason
4. backend design-core input
5. engine-specific computation
6. traceability evidence
7. validation/readiness impact
8. frontend display
9. report/export impact
10. diagram impact where relevant
11. test/golden scenario proof

If a feature cannot show where it fits in that chain, it does not get added.

No ghost outputs.  
No frontend-only engineering facts.  
No computed-but-unused fields.  
No fake confidence.  
No default survey value pretending to be user intent.  
No report saying something the backend cannot prove.

## Universal truth/source labels

Phase 1 defines the source labels that every major backend output group must use:

| Label | Meaning |
|---|---|
| `USER_PROVIDED` | Saved by the user as explicit input. This is not enough by itself to become implementation authority. |
| `REQUIREMENT_MATERIALIZED` | Created or strengthened by the backend materializer from a captured requirement signal. |
| `BACKEND_COMPUTED` | Computed by backend design-core or engine logic from source objects and validated inputs. |
| `ENGINE2_DURABLE` | Owned by durable enterprise IPAM records, approvals, conflicts, and ledger state. |
| `INFERRED` | Inferred by backend logic and must be visibly labelled. It is not implementation authority by itself. |
| `ESTIMATED` | Estimate/sizing assumption. Must expose basis and confidence. |
| `IMPORTED` | Imported or manually entered current-state evidence. Must be reconciled before it becomes validated discovery. |
| `REVIEW_REQUIRED` | Captured or computed evidence exists, but the backend cannot prove the authoritative chain yet. |
| `UNSUPPORTED` | Known field or expectation that is intentionally not design-driving in the current engine. |

## Required source/proof fields

Phase 1 adds or enforces these fields on traceability and planning-discipline outputs:

- `sourceType`
- `sourceRequirementIds`
- `sourceObjectIds`
- `sourceEngine`
- `confidence`
- `proofStatus`
- `reviewReason`
- `consumerPath`
- `propagationLifecycleStatus`

This is the minimum acceptable proof label set. A row without these fields is not trusted as a design-control row.

## Requirement lineage rule

Every requirement-driven output must be explainable as:

`requirementId → design object → engine output → UI/report/diagram consumer`

When the chain cannot be proven, the output must say one of these explicitly:

- `Captured but not currently design-driving`
- `Requires manual review`

This is the difference between honest planning software and fake confidence.

## Snapshot addition

Phase 1 adds `phase1TraceabilityControl` to the backend design-core snapshot. It contains:

- `sourceTypePolicy`
- `outputLabels`
- `requirementLineage`
- `outputLabelCoverage`
- `requirementLineageCoverage`
- `notes`

The output label ledger covers the major backend output groups:

- traceability
- planning input discipline
- requirements impact closure
- requirements scenario proof
- site blocks
- addressing rows
- allocator proposal rows
- site summaries
- transit plan
- loopback plan
- network object model
- routing/segmentation
- security policy flow
- implementation plan
- vendor-neutral templates
- standards alignment
- report truth
- diagram truth
- enterprise allocator posture

## Frontend display

`ProjectOverviewPage` now exposes a `Phase 1 truth source ledger` panel in the traceability section. This is deliberately not decorative. It surfaces:

- label coverage
- review-required output count
- captured lineage count
- fully propagated lineage count
- output source type
- proof status
- confidence
- consumer path
- review reason

No frontend-only engineering fact was added. The page only renders the backend `phase1TraceabilityControl` snapshot.

## What Phase 1 does not fix yet

Phase 1 does not claim that every engine is now A-grade. It only makes the proof labels explicit so the later repairs cannot hide weak lineage.

Still left for later phases:

- deeper requirements materialization policy repair;
- full requirement closure proof by golden scenario;
- Engine 1 addressing hardening against every requirement-driven sizing path;
- Engine 2 durable IPAM reconciliation;
- standards/validation/object/routing/security/implementation/report/diagram hardening.

## Acceptance proof

The release gate is:

```bash
npm run check:phase1-planning-traceability
npm run check:phase1-107-release
```

The first check verifies that Phase 1 source/proof labels, lineage fields, frontend rendering, documentation, package scripts, and Phase 0 anchoring exist. The second check chains Phase 1 through the Phase 0 and Phase 84–107 static release gates.

## Verdict

Phase 1 is not a flashy feature. Good. Flashy would be trash here.

The repair target is trust discipline. After this phase, the product has a stricter vocabulary for where outputs came from, whether they are proven, what consumed them, and why they still require review.
