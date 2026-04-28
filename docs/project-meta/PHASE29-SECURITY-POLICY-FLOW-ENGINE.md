# Phase 29 — Security Policy and Flow Engine

## Purpose

Phase 29 turns the earlier segmentation intent into a first-class backend security policy and flow model. The goal is not to fake Palo Alto, Cisco, Fortinet, or cloud firewall syntax. The goal is to make security boundaries machine-checkable before implementation-specific translation exists.

## Added engine objects

- `SecurityServiceObject`
- `SecurityFlowRequirement`
- `SecurityPolicyFinding`
- `SecurityPolicyFlowSummary`
- `SecurityPolicyFlowModel`

## What the engine now evaluates

- Source security zone
- Destination security zone
- Expected action: `allow`, `deny`, or `review`
- Observed matching policy action
- Service names
- Matched policy rule coverage
- NAT requirement
- Matched NAT rule coverage
- Missing policy conditions
- Policy conflicts
- Missing NAT conditions
- Broad high-risk permits into trusted zones
- Invalid policy/NAT zone references

## Important boundary

This phase is still vendor-neutral. It does not claim to implement firewall rule order, object groups, logging profiles, application-ID, platform-specific NAT syntax, HA firewall behavior, or policy deployment. Those belong in later implementation phases after the neutral security model is proven.

## Why this matters

Before Phase 29, SubnetOps could say that guest isolation or management isolation was expected. After Phase 29, the backend can represent those expectations as explicit flow requirements and check whether policy and NAT intent cover them.

This makes the design engine harder to fake and gives reports a stronger engineering review surface.

## Human-readable naming rule

All new code uses descriptive network-engineering naming such as `SecurityFlowRequirement`, `SecurityPolicyFinding`, `buildSecurityPolicyFlowModel`, and `securityPolicyFlow`. Placeholder names such as `foo`, `bar`, `baz`, or `xyz` are not acceptable for this engine layer.
