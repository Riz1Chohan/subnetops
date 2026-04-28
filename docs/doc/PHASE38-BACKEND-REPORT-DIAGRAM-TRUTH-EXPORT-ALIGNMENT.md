# Phase 38 — Backend Report/Diagram Truth + Export Alignment

## Goal
Move report and diagram truth closer to the backend authoritative design core, instead of leaving the frontend to interpret backend objects and quietly shape execution/readiness truth.

## What changed

### Backend report truth model
Added `backend/src/services/designCore/designCore.reportDiagramTruth.ts`.

The backend now builds `reportTruth` inside the design core snapshot with:
- overall readiness
- routing/security/NAT/implementation readiness
- blocking and review findings
- prioritized implementation review queue
- verification coverage
- rollback actions
- proof limitations

### Backend diagram truth model
The backend now builds `diagramTruth` inside the design core snapshot with:
- topology object counts
- modeled-topology state
- overlay summaries for addressing, routing, security, NAT, implementation, verification, and operational safety
- diagram hotspots
- backend diagram nodes/edges for future thinner frontend rendering

### Frontend consumer alignment
`frontend/src/lib/reportDiagramTruth.ts` now prefers backend `reportTruth` and `diagramTruth` when available. The fallback logic remains only for compatibility with older snapshots.

Updated pages:
- `ProjectReportPage.tsx`
- `ProjectDiagramPage.tsx`

### Export alignment
`backend/src/services/exportDesignCoreReport.service.ts` now includes Phase 38 backend truth tables so export output is not weaker than the report/diagram workspace.

### Static release gates
Added:
- `scripts/check-report-diagram-truth.cjs`
- `scripts/check-backend-report-diagram-truth.cjs`

Both are wired into root verification.

## Why it matters
Phase 37 made the pages more honest. Phase 38 makes the architecture more correct:

Backend decides truth. Frontend renders truth. Export preserves truth. Diagram visualizes truth.

## Verification performed in this package
Passed:
- `node scripts/check-report-diagram-truth.cjs`
- `node scripts/check-backend-report-diagram-truth.cjs`
- `node scripts/check-release-artifacts.cjs`
- `bash scripts/assert-release-discipline.sh`
- `node scripts/check-frontend-authority.cjs`
- `node scripts/check-implementation-planning-engine-upgrade.cjs`
- `node scripts/check-routing-engine-upgrade.cjs`
- `node scripts/check-security-policy-engine-upgrade.cjs`
- `node scripts/check-production-readiness.cjs`
- `node scripts/check-design-core-modularity.cjs`
- `node scripts/check-frontend-engine-modularity.cjs`
- `node scripts/check-engine-test-matrix.cjs`
- `node scripts/check-behavioral-test-matrix.cjs`
- `node scripts/check-product-realism.cjs`
- `node scripts/check-final-trust-cleanup.cjs`
- `node scripts/check-security-hardening.cjs`
- backend `tsc --noEmit`

Frontend `npm run build` passed TypeScript and reached Vite bundling in this sandbox, but the command timed out during Vite transform. Treat Render/GitHub as the final bundling proof gate.

## Remaining gap
The diagram renderer still uses the existing frontend display canvas. The backend now exposes diagram truth nodes/edges, but a later phase should thin the actual SVG renderer so it directly renders backend diagram truth primitives instead of relying on older display synthesis shapes.
