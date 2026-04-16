# SubnetOps v86

## Focus
Workflow stabilization + deliver foundation.

## Main fixes
- Project creation now shows visible success/error feedback.
- After create, the app redirects cleanly back to the dashboard with a success banner and direct link into the new project.
- AI draft import errors no longer silently block the redirect; the project is still created and any import warning is surfaced on the dashboard.
- Validation now reruns automatically after project, site, and VLAN updates/deletes so stale findings are less likely to keep showing after a real fix.
- Validation fix links now carry a clearer return-to-validation flow for Sites and VLANs.
- Full project deletion is now available from Project Settings with confirmation and dashboard feedback.

## Deliver foundation
- Report/Deliver now has a clearer Deliver Center panel.
- Added direct export actions for:
  - Technical PDF
  - Excel-friendly CSV
  - Print / Save current view
- Added included-artifacts and export-blockers sections at the top of Deliver.

## Files changed
- frontend/src/lib/api.ts
- frontend/src/features/projects/api.ts
- frontend/src/features/projects/hooks.ts
- frontend/src/features/sites/hooks.ts
- frontend/src/features/vlans/hooks.ts
- frontend/src/lib/validationFixLink.ts
- frontend/src/pages/NewProjectPage.tsx
- frontend/src/pages/DashboardPage.tsx
- frontend/src/pages/ProjectSettingsPage.tsx
- frontend/src/pages/ProjectReportPage.tsx
- frontend/src/pages/ProjectSitesPage.tsx
- frontend/src/pages/ProjectVlansPage.tsx

## Validation performed here
- TypeScript transpile/syntax checks passed for all changed TS/TSX files.

## Still to improve next
- richer package export (more than PDF + CSV)
- deeper cascading/accordion behavior across other dense pages
- security/topology engine depth (real zone placement, DMZ logic, inter-zone mapping)
- broader workflow bug sweep beyond the highest-friction paths fixed here
