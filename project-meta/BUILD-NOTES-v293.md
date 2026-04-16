# SubnetOps v293 build notes

## Purpose
Fix the Render frontend TypeScript build failure from v292.

## Fix applied
- `frontend/src/layouts/ProjectLayout.tsx`
- Replaced the invalid severity comparison `item.severity !== "next"` with `item.severity !== "secondary"`.

## Reason
`workflowReview.actionQueue` items only support these severities:
- `primary`
- `warning`
- `secondary`

So comparing against `next` caused Render to fail with TS2367.
