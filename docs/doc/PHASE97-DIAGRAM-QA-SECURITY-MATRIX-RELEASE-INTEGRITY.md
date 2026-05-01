# Phase 97 — Diagram QA, Security Matrix, and Release Package Integrity

Marker: `PHASE_97_DIAGRAM_QA_SECURITY_MATRIX_RELEASE_INTEGRITY`

## Why this phase exists

Phase 96 made the diagram page usable, but the live screenshots still exposed three problems:

1. Security/Boundaries still looked too much like graph spaghetti.
2. Physical/WAN views still carried duplicate WAN/transit anchors and too much empty canvas space.
3. The release package was not self-contained because documented release gates and Render blueprint files were missing.

This phase is intentionally a cleanup/trust pass. It does not add a new engine.

## Diagram fixes

### Security/Boundaries

Security/Boundaries now renders as a policy-matrix style canvas:

- security zones are sorted into stable source rows;
- policies are grouped into allow, review, and deny/isolation lanes;
- connectors use right-angle policy paths instead of curved graph sprawl;
- security badges report zones, policies, relationships, and hidden proof objects instead of misleading site/device counts;
- user-facing canvas copy no longer leaks internal layout-mode strings.

### Physical and WAN/Cloud

Physical and WAN/Cloud views now prune duplicate WAN/transit anchors outside the security matrix view. This removes the floating WAN Transit cloud that made the topology look confused.

The canvas bounds are now cropped around the active topology instead of forcing a huge default right-side whitespace area.

### Logical views

Logical views now draw subtle site lanes behind each site grouping. This makes VLAN/subnet rows read like site cards rather than loose graph nodes.

### Per-site physical detail

Per-site physical remains clean by default, but when addressing/service overlays are enabled it can expose local VLAN/subnet/DHCP detail in a controlled lower row instead of polluting global physical/WAN views.

## release package integrity

Added self-contained release gates that the Phase 96 package was missing:

- `render.yaml`
- `scripts/verify-build.sh`
- `scripts/final-preflight.sh`
- `scripts/deployment-rehearsal.sh`
- `scripts/generate-lockfiles.sh`
- `scripts/check-release-artifacts.cjs`
- `scripts/assert-release-discipline.sh`
- `scripts/check-phase97-diagram-qa-security-matrix-release-integrity.cjs`

Root package version is now `0.97.0`.

Backend health marker now includes:

`PHASE_97_DIAGRAM_QA_SECURITY_MATRIX_RELEASE_INTEGRITY`

## Verification

Static checks expected to pass:

```bash
npm run check:phase97-diagram-qa-security-matrix-release-integrity
npm run check:phase84-97-release
node scripts/check-release-artifacts.cjs
bash scripts/assert-release-discipline.sh
```

Full build proof command:

```bash
bash scripts/verify-build.sh
```

## Still not claimed

This phase does not claim live Render success until Render deploys and `/api/health/live` shows version `0.97.0`.

After deployment, verify these screenshots again:

- Physical / Global
- Physical / Per-site / Site 1 - HQ
- Physical / WAN-Cloud
- Physical / Security-Boundaries
- Logical / Global
- Logical / Per-site / Site 1 - HQ
- Logical / WAN-Cloud
- Logical / Security-Boundaries

If Security/Boundaries still looks like spaghetti after this, the next move is a true table component instead of SVG node-link rendering.
