# Phase 7 — Standards Alignment / Rulebook Engine

## Contract

`PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT`

Phase 7 turns standards from credibility text into active backend rule logic. A standards rule is allowed into the system only when it declares:

- applicability condition
- severity
- pass / warn / block / review / not-applicable state
- affected engine
- affected object IDs where available
- remediation guidance
- requirement relationship
- exception policy
- validation/readiness impact
- report/export impact
- frontend display impact

## Hard rule

Standards cannot be decorative. If a rule affects readiness, the backend must expose the evidence through `phase7StandardsRulebookControl`. Frontend, report, and diagram consumers may display this evidence, but they must not invent standards authority independently.

## Requirement propagation

Requirement-driven standards activation now follows:

requirement input → normalized requirement signal → Phase 3 closure row → standards rule activation → enforcement state → validation/readiness finding → frontend/report evidence.

Examples:

- `guestWifi=true` activates guest isolation and firewall-policy expectations.
- `managementAccess=true` activates management isolation and management-plane restriction expectations.
- `remoteAccess=true` activates firewall policy / zero-trust / identity review expectations.
- `dualIsp=true` activates WAN/transit and failover standards review without creating fake circuits.
- IPv6 requests activate IPv6 architecture/ULA review without pretending IPv6 allocation is complete.

## Readiness states

- `READY` means no blocking/review standards findings are active.
- `REVIEW_REQUIRED` means standards are active but require engineering review or explicit exception evidence.
- `BLOCKED` means a required standards rule failed and readiness must not be overclaimed.

## Acceptance proof

Phase 7 is proven by:

- `backend/src/services/designCore/designCore.phase7StandardsRulebookControl.ts`
- `backend/src/lib/phase7StandardsRulebook.selftest.ts`
- `scripts/check-phase7-standards-rulebook.cjs`
- `phase7StandardsRulebookControl` in the backend design-core snapshot
- validation consuming Phase 7 findings
- report/export surfacing Phase 7 rows
- frontend overview and standards page displaying backend rulebook evidence

## Non-goals

Phase 7 does not upgrade routing simulation, security policy simulation, diagrams, BOM, discovery, or AI. It only makes standards active and traceable.
