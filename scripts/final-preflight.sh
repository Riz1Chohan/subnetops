#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm run check:phase84-98-release
bash scripts/assert-release-discipline.sh

if [[ "${RUN_FULL_BUILD:-0}" == "1" ]]; then
  bash scripts/verify-build.sh
else
  echo "Static preflight passed. Set RUN_FULL_BUILD=1 to run dependency install and full backend/frontend builds."
fi
