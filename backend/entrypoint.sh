#!/bin/sh
set -e

PRISMA_SYNC_ON_BOOT="${PRISMA_SYNC_ON_BOOT:-true}"
PRISMA_SYNC_STRATEGY="${PRISMA_SYNC_STRATEGY:-migrate}"
ALLOW_UNSAFE_DB_PUSH="${ALLOW_UNSAFE_DB_PUSH:-false}"
DB_PUSH_ON_BOOT="${DB_PUSH_ON_BOOT:-false}"
SEED_DEMO_ON_BOOT="${SEED_DEMO_ON_BOOT:-false}"

npx prisma generate

if [ "$PRISMA_SYNC_ON_BOOT" = "true" ]; then
  if [ "$PRISMA_SYNC_STRATEGY" = "migrate" ]; then
    npx prisma migrate deploy
  elif [ "$PRISMA_SYNC_STRATEGY" = "push" ] && [ "$ALLOW_UNSAFE_DB_PUSH" = "true" ]; then
    echo "WARNING: running prisma db push on boot because ALLOW_UNSAFE_DB_PUSH=true"
    npx prisma db push
  else
    echo "Refusing unsafe Prisma sync strategy: $PRISMA_SYNC_STRATEGY"
    echo "Use PRISMA_SYNC_STRATEGY=migrate for production or ALLOW_UNSAFE_DB_PUSH=true for a temporary non-production push."
    exit 1
  fi
elif [ "$DB_PUSH_ON_BOOT" = "true" ]; then
  if [ "$ALLOW_UNSAFE_DB_PUSH" = "true" ]; then
    echo "WARNING: running legacy DB_PUSH_ON_BOOT because ALLOW_UNSAFE_DB_PUSH=true"
    npx prisma db push
  else
    echo "Refusing legacy DB_PUSH_ON_BOOT without ALLOW_UNSAFE_DB_PUSH=true"
    exit 1
  fi
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
