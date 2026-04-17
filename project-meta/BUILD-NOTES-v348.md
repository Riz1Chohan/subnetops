# SubnetOps v348

This pass continues the main live diagram canvas work while also hardening Render deployment settings from the package side.

## Diagram changes
- added diagram focus presets above the live canvas so the user can inspect blueprint, edge, switching, wireless, services, or flow posture without leaving the main canvas
- connected those focus presets into the existing SVG focus engine by driving deviceFocus and linkFocus instead of leaving them fixed at all/all
- added a subtle blueprint grid treatment to the live canvas viewport so the surface reads more like a design workspace
- kept the single-canvas approach with no duplicate snapshot layer

## Deployment hardening
- extended both root and frontend `.npmrc` with `fetch-timeout=300000` and `maxsockets=1`
- added frontend and backend `NPM_CONFIG_*` environment variables in `render.yaml` so retry and timeout settings are present at the service level during deployment
- added `buildFilter` paths for backend and frontend services in `render.yaml` so unrelated file changes do not trigger automatic redeploys for those services

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/src/styles.css`
- `.npmrc`
- `frontend/.npmrc`
- `render.yaml`
- `project-meta/BUILD-NOTES-v348.md`
