# Phase 60 — Deploy Compile Fixes

Phase 60 is a targeted release-proof patch based on the first real Render deployment attempt after the Engine 2 UI edit maturity pass.

## Fixed frontend build failure

Render reported:

```text
src/lib/backendSnapshotViewModel.ts(424,29): error TS2304: Cannot find name 'backendProvidedCapacityOnly'.
```

The frontend backend snapshot view model now reads organization capacity directly from the backend design-core snapshot:

```ts
organizationCapacity: snapshot.organizationBlock?.totalAddresses ?? 0
```

This preserves backend authority and avoids a dead helper reference.

## Fixed backend build failure

Render reported:

```text
src/lib/phase41ScenarioMatrix.selftest.ts(67,29): error TS2345: Argument of type 'string' is not assignable to parameter of type '...'.
```

The Phase 41 scenario expectation type now uses the backend `SecurityZone["zoneRole"]` union instead of broad `string[]`, so selftests remain type-safe when checking expected zone roles.

## Boundary

This phase fixes the two compile failures surfaced by Render. It does not claim full production readiness until a fresh Render backend and frontend deployment both pass.
