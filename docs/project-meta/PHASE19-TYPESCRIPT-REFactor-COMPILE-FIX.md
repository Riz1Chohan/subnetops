# Phase 19 — TypeScript Refactor Compile Fix

## Purpose
Fix the backend build failure introduced by the larger design-core refactor.

## Render symptom
The backend deploy reached the new GitHub commit and then failed during `npm run build` with:

- `Cannot find name 'PLANNING_INPUT_AUDIT_ITEMS'`
- `Cannot find name 'parseJsonMap'`

## Fixes
- Restored the runtime import of `PLANNING_INPUT_AUDIT_ITEMS` in `backend/src/services/designCore.service.ts`.
- Added the missing `parseJsonMap` helper import in `backend/src/services/designCore/designCore.planningInputDiscipline.ts`.
- Corrected the local type import path in `designCore.planningInputDiscipline.ts`.
- Moved phase notes into `docs/project-meta/` so markdown phase documentation is not scattered in the root/source directory.

## Notes
This fixes a TypeScript compile issue. The earlier Prisma P3005 issue is separate and still requires using the temporary Render environment strategy for an existing non-empty DB if the database has not been recreated or baselined.
