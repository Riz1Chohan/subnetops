# Phase 96 — Diagram Readability Defaults and Security Matrix

Marker: `PHASE_96_DIAGRAM_READABILITY_DEFAULTS_AND_SECURITY_MATRIX`

Phase 96 is a focused usability hardening pass after Phase 95. It keeps the authoritative render model but makes the canvas behave more like a network planning product instead of a raw graph viewer.

## Changes

- Keeps the canvas first and moves object details below the canvas instead of consuming the right side by default.
- Keeps default overlays clean: device labels remain essential, link notes and detail layers remain opt-in.
- Restricts DHCP/service summary nodes to focused site drawings so global physical and WAN views do not become service clutter.
- Hides subnet-detail nodes in logical mode until addressing/IP detail is explicitly requested.
- Reduces duplicated physical/WAN edges and uses lighter straight transport links to avoid cable-spaghetti.
- Reworks security/boundaries into a policy-map style layout with zone and allow/review/deny columns instead of raw graph sprawl.
- Adds zoom/detail-aware labels so low zoom and essential-label mode stop trying to show every sublabel.
- Keeps old diagram fallback disabled and keeps the stale-layout guard from Phase 94.

## Non-goals

This phase does not claim vendor-specific implementation readiness. Execution remains blocked until management IPs, backups, rollback proof, and vendor-specific change evidence are modeled.
