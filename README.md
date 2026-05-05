# SubnetOps V1

SubnetOps V1 is a network planning and design platform for turning project requirements into traceable network design artifacts: addressing plans, site and VLAN models, validation findings, implementation guidance, diagrams, and report-ready summaries.

## Product purpose

SubnetOps is designed for network engineers, consultants, MSPs, and technical teams that need a cleaner path from requirements to an implementation-ready design. The product focuses on deterministic engineering evidence rather than generic generated text.

## V1 engineering rules

- Public code, UI, routes, reports, diagrams, exports, package scripts, and documentation use the V1 product identity only.
- Internal development history is not part of the product surface.
- Requirements must flow into normalized design signals, applied design outputs, backend computation, validation evidence, frontend display, report output, and diagram output where relevant.
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



## Current repair baseline

Feature development is frozen while the foundation is being repaired. Do not add new diagram overlays, report sections, AI helper behavior, planner pages, routing features, or UX polish until the baseline is reliable.

Current baseline status:

| Area | Status |
| --- | --- |
| Root release gate | `npm run check:v1` follows the Render backend startup path and validates production migration safety. |
| Render deployment | `render.yaml` delegates backend startup to `backend/entrypoint.sh`; the delegated script runs Prisma migration deployment. |
| Backend build | TypeScript backend build passed in the repair container after the safety baseline patch. |
| Prisma generation | Blocked in the repair container because Prisma engine download from `binaries.prisma.sh` was unavailable; re-run in CI or local Node 20.12.x with network access. |
| CIDR selftests | CIDR, CIDR proof, boundary, addressing, and allocator selftests passed after correcting bad math expectations. |
| Frontend build | Install completed, but the Vite/TypeScript build timed out in the repair container; re-run on Node 20.12.x before calling the frontend healthy. |

Corrected test assumptions:

| File | Correction |
| --- | --- |
| `backend/src/lib/cidrProof.selftest.ts` | Corrected the invalid expectation that `10.0.1.20` belongs inside `11.0.0.0/24`; it now checks a valid `10.0.1.0/24` parent. |
| `backend/src/lib/addressAllocator.selftest.ts` | Replaced an outside-parent fragmentation range with a valid in-parent range, `10.0.1.0/25`, inside `10.0.0.0/22`. |

## Backend repair boundary

The first real backend extraction target is addressing because CIDR math and allocation fit checks are the base for IPAM, topology, validation, diagrams, reports, and implementation guidance.

The current domain boundary is:

```text
backend/src/domain/addressing/
  cidr.ts
  ipv6.ts
  allocation-fit.ts
  index.ts
```

Compatibility wrappers remain in `backend/src/lib/` so existing controllers, services, and selftests do not break while imports are migrated gradually.

Addressing domain rules:

- no Express imports
- no Prisma imports
- no frontend DTO imports
- deterministic pure logic where practical
- old `lib` files must only re-export domain logic, not duplicate it
- tests must prove real subnet math instead of forcing the code to satisfy bad assumptions

Next safe backend moves:

1. migrate internal imports from `src/lib/cidr.ts`, `src/lib/ipv6Cidr.ts`, and `src/lib/addressAllocator.ts` to `src/domain/addressing`
2. add focused addressing tests beside the domain code
3. extract requirements handling after addressing is stable
4. extract IPAM after requirements and addressing are clean

Do not start with diagrams, reports, AI, or UX polish. That would hide the real problem instead of fixing it.

## Frontend repair boundary

The frontend may display, filter, sort, collapse, expand, visualize, and explain verified backend facts.

The frontend must not invent final:

- subnets
- VLANs
- routes
- firewall zones
- gateways
- readiness statuses
- implementation plans
- report claims
- topology relationships

Large frontend risks still to split later:

| Area | Risk | Later action |
| --- | --- | --- |
| Project pages | Too many heavy screens load together. | Lazy load major sections. |
| Diagram canvas | Rendering, labels, selection, evidence, controls, and policy panels are too mixed. | Split renderer, toolbar, legend, nodes, links, overlay controls, evidence panel, empty state, layout, and view-model mapping. |
| Report page | Must not create missing engineering facts. | Ensure report components only display backend-provided section states and findings. |
| Internal wording | Some screens still expose terms like engine, proof, materialized, propagation, and orchestrator. | Replace with user-facing wording after backend contracts stabilize. |

## Release gate notes

The release checker validates:

- root, backend, and frontend packages stay at `1.0.0`
- old high-numbered version labels do not leak into code or paths
- old numbered internal milestone labels do not leak into code or paths
- README.md is the only Markdown documentation file
- production startup does not use unsafe Prisma schema push
- production startup runs Prisma migration deployment, even when Render delegates startup to `backend/entrypoint.sh`

Production compose uses `backend/.env.production`, not the example environment file.

## Product status

V1 is the cleaned public baseline. Future work should improve behavior, tests, imports, validation depth, and user workflows without exposing internal development history in the product or repository surface.

## Addressing domain import migration

The backend now imports CIDR, IPv6 CIDR, and allocation-fit logic from the addressing domain instead of treating the old `src/lib` wrappers as the main source.

Current addressing source paths:

```text
backend/src/domain/addressing/cidr.ts
backend/src/domain/addressing/ipv6.ts
backend/src/domain/addressing/allocation-fit.ts
backend/src/domain/addressing/index.ts
backend/src/domain/addressing/addressing-domain.selftest.ts
```

The compatibility files remain only to protect older call sites and scripts while the rest of the backend is cleaned up:

```text
backend/src/lib/cidr.ts
backend/src/lib/ipv6Cidr.ts
backend/src/lib/addressAllocator.ts
```

Those wrapper files must stay thin. They must not regain business logic.

The new focused addressing-domain self-test covers:

- strict IPv4 CIDR parsing and malformed input rejection
- canonical subnet facts
- /30, /31, and /32 role-aware usable-host behavior
- overlap and containment behavior
- gateway validation
- role-aware capacity sizing
- allocator clipping, free-range, utilization, and deterministic placement behavior
- IPv6 CIDR parsing, containment, overlap, free-range, and next-prefix behavior

Validation performed during this update:

```text
npm run check:v1
transpiled and ran backend/src/domain/addressing/addressing-domain.selftest.ts in an isolated temp runtime
static check: no backend source imports addressing logic through src/lib wrappers except the wrappers themselves
static check: addressing domain has no Express, Prisma, or frontend imports
static check: README.md remains the only Markdown documentation file
static check: relative backend .js imports resolve to TypeScript source files
```

Dependency installation was still unstable in the repair container, so the full backend build and full backend self-test suite should be rerun in CI or locally with Node 20.12.x before treating this as production-ready.

## Requirements domain extraction

Requirements handling now has a backend domain boundary instead of keeping all pure requirement logic inside application services.

Current requirements source paths:

```text
backend/src/domain/requirements/types.ts
backend/src/domain/requirements/normalize.ts
backend/src/domain/requirements/apply.ts
backend/src/domain/requirements/traceability.ts
backend/src/domain/requirements/impact-registry.ts
backend/src/domain/requirements/policy.ts
backend/src/domain/requirements/index.ts
backend/src/domain/requirements/requirements-domain.selftest.ts
```

Compatibility wrappers remain for older service imports:

```text
backend/src/services/requirementsImpactRegistry.ts
backend/src/services/requirementsMaterialization.policy.ts
```

Those wrapper files must stay thin. They must not regain requirement business logic.

The requirements domain now owns pure helpers for:

- saved requirement JSON parsing
- requirement value normalization
- selected-site and selected-segment interpretation
- requirement-derived segment planning
- requirement-to-addressing plan preparation
- consumed requirement field listing
- requirement trace records
- requirement review items
- materialization policy summaries

The application service still owns database reads, writes, change logs, transactions, and read-repair behavior. That split matters: domain logic can decide what a requirement means, but persistence and audit behavior stay in the service layer until repositories are introduced.

Validation performed during this update:

```text
npm run check:v1
static TypeScript check for addressing and requirements domain files
static TypeScript check for requirements materialization service using temporary dependency stubs
transpiled and ran backend/src/domain/requirements/requirements-domain.selftest.ts in an isolated temp runtime
static check: requirements domain has no Express, Prisma, route, controller, or React imports
static check: README.md remains the only Markdown documentation file
```

Dependency installation remains unreliable in the repair container, so the normal backend build and full backend self-test suite should still be rerun in CI or locally with Node 20.12.x before treating this as production-ready.

## IPAM domain extraction

Enterprise IPAM now has a backend domain boundary for pure allocation posture and brownfield conflict review logic.

Current IPAM domain source paths:

```text
backend/src/domain/ipam/enterprise-ipam.ts
backend/src/domain/ipam/brownfield-conflicts.ts
backend/src/domain/ipam/index.ts
backend/src/domain/ipam/ipam-domain.selftest.ts
```

Compatibility wrapper retained for older imports:

```text
backend/src/lib/enterpriseAddressAllocator.ts
```

That wrapper must stay thin. It must not regain allocation, DHCP, brownfield, approval, or ledger business logic.

The IPAM domain now owns pure helpers for:

- extracting route domains, pools, allocations, DHCP scopes, reservations, brownfield networks, approvals, and ledger evidence from project design data
- building durable allocator posture from addressing rows and IPAM source data
- deterministic IPv4 and IPv6 allocation proposal rows from durable pools
- same-route-domain overlap detection
- brownfield overlap review across imported networks, durable allocations, DHCP scopes, pools, and allocator plan rows
- DHCP and reservation posture checks
- reserve policy posture checks
- stale approval and ledger posture checks
- overall allocator readiness calculation

The enterprise IPAM application service still owns authorization, Prisma reads and writes, transaction boundaries, record creation/update/delete, change logs, and write-time integrity checks. That is intentional for this slice. The next IPAM cleanup should move write-integrity decisions into pure domain helpers that return structured decisions, while the service remains responsible for database transactions and audit logging.

Validation performed during this update:

```text
npm run check:v1
transpiled and ran backend/src/domain/ipam/ipam-domain.selftest.ts in an isolated temp runtime
static TypeScript check for enterpriseIpam.service.ts reached only missing dependency/type-definition errors because node_modules is unavailable in the repair container
static check: IPAM domain has no Express, Prisma, route, controller, service, or React imports
static check: README.md remains the only Markdown documentation file
```

Dependency installation remains unreliable in the repair container, so the normal backend build and full backend self-test suite should still be rerun in CI or locally with Node 20.12.x before treating this as production-ready.

## Validation domain extraction

Validation/readiness now has a backend domain boundary for pure finding, coverage, and readiness logic instead of leaving that math inside the design-core control surface.

Current validation domain source paths:

```text
backend/src/domain/validation/types.ts
backend/src/domain/validation/findings.ts
backend/src/domain/validation/readiness.ts
backend/src/domain/validation/coverage.ts
backend/src/domain/validation/index.ts
backend/src/domain/validation/validation-domain.selftest.ts
```

The validation domain now owns pure helpers for:

- structured validation finding records
- severity, status, and category normalization
- deterministic finding IDs
- affected-object and evidence preservation
- readiness derivation from findings
- critical, high, medium, low, and info impact rules
- explicit accepted-risk handling
- missing-data and incomplete-readiness behavior
- implementation gate allowance calculation
- coverage summaries
- user-friendly readiness labels
- compatibility mapping for the existing V1 readiness categories

The existing design-core validation readiness control now uses the validation domain for category normalization, finding IDs, category counts, and readiness derivation. The control surface still owns orchestration across requirements, addressing, IPAM, standards, routing, security, implementation, report, and diagram snapshots. That split matters: validation math is pure domain code, while design-core still gathers the current project snapshot and maps upstream domain outputs into the readiness ledger.

Validation performed during this update:

```text
npm run check:v1
tsc static check for backend/src/domain/validation/*.ts
transpiled and ran backend/src/domain/validation/validation-domain.selftest.ts in an isolated temp runtime
transpiled and ran backend/src/lib/validationReadiness.selftest.ts in an isolated temp runtime
tsc static check for validation domain plus designCore.validationReadinessControl.ts and designCore.types.ts
static check: validation domain has no Express, Prisma, route, controller, service, or React imports
static check: README.md remains the only Markdown documentation file
static check: package versions remain 1.0.0
```

Dependency installation remains unreliable in the repair container, so the normal backend build and full backend self-test suite should still be rerun in CI or locally with Node 20.12.x before treating this as production-ready.

## Topology domain extraction

Topology now has a backend domain boundary for pure site, VLAN, device, interface, link, zone, subnet-attachment, and route-domain membership modeling.

Current topology domain source paths:

```text
backend/src/domain/topology/types.ts
backend/src/domain/topology/sites.ts
backend/src/domain/topology/devices.ts
backend/src/domain/topology/interfaces.ts
backend/src/domain/topology/links.ts
backend/src/domain/topology/vlans.ts
backend/src/domain/topology/zones.ts
backend/src/domain/topology/coverage.ts
backend/src/domain/topology/topology-model.ts
backend/src/domain/topology/index.ts
backend/src/domain/topology/topology-domain.selftest.ts
```

The topology domain now owns pure helpers for:

- deterministic site, VLAN, device, interface, link, zone, subnet-attachment, and route-domain membership IDs
- gateway device and security-boundary device modeling from project/site evidence
- logical VLAN gateway interface modeling from authoritative address rows
- WAN transit and loopback interface modeling from backend plan rows
- security-zone classification from segment role, VLAN name, and row notes
- explicit subnet attachment records that connect site, VLAN, subnet, gateway interface, zone, and route-domain ownership
- route-domain membership records for sites, devices, interfaces, subnets, and zones
- topology findings for missing sites, missing gateway devices, and sites without modeled gateway interfaces
- coverage summaries that count verified, review-required, and incomplete topology objects separately

The existing network object model now attaches the pure topology model as backend evidence while keeping routing, security policy, implementation planning, design graph, report truth, and diagram truth in their current control surfaces. This is intentional: topology must become structured backend data first, but routing/security-policy objects are still separate upcoming extraction targets.

Validation performed during this update:

```text
npm run check:v1
tsc static check for backend/src/domain/topology/topology-domain.selftest.ts and imported topology files
transpiled and ran backend/src/domain/topology/topology-domain.selftest.ts in an isolated temp runtime
tsc static check for topology domain plus designCore.networkObjectModel.ts and designCore.types.ts
ran a network object builder smoke test confirming the topology model is attached to the returned backend model
static check: topology domain has no Express, Prisma, route, controller, service, or React imports
static check: README.md remains the only Markdown documentation file
static check: package versions remain 1.0.0
```

Dependency installation remains unavailable in the repair container, so the normal backend build and full backend self-test suite should still be rerun in CI or locally with Node 20.12.x before treating this as production-ready.

## Routing and security-policy domain extraction

Routing and security policy now have backend domain boundaries for object-based planning models. This keeps route intent, route-table review, segmentation expectation, zone policy, service object, NAT, logging, and policy-risk logic out of the design-core service layer while preserving the existing V1 control outputs.

Current routing domain source paths:

```text
backend/src/domain/routing/types.ts
backend/src/domain/routing/route-domains.ts
backend/src/domain/routing/static-routes.ts
backend/src/domain/routing/default-routes.ts
backend/src/domain/routing/summarization.ts
backend/src/domain/routing/path-analysis.ts
backend/src/domain/routing/routing-model.ts
backend/src/domain/routing/index.ts
backend/src/domain/routing/routing-domain.selftest.ts
```

Current security-policy domain source paths:

```text
backend/src/domain/security-policy/types.ts
backend/src/domain/security-policy/zones.ts
backend/src/domain/security-policy/service-model.ts
backend/src/domain/security-policy/rule-model.ts
backend/src/domain/security-policy/matrix.ts
backend/src/domain/security-policy/nat-model.ts
backend/src/domain/security-policy/risk.ts
backend/src/domain/security-policy/security-policy-model.ts
backend/src/domain/security-policy/index.ts
backend/src/domain/security-policy/security-policy-domain.selftest.ts
```

The routing domain now owns pure helpers for:

- route domain readiness
- connected, static, summary, and default route intent modeling
- neutral route-table entries
- site-to-site reachability checks
- route conflict and next-hop review findings
- route intent destination coverage checks
- segmentation expectation generation from modeled zones and policies
- routing/segmentation summary derivation

The security-policy domain now owns pure helpers for:

- zone posture and high-risk/high-value zone classification
- service object and service group modeling
- policy rule broad-permit and review detection
- zone-to-zone policy matrix rows
- flow requirements from segmentation and security-sensitive project requirements
- NAT coverage review
- logging review
- shadowing/order review
- security finding and readiness derivation

The existing design-core routing and security-policy service files are now compatibility wrappers. They keep old imports working while delegating the pure object-model logic to the domain folders. Design-core still orchestrates the project snapshot; the routing/security-policy domains own the deterministic planning logic.

Validation performed during this update:

```text
npm run check:v1
tsc static check for backend/src/domain/routing/*.ts and backend/src/domain/security-policy/*.ts
transpiled and ran backend/src/domain/routing/routing-domain.selftest.ts in an isolated temp runtime
transpiled and ran backend/src/domain/security-policy/security-policy-domain.selftest.ts in an isolated temp runtime
tsc static check for routing/security domains plus designCore routing/security compatibility wrappers and designCore.types.ts
static check: routing and security-policy domains have no Express, Prisma, route, controller, service, or React imports
static check: README.md remains the only Markdown documentation file
static check: package versions remain 1.0.0
```

Dependency installation remains unavailable in the repair container, so the normal backend build and full backend self-test suite should still be rerun in CI or locally with Node 20.12.x before treating this as production-ready.

## Implementation planning domain extraction

Implementation planning now has a backend domain boundary for vendor-neutral change planning logic.

Current implementation source paths:

```text
backend/src/domain/implementation/types.ts
backend/src/domain/implementation/tasks.ts
backend/src/domain/implementation/migration-plan.ts
backend/src/domain/implementation/rollback.ts
backend/src/domain/implementation/verification-commands.ts
backend/src/domain/implementation/templates.ts
backend/src/domain/implementation/index.ts
backend/src/domain/implementation/implementation-domain.selftest.ts
```

Compatibility wrappers remain in `backend/src/services/designCore/` so existing design-core callers keep working while implementation planning logic moves behind the domain boundary:

```text
backend/src/services/designCore/designCore.implementationPlan.ts
backend/src/services/designCore/designCore.implementationTemplates.ts
```

Implementation domain responsibilities:

- vendor-neutral implementation stages and tasks
- task readiness, blockers, review reasons, risk level, blast radius, and source evidence
- dependency graph construction from backend design objects
- operational safety gates for device-facing work
- verification checks tied to source objects, routes, flows, NAT, DHCP, rollback, and documentation
- rollback action modeling
- vendor-neutral templates with command generation explicitly disabled

Implementation domain rules:

- no Express imports
- no Prisma imports
- no frontend or React imports
- no vendor-specific command syntax
- no implementation task may be treated as executable without source evidence, verification coverage, rollback intent, and dependency context
- blocked or review tasks stay blocked/review until the backend model proves otherwise

Validation performed during this update:

```text
npm run check:v1
TypeScript static check for backend/src/domain/implementation/*.ts
TypeScript static check for implementation domain + compatibility wrappers
transpiled and ran backend/src/domain/implementation/implementation-domain.selftest.ts
transpiled and ran backend/src/lib/implementationPlanningEngine.selftest.ts through the compatibility wrapper
static check: implementation domain has no Express, Prisma, controller, service, route, or React imports
static check: README.md remains the only Markdown file
static check: package versions remain 1.0.0
```

Full backend build and full backend self-test suite still need local or CI verification because dependency installation is unavailable in the repair container.

## Frontend cleanup foundation

The frontend cleanup pass now starts enforcing the display-only contract instead of adding more UI surface area.

Frontend routing changes:

- `frontend/src/router/index.tsx` now lazy-loads page modules directly with `React.lazy` and `Suspense`.
- The router no longer imports the eager `frontend/src/pages/index.ts` barrel.
- Heavy project sections such as diagram, report, IPAM, implementation, requirements, and overview are split into route-level chunks by the router.

Frontend truth-contract source paths:

```text
frontend/src/lib/frontendTruthContract.ts
scripts/check-frontend-truth.cjs
```

The frontend truth contract states that the browser may display, sort, filter, collapse, expand, visualize, and format returned backend facts. It may not invent engineering facts for:

- subnets
- VLANs
- routes
- firewall zones
- security policies
- gateways
- readiness statuses
- implementation plans
- report claims
- topology relationships

`useAuthoritativeDesign` now exposes this truth contract with the design snapshot state. When no backend snapshot exists, the display shell remains intentionally empty and marks design facts as unavailable instead of synthesizing a replacement plan.

Release checks now include:

```text
node scripts/check-v1-release.cjs
node scripts/check-frontend-truth.cjs
```

The frontend truth check verifies that:

- the router keeps page-level lazy loading enabled
- the router does not import the eager page barrel
- frontend engineering fallback stays disabled
- forbidden browser-side planner function names are not reintroduced
- the backend-only display shell continues to reject browser-side design inference

A first terminology cleanup pass also removes several user-facing internal labels around IPAM, addressing, runtime checks, diagram evidence, and security-policy output. Some legacy internal names remain in backend DTO fields and compatibility model names, but normal UI copy should continue moving toward user-facing words such as evidence, checks, addressing, IPAM, security policy model, and applied output.

Validation performed during this update:

```text
npm run check:v1
node scripts/check-frontend-truth.cjs
static check: router uses lazyNamedPage and Suspense
static check: router does not import from frontend/src/pages barrel
static check: frontend engineering fallback remains disabled
static check: README.md remains the only Markdown file
static check: package versions remain 1.0.0
```

Full frontend build still needs local or CI verification with dependencies installed because dependency installation is unavailable in the repair container.

## Diagram truth rebuild foundation

Diagram truth now has a backend domain boundary for render graph construction and canvas lineage checks.

Current diagram domain paths:

```text
backend/src/domain/diagram/types.ts
backend/src/domain/diagram/readiness.ts
backend/src/domain/diagram/coverage.ts
backend/src/domain/diagram/render-model.ts
backend/src/domain/diagram/index.ts
backend/src/domain/diagram/diagram-domain.selftest.ts
```

The existing design-core service remains the compatibility surface for callers, but the reusable diagram render model now comes from the pure diagram domain:

```text
backend/src/services/designCore/designCore.reportDiagramTruth.ts
backend/src/services/designCore/designCore.diagramTruthControl.ts
```

Diagram domain responsibilities:

- backend-authored render nodes and render edges
- source object identity for every visual node
- relationship/source-object lineage for every visual edge
- deterministic site, device, route-domain, VLAN/subnet, DHCP summary, WAN boundary, zone, and policy placement data
- explicit empty-state behavior when topology/device/routing evidence is missing
- render coverage rows for node/edge lineage checks
- mode-layer rules for physical, logical, WAN/cloud, security, per-site, and implementation views

Frontend diagram truth changes:

- `BackendDiagramCanvas` now filters, lays out, labels, and deduplicates backend render-model objects only.
- The canvas preparation path no longer adds frontend-created local Internet nodes, VPN fabric nodes, or presentation edges.
- `scripts/check-frontend-truth.cjs` now blocks reintroducing those frontend-created topology objects in the visible diagram preparation path.

Diagram rules:

- no Express imports in the diagram domain
- no Prisma imports in the diagram domain
- no frontend or React imports in the diagram domain
- frontend may display, filter, zoom, select, export, and lay out backend render data
- frontend may not create missing topology nodes, WAN objects, VPN fabric objects, security flows, or topology edges
- missing graph evidence must produce an empty/review state, not a fake clean canvas

Validation performed during this update:

```text
npm run check:v1
node scripts/check-frontend-truth.cjs
TypeScript static check for backend/src/domain/diagram/*.ts
TypeScript static check for diagram domain + report/diagram truth service integration
transpiled and ran backend/src/domain/diagram/diagram-domain.selftest.ts
static check: diagram domain has no Express, Prisma, controller, service, route, or React imports
static check: README.md remains the only Markdown file
static check: package versions remain 1.0.0
```

Full backend build, old diagram selftest execution through `tsx`, and full frontend build still need local or CI verification with dependencies installed because dependency installation is unavailable in the repair container.

## Report/export truth rebuild foundation

Report/export truth now has a backend domain boundary for evidence-based deliverable gates.

Current reporting domain paths:

```text
backend/src/domain/reporting/types.ts
backend/src/domain/reporting/report-export-truth.ts
backend/src/domain/reporting/section-model.ts
backend/src/domain/reporting/export-gates.ts
backend/src/domain/reporting/index.ts
backend/src/domain/reporting/reporting-domain.selftest.ts
```

The existing design-core report/export service remains as the compatibility surface for callers, but the reusable report/export gate logic now comes from the pure reporting domain:

```text
backend/src/services/designCore/designCore.reportExportTruthControl.ts
```

Reporting domain responsibilities:

- required report section gates
- report/export readiness derivation
- requirement traceability rows for exports
- evidence label rows
- blocked/review finding generation
- explicit assumptions and proof boundaries
- PDF/DOCX/CSV coverage gates
- overclaim-risk checks for exports that are not ready
- evidence-document section modeling with verified, partial, requires-review, unavailable, and unsupported states

Report/export rules:

- no Express imports in the reporting domain
- no Prisma imports in the reporting domain
- no frontend or React imports in the reporting domain
- reports must not claim readiness when validation/report gates are blocked or review-required
- routing/security/implementation/diagram sections must remain evidence-gated
- missing report evidence must surface as review-required instead of being hidden by polished wording
- PDF, DOCX, and CSV exports must carry the same readiness and limitation posture as the report page

Export/report wording cleanup performed in this update:

- removed old pre-V1 report-version wording from blocked report metadata
- replaced visible Engine 1 / Engine 2 report labels with Addressing / IPAM wording
- replaced raw Engine 2 report truth labels with durable IPAM evidence labels
- made the report page display user-friendly evidence labels instead of raw internal enum names
- removed unprofessional report-page wording around polished but unsupported outputs

Validation performed during this update:

```text
npm run check:v1
TypeScript static check for backend/src/domain/reporting/*.ts except selftest node typings
TypeScript static check for reporting domain + designCore report/export wrapper + designCore types
TypeScript static check for exportDesignCoreReport.service.ts + export types
transpiled and ran backend/src/domain/reporting/reporting-domain.selftest.ts
transpiled and ran backend/src/lib/reportExportTruth.selftest.ts through the compatibility wrapper
static check: reporting domain has no Express, Prisma, controller, service, route, or React imports
static check: README.md remains the only Markdown file
static check: package versions remain 1.0.0
```

Full backend build, full frontend build, and full selftest execution through `tsx` still need local or CI verification with dependencies installed because dependency installation is unavailable in the repair container.

## Security hardening foundation

Security now has a backend domain boundary and durable server-side enforcement for sessions, audit events, and shared rate limiting.

Current security domain paths:

```text
backend/src/domain/security/types.ts
backend/src/domain/security/sessions.ts
backend/src/domain/security/audit.ts
backend/src/domain/security/authorization.ts
backend/src/domain/security/rate-limit.ts
backend/src/domain/security/index.ts
backend/src/domain/security/security-domain.selftest.ts
```

Security hardening responsibilities now covered:

- signed auth tokens include a server-side session ID and token version
- active sessions are stored in `AuthSession`
- logout revokes the matching server-side session instead of only clearing the browser cookie
- password changes and password resets increment the user's token version and revoke active sessions
- session validation checks user existence, session existence, token hash, revocation state, expiry, token version, and global invalidation time
- shared rate-limit state is stored in `RateLimitBucket` for auth, password reset, AI helper, and report export endpoints
- sensitive audit details redact password/token/secret fields before persistence
- security-relevant events are stored in `SecurityAuditEvent`
- project and organization permission checks use the pure security authorization helper instead of scattered role comparisons

Database changes added:

```text
backend/prisma/migrations/20260503190000_v1_session_audit_rate_limit/migration.sql
```

New Prisma-backed security models:

- `AuthSession`
- `SecurityAuditEvent`
- `RateLimitBucket`

Security rules:

- frontend visibility is not treated as authorization
- project edit access is backend-enforced through project owner / organization owner / organization admin roles
- organization management is backend-enforced through owner/admin roles
- ownership transfer remains owner-only
- password reset and password change invalidate existing sessions
- logout revokes the current server-side session
- rate limiting does not trust raw `X-Forwarded-For`; it uses Express `req.ip` after configured proxy trust
- audit logging must not store raw passwords, reset tokens, JWTs, or secrets

Validation performed during this update:

```text
npm run check:v1
node --check scripts/check-v1-release.cjs
node --check scripts/check-frontend-truth.cjs
TypeScript static check for backend/src/domain/security/*.ts except selftest node typings
transpiled and ran backend/src/domain/security/security-domain.selftest.ts
transpiled and ran backend/src/middleware/rateLimit.selftest.ts with MemoryRateLimitStore
static check: security domain has no Express, Prisma, controller, service, route, or React imports
static check: README.md remains the only Markdown file
static check: package versions remain 1.0.0
```

Full backend build, Prisma generate, migration execution against a real database, and full frontend build still need local or CI verification with dependencies installed because dependency installation is unavailable in the repair container.

## Deployment and CI hardening foundation

Deployment now has explicit CI and production-startup guardrails instead of relying on hidden runtime behavior.

New deployment/CI guardrail:

```text
scripts/check-ci-hardening.cjs
```

The root check now runs:

```text
npm run check:v1
```

That command verifies the release gate, frontend truth contract, and deployment/CI hardening contract.

CI workflow added:

```text
.github/workflows/v1-ci.yml
```

The workflow is designed to verify:

- root release checks
- backend dependency installation
- Prisma client generation
- Prisma migration deployment against Postgres
- backend build
- backend selftests
- frontend dependency installation
- frontend build
- backend container build
- frontend container build

Deployment hardening changes:

- Render backend build now uses `npm run prisma:generate` and `npm run build` before startup.
- Render backend readiness now uses `/api/health/ready`.
- Render explicitly sets Prisma startup behavior to migrate-only and refuses unsafe push behavior.
- The backend Dockerfile now builds the TypeScript output during image build.
- The backend runtime image keeps the Prisma CLI available because startup migrations require it.
- The backend entrypoint no longer builds production code at startup.
- The backend entrypoint refuses production startup if `dist/server.js` is missing.
- Runtime Prisma generation is now opt-in through `PRISMA_GENERATE_ON_BOOT=true`.
- Production examples default brownfield baselining to disabled.
- Production examples keep unsafe Prisma push disabled.
- Production compose still uses `backend/.env.production`, not the example env file.

Deployment rules:

- production startup must run `prisma migrate deploy`
- production startup must not use `prisma db push` unless explicitly forced for non-production recovery
- production containers must start from built artifacts
- production startup must fail loudly if the backend was not built
- database baselining must stay a temporary manual recovery action, not a default setting
- CI must prove migrations, backend build, backend selftests, frontend build, and container builds

Validation performed during this update:

```text
npm run check:v1
node --check scripts/check-v1-release.cjs
node --check scripts/check-frontend-truth.cjs
node --check scripts/check-ci-hardening.cjs
sh -n backend/entrypoint.sh
static check: GitHub Actions workflow includes root checks, backend build, migrations, selftests, frontend build, and container builds
static check: Render backend build generates Prisma client and builds before startup
static check: Render/backend startup uses migrate deploy and refuses unsafe db push by default
static check: backend entrypoint does not build production code at runtime
static check: backend Dockerfile builds at image build time
static check: production env example has brownfield baselining disabled by default
static check: README.md remains the only Markdown file
static check: package versions remain 1.0.0
```

Full CI execution still needs to run in GitHub Actions or an equivalent environment with network access, Docker, and a Postgres service available.

## UX simplification foundation

The workspace UI has been simplified so normal users see product language instead of internal repair-plan wording.

New UX guardrail:

```text
scripts/check-ux-simplification.cjs
```

The root check now verifies the release gate, frontend truth contract, deployment/CI contract, and UX terminology contract:

```text
npm run check:v1
```

UX simplification changes:

- workspace navigation now says Step instead of Stage
- IPAM is labeled as IPAM, not internal engine numbering
- discovery shows current-state evidence and source status instead of backend contracts and authority lift language
- requirements save feedback now says save status and system save check instead of save confidence and backend runtime proof
- implementation checks now say implementation planning checks and vendor-neutral templates instead of V1 control panels
- AI output is described as draft-only and review-gated, not an engineering authority
- report/overview language now favors evidence, source status, readiness, and design model wording instead of proof, authority, engine, and backend snapshot wording
- browser-side planning fallback remains disabled and is described in user-facing terms
- diagram and platform/BOM wording now avoids claiming backend authority in normal UI text

UX rules reinforced:

- user-facing screens should use source, evidence, readiness, status, design model, applied, draft, and needs review
- normal UI should not expose repair-plan words like engine, proof, materialized, orchestrator, backend authority, or phase
- internal identifiers may still exist where compatibility requires them, but display copy must translate them before users see them
- browser UI may display, filter, label, and explain system facts, but it must not invent engineering facts

Validation performed during this update:

```text
npm run check:v1
node --check scripts/check-ux-simplification.cjs
TypeScript static check for frontend/src/lib/userFacingCopy.ts
static check: project workspace labels no longer expose Engine 2, Backend contract, V1 proof, or Stage wording
static check: requirements page uses Save status, system save check, and verified design model wording
static check: discovery page uses current-state evidence and system-draft anchor wording
static check: implementation page uses implementation planning checks and vendor-neutral templates wording
static check: AI workspace/panel uses draft suggestion and review gates wording
static check: README.md remains the only Markdown file
static check: package versions remain 1.0.0
```

Full frontend build still needs local or CI verification with dependencies installed because dependency installation is unavailable in the repair container.

## AI helper containment foundation

AI helper behavior is now explicitly contained as draft-only, review-gated assistance. The AI path can suggest requirements, sites, VLANs, and plain-language validation explanations, but it cannot become source of truth for addressing, IPAM, routing, security policy, readiness, diagrams, reports, exports, vendor commands, or implementation work.

New pure domain package:

```text
backend/src/domain/ai/
  types.ts
  containment.ts
  index.ts
  ai-domain.selftest.ts
```

AI containment responsibilities:

- draft-only authority contract
- allowed/prohibited AI use declarations
- prompt containment for final/production-authority requests
- sanitized plan-draft output from local and OpenAI providers
- sanitized validation explanations
- deterministic review gates
- AI provenance object rows
- AI findings and readiness summary
- compatibility wrapper for the existing design-core AI draft helper control

Backend integration changes:

- `backend/src/services/ai.service.ts` now uses the AI domain containment helpers.
- plan-draft prompts requesting final production authority are rejected instead of turned into fake final outputs.
- OpenAI plan-draft and validation-explanation prompts explicitly forbid readiness approval, final authority, vendor command claims, and implementation approval.
- OpenAI responses are sanitized back into draft-only, review-required output with the V1 AI authority contract attached.
- `backend/src/services/designCore/designCore.aiDraftHelperControl.ts` is now a compatibility wrapper over the pure AI domain.

Frontend containment changes:

- AI planning UI now says Draft-only assistant instead of exposing the raw contract name.
- AI selections are sent to review instead of described as auto-created approved objects.
- AI validation explanations now state that they cannot resolve findings, approve readiness, or create final subnet, route, firewall, diagram, report, or implementation facts.
- New project review copy now labels AI-created objects as draft suggestions only.

New guardrail:

```text
scripts/check-ai-containment.cjs
```

The root V1 check now includes AI containment:

```text
npm run check:v1
```

Validation performed during this update:

```text
npm run check:v1
node --check scripts/check-ai-containment.cjs
TypeScript static check for backend/src/domain/ai/*.ts excluding selftest Node type declarations
transpiled and ran backend/src/domain/ai/ai-domain.selftest.ts
transpiled and ran backend/src/lib/aiDraftHelper.selftest.ts through the compatibility wrapper
static check: AI domain has no Express, Prisma, controller, service, route, or React imports
static check: AI service uses prompt containment, draft sanitization, and validation-explanation containment
static check: AI planning UI does not expose the raw V1 AI contract name
static check: README.md remains the only Markdown file
static check: package versions remain 1.0.0
```

Full backend build, full frontend build, and full selftest suite still need local or CI verification with dependencies installed.

## Final cross-domain proof package

The final V1 proof package now has a pure backend proof domain that grades release evidence without creating new design facts.

New pure domain package:

```text
backend/src/domain/proof/
  types.ts
  final-proof.ts
  index.ts
  proof-domain.selftest.ts
```

The proof domain owns:

- expected V1 domain/module contract registry
- scenario proof rows
- mandatory release gates
- final readiness derivation
- blocked/review/proof-ready finding generation
- release boundary notes that keep V1 honest as a planning-grade product
- compatibility with the existing final proof control contract

Compatibility preserved:

- `backend/src/services/designCore/designCore.finalProofPassControl.ts` is now a thin wrapper over the pure proof domain.
- Existing consumers of `buildV1FinalProofPassControl` continue to work.
- Existing `backend/src/lib/finalProofPass.selftest.ts` continues to test through the wrapper.

Scenario proof coverage remains anchored by:

```text
backend/src/lib/scenarioMatrix.fixtures.ts
backend/src/lib/scenarioMatrix.selftest.ts
```

The scenario matrix protects designs that cover:

- small office baseline
- multi-site guest/DMZ/security boundary
- overlapping site summaries
- public-range standards blockers
- undersized subnet proposal behavior
- invalid gateway handling
- exhausted/overlapping local allocation behavior
- empty topology incomplete behavior
- DHCP/local overlap known-gap behavior

New guardrail:

```text
scripts/check-final-proof-package.cjs
```

The root V1 check now includes the final proof package check:

```text
npm run check:v1
```

Validation performed during this update:

```text
npm run check:v1
node scripts/check-final-proof-package.cjs
TypeScript static check for backend/src/domain/proof/*.ts excluding selftest Node type declarations
TypeScript static check for proof domain + designCore final proof compatibility wrapper
transpiled and ran backend/src/domain/proof/proof-domain.selftest.ts
transpiled and ran backend/src/lib/finalProofPass.selftest.ts through the compatibility wrapper
static check: proof domain has no Express, Prisma, controller, service, route, or React imports
static check: README.md remains the only Markdown file
static check: package versions remain 1.0.0
```

Important limitation: the full scenario matrix could not execute in this container because dependency installation is unavailable and `@prisma/client` is not installed. The scenario matrix must still be run locally or in CI with dependencies installed.

## Consolidated repair history

The project keeps all durable documentation in this root README. Historical repair notes that previously lived as separate Markdown files are folded here so the repository has one documentation source of truth.

### Foundation/build-truth repair

Scope: build/truth-gate repair only. This pass intentionally does not include the broader Pass 2 network-engineer trust/validation improvements.

Changes:
- Root release gate now runs real backend Prisma generation, backend TypeScript build, and frontend production build before the custom V1 proof scripts.
- Existing V1 custom proof scripts moved under `check:quality`; `check:v1` now runs `check:build` first.
- Durable enterprise IPAM truth-source labels were normalized from `ENGINE2_DURABLE` to `DURABLE_IPAM` where the shared `DesignTruthSourceType` contract expects it.
- `ENGINE2_DURABLE_CANDIDATE` and `ENGINE2_DURABLE_AUTHORITY` state/authority labels were preserved because they are distinct workflow states, not generic truth-source labels.
- Backend production TypeScript build now excludes `*.selftest.ts`; selftests remain runnable through their explicit npm scripts.
- Backend build script no longer uses `--listEmittedFiles`.
- The implementation-plan bridge in `designCore.networkObjectModel.ts` now explicitly casts the full backend model into the implementation domain's narrower facade.
- Starter template subnet/gateway mismatches were fixed so gateways live inside their declared subnet CIDRs.

Validation performed in the repair session before packaging:
- Backend TypeScript build passed after these changes.
- Frontend TypeScript/Vite production build passed after these changes.

Known Pass 2 work:
- Tighten write-time CIDR/gateway validation or add explicit invalid-draft state.
- Add golden scenario tests across requirements → materialization → IPAM → validation → diagram → report/export.
- Prove reports and diagrams never claim readiness beyond backend validation evidence.

### Network-engineer trust repair

Pass 2 hardens the V1 package for network-engineer trust without expanding scope into vendor config generation, live discovery, or advanced routing simulation.

## Repairs

- Added write-time engineering validation for VLAN CIDR/gateway pairs.
- Blocked gateway-outside-subnet, gateway-as-broadcast/network address, invalid IPv4 notation, and non-canonical CIDR writes.
- Added service-layer merged update validation so gateway-only or subnet-only edits cannot drift from the saved companion field.
- Added site default-address-block write validation.
- Added validation result readiness metadata: `readinessState`, `engineeringReviewState`, and `canClaimReady`.
- Hardened diagram readiness so planned/proposed/inferred/imported/review-required objects cannot render as `ready` just because no finding points at them.
- Hardened report/export readiness so a READY document with review findings, blocking findings, missing proof boundary, missing section evidence, or verified sections carrying limitations cannot claim ready.
- Added `selftest:network-engineer-trust` and wired it into backend `selftest:all`.
- Added root `check:trust` and inserted it between real builds and release quality checks.

## Scope deliberately not added

- No vendor-specific config compiler.
- No live network discovery.
- No BGP/OSPF/VRF implementation-depth simulation.
- No frontend-invented diagram topology.

### README-only documentation gate

SubnetOps documentation must remain README-only. Do not create standalone Markdown notes, pass notes, release notes, or docs-folder Markdown files outside this README. Any durable project note, repair note, proof map, limitation, or release explanation must be folded into this file.

Enforced command:

```text
npm run check:docs
```

The gate fails if any Markdown file exists outside `README.md`.

## Service write-path validation repair

Manual engineering writes now have a dedicated service-layer validation boundary before persisted data is changed.

Current service write-path rules:

- VLAN create requests validate subnet CIDR and gateway usability before the database write.
- VLAN update requests merge the saved VLAN state with the patch payload before validation. A partial update is never validated as if missing persisted fields do not exist.
- A gateway-only VLAN update cannot move the gateway outside the saved subnet.
- A subnet-only VLAN update cannot strand the saved gateway outside the new subnet.
- Noncanonical VLAN subnet CIDR values are rejected instead of normalized silently.
- Network and broadcast addresses cannot be saved as normal VLAN gateways.
- DHCP scope writes validate the scope CIDR, default gateway usability, selected VLAN parent subnet, and selected allocation parent when those relationships are present.
- Generated or manual writes must use the same addressing validation boundary instead of private one-off checks.

New backend files for this repair:

```text
backend/src/domain/addressing/addressing-validation.ts
backend/src/services/engineeringWritePaths.ts
backend/src/services/engineeringWritePaths.selftest.ts
scripts/check-service-validation-coverage.cjs
```

The addressing validation module exports the shared validator names used by write paths and schema refinements:

```text
validateSiteAddressBlock
validateVlanAddressing
validateDhcpScope
validateGateway
validateCanonicalCidr
```

Service coverage gates:

```bash
npm --prefix backend run selftest:engineering-write-paths
npm --prefix backend run selftest:services
node scripts/check-service-validation-coverage.cjs
```

Validation performed during this update:

```text
npm run check:docs
node scripts/check-service-validation-coverage.cjs
npm run check:quality
```

All three passed in the repair container. The full root check still requires backend and frontend dependencies to be installed first; without those dependencies, `npm run check:v1` stops at Prisma client generation because the Prisma CLI is unavailable in `backend/node_modules`.

## Centralized engineering validation repair

This repair strengthens the shared addressing validation boundary so service writes and generated writes use one validation brain instead of scattered one-off checks.

Current centralized validation rules:

- `backend/src/domain/addressing/addressing-validation.ts` remains the pure domain validation source for site address blocks, VLAN subnet/gateway pairs, DHCP scopes, gateway usability, and canonical IPv4 CIDR checks.
- `backend/src/services/engineeringWritePaths.ts` is the service write-path adapter. It converts pure validation failures into API errors and exposes the same validation entry points for manual writes and generated writes.
- Manual VLAN create/update writes continue to validate through the shared service write-path adapter.
- Manual site create/update writes now validate through the shared service write-path adapter instead of keeping a private validator path in `site.service.ts`.
- Requirement materialization now validates every generated site address block, VLAN subnet/gateway pair, and DHCP scope before database create/update calls.
- Project template creation validates all template site blocks and VLAN addressing before writing template objects.
- Project duplication validates copied site blocks and VLAN addressing before writing the duplicate project. Bad legacy saved addressing can no longer be cloned as clean data.
- DHCP scope validation in Enterprise IPAM remains bound to selected VLAN subnet and selected allocation parent when those relationships are present.
- Site default address blocks now use the canonical CIDR validator, so host-bit CIDRs such as `10.30.1.9/24` are rejected instead of silently accepted.

Centralization proof points:

```text
backend/src/domain/addressing/addressing-validation.ts
backend/src/services/engineeringWritePaths.ts
backend/src/services/site.service.ts
backend/src/services/vlan.service.ts
backend/src/services/requirementsMaterialization.service.ts
backend/src/services/project.service.ts
backend/src/services/enterpriseIpam.service.ts
backend/src/services/engineeringWritePaths.selftest.ts
scripts/check-service-validation-coverage.cjs
```

Service coverage gates now check that:

- site service uses `buildSiteWriteCandidate` before site updates;
- VLAN service uses `buildVlanWriteCandidate` before VLAN updates;
- requirement materialization calls generated-object validators before site/VLAN/DHCP writes;
- project templates and project duplication validate generated/copied addressing before write;
- Enterprise IPAM DHCP scope validation is still parent-bound;
- the pure addressing validation domain does not import Prisma, Express, controllers, or service code.

Validation performed during this update:

```text
npm run check:docs
node scripts/check-service-validation-coverage.cjs
npm run check:quality
```

All three passed in the repair container. Backend selftests and the full root `check:v1` still require dependencies to be installed first; without `backend/node_modules`, `tsx` and Prisma are unavailable.

## Requirement materialization source truth

Requirement materialization must not convert missing survey fields into fake engineering intent. The materializer now treats capacity-sensitive fields as source-classified signals instead of silent defaults.

Source classifications used by generated objects:

```text
USER_PROVIDED
DERIVED_FROM_USER_INPUT
SYSTEM_ASSUMPTION
NOT_CAPTURED
REVIEW_REQUIRED
```

Rules:

- Missing `usersPerSite` must not become 50 users.
- Missing `siteCount` must not be presented as confirmed user intent.
- A baseline USERS segment may exist for planning visibility, but its capacity must be `REVIEW_REQUIRED` when user count is not captured.
- Review-required capacity blocks implementation-ready DHCP scope creation.
- Materialized VLAN notes must preserve source references, capacity source, readiness impact, and implementation-blocking status.
- Reports, diagrams, implementation templates, and frontend summaries may show review-required planning candidates, but must not claim final sizing confidence until backend evidence proves the input.
- The requirements form must not prefill site count or users per site with values that look user-selected.

The source-truth regression gate is:

```bash
node scripts/check-requirement-materialization-source-truth.cjs
```

It is included in:

```bash
npm run check:quality
```

## Explicit read-repair policy

Saved requirements may be used to repair missing or incomplete durable design rows, but read-repair is no longer a silent side effect. Any service that can trigger read-repair must declare the operation, authorization boundary, evidence destination, and audit path before mutation is allowed.

Current read-repair source paths:

```text
backend/src/services/readRepairPolicy.ts
backend/src/services/readRepairPolicy.selftest.ts
scripts/check-no-silent-read-repair.cjs
```

Read-repair is allowed only when all of the following are true:

- saved `requirementsJson` exists
- materialized site, VLAN, addressing, or DHCP rows are missing or incomplete
- the caller declares an explicit read operation such as `project-read`, `sites-read`, `vlans-read`, `design-core-read`, `validation-read`, `export-read`, or `report-read`
- the caller declares the authorization boundary that already permitted the read
- the repair creates a structured evidence object
- the repair writes an explicit change log entry
- the repair writes a security audit event
- the result is surfaced to the relevant response, design-core path, validation path, or report/export path

Read-repair evidence includes:

```text
action
projectId
operation
reason
authorizedBy
beforeState
afterState
createdObjects
updatedObjects
skippedObjects
reviewRequiredObjects
blockedImplementationObjects
materializationStatus
repairLogged
surfacedTo
```

A normal read that does not need repair returns a no-op evidence object instead of pretending nothing happened. A caller that omits an authorization declaration is blocked before mutation.

Validation performed during this update:

```text
npm run check:docs
node scripts/check-no-silent-read-repair.cjs
npm run check:quality
```

The full `npm run check:v1` command still requires installed backend dependencies because Prisma and TSX are not available in the repair container. Re-run it locally or in CI after dependency installation.

## Scenario-executed final proof

The final proof pass must not pass from static expected summaries. It now consumes scenario execution results produced by the backend scenario matrix. A final proof row is valid only when it has an executed scenario result with snapshot evidence, assertion results, affected engines, report evidence, diagram evidence, and validation evidence.

Current source paths:

```text
backend/src/domain/proof/types.ts
backend/src/domain/proof/final-proof.ts
backend/src/lib/scenarioMatrix.execution.ts
backend/src/lib/scenarioMatrix.fixtures.ts
backend/src/lib/scenarioMatrix.selftest.ts
backend/src/lib/finalProofPass.selftest.ts
scripts/check-final-proof-scenario-execution.cjs
```

Required scenario execution shape:

```text
scenarioId
scenarioName
scenarioCategory
inputFixture
executedAt
snapshotResult
assertions[] with PASS / FAIL / REVIEW
affectedEngines
reportEvidence
diagramEvidence
validationEvidence
```

Rules:

- Final proof must block when `scenarioExecutionResults` is missing.
- Final proof must not keep a static scenario registry as proof.
- Scenario rows are graded from actual assertion statuses, not from the presence of expected engine stages.
- Failed scenario assertions make the final proof `BLOCKED`.
- Review scenario assertions make the final proof `REVIEW_REQUIRED`.
- Passing scenario assertions make the row `PROOF_READY`, but only after a backend design-core snapshot was actually executed.
- The scenario matrix selftest must execute real backend snapshots through `buildDesignCoreSnapshot`.
- The final proof selftest must feed real scenario matrix execution results into `buildV1FinalProofPassControl`.

The regression gate is:

```bash
node scripts/check-final-proof-scenario-execution.cjs
```

It is included in:

```bash
npm run check:quality
```

Trust impact:

```text
old: expected scenario exists -> final proof may pass
new: scenario ran -> assertions produced -> evidence preserved -> final proof grades PASS / REVIEW / FAIL
```

That means final proof can no longer pass because a scenario name or expected stage list exists. It passes only from executed scenario evidence.

## Omitted evidence preservation and counters

SubnetOps now treats evidence windowing as a trust boundary. Any surface that trims rows for readability must expose a counter summary so hidden blockers or review-required items cannot disappear behind `.slice()` output.

Shared omitted-evidence model:

```text
backend/src/domain/evidence/omitted-evidence.ts
backend/src/domain/evidence/omitted-evidence.selftest.ts
scripts/check-omitted-evidence-counters.cjs
```

Every omitted-evidence summary records:

```text
collection
surface
shownCount
totalCount
omittedCount
omittedHasBlockers
omittedHasReviewRequired
omittedSeveritySummary
readinessImpact
exportImpact
```

Applied surfaces:

- requirement traceability rows
- report section gates and report findings
- validation/check evidence
- review queues
- VLAN/addressing rows
- site summaries
- network interfaces and DHCP pools
- routing rows and routing findings
- security flow requirements and security policy findings
- implementation steps, verification checks, rollback actions, and vendor-neutral templates
- diagram render nodes, diagram render edges, policy-rule windows, security-zone windows, hotspot windows, and dangling-edge repair prompts

Rules:

- A sliced visible table is allowed only when the omitted counter states shown, total, and omitted counts.
- Hidden blockers must set `omittedHasBlockers` and keep readiness blocking.
- Hidden review-required rows must set `omittedHasReviewRequired` and keep readiness review-gated.
- Diagram render models expose `omittedEvidenceSummaries` and rollup flags in the render summary.
- Report/export truth exposes `omittedEvidenceSummaries` and `fullEvidenceInventory`.
- Professional, technical, and full-proof reports include a `V1 Omitted Evidence Summary` section so a clean visible table cannot hide unresolved evidence.

Regression gates:

```bash
npm --prefix backend run selftest:omitted-evidence
node scripts/check-omitted-evidence-counters.cjs
npm run check:quality
```

Validation performed during this update:

```text
npm run check:docs
node scripts/check-omitted-evidence-counters.cjs
npm run check:quality
```

All three passed in the repair container. The full `npm run check:v1` command still requires installed backend dependencies because Prisma and TSX are not available in the repair container.

## Project-level CIDR validation

SubnetOps now treats the project `basePrivateRange` as an engineering input, not a loose text label. A max-length string check is not enough for a network design tool.

Shared validation source:

```text
backend/src/domain/addressing/addressing-validation.ts
backend/src/validators/project.schemas.ts
backend/src/services/engineeringWritePaths.ts
scripts/check-project-cidr-validation.cjs
```

Allowed project base-range states:

```text
blank / null -> allowed as planning not captured
10.0.0.0/8 -> allowed
172.16.0.0/12 -> allowed
192.168.0.0/16 -> allowed
canonical RFC1918 subnet inside those blocks -> allowed
```

Rejected states:

```text
10.0.0.9/24 -> rejected because it is not on the network boundary
999.1.1.1/24 -> rejected as malformed IPv4 CIDR
hello -> rejected as non-CIDR text
8.8.8.0/24 -> rejected as public/non-RFC1918 clean project truth
172.0.0.0/8 -> rejected because it crosses outside private RFC1918 space
```

Rules:

- `basePrivateRange` must be blank or valid canonical IPv4 CIDR.
- Saved clean project base ranges must be fully contained in RFC1918 private IPv4 space.
- Public CIDR space is not saved as clean project truth. A future explicit exception/review workflow may model it, but the default write path rejects it.
- Create/update project writes call the same shared validation brain as service write-path tests.
- Project templates and duplication validate the base range before creating copied engineering truth.
- Blank values are normalized to `null`, meaning the parent addressing block is not captured yet.

Regression gates:

```bash
node scripts/check-project-cidr-validation.cjs
npm run check:quality
```

Validation performed during this update:

```text
npm run check:docs
node scripts/check-project-cidr-validation.cjs
npm run check:quality
```

Those static gates pass in the repair container. The full `npm run check:v1` command still requires installed backend dependencies because Prisma and TSX are not available in the repair container.

## Centralized readiness ladder repair

SubnetOps now has a backend-only readiness ladder so validation, implementation planning, vendor-neutral templates, reports/exports, diagrams, frontend summary cards, and AI helper output cannot each invent their own meaning of “ready.”

Readiness ladder order:

```text
BLOCKED → REVIEW_REQUIRED → DRAFT → PLANNING_READY → IMPLEMENTATION_READY
```

Contract marker:

```text
V1_READINESS_LADDER_CONTRACT
```

Rules enforced by the ladder:

- Invalid addressing or IPAM conflict evidence produces `BLOCKED`.
- Missing capacity source, including missing `usersPerSite`, produces `REVIEW_REQUIRED` and blocks final prefix/DHCP confidence.
- Inferred security policy output produces `REVIEW_REQUIRED` until reviewed.
- Omitted blockers from sliced evidence produce `BLOCKED`; omitted review-required evidence produces `REVIEW_REQUIRED`.
- Generated objects without validation/source-object proof cannot become `IMPLEMENTATION_READY`.
- Reports may not claim implementation-ready unless the ladder is `IMPLEMENTATION_READY`.
- Diagrams may not show clean production truth unless the ladder is `IMPLEMENTATION_READY`.
- Vendor-neutral implementation templates remain gated by the ladder.
- AI helper output remains draft-only and cannot produce engineering authority.
- Frontend summary cards must display the backend ladder state instead of manufacturing readiness.

The ladder is implemented in:

```text
backend/src/domain/readiness/readiness-ladder.ts
backend/src/services/designCore/designCore.readinessLadderControl.ts
```

Regression gate:

```bash
node scripts/check-readiness-ladder-enforcement.cjs
```

This repair does not make the product magically implementation-ready. It does the opposite: it prevents the product from sounding implementation-ready when validation, capacity, security, omitted evidence, generated objects, reports, diagrams, templates, or AI evidence do not support that claim.

## Diagram truth enforcement repair

SubnetOps now treats diagram render output as evidence, not decoration. Every backend-rendered diagram node and edge carries explicit truth and validation metadata so the canvas cannot make inferred, assumed, imported, review-required, or blocked objects look like clean production topology.

Diagram enforcement fields on render nodes and edges:

```text
truthState
truthStateV1
readinessImpact
sourceRefs
validationRefs
warningBadges
```

V1 diagram truth states:

```text
USER_PROVIDED
DERIVED
ASSUMED
IMPORTED
REVIEW_REQUIRED
BLOCKED
```

Diagram enforcement rules:

- Invalid or blocked topology evidence must render with `readinessImpact: BLOCKING`.
- Review-required topology evidence must render with `readinessImpact: REVIEW`.
- Inferred, proposed, or planned diagram objects must not appear as clean production truth.
- Imported evidence is visible but not treated as proven production truth without validation refs.
- Diagram edges now carry truth state and source lineage, not just endpoints and labels.
- Every node and edge exposes source refs and validation refs for traceability.
- Warning badges identify blocked, review-required, assumed/inferred, imported, source-review, and omitted-evidence states.
- Omitted blockers/review-required rows from diagram evidence windows stay surfaced through rollup warnings.
- The frontend may show badges, refs, layout, filters, and selection details, but may not manufacture backend engineering truth.

Implementation paths:

```text
backend/src/domain/diagram/types.ts
backend/src/domain/diagram/render-model.ts
backend/src/domain/diagram/coverage.ts
backend/src/services/designCore/designCore.diagramTruthControl.ts
backend/src/services/designCore.types.ts
frontend/src/lib/designCoreSnapshot.ts
frontend/src/features/diagram/components/BackendDiagramCanvas.tsx
scripts/check-diagram-truth-enforcement.cjs
```

Regression gate:

```bash
node scripts/check-diagram-truth-enforcement.cjs
```

Validation performed during this update:

```text
npm run check:docs
node scripts/check-diagram-truth-enforcement.cjs
npm run check:quality
```

Those gates pass in the repair container. Full `npm run check:v1` still requires installed backend dependencies because `prisma` is unavailable in the repair container.

## Report/export truth repair

SubnetOps now treats reports and exports as backend evidence deliverables, not marketing copy. A report may summarize evidence, but it must not claim deployment readiness, production readiness, completeness, validation, or best-practice compliance unless backend proof and the central readiness ladder explicitly allow that claim.

Report/export truth contract marker:

```text
V1_REPORT_EXPORT_TRUTH_CONTRACT
```

Report/export rules now enforced:

- Executive summaries must carry the backend readiness status.
- Blocking issues and review-required issues must remain visible in the report and export surfaces.
- Assumptions, limitations, and proof boundaries must be included.
- Requirement traceability must show requirement consequence, affected engines, frontend location, report section, diagram impact, and readiness.
- Materialized object evidence, addressing evidence, IPAM evidence, routing evidence, security evidence, diagram truth evidence, implementation readiness, and validation evidence must remain connected to backend proof.
- Omitted evidence summaries must expose shown count, total count, omitted count, omitted blockers, omitted review-required items, severity rollups, readiness impact, and export impact.
- A full evidence inventory must be available for machine-readable export so shortened report tables do not hide blockers.
- PDF, DOCX, CSV, and JSON-style evidence surfaces must preserve the same truth gates.
- Clean phrases such as `ready for deployment`, `validated`, `complete`, `best practice compliant`, `production-ready`, and `implementation-ready` are blocked unless backend report/export proof and the readiness ladder allow them.
- When clean claims are not allowed, report text is rewritten toward blocked, review-required, or planning-only wording.

Implementation paths:

```text
backend/src/domain/reporting/types.ts
backend/src/domain/reporting/report-export-truth.ts
backend/src/domain/reporting/section-model.ts
backend/src/domain/reporting/export-gates.ts
backend/src/domain/reporting/reporting-domain.selftest.ts
backend/src/services/exportDesignCoreReport.service.ts
backend/src/services/export.service.ts
backend/src/services/designCore.types.ts
frontend/src/lib/designCoreSnapshot.ts
scripts/check-no-report-overclaim.cjs
```

Regression gate:

```bash
node scripts/check-no-report-overclaim.cjs
```

Validation performed during this update:

```text
npm run check:docs
node scripts/check-no-report-overclaim.cjs
npm run check:quality
```

Those static gates pass in the repair container. Full `npm run check:v1` still requires installed backend and frontend dependencies because `prisma`, `tsx`, and build tooling are not available in the repair container.

## API/service/database integration proof

SubnetOps now includes an integration-style proof harness for the product chain rather than relying only on isolated helper selftests.

Integration proof file:

```text
backend/src/services/apiServiceDatabaseIntegration.selftest.ts
```

The harness uses an in-memory Prisma-like transaction to prove the same class of flow the product depends on:

```text
save requirements
→ materialize requirements into durable site/VLAN/DHCP rows
→ read the repaired project state
→ build a design-core snapshot
→ derive validation evidence
→ render diagram evidence
→ build report/export evidence
→ preserve a full machine-readable appendix
```

Required integration scenarios covered by the harness:

| Scenario | Required proof |
| --- | --- |
| Valid requirements | Materialization creates durable rows and design-core consumes them. |
| Missing `usersPerSite` | Capacity becomes review-required and implementation output stays blocked. |
| Invalid gateway save attempt | Bad partial VLAN update is rejected before persistence. |
| Existing project reload | Materialization updates existing rows and does not duplicate them. |
| Read-repair required | Explicit read-repair evidence lists before/after state and created objects. |
| Diagram evidence sliced | Omitted diagram evidence exposes hidden blockers. |
| Report evidence sliced | Full machine-readable appendix is preserved. |
| Inferred security policy | Security policy remains review-required, not final implementation truth. |
| Missing WAN intent | Routing stays review-required when multi-site requirements lack WAN detail. |
| Invalid `basePrivateRange` | Public/malformed project CIDR is rejected or blocked before clean persistence. |

Regression gate:

```bash
node scripts/check-api-service-database-integration-proof.cjs
```

The backend exposes:

```bash
npm --prefix backend run selftest:api-service-database-integration
npm --prefix backend run selftest:integration-proof
```

The root trust and quality gates include this proof so the chain cannot silently slide back to helper-only validation.

## CI gate restructuring

The release gate is now split into explicit root gates instead of hiding dependency-backed checks behind one early command.

Root scripts:

```text
npm run check:docs
npm run check:quality
npm run check:backend
npm run check:frontend
npm run check:trust
npm run check:proof
npm run check:v1
```

`check:v1` runs the gates in this order:

```text
check:docs -> check:quality -> check:backend -> check:frontend -> check:trust -> check:proof
```

That order matters. Static repository rules run before build work. Backend and frontend build gates run only after dependencies exist. Trust and proof gates run after the code can compile and Prisma client generation is available.

Backend selftest groups are now explicit:

```text
npm --prefix backend run selftest:domain
npm --prefix backend run selftest:services
npm --prefix backend run selftest:scenario
npm --prefix backend run selftest:proof
npm --prefix backend run selftest:all
```

The CI workflow now installs dependencies before running dependency-backed gates:

```text
checkout
setup Node 20.12.2
npm ci at repository root
npm ci in backend
npm ci in frontend
generate Prisma client
apply Prisma migrations
run backend checks
run frontend checks
run root quality checks
run root trust checks
run root proof checks
run final check:v1
build backend and frontend containers
```

The root repository now includes `package-lock.json` so the root `npm ci` step is real and reproducible.

Regression guard:

```text
node scripts/check-ci-hardening.cjs
```

That guard now fails if:

- `check:v1` is not split into docs, quality, backend, frontend, trust, and proof gates
- backend scenario/proof/domain/service selftest groups are missing
- CI runs `check:v1` before backend or frontend dependencies are installed
- Prisma generation or migrations are missing from CI
- CI falls back to unsafe Prisma schema push
- production startup bypasses the migration-safe entrypoint

Validation performed in the repair container:

```text
npm run check:docs
node scripts/check-ci-hardening.cjs
npm run check:quality
```

Those static gates pass. Full `npm run check:v1` still requires installed backend and frontend dependencies because Prisma, TSX, TypeScript, and Vite are not available in this repair container until dependency installation runs.

## Regression kill-switch checks

SubnetOps now treats the trust rules as executable guards, not reminders. The static quality gate includes kill switches that fail the repository when old weak patterns come back.

Required guards:

| Guard | Blocks |
| --- | --- |
| `scripts/check-readme-only.cjs` | Extra standalone Markdown documentation outside the single root `README.md`. |
| `scripts/check-no-frontend-engineering-facts.cjs` | Browser-side CIDR math, VLAN generation, route/security policy generation, or frontend fallback authority. |
| `scripts/check-service-validation-coverage.cjs` | Manual or generated service writes bypassing shared addressing validation. |
| `scripts/check-requirement-materialization-source-truth.cjs` | Missing capacity becoming fake user intent or implementation-ready DHCP/addressing truth. |
| `scripts/check-no-silent-read-repair.cjs` | Read paths mutating project state without authorization, audit evidence, and surfaced repair evidence. |
| `scripts/check-final-proof-scenario-execution.cjs` | Final proof passing from static expected summaries instead of executed scenario results. |
| `scripts/check-omitted-evidence-counters.cjs` | Sliced evidence hiding omitted blockers or review-required items. |
| `scripts/check-project-cidr-validation.cjs` | Bad project base CIDRs entering as clean values. |
| `scripts/check-readiness-ladder-enforcement.cjs` | Implementation-ready output bypassing the central readiness ladder. |
| `scripts/check-diagram-truth-enforcement.cjs` | Diagram nodes/edges missing truth state, source refs, validation refs, or omitted-evidence warnings. |
| `scripts/check-no-diagram-clean-inference.cjs` | Assumed, inferred, proposed, or planned diagram evidence being marked clean. |
| `scripts/check-no-report-overclaim.cjs` | Reports/exports claiming production-ready, implementation-ready, complete, validated, or best-practice-compliant without backend proof. |
| `scripts/check-api-service-database-integration-proof.cjs` | Trust proof sliding back to isolated helper tests instead of product-like API/service/database flow coverage. |
| `scripts/check-regression-kill-switches.cjs` | Any required kill switch being deleted or removed from `check:quality`. |

Run all static kill switches with:

```bash
npm run check:quality
```

The kill switches are intentionally blunt. If a future change wants browser-generated engineering facts, clean inferred diagrams, silent read-repair, hidden blockers, or report overclaims, it has to break the gate loudly instead of quietly rotting the product.

## SubnetOps V1 proof map

Proof map marker:

```text
V1_README_PROOF_MAP
```

This section is the single README-owned proof map for V1. It replaces separate phase notes, handoff files, docs/doc files, and version-sidecar documents. README.md is the single repository documentation file.

### Engineering Truth Contract

SubnetOps must never invent engineering facts. User intent, derived design data, assumptions, validation results, implementation readiness, report claims, and diagram truth must be traceable to backend evidence.

Permanent rules:

- Frontend code may display, filter, sort, expand, collapse, and visualize backend evidence, but it must not calculate final subnets, VLANs, gateways, routing, security policy, or implementation readiness.
- Reports and exports must not claim `production-ready`, `implementation-ready`, `ready for deployment`, `validated`, `complete`, or `best practice compliant` unless backend proof and the readiness ladder allow the claim.
- Diagrams must not render assumed, inferred, proposed, imported, or review-required objects as clean production truth.
- Read paths must not mutate state silently. No silent mutation. Any read-repair must be authorized, audited, and surfaced as evidence.
- Missing user input must become review-required or blocked evidence, not fake defaults that pretend the user selected a value.
- README-only documentation remains mandatory. New notes go into this README, not separate Markdown files.

### Requirement Propagation Contract

Every requirement must follow this evidence chain:

```text
requirement input
→ normalized requirement signal
→ materialized source object or explicit no-op/review reason
→ backend design-core input
→ engine-specific computation
→ traceability evidence
→ validation/readiness impact
→ frontend display
→ report/export impact
→ diagram impact where relevant
→ test/golden scenario proof
```

No ghost outputs are allowed. A frontend card, diagram edge, export sentence, or report claim must be backed by a backend source object, an explicit review/no-op reason, or validation evidence.

### README-only documentation rule

README-only documentation rule:

```bash
npm run check:docs
```

The guard is:

```text
scripts/check-readme-only.cjs
```

The repository must have one Markdown documentation file only:

```text
README.md
```

Do not create standalone markdown notes, separate pass notes, docs/doc folders, release sidecars, or temporary implementation notes outside this README.

### Validation gates

Validation gates are intentionally layered:

| Gate | Purpose |
| --- | --- |
| `scripts/check-service-validation-coverage.cjs` | No DB write may create or update engineering address objects unless it passes shared validation or produces explicit review/blocked/no-op evidence. |
| `scripts/check-requirement-materialization-source-truth.cjs` | Missing `siteCount`, `usersPerSite`, capacity, DHCP, or addressing data cannot become fake user intent. |
| `scripts/check-project-cidr-validation.cjs` | Project `basePrivateRange` cannot accept malformed, noncanonical, or public CIDR as clean truth. |
| `scripts/check-readiness-ladder-enforcement.cjs` | Implementation output cannot bypass the central readiness ladder. |
| `scripts/check-no-silent-read-repair.cjs` | Read repair requires authorization, logging, surfaced evidence, and `READ_REPAIR_MATERIALIZATION` evidence. |
| `scripts/check-omitted-evidence-counters.cjs` | Sliced evidence must expose `omittedHasBlockers`, omitted review-required items, severity rollups, and export impact. |
| `scripts/check-regression-kill-switches.cjs` | Required kill switches cannot be deleted or removed from quality checks. |
| `scripts/check-readme-proof-map.cjs` | This consolidated proof map must remain in the single README. |

The shared addressing validation source is:

```text
backend/src/domain/addressing/addressing-validation.ts
```

Core write rule:

```text
existing persisted object + patch payload
→ candidate object
→ shared validation
→ DB write or explicit blocked/review/no-op evidence
```

No DB write may create or update engineering address objects unless this boundary is respected.

### Scenario proof matrix

Final proof must consume executed scenario evidence, not static expected summaries.

Required proof markers:

```text
scenarioExecutionResults
executeV1ScenarioMatrix
```

Final proof cannot pass because an expected scenario row exists. It can pass only when scenarios execute and produce assertions with actual evidence.

Minimum V1 scenario coverage:

| Scenario | Required evidence |
| --- | --- |
| Clean small branch network | Planning-ready materialization, validation evidence, diagram/report evidence. |
| Multi-site enterprise | Multi-site requirements, addressing/IPAM evidence, routing/security review impact. |
| Missing capacity input | Capacity review-required, no fake `50 users`, no implementation-ready DHCP. |
| Invalid gateway | Rejected before write. |
| Invalid CIDR | Malformed/noncanonical CIDR rejected or blocked. |
| Overlapping subnet | Validation evidence blocks or flags design. |
| Partial VLAN update | Existing VLAN + patch validates as one candidate object. |
| Routing required but missing WAN intent | Review-required routing evidence, no confirmed route. |
| Security policy review required | Inferred policy remains review-required, not final implementation truth. |
| Diagram omitted evidence | Hidden blockers surface through omitted counters and warnings. |
| Report blocked by review item | Report/export cannot overclaim readiness. |
| Read-repair materialization | `READ_REPAIR_MATERIALIZATION` evidence includes before/after and surfaced impact. |
| Project reload after saved requirements | No duplicate materialization and no silent mutation. |

### Readiness ladder

Readiness ladder order:

```text
BLOCKED
REVIEW_REQUIRED
DRAFT
PLANNING_READY
IMPLEMENTATION_READY
```

Rules:

- Invalid addressing means `BLOCKED`.
- Missing capacity source means `REVIEW_REQUIRED`.
- Inferred security policy means `REVIEW_REQUIRED`.
- Omitted blockers mean `BLOCKED` or `REVIEW_REQUIRED`.
- Unvalidated generated objects cannot become `IMPLEMENTATION_READY`.
- Only `IMPLEMENTATION_READY` may produce clean implementation-ready language.

### Report/export truth rules

Reports and exports are evidence deliverables, not marketing copy.

Required report/export evidence:

- executive summary readiness status
- blocking issues
- review-required issues
- assumptions
- requirement traceability
- materialized object evidence
- addressing evidence
- IPAM evidence
- routing evidence
- security evidence
- diagram truth evidence
- implementation readiness
- omitted evidence summary
- full machine-readable appendix

No blocker can be hidden by shortened report sections. Short summaries are allowed only when omitted counters and the full appendix preserve the evidence.

### Diagram truth rules

Every diagram node and edge must carry backend truth evidence:

```text
truthState
readinessImpact
sourceRefs
validationRefs
warningBadges
```

Allowed truth states:

```text
USER_PROVIDED
DERIVED
ASSUMED
IMPORTED
REVIEW_REQUIRED
BLOCKED
```

Diagram rules:

- Invalid subnet nodes must show blocked evidence.
- Assumed segments must show review evidence.
- Inferred security edges must show review evidence.
- Missing routing intent must not be drawn as a confirmed route.
- Omitted blockers must appear as warning badges or rollups.
- Frontend diagram code may render truth evidence, but must not invent it.

### CI proof commands

Root commands:

```bash
npm run check:docs
npm run check:quality
npm run check:backend
npm run check:frontend
npm run check:trust
npm run check:proof
npm run check:v1
```

Expected `check:v1` order:

```text
check:docs -> check:quality -> check:backend -> check:frontend -> check:trust -> check:proof
```

CI must install dependencies before dependency-backed gates:

```text
checkout
setup Node 20.12.2
npm ci at repository root
npm ci in backend
npm ci in frontend
generate Prisma client
apply Prisma migrations
run backend checks
run frontend checks
run root quality checks
run root trust checks
run root proof checks
run final check:v1
build backend and frontend containers
```

### Known limitations

Known limitations for this repaired archive:

- Full `npm run check:v1` still requires installed backend/frontend dependencies. In the repair container, `prisma`, `tsx`, TypeScript, and Vite may be unavailable until dependency installation runs.
- Prisma generation and migration execution require a dependency-installed environment and a reachable database or CI service database.
- Static kill-switches prove architecture guards, but they do not replace the full backend build, frontend build, Prisma generation, migrations, and executable selftest suite.
- The integration proof harness is product-like and Prisma-shaped, but final deployment trust still requires CI/local execution with dependencies installed.
- SubnetOps remains V1 only. Do not add multiple public version labels or separate release note files.

V1 is done only when `npm run check:v1` is meaningful in an installed environment and proves docs, quality, backend, frontend, trust, and proof together.
