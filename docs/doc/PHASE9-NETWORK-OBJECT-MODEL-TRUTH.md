# Phase 9 — Network Object Model Truth

Contract marker: `PHASE9_NETWORK_OBJECT_MODEL_TRUTH_CONTRACT`

Phase 9 hardens the network object model so generated topology does not pretend to be discovered or approved infrastructure.

## Required propagation chain

Requirement input → normalized requirement signal → materialized source object OR explicit no-op/review reason → backend design-core input → engine-specific computation → traceability evidence → validation/readiness impact → frontend display → report/export impact → diagram impact where relevant → test/golden scenario proof.

## Object metadata contract

Every generated device, interface, link, route domain, security zone, policy rule, NAT object, DHCP pool, and IP reservation must carry source, requirement lineage, confidence, proof status, implementation readiness, validation impact, frontend display impact, report/export impact, diagram impact, and review reason when not implementation-ready.

## Truth-state rule

No fake topology authority. Inferred, proposed, planned, or review-required objects must stay visibly labelled and must not become implementation-ready unless backed by configured, durable, imported/discovered, or approved evidence.

## Acceptance proof

Run:

```bash
npm run check:phase9-network-object-model
cd backend && npm run engine:selftest:phase9-network-object-model
```
