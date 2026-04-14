# Deploy SubnetOps on Render

This repository includes a `render.yaml` Blueprint for a three-part Render deployment:
- Render Postgres database
- backend web service
- frontend static site

## 1. Push this repo to GitHub
Render Blueprints are synced from a Git repository.

## 2. Create the Blueprint on Render
In Render:
- New > Blueprint
- select the repository
- confirm `render.yaml`

Render Blueprints use a single YAML file to define multiple services and databases. Render documents `render.yaml` as the standard Blueprint file format, with support for both services and Postgres databases. citeturn801191search0turn521230search10

## 3. Fill the prompted environment variables
When the Blueprint is created, Render will prompt for values marked with `sync: false`.

Set these carefully:
- `CORS_ORIGIN` = your frontend Render URL, for example `https://subnetops-frontend.onrender.com`
- `VITE_API_BASE_URL` = your backend Render URL with `/api`, for example `https://subnetops-backend.onrender.com/api`
- SMTP values only if you want real outbound email

This Blueprint deploys the frontend as a **Render static site**, not the nginx container used in the Docker production example. That means the frontend should call the backend using its public Render URL through `VITE_API_BASE_URL`, rather than relying on same-origin `/api` proxying.

## 4. Backend behavior
The backend service is configured to:
- install dependencies
- run `prisma generate`
- build TypeScript
- run `prisma db push` before deploy
- start the compiled server

## 5. Frontend behavior
The frontend is deployed as a Render static site. The Blueprint uses `staticPublishPath: ./frontend/dist` so the publish path is expressed relative to the repository root, matching Render's Blueprint behavior for static site publish paths.
Render documents static sites as a first-class service type, and Blueprint YAML supports static sites via `type: web`, `runtime: static`, `buildCommand`, and `staticPublishPath`. citeturn576735view0turn576735view4

## 6. Database wiring
The backend `DATABASE_URL` is sourced from the managed Render Postgres instance using Blueprint database references. Render documents `fromDatabase` as the supported way to wire a service env var from a Postgres resource. citeturn576735view3

## 7. Important Prisma note
Prisma documents the rust-free/client engine path using `engineType = "client"` plus a driver adapter. However, Prisma v6 also has a documented issue where `prisma generate` can still try to reach Prisma engine download infrastructure during generation in some environments. citeturn1search2turn1search7

If that happens on Render:
- check the backend build logs
- retry the deploy
- if needed, move Prisma generation into a build environment that has normal outbound network access and redeploy

## 8. After deploy
Verify:
- frontend loads
- backend `/api/health/ready` returns OK
- login works
- project creation works
- validation works
- CSV/PDF export works

## 9. Recommended upgrade after first success
Once the first Render deployment works:
- replace `prisma db push` with reviewed migrations
- move SMTP values to real secrets
- disable demo accounts/seeding in production
- attach a custom domain


## Prisma update behavior
The backend now starts through `./entrypoint.sh` on Render. That startup path will:
- run `prisma generate`
- sync the schema on boot when `PRISMA_SYNC_ON_BOOT=true`
- use `PRISMA_SYNC_STRATEGY=push` by default in this starter

For this codebase, that means schema changes like new JSON columns are applied as part of the normal startup/deploy flow instead of being left as a manual reminder.

If you later move to reviewed Prisma migration files, change:
- `PRISMA_SYNC_STRATEGY=migrate`

and keep `PRISMA_SYNC_ON_BOOT=true`.
