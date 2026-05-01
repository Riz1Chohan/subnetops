#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm run check:phase84-97-release
bash scripts/assert-release-discipline.sh

grep -q "subnetops-backend" render.yaml
grep -q "subnetops-frontend" render.yaml
grep -q "NODE_VERSION" render.yaml

echo "Deployment rehearsal passed. Push to GitHub/Render, then verify /api/health/live shows 0.97.0 and PHASE_97_DIAGRAM_QA_SECURITY_MATRIX_RELEASE_INTEGRITY."
