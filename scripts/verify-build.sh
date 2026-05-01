#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm run check:phase84-98-release
bash scripts/assert-release-discipline.sh

(
  cd backend
  npm ci --include=dev --no-audit --no-fund
  npx prisma generate
  npm run build
)

(
  cd frontend
  npm ci --include=dev --no-audit --no-fund
  npm run build
)

echo "Full build verification passed."
