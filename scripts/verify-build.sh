#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXPECTED_NODE_MAJOR="20"
CURRENT_NODE="$(node -v)"
CURRENT_MAJOR="${CURRENT_NODE#v}"
CURRENT_MAJOR="${CURRENT_MAJOR%%.*}"

run_ci_install() {
  if [[ ! -f package-lock.json ]]; then
    echo "Missing package-lock.json in $(pwd). Refusing non-reproducible install."
    exit 1
  fi
  npm ci --include=dev --ignore-scripts --no-audit --no-fund
}

echo "SubnetOps build verification"
echo "Root: ${ROOT_DIR}"
echo "Node: ${CURRENT_NODE}"

if [[ "${CURRENT_MAJOR}" != "${EXPECTED_NODE_MAJOR}" ]]; then
  echo "Warning: expected Node 20.x for SubnetOps. Current runtime is ${CURRENT_NODE}."
fi

echo
echo "==> Release discipline checks"
cd "${ROOT_DIR}"
scripts/assert-release-discipline.sh

echo
echo "==> Static relative import check"
node scripts/check-relative-imports.cjs backend/src frontend/src

echo
echo "==> Backend-authority seam check"
node scripts/check-design-authority.cjs

echo
echo "==> Security hardening seam check"
node scripts/check-security-hardening.cjs

echo
echo "==> Product realism seam check"
node scripts/check-product-realism.cjs

echo
echo "==> Final trust cleanup seam check"
node scripts/check-final-trust-cleanup.cjs

echo
echo "==> Backend install + Prisma generate + TypeScript build + engine tests"
cd "${ROOT_DIR}/backend"
run_ci_install
npm run prisma:generate
npm run build
npm run engine:selftest:all

echo
echo "==> Frontend install + TypeScript/Vite build"
cd "${ROOT_DIR}/frontend"
run_ci_install
npm run build

echo
echo "Verification completed."
