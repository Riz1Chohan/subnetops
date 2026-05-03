# Phase 11 — Routing Segmentation Protocol-Aware Planning

Contract: `PHASE11_ROUTING_SEGMENTATION_PROTOCOL_AWARE_PLANNING_CONTRACT`

Role: `ROUTING_INTENT_REVIEW_NOT_PACKET_SIMULATION`

Phase 11 hardens routing and segmentation as an honest backend control layer. It separates routing intent, routing review, routing blockers, and routing simulation unavailable states. It is not a packet simulator.

## What changed

The backend now exposes `phase11RoutingSegmentation` in the design-core snapshot. It consumes the network object model, route domains, route intents, site reachability checks, segmentation expectations, Phase 10 graph dependency evidence, and routing-sensitive requirements.

It produces protocol-aware planning rows for connected, static, summary, and default routes; explicit OSPF, BGP, ECMP, redistribution, route-leaking, cloud route-table, WAN failover, asymmetric routing, and segmentation reachability review rows; a requirement-to-routing matrix; validation findings; frontend display evidence; report/export evidence; and diagram-impact evidence.

## Honesty states

- `ROUTING_INTENT`
- `ROUTING_REVIEW`
- `ROUTING_BLOCKER`
- `ROUTING_SIMULATION_UNAVAILABLE`

`ROUTING_SIMULATION_UNAVAILABLE` is intentional. It prevents fake confidence for OSPF, BGP, ECMP, route redistribution, cloud route tables, and route leaking when protocol/device/import evidence is missing.

## Requirement propagation

Routing-sensitive requirements must create either a route/protocol consequence or an explicit review/simulation-unavailable item.

- `multiSite` → static/summary/WAN posture/asymmetric routing evidence
- `dualIsp` → default route/failover/ECMP review evidence
- `cloudHybrid` or `cloudConnected` → cloud route-table/BGP/route-leaking review evidence
- `remoteAccess` → route-leaking and segmentation reachability review evidence
- `guestWifi` / `guestPolicy` → guest isolation and route-leaking boundary evidence
- `management` / `managementAccess` → management reachability restriction evidence
- brownfield/migration signals → OSPF/BGP/redistribution review evidence

## Limitation

Phase 11 does not validate live protocol adjacencies, device route selection, ECMP hashing, failover timers, firewall session asymmetry, BGP path selection, OSPF areas, or imported cloud route tables. Those stay review-gated until authoritative inputs exist.
