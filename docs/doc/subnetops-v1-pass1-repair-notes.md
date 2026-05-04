# SubnetOps V1 Pass 1 Repair Notes

Scope: build/truth-gate repair only. This pass intentionally does not include the broader Pass 2 network-engineer trust/validation improvements.

Changes:
- Root release gate now runs real backend Prisma generation, backend TypeScript build, and frontend production build before the custom V1 proof scripts.
- Existing V1 custom proof scripts moved under `check:quality`; `check:v1` now runs `check:build` first.
- Durable enterprise IPAM truth-source labels were normalized from `ENGINE2_DURABLE` to `DURABLE_IPAM` where the shared `DesignTruthSourceType` contract expects it.
- `ENGINE2_DURABLE_CANDIDATE` and `ENGINE2_DURABLE_AUTHORITY` state/authority labels were preserved because they are distinct workflow states, not generic truth-source labels.
- Backend production TypeScript build now excludes `*.selftest.ts`; selftests remain runnable through their explicit npm scripts.
- Backend build script no longer uses `--listEmittedFiles`.
- The implementation-plan bridge in `designCore.networkObjectModel.ts` now explicitly casts the full backend model into the implementation domain's narrower facade.
- Starter template subnet/gateway mismatches were fixed so gateways live inside their declared subnet CIDRs.

Validation performed in the repair session before packaging:
- Backend TypeScript build passed after these changes.
- Frontend TypeScript/Vite production build passed after these changes.

Known Pass 2 work:
- Tighten write-time CIDR/gateway validation or add explicit invalid-draft state.
- Add golden scenario tests across requirements → materialization → IPAM → validation → diagram → report/export.
- Prove reports and diagrams never claim readiness beyond backend validation evidence.
