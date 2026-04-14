#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost}"
API_BASE="${BASE_URL%/}/api"

printf "Checking live endpoint...\n"
curl -fsS "${API_BASE}/health/live" >/dev/null
printf "Checking ready endpoint...\n"
curl -fsS "${API_BASE}/health/ready" >/dev/null
printf "Checking frontend...\n"
curl -fsS "${BASE_URL%/}" >/dev/null
printf "Smoke test passed for %s\n" "$BASE_URL"
