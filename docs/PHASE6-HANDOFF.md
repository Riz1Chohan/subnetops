# SubnetOps Phase 6 Handoff — Build Verification and Cleanup

## Scope

Phase 6 was a verification and cleanup checkpoint on top of the Phase 5 package. No planner features were added.

## Fixed

### Frontend relative import bug

A real source-level frontend build blocker was found in:

```text
frontend/src/features/diagram/diagramWorkspaceHelpers.ts
```

The file was importing from the wrong relative paths:

```ts
../../../lib/designSynthesis
../../../lib/types
../diagramTypes
```

From that folder, those paths resolve outside the intended `src` tree or to the wrong feature folder. They were corrected to:

```ts
../../lib/designSynthesis
../../lib/types
./diagramTypes
```

### Verification scripts improved

Added:

```text
scripts/check-relative-imports.cjs
```

This checks backend and frontend source files for broken relative imports without requiring npm packages.

Updated:

```text
scripts/verify-build.sh
```

The verification script now:

1. checks relative imports first,
2. installs dependencies using `npm ci` when a lockfile exists,
3. falls back to `npm install` where a lockfile is missing,
4. runs backend Prisma generate,
5. runs backend TypeScript build,
6. runs frontend TypeScript/Vite build.

It no longer runs migration deploy as part of ordinary build verification. Database migration rehearsal belongs to Phase 7, not build verification.

### Backend npm config added

Added:

```text
backend/.npmrc
```

This makes backend npm install behavior closer to the root/frontend npm behavior.

## Verified in this sandbox

The dependency-free relative import check was run successfully:

```bash
node scripts/check-relative-imports.cjs backend/src frontend/src
```

Result:

```text
Relative import check passed.
```

## Not fully verified in this sandbox

Full `npm install`, `npm ci`, backend build, and frontend build could not be completed here because npm dependency installation stalled in the sandbox. A fake `backend/package-lock.json` was not generated.

Run this locally before treating the package as build-proven:

```bash
cd backend
npm install --package-lock-only --ignore-scripts --include=dev --no-audit --no-fund
npm ci --include=dev --no-audit --no-fund
npm run prisma:generate
npm run build

cd ../frontend
npm ci --include=dev --no-audit --no-fund
npm run build
```

Then commit:

```text
backend/package-lock.json
frontend/dist/
```

if the frontend bundle changes.

## Blunt status

Phase 6 found and fixed a real source import bug. The package is cleaner than Phase 5, but it is not honestly full-build-proven until dependency installation and builds complete in a normal local or CI environment.
