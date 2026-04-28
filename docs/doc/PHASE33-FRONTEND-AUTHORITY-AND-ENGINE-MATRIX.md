# Phase 33 — Frontend authority completion and backend engine matrix

## Purpose

Phase 33 was only allowed to proceed after confirming whether the frontend still contained engine behavior. The audit found remaining browser-side design logic, so this phase first removes those remnants and then adds the backend engine matrix hardening gate.

## Frontend authority audit result

The frontend was not fully clean after Phase 32B. The remaining design-authority leaks were:

- CIDR/subnet helper modules in frontend source
- subnet suggestion and recommended sizing behavior in the VLAN form
- role classification and usable-host calculations in the VLAN form/table
- site CIDR validation in the site form
- topology classification, primary-site selection, capacity math, and device-tier inference in backend snapshot view-model mapping

Those are not display concerns. They are backend engine responsibilities.

## Frontend cleanup completed

This phase removes or neutralizes the remaining browser-side engine behavior:

- deleted frontend CIDR/subnet validator modules
- removed VLAN subnet suggestions and gateway/capacity calculations from the VLAN form
- converted the VLAN table into a stored-input display table only
- removed site-form CIDR validation and replaced it with backend-validation messaging
- changed backend snapshot view-model mapping so it does not infer topology, capacity, primary site, or device tiers
- strengthened the frontend authority gate to reject these patterns if they return

The frontend may still group, filter, label, format, and visualize backend data. It must not infer network design facts.

## Backend matrix added

Phase 33 adds `backend/src/lib/phase33EngineMatrix.selftest.ts` and wires it into `npm run engine:selftest:all` through `engine:selftest:phase33-matrix`.

The matrix checks these backend responsibilities:

- backend authority metadata exists and remains authoritative
- object model coverage includes devices, interfaces, zones, policies, NAT, DHCP, reservations, and graph data
- routing produces connected, default, summary, and branch reachability intent where appropriate
- security flow exposes zone-to-zone policy and NAT consequences
- implementation plan produces stages, steps, verification checks, rollback actions, and blockers
- hostile input remains blocked or flagged instead of silently becoming usable design truth

## Release gates

This phase adds `scripts/check-engine-test-matrix.cjs` and wires it into:

- `scripts/final-preflight.sh`
- `scripts/verify-build.sh`

The frontend authority guard now also rejects the old CIDR/subnet helpers and browser-side planning calls.

## Verification status

Static/source preflight passes. Full dependency install/build proof still needs to be run in a normal local environment:

```bash
bash scripts/verify-build.sh
```

This phase does not claim the routing or security engines are A+ yet. It makes sure the frontend is no longer hiding design-engine behavior and gives the backend engine a larger matrix gate before deeper upgrades.
