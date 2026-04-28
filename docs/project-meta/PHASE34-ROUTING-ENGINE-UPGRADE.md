# Phase 34 — Routing Engine Upgrade

## Purpose

Phase 34 upgrades the backend routing model from basic route-intent generation into a neutral routing-engine foundation. The frontend remains a display/explain/filter/visualize layer only; no frontend design planning was restored.

## What changed

- Added backend route-table entry simulation from route intents.
- Added neutral administrative-distance and longest-prefix metadata for connected, static, summary, and default routes.
- Added next-hop object validation for connected interfaces, site gateways, transit links, and security boundaries.
- Added bidirectional site-to-site reachability checks.
- Added duplicate destination and overlapping route review detection.
- Added missing forward-path and missing return-path findings.
- Added branch-without-transit blocking findings.
- Added Phase 34 routing selftest and static guard.

## New backend outputs

The authoritative backend snapshot now exposes these routing objects under `networkObjectModel.routingSegmentation`:

- `routeEntries`
- `routeConflictReviews`
- `siteReachabilityChecks`
- enriched `routeTables`
- expanded routing summary counters

## New validation gates

- `backend/src/lib/phase34RoutingEngine.selftest.ts`
- `npm run engine:selftest:phase34-routing`
- `scripts/check-routing-engine-upgrade.cjs`

## Scope intentionally not included

Phase 34 does not generate vendor commands and does not pretend to model OSPF, BGP, EIGRP, SD-WAN, firewall rule order, or live-discovered RIB/FIB state. Those need later phases after the neutral route truth model is stable.

## Required verification

Run from repository root:

```bash
bash scripts/final-preflight.sh
bash scripts/verify-build.sh
```

If dependency installation is unavailable, at minimum run:

```bash
node scripts/check-routing-engine-upgrade.cjs
node scripts/check-engine-test-matrix.cjs
node scripts/check-frontend-authority.cjs
```
