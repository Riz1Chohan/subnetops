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

if [[ -d backend/dist ]]; then
  fail "backend/dist is present in the source package. Render must build backend artifacts from source."
fi

release_root="$(basename "$ROOT_DIR")"
if [[ "$release_root" =~ phase13|phase14|phase15|phase16|phase17|phase18|phase19|phase20|phase21|phase22|phase23|phase24 ]]; then
  fail "release root folder name is stale: $release_root. Rename the package root for the current release."
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

if grep -q "SKIP_INSTALL_DEPS" render.yaml .npmrc backend/.npmrc frontend/.npmrc >/dev/null 2>&1; then
  fail "SKIP_INSTALL_DEPS/prebuilt-artifact shortcuts must not be present."
fi

if grep -A1 "key: PRISMA_BASELINE_EXISTING_DB" render.yaml | grep -q 'value: "true"'; then
  fail "PRISMA_BASELINE_EXISTING_DB must not be left true in a clean release. Use it only for one recovery deploy."
fi

if grep -A1 "key: ALLOW_UNSAFE_DB_PUSH" render.yaml | grep -q 'value: "true"'; then
  fail "ALLOW_UNSAFE_DB_PUSH must be false in Render release config."
fi

if grep -A1 "key: DB_PUSH_ON_BOOT" render.yaml | grep -q 'value: "true"'; then
  fail "DB_PUSH_ON_BOOT must be false in Render release config."
fi

echo "Release discipline checks passed."

exit 0
