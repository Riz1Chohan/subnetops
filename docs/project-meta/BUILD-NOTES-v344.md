# SubnetOps v344

This pass focuses on Render deployment resilience for the frontend package.

## Changes
- updated `render.yaml` frontend build command from `npm install && npm run build` to `npm run build`
- added `frontend/.npmrc` with reduced-audit noise and more tolerant fetch retry / timeout settings

## Why
The previous Render failure occurred during package download with `ETIMEDOUT` while fetching `postcss`.
This is primarily a network issue, but this pass removes the redundant second install and makes npm fetch behavior a bit more resilient during frontend dependency installation.

## Files changed
- `render.yaml`
- `frontend/.npmrc`
- `project-meta/BUILD-NOTES-v344.md`
