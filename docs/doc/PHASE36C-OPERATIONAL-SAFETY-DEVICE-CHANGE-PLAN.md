# Phase 36C — Operational Safety / Device-Level Change Plan

## Purpose

Phase 36C hardens the backend Implementation Planning Engine so risky device-facing changes cannot look executable unless operational safety is modeled first.

This is not vendor command generation. It is a backend-authoritative safety layer for implementation planning.

## What changed

- Added per-device operational safety gates.
- Route, interface, DHCP, security-policy, and NAT steps now depend on affected device safety gates where device ownership can be resolved.
- Risky steps are blocked when the affected device has no modeled management IP.
- Risky steps are downgraded to review when management access exists but backup, management-access proof, or fallback/rollback path evidence is not modeled.
- Added operational-safety verification checks.
- Added operational-safety rollback stop action.
- Added implementation findings for blocked safety gates and high-risk steps without safety dependencies.
- Added summary counts for operational safety gates and blocked safety gates.

## Why this matters

A network implementation plan that can change routes, NAT, policy, DHCP, or routed interfaces without proving management access and rollback posture is unsafe.

Phase 36C makes that unsafe state visible and blocks it instead of hiding it behind a polished checklist.

## New backend behavior

Each modeled device now receives an implementation step similar to:

```text
Confirm operational safety for <device>
```

The step requires evidence for:

- current configuration backup or baseline capture
- tested management access
- out-of-band, console, fallback, or rollback access path
- change owner approval before the maintenance window

Risky implementation steps now depend on these safety gates.

Examples:

```text
Route step → device operational-safety gate
Security flow step → device operational-safety gate
NAT step → device operational-safety gate
Interface/gateway step → device operational-safety gate
DHCP step → device operational-safety gate
```

## Stop conditions

The implementation plan is blocked when:

- a device-facing risky step targets a device without a modeled management IP
- an operational-safety gate is blocked
- high-risk implementation steps do not depend on a safety gate

## Added selftests

Phase 36C expands the Phase 36 selftest with:

- device operational-safety gate creation
- blocked safety gate when management IP is missing
- safety evidence requirements for backup and rollback
- route/security/NAT dependencies on operational-safety gates
- operational-safety rollback stop action
- implementation finding for blocked safety posture

## Boundary

The frontend remains display-only. It may surface operational safety gates, blocked state, evidence, and rollback requirements, but it must not create browser-side implementation safety logic.

## Status

Phase 36C strengthens the implementation engine but does not replace Phase 36D.

Phase 36D should still expand object-level verification and deeper selftest coverage.
