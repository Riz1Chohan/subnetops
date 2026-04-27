# Phase 13 — Build Proof and Final Trust Cleanup

## Scope
This phase is intentionally narrow. It does not redesign the UI, diagrams, reports, or product workflow. It targets the remaining trust seams identified after Phase 12.

## Completed cleanup
- Tightened auth rate-limiter client IP handling so the limiter no longer parses raw `X-Forwarded-For` headers directly.
- Configured Express `trust proxy` for the Render-style reverse proxy path.
- Sanitized organization invitation responses so raw invitation tokens are not returned from invitation listing, invite creation, invite acceptance, or revocation responses.
- Made frontend organization invitation typing reflect that tokens are not part of normal invite metadata.
- Wrapped validation result delete/create/readback in one Prisma transaction so saved validation findings are not wiped if the rewrite fails halfway.
- Removed the unsafe Prisma client shim so the backend must rely on real generated Prisma types after `prisma generate`.
- Split the duplicate report `issues` section marker into a distinct `diagram-cross-check` report section marker.
- Added `scripts/check-final-trust-cleanup.cjs` and wired it into `scripts/verify-build.sh`.

## Remaining hard blocker
The inherited package still does not include `backend/package-lock.json`.

That means backend `npm ci` is still not reproducible and Render backend deploy remains blocked until the backend lockfile is generated and committed from a normal networked development environment.

Required local command:

```bash
cd backend
npm install --package-lock-only --ignore-scripts --include=dev --no-audit --no-fund
```

Then rerun:

```bash
./scripts/verify-build.sh
```

## Verification status in this package
Passing seam checks:
- `node scripts/check-relative-imports.cjs backend/src frontend/src`
- `node scripts/check-design-authority.cjs`
- `node scripts/check-security-hardening.cjs`
- `node scripts/check-product-realism.cjs`

Blocked seam check:
- `node scripts/check-final-trust-cleanup.cjs` fails because `backend/package-lock.json` is still missing.

## Ruthless note
Do not call this package deployment-ready until `backend/package-lock.json` exists and the full `./scripts/verify-build.sh` passes. The code cleanup is useful, but build proof is still incomplete without the lockfile.
