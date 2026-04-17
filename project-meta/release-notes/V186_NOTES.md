# V186 Notes

This build pushes the recovery roadmap deeper into the core design engine.

## What changed
- Added **explicit vs inferred source tracking** for shared-model route domains and boundary domains.
- The unified model can now **infer missing route domains** from site hierarchy and addressing data.
- The unified model can now **infer missing site/zone boundary domains** so services, segments, and flows stay connected through one shared model.
- Added stronger **generation notes** and **authority coverage** checks to the Core Model workspace.
- Routing and Security workspaces now surface shared-model route and boundary authority more directly.
- Report/export now includes **Core Design Truth Model** sections and a truth-model flow appendix.
- CSV export now includes route-domain, boundary-domain, and flow-contract truth-model rows.

## Why this matters
This is a direct recovery-roadmap move away from stacking more review/helper packs. The model is becoming more capable of acting as the connected engineering truth layer behind topology, routing, security boundaries, service placement, and flows.

## Honest limitation
The model is stronger, but some core objects are still inferred to bridge missing explicit design state. Future versions should shift more of that creation earlier into the planner and synthesis pipeline.
