# SubnetOps v346

This pass pushes the main diagram canvas further toward a real network blueprint while also keeping the recent Render install-hardening in place.

## Diagram changes
- moved the live canvas higher in the page so the actual diagram appears before the heavier summary/support blocks
- simplified the header above the canvas and moved supporting metrics/shortcuts below the main stage
- strengthened the physical SVG with clearer primary-site internal cluster groupings:
  - core routing cluster
  - core switching cluster
  - shared services cluster
  - user access and wireless fabric cluster
- added a bottom in-diagram site index dock so the canvas itself carries more topology context
- added per-branch row-side chips for left/right placement clarity

## Deployment hardening
- extended the repository root `.npmrc` with the same retry/timeout/no-audit settings already used in `frontend/.npmrc`
- this does not eliminate Render-side network issues, but it keeps npm behavior more consistent if install settings are read from the repo root during deployment workflows

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/src/styles.css`
- `.npmrc`
- `project-meta/BUILD-NOTES-v346.md`
