# SubnetOps v106 Notes

## Main focus
This version extends site identity and device naming so naming becomes more usable in multi-site planning.

## Changes made
- Added optional `buildingLabel` and `floorLabel` to sites across frontend types, site forms, table display, backend validators, and Prisma schema.
- Expanded naming preferences to support building/floor-aware token choices.
- Added `namingHierarchy` and `customNamingPattern` to requirements.
- Added live naming previews showing multi-device sequencing per site:
  - FW01 / FW02
  - SW01 / SW02
  - AP01 / AP02
- Extended naming previews and report/diagram/standards pages to carry building/floor and multi-device naming examples.
- Updated synthesis naming logic so custom naming patterns and building/floor-aware tokens influence generated device names.

## Custom naming placeholders
Supported placeholders in custom patterns:
- `{site}`
- `{siteCode}`
- `{siteName}`
- `{building}`
- `{floor}`
- `{role}`
- `{index}`

Example:
`{site}_{building}_{floor}_{role}_{index}`

## Important note
A real database migration is still required in the deployment environment for the new optional site fields:
- `buildingLabel`
- `floorLabel`
