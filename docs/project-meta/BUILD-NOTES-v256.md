# BUILD NOTES — v256

## Recovery-roadmap slice completed in this pass
This pass continues Phase J recovery work by pushing the diagram workspace further toward topology-specific rendering instead of relying only on overlays and general review helpers.

## What changed
- Added a topology-specific behavior summary tied to the current scope and synthesized topology.
- Added a new **Topology-specific posture ledger** that shows, per in-scope site:
  - breakout posture
  - routing posture
  - transport posture
  - major anchors
- Surfaced the topology-specific rendering check directly in the main diagram note cards so the workspace stays aligned to the selected topology, not just the current overlay.

## Why this matters
The recovery roadmap requires topology-specific output changes. This pass makes the diagram stage more explicit about how each site should actually behave in hub-and-spoke, collapsed-core, hybrid-cloud, or routed multi-site scenarios.

## Files changed
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- project-meta/BUILD-NOTES-v256.md

## Validation
- Direct TypeScript transpile parse passed for the edited diagram component.
- This was not a full dependency-backed frontend build in this environment.
