# Phase 25 — Production Readiness Audit

Phase 25 is the final release-gate pass before deployment. It does not pretend the product is finished; it turns the current Phase 24 codebase into a cleaner deploy candidate with stronger packaging and verification discipline.

## What changed

- Added `scripts/check-production-readiness.cjs`.
- Added `scripts/final-preflight.sh` for a fast source/static gate before the heavier install/build gate.
- Wired the production-readiness checker into `scripts/verify-build.sh`.
- Updated `scripts/verify-build.sh` to use a repo-local `.npm-cache` by default so broken/root-owned user npm cache state does not poison the release gate.
- Expanded release discipline to reject stale Phase 24 package roots when creating the Phase 25 artifact.
- Strengthened `scripts/smoke-test.sh` so it checks actual `ok=true` backend responses and a real frontend HTML shell.
- Confirmed that the final package should not include `backend/dist`, `frontend/dist`, or any `node_modules` directory.
- Kept Render in steady-state migration mode: `PRISMA_BASELINE_EXISTING_DB=false`, `ALLOW_UNSAFE_DB_PUSH=false`, and `DB_PUSH_ON_BOOT=false`.

## Required final gates

Before deploying:

```bash
./scripts/final-preflight.sh
./scripts/verify-build.sh
```

After deploying to Render:

```bash
scripts/deployment-rehearsal.sh \
  https://subnetops-frontend.onrender.com \
  https://subnetops-backend.onrender.com
```

For an authenticated export rehearsal, also provide:

```bash
SUBNETOPS_TEST_EMAIL="test@example.com" \
SUBNETOPS_TEST_PASSWORD="your-password" \
SUBNETOPS_TEST_PROJECT_ID="project-id" \
scripts/deployment-rehearsal.sh \
  https://subnetops-frontend.onrender.com \
  https://subnetops-backend.onrender.com
```

## Remaining honest risks

- This is still not a full browser E2E suite. It does not replace Playwright/Cypress.
- It does not spin up a disposable PostgreSQL database by itself.
- The frontend synthesis layer is improved but still too large.
- The app should still be staged and smoke-tested before being treated as public production software.

## Deployment posture

This package is a deploy candidate, not a magic guarantee. The correct bar is:

1. source/static preflight passes,
2. full clean install/build passes,
3. Render deploy succeeds,
4. live rehearsal passes,
5. browser checks confirm login, project creation, design-core-backed pages, and exports.
