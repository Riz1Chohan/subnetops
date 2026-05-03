#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`[phase4] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const root = process.cwd();
const files = {
  cidr: 'backend/src/lib/cidr.ts',
  allocator: 'backend/src/lib/addressAllocator.ts',
  phase4: 'backend/src/services/designCore/designCore.phase4CidrAddressingTruthControl.ts',
  selftest: 'backend/src/lib/phase4CidrAddressing.selftest.ts',
  cidrSelftest: 'backend/src/lib/cidr.selftest.ts',
  validation: 'backend/src/services/validation.service.ts',
  types: 'backend/src/services/designCore.types.ts',
  service: 'backend/src/services/designCore.service.ts',
  frontendTypes: 'frontend/src/lib/designCoreSnapshot.ts',
  overview: 'frontend/src/pages/ProjectOverviewPage.tsx',
  report: 'backend/src/services/exportDesignCoreReport.service.ts',
  csvExport: 'backend/src/services/export.service.ts',
  phase0: 'backend/src/lib/phase0EngineInventory.ts',
  doc: 'docs/doc/PHASE4-CIDR-ADDRESSING-TRUTH.md',
  rootPkg: 'package.json',
  backendPkg: 'backend/package.json',
};

const read = (rel) => {
  const abs = path.join(root, rel);
  assert(fs.existsSync(abs), `${rel} missing`);
  return fs.readFileSync(abs, 'utf8');
};

const cidr = read(files.cidr);
const allocator = read(files.allocator);
const phase4 = read(files.phase4);
const selftest = read(files.selftest);
const cidrSelftest = read(files.cidrSelftest);
const validation = read(files.validation);
const types = read(files.types);
const service = read(files.service);
const frontendTypes = read(files.frontendTypes);
const overview = read(files.overview);
const report = read(files.report);
const csvExport = read(files.csvExport);
const phase0 = read(files.phase0);
const doc = read(files.doc);
const rootPkg = JSON.parse(read(files.rootPkg));
const backendPkg = JSON.parse(read(files.backendPkg));

const contract = 'PHASE4_ENGINE1_CIDR_ADDRESSING_TRUTH';
for (const [name, content] of Object.entries({ phase4, types, service, frontendTypes, overview, report, csvExport, doc, selftest })) {
  assert(content.includes(contract) || (name === 'overview' && content.includes('Phase 4 CIDR/addressing truth')), `${name} missing Phase 4 contract/display marker`);
}

const cidrMarkers = [
  'validateHostUsability',
  'isUsableHostIp',
  'validateGatewayForSubnet',
  'role-incompatible',
  'network-address',
  'broadcast-address',
  '!/^\\d+$/.test(prefixValue)',
  'prefixValue.length > 1 && prefixValue.startsWith("0")',
];
for (const marker of cidrMarkers) assert(cidr.includes(marker), `cidr.ts missing ${marker}`);

for (const marker of ['10.0.0.0/+24', '10.0.0.0/24.0', '10.0.0.0/024', 'role-aware host usability', 'gateway validation explains']) {
  assert(cidrSelftest.includes(marker), `cidr selftest missing ${marker}`);
}

for (const marker of ['findNextAvailableNetworkDetailed', 'allocatorExplanation', 'allocatorCanFitRequestedPrefix', 'parent-exhausted', 'prefix-outside-parent']) {
  assert(allocator.includes(marker), `allocator missing ${marker}`);
}

const requiredTypes = [
  'Phase4CidrEdgeCaseProof',
  'Phase4RequirementAddressingMatrixRow',
  'Phase4AddressingTruthRow',
  'Phase4CidrAddressingTruthControlSummary',
  'edgeCaseProofs',
  'requirementAddressingMatrix',
  'addressingTruthRows',
  'requirementAddressingGapCount',
  'phase4CidrAddressingTruth',
];
for (const marker of requiredTypes) {
  assert(types.includes(marker), `backend types missing ${marker}`);
  assert(frontendTypes.includes(marker), `frontend types missing ${marker}`);
}

const requiredRequirementKeys = [
  'usersPerSite',
  'siteCount',
  'guestWifi',
  'guestAccess',
  'voice',
  'wireless',
  'printers',
  'iot',
  'cameras',
  'management',
  'managementAccess',
  'remoteAccess',
  'serverPlacement',
  'growthBufferModel',
  'growthHorizon',
  'dualIsp',
];
for (const key of requiredRequirementKeys) {
  assert(phase4.includes(`key: "${key}"`), `Phase 4 builder missing requirement policy ${key}`);
  assert(doc.includes(`\`${key}\``), `Phase 4 doc missing requirement ${key}`);
}

const requiredProofs = [
  'ipv4-canonicalization',
  'invalid-cidr-rejection',
  'boundary-prefixes',
  'network-broadcast-gateway-safety',
  'overlap-detection',
  'deterministic-allocation',
  'site-block-exhaustion',
];
for (const id of requiredProofs) {
  assert(phase4.includes(id), `Phase 4 builder missing proof ${id}`);
  assert(doc.includes(id) || doc.toLowerCase().includes(id.replace(/-/g, ' ')), `Phase 4 doc missing proof ${id}`);
}

assert(service.includes('buildPhase4CidrAddressingTruthControl'), 'designCore service does not build Phase 4 summary');
assert(service.includes('phase4CidrAddressingTruth,'), 'designCore snapshot does not return Phase 4 summary');
assert(types.includes('phase4CidrAddressingTruth: Phase4CidrAddressingTruthControlSummary'), 'backend snapshot type missing Phase 4 summary');
assert(frontendTypes.includes('phase4CidrAddressingTruth?: Phase4CidrAddressingTruthControlSummary'), 'frontend snapshot type missing Phase 4 summary');
assert(validation.includes('validateGatewayForSubnet') && validation.includes('GATEWAY_ROLE_UNUSABLE'), 'validation must use role-aware gateway usability');
assert(overview.includes('Phase 4 CIDR/addressing truth') && overview.includes('requirementAddressingMatrix') && overview.includes('edgeCaseProofs'), 'overview missing Phase 4 display');
assert(report.includes('Phase 4 CIDR Addressing Truth') && report.includes('Phase 4 Requirement Addressing Matrix') && report.includes('Phase 4 Addressing Row Truth'), 'DOCX/PDF report builder missing Phase 4 sections');
assert(csvExport.includes('Phase 4 CIDR Addressing Truth') && csvExport.includes('Phase 4 Requirement Addressing Matrix') && csvExport.includes('Phase 4 Addressing Row Truth'), 'CSV export missing Phase 4 rows');
assert(phase0.includes('phase4CidrAddressingTruth') && phase0.includes('backend/src/lib/phase4CidrAddressing.selftest.ts') && phase0.includes('currentPhase0Verdict: "CONTROLLED"'), 'Phase 0 inventory must mark Engine 1 Phase 4 control evidence');
assert(selftest.includes('Phase 4 control summary exposes requirement-to-addressing gaps') && selftest.includes('guestWifi') && selftest.includes('REVIEW_REQUIRED'), 'Phase 4 selftest missing requirement-gap proof');

const requiredDocs = [
  'Phase 4 — Engine 1 CIDR / Addressing Truth',
  'Engine 1 is the mathematical planner',
  'Engine 2 remains the durable IPAM authority',
  'No requirement is allowed to create a pretty subnet row',
  'role-aware gateway safety',
  'The frontend does not compute this truth locally',
  'Do not use Phase 4 to',
  'create fake ISP circuits',
  'create fake cloud route tables',
];
for (const marker of requiredDocs) assert(doc.includes(marker), `Phase 4 doc missing ${marker}`);

assert(['0.107.0','0.108.0','0.109.0','0.110.0','0.111.0','0.112.0'].includes(rootPkg.version), `package version must stay 0.107.0 to preserve inherited release gates, got ${rootPkg.version}`);
assert(rootPkg.scripts && rootPkg.scripts['check:phase4-cidr-addressing'] === 'node scripts/check-phase4-cidr-addressing.cjs', 'root script check:phase4-cidr-addressing missing');
assert(rootPkg.scripts && rootPkg.scripts['check:phase4-107-release'], 'root script check:phase4-107-release missing');
assert(rootPkg.scripts['check:phase4-107-release'].includes('check:phase4-cidr-addressing'), 'phase4 release chain must include phase4 check');
assert(rootPkg.scripts['check:phase4-107-release'].includes('check:phase3-107-release'), 'phase4 release chain must include phase3/phase2/phase1/phase0 chain');
assert(backendPkg.scripts && backendPkg.scripts['engine:selftest:phase4-addressing'] === 'tsx src/lib/phase4CidrAddressing.selftest.ts', 'backend phase4 selftest script missing');

console.log('[phase4] CIDR/addressing truth checks passed');
