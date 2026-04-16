SubnetOps v292 build notes

Recovery roadmap focus for this pass
- Deepen the Design Package into a more genuine master-detail workspace.
- Make the left-pane design links open focused right-pane views instead of broad full-page dumps.
- Keep the new workspace shell moving toward the recovery roadmap's stage-driven UX reset.

What changed
- Expanded Design Package stage links in the project shell to target focused design slices.
- Added focused-section query handling to:
  - ProjectOverviewPage
  - ProjectCoreModelPage
  - ProjectAddressingPage
  - ProjectSecurityPage
  - ProjectRoutingPage
- Added focused hero states for these design pages so the right pane clearly shows which design slice is active.
- Reduced visible panel sprawl on focused design views by hiding unrelated blocks for the selected section.
- Kept issue-banner support active so Action Center context still carries through focused views.

Why this pass matters
- It turns the Design Package stage into a closer match for the requested left-pane / right-pane behavior.
- It reduces the amount of information dumped into the right pane when the user is trying to inspect a single design topic.
- It keeps the recovery roadmap aligned with one-strong-section-at-a-time behavior instead of equal-weight long-page reading.

Files updated
- frontend/src/layouts/ProjectLayout.tsx
- frontend/src/pages/ProjectOverviewPage.tsx
- frontend/src/pages/ProjectCoreModelPage.tsx
- frontend/src/pages/ProjectAddressingPage.tsx
- frontend/src/pages/ProjectSecurityPage.tsx
- frontend/src/pages/ProjectRoutingPage.tsx

Validation
- Ran a TypeScript transpile-module syntax check on the changed TSX files.
- No backend changes were required in this pass.
