# SubnetOps v354

This pass fixes the live diagram canvas using the wrong site/VLAN source when the dedicated diagram queries return an empty array even though the loaded project detail already contains populated sites and VLANs.

## Root cause
The diagram page used nullish coalescing:
- `sitesQuery.data ?? project?.sites ?? []`
- `vlansQuery.data ?? []`

That meant an empty array from the site/VLAN query won over the populated project detail, so the canvas behaved like the project had zero sites and zero VLANs.

## Fix
- prefer the richer project detail site list whenever it has more sites than the dedicated sites query
- fall back to VLANs already embedded under `project.sites` when the dedicated VLAN query comes back empty
- keep the rest of the diagram/canvas work intact

## Files changed
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/dist/assets/index-CkjV0CsH.js`
- `project-meta/BUILD-NOTES-v354.md`
