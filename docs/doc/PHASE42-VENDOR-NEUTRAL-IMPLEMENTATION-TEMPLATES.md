# Phase 42 — Vendor-Neutral Implementation Templates

## Status

Implemented as a backend-authored implementation-template layer.

Vendor-neutral templates are the scope of this phase. Phase 42 produces not vendor-specific commands; it does **not** generate vendor-specific commands. That is intentional. Jumping directly from planning truth to Cisco/Palo Alto/Fortinet/Juniper syntax would be trash engineering because the platform has not yet proven vendor syntax, live device state, change-window behavior, or platform-specific constraints.

## Goal

Convert the backend `implementationPlan` into human-readable, vendor-neutral implementation templates that preserve SubnetOps truth:

- readiness gates
- risk level
- target object identity
- implementation intent
- dependencies
- graph-backed dependency edges
- blast radius
- pre-change checks
- neutral action language
- verification evidence
- rollback evidence
- blocker reasons
- proof boundaries

The backend remains the source of truth.

## Files Added / Changed

### Added

- `backend/src/services/designCore/designCore.implementationTemplates.ts`
- `backend/src/lib/phase42VendorNeutralTemplates.selftest.ts`
- `scripts/check-phase42-vendor-neutral-templates.cjs`
- `docs/doc/PHASE42-VENDOR-NEUTRAL-IMPLEMENTATION-TEMPLATES.md`

### Changed

- `backend/src/services/designCore.types.ts`
- `backend/src/services/designCore.service.ts`
- `backend/src/services/exportDesignCoreReport.service.ts`
- `backend/src/services/export.service.ts`
- `frontend/src/lib/designCoreSnapshot.ts`
- `backend/package.json`
- `package.json`

## Backend Model

The backend snapshot now exposes:

```ts
vendorNeutralImplementationTemplates: VendorNeutralImplementationTemplateModel
```

The model includes:

- `summary`
- `groups`
- `variables`
- `templates`
- `proofBoundary`
- `safetyNotice`

The summary is explicit:

- `source = backend-implementation-plan`
- `commandGenerationAllowed = false`
- `vendorSpecificCommandCount = 0`

## Template Source

Templates are compiled from:

- `implementationPlan.steps`
- `implementationPlan.stages`
- `implementationPlan.verificationChecks`
- `implementationPlan.rollbackActions`
- step dependencies
- dependency object IDs
- graph dependency edge IDs
- blast radius
- readiness reasons
- blockers
- required evidence
- acceptance criteria

No frontend code invents the templates.

## Export Coverage

PDF/DOCX exports include a new Phase 42 section through the shared professional report model:

- template summary
- template groups
- vendor-neutral templates
- evidence and rollback linkage
- template variables
- template proof boundary

CSV export includes:

- vendor-neutral implementation template summary
- template groups
- individual templates
- verification and rollback evidence rows
- proof-boundary rows

## Runtime Selftest

`backend/src/lib/phase42VendorNeutralTemplates.selftest.ts` reuses the Phase 41 scenario library and asserts:

- every backend implementation step gets a vendor-neutral template
- command generation remains disabled
- vendor-specific command count remains zero
- safety notice explicitly rejects command syntax
- every template has pre-checks
- every template has neutral action language
- every template has proof-boundary language
- required evidence and rollback variables are present
- command-like leakage is rejected

## Static Gate

Run:

```bash
node scripts/check-phase42-vendor-neutral-templates.cjs
```

The static gate verifies the builder, snapshot wiring, frontend type acceptance, PDF/DOCX export coverage, CSV coverage, runtime selftest presence, package scripts, and documentation.

## Proof Boundary

### Modeled

SubnetOps models implementation-step intent, readiness, dependencies, verification checks, rollback actions, target objects, and blast radius.

### Inferred

SubnetOps infers neutral action language from the backend implementation step category and stage metadata.

### Proposed

SubnetOps proposes human-readable implementation templates that help an engineer prepare a change safely.

### Not proven

SubnetOps does not prove:

- live device state
- cabling
- provider WAN behavior
- vendor CLI syntax
- production firewall rulebase syntax
- platform-specific feature support
- change-window success

### Engineer review required

Engineer review is required for:

- blocked templates
- review templates
- high-risk templates
- missing verification evidence
- missing rollback linkage
- any future vendor-specific command generation

## Why Phase 42 Stops Here

Phase 42 deliberately stops at vendor-neutral templates because the product is not ready to generate platform commands yet.

Phase 43 may introduce vendor-specific command generation, but only after gated checks prove the neutral templates, target objects, vendor profile, and syntax boundary are strong enough.
