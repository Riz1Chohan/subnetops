# SubnetOps v356

This pass focuses on cleaning up the **diagram page layout** so the diagram itself becomes the main experience.

## What changed
- removed the extra top legend strip from the diagram page
- removed the lower support bar under the canvas
- removed the always-visible site-lens strip above the canvas
- removed the always-visible focus-preset strip above the canvas
- kept the actual diagram canvas as the main content area
- simplified the left control rail into:
  - essential view/scope controls
  - layers
  - a collapsed advanced controls section
- kept advanced options available, but pushed them into the background by default
- trimmed the canvas header so it feels more diagram-first and less like a dashboard
- refreshed the prebuilt frontend `dist` so this layout change is included immediately in the current static deployment model

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/src/styles.css`
- `frontend/dist/*`
- `project-meta/BUILD-NOTES-v356.md`

## Validation
- TypeScript compile passed with `tsc -p ./tsconfig.json`
- frontend production build completed successfully
