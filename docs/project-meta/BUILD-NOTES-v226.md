# SubnetOps v226 build notes

## Combined recovery pass focus
- Added a new recovery-completion planning layer that turns the recovery roadmap and authority debt into a concrete handoff queue.
- Surfaced that queue in the project shell, logical-design overview, validation workspace, and report.
- Kept the master-roadmap gate honest by showing percent-complete, must-finish recovery tasks, should-finish cleanup, and the evidence behind the gate.

## Why this pass matters
This pass pushes further into recovery roadmap phases G, H, and I.
The app now does a better job of answering:
- are we actually close to leaving recovery,
- what still must be finished before that handoff,
- and what evidence is supporting the claim.

## Files changed
- frontend/src/lib/recoveryCompletionPlan.ts
- frontend/src/layouts/ProjectLayout.tsx
- frontend/src/pages/ProjectOverviewPage.tsx
- frontend/src/pages/ProjectValidationPage.tsx
- frontend/src/pages/ProjectReportPage.tsx
