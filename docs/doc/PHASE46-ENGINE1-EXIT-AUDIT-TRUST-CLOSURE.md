# Phase 46 — Engine 1 Exit Audit / Trust Closure

Phase 46 closes the remaining Engine 1 trust gaps without expanding into routing, security, implementation planning, or live discovery.

## Engine 1 Exit Audit scope

Engine 1 owns CIDR math, canonical subnet facts, usable-host behavior, gateway validation, buffered capacity planning, explicit/inferred segment-role truth, parent-block containment, deterministic allocation proposals, and readable explanation output.

Phase 46 verifies that useful Engine 1 facts are not merely computed and abandoned. They must be carried into typed backend output, typed frontend models, frontend review UI, diagram metadata where site/VLAN/CIDR data affects rendering, exports/reports, and documentation.

## Trust-closure fixes

- Replaced frontend `proposedRows: unknown[]` with a typed `DesignCoreProposalRow` model.
- Added an Engine 1 proposal review table on the addressing page.
- Added a production Prisma migration for the saved VLAN `segmentRole` column.
- Preserved `segmentRole` during project duplication.
- Added `PRINTER` and `CAMERA` to the VLAN validator and frontend role selector.
- Expanded CSV export notes with Engine 1 explanation, role source/confidence, required usable hosts, recommended prefix, gateway state, capacity state, and site-block placement.
- Expanded report recommendations with role truth, proposed range, headroom, and allocator explanation.
- Added `check:engine1-exit-audit` to prove the trust-closure wiring statically.

## Remaining proof required before true release-grade promotion

Run these in a normal install environment:

```bash
npm run check:engine1-cidr-output
npm run check:engine1-cidr
npm run check:engine1-final-trust
npm run check:engine1-exit-audit
cd backend && npm run build
cd frontend && npm run build
```

If `tsx: Permission denied` appears, inspect `backend/node_modules/.bin/tsx`, reinstall dependencies without a broken cache, and avoid judging Engine 1 source correctness from a sandbox permission failure.

## Exit-audit verdict

Engine 1 is now closer to A-grade because backend CIDR truth is typed, explained, surfaced, preserved, and exported. Do not move to Engine 2 until clean backend and frontend builds are proven.
