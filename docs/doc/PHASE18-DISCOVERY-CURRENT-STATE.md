# Phase 18 — Discovery/current-state foundation

`PHASE18_DISCOVERY_CURRENT_STATE_CONTRACT`

Phase 18 promotes discovery/current-state into backend design-core evidence without pretending SubnetOps has live discovery.

## Purpose

Discovery is a manual/imported current-state boundary today. It is not SNMP polling, config scraping, cloud API inventory, live topology mapping, or automatic reconciliation.

The backend now creates `phase18DiscoveryCurrentState` so the frontend, validation, report export, and CSV export all read the same truth-controlled discovery evidence.

## Source-of-truth boundary

- `NOT_PROVIDED`: no current-state evidence captured.
- `MANUALLY_ENTERED`: user pasted notes or rough observations.
- `IMPORTED`: structured import evidence is present.
- `VALIDATED`: imported/manual evidence has explicit validation flags.
- `CONFLICTING`: evidence mentions overlap, duplicate, mismatch, stale, unsupported, EOL/EOS, or similar conflict language.
- `REVIEW_REQUIRED`: a requirement makes evidence necessary, but the data is missing or unvalidated.

## Requirement propagation

Brownfield/current-state-sensitive requirements generate discovery tasks instead of fake authority.

Examples:

- `brownfield=true` → subnet/IPAM, inventory/CMDB, routing, firewall, and LLDP/CDP discovery tasks.
- `migration=true` → IPAM, DHCP, routing, firewall, switch, and cutover comparison tasks.
- `multiSite=true` → WAN/routing and neighbor discovery tasks.
- `dualIsp=true` → routing and firewall failover evidence tasks.
- `cloudHybrid=true` → VPC/VNet, route table, cloud gateway, routing, and firewall evidence tasks.
- `guestAccess=true` → DHCP and firewall/SSID isolation evidence tasks.
- `remoteAccess=true` → VPN, firewall, identity/logging, and route evidence tasks.

## Structured import targets

The Phase 18 backend contract recognizes these future import/reconciliation targets:

- Subnet/IPAM exports
- DHCP scope exports
- ARP tables
- MAC tables
- Routing tables
- Firewall configs and policy exports
- Switch configs
- LLDP/CDP neighbor data
- Cloud VPC/VNet data
- NetBox-style inventory / CMDB

## Consumers

- `ProjectDiscoveryPage` shows the backend contract in the Discovery stage.
- `validation.service.ts` converts Phase 18 findings into readiness blockers/warnings.
- `exportDesignCoreReport.service.ts` includes a Phase 18 report section.
- `export.service.ts` includes Phase 18 CSV rows.
- `phase0EngineInventory.ts` now marks Phase 18 as `CONTROLLED`.

## Acceptance checks

- `backend/src/lib/phase18DiscoveryCurrentState.selftest.ts`
- `scripts/check-phase18-discovery-current-state.cjs`
- `npm run check:phase18-discovery-current-state`
- `npm run check:phase18-110-release`

## Non-goals

This phase does not add real import parsers yet. It prepares the honest control surface. A future phase can add real parsers for IPAM, DHCP, ARP/MAC, routing, firewall, switch, LLDP/CDP, cloud, and CMDB imports.
