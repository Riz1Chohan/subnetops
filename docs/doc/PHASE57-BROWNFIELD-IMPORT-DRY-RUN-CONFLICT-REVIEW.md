# Phase 57 — Engine 2 Brownfield Import Dry Run and Conflict Review

## Purpose

Phase 57 makes brownfield/current-state import safer. Phase 56 blocked many unsafe writes, but the import workflow still behaved too much like a raw commit form. That is dangerous for enterprise IPAM because imported current-state networks can collide with proposed allocations, DHCP scopes, or allocator plan rows.

This phase adds a dry-run and conflict-review layer before users commit brownfield evidence.

## What changed

### Backend

New service functions in `backend/src/services/enterpriseIpam.service.ts`:

- `previewBrownfieldImport`
- `getBrownfieldConflictReview`
- `buildBrownfieldConflictReviewFromData`

The dry run checks each candidate imported row for:

- invalid CIDR syntax
- address-family mismatch
- duplicate rows inside the import payload
- duplicate saved brownfield evidence
- overlaps with durable allocations
- overlaps with DHCP scopes
- intersections with IP pools
- overlaps with allocator plan rows

New routes:

- `POST /api/enterprise-ipam/projects/:projectId/brownfield-imports/dry-run`
- `GET /api/enterprise-ipam/projects/:projectId/brownfield-conflicts`

The normal commit route remains:

- `POST /api/enterprise-ipam/projects/:projectId/brownfield-imports`

### Frontend

`ProjectEnterpriseIpamPage` now includes:

- `Preview import risk` action before commit
- dry-run summary counts
- row-level import findings
- dry-run conflict table
- saved current-vs-proposed conflict review table
- dashboard counters for blocked/review brownfield conflicts

### Schema integrity fix

Phase 57 also removes a Prisma schema defect from Phase 56: `DesignIpReservation` incorrectly had an index on `designInputHash` even though that field is not part of the reservation model. That would fail Prisma validation. The valid `designInputHash` fields remain on allocation approvals and ledger entries.

## Conflict meanings

- `blocked`: hard stop. The imported current-state network collides with something that can poison allocator truth.
- `review`: engineer must reconcile ownership, route domain, or migration intent before materialization.
- `info`: context only. Example: imported current state intersects a parent pool, which may be normal.

## What this does not do yet

Phase 57 does not create a full reconciliation wizard. It exposes the evidence and blocks blind trust, but the next UI maturity pass should add:

- accept/ignore/supersede actions per conflict
- saved reconciliation decisions
- mapping imported networks to sites/VLANs/route domains
- import file upload with parser feedback
- bulk commit only for rows that passed dry-run policy

## Verification

Static gate:

```bash
npm run check:phase57-brownfield-conflict-review
```

This phase is still not a substitute for full build proof:

```bash
cd backend && npm ci && npm run build
cd frontend && npm ci && npm run build
```
