# Deploy SubnetOps on Render

## Phase 25 final deployment rule

Do not deploy this package until the local source/static preflight and the full clean build gate pass:

```bash
./scripts/final-preflight.sh
./scripts/verify-build.sh
```

After deployment, run the live rehearsal:

```bash
scripts/deployment-rehearsal.sh \
  https://subnetops-frontend.onrender.com \
  https://subnetops-backend.onrender.com
```

The package is intentionally source-only. It must not contain `backend/dist`, `frontend/dist`, or `node_modules`.

## Services

This package expects two Render services and one Render PostgreSQL database:

- `subnetops-backend` — Node web service using `backend/`
- `subnetops-frontend` — static frontend built from `frontend/` source
- `subnetops-db` — PostgreSQL database


## Reproducible build rule

Render must build from source. Do not deploy a committed `frontend/dist` folder. Both services must install with `npm ci`, which means both lockfiles must be committed:

```text
backend/package-lock.json
frontend/package-lock.json
```

If the backend lockfile is missing, generate lockfiles on a machine with npm registry access:

```bash
scripts/generate-lockfiles.sh
./scripts/verify-build.sh
```

## Required production posture

Production startup should use Prisma migrations, not automatic schema push:

```text
PRISMA_SYNC_ON_BOOT=true
PRISMA_SYNC_STRATEGY=migrate
PRISMA_BASELINE_EXISTING_DB=false
ALLOW_UNSAFE_DB_PUSH=false
DB_PUSH_ON_BOOT=false
```

Do not use `prisma db push` in production unless you are intentionally doing a temporary non-production recovery. Do not leave `PRISMA_BASELINE_EXISTING_DB=true` in `render.yaml`; that flag is only for one controlled recovery deploy against an existing database that was created by `prisma db push`.

## New database deployment path

For a brand-new Render PostgreSQL database, deploy normally. The backend entrypoint will run:

```bash
npx prisma migrate deploy
```

Then check:

```bash
curl -fsS https://subnetops-backend.onrender.com/api/health/ready
```

## Existing database baseline step

If your current Render database was previously created by `prisma db push`, run this once before switching fully to migrations:

```bash
cd backend
npx prisma migrate resolve --applied 20260425160000_init
```

Then normal deployments can run:

```bash
npx prisma migrate deploy
```

For a new empty database, skip the baseline step.

## Production CORS

Production `CORS_ORIGIN` should contain only the deployed frontend origin:

```text
https://subnetops-frontend.onrender.com
```

Keep localhost origins in local `.env` files only. Do not put localhost in production Render environment variables.

## Password reset email

To make password reset actually send email, configure:

```text
SEND_REAL_EMAILS=true
SMTP_HOST=<your SMTP host>
SMTP_PORT=587
SMTP_USER=<your SMTP user>
SMTP_PASS=<your SMTP password>
SMTP_FROM=no-reply@your-domain.com
FRONTEND_APP_URL=https://subnetops-frontend.onrender.com
```

If SMTP is not configured, reset emails are queued in `EmailOutbox` but not sent.

## CSRF protection

The backend uses cookie auth. CSRF protection is enabled for unsafe requests. The frontend API client automatically calls `/api/auth/csrf` and sends `X-CSRF-Token`.

Expected deployment behavior:

- `GET /api/auth/csrf` returns a token and sets the `subnetops_csrf` cookie.
- unsafe requests without the CSRF token return `403`.
- normal frontend requests automatically include the token.

## Deployment rehearsal

Run the build gate locally first, then run the deployment rehearsal after deploying backend and frontend:

```bash
./scripts/verify-build.sh
scripts/deployment-rehearsal.sh \
  https://subnetops-frontend.onrender.com \
  https://subnetops-backend.onrender.com
```

For an authenticated export rehearsal, set a test account and project ID:

```bash
SUBNETOPS_TEST_EMAIL="test@example.com" \
SUBNETOPS_TEST_PASSWORD="your-password" \
SUBNETOPS_TEST_PROJECT_ID="project-id" \
scripts/deployment-rehearsal.sh \
  https://subnetops-frontend.onrender.com \
  https://subnetops-backend.onrender.com
```

Read the full checklist in:

```text
docs/PHASE7-DEPLOYMENT-REHEARSAL.md
```

## Final deployment gate

Do not call the app deployment-ready until all of these pass:

```bash
./scripts/verify-build.sh
scripts/deployment-rehearsal.sh https://subnetops-frontend.onrender.com https://subnetops-backend.onrender.com
```

Also verify in browser:

- register/login works
- project creation works
- project export downloads CSV/PDF/DOCX
- password reset behavior matches your SMTP mode

## Phase 24 behavioral gate

Before deploying the final package, run:

```bash
./scripts/verify-build.sh
```

Phase 24 extends this gate with behavior checks for the backend design core and the frontend/backend authority overlay. Do not skip this step: the new tests catch behavior regressions that older static string checks could miss.
