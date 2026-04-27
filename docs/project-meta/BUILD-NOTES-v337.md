SubnetOps v337 build notes

Focus of this pass
- Continued the real diagram stage work by turning the existing topology render into a clearer canvas workspace.
- Made the diagram feel like an actual review surface instead of a raw SVG dropped into the page.

What changed
- Added a dedicated canvas toolbar above the live diagram.
- Added zoom out, fit-to-view, 100%, and zoom in controls.
- Added direct SVG and PNG export from the diagram workspace.
- Added full-screen mode for the diagram stage.
- Added automatic fit-to-view when changing major diagram scope/view so the diagram becomes visible faster.
- Added a bounded viewport surface around the existing topology render with better scrolling and presentation.
- Kept the existing logical/physical diagram engine and independent layer toggles intact.

Files changed
- frontend/src/pages/ProjectDiagramPage.tsx
- frontend/src/styles.css
- project-meta/BUILD-NOTES-v337.md

Validation
- ProjectDiagramPage.tsx passed a TypeScript transpile-module syntax check.
- A full frontend build was attempted, but the package already has broader pre-existing dependency/type-resolution issues outside this pass in the local environment, so full build completion could not be used as the validation signal for this specific change.
