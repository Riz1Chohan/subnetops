# Phase 76 — Requirements Save Field Coverage Proof

## Purpose

Phase 76 addresses the runtime trust problem that requirement selections may be visible in the UI but not proven in the save payload or backend response.

The requirement planner now has an explicit field-coverage proof in the dedicated requirements save path.

## What changed

- `PATCH /api/projects/:projectId/requirements` now returns `requirementsFieldCoverage`.
- The backend compares saved `requirementsJson` keys against the canonical backend requirement registry.
- The response reports:
  - expected field count
  - captured field count
  - captured field keys
  - missing field keys
  - unexpected field keys
  - complete/incomplete status
- The frontend save confirmation now displays captured field coverage next to materialized site/VLAN counts.
- The phase gate cross-checks frontend profile fields, frontend page references, backend registry keys, and save-response coverage wiring.

## Why this matters

The previous failure mode was unacceptable: the user could select many values across the ten requirement cards while later outputs stayed empty or weak. Phase 70 made save trigger materialization, and Phase 71–75 strengthened output consequences and tests. Phase 76 adds proof that the full field set is actually carried through the save boundary.

This is not a final guarantee that every field creates a subnet, route, flow, or device. Some fields are report/review drivers. It is a guarantee that the app can now expose whether the full canonical requirement object was saved and returned as coverage evidence.

## Acceptance standard

A normal requirements save should report `Captured 83/83 requirement field(s) (complete)`.

If it reports incomplete coverage, the UI must not hide that. Missing keys are shown in the save confidence note so the bug is visible immediately.

## Remaining proof boundary

This phase is still source/static proof until Render or local dependency installation proves the full app build and browser runtime. The next deploy must verify the save response in DevTools and in the UI message.
