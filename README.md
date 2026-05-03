# SubnetOps V1

SubnetOps V1 is a network planning and design platform for turning project requirements into traceable network design artifacts: addressing plans, site and VLAN models, validation findings, implementation guidance, diagrams, and report-ready summaries.

## Product purpose

SubnetOps is designed for network engineers, consultants, MSPs, and technical teams that need a cleaner path from requirements to an implementation-ready design. The product focuses on deterministic engineering evidence rather than generic generated text.

## V1 engineering rules

- Public code, UI, routes, reports, diagrams, exports, package scripts, and documentation use the V1 product identity only.
- Internal development history is not part of the product surface.
- Requirements must flow into normalized design signals, materialized objects, backend computation, validation evidence, frontend display, report output, and diagram output where relevant.
- Generated or inferred content must stay clearly separated from user-provided or backend-proven facts.
- Production database changes must use Prisma migrations, not unsafe schema push commands.
- README.md is the single repository documentation file. New change notes should be added here instead of creating extra Markdown files.

## Repository layout

```text
backend/      Node, Express, Prisma, design-core services, validation, export, IPAM, and API logic
frontend/     Vite, React, TypeScript user interface
scripts/      V1 release checks
render.yaml   Render deployment blueprint
README.md     Single source of repository documentation
```

## Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Production database deployment should use:

```bash
npm run prisma:migrate:deploy
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## V1 checks

From the repository root:

```bash
npm run check:v1
```

The V1 check enforces the public cleanup contract: single README, V1 product package version, no numbered internal milestone labels in paths or source content, and production deployment through migrations.

## Documentation policy

This repository intentionally keeps one Markdown file: README.md. Add future product notes, setup details, operating rules, and release notes to this file. Do not add separate Markdown files for internal milestones, temporary handoffs, implementation notes, or historical change logs.

## Deployment notes

Render is configured with separate backend and frontend services. The backend build generates Prisma client code and compiles TypeScript. The backend start command applies migrations with Prisma migrate deploy before starting the server.

## Product status

V1 is the cleaned public baseline. Future work should improve behavior, tests, imports, validation depth, and user workflows without exposing internal development history in the product or repository surface.
