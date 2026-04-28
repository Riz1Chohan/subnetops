# Phase 39 — Backend Diagram Render Model / Canvas Authority

## Goal
Phase 39 moves the actual diagram canvas closer to backend authority. Phase 38 made report/diagram truth summaries backend-owned. Phase 39 adds a backend-authored render model so the canvas can render backend nodes, edges, groups, overlays, readiness, and findings instead of depending primarily on frontend display synthesis.

## What changed

### Backend diagram render model
The backend `BackendDiagramTruthModel` now includes `renderModel`.

The render model includes:
- backend-authored render nodes
- backend-authored render edges
- backend render groups
- backend overlay bindings
- deterministic layout coordinates
- empty-state proof when topology objects are incomplete

The render model declares:
- `backendAuthored: true`
- `layoutMode: backend-deterministic-grid`

### Backend render-node readiness
Render-node readiness is derived from backend truth sources:
- design graph findings
- routing findings
- security findings
- implementation findings
- implementation step readiness
- verification check readiness

This prevents the canvas from looking clean while backend engines have blockers.

### Frontend backend-authoritative canvas
Added:
- `frontend/src/features/diagram/components/BackendDiagramCanvas.tsx`

The diagram page now renders the backend render model when present. The older `ProjectDiagram` canvas remains only as an explicitly labeled legacy fallback if the backend render model is unavailable.

### Export alignment
The report export now includes a Phase 39 backend diagram render model summary table with node, edge, group, overlay, backend-authored, and layout proof fields.

### Static gate
Added:
- `scripts/check-backend-diagram-render-model.cjs`

The check proves:
- backend render model types exist
- backend render model builder exists
- diagram truth exposes `renderModel`
- frontend snapshot types know the render model
- frontend truth helper prefers backend render model
- diagram page renders `BackendDiagramCanvas`
- legacy fallback is clearly labeled
- export includes render-model summary

## Why this matters
The diagram canvas is no longer merely a visual interpretation layer. It now has a backend-owned render model that carries the objects, relationships, readiness states, and finding links the canvas should display.

This is still vendor-neutral and not live-discovery-driven. That is intentional. The point of this phase is truth ownership, not device configuration generation.

## Remaining gaps
The backend now owns the render model, but the visual layout is still basic and deterministic. A later UX/design pass can improve visual routing, grouping, and iconography without changing who owns truth.

Recommended next candidates:
- Phase 40: export truth hardening / DOCX-PDF substance
- Phase 41: scenario library and edge-case matrix
- Phase 42: vendor-neutral implementation templates

## Verification
Run:

```bash
npm run check:backend-diagram-render-model
npm run verify
```
