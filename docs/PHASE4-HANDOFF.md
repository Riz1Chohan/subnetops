# SubnetOps Phase 4 Handoff — Production Hardening

Phase 4 focused on production hardening only. No planner workflow, UI redesign, or feature expansion was included.

## Completed

### 1. Prisma production posture changed from `db push` to migrations
- Added baseline migration:
  - `backend/prisma/migrations/20260425160000_init/migration.sql`
- Updated backend startup script:
  - `backend/entrypoint.sh`
- Render now uses:
  - `PRISMA_SYNC_STRATEGY=migrate`
  - `ALLOW_UNSAFE_DB_PUSH=false`
- `prisma db push` is now blocked at startup unless explicitly allowed with `ALLOW_UNSAFE_DB_PUSH=true`.

### 2. CSRF protection added for cookie-auth API requests
- Added:
  - `backend/src/middleware/csrf.ts`
- Added endpoint:
  - `GET /api/auth/csrf`
- Frontend API client now automatically initializes and sends `X-CSRF-Token` for unsafe requests.

### 3. Password reset delivery improved
- Password reset requests now queue a password-reset email through the existing email outbox.
- Real delivery works when SMTP settings and `SEND_REAL_EMAILS=true` are configured.
- Production still does not expose reset tokens in API responses.
- Added `FRONTEND_APP_URL` so reset links point to the frontend reset page.

### 4. Render environment hardened
- Added `FRONTEND_APP_URL`.
- Switched Prisma sync strategy to `migrate`.
- Added `ALLOW_UNSAFE_DB_PUSH=false`.

## Critical deployment note for an existing Render database

If the existing Render database was already created with `prisma db push`, do not blindly deploy migrations without baselining. First mark the baseline migration as already applied:

```bash
cd backend
npx prisma migrate resolve --applied 20260425160000_init
```

Then deploy normally with:

```bash
npx prisma migrate deploy
```

For a brand-new empty database, no baseline command is needed. `npx prisma migrate deploy` can apply the migration directly.

## Remaining caveat

A real backend `package-lock.json` was still not generated because npm dependency resolution stalled in this sandbox. Generate it locally with:

```bash
cd backend
npm install --package-lock-only --ignore-scripts --include=dev
```

Then commit `backend/package-lock.json`.
