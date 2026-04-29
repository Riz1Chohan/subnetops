# Phase 62 — Requirements Impact Traceability Hardening

## Purpose

Phase 61 fixed the worst product-flow failure: saved requirements now create real Sites and VLANs. Phase 62 hardens the next layer of trust: every requirement field in the guided planner is inventoried and exposed as requirement-to-output traceability.

The goal is simple: no requirement should sit in `requirementsJson` as dead survey data.

## What changed

### 1. Full requirement inventory

The guided requirements profile currently contains 83 fields. Phase 62 adds `backend/src/services/requirementsImpactRegistry.ts` as the registry of record for those fields.

Each registry row declares:

- requirement key
- human label
- planning category
- direct/indirect/evidence impact level
- affected output areas
- materialization targets
- design consequence
- validation evidence expectation
- diagram evidence expectation
- report evidence expectation

This makes the product honest. If a field exists, the backend now has a declared reason for keeping it.

### 2. Backend traceability now covers all requirement fields

`designCore.traceability.ts` now builds traceability from the impact registry instead of only exposing a short hand-picked list.

That means the design-core snapshot can explain all saved planner fields, including:

- site count and users per site
- guest, management, wireless, voice, printers, IoT, cameras
- remote access, dual ISP, cloud/hybrid fields
- addressing hierarchy, site block strategy, gateway convention, growth buffers
- naming, physical layout, operations, implementation constraints, report audience

### 3. Requirements coverage exposes the inventory

`designCore.requirementsCoverage.ts` now returns a field inventory and summary counts:

- total requirement fields
- captured fields
- direct-impact fields
- indirect-impact fields
- evidence-only fields

This lets the frontend/report distinguish real design drivers from review-only evidence.

### 4. Requirements materialization summary is more honest

The materializer now reports impact inventory count and captured direct-impact count. It also uses the registry keys instead of claiming that arbitrary JSON keys were consumed.

### 5. Frontend design package can display backend traceability

The backend snapshot type now includes traceability and requirement coverage. The backend view model maps backend traceability into the existing design-package traceability table, so the UI can show why outputs exist.

### 6. Removed visible internal development wording

User-facing diagram and requirements copy no longer exposes internal version/recovery wording such as `v117-v120`, `v108`, `v109 workspace`, or recovery-pass language.

## Brutal assessment

This phase does not magically make every requirement a perfect engineering calculation. That would be dishonest. What it does is force the system to stop hiding weakness.

Every field now has one of these visible postures:

- direct design impact
- indirect design/review impact
- captured evidence for report/review

That is the correct foundation for the next hardening pass: converting more indirect fields into direct calculations, validation blockers, diagram objects, and report sections.

## Verification

Added static gate:

```bash
npm run check:phase62-requirements-impact-traceability
```

The gate proves:

- all 83 `RequirementsProfile` fields exist in the backend impact registry
- the backend traceability engine uses the registry
- requirements coverage exposes field inventory
- materialization reports impact inventory and direct impact count
- frontend snapshot/view model can display backend traceability
- known internal version/recovery strings are not visible in the checked user-facing files
```
