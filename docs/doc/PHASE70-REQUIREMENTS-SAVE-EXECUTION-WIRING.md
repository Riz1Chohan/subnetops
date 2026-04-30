# Phase 70 — Requirements Save Execution Wiring

Phase 70 is the first runtime repair after the Phase 69 audit. It does not claim every requirement consequence is perfect. It fixes the broken execution path that made saved requirements behave like dead survey text.

## Problem proven by runtime screenshots and export

The deployed UI showed selected requirements for a multi-site hybrid/cloud project, but downstream outputs still showed zero sites, zero VLAN/addressing rows, zero topology links, zero traffic flows, and blocked scenario proof. The report also exposed 0 sites and 0 addressing rows while still carrying captured requirement evidence.

That means requirement capture existed, but the runtime path from Save Requirements into materialized engineering objects was not trustworthy enough.

## Phase 70 fix

Save Requirements now uses a dedicated backend endpoint instead of relying on generic project settings update behavior:

```text
PATCH /api/projects/:projectId/requirements
```

The endpoint performs one explicit transaction:

```text
validate requirements payload
→ persist project.requirementsJson
→ run requirements materialization
→ create/update requirement-managed Sites
→ create/update requirement-managed VLAN/segment rows
→ return materialization summary and output counts
```

The frontend Requirements workspace now calls this endpoint through `useSaveProjectRequirements()` and shows a concrete materialization summary after save.

## Frontend refresh discipline

After a successful requirements save, the frontend invalidates:

```text
projects
project
project-sites
project-vlans
design-core
enterprise-ipam
validation
```

This is required because sites, VLANs, design-core, diagram, overview, validation, and report/export views all depend on the same saved requirement-driven objects.

## Payload size hardening

`requirementsJson` validation was raised from 12,000 to 50,000 characters. The 83-field guided requirements object must not be rejected or silently boxed in by an undersized schema limit.

## Non-negotiable acceptance test

For a project with requirements like:

```text
siteCount = 10
usersPerSite = 50
guestWifi = true
management = true
printers = true
cameras = true
wireless = true
remoteAccess = true
cloudConnected = true
environmentType = Hybrid
```

Save Requirements must return non-zero materialization evidence:

```text
outputCounts.sites >= 10
outputCounts.vlans > 0
requirementsMaterialization.createdSites or updatedSites > 0
requirementsMaterialization.createdVlans or updatedVlans > 0
```

If the UI still shows 0 sites or 0 VLAN/segment rows after saving and refetching, Phase 70 failed and the next bug is either materializer persistence, API auth/routing, database migration/schema drift, or frontend stale data.

## What Phase 70 does not finish

Phase 70 does not fully wire every one of the 83 fields into perfect routing, security, diagram, and report consequences. That comes later. Phase 70 only fixes the critical execution trigger so requirement selections can start becoming real backend objects.

Next phase should be Phase 71: Direct Design Driver Wiring, where every direct-impact field gets validated against actual generated Sites, VLANs, address rows, gateways, and design-core consequences.
