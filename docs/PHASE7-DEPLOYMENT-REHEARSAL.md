# Phase 7 Deployment Rehearsal Hardening

Phase 7 does not add product features. It exists to stop a bad deployment from damaging the app or hiding broken production behavior.

## What this phase verifies

- The frontend static service responds.
- The backend live and ready health endpoints respond.
- Production CORS allows the deployed frontend origin.
- CSRF token issuance works.
- Unsafe requests are rejected without CSRF.
- Password-reset request flow accepts a CSRF-protected request.
- Optional authenticated export download works when a test account and project ID are supplied.

## New database deployment path

Use this path only when the Render PostgreSQL database is brand new and empty.

1. Deploy the backend with:

```text
PRISMA_SYNC_ON_BOOT=true
PRISMA_SYNC_STRATEGY=migrate
ALLOW_UNSAFE_DB_PUSH=false
```

2. The backend startup runs:

```bash
npx prisma migrate deploy
```

3. Confirm the backend ready endpoint returns OK:

```bash
curl -fsS https://subnetops-backend.onrender.com/api/health/ready
```

4. Run the rehearsal script:

```bash
scripts/deployment-rehearsal.sh \
  https://subnetops-frontend.onrender.com \
  https://subnetops-backend.onrender.com
```

## Existing database baseline path

Use this path if the current Render PostgreSQL database was originally created with `prisma db push`.

Do this once before relying on migration deploy:

```bash
cd backend
npx prisma migrate resolve --applied 20260425160000_init
```

Then deploy with:

```text
PRISMA_SYNC_ON_BOOT=true
PRISMA_SYNC_STRATEGY=migrate
ALLOW_UNSAFE_DB_PUSH=false
```

Do not run `prisma db push` against production unless you are doing a deliberate non-production recovery and have explicitly set:

```text
ALLOW_UNSAFE_DB_PUSH=true
```

## CSRF rehearsal

The app uses cookie auth. Unsafe requests must include `X-CSRF-Token` matching the `subnetops_csrf` cookie.

Expected behavior:

- `GET /api/auth/csrf` returns a token and sets `subnetops_csrf`.
- `POST /api/auth/request-password-reset` without CSRF returns `403`.
- The same request with the CSRF header succeeds.

The rehearsal script checks this automatically.

## Export rehearsal

Export routes require both:

- login/auth cookie
- project access authorization

Optional authenticated export test:

```bash
SUBNETOPS_TEST_EMAIL="test@example.com" \
SUBNETOPS_TEST_PASSWORD="your-password" \
SUBNETOPS_TEST_PROJECT_ID="project-id" \
scripts/deployment-rehearsal.sh \
  https://subnetops-frontend.onrender.com \
  https://subnetops-backend.onrender.com
```

Expected result: CSV export downloads a non-empty file.

## Password reset rehearsal

With `SEND_REAL_EMAILS=false`, password reset requests should queue outbox records but not send external email.

For real production email delivery, configure:

```text
SEND_REAL_EMAILS=true
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
SMTP_FROM=no-reply@your-domain.com
FRONTEND_APP_URL=https://subnetops-frontend.onrender.com
```

Then test with a real email account and confirm the reset link opens the frontend reset-password page.

## Final deployment gate

Do not call the deployment clean until all of this is true:

- Backend build passes.
- Frontend build passes.
- `backend/package-lock.json` exists and is committed.
- Existing database is baselined, or a new database is used.
- Backend ready endpoint passes.
- Rehearsal script passes.
- Login works in browser.
- At least one project export downloads correctly.
- Password reset behavior is verified according to the chosen email mode.

## Remaining known caveat

Phase 7 does not prove the full local build inside this sandbox because npm dependency installation has been stalling here. The source-level deployment rehearsal tools and docs are now present, but the real final gate is still running:

```bash
./scripts/verify-build.sh
```

on your local machine or CI.
