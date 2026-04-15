# SubnetOps v85 Notes

## Theme
Workspace, layout, and information-architecture reset.

This version is meant to reduce overload and make the engine easier to understand on a real desktop screen.

## Main changes

### 1. Full-width workspace behavior
- Project routes now use a full-width workspace layout instead of the narrower centered page container.
- Core project pages can use the screen more like an application and less like a document page.

### 2. Regrouped project navigation
The project shell is regrouped into fewer primary stages:
- Discovery
- Requirements
- Design Package
- Validation
- Deliver
- Support

Design Package now holds the deeper engineering tabs:
- Overview
- Addressing
- Security
- Routing
- Implementation
- Standards
- Platform & BOM

Deliver now groups:
- Diagram
- Report & Export

### 3. Cleaner project shell
- Removed the heavy duplicated quick-link header.
- Removed the large workflow-card grid from the top of the project shell.
- Added a more compact project header with only the most useful status indicators.
- Added a recommended next-step action.

### 4. Better post-create flow
- New projects now land on Discovery with `?created=1`.
- The project shell shows a clear project-created banner and points the user into the next stage.

### 5. Diagram workspace reset
- The diagram page is now diagram-first.
- The main canvas gets priority on widescreen layouts.
- The guide moved out of the permanent right-side prime area and into a collapsible details panel below.
- Validation and Deliver actions remain visible without crushing the canvas.

### 6. Report / export findability
- The report page now has an obvious `Print / Save PDF` action at the top.
- The report header is trimmed toward delivery actions instead of linking everywhere.

### 7. Included build fixes
This package also carries forward the prior deploy fixes:
- `frontend/src/lib/designSynthesis.ts` cloud-edge `code` fix (`"CLD"` instead of `undefined`)
- `backend/src/controllers/auth.controller.ts` `sameSite` typed-union fix

## Files changed
- `frontend/src/layouts/DashboardLayout.tsx`
- `frontend/src/layouts/ProjectLayout.tsx`
- `frontend/src/pages/NewProjectPage.tsx`
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/src/pages/ProjectReportPage.tsx`
- `frontend/src/router/index.tsx`
- `frontend/src/styles.css`
- `frontend/src/lib/designSynthesis.ts`
- `backend/src/controllers/auth.controller.ts`

## Validation performed here
- Structural TypeScript parsing check passed for the changed TS/TSX shell/page files using a lightweight no-resolve parse setup.
- I did not run a full installed frontend/backend build in this environment.
