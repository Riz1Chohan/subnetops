#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "Release discipline check failed: $1" >&2
  exit 1
}

[[ -f backend/package-lock.json ]] || fail "backend/package-lock.json is missing. Generate and commit it before deployment."
[[ -f frontend/package-lock.json ]] || fail "frontend/package-lock.json is missing."

if [[ -d frontend/dist ]]; then
  fail "frontend/dist is present in the source package. Render must build frontend artifacts from source."
fi

if grep -q "Using committed frontend dist\|test -f dist/index.html" render.yaml; then
  fail "render.yaml still deploys a committed frontend dist artifact."
fi

if ! grep -q "rootDir: frontend" render.yaml || ! grep -q "npm ci --include=dev --no-audit --no-fund && npm run build" render.yaml; then
  fail "frontend Render service must run npm ci and npm run build from frontend/."
fi

if ! grep -q "rootDir: backend" render.yaml || ! grep -q "npm ci --include=dev --ignore-scripts --no-audit --no-fund" render.yaml; then
  fail "backend Render service must use npm ci from backend/."
fi

if grep -R "SKIP_INSTALL_DEPS" render.yaml .npmrc backend/.npmrc frontend/.npmrc >/dev/null 2>&1; then
  fail "SKIP_INSTALL_DEPS/prebuilt-artifact shortcuts must not be present."
fi

echo "Release discipline checks passed."
