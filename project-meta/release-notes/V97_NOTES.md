# SubnetOps v97 Notes

## Main focus
v97 starts the real topology diagram rebuild from the recovery roadmap.

## What changed
- rebuilt the diagram engine around synthesized topology objects instead of generic site cards only
- added device-aware network symbols for:
  - firewall
  - router
  - core / access switching
  - server zones
  - wireless nodes
  - internet / cloud
- added connection semantics with visibly different link rendering for:
  - routed links
  - trunk links
  - VPN / WAN links
  - internet edge links
  - traffic-flow overlays
- added overlay modes:
  - placement
  - addressing
  - security
  - flows
- logical view now shows per-site placement and overlay chips
- physical / topology view now shows a more realistic edge/core/branch/cloud layout
- flow overlay now surfaces critical path summaries directly in the diagram stage

## Files changed
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- V97_NOTES.md

## Remaining next-step gap
This is the first real diagram rebuild step, not the final one. Future versions still need:
- true per-interface and per-link labels
- richer site-specific device stacks
- more exact DMZ host placement and internet publication visuals
- topology-specific layout engines beyond the current generated layout
- better direct diagram coupling to report sections and validation findings
