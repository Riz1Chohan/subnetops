# Phase 18 - Render Prisma P3005 Recovery

## Problem fixed

The backend build succeeds, but Render can fail during `./entrypoint.sh` with Prisma `P3005` because the production database is not empty and does not yet have Prisma migration history.

That usually means an older version created the database with `prisma db push`, then the newer deployment switched to `prisma migrate deploy`.

## Files changed

- `backend/entrypoint.sh`
- `render.yaml`
- `backend/.env.example`
- `backend/.env.production.example`
- `backend/package.json`

## How the fix works

The entrypoint still prefers the clean production path:

```env
PRISMA_SYNC_STRATEGY=migrate
```

But Render now has:

```env
PRISMA_BASELINE_EXISTING_DB=true
```

So if `prisma migrate deploy` hits the existing non-empty DB problem, the boot script marks the migration folders as already applied with:

```bash
npx prisma migrate resolve --applied <migration-name>
```

Then it retries:

```bash
npx prisma migrate deploy
```

## After one successful deploy

After Render boots successfully once, change this in Render:

```env
PRISMA_BASELINE_EXISTING_DB=false
PRISMA_SYNC_STRATEGY=migrate
ALLOW_UNSAFE_DB_PUSH=false
```

Do not leave baseline recovery enabled forever. It is a bridge from the old database state to the cleaner migration system.

## Ruthless note

This does not make the old database setup clean. It makes the transition controlled. The real clean approach is still a fresh database or a properly managed migration history from day one.
