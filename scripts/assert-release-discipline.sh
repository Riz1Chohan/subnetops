#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "Release discipline failed: $1" >&2
  exit 1
}

[ -f package.json ] || fail "package.json missing"
[ -f render.yaml ] || fail "render.yaml missing"
[ -f backend/package-lock.json ] || fail "backend/package-lock.json missing"
[ -f frontend/package-lock.json ] || fail "frontend/package-lock.json missing"
[ ! -d backend/dist ] || fail "backend/dist must not be committed"
[ ! -d frontend/dist ] || fail "frontend/dist must not be committed"
[ ! -d node_modules ] || fail "root node_modules must not be committed"
[ ! -d backend/node_modules ] || fail "backend/node_modules must not be committed"
[ ! -d frontend/node_modules ] || fail "frontend/node_modules must not be committed"

node scripts/check-release-artifacts.cjs

echo "Release discipline checks passed."
