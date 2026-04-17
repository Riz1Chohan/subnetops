# SubnetOps v342

This pass pushes the main diagram canvas further into a real topology stage and removes the fixed-height behavior that would have constrained larger enterprise designs.

## Added / changed
- physical topology canvas height now grows from the rendered enterprise layout instead of staying fixed
- branch rows can extend downward without clipping the lower diagram area
- critical flow lane now moves below the site fabric when enabled, preventing overlap on larger layouts
- diagram viewport no longer uses a fixed max-height screen cap
- diagram viewport minimum height is now calculated from the current scope / site count / flow state on the page
- main SVG now includes architecture blueprint chips for sites, VLANs, topology model, and service count
- canvas guidance text now explicitly reflects auto-growing enterprise layouts

## Files changed
- frontend/src/features/diagram/components/ProjectDiagram.tsx
- frontend/src/pages/ProjectDiagramPage.tsx
- frontend/src/styles.css

## Validation
- frontend build completed successfully with `npm run build`

## Notes
- This pass focuses on making the large canvas feel more like the real diagram surface and less like a fixed preview box.
- Next pass can continue deeper diagram realism: stronger site device conventions, more enterprise-grade topology polish, and any remaining report navigation cleanup if needed.
