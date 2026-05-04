# SubnetOps V1 Pass 2 — Network Engineer Trust Repair

Pass 2 hardens the V1 package for network-engineer trust without expanding scope into vendor config generation, live discovery, or advanced routing simulation.

## Repairs

- Added write-time engineering validation for VLAN CIDR/gateway pairs.
- Blocked gateway-outside-subnet, gateway-as-broadcast/network address, invalid IPv4 notation, and non-canonical CIDR writes.
- Added service-layer merged update validation so gateway-only or subnet-only edits cannot drift from the saved companion field.
- Added site default-address-block write validation.
- Added validation result readiness metadata: `readinessState`, `engineeringReviewState`, and `canClaimReady`.
- Hardened diagram readiness so planned/proposed/inferred/imported/review-required objects cannot render as `ready` just because no finding points at them.
- Hardened report/export readiness so a READY document with review findings, blocking findings, missing proof boundary, missing section evidence, or verified sections carrying limitations cannot claim ready.
- Added `selftest:network-engineer-trust` and wired it into backend `selftest:all`.
- Added root `check:trust` and inserted it between real builds and release quality checks.

## Scope deliberately not added

- No vendor-specific config compiler.
- No live network discovery.
- No BGP/OSPF/VRF implementation-depth simulation.
- No frontend-invented diagram topology.
