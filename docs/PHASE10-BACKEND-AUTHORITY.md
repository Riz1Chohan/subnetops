# Phase 10 — Backend Authority and Engine Cleanup

Phase 10 is a conservative authority pass. It does not add product surface area. It reduces the risk that SubnetOps has two competing planning brains.

## Changed

- Split backend design-core service seams:
  - `backend/src/services/designCore/designCore.helpers.ts`
  - `backend/src/services/designCore/designCore.repository.ts`
- Kept `backend/src/services/designCore.service.ts` as the orchestrator for the design-core snapshot.
- Added frontend design-core API client:
  - `frontend/src/features/designCore/api.ts`
  - `frontend/src/features/designCore/hooks.ts`
  - `frontend/src/lib/designCoreSnapshot.ts`
- Added a frontend adapter:
  - `frontend/src/lib/designCoreAdapter.ts`
- Wired the Addressing and Report pages to fetch the backend design-core snapshot and apply backend-checked addressing rows over the browser preview model.
- Added `scripts/check-design-authority.cjs` and included it in `scripts/verify-build.sh`.

## Deliberately not done

The giant frontend `designSynthesis.ts` file was not rewritten in this phase. A full rewrite would be risky because diagrams, reports, platform/BOM, readiness, and recovery panels still depend on its shape.

The correct next move is to continue migrating final planning truth to backend snapshots page by page, not rip out the frontend model in one reckless pass.

## Authority rule after this phase

- Backend design core owns final addressing truth.
- Frontend synthesis remains a view-model/preview fallback.
- Addressing and report pages now prefer backend design-core rows once the snapshot is available.

## Remaining debt

- Diagram workspace still relies heavily on frontend synthesis.
- Frontend synthesis remains too large.
- Backend `designCore.service.ts` is still large even after the first split.
- More backend modules should be extracted in the next cleanup pass: allocator summary, standards evaluation, security intent, routing intent, and implementation readiness.
