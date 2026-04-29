# Phase 59 — Engine 2 UI Edit Maturity and Build-Proof Discipline

Phase 59 hardens the Engine 2A management interface by exposing the existing backend PATCH routes through the frontend API, hooks, and management page.

## What changed

- Added frontend API functions for updating:
  - route domains / VRFs
  - IPv4 / IPv6 pools
  - durable allocations
  - DHCP scopes
  - IP reservations
  - brownfield networks
- Added React Query mutations for those update paths.
- Added a **Safe edit console** to `ProjectEnterpriseIpamPage`.
- Kept edits behind the same backend Phase 56 write-time guards, so edits are not a bypass around allocator integrity.
- Added a Phase 59 static gate:
  - `scripts/check-phase59-engine2-ui-edit-build-proof.cjs`
  - `npm run check:phase59-engine2-ui-edit-build-proof`
- Chained Phase 58 verification into Phase 59 verification.

## Why this matters

Before this phase, Engine 2A had create/delete-heavy management screens. That was useful, but it was not mature. An engineer needs to correct pool metadata, update DHCP scopes, adjust imported brownfield records, and revise durable allocations without deleting and recreating records.

Delete/recreate workflows are weak because they can destroy history and make the allocator harder to trust.

Phase 59 makes edits explicit and reviewable while preserving the backend enforcement layer.

## Guardrails preserved

The edit UI does **not** directly mutate local frontend state as authority. Every update goes back through the authenticated backend API.

The backend still enforces:

- CIDR and address-family validation
- route-domain and project ownership checks
- pool overlap rules
- allocation overlap rules
- noAllocate / RESERVED / DEPRECATED pool restrictions
- reserve policy override requirements
- brownfield conflict override requirements
- DHCP exclusion validation
- reservation conflict validation

## Type-level build hygiene

Phase 59 also cleans up Engine 2 service typing that could block a future TypeScript build after dependencies are installed:

- allocator reserve calculations now use an explicit `bigint` accumulator;
- brownfield conflict review plan rows are converted through a typed adapter instead of passing narrow summary objects into `Record<string, unknown>[]`;
- brownfield validation casts address-family input explicitly before CIDR validation.

These are not cosmetic. They remove real TypeScript compile-risk from the Engine 2 service layer.

## Build-proof status

Full backend/frontend build proof remains environment-dependent.

This package contains lockfiles, build scripts, source files, and static gates, but the sandbox still does not provide installed `node_modules`. Therefore this phase proves source wiring and release discipline, but it does **not** honestly claim a complete `npm ci && npm run build` proof.

Required outside-sandbox proof remains:

```bash
npm ci
npm run check:phase59-engine2-ui-edit-build-proof
cd backend && npm ci && npm run build
cd ../frontend && npm ci && npm run build
```

## Current status

Phase 59 improves Engine 2A from a first management console to a more practical edit/review workflow.

It is still not final UI polish. The next serious pass should focus on bulk edit previews, import file upload ergonomics, stronger filtering/searching across IPAM objects, and full CI-backed build proof.
