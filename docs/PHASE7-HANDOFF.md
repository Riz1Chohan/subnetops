# Phase 7 Handoff — Deployment Rehearsal Hardening

## Scope completed

Phase 7 added deployment rehearsal tooling and tightened the deployment documentation. It did not add planner features, UI changes, or new network-design logic.

## Files changed or added

- `scripts/deployment-rehearsal.sh`
- `scripts/smoke-test.sh`
- `docs/PHASE7-DEPLOYMENT-REHEARSAL.md`
- `docs/PHASE7-HANDOFF.md`
- `DEPLOY_RENDER.md`
- `README.md`

## Main result

The package now includes a practical deployment rehearsal path for:

- frontend availability
- backend live/ready endpoints
- production CORS behavior
- CSRF token issuance
- unsafe request rejection without CSRF
- password reset request path with CSRF
- optional authenticated export download

## What still must be done outside this sandbox

The sandbox still cannot reliably complete npm dependency installation. Before deploying seriously, run:

```bash
./scripts/verify-build.sh
```

Then generate and commit the backend lockfile if it is still missing:

```bash
cd backend
npm install --package-lock-only --ignore-scripts --include=dev --no-audit --no-fund
```

## Deployment warning

If the existing Render database was originally created by `prisma db push`, baseline it once before relying on migrations:

```bash
cd backend
npx prisma migrate resolve --applied 20260425160000_init
```

Skipping this can cause migration deploy to fail against an existing database.

## Verdict

Phase 7 makes the deployment path less reckless. It does not magically prove production readiness. The final proof is still a real build plus a real Render rehearsal.
