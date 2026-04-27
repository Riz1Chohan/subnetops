# SubnetOps v218 build notes

## Recovery pass focus
- Added a workflow-recovery layer that scores the five major workspace stages directly inside the shell.
- Added an action queue so the strongest current engineering move is visible without letting every control compete equally.
- Strengthened site-by-site LLD/report grounding by surfacing site authority status, strongest authority source, named boundaries, named services, tracked flows, and site-specific trust debt.
- Fixed the inferred-source switch case bug in the authority ledger.

## Why this pass matters
This pass pushes further into recovery roadmap Phase H / I while also tightening Phase G. The app now does a better job of showing:
- where the user is,
- which stages are weak,
- what should be fixed next,
- and whether a site-level LLD entry is actually backed by stronger truth.
