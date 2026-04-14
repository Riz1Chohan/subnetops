#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXPECTED_NODE_MAJOR="20"
CURRENT_NODE="$(node -v)"
CURRENT_MAJOR="${CURRENT_NODE#v}"
CURRENT_MAJOR="${CURRENT_MAJOR%%.*}"

echo "SubnetOps verification"
echo "Root: ${ROOT_DIR}"
echo "Node: ${CURRENT_NODE}"

if [[ "${CURRENT_MAJOR}" != "${EXPECTED_NODE_MAJOR}" ]]; then
  echo "Warning: expected Node 20.x for SubnetOps. Current runtime is ${CURRENT_NODE}."
fi

echo
echo "==> Backend install + Prisma generate + build"
cd "${ROOT_DIR}/backend"
npm install --include=dev
npx prisma generate
npm run build

echo
echo "==> Frontend install + build"
cd "${ROOT_DIR}/frontend"
npm install --include=dev
npm run build

echo
echo "Verification completed."
