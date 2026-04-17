# SubnetOps v353

This pass fixes the live diagram canvas using the wrong site source.

## Problem fixed
The diagram page was building its canvas model from `project.sites` returned by the main project detail call.
In the deployed app, the overview/header could correctly show the real site count from the dedicated sites endpoint, while the diagram canvas still saw zero sites and fell into the empty-state message.

## Fix applied
- `ProjectDiagramPage.tsx` now loads the dedicated site collection with `useProjectSites(projectId)`
- the diagram page now builds `enrichedProject.sites` from the sites query instead of `project.sites`
- diagram loading waits for both the project and the site query
- diagram error handling now also covers site-query failure
- refreshed prebuilt frontend `dist` so the Render static deployment includes the fix immediately

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/dist/*`
- `project-meta/BUILD-NOTES-v353.md`

## Validation
- TypeScript compile check passed with `tsc -p ./tsconfig.json`
- frontend production build completed successfully with Vite
