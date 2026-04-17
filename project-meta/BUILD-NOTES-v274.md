# SubnetOps v274 build notes

## Main focus
Recovery roadmap Phase H / I workspace reset.

## What changed
- Rebuilt the project shell into a clearer 3-layer structure:
  - project header
  - always-visible workflow stage row
  - two-pane working area
- Added live project header metrics with stronger fallbacks so Sites, VLANs, Blockers, and Open Tasks are less likely to sit at zero when the design engine already knows more.
- Added top-level Diagram and Reports quick actions in the project header.
- Replaced email-first identity display with a user-facing name-first display and surfaced notification counts more clearly.
- Removed the old always-on recovery-focus footer and the large internal recovery shell blocks from the main user workspace.
- Added a compact Action Center in the left pane so open issues no longer take over the main screen.
- Added stage-specific left-pane navigation links for Discovery, Requirements, Design Package, Validation, and Deliver.
- Added section-based focused rendering support for:
  - report sections
  - discovery sections
  - validation sections
- Added query-param step syncing for Requirements so shell-driven stage-card navigation can open the correct planner step.
- Updated topbar user display so the account area shows a name-first pill with notification count instead of raw email text.

## Files changed
- frontend/src/layouts/ProjectLayout.tsx
- frontend/src/layouts/DashboardLayout.tsx
- frontend/src/pages/ProjectReportPage.tsx
- frontend/src/pages/ProjectRequirementsPage.tsx
- frontend/src/pages/ProjectDiscoveryPage.tsx
- frontend/src/pages/ProjectValidationPage.tsx
- frontend/src/styles.css

## Validation
- Direct TypeScript transpile-module syntax checks passed for all edited TS/TSX files.
- This was not a full dependency-backed production build in this environment.

## Next likely recovery slice
- Finish issue-driven correction navigation so each Action Center item opens the exact stage/card/target block with clear highlighting.
- Continue stripping remaining coder-facing recovery language from child workspaces where it still appears.
- Redesign the diagram workspace layout separately after this shell reset.
