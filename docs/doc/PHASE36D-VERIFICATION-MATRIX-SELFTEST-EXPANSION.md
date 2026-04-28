# Phase 36D — Verification Matrix and Selftest Expansion

## Purpose

Phase 36D hardens the Phase 36 implementation planning engine before report/diagram work begins.

The goal is to prove that implementation readiness is not cosmetic. The backend now generates a verification matrix tied to exact implementation steps, backend object IDs, source engines, blockers, required evidence, acceptance criteria, and rollback readiness.

## What changed

- Verification checks are now backend-generated per object or flow:
  - device operational-safety gates
  - network interfaces and gateway ownership
  - route intents
  - security flow requirements
  - NAT rules
  - DHCP pools
  - rollback readiness
  - final as-built documentation
- Each verification check now includes:
  - `verificationScope`
  - `sourceEngine`
  - `relatedStepIds`
  - `relatedObjectIds`
  - `requiredEvidence`
  - `acceptanceCriteria`
  - `readiness`
  - `blockingStepIds`
- Implementation summary now exposes:
  - object-level verification count
  - route-level verification count
  - flow-level verification count
  - blocked verification count
  - rollback verification count
- Implementation findings now include a verification-matrix completeness guard:
  - `IMPLEMENTATION_VERIFICATION_MATRIX_INCOMPLETE`

## Why this matters

Before this pass, verification was still too broad. A generic check like "verify routing" can hide broken route intent, missing return path, or a blocked route step.

Phase 36D makes verification concrete:

- route intent checks verify route lookup, next-hop reachability, return path, and conflicts
- security-flow checks verify source zone, destination zone, service, expected action, logging, NAT, and first-match behavior
- NAT checks verify coverage, translation mode, source/destination zones, and accidental over-translation risk
- DHCP checks verify lease, gateway, options, exclusions, and reserved-address protection
- safety checks verify management access, backups, and fallback/rollback access
- rollback checks verify that risky/mutating steps cannot proceed without recovery evidence

## Selftest expansion

The Phase 36 selftest now proves:

- object-level, route-level, flow-level, blocked, and rollback verification counts are generated
- every verification check carries related steps, related objects, required evidence, acceptance criteria, and readiness
- missing route next-hop blocks the route step and the route verification check
- DHCP without matching gateway/interface blocks the DHCP step and check
- missing security policy blocks the security step and check
- upstream routing ERROR findings block affected implementation steps
- valid covered NAT does not remain blocked
- upstream security WARNING findings become review metadata on affected steps

## Boundary rule

The frontend may display this matrix. It must not create browser-side verification logic, dependency logic, safety gates, or implementation readiness.
