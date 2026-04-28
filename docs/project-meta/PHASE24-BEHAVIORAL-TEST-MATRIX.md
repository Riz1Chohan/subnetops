# Phase 24 — Behavioral Test Matrix

Phase 24 adds executable behavior checks instead of relying only on static string/seam checks.

## What changed

- Added `backend/src/lib/behavioralMatrix.selftest.ts`.
- Added `scripts/selftest-design-authority-overlay.ts`.
- Added `scripts/check-behavioral-test-matrix.cjs`.
- Wired the behavioral matrix into `backend/package.json` through `engine:selftest:behavioral-matrix`.
- Wired the new checks into `scripts/verify-build.sh`.

## Backend behavior now tested

The backend behavioral matrix verifies that the design core:

- keeps stable engineering outputs deterministic between repeated snapshot builds;
- detects non-canonical subnet notation;
- detects undersized subnets;
- detects unusable gateways;
- detects overlapping site blocks;
- detects subnets outside their parent site block;
- proposes distinct site blocks when site blocks are missing;
- keeps configured truth and backend proposals explicitly separated.

## Frontend/backend authority behavior now tested

The authority overlay selftest verifies that:

- the local frontend preview remains unchanged when no backend snapshot exists;
- backend design-core addressing replaces local preview addressing when a snapshot exists;
- backend organization block and stats override local preview values;
- backend blockers are promoted into open issues and design-review risk state.

## Why this matters

Before this phase, too many checks only proved that certain strings existed in source files. That is weak. A string check can pass while the actual behavior is broken. Phase 24 adds behavior-level tests for the highest-risk seams introduced in earlier phases: backend authority, allocator/design-core symptoms, proposal separation, and frontend/backend overlay behavior.

## Remaining limitation

This is still not a full integration test suite. It does not spin up PostgreSQL, call HTTP endpoints, or run browser-level tests. Those belong in a later production-readiness phase. Phase 24 is the first serious behavior matrix, not the final QA system.
