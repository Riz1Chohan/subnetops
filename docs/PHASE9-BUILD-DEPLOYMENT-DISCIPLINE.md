# Phase 9 — Build and Deployment Discipline

## Purpose

Phase 9 removes prebuilt-artifact deployment shortcuts and forces reproducible build behavior.

## Changes

- Render backend now uses `npm ci`, not `npm install`.
- Render frontend now builds from source using `npm ci && npm run build`.
- Removed the frontend static-site shortcut that trusted committed `frontend/dist`.
- Removed `SKIP_INSTALL_DEPS` deployment shortcuts.
- Removed `prefer-offline` CI bias from npm config.
- Added `.gitignore` rules for `frontend/dist`, backend build output, and `node_modules`.
- Removed committed `frontend/dist` from this package.
- Updated Dockerfiles to require lockfiles and use `npm ci`.
- Added `scripts/assert-release-discipline.sh`.
- Added `scripts/generate-lockfiles.sh`.
- Updated `scripts/verify-build.sh` to fail if a lockfile is missing instead of falling back to non-reproducible installs.

## Important limitation

This environment cannot resolve `registry.npmjs.org`, so `backend/package-lock.json` could not be generated here. That is intentionally left as a hard gate, not hidden.

Before deployment, run this on a machine with npm registry access:

```bash
scripts/generate-lockfiles.sh
./scripts/verify-build.sh
```

Then commit:

```text
backend/package-lock.json
frontend/package-lock.json
```

## Gate

The app is not deployment-disciplined until this passes:

```bash
./scripts/verify-build.sh
```
