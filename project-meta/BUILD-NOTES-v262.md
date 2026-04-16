# SubnetOps v262 Build Notes

## Recovery roadmap slice
This pass continues Phase H / I / J of the recovery roadmap.

## Main changes
- Added label-family focus controls to the diagram workspace.
- Users can now isolate annotation families by topology, addressing, zones, transport, or flows.
- Review presets now also set label-focus posture instead of only scope / overlay / density.
- Path annotations now honor label-family focus, so transport labels, addressing labels, and flow labels can be separated instead of competing in one view.
- Site and topology labels now respond more deliberately to the current label-focus posture.

## Validation performed
- File-level TypeScript no-emit check passed on `frontend/src/features/diagram/components/ProjectDiagram.tsx` using local React/JSX stubs.
- No full dependency-backed frontend build was run in this environment.
