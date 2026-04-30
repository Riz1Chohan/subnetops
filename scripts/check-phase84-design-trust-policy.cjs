#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`Phase 84 check failed: ${message}`); process.exit(1); } }
const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
assert(runtime.includes('PHASE_84_DESIGN_TRUST_SNAPSHOT_POLICY_RECONCILIATION'), 'runtime marker missing');
assert(runtime.includes('version: "0.87.0"') || runtime.includes('version: "0.86.0"') || runtime.includes('version: "0.84.1"'), 'runtime version missing');
const hooks = read('frontend/src/features/designCore/hooks.ts');
assert(hooks.includes('keepPreviousData') && hooks.includes('placeholderData: keepPreviousData'), 'snapshot hydration does not preserve previous backend data');
const readiness = read('frontend/src/lib/designReadiness.ts');
assert(readiness.includes('hasMaterializedBackendEvidence'), 'design trust score does not detect backend evidence');
assert(readiness.includes('evidenceFloor'), 'design trust score lacks non-zero evidence floor');
assert(readiness.includes('validationWarningPenalty') && readiness.includes('warningPenaltyCap'), 'warnings are not capped separately from blockers');
const vm = read('frontend/src/lib/backendSnapshotViewModel.ts');
assert(vm.includes('primarySiteName: primarySite?.name'), 'topology primary site is not resolved from backend evidence');
assert(vm.includes('internet at each site'), 'breakout evidence does not mention internet at each site');
assert(vm.includes('backendWanLinks') && vm.includes('backendRoutePolicies') && vm.includes('backendConfigurationTemplates'), 'summary metrics do not read deeper backend objects');
assert(!vm.includes('primarySiteName: undefined'), 'topology still hard-codes undefined primary site');
const snapshot = read('frontend/src/lib/designCoreSnapshot.ts');
assert(snapshot.includes('Backend snapshot loading'), 'snapshot unavailable text still presents loading as unavailable');
assert(snapshot.includes('designReviewReadiness') && snapshot.includes('implementationExecutionReadiness'), 'frontend lacks readiness split types');
const backendTypes = read('backend/src/services/designCore.types.ts');
assert(backendTypes.includes('designReviewReadiness: DesignTruthReadiness') && backendTypes.includes('implementationExecutionReadiness: DesignTruthReadiness'), 'backend summary lacks readiness split');
const service = read('backend/src/services/designCore.service.ts');
assert(service.includes('readyForBackendAuthority: designReviewReadiness !== "blocked"'), 'backend authority is still tied to implementation execution blockers');
const policy = read('backend/src/services/designCore/designCore.networkObjectModel.ts');
[
  'policy-deny-guest-to-management',
  'policy-deny-guest-to-iot',
  'policy-deny-guest-to-wan-transit',
  'policy-deny-wan-to-corporate-internal',
  'policy-deny-wan-to-management',
  'policy-deny-wan-to-guest',
  'policy-deny-wan-to-iot',
  'policy-deny-wan-to-wan-transit',
  'policy-deny-dmz-to-internal',
  'policy-deny-dmz-to-management',
  'policy-deny-iot-to-management',
  'policy-deny-wan-transit-to-management',
].forEach((id) => assert(policy.includes(id), `${id} guardrail missing`));
assert(policy.includes('Phase 84 explicit default-deny guardrail'), 'policy guardrails lack Phase 84 marker');
const report = read('backend/src/services/exportDesignCoreReport.service.ts');
assert(report.includes('Design Trust and Policy Reconciliation'), 'report Phase 84 section missing');
const doc = read('docs/doc/PHASE84-DESIGN-TRUST-SNAPSHOT-POLICY-RECONCILIATION.md');
assert(doc.includes('PHASE_84_DESIGN_TRUST_SNAPSHOT_POLICY_RECONCILIATION'), 'Phase 84 doc missing marker');
console.log('Phase 84 design trust, snapshot hydration, and policy reconciliation checks passed.');

process.exit(0);
