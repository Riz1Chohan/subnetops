# SubnetOps v71

## Included in this build

### 1) Diagram realism pass
- Reworked the diagram stage into a more network-topology style SVG surface.
- Added clearer device-like visuals for:
  - perimeter firewall
  - routers / WAN core
  - switches / access layer
  - access points
  - server zones
- Added trust-boundary style zone bands and stronger WAN / cloud placement cues.
- Added architecture signal cards above the diagram so the topology reflects key planning assumptions.

### 2) Validation -> fix navigation
- Validation findings now include a direct link to the right place to fix the issue.
- Site findings can open the matching Site edit flow.
- VLAN findings can open the matching VLAN edit flow.
- Project-level findings can jump to related Requirements sections.

### 3) Direct edit targeting on Sites / VLANs pages
- `?edit=<id>` query support added.
- When a validation finding links into a Site or VLAN, the related edit form opens automatically.

### 4) Requirements anchor support
- Added anchor IDs to major Requirements sections so validation and review links can jump to:
  - scenario fields
  - addressing
  - operations
  - physical
  - apps / WAN
  - implementation
  - readiness / summary

## Modified files
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/src/features/validation/components/ValidationList.tsx`
- `frontend/src/pages/ProjectValidationPage.tsx`
- `frontend/src/pages/ProjectSitesPage.tsx`
- `frontend/src/pages/ProjectVlansPage.tsx`
- `frontend/src/pages/ProjectRequirementsPage.tsx`
- `frontend/src/lib/validationFixLink.ts`
- `frontend/src/styles.css`

## Note on verification
A full npm build was not completed inside this environment because project dependencies are not installed here. The changed files were sanity-checked structurally, and the package is ready for your normal local/deploy build verification cycle.
