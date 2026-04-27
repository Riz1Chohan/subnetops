# SubnetOps v250 Build Notes

## Recovery roadmap slice
This pass continues the recovery roadmap's Phase H / I / J work by making the diagram stage behave more like a real engineering review workspace instead of only offering broader overlays and view modes.

## Main changes
- Added device-role focus controls for:
  - all devices
  - edge
  - switching
  - wireless
  - services
- Added link-semantics focus controls for:
  - all links
  - transport
  - access
  - security
  - flows
- Non-matching device roles and link types are now kept visible but muted rather than fully removed, so the user can isolate a review without losing topology context.
- Guided review presets now also drive the new focus controls, so trust-boundary, transport, service-placement, and critical-flow review posture is stronger out of the box.
- Added an engineering focus summary card in the diagram workspace.

## Files changed
- frontend/src/features/diagram/components/ProjectDiagram.tsx

## Validation
- Passed direct TypeScript transpile-module syntax check on the edited diagram component.
- Not validated with a full dependency-backed production build in this environment.
