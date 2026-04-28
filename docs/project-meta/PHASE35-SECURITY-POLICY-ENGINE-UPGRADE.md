# Phase 35 — Security Policy Engine Upgrade

Phase 35 upgrades the backend security-policy engine while preserving the Phase 32B/33 rule that the frontend is only allowed to display, explain, filter, and visualize backend design truth.

## Scope

This phase intentionally does **not** generate vendor firewall commands. It strengthens the backend neutral security model first.

## Backend additions

- Security policy matrix rows for zone-to-zone posture review.
- Service groups and richer service objects with broad-match and implementation-review flags.
- Ordered policy-rule review based on backend sequence.
- Rule shadowing detection.
- Explicit implicit-deny gap detection for high-risk boundaries.
- NAT review rows tied to NAT-required security flows.
- Logging/evidence requirements for denies, management-plane boundaries, and high-risk source traffic.
- First-match observed policy rule evidence on flow requirements.
- New Phase 35 backend selftest: `npm run engine:selftest:phase35-security`.

## Frontend boundary

The frontend snapshot contract now mirrors the backend security-policy engine output:

- policy matrix
- service groups
- rule order reviews
- NAT reviews
- richer flow metadata

The frontend renders these outputs but does not compute policy posture, shadowing, NAT coverage, or implicit deny state.

## Release gates

Added:

- `scripts/check-security-policy-engine-upgrade.cjs`

Wired into:

- `scripts/final-preflight.sh`
- `scripts/verify-build.sh`
- `backend/package.json` through `engine:selftest:phase35-security`
- `engine:selftest:all`

## Validation performed in this environment

Static/source preflight passes.

Full dependency install/build still must be run locally:

```bash
bash scripts/verify-build.sh
```

## Remaining boundary

This is still vendor-neutral policy design. Platform-specific firewall translation, command generation, address-object compilation, security profiles, and rulebase export remain future phases.
