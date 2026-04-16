# SubnetOps v238 build notes

## Recovery pass focus
This pass stays on the recovery roadmap and pushes the diagram workspace deeper into **Phase H / I / J**.

### Main changes
- Added **guided review presets** inside the diagram workspace so the user can move the diagram into a stronger engineering posture without manually toggling mode, scope, and overlay each time.
- Added two new engineering overlay modes:
  - **Service placement**
  - **Redundancy**
- Extended overlay guidance, evidence snapshots, and review sequencing so the diagram stage now supports:
  - placement
  - addressing
  - services
  - security
  - redundancy
  - flows
- Tightened some diagram-stage panel visibility so connection and topology-behavior support panels appear when the active overlay or scope actually benefits from them.
- Updated report cross-check guidance so the diagram now maps more explicitly into service-placement and resilience review, not just placement/addressing/security/flows.

## Why this pass matters
The diagram workspace already had stronger layout modes, but it still needed more **engineering control** and less manual setup burden. This pass moves the workspace closer to a real review tool by letting the user jump directly into common review motions such as:
- architecture review
- site LLD review
- transport / WAN review
- trust-boundary review
- service-placement review
- critical-flow review

It also brings the overlay system closer to the recovery roadmap’s expectation that the diagram should support engineering overlays, not just generic layer toggles.

## Files changed
- frontend/src/features/diagram/components/ProjectDiagram.tsx
