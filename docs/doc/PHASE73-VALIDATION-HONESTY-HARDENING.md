# Phase 73 — Validation Honesty Hardening

## Purpose

Phase 73 fixes the dangerous validation posture exposed by runtime screenshots and exported report evidence: SubnetOps could report a clean validation state while requirement-selected outputs were missing.

The strict rule for this phase is simple:

> An empty or under-materialized design must not validate as clean just because there are no CIDR rows to check.

## Problem addressed

The requirements stage can capture a large planning profile, including site count, users per site, segmentation intent, guest Wi-Fi, management network, shared devices, wireless, remote access, cloud/hybrid connectivity, WAN posture, monitoring, logging, backup, and operations ownership.

Before this phase, validation mostly checked the correctness of existing rows. That created a severe false positive:

- 10 sites selected, but 0 Site rows could still show clean.
- Users per site selected, but 0 user segments could still show clean.
- Guest/management/cloud/remote/security selections could remain output-empty.
- 0 addressing rows, 0 flows, 0 topology objects, and 0 links could still avoid hard validation blockers.

That is not engineering-grade validation. That is a hollow checklist.

## Backend changes

`backend/src/services/validation.service.ts` now includes a requirements honesty layer that parses the saved `requirementsJson` and compares selected drivers against actual generated evidence:

- saved Site rows
- saved VLAN/segment rows
- design-core addressing rows
- backend network object model devices
- backend network object model interfaces
- backend network object model links
- route intent count
- policy rule count
- security-flow requirement count
- security zones and policy text evidence
- scenario proof status

## New validation blockers

Phase 73 adds explicit blockers/warnings for missing requirement consequences:

- `REQ_SITE_COUNT_NOT_MATERIALIZED`
- `REQ_SITE_COUNT_UNDER_MATERIALIZED`
- `REQ_NO_SEGMENTS_MATERIALIZED`
- `REQ_USER_SEGMENT_MISSING`
- `REQ_GUEST_SEGMENT_MISSING`
- `REQ_MANAGEMENT_SEGMENT_MISSING`
- `REQ_PRINTER_SEGMENT_MISSING`
- `REQ_IOT_SEGMENT_MISSING`
- `REQ_CAMERA_SEGMENT_MISSING`
- `REQ_VOICE_SEGMENT_MISSING`
- `REQ_WIRELESS_SEGMENT_MAPPING_MISSING`
- `REQ_ADDRESS_ROWS_MISSING`
- `REQ_TOPOLOGY_OBJECTS_MISSING`
- `REQ_MULTISITE_LINKS_MISSING`
- `REQ_MULTISITE_ROUTING_MISSING`
- `REQ_REMOTE_ACCESS_CONSEQUENCE_MISSING`
- `REQ_CLOUD_BOUNDARY_MISSING`
- `REQ_SECURITY_FLOWS_MISSING`
- `REQ_OPERATIONS_EVIDENCE_MISSING`
- `REQ_SCENARIO_PROOF_ZERO_PASS`

## Acceptance standard

For the user's failing multi-site scenario, validation must no longer say clean if the generated output remains empty.

A project with selected requirements such as:

- 10 sites
- 50 users per site
- guest Wi-Fi
- management network
- printers/cameras/wireless
- remote access
- cloud/hybrid connectivity
- security and segmentation goal

must produce either:

1. concrete sites, segments, addressing, topology, routing, and policy evidence; or
2. hard validation blockers explaining exactly which requirement consequence is missing.

There is no third option.

## What this phase does not claim

This phase does not claim every materializer gap is fixed. It hardens validation so missing outputs are visible and cannot be hidden behind a fake clean state.

The next phase should focus on report/diagram truth lock and runtime scenario proof after deploy feedback.
