# Phase 21 — Release Foundation Cleanup

## Goal

Phase 21 cleans the release foundation before larger architecture work continues. It focuses on runtime safety, packaging correctness, and Render steady-state posture.

## Changes

- Fixed the auth rate limiter bucket key so it uses both the limiter prefix and normalized client IP.
- Added a behavioral rate-limiter selftest proving:
  - one exhausted client bucket does not block another client IP
  - different limiter prefixes do not share buckets for the same client IP
- Removed committed backend build artifacts from the release package.
- Strengthened release discipline checks so committed `backend/dist` and `frontend/dist` fail the release gate.
- Changed Render's default `PRISMA_BASELINE_EXISTING_DB` value to `false` so recovery mode is not left enabled after the Prisma migration recovery path.
- Documented that `PRISMA_BASELINE_EXISTING_DB=true` is a one-deploy recovery setting only.

## What this phase intentionally does not solve

- It does not yet remove the large frontend `designSynthesis.ts` engine.
- It does not yet make every project page consume the backend design-core snapshot.
- It does not yet split the large frontend page/style files.

Those belong in the next architecture phase.

## Verification target

Run:

```bash
./scripts/verify-build.sh
```

At minimum, the following source-only checks should pass before dependency install/build:

```bash
scripts/assert-release-discipline.sh
node scripts/check-security-hardening.cjs
node scripts/check-relative-imports.cjs backend/src frontend/src
```
