# SubnetOps v190 Notes

## Version type
Combined recovery pass covering multiple roadmap slices together.

## Main focus
Move the recovery roadmap from external planning into the product itself, while further converging the diagram and report surfaces onto the shared design truth model.

## What changed
- Added a new `recoveryRoadmap` helper that evaluates recovery phases from the current synthesized design.
- Added live recovery status, blockers, and next-step guidance to the Core Model workspace.
- Reworked the diagram object model to read more directly from the unified truth model.
- Added diagram overlay readiness, topology-view readiness, and diagram authority-gap reporting.
- Added recovery-status surfaces to Diagram, Routing, Security, and Report pages so those workspaces now expose whether they are resting on stronger design truth.
- Kept packaging clean with notes under `project-meta/`.

## Why this matters
The app can now answer a harder question from inside the product itself:
- are we actually closing the recovery roadmap
- or are we still just improving the shell around it

That makes the next stage decision more honest.

## Honest status
v190 is a meaningful combined recovery pass, but the recovery roadmap is still **not fully complete yet**.
