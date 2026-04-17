# SubnetOps v200 Notes

## Main focus
This combined recovery pass targeted three connected needs:
- earlier design-engine pressure in Requirements
- clearer discovery-to-design linkage
- explicit in-app gating for whether recovery should continue or the master roadmap can resume

## What changed

### 1. Recovery-to-master roadmap gate
Added a new shared recovery gate helper that classifies the current state as:
- `stay-on-recovery`
- `near-transition`
- `ready-for-master`

This gate now summarizes why the app should remain on recovery or what blockers still prevent handoff.

### 2. Requirements early design preview
Updated `ProjectRequirementsPage.tsx` to synthesize the design package directly from the current unsaved planner answers.

The page now shows:
- site authority preview
- route domain count
- boundary domain count
- flow-contract count
- main current blockers from the recovery review

### 3. Discovery extraction preview
Updated `ProjectDiscoveryPage.tsx` so the discovery workspace now shows what it is already reinforcing inside the design engine:
- topology preview
- required flow coverage count
- recovery status
- recovery-to-master gate summary and blockers

### 4. Project shell and report honesty pass
Updated:
- `ProjectLayout.tsx`
- `ProjectReportPage.tsx`

Both now surface the recovery-to-master roadmap gate so the app itself is clearer about whether recovery is truly finished.

## Files changed
- `frontend/src/lib/recoveryRoadmap.ts`
- `frontend/src/layouts/ProjectLayout.tsx`
- `frontend/src/pages/ProjectReportPage.tsx`
- `frontend/src/pages/ProjectRequirementsPage.tsx`
- `frontend/src/pages/ProjectDiscoveryPage.tsx`
- `project-meta/HANDOFF_STATUS_V200.md`
- `project-meta/release-notes/V200_NOTES.md`

## Validation note
Changed files passed an isolated TypeScript transpile check in this environment. This is not the same as a full frontend dependency-backed production build.
