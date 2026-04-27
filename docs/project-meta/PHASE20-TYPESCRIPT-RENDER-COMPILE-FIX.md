# Phase 20 - TypeScript Render Compile Fix

Purpose: repair the exact Render TypeScript errors introduced by the design-core refactor.

Fixed:
- Imported `PLANNING_INPUT_AUDIT_ITEMS` as a runtime value in `backend/src/services/designCore.service.ts`.
- Imported `parseJsonMap` in `backend/src/services/designCore/designCore.planningInputDiscipline.ts`.

Notes:
- This phase is intentionally narrow. It does not add product features.
- Render should now move past the previous `PLANNING_INPUT_AUDIT_ITEMS` and `parseJsonMap` compile errors.
