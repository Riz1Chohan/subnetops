#!/bin/sh
set -e

PRISMA_SYNC_ON_BOOT="${PRISMA_SYNC_ON_BOOT:-true}"
PRISMA_SYNC_STRATEGY="${PRISMA_SYNC_STRATEGY:-migrate}"
PRISMA_GENERATE_ON_BOOT="${PRISMA_GENERATE_ON_BOOT:-false}"
ALLOW_UNSAFE_DB_PUSH="${ALLOW_UNSAFE_DB_PUSH:-false}"
DB_PUSH_ON_BOOT="${DB_PUSH_ON_BOOT:-false}"
SEED_DEMO_ON_BOOT="${SEED_DEMO_ON_BOOT:-false}"

# Controlled recovery for databases that were previously created with
# `prisma db push` and therefore have tables but no Prisma migration history.
# This is intentionally opt-in. Do not leave it enabled long-term.
PRISMA_BASELINE_EXISTING_DB="${PRISMA_BASELINE_EXISTING_DB:-false}"

if [ "$PRISMA_GENERATE_ON_BOOT" = "true" ]; then
  echo "PRISMA_GENERATE_ON_BOOT=true: generating Prisma client at startup."
  npx prisma generate
fi

run_migrate_deploy() {
  npx prisma migrate deploy
}

recover_known_v1_migration_drift() {
  echo "Checking for known V1 brownfield migration drift..."
  if node ./scripts/recover-v1-brownfield-migration.mjs; then
    echo "Resolving Prisma history for 20260429103000_v1_brownfield_conflict_resolution."
    npx prisma migrate resolve --applied 20260429103000_v1_brownfield_conflict_resolution
    return 0
  fi

  recovery_status=$?
  if [ "$recovery_status" = "2" ]; then
    echo "No targeted V1 brownfield migration recovery was applicable."
  else
    echo "Targeted V1 brownfield migration recovery failed with status $recovery_status."
  fi
  return "$recovery_status"
}

if [ "$PRISMA_SYNC_ON_BOOT" = "true" ]; then
  if [ "$PRISMA_SYNC_STRATEGY" = "migrate" ]; then
    if run_migrate_deploy; then
      echo "Prisma migrations applied successfully."
    else
      status=$?
      echo "Prisma migrate deploy failed with status $status."

      if recover_known_v1_migration_drift; then
        echo "Retrying Prisma migrate deploy after targeted V1 migration recovery."
        run_migrate_deploy
      elif [ "$PRISMA_BASELINE_EXISTING_DB" = "true" ]; then
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
        echo "Migration failed. If this is an existing Render database previously created with prisma db push, either:"
        echo "  1) create a fresh empty database, or"
        echo "  2) temporarily set PRISMA_BASELINE_EXISTING_DB=true for one deploy, then set it back to false."
        echo "This deploy also checks for the known V1 brownfield relation-exists drift automatically."
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
    echo "Refusing production startup because dist/server.js is missing. Build the backend during the image or platform build step before starting production."
    exit 1
  fi
  npm run start
else
  npm run dev
fi
