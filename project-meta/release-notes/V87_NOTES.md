# V87 — Audit + Hardening + Export Upgrade

## Core fixes in this release

### Project create/save reliability
- Fixed the requirements planner save/create failure caused by oversized generated descriptions being sent into the short `description` field.
- Added a short summary description path for projects while keeping the full planning narrative in requirements data.
- Increased backend description validation tolerance and improved frontend description handling.

### Better backend validation errors
- Added explicit `ZodError` handling in the backend error handler.
- Validation failures now return useful 400 messages instead of falling through as fake 500 “Internal server error” responses.

### Auth hardening
- Register now accepts blank full name cleanly instead of failing validation.
- Login screen no longer forces demo credentials by default.
- Added a more visible demo-fill action and a clearer forgot-password path on login.
- Change-password failures now benefit from the improved backend validation error handling.

### Validation workflow trust fixes
- Validation results now refetch more aggressively on mount/focus.
- “Suggest fix” flow now resets previous state, shows explicit loading/error feedback, and scrolls the insight panel into view after a suggestion request.

### Report/export upgrade
- Rebuilt backend PDF export so it is no longer the old shallow two-page export.
- PDF now includes:
  - project summary
  - requirements snapshot
  - discovery/current-state highlights
  - high-level design intent
  - detailed site/addressing plan
  - security/segmentation summary
  - platform/BOM foundation summary
  - validation review
  - recent project activity
- CSV export now includes a broader package-oriented data set instead of only a flat VLAN table.

## Important notes
- Full project delete remains available from dashboard cards and project settings.
- Requirements workflow continues to support the existing custom-notes area, while this release focuses mainly on save reliability and audit fixes.

## Validation performed here
- TypeScript transpile/syntax checks passed for all changed frontend/backend files in this release.
- Full installed app build was not run in this environment.
