# SubnetOps v74

## Focus
v74 continues the core requirements-to-logical-design shift.

The main goal of this version was to make the addressing result feel like a real engineering output instead of a few generated network values hidden inside overview/report.

## What changed

### 1. New dedicated Addressing Plan workspace
Added a first-class project page for the synthesized addressing result:

- route: `/projects/:projectId/addressing`
- new page: `frontend/src/pages/ProjectAddressingPage.tsx`

This workspace now shows:

- organization block and organization-level capacity
- site summary block hierarchy
- block utilization and headroom
- recommended logical segment model
- design decisions and assumptions
- open issues and risks
- full logical addressing table with placement and utilization context

### 2. Design synthesis engine expanded
Extended `frontend/src/lib/designSynthesis.ts` so SubnetOps produces more reviewable design output from requirements.

New synthesized outputs include:

- organization hierarchy stats
- site hierarchy rows with block capacity / allocated addresses / headroom
- segment model summary across the project
- design decisions / assumptions / risks
- open issue list derived from hierarchy and capacity state

The addressing result now answers more clearly:

- what organization range is being used
- how site blocks are being allocated
- how full each site block is
- which segments are configured vs still proposed
- where capacity pressure or hierarchy problems remain

### 3. Navigation updated
The Addressing Plan page is now a visible workspace item in the project shell.

Files updated:

- `frontend/src/router/index.tsx`
- `frontend/src/layouts/ProjectLayout.tsx`

### 4. Logical Design page updated
The logical design workspace now links directly into the full addressing workspace and treats it as a core output area.

File updated:

- `frontend/src/pages/ProjectOverviewPage.tsx`

### 5. Report page upgraded
The report now includes stronger design-output content, including:

- logical segment model
- design decisions and assumptions
- open issues and risks
- better linkage back to the dedicated Addressing Plan workspace

File updated:

- `frontend/src/pages/ProjectReportPage.tsx`

## Files added
- `frontend/src/pages/ProjectAddressingPage.tsx`

## Files changed
- `frontend/src/lib/designSynthesis.ts`
- `frontend/src/router/index.tsx`
- `frontend/src/layouts/ProjectLayout.tsx`
- `frontend/src/pages/ProjectOverviewPage.tsx`
- `frontend/src/pages/ProjectReportPage.tsx`

## Validation notes
A full installed app build was not available in this environment because the frontend dependencies are not installed here.

However, the v74-touched frontend files were syntax/bundle checked with esbuild:

- `frontend/src/lib/designSynthesis.ts`
- `frontend/src/pages/ProjectAddressingPage.tsx`
- `frontend/src/pages/ProjectOverviewPage.tsx`
- `frontend/src/pages/ProjectReportPage.tsx`
- `frontend/src/layouts/ProjectLayout.tsx`

The router file was also checked indirectly; the bundle run stopped only because of a normal unresolved asset import in the broader app shell, not because of syntax issues in the routing changes.

## Best next move after v74
The strongest next core version would be:

### v75
Continue the design engine itself, especially:

- stronger site-block allocator logic
- better configured-vs-proposed merge behavior
- more realistic role-based segment templates
- WAN / transit / loopback planning
- clearer implementation-ready handoff structure
- deeper requirement-to-design explanation on why each row exists
