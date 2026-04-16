# SubnetOps v93 Notes

## Purpose of v93
This version starts the Recovery Roadmap by strengthening the design engine instead of adding more generic presentation. The focus is on turning requirements and addressing into explicit topology-aware design objects.

## What changed

### 1. New topology-aware synthesis objects
Added to `frontend/src/lib/designSynthesis.ts`:
- `topology`
- `sitePlacements`
- `servicePlacements`
- `securityBoundaries`
- `trafficFlows`

These objects begin answering:
- what topology is being assumed
- which site is primary / hub-like
- where edge, switching, wireless, and service roles are placed
- where services live
- which zones/subnets are attached to which edge/control point
- how key traffic paths move through the design

### 2. Topology-specific engine behavior
The synthesis now distinguishes among:
- collapsed-core
- hub-and-spoke
- multi-site
- hybrid-cloud

and changes placement/flow assumptions based on:
- site count
- centralized vs distributed breakout
- cloud-connected status
- centralized server placement

### 3. Explicit site placement model
The engine now creates per-site placement objects for things like:
- perimeter edge
- branch WAN edge
- core / aggregation switching
- wireless access
- server/service stacks
- cloud edge

### 4. Explicit service placement model
The engine now generates initial placement records for:
- shared services
- management / monitoring plane
- cloud application boundary
- remote access gateway

### 5. Explicit security boundary mapping
The engine now produces site-aware boundary rows that map:
- zone name
- site
- attached edge/control device
- actual subnet list
- control point

### 6. Explicit traffic flow paths
The engine now produces first-pass critical path rows for:
- trusted user to internet
- guest to internet
- user to shared service
- management to infrastructure
- branch user to centralized service
- site to cloud-hosted service
- remote user to internal service

## UI surfaces updated

### Project Overview
Added a new **Explicit topology model** section showing:
- topology label
- breakout posture
- primary site
- redundancy model
- placement highlights
- critical flow path previews

### Project Report
Added a new **Topology, Placement, and Critical Flow Foundation** section showing:
- topology summary cards
- site placement table
- service placement table
- security boundary mapping table
- critical traffic paths and enforcement points table

## What v93 does NOT solve yet
This version is a foundation version. It does **not** yet fully complete:
- deep flow engine logic for every scenario
- true DMZ host publishing model
- final report rewrite
- UX rescue / button cleanup
- real topology diagram engine with Packet Tracer-style icons
- brownfield ingestion
- vendor-aware template generation

## Recommended next version
v94 should continue the Recovery Roadmap with:
- deeper flow engine
- more concrete security enforcement logic
- stronger DMZ / edge modeling
- more topology-specific route / path behavior
