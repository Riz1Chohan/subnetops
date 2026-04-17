# SubnetOps v355

This pass fixes the diagram canvas staying empty when the project shell shows multi-site counts but the dedicated site or VLAN query returns an empty list.

## What was happening
- the project header and workflow shell could still show synthesized counts such as site totals derived from requirements/design synthesis
- the diagram canvas itself only rendered from concrete `sites` and `vlans` arrays
- if those arrays came back empty, the diagram component dropped into the blank "Add sites and VLANs" state even though the broader project clearly implied a multi-site design

## Fix
- added a seed synthesis step in `ProjectDiagramPage.tsx`
- when concrete sites are missing, the page now builds fallback site objects from synthesized site summaries
- when concrete VLAN rows are missing, the page now builds fallback VLAN objects from synthesized addressing plan rows
- refreshed the prebuilt frontend bundle so the current static deploy model includes the fix immediately

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/dist/assets/index-CkjV0CsH.js`
- `project-meta/BUILD-NOTES-v355.md`
