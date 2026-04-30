# Phase 80 — Validation Reconciliation and Diagram Usability Fix

Phase 80 builds on Phase 79. Phase 79 fixed the zero-output failure by materializing durable Site/VLAN/addressing/topology evidence from saved requirements. Phase 80 fixes the next problem exposed by runtime testing: validation/report detail and diagram defaults still behaved as if the old empty design were authoritative.

## Runtime truth addressed

The deployed Phase 79 report shows requirement materialization now works: 10 materialized sites, 10 requirement-selected sites, 110 addressing rows, and 0 requirement-output gaps. However, the validation appendix still contained stale saved findings that said no Site rows, no VLAN rows, no user segment, no guest segment, no management segment, and related materialization failures. That contradiction is not acceptable.

## Changes

- Validation reads now call `ensureRequirementsMaterializedForRead(projectId, "SubnetOps validation", "validation-read")` before loading project evidence.
- `GET /api/validation/projects/:projectId` now returns live reconciled validation by rerunning `runValidation(projectId)` instead of blindly returning stale persisted rows.
- Report export now runs validation after read-repair and before fetching export data, so Appendix B reflects the current repaired Sites/VLANs/addressing evidence.
- Routing reachability now understands hub-transit branch-to-branch proof. A branch-to-branch path can be satisfied through the selected hub when source-to-hub, hub-to-destination, destination-to-hub, and hub-to-source route legs exist.
- Backend runtime health marker is now `PHASE_80_VALIDATION_DIAGRAM_RECONCILIATION`.
- Diagram canvas defaults now filter backend proof nodes. DHCP pools, implementation steps, verification checks, and deep proof graph nodes are hidden by default unless an overlay asks for them.

## Expected behavior after deployment

- Backend health should show Phase 80.
- Exported report should still show 10 materialized sites and 110 addressing rows for the tested 10-site scenario.
- Validation should no longer list stale materialization blockers claiming 0 Site rows or 0 VLAN rows when repaired rows exist.
- Diagram should open to a usable topology-oriented subset instead of dumping all DHCP/implementation/verification proof nodes into the main canvas.
- Remaining blockers should be real remaining design blockers: operational safety, explicit policy gaps, DHCP scope detail, or true routing gaps, not stale materialization failures.

## Non-goals

- No report polish.
- No fake readiness language.
- No frontend rewrite.
- No vendor command generation.
- No claim that the plan is implementation-ready.
