#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Cleaning generated artifacts from source tree..."

# Never package generated dependency/build outputs as source truth.
rm -rf \
  backend/dist \
  frontend/dist \
  backend/node_modules \
  frontend/node_modules \
  node_modules \
  frontend/.vite \
  backend/.turbo \
  frontend/.turbo \
  .turbo \
  .npm-cache

# TypeScript incremental build artifacts can make a source zip look falsely prebuilt.
find . -type f \( -name '*.tsbuildinfo' -o -name '.tsbuildinfo' \) -delete

# Keep local env/examples and lockfiles. Do not remove source, prisma migrations, or package locks.
echo "Generated artifact cleanup complete."
