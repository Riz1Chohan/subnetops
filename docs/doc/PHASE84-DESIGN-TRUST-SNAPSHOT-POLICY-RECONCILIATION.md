# Phase 84 — Design Trust, Snapshot Hydration, and Policy Reconciliation

Runtime marker: `PHASE_84_DESIGN_TRUST_SNAPSHOT_POLICY_RECONCILIATION`

Phase 84 fixes contradictions left after the Phase 83 requirement propagation audit. The goal is not to add shiny features. The goal is to stop the product from lying after requirements have already materialized real engineering evidence.

## Fixed

- Design trust no longer collapses to 0% when there are zero validation errors/blockers and real backend evidence exists. Warnings still reduce confidence, but they do not erase materialized sites, addressing rows, route evidence, DHCP evidence, or templates.
- React Query preserves the previous backend design-core snapshot during refetch and does not convert loading/undefined data into false zero counts.
- Snapshot authority text now says loading when no snapshot is loaded, and separates design-review readiness from implementation execution readiness when a snapshot exists.
- Topology summary derives primary site, distributed internet-at-each-site evidence, cloud posture, and multi-site status from backend evidence.
- Design summary metrics now read WAN/transit rows, route intents, service placements, and vendor-neutral templates from deeper backend design-core objects.
- Security policy model adds explicit Phase 84 default-deny guardrails for high-risk boundaries including Guest, WAN, DMZ, IoT, WAN Transit, and Management.
- Report export includes `Phase 84 Design Trust and Policy Reconciliation` with readiness split, evidence metrics, and default-deny guardrails.

## Boundary

Design review can be ready or review-ready while implementation execution remains blocked. Implementation blockers such as no live inventory, missing management IPs, missing config backups, missing vendor-specific details, or missing change-window evidence are not the same as failed requirements materialization.
