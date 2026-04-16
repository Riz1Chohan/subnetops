# SubnetOps v194 Notes

## Main focus
This combined recovery pass pushes two later roadmap needs together:
- stronger truth-model authority visibility
- broader workflow / interaction cleanup so the app stops treating every control as equally important

## What changed

### 1. Recovery focus plan
Added a shared recovery-focus helper that turns current recovery blockers into:
- a primary action
- supporting actions
- deferred actions
- recovery signals that explain why the current focus still matters

### 2. Per-site authority status
The unified design model now gives every site:
- `authorityStatus`
- `authorityNotes`

This lets the app show whether each site is really standing on strong route, boundary, placement, and flow support.

### 3. Project shell cleanup
The project layout now:
- shows a recovery-focus panel in the sidebar
- uses a stronger focus summary in the stage strip
- surfaces the primary recovery action directly in the top workflow controls

### 4. Design workspace cleanup
Updated these pages to consume the new focus logic:
- `ProjectOverviewPage.tsx`
- `ProjectCoreModelPage.tsx`
- `ProjectValidationPage.tsx`

### 5. Core-model coverage improvement
The truth-model coverage checks now include:
- per-site authority consistency

## Files changed
- `frontend/src/lib/designTruthModel.ts`
- `frontend/src/lib/recoveryFocus.ts`
- `frontend/src/layouts/ProjectLayout.tsx`
- `frontend/src/pages/ProjectOverviewPage.tsx`
- `frontend/src/pages/ProjectCoreModelPage.tsx`
- `frontend/src/pages/ProjectValidationPage.tsx`
- `frontend/src/styles.css`

## Validation note
Changed files passed an isolated TypeScript syntax pass with local stubs in this environment. This is not the same as a full frontend dependency-backed production build.
