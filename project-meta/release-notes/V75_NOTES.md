# SubnetOps v75

## What changed

### Core synthesis engine
- strengthened the site-block allocator with a more realistic reserve model
- added more consistent multi-site summary block behavior when the requirements call for consistent site blocks
- added correction proposals when a configured segment exists but still does not match the synthesized design intent
- added a per-site loopback identity to the logical design output

### WAN / transit / routing planning
- added a dedicated WAN/cloud edge transit planner
- reserves a WAN transit pool inside the organization hierarchy when multi-site or cloud scope is active
- proposes point-to-point links between the primary site and branch/cloud edges
- adds a routing and summarization handoff view with:
  - site summary route
  - loopback
  - local segment count
  - transit adjacency count

### Addressing and report surfaces
- Addressing Plan page now includes:
  - routing and summarization handoff
  - WAN and cloud edge transit plan
  - implementation-ready handoff actions
- Logical Design page now surfaces:
  - transit link count
  - routing identity count
  - WAN reserve block
  - implementation handoff focus
- Report page now includes:
  - routing and summarization plan
  - WAN and cloud edge plan
  - transit summary in the report KPIs

## Main files changed
- frontend/src/lib/designSynthesis.ts
- frontend/src/pages/ProjectAddressingPage.tsx
- frontend/src/pages/ProjectOverviewPage.tsx
- frontend/src/pages/ProjectReportPage.tsx

## Verification done here
- changed files pass an esbuild parse/bundle check with external package resolution
- full installed app build was not run in this environment
