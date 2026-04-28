#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# A zip transfer can drop executable bits. Restore them before running source gates.
chmod +x scripts/*.sh backend/entrypoint.sh 2>/dev/null || true

echo "SubnetOps final preflight"
echo "Root: $ROOT_DIR"
echo

bash scripts/clean-generated-artifacts.sh
bash scripts/assert-release-discipline.sh
node scripts/check-release-artifacts.cjs
node scripts/check-production-readiness.cjs
node scripts/check-relative-imports.cjs backend/src frontend/src
node scripts/check-design-authority.cjs
node scripts/check-frontend-authority.cjs
node scripts/check-design-core-modularity.cjs
node scripts/check-frontend-engine-modularity.cjs
node scripts/check-behavioral-test-matrix.cjs
node scripts/check-engine-test-matrix.cjs
node scripts/check-routing-engine-upgrade.cjs
node scripts/check-security-policy-engine-upgrade.cjs
node scripts/check-implementation-planning-engine-upgrade.cjs
node scripts/check-security-hardening.cjs
node scripts/check-product-realism.cjs
node scripts/check-final-trust-cleanup.cjs

echo
echo "Static/source preflight passed."
echo "Next required gate before deployment:"
echo "  bash scripts/verify-build.sh"
echo
echo "After Render deployment:"
echo "  bash scripts/deployment-rehearsal.sh https://subnetops-frontend.onrender.com https://subnetops-backend.onrender.com"
