# Phase 16 — Diagram Truth / Renderer / Layout

Marker: `PHASE16_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT`

Role: `BACKEND_ONLY_DIAGRAM_RENDERER_NO_PRETTY_GARBAGE`

## Purpose

Phase 16 locks diagrams to backend truth. The canvas may lay out `diagramTruth.renderModel`, but it must not invent topology, hide weak proof, or imply permissions/readiness that backend design-core cannot prove.

This phase is deliberately not a cosmetic pass. Pretty diagrams built on weak data are polished trash.

## Contract

Every rendered visual element must obey the Requirements Propagation Contract:

Requirement input → normalized requirement signal → materialized source object OR explicit no-op/review reason → backend design-core input → engine-specific computation → traceability evidence → validation/readiness impact → frontend display → report/export impact → diagram impact where relevant → test/golden scenario proof.

## Backend controls added

- `designCore.phase16DiagramTruthControl.ts` creates `phase16DiagramTruth`.
- Every render node is checked for backend `objectId`, `sourceEngine`, `truthState`, and readiness.
- Every render edge is checked for `relatedObjectIds` or a backend relationship.
- Diagram modes now have declared contracts:
  - physical
  - logical
  - WAN/cloud
  - security
  - per-site
  - implementation
- Inferred or review-required evidence remains visible instead of being hidden behind a clean canvas.
- Phase 16 findings feed validation, report/export, CSV export, and the Project Diagram page.

## Do not do

- Do not create frontend-only engineering facts.
- Do not draw decorative links without backend relationship lineage.
- Do not let visual adjacency imply security permission.
- Do not show implementation confidence when Phase 13 or Phase 14 is blocked/review-required.
- Do not fake live topology discovery.

## Acceptance proof

Required checks:

```bash
npm run check:phase16-diagram-truth-renderer-layout
cd backend && npm run engine:selftest:phase16-diagram-truth
```

Full release chain:

```bash
npm run check:phase16-108-release
```
