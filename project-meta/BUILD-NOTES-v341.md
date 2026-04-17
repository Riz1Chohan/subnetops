SubnetOps v341

This pass combines multiple upgrades in one package.

Added
- actual architecture preview diagram card on the diagram page
- clearer immediate topology snapshot before the larger canvas
- direct workspace shortcuts from diagram to report and logical design
- reports quick-link fix so the top Reports action opens a real report section
- report landing hub so /report is usable even without a section query
- report section cards for faster navigation

Files changed
- frontend/src/pages/ProjectDiagramPage.tsx
- frontend/src/pages/ProjectReportPage.tsx
- frontend/src/layouts/ProjectLayout.tsx
- frontend/src/styles.css
- project-meta/BUILD-NOTES-v341.md

Validation
- ProjectDiagramPage.tsx passed a TypeScript transpile-module syntax check
- ProjectReportPage.tsx passed a TypeScript transpile-module syntax check
- ProjectLayout.tsx passed a TypeScript transpile-module syntax check

Notes
- Full npm install/build could not be trusted in this container because npm auth/dependency state is not healthy locally here.
- This pass specifically addresses the user-visible gap that the diagram page still did not feel like it showed an actual diagram immediately, and also the report navigation issue noted during review.
