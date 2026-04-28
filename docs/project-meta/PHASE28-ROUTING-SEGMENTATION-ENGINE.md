# Phase 28 — Routing and Segmentation Engine

Phase 28 turns the Phase 26 object model and Phase 27 design graph into practical routing and segmentation intelligence.

## What changed

- Added a backend `RoutingSegmentationModel` to the authoritative design-core snapshot.
- Added neutral route intent objects:
  - connected route intent
  - default route intent
  - static hub-to-branch route intent
  - site summary route intent
- Added route-domain route tables that count connected, default, static, summary, and missing route intents.
- Added reachability findings for routing gaps such as:
  - routed subnet without a modeled interface owner
  - multi-site branch without a transit path
  - site summaries that are missing or need review
  - required default route posture that lacks an implementation target
- Added segmentation flow expectations for common engineering cases:
  - guest-to-internal deny
  - guest-to-internet allow
  - management-to-management administration allow
  - DMZ-to-internal application-specific review
  - internal-to-management denial/review
- Added segmentation findings for missing or conflicting policy intent.
- Extended the design graph with route intent and segmentation flow nodes.
- Added graph relationships for:
  - route domain owns route
  - route intent targets subnet
  - route intent exits interface
  - security zone expects flow
- Added Phase 28 route/segmentation tables to the professional report enrichment.
- Added frontend snapshot typing for the new routing/segmentation model.
- Added self-test checks for route intent, segmentation expectation, and graph relationship coverage.

## Important boundary

Phase 28 does **not** claim to simulate OSPF, BGP, SD-WAN, firewall rule ordering, or vendor configuration syntax.

That would be fake precision at this stage.

This phase creates neutral engineering intent so SubnetOps can answer better design questions:

- Which subnets are connected to a route domain?
- Which routes are expected?
- Which site summaries are usable?
- Which branches have no modeled transit path?
- Which zone-to-zone flows are expected?
- Which expected security policies are missing or conflicting?

## Why this matters

Before this phase, the engine had objects and relationships, but routing and segmentation were still mostly descriptive.

After this phase, the backend can produce reviewable routing and segmentation evidence without pretending to be a full vendor simulator.

This is the correct step before any future vendor-specific config generation.
