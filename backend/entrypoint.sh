#!/bin/sh
set -e

PRISMA_SYNC_ON_BOOT="${PRISMA_SYNC_ON_BOOT:-false}"
PRISMA_SYNC_STRATEGY="${PRISMA_SYNC_STRATEGY:-push}"
DB_PUSH_ON_BOOT="${DB_PUSH_ON_BOOT:-false}"
SEED_DEMO_ON_BOOT="${SEED_DEMO_ON_BOOT:-false}"

npx prisma generate

if [ "$PRISMA_SYNC_ON_BOOT" = "true" ]; then
  if [ "$PRISMA_SYNC_STRATEGY" = "migrate" ]; then
    npx prisma migrate deploy
  else
    npx prisma db push
  fi
elif [ "$DB_PUSH_ON_BOOT" = "true" ]; then
  npx prisma db push
fi

if [ "$SEED_DEMO_ON_BOOT" = "true" ]; then
  npm run prisma:seed || true
fi

if [ "$NODE_ENV" = "production" ]; then
  if [ ! -f dist/server.js ]; then
    npm run build
  fi
  npm run start
else
  npm run dev
fi
