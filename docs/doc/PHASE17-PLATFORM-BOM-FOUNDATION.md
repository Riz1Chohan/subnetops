# Phase 17 — Platform/BOM Foundation

`PHASE17_PLATFORM_BOM_FOUNDATION_CONTRACT`

Role marker: `BACKEND_CONTROLLED_ADVISORY_BOM_NO_FAKE_SKUS`

Phase 17 moves the Platform & BOM workspace from frontend-only estimates into backend-controlled advisory evidence. It is not a vendor catalog, quote engine, SKU generator, price estimator, exact optics selector, final licensing calculator, or PoE watt-budget authority.

## Acceptance proof

- `designCore.phase17PlatformBomFoundation` exists.
- Every BOM row has source requirements, source objects where available, calculation basis, confidence, readiness impact, and manual review notes.
- Validation, report/PDF/DOCX, CSV export, and `ProjectPlatformBomPage` expose Phase 17 evidence.
- Procurement authority remains `ADVISORY_ONLY_NOT_FINAL_SKU`.

Run:

```bash
npm run check:phase17-platform-bom-foundation
cd backend && npm run engine:selftest:phase17-platform-bom
```
