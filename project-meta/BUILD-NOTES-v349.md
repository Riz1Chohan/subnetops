# SubnetOps v349

This pass continues the live-canvas work and adds a small deployment-escalation note for the frontend if Render keeps timing out during npm install.

## Diagram changes
- added quick **site lens** buttons above the live canvas so the user can jump directly between:
  - global canvas
  - first visible site lenses
  - WAN / Cloud transport lens
- added a **Center** canvas control beside zoom controls
- strengthened the physical transport band with a clearer **transport capsule strip** that includes:
  - primary hub capsule
  - attached site capsules
  - WAN label
  - VLAN count
  - service count

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/src/styles.css`
- `project-meta/RENDER-FRONTEND-FALLBACK-PLAN.md`
- `project-meta/BUILD-NOTES-v349.md`

## Deployment note
The repeated Render failure pattern is still npm dependency fetch timeout during Render's own install stage, not an app TypeScript failure. If that remains persistent after the current retry, the next escalation should be switching the frontend to a **prebuilt static deployment path** so the frontend service does not depend on live npm installation during Render deploys.
