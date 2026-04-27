SubnetOps v286 build notes

What changed in this pass
- Added an Action Center issue-context path builder so issue clicks now carry issue id, title, and detail into the destination workspace.
- Added reusable workspace issue banner support across focused Discovery, Requirements, Validation, Report, Core Model, Routing, and Security views.
- Tightened issue target paths for route authority, boundary authority, unresolved references, site authority, flow coverage, traceability, and site LLD.
- Added focus highlighting styles for targeted sections.
- Updated action-center wording and kept the package flat.

Validation done here
- Direct TypeScript transpile-module syntax check passed on the changed TS/TSX files.

Notes
- Backend files were not changed in this pass because the issue-to-navigation work stayed inside existing frontend routing and design-model logic.
