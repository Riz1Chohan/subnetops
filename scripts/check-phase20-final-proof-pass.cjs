#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
function fail(message) { console.error(`[phase20] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }
function read(file) { return fs.readFileSync(path.join(process.cwd(), file), 'utf8'); }
function json(file) { return JSON.parse(read(file)); }

const pkg = json('package.json');
const backendPkg = json('backend/package.json');
const requiredFiles = [
  'backend/src/services/designCore/designCore.phase20FinalProofPassControl.ts',
  'backend/src/services/designCore.types.ts',
  'backend/src/services/designCore.service.ts',
  'backend/src/services/validation.service.ts',
  'backend/src/services/exportDesignCoreReport.service.ts',
  'backend/src/services/export.service.ts',
  'backend/src/lib/phase0EngineInventory.ts',
  'backend/src/lib/phase20FinalProofPass.selftest.ts',
  'frontend/src/lib/designCoreSnapshot.ts',
  'frontend/src/pages/ProjectOverviewPage.tsx',
  'docs/doc/PHASE20-FINAL-CROSS-ENGINE-PROOF-PASS.md',
];

assert(pkg.version === '0.112.0', 'package version must be 0.112.0');
assert(pkg.scripts['check:phase20-final-proof-pass'] === 'node scripts/check-phase20-final-proof-pass.cjs', 'root phase20 check script missing');
assert(pkg.scripts['check:phase20-112-release'] === 'npm run check:phase20-final-proof-pass && npm run check:phase19-111-release', 'phase20 release chain missing or wrong');
assert(backendPkg.scripts['engine:selftest:phase20-final-proof'] === 'tsx src/lib/phase20FinalProofPass.selftest.ts', 'backend phase20 selftest script missing');
assert((backendPkg.scripts['engine:selftest:all'] || '').includes('engine:selftest:phase20-final-proof'), 'phase20 selftest missing from backend all selftests');
for (const file of requiredFiles) assert(read(file).includes('PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT'), `phase20 marker missing from ${file}`);

const control = read('backend/src/services/designCore/designCore.phase20FinalProofPassControl.ts');
for (const marker of [
  'FINAL_CROSS_ENGINE_REQUIREMENT_TO_RELEASE_PROOF_GATE',
  'A_MINUS_A_PLANNING_PLATFORM_NOT_A_PLUS',
  'small-office',
  'healthcare-clinic',
  'multi-site-enterprise',
  'ten-site-enterprise',
  'guest-wifi-heavy',
  'voice-wireless',
  'cloud-hybrid',
  'dual-isp',
  'brownfield-migration',
  'overlapping-vrf-ipam',
  'security-sensitive-environment',
  'large-vlan-site-count',
  'requirements-propagation-chain',
  'addressing-ipam-foundation',
  'object-graph-routing-security-chain',
  'implementation-template-truth',
  'report-diagram-no-overclaim',
  'advisory-discovery-ai-boundaries',
  'scenario-library-proof',
  'no-a-plus-overclaim',
]) assert(control.includes(marker), `phase20 control missing ${marker}`);

for (const phase of Array.from({ length: 19 }, (_, index) => index + 1)) {
  assert(control.includes(`phase: ${phase}`), `phase20 control missing engine phase ${phase}`);
}
assert(control.includes('test/golden scenario proof'), 'phase20 propagation chain missing golden scenario proof');
assert(control.includes('routing, security, and discovery become deeper authoritative engines'), 'phase20 A+ boundary missing');

const types = read('backend/src/services/designCore.types.ts');
assert(types.includes('Phase20FinalProofPassControlSummary'), 'backend phase20 summary type missing');
assert(types.includes('phase20FinalProofPass: Phase20FinalProofPassControlSummary'), 'backend design-core snapshot phase20 field missing');
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
assert(frontendTypes.includes('Phase20FinalProofPassControlSummary'), 'frontend phase20 summary type missing');
assert(frontendTypes.includes('phase20FinalProofPass?: Phase20FinalProofPassControlSummary'), 'frontend snapshot phase20 field missing');

const designCore = read('backend/src/services/designCore.service.ts');
assert(designCore.includes('buildPhase20FinalProofPassControl'), 'design-core phase20 builder import missing');
assert(designCore.includes('const phase20FinalProofPass = buildPhase20FinalProofPassControl'), 'design-core phase20 build call missing');
assert(designCore.includes('phase20FinalProofPass,'), 'design-core snapshot phase20 return missing');
assert(designCore.includes('phase1TraceabilityControl') && designCore.includes('phase19AiDraftHelper') && designCore.includes('reportTruth') && designCore.includes('diagramTruth'), 'phase20 context does not receive all final proof inputs');

const validation = read('backend/src/services/validation.service.ts');
assert(validation.includes('PHASE20_FINAL_PROOF_BLOCKING') && validation.includes('PHASE20_FINAL_PROOF_REVIEW_REQUIRED'), 'validation phase20 findings missing');
const report = read('backend/src/services/exportDesignCoreReport.service.ts');
assert(report.includes('Phase 20 Final Cross-Engine Proof Pass') && report.includes('Phase 20 Release Gates') && report.includes('Phase 20 Cross-Engine Scenarios'), 'report phase20 section missing');
const csv = read('backend/src/services/export.service.ts');
assert(csv.includes('Phase 20 Final Proof') && csv.includes('Phase 20 Engine Proof Rows') && csv.includes('Phase 20 Findings'), 'CSV phase20 rows missing');
const overview = read('frontend/src/pages/ProjectOverviewPage.tsx');
assert(overview.includes('Phase 20 final proof pass') && overview.includes('phase20FinalProofPass.releaseGates'), 'ProjectOverview phase20 panel missing');

const inventory = read('backend/src/lib/phase0EngineInventory.ts');
assert(inventory.includes('phase: 20') && inventory.includes('Final cross-engine proof pass'), 'phase0 inventory missing phase20 row');
assert(inventory.includes('PHASE0_ENGINE_INVENTORY_EXPECTED_PHASES = 20'), 'phase0 expected phases not bumped to 20');
assert(inventory.includes('final-cross-engine-proof-gate'), 'phase0 source-of-truth level missing final proof gate');

const selftest = read('backend/src/lib/phase20FinalProofPass.selftest.ts');
assert(selftest.includes('PHASE20_FINAL_PROOF_CONTROLLED') && selftest.includes('PHASE20_ENGINE_CONTRACT_GAP'), 'phase20 selftest must prove controlled and blocked states');
const docs = read('docs/doc/PHASE20-FINAL-CROSS-ENGINE-PROOF-PASS.md');
assert(docs.includes('A-/A planning platform') && docs.includes('not A+') && docs.includes('cross-engine scenario'), 'phase20 docs missing release boundary or scenario proof');

console.log('[phase20] final cross-engine proof pass checks passed');
