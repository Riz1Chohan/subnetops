# Phase 17 - Larger Design-Core Seam Extraction

## Scope
This pass deliberately avoided new product features. It focused on reducing the backend design-core blast radius so future engine work is safer.

## Changes
- Extracted allocation/routing/security/WAN intent summary logic into `backend/src/services/designCore/designCore.intentSummaries.ts`.
- Extracted traceability coverage, brownfield readiness, discovered-state import readiness, implementation readiness, and engine confidence logic into `backend/src/services/designCore/designCore.readinessSummaries.ts`.
- Extracted allocator confidence, truth-state ledger, current-state boundary, allocator determinism, and standards enforcement notes into `backend/src/services/designCore/designCore.confidenceSummaries.ts`.
- Extracted planning input coverage and planning input discipline checks into `backend/src/services/designCore/designCore.planningInputDiscipline.ts`.
- Reduced `backend/src/services/designCore.service.ts` from roughly 83 KB to roughly 46 KB.

## Why this mattered
The design core was becoming a high-risk monster file. This pass gives the backend clearer seams around:

- intent summaries
- readiness summaries
- confidence summaries
- planning-input discipline

That makes future standards, allocator, reporting, and diagram work less fragile.

## Verification note
Static packaging was completed. Full TypeScript build could not be completed in this execution environment because dependency/build commands did not complete reliably here. Run the following locally before treating this as final:

```bash
cd backend
npm ci
npm run prisma:generate
npm run build
npm run engine:selftest:all

cd ../frontend
npm ci
npm run build
```

## Ruthless note
This was a real structural improvement, not UI fluff. The backend core is still not tiny, but it is now much less stupid than keeping everything inside one service file.
