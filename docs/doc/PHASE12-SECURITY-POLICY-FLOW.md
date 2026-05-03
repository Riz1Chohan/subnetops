# Phase 12 — Security Policy Flow

Security policy flow is the controlled Phase 12 backend review surface. Phase 12 hardens the security policy flow engine as backend-controlled planning evidence. It is not vendor firewall configuration and it must not pretend that a review-gated policy row is implementation-ready.

## Requirements Propagation Contract

requirement input → normalized security requirement signal → materialized flow/policy/NAT/logging review object or explicit review reason → backend design-core input → security policy flow computation → traceability evidence → validation/readiness impact → frontend display → report/export impact → diagram impact where relevant → selftest/golden proof.

## Requirement consequences

- `guestAccess=true` → Guest to Internal blocked, Guest to Internet allowed/reviewed, NAT/logging evidence required.
- `remoteAccess=true` → VPN/identity/logging review required.
- `managementAccess=true` → management-plane source restrictions and logging required.
- `cloudHybrid=true` → cloud/on-prem boundary policy required.
