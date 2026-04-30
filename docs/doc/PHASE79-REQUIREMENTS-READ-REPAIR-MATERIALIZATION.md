# Phase 79 — Requirements Read-Repair Materialization

Phase 78 proved backend deployment with a runtime release marker, but the deployed project/report still showed 10 requirement-selected sites and 0 durable Site/VLAN/addressing rows.

Phase 79 adds a backend read-repair safety path for existing saved projects whose `requirementsJson` exists but whose durable engineering objects are missing.

## Fix

Before returning project, site, VLAN, design-core, or export/report data, the backend now checks whether saved requirements require materialized objects and the database still has missing rows.

If a gap exists, the backend runs the same requirements materializer against the saved `requirementsJson` and hard-fails if the repair still leaves missing durable objects.

## Protected read paths

- `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/sites`
- `GET /api/projects/:projectId/vlans`
- `GET /api/design-core/projects/:projectId`
- DOCX/PDF/CSV export composition paths

## Expected runtime result

Opening a stale 10-site project after deploy should no longer leave the design/report at 0 materialized sites. The first protected read should materialize Sites/VLANs/addressing rows from saved requirements, then design-core/report should consume the repaired durable objects.

This is intentionally a real persistence repair, not report wording polish.
