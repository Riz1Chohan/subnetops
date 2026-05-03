# Phase 8 — Validation / Readiness Authority

Contract marker: `PHASE8_VALIDATION_READINESS_AUTHORITY_CONTRACT`

Phase 8 makes validation the strict readiness authority. It does not create new design facts and it does not upgrade routing, security, reports, diagrams, BOM, discovery, or AI. It aggregates existing backend truth surfaces and decides whether the design is blocked, review-required, warning-only, informational, or passed.

## Role

`STRICT_READINESS_AUTHORITY_NOT_ADVISORY_SUMMARY`

Validation must preserve upstream truth from:

- Phase 3 requirements closure
- Phase 4 CIDR/addressing truth
- Phase 5 Enterprise IPAM durable authority
- Phase 6 design-core orchestrator boundaries
- Phase 7 standards rulebook
- routing and segmentation readiness
- security policy / NAT readiness
- implementation planning readiness
- report truth
- diagram truth

## Readiness categories

- `BLOCKING`
- `REVIEW_REQUIRED`
- `WARNING`
- `INFO`
- `PASSED`

A design cannot be treated as implementation-ready while any `BLOCKING` or `REVIEW_REQUIRED` Phase 8 finding remains.

## Snapshot surface

The design-core snapshot exposes:

```text
phase8ValidationReadiness
```

This includes:

- `overallReadiness`
- `validationGateAllowsImplementation`
- `coverageRows`
- `requirementGateRows`
- `findings`
- finding counts by category

## Requirement propagation rule

Phase 8 validates the master propagation contract:

```text
requirement input
→ normalized requirement signal
→ materialized source object OR explicit no-op/review reason
→ backend design-core input
→ engine-specific computation
→ traceability evidence
→ validation/readiness impact
→ frontend display
→ report/export impact
→ diagram impact where relevant
→ test/golden scenario proof
```

If a requirement is captured but not materialized, materialized but not consumed, consumed but not shown in UI/report/diagram where relevant, or creates unresolved blocker/review state, Phase 8 must surface it.

## Render build fix included

Phase 8 also includes a targeted Render TypeScript build fix for the existing report export compile error:

```text
Object literal may only specify known properties, and 'summary' does not exist in type 'ReportSection'.
```

The Phase 6 and Phase 7 report sections now use the supported `paragraphs` field instead of an unsupported `summary` property. This keeps the report export type-safe under `tsc -p tsconfig.json`.

## Acceptance proof

Phase 8 is proven by:

```bash
npm run check:phase8-validation-readiness
npm run check:phase8-107-release
```

Backend selftest hook:

```bash
cd backend
npm run engine:selftest:phase8-validation-readiness
```
