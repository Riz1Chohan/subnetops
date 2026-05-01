# Phase 92 — Diagram View Separation and Layout Intelligence

Runtime marker: `PHASE_92_DIAGRAM_VIEW_SEPARATION_LAYOUT_INTELLIGENCE`

Phase 92 fixes the regression found after Phase 91: the canvas skin was restored, but physical topology still allowed security-zone, policy, NAT, and internal model objects to pollute the physical view.

## What changed

- Physical view now stays focused on sites, network devices, WAN/Internet edge, site-to-device ownership, hub/spoke links, and optional DHCP summaries.
- Services overlay is treated as a summary layer. It no longer drags security zones and policy diamonds into physical topology.
- Security and flow objects are shown only in Security / Boundaries or when security/flow overlays explicitly ask for them.
- The toolbar site count now uses authoritative render-model site groups instead of shallow frontend site records, preventing the “3 sites” badge when the design model has 10 materialized sites.
- Sidebar notes now sanitize internal wording such as phase labels and backend/design-core language.
- Inactive voice zones with no subnet/VLAN evidence are filtered out of the professional render model.
- Render model layout marker is advanced to `professional-view-separated-layout`.

## Why this was needed

A graph canvas is not the same thing as a network diagram. The previous renderer still mixed object-model proof, policies, zones, and physical devices in the same view. That made the diagram look like spaghetti even though the data was improving.

Phase 92 enforces audience separation:

- Physical: infrastructure topology.
- Logical: routing/addressing relationship.
- Boundaries: security zones, policy intent, and trust model.
- Overlays: optional evidence layers, not permanent clutter.

## Verification

Run:

```bash
npm run check:phase92-diagram-view-separation-layout-intelligence
npm run check:phase84-92-release
```

This is still a static release check. Full Render deploy and browser screenshot review remain the final proof for visual quality.
