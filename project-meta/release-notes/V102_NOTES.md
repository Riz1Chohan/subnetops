# SubnetOps v102

## Main changes
- tightened validation anchoring in the diagram so site findings are mapped more deterministically to likely edge, switching, wireless, DMZ, management, and path/link review areas
- added stronger primary-site versus attached-site visual cues
- strengthened zone grouping blocks in logical and physical topology views
- expanded DMZ chain visuals to show published-service path plus management-only path where management boundaries exist
- corrected a broken import in `ProjectReportPage.tsx` so the report can render the diagram component again

## Main files changed
- `frontend/src/features/diagram/components/ProjectDiagram.tsx`
- `frontend/src/pages/ProjectReportPage.tsx`

## Notes
This version focuses on the diagram and review surface. It still depends on the existing synthesis outputs underneath, so the next useful step would be improving the engine-to-diagram mapping even further and then tightening build validation across the frontend.
