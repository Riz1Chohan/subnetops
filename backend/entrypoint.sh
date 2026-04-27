#!/bin/sh
set -e

PRISMA_SYNC_ON_BOOT="${PRISMA_SYNC_ON_BOOT:-true}"
PRISMA_SYNC_STRATEGY="${PRISMA_SYNC_STRATEGY:-migrate}"
ALLOW_UNSAFE_DB_PUSH="${ALLOW_UNSAFE_DB_PUSH:-false}"
DB_PUSH_ON_BOOT="${DB_PUSH_ON_BOOT:-false}"
SEED_DEMO_ON_BOOT="${SEED_DEMO_ON_BOOT:-false}"

# Controlled recovery for Render databases that were previously created with
# `prisma db push` and therefore have tables but no Prisma migration history.
# This is intentionally opt-in. Do not leave it enabled long-term.
PRISMA_BASELINE_EXISTING_DB="${PRISMA_BASELINE_EXISTING_DB:-false}"

npx prisma generate

run_migrate_deploy() {
  npx prisma migrate deploy
}

if [ "$PRISMA_SYNC_ON_BOOT" = "true" ]; then
  if [ "$PRISMA_SYNC_STRATEGY" = "migrate" ]; then
    if run_migrate_deploy; then
      echo "Prisma migrations applied successfully."
    else
      status=$?
      echo "Prisma migrate deploy failed with status $status."
      if [ "$PRISMA_BASELINE_EXISTING_DB" = "true" ]; then
        echo "PRISMA_BASELINE_EXISTING_DB=true: marking existing migrations as applied, then retrying migrate deploy."
        for migration_dir in prisma/migrations/*; do
          if [ -d "$migration_dir" ]; then
            migration_name="$(basename "$migration_dir")"
            echo "Baselining migration: $migration_name"
            npx prisma migrate resolve --applied "$migration_name" || true
          fi
        done
        run_migrate_deploy
      else
        echo "Migration failed. If this is an existing Render DB previously created with prisma db push, either:"
        echo "  1) create a fresh empty database, or"
        echo "  2) temporarily set PRISMA_BASELINE_EXISTING_DB=true for one deploy, then set it back to false."
        exit "$status"
      fi
    fi
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
