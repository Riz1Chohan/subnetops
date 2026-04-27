# SubnetOps Final Baseline v436

## What this product is
SubnetOps is a **network planning and logical design engine**.
It is intended to turn saved requirements and design assumptions into a reviewable planning package.
It is **not** the future live discovery/mapping product.

## What stays separate
A future mapping/discovery service may later integrate with SubnetOps, but it should remain a separate product or service boundary.
Its purpose will be to discover current-state evidence, dependencies, and change impact.

## What is solid enough to keep
- Backend CIDR and allocator direction
- Backend design-core direction
- Deterministic proof/self-test direction
- Standards vs best-practice distinction
- SubnetOps planning vs future mapping separation

## What is still provisional
- Full backend single-source authority
- Full proof matrix coverage
- Full standards enforcement
- Full requirement-to-output depth across every planning area

## What should guide future work
When work resumes, favor:
- allocator authority
- proof coverage
- standards-backed enforcement
- output discipline

Avoid drifting back into:
- too many meta summaries
- UI polish before core proof
- mixing planning and discovery into one product
