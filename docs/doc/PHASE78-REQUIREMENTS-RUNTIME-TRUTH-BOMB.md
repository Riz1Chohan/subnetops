# Phase 78 — Requirements Runtime Truth Bomb

Phase 78 responds to the deployed Phase 77 failure where saved requirements still produced 0 materialized sites, 0 VLAN/segment rows, and 0 addressing rows in the generated report.

## What changed

- Added a backend runtime proof service with release marker `PHASE_78_REQUIREMENTS_RUNTIME_TRUTH_BOMB`.
- Added direct runtime proof endpoint: `GET /api/projects/:projectId/requirements-runtime-proof`.
- Updated Save Requirements so it returns `runtimeProofBefore` and `runtimeProofAfter`.
- Save Requirements now hard-fails if the after-save proof does not show durable Site/VLAN/addressing rows in the same Prisma database used by design-core and report export.
- Health endpoints now return the Phase 78 release marker so stale backend deployments are visible.
- Frontend now rejects a save response that does not contain Phase 78 runtime proof, shows exact backend error messages, and displays runtime proof counts.

## Why this matters

A green Save Requirements toast is worthless if the report still says 0 materialized sites. Phase 78 makes that impossible to hide. Either durable rows exist and the runtime proof says pass, or the save visibly fails.

## Acceptance behavior

For the 10-site scenario, the save response must include:

- Phase marker: `PHASE_78_REQUIREMENTS_RUNTIME_TRUTH_BOMB`
- `runtimeProofAfter.status = pass`
- `runtimeProofAfter.counts.sites >= 10`
- `runtimeProofAfter.counts.vlans > 0`
- `runtimeProofAfter.counts.addressingRows > 0`

If those values are not true, the backend must return an error and the frontend must display that exact failure instead of claiming the requirements were saved.
