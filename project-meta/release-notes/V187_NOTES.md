# SubnetOps v187 Notes

## Main focus
This version continues the recovery roadmap by strengthening the explicit design engine rather than adding shell-only polish.

## What changed
- Added required flow coverage tracking across major traffic categories.
- Expanded synthesized traffic flow generation to cover more of the recovery roadmap path set.
- Expanded security boundary detail with route-domain anchors, inside/outside relationships, and published services.
- Added validation/readiness penalties for missing required flow coverage, unresolved truth-model links, and heavy inferred route/boundary dependence.
- Surfaced the stronger flow and boundary truth in the core model, routing, security, and report pages.

## Why this matters
The product now does a better job of answering:
- what talks to what
- through which path
- across which boundary
- with which control point
- and where the model is still inferred rather than explicit

## Honest status
v187 is stronger recovery work, but it does **not** mean the recovery roadmap is fully complete yet.
