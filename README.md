# SubnetOps Starter

SubnetOps is a VLAN/IP planning workspace for small IT teams.

## v41 release notes
- consistency pass for shared loading, empty, and error states
- project overview/settings/sites/VLANs/validation/tasks updated to use common workspace patterns
- report and diagram views now follow the same trust-oriented state handling
- AI planning now includes assumptions, review checklist, and selective draft apply controls

## v42 release notes
- project workspace header now surfaces stronger status, update, and quick-action context
- dashboard and project cards now emphasize recent activity and workspace maturity
- sites, VLANs, validation, and tasks now use denser operational views with better summaries and filters
- diagram page now behaves more like a focused workspace with guide content and quick next-step navigation
- table surfaces now use cleaner wrappers, sticky headers, and tighter action presentation

## v43 release notes
- the app now leans more clearly into a network-product identity instead of a generic project shell
- overview and dashboard surfaces now use stronger network-planning language and profile cues
- AI planning now includes network starter prompts for office, clinic, school-lab, and warehouse scenarios
- a public About page was added for product/company context, including NetWorks as the planned company name
- the About page also credits Rizwan Chohan as the creator of the product

## What is real in this codebase
- React + Vite frontend
- Express + Prisma backend
- PostgreSQL data model
- auth with JWT cookie session
- project/site/VLAN CRUD
- subnet validation
- CSV/PDF export
- diagrams and report page
- orgs, invites, comments, tasks, notifications
- SMTP-capable email service with outbox fallback
- optional automation sweep for overdue reminders and digests

## Demo login
- Email: `demo@subnetops.local`
- Password: `Demo1234!`

## Local run (recommended first)

### 1. Start PostgreSQL
Use local Postgres or Docker.

With Docker:
```bash
cd subnetops-starter
docker compose up -d db
```

### 2. Backend
```bash
cd backend
npm install --ignore-scripts
cp .env.example .env
```

Edit `.env` for your environment. For local backend + Docker DB, use:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/subnetops?schema=public"
CORS_ORIGIN="http://localhost:4173"
JWT_SECRET="change-this-in-production"
NODE_ENV="development"
SEND_REAL_EMAILS=false
AUTOMATION_SWEEP_ENABLED=false
```

Then run:
```bash
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open:
- Frontend: `http://localhost:4173`
- Backend: `http://localhost:4000`

## Production-oriented container run
For a production-style local deployment:
```bash
docker compose -f docker-compose.prod.yml up --build -d
./scripts/smoke-test.sh http://localhost
```

Notes:
- the frontend container serves static assets with nginx
- nginx proxies `/api` requests to the backend container
- the frontend no longer hardcodes `localhost:4000`
- use `backend/.env.production.example` as the starting point for real production envs


## Render deployment
A Render Blueprint file is included at `render.yaml`. It defines:
- a Render Postgres database
- a backend web service
- a frontend static site

For Render specifically:
- set `CORS_ORIGIN` to the frontend Render URL
- set `VITE_API_BASE_URL` to the backend Render URL ending in `/api`
- provide SMTP values only if you want real outbound email

See `DEPLOY_RENDER.md` for the platform-specific deployment steps.

## Health endpoints
- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`

## SMTP configuration
To send real emails instead of only writing to outbox:
```env
SEND_REAL_EMAILS=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-pass
SMTP_FROM=no-reply@example.com
```

Without SMTP config, the app still works and records outbound email intent in the outbox table.

## Automation sweep
To enable automated overdue reminders and digests:
```env
AUTOMATION_SWEEP_ENABLED=true
AUTOMATION_SWEEP_INTERVAL_MS=300000
```

## Production notes
Before a real production deployment:
- set a strong `JWT_SECRET`
- use a real PostgreSQL instance
- use HTTPS
- use a real SMTP provider
- replace `prisma db push` with reviewed Prisma migrations
- disable demo seeding in production
- point `CORS_ORIGIN` at your public frontend origin if you are not using same-origin nginx proxying

## Execution-test notes
- This starter is structured for separate frontend and backend build verification in a normal development or CI environment.
- Backend runtime still depends on a successful `prisma generate` step.
- In restricted environments, Prisma v6 may still require access to Prisma engine download infrastructure during generation even when `engineType = "client"` is enabled. If `prisma generate` fails, run it in CI/build infrastructure with outbound access and then deploy the generated artifacts.

## Deployment-oriented container behavior
- frontend builds to static assets and serves through nginx
- backend install uses `npm install --ignore-scripts` so Prisma generation is deferred to startup
- the provided smoke-test script checks frontend + live + ready endpoints
