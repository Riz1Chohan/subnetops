# Phase 0 — Engine Inventory, Proof Discipline, and Requirements Propagation Contract

Marker: `PHASE_0_ENGINE_INVENTORY_PROPAGATION_CONTRACT`

Phase 0 is a control phase. It records the current SubnetOps engine system before any more fixes are allowed. This package is already a Phase 107 diagram-layout release, but the product underneath it is broader: backend design-core, requirements materialization, CIDR/addressing, enterprise IPAM, standards, validation, object model, graph, routing, security, implementation, report/export, diagram rendering, BOM, discovery, and AI-draft surfaces.

## Boundary

Do not add new features in Phase 0.

This phase does not change allocation math, saved project data, requirement materialization behavior, routing/security decisions, report content generation, or diagram geometry. It adds the master control sheet and a static release gate so future phases cannot keep adding disconnected patches.

## Master rule

Every new or changed engine behavior must obey the same Requirements Propagation Contract:

1. Requirement input
2. normalized requirement signal
3. materialized source object OR explicit no-op/review reason
4. backend design-core input
5. engine-specific computation
6. traceability evidence
7. validation/readiness impact
8. frontend display
9. report/export impact
10. diagram impact where relevant
11. test/golden scenario proof

If a feature cannot show where it fits in that chain, it does not get added.

No ghost outputs.
No frontend-only engineering facts.
No computed-but-unused fields.
No fake confidence.
No default survey value pretending to be user intent.
No report saying something the backend cannot prove.

## Package understanding before Phase 0 work

The package is `subnetops-release@0.107.0`, a SubnetOps release snapshot whose latest explicit scope is Phase 107 — Diagram Layout Contract Rewrite. Phase 107 is intentionally diagram-rendering only and says it does not change design calculations, allocation logic, saved project data, requirements materialization, or security-policy evidence.

The product itself is a network planning/design platform with:

- a Node/Express/Prisma backend;
- a Vite/React frontend;
- backend-authoritative design-core snapshots;
- CIDR and address-allocation libraries;
- enterprise IPAM persistence and approval surfaces;
- requirements materialization and closure proof;
- standards, validation, routing, security, object model, graph, implementation, templates, report/export, and diagram truth sections;
- frontend advisory surfaces for platform/BOM and discovery/current-state;
- AI draft/helper surfaces that must never be authoritative until reviewed and materialized.

## Authoritative engine inventory source

Machine-readable control sheet:

`backend/src/lib/phase0EngineInventory.ts`

Static release gate:

`npm run check:phase0-engine-inventory`

The TypeScript inventory records 19 post-Phase-0 engines. Phase 0 itself is not counted as a product engine; it is the control layer.

## Control-sheet columns

| Column | Meaning |
|---|---|
| Engine name | The engine/surface being controlled by the repair plan. |
| Inputs | Source data the engine is allowed to consume. |
| Outputs | Data the engine is allowed to produce. |
| Consumers | Downstream systems that read the output. |
| Source-of-truth level | Whether the engine is authoritative, durable authority, review-gated, advisory, discovery boundary, or draft-only. |
| Requirement fields consumed | Requirement fields or field groups that may affect this engine. |
| Frontend pages using it | UI surfaces that may display the output. |
| Report/export sections using it | Export/report areas that may include the output. |
| Diagram sections using it | Diagram modes/overlays that may display the output. |
| Validation/readiness impact | How this engine affects readiness, blockers, warnings, or review state. |
| Tests/selftests proving it | Static checks, selftests, golden scenarios, or release gates that prove the contract. |

## Master engine map

| Phase | Engine name | Inputs | Outputs | Consumers | Source-of-truth level | Requirement fields consumed | Frontend pages using it | Report/export sections using it | Diagram sections using it | Validation/readiness impact | Tests/selftests proving it |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Planning input discipline / traceability | requirementsJson; project/site/VLAN records; design-core summaries | planningInputCoverage; planningInputDiscipline; traceability; truth/source/confidence labels | design-core; validation; report/export; frontend trust views | backend-control-ledger | all requirement fields | Overview; Core Model; Requirements; Validation; Report | Requirement traceability; Assumptions; Readiness | Truth labels; requirement overlays | Stops captured inputs from becoming fake authority. | designCore.selftest; behavioralMatrix.selftest; phase0 inventory check |
| 2 | Requirements materialization | requirementsJson; impact registry; existing project/site/VLAN/DHCP records | materialized Sites; VLAN/segments; DHCP scopes; review notes; consumed fields | design-core; closure; validation; report; diagram | backend-authoritative | all requirement fields | Requirements; Sites; VLANs; Addressing | Requirement traceability; Addressing; Object model; Review items | Physical; Logical; Security | Requirement must become object, signal, blocker, review item, or explicit no-op/unsupported reason. | requirementsGoldenScenarios.selftest; phase0 inventory check |
| 3 | Requirements impact / closure / scenario proof | requirementsJson; materialized objects; network object model; design-core outputs | closure matrix; scenario proof; missing consumer findings | validation; requirements UI; report/export; diagram truth | backend-control-ledger | all requirement fields | Requirements; Overview; Validation; Report | Requirement traceability; Validation; Assumptions | Requirement-driven visual evidence | Prevents requirements from being marked complete when only partially propagated. | requirementsGoldenScenarios.selftest; phase41 scenarios |
| 4 | Engine 1 CIDR/addressing | base range; site blocks; VLAN subnets/gateways/hosts; requirement-derived demand | organizationBlock; siteBlocks; addressingRows; proposedRows; transitPlan; loopbackPlan | design-core; IPAM reconciler; validation; object model; report; diagrams | backend-authoritative | users/site/siteCount/segments/growth/gateway/site-block fields | Addressing; Sites; VLANs; Core Model; Validation | Addressing plan; Validation; Appendices | Logical labels; per-site subnets; WAN/transit | CIDR/gateway/overlap/capacity errors must block or require review. | cidr.selftest; cidrProof; allocator; boundary selftests |
| 5 | Engine 2 enterprise IPAM | route domains; pools; allocations; DHCP scopes; reservations; brownfield imports; Engine 1 rows | durable allocation truth; DHCP/reservation truth; conflicts; approvals; ledger | design-core posture; validation; IPAM page; report; implementation | durable-ipam-authority | addressing, site, reserved range, management IP, dual-ISP/cloud fields | Enterprise IPAM; Addressing; Validation; Report | Enterprise IPAM; Addressing; Review items | Route-domain and address truth labels | Planned subnet cannot be ready when IPAM says conflict, stale, reserved, or approval missing. | proofMatrix; behavioralMatrix |
| 6 | Design-core orchestrator | repository aggregate; requirements; sites; VLANs; IPAM records; engine outputs | DesignCoreSnapshot; summary; readiness truth; issues | all design pages; validation; report/export; diagrams; implementation/templates | backend-authoritative | all requirement fields | Overview; Core; Addressing; Routing; Security; Implementation; Report; Diagram | all backend report sections | all backend-truth diagram modes | Central readiness aggregation for design review and implementation execution. | designCore.selftest; phase33 matrix; behavioralMatrix |
| 7 | Standards alignment / rulebook | requirements; organization block; site summaries; transit; security intent; allocation policy; issues | standardsAlignment; rulebook; blocker issues; remediation | design-core; validation; report/export; standards UI | backend-computed-review-gated | guest, management, remote, dual-ISP, cloud, security, addressing fields | Standards; Validation; Report; Core Model | Validation; Assumptions; Review items | Standards warning overlays | Required standards blockers must prevent false readiness. | designCore.selftest; phase84 check |
| 8 | Validation/readiness | DesignCoreSnapshot; CIDR/IPAM findings; closure; standards; routing; security; implementation | validation findings; readiness gates | Validation page; Overview; Report; export | backend-authoritative | all requirement fields | Validation; Overview; Report | Readiness; Validation; Review items | Diagram warnings/blockers | Design cannot be ready while critical requirement chains or blockers are unresolved. | behavioralMatrix; phase87 check |
| 9 | Network object model | project; addressingRows; siteSummaries; transit; loopback | devices; interfaces; links; zones; policies; NAT; DHCP; reservations; truth states | graph; routing; security; implementation; reportTruth; diagramTruth | backend-authoritative | site and segment/security/WAN/cloud fields | Core Model; Diagram; Routing; Security; Implementation | Object model; Routing; Security; Implementation | Physical; Logical; WAN/cloud; Security | Inferred/review-required objects cannot masquerade as approved facts. | phase33 matrix; designCore.selftest |
| 10 | Design graph | object model; requirement objects; routes; policies; implementation steps | nodes; edges; integrity findings; dependency paths | object summary; implementation; report/export; diagrams | backend-authoritative | all requirement fields | Core Model; Implementation; Diagram | Object model; Implementation; Validation | backend identity and dependency rendering | Orphans and unsupported diagram/implementation links become findings. | phase33 matrix; phase36 implementation selftest |
| 11 | Routing and segmentation | route domains; site summaries; transit/loopback; object model; policy signals; WAN/cloud requirements | routingSegmentation; route intents; route entries; reachability; segmentation expectations | security; implementation; validation; report; WAN/logical diagrams | backend-computed-review-gated | multi-site, dual-ISP, cloud, remote, guest, management, inter-site fields | Routing; Diagram; Validation; Report | Routing; Security; Implementation; Review items | WAN/cloud; Logical; Security flow | Planning/review truth only; missing next hops/cloud/VRF issues require review. | phase34 routing; phase41 scenarios |
| 12 | Security policy flow | zones; policy rules; NAT; routing expectations; security requirements | service objects; policy matrix; flows; NAT review; shadowing/logging findings | validation; implementation; report; security diagrams | backend-computed-review-gated | guest, remote, management, cloud, IoT, cameras, printers, voice, security fields | Security; Diagram; Validation; Report | Security; Implementation; Validation; Review items | Security zones/flows; Logical | Missing policy, overbroad permits, NAT/logging gaps must block or require review. | phase35 security; phase96 check |
| 13 | Implementation planning | verified source objects; routes; security flows; DHCP/IPAM truth; graph dependencies | stages; steps; preconditions; verification; rollback; readiness | templates; validation; Implementation UI; report | backend-computed-review-gated | all requirement fields | Implementation; Validation; Report | Implementation; Validation; Review items | Implementation view only from backend objects | No READY step without upstream source evidence. | phase36 implementation; phase42 templates |
| 14 | Vendor-neutral implementation templates | implementation plan; source objects; source requirements; missing variables | neutral templates; required variables; evidence; rollback requirements | Implementation UI; report/export; future translators | backend-computed-review-gated | all requirement fields | Implementation; Report | Implementation; Appendices; Assumptions | Implementation view if traceable | Templates cannot become fake vendor command output. | phase42 templates; phase88 check |
| 15 | Report/export truth | DesignCoreSnapshot; reportTruth; validation; closure; engine summaries | DOCX/PDF/CSV content; truth sections; assumptions; review items | Report page; export logs; deliverables | backend-authoritative | all requirement fields | Report | Executive summary; readiness; traceability; addressing; IPAM; object model; routing; security; implementation; validation; diagram truth | Diagram truth section | Exports must not claim facts the backend cannot prove. | phase88 check; release artifacts check |
| 16 | Diagram truth / renderer / layout | backend diagramTruth; object model; graph; routing/security objects; truth states | physical; logical; WAN/cloud; security; per-site; diagram warnings | Diagram page; report diagram truth; visual QA | backend-computed-review-gated | site, segment, dual-ISP, cloud, remote, server, security fields | Diagram | Diagram truth; Object model; Security | Physical; Logical; WAN/cloud; Security; Per-site; Implementation | Render backend truth only; inferred/review objects visibly labelled. | phase107 check; phase106 check |
| 17 | Platform/BOM foundation | requirements; topology assumptions; physical counts; growth/redundancy signals | switch/AP/firewall/WAN estimates; PoE/ports; licensing placeholders; confidence notes | BOM page; future report BOM | frontend-advisory-estimate | wireless, voice, printers, IoT, cameras, users/site, siteCount, dual-ISP, physical count fields | Platform/BOM | advisory BOM only until backend-owned | advisory physical sizing only | Estimate widget; not implementation authority until backend-owned or clearly labelled. | phase0 inventory check |
| 18 | Discovery/current-state | discoveryJson; manual discovery fields; future imports; brownfield requirements | manual discovery plan; current-state boundary; import readiness; conflict/review states | Discovery page; brownfield readiness; validation; future reconciliation | manual-discovery-boundary | brownfield/project phase, site, operations, monitoring/logging/backup/inter-site fields | Discovery; Enterprise IPAM; Validation | Discovery/current-state; Assumptions; Review items | imported/discovered overlays only after validation | Must distinguish not provided, manual, imported, validated, conflicting, review required. | designCore.selftest; phase0 inventory check |
| 19 | AI draft/helper | user prompt; draft context; requirements profile; review/apply controls | AI draft suggestions; checklist; selective apply payloads | AI workspace; Requirements page; materializer after review | ai-draft-only | all requirement fields | AI Workspace; Requirements | none as authority until reviewed/materialized | none as authority until reviewed/materialized | AI suggestions stay draft/review-required until structured and validated. | phase0 inventory check |

## Proof-chain checklist for every later phase

Every future phase must declare and prove:

- root check;
- backend engine selftests;
- frontend build;
- backend build;
- release artifact check;
- release discipline check;
- diagram truth checks when relevant;
- requirements golden scenarios when requirements are affected;
- report/export truth checks when report content is affected.

## Phase 0 verdict

The package is not trash. The dangerous part is the repair history: Phase 84 through Phase 107 show that the product has been patched heavily around truth, report, and diagram behavior. Without a master control sheet, every future patch risks becoming another local fix that breaks propagation somewhere else.

Phase 0 adds the missing control layer:

- 19-engine inventory in `backend/src/lib/phase0EngineInventory.ts`;
- static check in `scripts/check-phase0-engine-inventory.cjs`;
- root script `check:phase0-engine-inventory`;
- this document as the roadmap control sheet.

The next real fix must be Phase 1: planning input discipline / traceability. Do not jump to routing, reports, diagrams, BOM, discovery, or AI.
