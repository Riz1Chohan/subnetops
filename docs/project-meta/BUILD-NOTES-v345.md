SubnetOps v345

This pass focuses on making the main live diagram canvas feel more like the primary network design surface.

Added in this pass
- focus-canvas mode to temporarily hide the control rail and let the live diagram fill the workspace
- on-canvas outline dock with primary site, site count, WAN link count, service count, and reading order
- stronger physical blueprint structure inside the SVG:
  - transport spine across the WAN layer
  - section rail labels for transport, site fabric, and flow lane
  - branch-row labels for multi-row branch layouts
  - expanded hybrid/cloud edge grouping
  - physical legend dock inside the SVG

Files changed
- frontend/src/pages/ProjectDiagramPage.tsx
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- frontend/src/styles.css
- project-meta/BUILD-NOTES-v345.md

Validation
- ProjectDiagramPage.tsx passed a TypeScript transpileModule syntax check
- ProjectDiagram.tsx passed a TypeScript transpileModule syntax check

Notes
- package cleaned before zip creation
- no node_modules or dist included
