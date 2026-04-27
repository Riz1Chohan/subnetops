# Phase 16 — Standards Alignment Seam

## What changed

This pass continues the design-core cleanup without adding product bloat.

- Extracted standards-alignment evaluation out of `backend/src/services/designCore.service.ts`.
- Added `backend/src/services/designCore/designCore.standardsAlignment.ts` as a dedicated seam for rulebook evaluation.
- Updated `scripts/check-design-core-modularity.cjs` so the standards seam is required and cannot silently regress back into the main service.
- Tightened the design-core size guard from 100 KB to 90 KB.

## Why this matters

The standards logic is one of the highest-risk parts of SubnetOps because overclaiming standards compliance would make the product look amateur. Keeping standards evaluation isolated makes it easier to audit, test, and eventually separate hard standards from best practices and advisory guidance.

## Ruthless note

This is still not enough. `designCore.service.ts` is smaller now, but it remains too large. The next useful seam should be planning-input discipline or implementation readiness, not another UI feature.

## Verification performed

- Ran `node scripts/check-design-core-modularity.cjs` successfully.

Full TypeScript build was not completed in this environment because dependency installation/tooling execution timed out. Run the normal backend and frontend build commands locally before deploying.
