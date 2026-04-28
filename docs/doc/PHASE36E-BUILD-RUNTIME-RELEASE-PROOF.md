# Phase 36E — Build / Runtime / Release Proof

Phase 36E is the release-proof hardening pass after the implementation planning engine phases.

## Purpose

This pass repairs build/runtime proof problems and locks the package back into a source-buildable baseline before Phase 37 report and diagram truth work begins.

## Fixes

- Restored the missing `truthStateLedger` snapshot alias used by the behavioral matrix selftest while preserving the canonical `truthStateSummary` field.
- Fixed a strict TypeScript narrowing issue in the Phase 36D verification helper.
- Corrected stale CIDR proof expectations around USER subnet growth-buffer sizing.
- Preserved the intended PRINTER minimum /29 sizing behavior.
- Restored executable permissions for release shell scripts and the backend entrypoint.
- Preserved release discipline: no committed `dist`, no committed `node_modules`, and source-build orientation remains intact.

## Required proof command

Run from the repository root in Node 20.12.2:

```bash
npm run verify
```

Or manually:

```bash
cd backend
npm ci --include=dev --ignore-scripts --no-audit --no-fund
npm run prisma:generate
npm run build
npm run engine:selftest:all

cd ../frontend
npm ci --include=dev --ignore-scripts --no-audit --no-fund
npm run build
```

## Phase 36E acceptance gate

Phase 36E is complete only when backend install/build/selftests and frontend install/build pass in the pinned Node 20.12.2 environment.
