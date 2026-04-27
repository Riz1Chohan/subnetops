#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/smoke-test.sh <frontend-url> <backend-url>
# Backward-compatible local usage:
#   scripts/smoke-test.sh http://localhost:4000

FRONTEND_URL="${1:-http://localhost:4173}"
BACKEND_URL="${2:-$FRONTEND_URL}"

FRONTEND_URL="${FRONTEND_URL%/}"
BACKEND_URL="${BACKEND_URL%/}"
API_BASE="$BACKEND_URL/api"

printf "Checking backend live endpoint...\n"
curl -fsS "${API_BASE}/health/live" >/dev/null
printf "Checking backend ready endpoint...\n"
curl -fsS "${API_BASE}/health/ready" >/dev/null
printf "Checking frontend...\n"
curl -fsS "${FRONTEND_URL}" >/dev/null
printf "Smoke test passed. Frontend=%s Backend=%s\n" "$FRONTEND_URL" "$BACKEND_URL"
