# Phase 2 — Requirements Materialization Policy

## Purpose

Phase 2 hardens the requirements materialization engine. The rule is simple: no saved requirement is allowed to vanish, and no requirement is allowed to create fake engineering truth.

Every requirement field must land in exactly one declared outcome family:

1. `MATERIALIZED_OBJECT`
2. `ENGINE_INPUT_SIGNAL`
3. `VALIDATION_BLOCKER`
4. `REVIEW_ITEM`
5. `EXPLICIT_NO_OP`
6. `UNSUPPORTED`

This phase does not add routing features, diagram polish, report expansion, or AI behavior. It controls the materialization contract.

## Added backend contract

Source file:

```text
backend/src/services/requirementsMaterialization.policy.ts
```

Contract marker:

```text
PHASE2_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT
```

The policy ledger declares, for every requirement field:

- normalized requirement signal
- expected disposition
- created object types
- updated object types
- backend design-core inputs
- affected engines
- validation impact
- frontend consumers
- report impact
- diagram impact
- no-op reason
- review-required conditions
- confidence

## Materialization service changes

Source file:

```text
backend/src/services/requirementsMaterialization.service.ts
```

The save materializer now returns:

```text
phase2MaterializationPolicy
```

That summary proves:

- total policy row count
- captured field count
- active field count
- materialized object count
- backend input signal count
- validation blocker count
- review item count
- explicit no-op count
- unsupported count
- silent-drop count
- silent-drop keys
- per-field outcomes

## Design-core snapshot changes

The backend design-core snapshot now exposes:

```text
phase2RequirementsMaterialization
```

This makes Phase 2 visible to frontend consumers without requiring frontend inference.

## Frontend changes

The overview traceability area now includes a Phase 2 materialization policy ledger. It shows backend-declared policy status only. It does not invent objects or claim a real circuit, cloud route table, VPN gateway, or brownfield import exists.

## Critical honesty rules

### Guest Wi-Fi

`guestWifi=true` may create/strengthen a Guest segment and DHCP candidate. It must also preserve security isolation and diagram/report consequences as backend-declared evidence.

### Dual ISP

`dualIsp=true` may create a WAN-transit planning/review signal. It must not create fake ISP circuits. It remains review/blocker evidence until WAN circuit inventory and routing/failover evidence exist.

### Cloud / hybrid

Cloud requirements may create cloud-edge intent and review signals. They must not pretend cloud route tables, VPC/VNet attachments, private circuits, or security groups exist.

### Remote access

Remote access may create VPN/remote-access intent and review signals. It must not pretend a real identity provider, MFA policy, or VPN gateway exists.

### Not applicable / disabled fields

Disabled, absent, or not-applicable fields are explicit no-op evidence. They are not silently ignored.

## Acceptance proof

Phase 2 is accepted when:

- all registry requirement fields have a materialization policy
- no active requirement can silently disappear
- save flow returns Phase 2 policy summary
- design-core snapshot exposes Phase 2 policy summary
- frontend can display the ledger without computing engineering truth locally
- Phase 0 and Phase 1 release gates still pass

## Deliberately not done

- no routing protocol upgrade
- no diagram layout changes
- no report rewrite
- no Engine 1/Engine 2 allocator changes
- no AI behavior
- no fake external circuit/cloud/current-state objects

Phase 3 is the correct place to prove closure across downstream consumers after this materialization contract is in place.
