# SubnetOps v280 build notes

## Main pass
This pass completes the first real stage-driven workspace behavior reset from the recovery roadmap.

### What changed
- Workflow stage chips now open the first real card for that stage instead of landing on broad pages.
- Project header account area was cleaned up so notifications sit above the logged-in user name instead of beside it.
- Action Center is now collapsed by default and labeled more clearly as Open Issues.
- Discovery now supports a focused card view when opened from the left pane.
- Requirements now supports a true focused single-card view driven by the left pane step links.
- Validation now supports a focused single-card view driven by the left pane section links.
- Deliver / Report now supports a focused single-section view driven by the left pane section links.
- Lower-value always-on summary sections are hidden in focused views so the right pane is much more controlled.

## Files changed
- frontend/src/layouts/ProjectLayout.tsx
- frontend/src/pages/ProjectDiscoveryPage.tsx
- frontend/src/pages/ProjectRequirementsPage.tsx
- frontend/src/pages/ProjectValidationPage.tsx
- frontend/src/pages/ProjectReportPage.tsx
- frontend/src/styles.css

## Validation
- Edited TS/TSX files passed a TypeScript transpile-module syntax check.
- Full dependency-backed frontend build was not run in this environment.

## Remaining next pass
- Issue-to-exact-highlight navigation.
- Deeper design-package page fitting into the same master-detail shell.
- Diagram layout redesign pass after the workspace shell is settled.
