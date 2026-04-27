# SubnetOps v232 build notes

## Recovery pass focus
This pass stays on the recovery roadmap and pushes further into **Phase H / I / J**.

### Main changes
- Added real **diagram layout modes** inside the diagram workspace:
  - Global multi-site
  - Per-site
  - WAN / Cloud
  - Security boundaries
- Added **site focus selection** for per-site review so one site can be inspected without the rest of the topology competing for space.
- Reduced **equal-weight diagram clutter** by showing some lower-value support panels only when the current view actually benefits from them.
- Added clearer **in-scope evidence summary** so the user can see how many sites, placements, services, boundaries, and flows are active in the current diagram view.
- Kept the same topology engine outputs, but made the diagram stage consume them in a way that is closer to the recovery roadmap’s intended topology views.

## Why this pass matters
The recovery roadmap asks for the diagram stage to become a real topology engine, not just a prettier generic canvas. This pass moves the workspace closer to that by making the diagram behave more like an engineering review tool:
- global architecture review when needed
- local LLD review when needed
- WAN / cloud transport review when needed
- boundary / trust review when needed

It also supports the UX rescue direction by reducing always-on panel overload.

## Files changed
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- frontend/src/pages/ProjectDiagramPage.tsx
