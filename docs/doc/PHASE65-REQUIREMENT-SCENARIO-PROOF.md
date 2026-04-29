# Phase 65 — Requirement Scenario Runtime Proof + Direct-Impact Gap Closure

## Purpose

Phase 65 closes the next weakness after Phase 61–64.

Earlier phases made requirements materialize objects, added the requirement registry, attached policy consequences, and created a closure audit. That was necessary, but still not enough. A planner can have traceability and still fail real scenario behavior if a selected requirement does not appear in the actual backend design evidence for that scenario.

Phase 65 adds a stricter backend scenario proof layer.

## What changed

### Backend scenario proof model

Added:

- `backend/src/services/designCore/designCore.requirementsScenarioProof.ts`
- `requirementsScenarioProof` on the backend design-core snapshot
- backend types:
  - `RequirementsScenarioProofSignal`
  - `RequirementsScenarioProofSummary`

The scenario proof reads the saved requirements JSON, the requirement impact closure summary, and the backend network object model. It then checks whether selected high-impact requirement drivers have actual evidence.

### Scenario signals now checked

The proof layer checks selected scenario drivers such as:

- user population → user access segment and addressing evidence
- site count → materialized site scope, and WAN evidence for multi-site scenarios
- guest Wi-Fi → guest segment and guest-to-internal deny flow
- management network → management segment, management interfaces, and scoped admin flow
- remote access → remote-access edge and reviewed internal access path
- cloud/hybrid → cloud-edge segment and reviewed cloud reachability
- voice/phones → voice segment and QoS/call-control review
- printers/IoT/cameras → shared-device isolation and scoped access review
- monitoring/logging/backup/compliance → operations-plane evidence
- dual ISP/resilience/outage tolerance → WAN/transit or routing review evidence
- security/segmentation goal → security zones and policy-flow consequences

### Frontend visibility

The Project Overview traceability area now includes a **Requirement scenario proof** panel showing:

- scenario name
- status
- passed signals
- missing signals
- blocker/review counts
- per-signal evidence and missing evidence

This makes it harder for requirements to be silently ignored.

### Export visibility

Backend report export now includes a **Requirement Traceability and Scenario Proof** section with:

- requirement impact closure table
- requirement scenario proof table

This fixes the export gap where requirement traceability existed in backend/UI but did not have a dedicated report proof section.

## Completion standard

A selected high-impact requirement must now satisfy at least one appropriate evidence path:

- concrete site evidence
- concrete VLAN/segment evidence
- security-flow consequence
- object-model evidence
- route/WAN evidence
- explicit implementation/review evidence where the requirement is not supposed to create a network object by itself

If a selected requirement fails those checks, the scenario proof marks it as blocked or review-required.

## Verification

Static gate:

```bash
npm run check:phase65-requirement-scenario-proof
```

Chained gate:

```bash
npm run check:phase64-requirements-completion-closure
```

Direct source checks performed by the Phase 65 gate:

- scenario proof module exists
- all major high-impact requirement categories are inspected
- backend types expose scenario proof
- backend design-core snapshot returns scenario proof
- frontend snapshot types expose scenario proof
- Project Overview renders scenario proof
- report export includes requirement traceability and scenario proof
- package version is `0.65.0`
- Phase 64 check chains Phase 65

## Remaining truth

This phase does not claim every possible dropdown option has a sophisticated engineering algorithm. Some requirements are correctly handled as review, handoff, report, or implementation evidence.

What Phase 65 does prove is stricter and more useful: selected high-impact scenario requirements now have a backend-visible evidence test. The planner can no longer merely save a requirement and pretend it was used.
