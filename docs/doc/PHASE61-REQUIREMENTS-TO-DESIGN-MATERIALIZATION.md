# Phase 61 — Requirements-to-Design Materialization

## Purpose

Phase 61 fixes a workflow truth problem: selected requirements must not remain dead survey text. When a project stores `requirementsJson`, the backend now conservatively materializes design-driving source-of-truth rows so the rest of the app has real Sites and VLANs to consume.

## What this pass does

- Adds `backend/src/services/requirementsMaterialization.service.ts`.
- Calls materialization from project create/update when `requirementsJson` is present.
- Creates or strengthens site rows from `siteCount`.
- Creates requirement-derived VLAN/segment rows for common design drivers such as users, services, guest, staff wireless, voice, printers, IoT, cameras, management, cloud edge, remote access, WAN transit, and operations.
- Adds notes to mark rows as requirement-derived and reviewable.
- Refreshes frontend project, site, VLAN, design-core, Engine 2 IPAM, and validation queries after requirement saves.

## Important boundary

This is not the final requirements brain. It is the first materialization bridge. Many requirement fields are consumed as design notes and planning context, but not every field has deep object-level consequences yet. The next requirements pass should map every field in `RequirementsProfile` to one of:

- source object creation,
- source object strengthening,
- design-core policy input,
- Engine 2/IPAM input,
- report/diagram annotation,
- or explicit no-op with explanation.

## Proof

Run:

```bash
npm run check:phase61-requirements-materialization
```
