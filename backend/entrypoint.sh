#!/bin/sh
set -e

npx prisma generate

if [ "$DB_PUSH_ON_BOOT" = "true" ]; then
  npx prisma db push
fi

if [ "$SEED_DEMO_ON_BOOT" = "true" ]; then
  npm run prisma:seed || true
fi

if [ "$NODE_ENV" = "production" ]; then
  npm run build
  npm run start
else
  npm run dev
fi
