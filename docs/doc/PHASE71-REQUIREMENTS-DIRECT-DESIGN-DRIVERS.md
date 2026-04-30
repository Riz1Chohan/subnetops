# Phase 71 — Requirements Direct Design Drivers

## Purpose

Phase 71 tightens the requirement-to-engine relationship after the Phase 69 audit and Phase 70 save execution wiring.

The strict goal is not UI polish. The goal is to make high-impact requirement selections produce concrete engineering objects and deterministic addressing consequences instead of only appearing as notes.

## Scope

Phase 71 focuses on direct design drivers:

- `siteCount` creates/refreshes site rows.
- `usersPerSite` drives user segment host demand.
- `guestWifi` creates guest segmentation.
- `management` creates management-plane segmentation.
- `printers`, `iot`, and `cameras` create restricted shared-device / specialty-device segments.
- `wireless` and `apCount` create staff wireless planning.
- `voice`, `phoneCount`, `voiceQos`, `qosModel`, and `latencySensitivity` create voice/QoS planning only when voice is actually selected or phone count is positive.
- `remoteAccess` creates a reviewed VPN / remote-access boundary.
- `cloudConnected`, `environmentType`, `cloudProvider`, `cloudConnectivity`, `cloudHostingModel`, `cloudNetworkModel`, and `cloudRoutingModel` create a cloud-edge segment.
- `dualIsp`, `internetModel`, `resilienceTarget`, and `interSiteTrafficModel` create WAN/transit design evidence.
- `monitoringModel`, `loggingModel`, `backupPolicy`, and `operationsOwnerModel` create operations-plane evidence.
- `gatewayConvention` now influences the materialized gateway address instead of being report-only text.

## Runtime behavior

When requirements are saved through the Phase 70 requirements endpoint, the materializer now builds deterministic per-site segment addressing plans with the backend allocator:

1. Build the site block for each materialized site.
2. Convert every requirement-driven segment into a capacity request.
3. Use Engine 1 capacity logic to determine recommended prefix and required usable hosts.
4. Allocate non-overlapping segment CIDRs inside the site block.
5. Apply the selected gateway convention when assigning gateway IPs.
6. Persist the selected CIDR, gateway, estimated hosts, segment role, DHCP posture, and driver notes to VLAN rows.

This means direct drivers now affect the same saved Site/VLAN records that design-core, addressing tables, diagrams, validation, and exports already consume.

## What this phase intentionally does not solve

Phase 71 does not claim full planner completion.

Remaining planned phases still need to harden:

- deeper security/policy/routing/cloud consequence modeling,
- validation honesty for missing expected outputs,
- report and diagram truth locking,
- golden runtime scenario regression tests.

## Acceptance expectation

For a 10-site, 50-user-per-site, guest/management/wireless/cloud/remote-access scenario, the save pipeline should no longer leave the project at 0 sites and 0 VLAN rows. It should materialize sites, segments, addressing rows, and gateway values that design-core can consume immediately after the frontend refetches project data.
