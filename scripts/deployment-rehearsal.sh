#!/usr/bin/env bash
set -euo pipefail

# SubnetOps deployment rehearsal script.
# Usage:
#   scripts/deployment-rehearsal.sh https://subnetops-frontend.onrender.com https://subnetops-backend.onrender.com
# Optional authenticated export check:
#   SUBNETOPS_TEST_EMAIL=... SUBNETOPS_TEST_PASSWORD=... SUBNETOPS_TEST_PROJECT_ID=... scripts/deployment-rehearsal.sh ...

FRONTEND_URL="${1:-}"
BACKEND_URL="${2:-}"

if [ -z "$FRONTEND_URL" ] || [ -z "$BACKEND_URL" ]; then
  echo "Usage: $0 <frontend-url> <backend-url>"
  echo "Example: $0 https://subnetops-frontend.onrender.com https://subnetops-backend.onrender.com"
  exit 2
fi

FRONTEND_URL="${FRONTEND_URL%/}"
BACKEND_URL="${BACKEND_URL%/}"
API_BASE="$BACKEND_URL/api"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

section() {
  printf '\n==> %s\n' "$1"
}

extract_csrf() {
  # Avoid jq dependency; response is simple: {"csrfToken":"..."}
  sed -n 's/.*"csrfToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
}

section "Frontend static app"
curl -fsS "$FRONTEND_URL" >/dev/null

echo "Frontend responded."

section "Backend health"
curl -fsS "$API_BASE/health/live" >/dev/null
curl -fsS "$API_BASE/health/ready" >/dev/null
echo "Backend live/ready checks passed."

section "CORS preflight from frontend origin"
curl -fsS -X OPTIONS "$API_BASE/auth/login" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,x-csrf-token" \
  -D - -o /dev/null | grep -i "access-control-allow-origin" >/dev/null
echo "CORS preflight includes access-control-allow-origin."

section "CSRF token issuance"
CSRF_BODY="$(curl -fsS -c "$COOKIE_JAR" "$API_BASE/auth/csrf")"
CSRF_TOKEN="$(printf '%s' "$CSRF_BODY" | extract_csrf)"
if [ -z "$CSRF_TOKEN" ]; then
  echo "CSRF token was not returned."
  exit 1
fi
echo "CSRF token issued."

section "Unsafe request is rejected without CSRF"
STATUS="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$API_BASE/auth/request-password-reset" \
  -H "Content-Type: application/json" \
  --data '{"email":"nobody@example.com"}')"
if [ "$STATUS" != "403" ]; then
  echo "Expected 403 without CSRF, got $STATUS"
  exit 1
fi
echo "CSRF rejection check passed."

section "Password reset request accepts CSRF-protected request"
curl -fsS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$API_BASE/auth/request-password-reset" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  --data '{"email":"nobody@example.com"}' >/dev/null
echo "Password-reset request path responded safely."

if [ -n "${SUBNETOPS_TEST_EMAIL:-}" ] && [ -n "${SUBNETOPS_TEST_PASSWORD:-}" ] && [ -n "${SUBNETOPS_TEST_PROJECT_ID:-}" ]; then
  section "Authenticated login and export checks"
  LOGIN_BODY="$(printf '{"email":"%s","password":"%s"}' "$SUBNETOPS_TEST_EMAIL" "$SUBNETOPS_TEST_PASSWORD")"
  curl -fsS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    --data "$LOGIN_BODY" >/dev/null

  curl -fsS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$API_BASE/export/projects/$SUBNETOPS_TEST_PROJECT_ID/csv" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -o /tmp/subnetops-export-check.csv

  if [ ! -s /tmp/subnetops-export-check.csv ]; then
    echo "Export check returned an empty file."
    exit 1
  fi
  rm -f /tmp/subnetops-export-check.csv
  echo "Authenticated CSV export check passed."
else
  echo "Skipping authenticated export check; set SUBNETOPS_TEST_EMAIL, SUBNETOPS_TEST_PASSWORD, and SUBNETOPS_TEST_PROJECT_ID to enable it."
fi

section "Deployment rehearsal passed"
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
