# SubnetOps v107

## Main fixes included
- Fixed the specific TypeScript compile errors reported from Render:
  - replaced `requirements.wirelessRequired` with the existing requirements flags
  - passed the required v93+ synthesis objects into `buildHighLevelDesign`
  - passed the required v93+ synthesis objects into `buildLowLevelDesign`
  - expanded `buildLowLevelDesign` input typing so it matches the newer synthesis model

## Naming-convention completion work
- Added closet-aware naming preview support via `{closet}` placeholder
- Extended preview examples to include router, wireless controller, and server roles
- Added closet and additional role previews into the naming preview tables across the app

## Honest note
- The exact Render errors you pasted were fixed in the codebase for this package.
- A full local frontend build still cannot be proven in this container because the local environment does not have the full installed React/Vite dependency tree available, so broader dependency-resolution errors here are environment-related rather than the same typed synthesis errors from Render.
