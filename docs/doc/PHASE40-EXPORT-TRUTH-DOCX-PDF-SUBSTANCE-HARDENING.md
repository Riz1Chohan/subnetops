# Phase 40 — Export Truth / DOCX-PDF Substance Hardening

## Purpose

Phase 40 hardens SubnetOps exports so PDF, DOCX, and CSV preserve backend truth instead of producing decorative summaries.

Core rule:

> Backend decides truth. Frontend displays truth. Exports preserve truth.

## What changed

The backend export composer now adds a backend-authored Phase 40 export section to the shared professional report model. Because PDF and DOCX are generated from that shared report model, both formats now carry the same export truth tables.

The export now includes:

- backend readiness status
- `reportTruth`
- `diagramTruth`
- `implementationPlan`
- blocking findings
- review findings
- implementation review queue
- verification matrix
- rollback actions
- diagram truth and render model summary
- diagram render nodes and edges
- proof boundary and limitations

CSV export now includes matching truth rows for backend truth, implementation review queue, verification matrix, rollback actions, diagram truth, and proof boundary / limitations.

## Blocked-design wording

If backend implementation readiness is blocked, the export must say:

> This design is not implementation-ready.

That language is intentionally hard. A blocked backend design must not be softened into fake confidence in a PDF, DOCX, or CSV.

## Implementation review queue

The Phase 40 report section exports these fields:

- step
- category
- readiness
- risk
- blockers
- required evidence
- acceptance criteria
- rollback intent

## Verification matrix

The Phase 40 report section exports these fields:

- check type
- scope
- source engine
- readiness
- expected result
- required evidence
- acceptance criteria
- blocking steps
- failure impact

## Rollback actions

The Phase 40 report section exports these fields:

- rollback action
- trigger condition
- related steps
- rollback intent
- notes

## Diagram truth

The Phase 40 export summarizes:

- modeled devices
- modeled interfaces
- modeled links
- route domains
- security zones
- backend render nodes
- backend render edges
- overlay readiness
- hotspots
- empty-state reason when topology is incomplete

## Proof boundary

The export explicitly separates:

- what is modeled
- what is inferred
- what is proposed
- what is not proven
- what requires engineer review

This matters because SubnetOps is a planning platform, not a magic live-state oracle. Live device state, cabling, provider WAN behavior, production firewall state, vendor CLI syntax, and actual change-window success are not proven by an export.

## Static gate

Added:

```bash
node scripts/check-export-truth-hardening.cjs
```

The gate checks that the export layer contains backend truth, diagram truth, implementation plan truth, verification truth, rollback truth, blocked/review finding language, proof-boundary language, diagram render model summary, and hard blocked-design wording.
