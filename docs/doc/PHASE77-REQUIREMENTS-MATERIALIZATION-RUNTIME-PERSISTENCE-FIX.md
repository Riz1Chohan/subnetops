# Phase 77 — Requirements Materialization Runtime Persistence Fix

## Scope

Phase 77 fixes the requirements save path as a persistence problem, not as a report wording problem.

The runtime evidence showed the real failure: a saved 10-site requirement scenario still produced 0 materialized sites, 0 addressing rows, and 0 durable segment rows. That means the previous truth/warning phases did their job by exposing the bug, but they did not complete the actual generation path.

## Audit result

Source audit confirms the intended chain is:

1. Frontend `ProjectRequirementsPage` calls `useSaveProjectRequirements(projectId)`.
2. The frontend API function sends `PATCH /projects/:projectId/requirements`.
3. Express mounts project routes under `/api/projects`.
4. `project.routes.ts` registers `PATCH /:projectId/requirements` before generic `PATCH /:projectId`.
5. `project.controller.ts` validates the body with `saveProjectRequirementsSchema` and calls `projectService.saveProjectRequirements`.
6. `project.service.ts` updates `project.requirementsJson`, calls the materializer, counts persisted Site/VLAN rows, and returns `outputCounts`.
7. `requirementsMaterialization.service.ts` writes durable `Site` and `Vlan` rows through Prisma transaction calls.
8. Design-core later reads `Project -> sites -> vlans` through `designCore.repository.ts` and converts those rows into addressing rows, design summaries, topology evidence, route intent, and diagram inputs.

## first real break fixed

The save path was too trusting. It allowed the materializer to re-read requirements from the project record and did not enforce a hard persistence contract after save.

Phase 77 now forces materialization to consume the exact `requirementsJson` payload from the Save Requirements request. This closes the weak link where a save could appear successful while the materializer consumed stale, missing, or mismatched project data.

Phase 77 also adds a hard persistence contract after requirements save, project creation with requirements, and generic project update with requirements. A selected 10 site(s) must not complete with 0 durable Site row(s). Requirement-driven segment families must not complete with 0 durable VLAN/segment row(s).

## What changed

- `materializeRequirementsForProject(...)` now accepts an optional explicit `requirementsJson` source.
- `saveProjectRequirements(...)` passes the exact submitted `data.requirementsJson` into the materializer.
- `updateProject(...)` also passes the exact submitted `requirementsJson` when generic update includes requirements.
- `createProject(...)` passes the exact initial `requirementsJson` when a new project is created from guided requirements.
- `assertRequirementsPersistenceContract(...)` counts durable `Site` and `Vlan` rows immediately after materialization inside the same transaction.
- If persistence fails, the save throws a backend error instead of pretending requirements were saved and materialized.
- Design-core consumption remains unchanged: it already reads persisted `sites` and nested `vlans` from Prisma.

## Acceptance expectation

For the reported scenario:

- `siteCount = 10` must create at least 10 durable Site rows.
- Required segment families such as USERS, SERVICES, GUEST, STAFF-WIFI, PRINTERS, CAMERAS, MANAGEMENT, REMOTE-ACCESS, CLOUD-EDGE, WAN-TRANSIT, and OPERATIONS must produce durable VLAN rows across the selected sites.
- Design-core should then see `project.sites.length > 0`, `addressingRows.length > 0`, and topology generation should no longer be blocked by missing Sites/VLANs.
- If any future runtime path still results in zero sites or zero VLANs after save, the backend must fail the request loudly instead of producing another polished empty report.

## Non-goals

This phase does not add report polish, softer warning text, or another cosmetic truth layer. It fixes the save/materialization persistence contract that was allowing empty engineering objects to survive after requirements were captured.
