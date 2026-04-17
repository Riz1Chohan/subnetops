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

## v44 release notes
- the product shell now uses shared branding and navigation instead of leaving About disconnected from the rest of the experience
- NetWorks branding and the uploaded logo are now integrated into public, auth, and app layouts
- About copy now presents NetWorks and SubnetOps in a more professional company/product structure
- project creation now begins with a guided planning step before the AI workflow, including use-case and environment selection
- guided answers can now seed the AI planner so the first draft starts from more realistic planning context

## v45 release notes
- guided project creation now captures a broader requirements brief instead of only a lightweight starter context
- the planning flow now includes project phase, compliance context, WAN model, server placement, and primary design goal
- security, resilience, wireless, remote access, and cloud-connected needs now appear as planning signals before draft generation
- the project form can now start from a generated requirements summary, not only from raw AI output
- the AI seed prompt is now driven by a richer requirements brief so the first draft is grounded in more realistic design intent

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
npm run prisma:update
npm run prisma:seed
npm run dev
```

This now handles the normal Prisma update flow in one step:
- regenerate the Prisma client
- apply the current schema to the database with `prisma db push`

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

## Prisma schema update flow
When a version adds or changes Prisma fields, use the built-in update flow before backend testing or deployment:

```bash
cd backend
npm run prisma:update
```

This project now also supports boot-time Prisma sync through backend startup controls:
- `PRISMA_SYNC_ON_BOOT=true` will run a schema sync when the backend starts
- `PRISMA_SYNC_STRATEGY=push` uses `prisma db push` and matches the current repo workflow
- `PRISMA_SYNC_STRATEGY=migrate` is reserved for reviewed migration files when you adopt migration-based releases later

Render and the provided docker-compose backend startup now call the backend entrypoint so this sync flow is built into normal deployment startup.

## Production notes
Before a real production deployment:
- set a strong `JWT_SECRET`
- use a real PostgreSQL instance
- use HTTPS
- use a real SMTP provider
- this starter currently defaults to startup schema sync with `prisma db push`; when you later move to reviewed migrations, switch `PRISMA_SYNC_STRATEGY` to `migrate` and add migration files
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


## v46 release notes
- upgraded subnetting logic from basic CIDR checks toward a more realistic IP planning model
- added subnet facts such as canonical CIDR, mask, wildcard, network, broadcast, first/last usable, and role-aware usable counts
- added role-aware planning for user, guest, server, management, voice, printer, IoT, camera, WAN transit, and loopback-style segments
- improved validation with canonical CIDR warnings, parent site block checks, /31 and /32 review logic, and richer capacity guidance
- upgraded VLAN workspace to show subnetting insight and stronger addressing details


## v47 release notes
- redesigned the validation workspace into a more realistic engineering review flow
- added category grouping for addressing, gateway, capacity, segment-role, input-quality, and general findings
- added search and filters for severity, entity type, and category
- improved validation cards with rule codes, entity tags, and duplicate-task awareness
- strengthened the side guidance so validation feels closer to a real review surface instead of a simple issue list


## v48 release notes
- rebuilt the diagram workspace so it looks more like a real network plan and less like an abstract tree
- added a clearer internet edge, firewall, core, site edge, access, and server/wireless storytelling model
- improved logical and physical/topology view separation
- updated the diagram page guidance so users understand when to use each view


## v49 release notes
- redesigned the report page into a stronger handoff and review surface
- added an executive summary, planning profile, validation posture, and top findings section
- expanded the segmentation table with subnetting-aware fields like usable space and headroom
- kept the diagram and detailed findings in the report so the page is more useful for stakeholder review and export


## v50 release notes
- added a dedicated Requirements workspace inside the project shell
- started the workflow reset toward Requirements -> Logical Design -> Validation -> Diagram -> Report/Export
- now persists guided planning inputs on the project as structured requirements JSON
- updated the start flow so conditional scenario panels appear when security, wireless, cloud, or resilience choices matter
- aligned the logical design and report surfaces more closely to the saved requirements context


## v51 release notes

- Extended the requirements model toward a more dynamic branching planner.
- Added scenario-based planning fields to the in-project Requirements workspace, not only the new-project flow.
- Added richer scenario context to the logical design and report surfaces so security, wireless, resilience, and cloud choices remain visible after intake.


## v52 release notes

- Expanded the requirements model to capture stronger security and trust-boundary decisions.
- Added deeper cloud and hybrid planning fields for identity boundaries and traffic boundaries.
- Updated the guided planner and requirements workspace so these choices stay visible in logical design and report views.


## v53 release notes

- Deepened the cloud and hybrid planning model with hosting, network, and routing choices.
- Added hybrid-aware context to the diagram workspace so cloud boundary decisions are visible during review.
- Added a cloud / hybrid planning summary to the report so hybrid assumptions carry into handoff outputs.


## v54 release notes

- Added an addressing and subnetting strategy layer to the guided planner and requirements workspace.
- Expanded the requirements model with address hierarchy, site block, gateway, growth, and reserved-range policy choices.
- Carried the addressing strategy into logical design and report surfaces so subnetting reads more like a planned hierarchy.


## v55 release notes

- Added an operations and manageability planning layer to the guided planner and requirements workspace.
- Expanded the requirements model with management IP, naming, monitoring, logging, backup, and ownership decisions.
- Carried operational planning assumptions into logical design and report views so the plan reads more like a maintainable network design.


## v56 release notes

- Added a physical layout and endpoint profile layer to the guided planner and requirements workspace.
- Expanded the requirements model with site layout, physical scope, and device-count assumptions across printers, phones, APs, cameras, servers, and IoT devices.
- Carried that physical and endpoint context into logical design and report views so the plan feels more tied to real sites and real infrastructure demand.


## v57 release notes

- Added an applications, WAN, and performance planning layer to the guided planner and requirements workspace.
- Expanded the requirements model with application profile, critical services, inter-site traffic, bandwidth, latency, QoS, outage tolerance, and growth-horizon choices.
- Carried the traffic and performance context into logical design and report surfaces so the plan reflects real service behavior and WAN expectations.


## v58 release notes

- Added an implementation constraints and outputs planning layer to the guided planner and requirements workspace.
- Expanded the requirements model with budget, vendor preference, timeline, rollout, downtime, team capability, and handoff-target choices.
- Carried that delivery and output context into logical design and report surfaces so the plan reflects how it will actually be implemented and consumed.


## v60 release notes

- Strengthened the About and product messaging with a more standards-informed planning and methodology layer.
- Added methodology-oriented guidance to the requirements and report surfaces so the app reads more like a serious planning workflow.
- Refined landing/about copy so NetWorks and SubnetOps present more clearly as a professional product and company direction.


## v61 release notes

- Added track-level status and review guidance to the guided planner and requirements workspace.
- Introduced planning-track readiness summaries so the active scenario areas read more like a guided workflow.
- Moved the planner another step toward a fuller dynamic branching model by combining active-track visibility with review status.


## v63 release notes

- Added requirements-readiness summaries to the planner, requirements workspace, logical design view, and report.
- Introduced readiness labels and next-review guidance so the active planning tracks feel more actionable.
- Continued the guided-workflow direction by turning track status into more visible planning progress.


## v64 release notes

- Deepened the physical planning layer with site role, buildings, floors, closet model, and edge-footprint fields.
- Extended the physical and endpoint profile so it reads more like real site-structure planning instead of only device counts.
- Carried the richer site-structure context into logical design and report views.


## v65 release notes

- Added a clearer workflow-progress layer to the project shell so the path from Requirements to Report reads more like one guided process.
- Introduced stage cards for Requirements, Logical Design, Validation, Diagram, and Report / Export, with current-stage and next-stage guidance.
- Added current-workflow guidance in the sidebar so users can see what stage they are in and where the review should move next.


## v66 release notes

- Added a dependency and environment stabilization pass focused on reproducibility and verification readiness.
- Pinned frontend and backend package versions instead of leaving them floating under caret ranges.
- Aligned Prisma package versions and added runtime guidance files for Node 20.12.2.
- Added a verification script so installs and builds can be checked more consistently outside this container.

## v67 release notes

- Rebuilt Start Plan into a multi-step planning wizard with Back / Next flow and a left-side section rail.
- Replaced the long one-page intake with calmer stage-by-stage planning sections and a structured Plan Snapshot.
- Added an AI workspace route so AI planning can stay separate from the guided planning wizard.
- Refined planner terminology and topbar branding, including the slogan “Plan networks with clarity.”


## v68 release notes

- Added dedicated Help and FAQ pages and wired them into the public and signed-in navigation.
- Kept the AI workspace separate from Start Plan and added quick links between AI, Help, FAQ, and the planner.
- Introduced lightweight help-tip popovers inside the planner so guidance is available without turning the product into a chat-style experience.


## v69 release notes

- improved auth reliability for register, login, and logout flows
- added friendlier duplicate-email handling during account creation
- added account password change support
- added forgot/reset password pages for development and testing
- improved session clearing on logout and password changes


## v70 Release Notes

- carried forward the live Render deployment fixes discovered after v66
- frontend build now uses an explicit TypeScript project path instead of build mode
- fixed ES2020-safe segment-role label formatting in the VLAN and report views
- fixed requirements readiness labels in the project shell to use the correct readiness property
- fixed backend PostgreSQL pool import handling for Node ESM/CommonJS interop on Render
- fixed the PostgreSQL pool global type annotation to keep the backend TypeScript build clean
