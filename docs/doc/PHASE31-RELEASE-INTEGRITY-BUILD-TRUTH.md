# Phase 31 — Release Integrity / Build Truth

## Purpose

Phase 31 does not upgrade routing, security, diagram, or implementation engines. It hardens the release foundation so later engine work is not built on a dirty or unverifiable package.

## What changed

- Added a root `package.json` with repo-level release commands:
  - `npm run preflight`
  - `npm run verify`
  - `npm run clean:generated`
- Added `scripts/clean-generated-artifacts.sh` to remove generated build/dependency artifacts before verification.
- Added `scripts/check-release-artifacts.cjs` to reject packaged `dist`, `node_modules`, missing lockfiles, missing release scripts, and unsafe Render startup posture.
- Updated `scripts/final-preflight.sh` so static/source gates run after cleanup and release-artifact checks.
- Updated `scripts/verify-build.sh` so full backend/frontend build proof starts from source cleanup and checks release-artifact discipline first.
- Changed backend Render startup from `./entrypoint.sh` to `sh ./entrypoint.sh`, avoiding executable-bit failures after zip/Git transfer.
- Restored executable permissions on shell scripts inside this package.

## Proof commands

Fast static/source gate:

```bash
bash scripts/final-preflight.sh
```

Full dependency/build/self-test gate:

```bash
bash scripts/verify-build.sh
```

## Important boundary

This phase is a release-integrity phase only. It does not claim the engines are A+ yet. Backend authority UI wiring, routing hardening, security-policy depth, implementation-plan depth, and report/diagram truth remain future phases.

## Next recommended phase

Phase 32 should make the UI consume backend design-core authority directly, especially the Phase 30 implementation-neutral plan, instead of allowing the frontend synthesis layer to remain a second planning brain.
