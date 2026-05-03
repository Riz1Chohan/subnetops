#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`[phase5] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const root = process.cwd();
const files = {
  phase5: 'backend/src/services/designCore/designCore.phase5EnterpriseIpamTruthControl.ts',
  enterpriseAllocator: 'backend/src/lib/enterpriseAddressAllocator.ts',
  enterpriseService: 'backend/src/services/enterpriseIpam.service.ts',
  selftest: 'backend/src/lib/phase5EnterpriseIpam.selftest.ts',
  types: 'backend/src/services/designCore.types.ts',
  service: 'backend/src/services/designCore.service.ts',
  validation: 'backend/src/services/validation.service.ts',
  frontendTypes: 'frontend/src/lib/designCoreSnapshot.ts',
  overview: 'frontend/src/pages/ProjectOverviewPage.tsx',
  report: 'backend/src/services/exportDesignCoreReport.service.ts',
  csvExport: 'backend/src/services/export.service.ts',
  phase0: 'backend/src/lib/phase0EngineInventory.ts',
  doc: 'docs/doc/PHASE5-ENTERPRISE-IPAM-DURABLE-ALLOCATION-WORKFLOW.md',
  rootPkg: 'package.json',
  backendPkg: 'backend/package.json',
};

const read = (rel) => {
  const abs = path.join(root, rel);
  assert(fs.existsSync(abs), `${rel} missing`);
  return fs.readFileSync(abs, 'utf8');
};

const contents = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));
const rootPkg = JSON.parse(contents.rootPkg);
const backendPkg = JSON.parse(contents.backendPkg);
const contract = 'PHASE5_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW';

for (const [name, content] of Object.entries({
  phase5: contents.phase5,
  selftest: contents.selftest,
  types: contents.types,
  service: contents.service,
  frontendTypes: contents.frontendTypes,
  overview: contents.overview,
  report: contents.report,
  csvExport: contents.csvExport,
  doc: contents.doc,
})) {
  assert(content.includes(contract) || (name === 'overview' && content.includes('Phase 5 Enterprise IPAM durable authority')), `${name} missing Phase 5 contract/display marker`);
}

const requiredTypeMarkers = [
  'Phase5IpamReadinessImpact',
  'Phase5IpamReconciliationState',
  'Phase5EnterpriseIpamReconciliationRow',
  'Phase5EnterpriseIpamRequirementMatrixRow',
  'Phase5EnterpriseIpamConflictRow',
  'Phase5EnterpriseIpamTruthControlSummary',
  'phase5EnterpriseIpamTruth',
  'ENGINE1_PROPOSAL_ONLY',
  'ENGINE2_DURABLE_CANDIDATE',
  'ENGINE2_APPROVED_ALLOCATION',
  'ENGINE2_STALE_ALLOCATION_REVIEW',
  'ENGINE2_CONFLICT_REVIEW_BLOCKER',
];
for (const marker of requiredTypeMarkers) {
  assert(contents.types.includes(marker), `backend types missing ${marker}`);
  assert(contents.frontendTypes.includes(marker), `frontend types missing ${marker}`);
  assert(contents.phase5.includes(marker), `Phase 5 builder missing ${marker}`);
}

const requiredBuilderMarkers = [
  'buildPhase5EnterpriseIpamTruthControl',
  'engine1Role',
  'engine2Role',
  'designCoreRole',
  'currentInputHash',
  'approvedHashMatches',
  'matchingDhcpScopes',
  'matchingReservations',
  'buildRequirementMatrix',
  'conflictRows',
  'No requirement can create a pretty subnet row while Engine 2 says',
  'Dual ISP and cloud/hybrid requirements create review pressure only',
];
for (const marker of requiredBuilderMarkers) assert(contents.phase5.includes(marker), `Phase 5 builder missing ${marker}`);

const requirementKeys = [
  'usersPerSite',
  'siteCount',
  'guestAccess',
  'guestWifi',
  'voice',
  'managementAccess',
  'management',
  'printers',
  'iot',
  'cameras',
  'wireless',
  'dualIsp',
  'cloudHybrid',
  'remoteAccess',
  'growthBufferModel',
];
for (const key of requirementKeys) {
  assert(contents.phase5.includes(`key: "${key}"`), `Phase 5 builder missing requirement policy ${key}`);
  assert(contents.doc.includes(`\`${key}\``), `Phase 5 doc missing requirement ${key}`);
}

const enterpriseMarkers = [
  'route domains',
  'pools',
  'allocations',
  'DHCP scopes',
  'reservations',
  'brownfield conflicts',
  'approvals',
  'ledger',
];
for (const marker of enterpriseMarkers) {
  assert(contents.doc.toLowerCase().includes(marker.toLowerCase()), `Phase 5 doc missing ${marker}`);
}

assert(contents.enterpriseAllocator.includes('durablePoolCount') && contents.enterpriseAllocator.includes('currentInputHash') && contents.enterpriseAllocator.includes('allocationPlanRows'), 'enterprise allocator posture must expose durable counts, hash, and plan rows');
assert(contents.enterpriseService.includes('createAllocationFromPlan') && contents.enterpriseService.includes('engine2-plan-materialized') && contents.enterpriseService.includes('currentInputHash'), 'enterprise service must materialize plan rows with Engine 2 hash evidence');
assert(contents.enterpriseService.includes('validateIpAllocationInput') && contents.enterpriseService.includes('ensureAllocationWriteIntegrity') && contents.enterpriseService.includes('BROWNFIELD_REVIEWED'), 'enterprise service must enforce allocation write integrity and brownfield review override discipline');

assert(contents.service.includes('buildPhase5EnterpriseIpamTruthControl'), 'designCore service does not build Phase 5 summary');
assert(contents.service.includes('phase5EnterpriseIpamTruth,'), 'designCore snapshot does not return Phase 5 summary');
assert(contents.types.includes('phase5EnterpriseIpamTruth: Phase5EnterpriseIpamTruthControlSummary'), 'backend snapshot type missing Phase 5 summary');
assert(contents.frontendTypes.includes('phase5EnterpriseIpamTruth?: Phase5EnterpriseIpamTruthControlSummary'), 'frontend snapshot type missing Phase 5 summary');
assert(contents.overview.includes('Phase 5 Enterprise IPAM durable authority') && contents.overview.includes('reconciliationRows') && contents.overview.includes('requirementIpamMatrix') && contents.overview.includes('conflictRows'), 'overview missing Phase 5 display');
assert(contents.validation.includes('IPAM_DURABLE_AUTHORITY_BLOCKED') && contents.validation.includes('IPAM_DURABLE_AUTHORITY_REVIEW_REQUIRED') && contents.validation.includes('IPAM_REQUIREMENT_PROPAGATION_GAP'), 'validation missing Phase 5 readiness gates');
assert(contents.report.includes('Phase 5 Enterprise IPAM Durable Authority') && contents.report.includes('Phase 5 Engine 1 / Engine 2 Reconciliation') && contents.report.includes('Phase 5 Requirement-to-IPAM Matrix'), 'DOCX/PDF report builder missing Phase 5 sections');
assert(contents.csvExport.includes('Phase 5 Enterprise IPAM Durable Authority') && contents.csvExport.includes('Phase 5 Engine1-Engine2 Reconciliation') && contents.csvExport.includes('Phase 5 Enterprise IPAM Findings'), 'CSV export missing Phase 5 evidence rows');
assert(contents.phase0.includes('designCore.phase5EnterpriseIpamTruthControl.ts') && contents.phase0.includes('phase5EnterpriseIpamTruth') && contents.phase0.includes('currentPhase0Verdict: "CONTROLLED"'), 'Phase 0 inventory must mark Engine 2 Phase 5 control evidence');
assert(contents.selftest.includes('ENGINE1_PROPOSAL_ONLY') && contents.selftest.includes('ENGINE2_APPROVED_ALLOCATION') && contents.selftest.includes('ENGINE2_STALE_ALLOCATION_REVIEW'), 'Phase 5 selftest missing approved/proposal-only/stale proof');

const requiredDocs = [
  'Phase 5 — Engine 2 Enterprise IPAM / Durable Allocation Workflow',
  'Engine 1 = mathematical planner',
  'Engine 2 = durable IPAM authority',
  'Design-core = reconciler and consumer',
  'No requirement should create a pretty subnet row while Engine 2 says the pool is blocked',
  'new greenfield project',
  'approved allocation from Engine 2',
  'stale allocation hash',
  'brownfield overlap',
  'reserved pool',
  'deprecated pool',
  'DHCP conflict',
  'reservation conflict',
  'IPv4 and IPv6 pool coexistence',
  'multi-VRF overlapping address space',
  'Do not use Phase 5 to',
  'fake ISP circuits',
  'fake cloud route tables',
];
for (const marker of requiredDocs) assert(contents.doc.includes(marker), `Phase 5 doc missing ${marker}`);

assert(rootPkg.version === '0.107.0', `package version must stay 0.107.0 to preserve inherited release gates, got ${rootPkg.version}`);
assert(rootPkg.scripts && rootPkg.scripts['check:phase5-enterprise-ipam'] === 'node scripts/check-phase5-enterprise-ipam.cjs', 'root script check:phase5-enterprise-ipam missing');
assert(rootPkg.scripts && rootPkg.scripts['check:phase5-107-release'], 'root script check:phase5-107-release missing');
assert(rootPkg.scripts['check:phase5-107-release'].includes('check:phase5-enterprise-ipam'), 'phase5 release chain must include phase5 check');
assert(rootPkg.scripts['check:phase5-107-release'].includes('check:phase4-107-release'), 'phase5 release chain must include phase4/phase3/phase2/phase1/phase0 chain');
assert(backendPkg.scripts && backendPkg.scripts['engine:selftest:phase5-enterprise-ipam'] === 'tsx src/lib/phase5EnterpriseIpam.selftest.ts', 'backend phase5 selftest script missing');

console.log('[phase5] Enterprise IPAM durable allocation workflow checks passed');
