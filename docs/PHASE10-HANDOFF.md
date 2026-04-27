# Phase 10 Handoff

## Package state

Phase 10 creates the first real backend-authority seam.

## Main files changed

- `backend/src/services/designCore.service.ts`
- `backend/src/services/designCore/designCore.helpers.ts`
- `backend/src/services/designCore/designCore.repository.ts`
- `frontend/src/features/designCore/api.ts`
- `frontend/src/features/designCore/hooks.ts`
- `frontend/src/lib/designCoreSnapshot.ts`
- `frontend/src/lib/designCoreAdapter.ts`
- `frontend/src/pages/ProjectAddressingPage.tsx`
- `frontend/src/pages/ProjectReportPage.tsx`
- `scripts/check-design-authority.cjs`
- `scripts/verify-build.sh`

## Verification performed in this environment

- Relative import check passed.
- Design authority seam check passed.
- TypeScript syntax transpilation check passed on changed files.

## Verification not completed here

Full frontend/backend builds were not completed because the package still depends on external dependency installation and the backend lockfile must still be generated in a normal npm environment.

Run this on a real development machine:

```bash
scripts/generate-lockfiles.sh
./scripts/verify-build.sh
```

Commit generated lockfiles after successful verification.

## Next phase

Phase 11 should be security and data-integrity hardening:

- rate limiting
- one-time password reset tokens
- production secret enforcement
- owner-invite protection
- Prisma transactions for multi-step writes
