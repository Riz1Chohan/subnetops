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

check_json_ok() {
  local url="$1"
  local label="$2"
  local body
  body="$(curl -fsS "$url")"
  printf "%s" "$body" | grep -q '"ok"[[:space:]]*:[[:space:]]*true' || {
    echo "$label did not return ok=true"
    echo "$body"
    exit 1
  }
}

printf "Checking backend live endpoint...\n"
check_json_ok "${API_BASE}/health/live" "Backend live endpoint"

printf "Checking backend ready endpoint...\n"
check_json_ok "${API_BASE}/health/ready" "Backend ready endpoint"

printf "Checking frontend shell...\n"
FRONTEND_BODY="$(curl -fsS "${FRONTEND_URL}")"
printf "%s" "$FRONTEND_BODY" | grep -qi '<html' || {
  echo "Frontend did not return an HTML shell."
  exit 1
}

printf "Smoke test passed. Frontend=%s Backend=%s\n" "$FRONTEND_URL" "$BACKEND_URL"
