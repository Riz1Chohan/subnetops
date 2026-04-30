# Phase 85 — Render Compile Fixes for Phase 84

Runtime marker: `PHASE_85_RENDER_COMPILE_FIXES_FOR_PHASE_84`

This pass is deliberately narrow. It does not add new product behavior. It fixes source-level TypeScript compile risks exposed by Render after Phase 84.

## Fixed

- Frontend compile guard confirms `backendProvidedCapacityOnly` is not referenced. The Phase 84 view model must use backend snapshot evidence directly.
- Requirement impact closure accepts numeric DHCP VLAN IDs from the authoritative backend model.
- Scenario proof/model compatibility now tolerates optional `linkType` and `purpose` evidence without requiring those fields for every modeled link/interface.
- Project duplication casts Prisma project source rows safely so `requirementsJson` and related scalar fields do not collapse to a minimal access-control shape during TypeScript inference.

## Non-goal

This phase does not change the Phase 84 trust, hydration, topology, metric, or policy logic. It only makes the Phase 84 source compile-clean for Render.
