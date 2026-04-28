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
export npm_config_cache="${NPM_CONFIG_CACHE:-${ROOT_DIR}/.npm-cache}"
mkdir -p "$npm_config_cache"
echo "npm cache: ${npm_config_cache}"

cd "${ROOT_DIR}"
chmod +x scripts/*.sh backend/entrypoint.sh 2>/dev/null || true
bash scripts/clean-generated-artifacts.sh

if [[ "${CURRENT_MAJOR}" != "${EXPECTED_NODE_MAJOR}" ]]; then
  echo "Warning: expected Node 20.x for SubnetOps. Current runtime is ${CURRENT_NODE}."
fi

echo
echo "==> Release discipline checks"
bash scripts/assert-release-discipline.sh
node scripts/check-release-artifacts.cjs
node scripts/check-production-readiness.cjs

echo
echo "==> Static relative import check"
node scripts/check-relative-imports.cjs backend/src frontend/src

echo
echo "==> Backend-authority seam check"
node scripts/check-design-authority.cjs
node scripts/check-frontend-authority.cjs

echo
echo "==> Design-core modularity check"
node scripts/check-design-core-modularity.cjs

echo
echo "==> Frontend engine modularity check"
node scripts/check-frontend-engine-modularity.cjs

echo
echo "==> Behavioral test matrix seam check"
node scripts/check-behavioral-test-matrix.cjs
node scripts/check-engine-test-matrix.cjs
node scripts/check-routing-engine-upgrade.cjs
node scripts/check-security-policy-engine-upgrade.cjs
node scripts/check-implementation-planning-engine-upgrade.cjs

echo
echo "==> Security hardening seam check"
node scripts/check-security-hardening.cjs

echo
echo "==> Product realism seam check"
node scripts/check-product-realism.cjs

echo
echo "==> Final trust cleanup seam check"
node scripts/check-final-trust-cleanup.cjs
node scripts/check-report-diagram-truth.cjs
node scripts/check-backend-report-diagram-truth.cjs
node scripts/check-backend-diagram-render-model.cjs

echo
echo "==> Backend install + Prisma generate + TypeScript build + engine tests"
cd "${ROOT_DIR}/backend"
run_ci_install
npm run prisma:generate
npm run build
npm run security:selftest:rate-limit
npm run engine:selftest:all
npx tsx ../scripts/selftest-design-authority-overlay.ts

echo
echo "==> Frontend install + TypeScript/Vite build"
cd "${ROOT_DIR}/frontend"
run_ci_install
npm run build

cd "${ROOT_DIR}"
echo
echo "Verification completed. Source tree is cleanly buildable from backend/frontend lockfiles."
