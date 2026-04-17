# v84 Notes

## Focus
This version folds the Prisma schema update workflow into the project itself so schema changes are not left as a manual reminder after backend model updates.

## What changed
- added backend package scripts for one-step Prisma update flow
  - `npm run prisma:update`
  - `npm run prisma:update:dev`
  - `npm run prisma:push`
  - `npm run prisma:migrate:deploy`
- updated backend startup entrypoint to:
  - always run `prisma generate`
  - optionally sync schema on boot through `PRISMA_SYNC_ON_BOOT`
  - support `PRISMA_SYNC_STRATEGY=push|migrate`
  - avoid rebuilding production if `dist/server.js` already exists
- updated Render backend startup to use `./entrypoint.sh`
- added Prisma sync environment variables to example env files
- updated local/deploy docs with the built-in Prisma update flow
- updated the verification script to use the one-step Prisma update command

## Result
Versions that change the Prisma schema now have a built-in update path for:
- local backend verification
- container startup
- Render startup

## Current default behavior
This starter still defaults to:
- Prisma client generation
- schema sync with `prisma db push`

That matches the current repo workflow.

## Future-ready path
The startup flow now also supports a later migration-based release model by switching:
- `PRISMA_SYNC_STRATEGY=migrate`

once reviewed migration files are introduced.
