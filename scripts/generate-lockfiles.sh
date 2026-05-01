#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

(
  cd "$ROOT_DIR/backend"
  npm install --package-lock-only --include=dev --no-audit --no-fund
)

(
  cd "$ROOT_DIR/frontend"
  npm install --package-lock-only --include=dev --no-audit --no-fund
)

echo "Lockfiles regenerated."
