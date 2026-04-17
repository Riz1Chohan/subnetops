# SubnetOps v105 Notes

## Main additions
- Added a new `namingTokenPreference` requirement input.
- Users can now choose whether device naming should primarily use:
  - site code when available
  - full location / site name
  - automatic fallback behavior
- Added live naming preview tables in:
  - New Project wizard
  - Project Requirements page
- Updated the synthesis naming helper so generated device names now respect both:
  - selected naming convention
  - selected token preference
- Added more explicit naming summary / preview sections in:
  - Report page
  - Diagram page
  - Standards page

## Files updated
- `frontend/src/lib/requirementsProfile.ts`
- `frontend/src/lib/designSynthesis.ts`
- `frontend/src/pages/NewProjectPage.tsx`
- `frontend/src/pages/ProjectRequirementsPage.tsx`
- `frontend/src/pages/ProjectReportPage.tsx`
- `frontend/src/pages/ProjectDiagramPage.tsx`
- `frontend/src/pages/ProjectStandardsPage.tsx`
- `V105_NOTES.md`

## Intent
This version makes device naming a visible design standard instead of a hidden assumption. Users can now see naming outcomes before saving and the report/diagram surfaces now show the same naming logic more explicitly.

## Remaining future improvements
- let users define custom naming tokens and separators
- support floor/building tokens in naming patterns
- preview numbering for multiple devices of the same role per site
- carry naming previews into exported deliverables more explicitly
