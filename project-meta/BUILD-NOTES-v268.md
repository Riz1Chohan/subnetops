# SubnetOps v268 Build Notes

## Recovery roadmap slice
This pass stays inside the recovery roadmap's Phase J direction and pushes the diagram closer to a real topology workspace by improving the in-app network symbol family.

## Main changes
- Reworked the diagram device symbols into a cleaner in-app icon family inspired by professional network-diagram conventions.
- Improved the visual distinction between:
  - firewall / edge
  - router
  - core / distribution / access switching
  - wireless controller
  - access point
  - server
  - cloud edge
  - internet
- Updated the device symbol library panel so the icon strategy is explained inside the app rather than hidden in notes.
- Kept the icons recreated inside SubnetOps instead of importing raw reference artwork.

## Why this matters
The recovery roadmap requires the diagram to move away from generic shapes and toward device-aware network topology visuals. This pass strengthens that direction so the topology page reads more like an engineering workspace and less like a generic node canvas.

## Files changed
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- project-meta/BUILD-NOTES-v268.md

## Validation
- Ran a file-level TypeScript no-emit check on the edited diagram component using local React / JSX stubs.
- This was not a full dependency-backed frontend build in this environment.
