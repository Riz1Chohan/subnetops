# Phase 35B — Security Policy Engine Hardening Before Phase 36

## Purpose

This pass hardens the Phase 35 security policy engine before beginning Phase 36 implementation planning. The goal is to prevent the implementation planning engine from consuming weak or misleading security readiness signals.

## Hardened Areas

### NAT readiness

Required NAT is no longer treated as blocked simply because its status is `required`.

A required NAT rule can now become `ready` when all of the following are true:

- source zone exists
- destination zone exists when specified
- translation mode is concrete: `interface-overload`, `static`, or `pool`
- at least one NAT-required security flow is covered by the rule

A required NAT rule becomes `blocked` only when zone references or translation mode are unresolved.

### NAT flow-gap scope

NAT missing-flow review is now scoped to flows the NAT rule actually intends to cover:

- source zone must match
- destination zone must match when the NAT rule specifies a destination zone

This avoids falsely blaming one NAT rule for unrelated NAT-required flows from the same source zone.

### Default-deny posture

Default-deny boundaries are now stricter.

A zone pair with deny posture is no longer considered adequately modeled just because any explicit policy rule exists. It requires an explicit deny rule.

If an allow rule exists on a default-deny boundary without an explicit deny guardrail, the engine emits:

- `SECURITY_IMPLICIT_DENY_NOT_MODELED`
- `SECURITY_DEFAULT_DENY_WEAKENED_BY_ALLOW`

This protects Phase 36 from compiling unsafe allow-only boundaries into implementation steps.

## Test Coverage Added

New Phase 35 selftest cases:

- `phase 35 treats required NAT as ready when zones translation and flow coverage are valid`
- `phase 35 does not let allow-only rules satisfy default-deny boundaries`

The static Phase 35 security upgrade check now also rejects the two weak regression patterns:

- blocking all required NAT via `|| natRule.status === "required"`
- skipping implicit-deny findings just because `explicitPolicyRuleIds.length > 0`

## Verification Performed

Passed:

```bash
node --trace-uncaught scripts/check-security-policy-engine-upgrade.cjs
bash scripts/assert-release-discipline.sh
node scripts/check-release-artifacts.cjs
node scripts/check-frontend-authority.cjs
```

Not fully proven in this sandbox:

```bash
npm ci
npm run build
npm run engine:selftest:all
```

Those still need to be run locally or in Render with the pinned Node/npm environment.

## Phase 36 Readiness Impact

The implementation planning engine can now consume stronger security readiness signals:

- NAT required does not automatically mean blocked
- NAT ready/review/blocked has clearer evidence
- default-deny boundaries require explicit deny guardrails
- allow-only high-risk boundaries are surfaced as blockers before implementation planning

This is the correct baseline before Phase 36 starts compiling ordered implementation steps, dependencies, blast radius, evidence, rollback, and verification.
