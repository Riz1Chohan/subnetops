# Phase 87 — Readiness, Policy, Warning, Report, and Diagram Stabilization

Phase 87 is a product-truth stabilization pass after Phase 86 deployed successfully.

## Scope

- Separate design-review readiness from implementation-execution readiness.
- Reconcile security policy findings so explicit default-deny guardrails are consumed by routing/security checks.
- Split broad policy meaning for internal-to-management and WAN-to-DMZ boundaries.
- Fix gateway warning quality so first-usable and last-usable gateway choices are not flagged as non-standard.
- Keep real capacity warnings, especially management networks nearing usable-address limits.
- Hide internal phase/debug sections from the default professional report.
- Preserve full proof/debug output behind the `reportMode=full-proof` export mode.
- Fix backend-authoritative diagram rendering so selected views include connected edges and endpoint nodes instead of node-only islands.

## Marker

`PHASE_87_READINESS_POLICY_WARNING_REPORT_DIAGRAM_STABILIZATION`
