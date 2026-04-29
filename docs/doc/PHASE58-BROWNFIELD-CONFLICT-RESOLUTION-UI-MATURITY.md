# Phase 58 — Engine 2 Brownfield Conflict Resolution and UI Maturity

## Purpose

Phase 57 made brownfield import safer by adding dry-run preview and current-vs-proposed conflict review. Phase 58 closes the next trust gap: conflict decisions must be durable, reviewable, and tied to Engine 2 evidence instead of disappearing after a page refresh.

## What changed

- Added durable `DesignBrownfieldConflictResolution` records in Prisma.
- Added a Phase 58 migration for conflict-resolution storage.
- Added conflict keys so a saved review decision can be matched back to the exact current-vs-proposed conflict.
- Added backend conflict resolution endpoint: `POST /api/enterprise-ipam/projects/:projectId/brownfield-conflict-resolutions`.
- Added backend validation for supported conflict decisions and required reviewer reason.
- Added optional safe supersede behavior for durable-allocation conflicts only.
- Added frontend API/hook types for conflict resolution records.
- Added Engine 2 IPAM page conflict filters: open, blocked, review, resolved, and all.
- Added per-conflict decision forms with reviewer, reason, design input hash, and optional durable-allocation supersede action.
- Added resolved/open conflict counters in the management summary.
- Tightened allocation approve/implemented quick actions to include the current Engine 2 input hash.

## Supported decisions

- `ACCEPT_BROWNFIELD`
- `KEEP_PROPOSED`
- `IGNORE_NOT_APPLICABLE`
- `SUPERSEDE_PROPOSED`
- `SPLIT_REQUIRED`
- `CHANGE_WINDOW_REQUIRED`

## Safety boundary

Phase 58 does **not** automatically fix every conflict. That would be dangerous. It records the engineer decision and only auto-supersedes when:

1. the conflict is tied to a durable allocation,
2. the reviewer explicitly chooses `SUPERSEDE_PROPOSED`, and
3. the reviewer checks the apply-supersede option.

Everything else remains a recorded reconciliation decision, not silent mutation.

## Remaining gap

The next serious pass should be a broader Engine 2A UI maturity pass: inline edit forms, bulk-import staging, stronger filtering/search, row-level validation messages, and a full reconciliation dashboard.
