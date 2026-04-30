# Phase 69 — Requirements Runtime Truth Audit

Phase 69 is an audit package, not a feature-completion claim.

The runtime failure shown by the current deployed project is not a diagram bug and not a report wording bug. The user selected a multi-site hybrid/security-heavy scenario, but downstream outputs still showed 0 sites, 0 configured segments/VLANs, 0 address rows, 0 flows, 0 devices, and an empty diagram. The exported report also showed 0 sites and 0 addressing rows while describing a requirements-selected multi-site scenario.

That means SubnetOps does not yet have a proven requirement lifecycle.

Required lifecycle:

`UI control → save payload → project.requirementsJson → materializer → design-core → frontend/report/diagram/validation`

Current runtime evidence from screenshots/report proves the chain is broken after requirement capture.

Do not claim requirements are fixed until Phase 70+ runtime acceptance tests pass.

## Phase 69 source-level findings

1. The frontend `RequirementsProfile` model currently declares 83 requirement fields.
2. The backend requirement impact registry currently declares 83 fields.
3. The registry key set matches the frontend model key set at source level.
4. The requirements page sends `requirementsJson: stringifyRequirementsProfile(requirements)` through the project update path.
5. The backend project update service contains a call to `materializeRequirementsForProject(...)` when `requirementsJson` is patched.
6. The frontend update hook invalidates project, sites, VLANs, design-core, enterprise-IPAM, and validation queries after project update.

Those source facts are necessary, but they are not sufficient. Runtime evidence still shows that saved requirements are not producing real engineering objects in the deployed flow.

## Hard diagnosis

The current application can capture and display requirement selections. It cannot yet prove that each captured selection becomes one of these outcomes:

- a persisted Site object,
- a persisted VLAN/segment object,
- an addressing row/gateway/DHCP decision,
- a route-domain/WAN/cloud/topology object,
- a security zone/flow/policy consequence,
- a validation rule/finding,
- a diagram node/edge/overlay,
- a report/export section backed by real design data,
- or a clearly labelled review-only item.

Traceability rows are not enough. A field that says “captured” but produces no output is still dead design input unless it is explicitly classified as review-only.

## Mandatory Phase 70 acceptance target

When a project saves these requirements:

- multi-site business,
- new network build,
- hybrid,
- healthcare-oriented,
- 10 sites,
- 50 users per site,
- security and segmentation,
- guest Wi-Fi,
- management network,
- printers,
- cameras/security devices,
- wireless access,
- remote access/VPN,
- cloud-connected services,
- internet at each site,
- mixed local and centralized services,
- Azure/site-to-cloud VPN,
- selected security, cloud, addressing, operations, physical, and apps/WAN fields,

then downstream runtime output must not remain empty. The minimum runtime proof is:

- Sites count is greater than 0 and matches selected site count when auto-materialization is expected.
- VLAN/segment rows are greater than 0.
- Addressing rows are greater than 0.
- Requirement scenario proof is not 0/10.
- Validation does not say clean if required objects are missing.
- Report cannot say compact single-site when a multi-site requirement is saved.
- Diagram is either populated or blocked with precise missing object reasons tied to failed requirement materialization.

## Phase plan after this audit

### Phase 70 — Save Execution and Materialization Proof

Make the Save Requirements path return and display an explicit materialization summary. If the backend writes 0 sites and 0 VLANs for a direct-impact scenario, the save response must make that visible as a failure.

### Phase 71 — Direct Design Driver Wiring

Force direct driver fields such as site count, users per site, guest, management, printers, cameras, IoT, wireless, remote access, cloud, and server placement into concrete sites/segments/addressing/security evidence.

### Phase 72 — Policy, Routing, Cloud, and Operations Consequences

Wire security posture, trust boundary, identity, cloud routing, remote access method, monitoring/logging/backup, WAN model, bandwidth, outage tolerance, and growth choices into security-flow, route-domain, WAN/cloud, and implementation-review evidence.

### Phase 73 — Validation Honesty Hardening

Empty designs must be blocked. Validation must fail when selected requirements imply required sites, segments, addressing, flows, topology, or diagram evidence that does not exist.

### Phase 74 — Report and Diagram Truth Lock

Reports and diagrams must not use fallback fiction. They must reflect generated design truth or state the exact missing requirement consequences.

### Phase 75 — Golden Scenario Regression Tests

Add runtime scenario tests for small office, 10-site multi-site business, security segmentation, guest/wireless, cloud/remote access, voice/printer/IoT/camera, dual ISP/resilience, and brownfield upgrade scenarios.

## Non-negotiable rule

No future package may claim “requirements are fixed” unless it proves the full lifecycle from saved UI selections to concrete backend objects and visible downstream outputs.
