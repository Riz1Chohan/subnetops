# SubnetOps v103

## Main focus
- Push exact device, boundary, and flow naming into the synthesis layer.
- Make the diagram and report reference the same names.
- Improve branch-site device stack readability so attached sites look less like generic copies.

## Main changes
- Added exact synthesized naming for placed devices (`deviceName`, `siteTier`, `uplinkTarget`).
- Added synthesized boundary naming (`boundaryName`).
- Added synthesized flow labels (`flowLabel`).
- Updated diagram overlays and device labels to use synthesized names instead of mostly UI-side generic labels.
- Updated physical/site view labels to use the same synthesized device names and uplink context.
- Updated report topology placement table, boundary section, and traffic-flow section to use the same names the diagram now shows.

## Intent
This version is meant to tighten cross-stage consistency:
- diagram names
- report names
- placement names
- boundary names
- traffic-path labels

The goal is to reduce the feeling that the diagram, report, and engine are each speaking a slightly different language.
