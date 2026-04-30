# Phase 75 — Golden Scenario Runtime Tests

## Purpose

Phase 75 is a regression-proofing phase for the requirements failure discovered through the real UI: requirement cards were filled out, but the generated project still showed 0 sites, 0 VLAN/addressing rows, 0 flows, and a report/diagram built around empty data.

This phase does not add shiny product features. It adds a runtime selftest that proves selected requirement scenarios create concrete backend evidence.

## What Phase 75 adds

Phase 75 adds `backend/src/services/requirementsGoldenScenarios.selftest.ts` and wires it as:

```bash
cd backend
npm run engine:selftest:phase75-golden-requirements
```

The selftest uses an in-memory transaction adapter and runs the real requirements materializer plus design-core snapshot builder. It does not rely on Prisma writes, seeded demo data, or UI screenshots.

## Golden scenarios covered

The runtime selftest covers eight scenarios:

1. Single-site small office
2. 10-site multi-site business
3. Security/segmentation-heavy design
4. Guest and wireless design
5. Remote access plus cloud/hybrid design
6. Voice/printer/IoT/camera-heavy design
7. Dual ISP and resilience design
8. Brownfield/existing upgrade scenario

## Assertions

Each scenario asserts that requirements do not stop as form data. The test checks for concrete consequences:

- required Site rows are created
- VLAN/segment rows are created
- CIDR/gateway data exists on VLAN rows
- design-core addressing rows follow the materialized VLANs
- topology devices/interfaces/links are generated
- security-flow requirements are generated where security/cloud/guest/remote/shared-device drivers were selected
- route intents exist for multi-site/WAN/resilience scenarios
- requirement scenario proof never regresses to 0 passed signals

## Why this matters

The earlier failure mode was dangerous because static checks could pass while runtime output remained empty. Phase 75 makes that failure harder to reintroduce.

If a future change breaks materialization, addressing, policy-flow generation, topology modeling, or scenario proof, the golden selftest should fail before deployment.

## Boundary

Phase 75 does not claim browser UI proof by itself. It proves the backend runtime relationship:

```text
requirements JSON → materializer → Sites/VLANs/CIDR/gateways → design-core → topology/flows/route intents/scenario proof
```

The real UI still needs deployment testing after this package, but the backend now has a repeatable scenario regression gate for the exact relationship that failed.
