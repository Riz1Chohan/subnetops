# BUILD NOTES v244

## Main recovery slice in this pass
This pass stays on the recovery roadmap and focuses on the later diagram/UX cleanup items rather than jumping into the master roadmap.

## What changed
- Added **guided vs expanded workspace density** in the Diagram workspace.
  - Guided mode keeps critical review controls and core evidence first.
  - Expanded mode exposes the wider support panels.
- Added **label discipline controls**:
  - Essential labels
  - Detailed labels
- Added **link annotation controls**:
  - Minimal link notes
  - Full link notes
- Updated guided review presets so they now also push sensible workspace posture:
  - density
  - label mode
  - link annotation mode
- Wired label and link controls into both logical and physical diagram rendering so the SVG itself changes, not just the surrounding notes.
- Hid some lower-value support panels by default unless the user explicitly switches to Expanded mode.

## Why this matters for recovery
This directly supports the recovery roadmap goals around:
- reducing equal-weight panel clutter
- improving visual hierarchy
- making interactions feel more intentional
- pushing the diagram workspace closer to a real engineering review surface rather than one long stacked page

## Validation
- Ran a direct TypeScript check on the edited diagram component using local JSX/react stubs.
- This was still not a full dependency-backed app build in this environment.
