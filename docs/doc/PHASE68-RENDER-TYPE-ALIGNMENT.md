# Phase 68 — Render Type Alignment Compile Fix

## Purpose

Phase 68 is a narrow build-proof correction after Render exposed backend TypeScript errors in the Phase 67 package.

This phase does not add product features. It aligns the requirements proof layer with the actual backend design-core model types so Render can compile the backend.

## Fixes

- `designCore.requirementsImpactClosure.ts`
  - Allows `dhcpPools[].vlanId` to be `string | number`, matching the real `DhcpPool` model where `vlanId` is numeric.
  - Accepts real `interfaceRole` and `linkRole` fields while preserving tolerant support for older proof-like field names.

- `designCore.requirementsScenarioProof.ts`
  - Replaces non-existent `NetworkLink.linkType` usage with real `NetworkLink.linkRole`.
  - Replaces non-existent `NetworkInterface.purpose` usage with real `NetworkInterface.interfaceRole`.

- `project.service.ts`
  - Explicitly types `normalizedData` as `Record<string, unknown>`.
  - Reads `requirementsJson` by index access so TypeScript does not narrow the object down to only `organizationId`.

## Proof

Backend TypeScript build was run after the patch:

```bash
cd backend
npm ci --include=dev --ignore-scripts --no-audit --no-fund
npm run build
```

Result:

```text
tsc -p tsconfig.json
passed
```

`prisma generate` was not re-proven in the sandbox because Prisma binary download can fail without external network stability. Render had already shown Prisma generation succeeding before reaching these TypeScript errors, so this phase targets the TypeScript blockers Render reported.

## Scope

This is a compile-fix phase only. Requirement materialization, traceability, closure audit, scenario proof, and report propagation remain the Phase 61–66 product scope.
