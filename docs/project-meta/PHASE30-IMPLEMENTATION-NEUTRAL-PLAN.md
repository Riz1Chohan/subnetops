# Phase 30 — Implementation-Neutral Plan Generator

Phase 30 adds an implementation-neutral planning layer to the backend design core. The purpose is not to generate Cisco, Palo Alto, Fortinet, Aruba, Juniper, cloud, or Linux commands yet. The purpose is to convert the authoritative object graph, route intent, segmentation model, security-flow model, NAT intent, and DHCP pools into an ordered engineering plan that can later be translated into platform-specific work.

## What this phase adds

- `ImplementationPlanModel`
- `ImplementationPlanStage`
- `ImplementationPlanStep`
- `ImplementationPlanVerificationCheck`
- `ImplementationPlanRollbackAction`
- `ImplementationPlanFinding`
- implementation-plan counts in the authoritative snapshot summary
- implementation-stage and implementation-step nodes in the design graph
- report/export sections for implementation stages, steps, checks, rollback, and findings
- design-core self-tests for Phase 30

## Why this matters

Before Phase 30, SubnetOps could model addressing, graph relationships, route intent, segmentation expectations, security flows, and NAT coverage. That was still not enough to explain how a network engineer would safely execute the design.

After Phase 30, the backend can produce a neutral implementation package:

1. review authoritative design findings
2. configure or confirm VLAN gateways and routed interfaces
3. configure or confirm DHCP pools
4. apply or verify route intent
5. implement or verify security flows
6. configure or confirm NAT intent
7. perform verification checks
8. prepare rollback actions

This is the correct foundation before vendor-specific config generation. Jumping directly to device syntax before this layer would create brittle output and hide risk.

## Scope boundaries

Phase 30 intentionally does not:

- generate vendor commands
- simulate OSPF, BGP, SD-WAN, or firewall rule-order behavior
- claim that proposed tasks are safe to deploy without engineer review
- auto-apply any change to a live device
- replace a production change-control process

## Naming discipline

The implementation layer uses explicit engineering names such as `ImplementationPlanStep`, `ImplementationPlanVerificationCheck`, `ImplementationPlanRollbackAction`, and `buildImplementationPlanModel`. Vague placeholder naming is not acceptable in this engine layer.

## Engineering value

This phase moves SubnetOps from “the design model knows what should exist” toward “the design model can explain how the work should be sequenced, verified, and rolled back.” That is a real production-readiness improvement, but still vendor-neutral and review-required.
