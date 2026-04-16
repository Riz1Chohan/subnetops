# SubnetOps v83 Notes

## Focus
Backend-shared persistence for the discovery and platform/BOM foundations.

## What changed

### Shared project persistence
- Added `discoveryJson` and `platformProfileJson` fields to the `Project` model.
- Extended project create/update validation to accept these payloads.
- Project duplication now carries these fields forward.

### Discovery workspace
- Discovery notes now resolve from **shared project data first**.
- Local storage remains as a fallback and migration safety net.
- Saving discovery notes now writes to the project record and also refreshes local fallback storage.
- Clearing discovery notes now clears the shared project payload.

### Platform Profile & BOM workspace
- Platform/BOM profile now resolves from **shared project data first**.
- Local storage remains as a fallback and migration safety net.
- Saving platform profile now writes to the project record and refreshes local fallback storage.
- Clearing the profile now clears the shared project payload.

### Logical Design and Report
- These views now read discovery and platform/BOM state from the project record when available, instead of relying only on browser-local storage.

## Main files changed
- `backend/prisma/schema.prisma`
- `backend/src/validators/project.schemas.ts`
- `backend/src/services/project.service.ts`
- `frontend/src/lib/types.ts`
- `frontend/src/features/projects/api.ts`
- `frontend/src/lib/discoveryFoundation.ts`
- `frontend/src/lib/platformBomFoundation.ts`
- `frontend/src/pages/ProjectDiscoveryPage.tsx`
- `frontend/src/pages/ProjectPlatformBomPage.tsx`
- `frontend/src/pages/ProjectOverviewPage.tsx`
- `frontend/src/pages/ProjectReportPage.tsx`

## Validation done here
- TypeScript transpile checks passed for all changed TS/TSX files.

## Important deployment note
This version changes the Prisma schema.
Before a full backend deploy/test, the environment must run the normal Prisma update flow so the new project columns exist and the Prisma client is regenerated.
