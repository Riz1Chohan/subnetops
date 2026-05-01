# Phase 94 — Diagram Usability and Stale Layout Cleanup

Marker: `PHASE_94_DIAGRAM_USABILITY_STALE_LAYOUT_CLEANUP`

Phase 94 fixes the next visible diagram regressions after Phase 93 and adds a stale-layout guard so the old diagram renderer cannot quietly reappear in the active diagram workspace.

## What changed

- The canvas is now the first visible workspace; the truth/readiness panel is collapsed below the canvas.
- The old `ProjectDiagram` fallback path is disabled from `ProjectDiagramPage`.
- If the authoritative render model is missing, the page now shows a clear stale-render warning instead of rendering the old diagram.
- Physical view hides route-domain objects because route domains are logical control-plane evidence, not physical equipment.
- WAN/Cloud view is kept to site, gateway/device, and WAN edge objects instead of drawing route-domain/debug graph objects.
- Physical global layout is tightened around a hub/WAN/branch fan-out.
- Per-site physical and logical layouts keep the selected site as the center of the drawing.
- DHCP summaries are controlled by explicit addressing/services overlays.
- Edge labels are suppressed for noisy physical and WAN views unless the mode/scope is appropriate.
- Sidebar defaults to a canvas summary until the user selects an object.
- Static check now verifies stale layout cleanup and blocks the old fallback path from shipping.

## Still not solved

- Full browser runtime and Render deployment still have to be proven after deployment.
- The icon family is still vendor-neutral; Cisco-owned icon art is not embedded.
- Security/Boundaries can still be improved later into a true matrix-style policy view.
