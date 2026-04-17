# V184 Render Fix v3

- Fixed remaining undefined `mode` reference in LogicalTopologyDiagram by making the badge explicit for that logical-only view.
- Fixed WAN adjacency control-point rendering to use available endpoint IP fields on `WanLinkPlanRow` instead of non-existent interface fields.
