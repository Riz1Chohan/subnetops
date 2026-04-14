# SubnetOps v78 Notes

## Theme
Routing & Switching Design Engine Expansion

## What changed

### 1) Dedicated Routing & Switching workspace
- Added a first-class project page at:
  - `/projects/:projectId/routing`
- Added workspace navigation and header links for the new routing/switching stage.

### 2) New synthesized design outputs
The design synthesis layer now generates:
- **routingProtocols**
  - internal routing posture
  - cloud/provider edge posture
  - transport link behavior
  - QoS-aware routed access guidance
- **routePolicies**
  - site summarization intent
  - loopback advertisement intent
  - default-route handling
  - redistribution discipline
  - cloud/edge filtering
  - guest north-south policy where applicable
- **switchingDesign**
  - Layer 2 boundary model
  - loop prevention / STP control-plane guidance
  - uplink resilience guidance
  - first-hop gateway placement guidance
  - role-based access template guidance where applicable
- **qosPlan**
  - voice / real-time traffic treatment
  - infrastructure and shared service treatment
  - standard business traffic treatment
  - guest traffic treatment
- **routingSwitchingReview**
  - critical / warning / info findings for routing and switching readiness

### 3) Logical Design page upgrade
The logical design workspace now includes a stronger routing/switching section covering:
- protocol / transport intent
- switching controls
- route-policy decisions
- QoS treatment
- routing/switching review findings

### 4) Report package upgrade
The report now includes a dedicated routing/switching design section with:
- protocol / transport decisions
- route-policy table
- switching controls summary
- QoS summary
- routing/switching review findings

## Main files changed
- `frontend/src/lib/designSynthesis.ts`
- `frontend/src/pages/ProjectRoutingPage.tsx`
- `frontend/src/router/index.tsx`
- `frontend/src/layouts/ProjectLayout.tsx`
- `frontend/src/pages/ProjectOverviewPage.tsx`
- `frontend/src/pages/ProjectReportPage.tsx`

## Validation performed
- `esbuild` bundle checks passed for:
  - `ProjectRoutingPage.tsx`
  - `ProjectOverviewPage.tsx`
  - `ProjectReportPage.tsx`
  - `ProjectLayout.tsx`
  - `router/index.tsx`
- `esbuild` bundle check also passed for:
  - `frontend/src/lib/designSynthesis.ts`

## What v78 is meant to improve
v78 makes SubnetOps feel less like a rich addressing summary and more like an actual design package by adding the control-plane and access-layer decisions a senior engineer would expect to review before implementation.

## Strongest next move
**v79 = implementation and migration planning engine expansion**
- migration strategy
- cutover sequencing
- rollback structure
- validation/pre-check/post-check plans
- implementation action packs by site/stage
