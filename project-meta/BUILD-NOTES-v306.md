SubnetOps v306 build notes

This pass fixes the next workspace issues reported after v300:

1. Stage click no longer auto-fills the right pane.
   - Discovery, Requirements, Design Package, Validation, and Deliver now open with a blank focused workspace until the user selects a card from the left pane.

2. Left-pane scrolling for long card lists.
   - The stage navigation pane now keeps its own scrollable card list, so long lists like the Design Package cards can be managed without scrolling the whole page.

3. Removed duplicate project-user box from the project header.
   - User identity remains in the top bar only.

4. Notifications made more actionable in the top bar.
   - Added a notification dropdown using the existing notification panel so the count is tied to a visible live list rather than a duplicated static box.

5. Focused deliver/report sections made more compact.
   - Replaced the oversized focused-section hero with a compact toolbar for cleaner Naming and Topology section presentation.

6. Diagram quick action now lands in a more canvas-first diagram page.
   - The canvas section now shows the actual diagram first with less preamble.

7. Preserved stage-specific focused navigation.
   - Left-pane card clicks still open the targeted content only on the right.

Files changed:
- frontend/src/layouts/ProjectLayout.tsx
- frontend/src/layouts/DashboardLayout.tsx
- frontend/src/pages/ProjectDiscoveryPage.tsx
- frontend/src/pages/ProjectOverviewPage.tsx
- frontend/src/pages/ProjectReportPage.tsx
- frontend/src/pages/ProjectValidationPage.tsx
- frontend/src/pages/ProjectDiagramPage.tsx
- frontend/src/styles.css

Validation:
- Changed TS/TSX files passed a TypeScript transpile-module syntax check.
- Full npm dependency build could not be run in this environment because npm install is blocked by registry authentication here.
