#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`[phase3] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const root = process.cwd();
const files = {
  phase3: 'backend/src/services/designCore/designCore.phase3RequirementsClosureControl.ts',
  types: 'backend/src/services/designCore.types.ts',
  service: 'backend/src/services/designCore.service.ts',
  runtimeProof: 'backend/src/services/requirementsRuntimeProof.service.ts',
  goldenSelftest: 'backend/src/services/requirementsGoldenScenarios.selftest.ts',
  report: 'backend/src/services/exportDesignCoreReport.service.ts',
  csvExport: 'backend/src/services/export.service.ts',
  frontendTypes: 'frontend/src/lib/designCoreSnapshot.ts',
  overview: 'frontend/src/pages/ProjectOverviewPage.tsx',
  doc: 'docs/doc/PHASE3-REQUIREMENTS-IMPACT-CLOSURE-SCENARIO-PROOF.md',
  pkg: 'package.json',
};

const read = (rel) => {
  const abs = path.join(root, rel);
  assert(fs.existsSync(abs), `${rel} missing`);
  return fs.readFileSync(abs, 'utf8');
};

const phase3 = read(files.phase3);
const types = read(files.types);
const service = read(files.service);
const runtimeProof = read(files.runtimeProof);
const goldenSelftest = read(files.goldenSelftest);
const report = read(files.report);
const csvExport = read(files.csvExport);
const frontendTypes = read(files.frontendTypes);
const overview = read(files.overview);
const doc = read(files.doc);
const pkg = JSON.parse(read(files.pkg));

const contract = 'PHASE3_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF';
for (const [name, content] of Object.entries({ phase3, types, runtimeProof, goldenSelftest, frontendTypes, doc })) {
  assert(content.includes(contract), `${name} missing Phase 3 contract marker`);
}

const lifecycleStates = [
  'NOT_CAPTURED',
  'CAPTURED_ONLY',
  'MATERIALIZED',
  'PARTIALLY_PROPAGATED',
  'FULLY_PROPAGATED',
  'REVIEW_REQUIRED',
  'BLOCKED',
  'UNSUPPORTED',
];
for (const value of lifecycleStates) {
  assert(types.includes(`"${value}"`), `backend types missing lifecycle ${value}`);
  assert(frontendTypes.includes(`"${value}"`), `frontend types missing lifecycle ${value}`);
  assert(phase3.includes(`"${value}"`), `Phase 3 builder missing lifecycle ${value}`);
  assert(doc.includes(value), `Phase 3 doc missing lifecycle ${value}`);
}

const requiredTypeMarkers = [
  'Phase3RequirementConsumerCoverage',
  'Phase3RequirementClosureMatrixRow',
  'Phase3GoldenScenarioClosure',
  'Phase3RequirementsClosureControlSummary',
  'closureMatrix',
  'goldenScenarioClosures',
  'expectedAffectedEngines',
  'actualAffectedEngines',
  'missingConsumers',
  'readinessImpact',
  'consumerCoverage',
  'scenarioProven',
];
for (const marker of requiredTypeMarkers) {
  assert(types.includes(marker), `backend types missing ${marker}`);
  assert(frontendTypes.includes(marker), `frontend types missing ${marker}`);
  assert(phase3.includes(marker), `Phase 3 builder missing ${marker}`);
}
assert(types.includes('phase3RequirementsClosure'), 'backend snapshot type missing phase3RequirementsClosure');
assert(frontendTypes.includes('phase3RequirementsClosure'), 'frontend snapshot type missing phase3RequirementsClosure');

const requiredCoverageFields = [
  'captured',
  'normalized',
  'materialized',
  'backendConsumed',
  'addressingConsumed',
  'routingConsumed',
  'securityConsumed',
  'implementationConsumed',
  'validationConsumed',
  'frontendVisible',
  'reportVisible',
  'diagramVisible',
  'scenarioProven',
];
for (const marker of requiredCoverageFields) {
  assert(phase3.includes(marker), `Phase 3 coverage missing ${marker}`);
  assert(types.includes(marker), `backend Phase 3 types missing ${marker}`);
  assert(frontendTypes.includes(marker), `frontend Phase 3 types missing ${marker}`);
}

const scenarioIds = [
  'small-office',
  'multi-site',
  'guest-wifi',
  'voice',
  'cloud-hybrid',
  'remote-access',
  'dual-isp',
  'healthcare-security-sensitive',
  'brownfield-migration',
];
for (const id of scenarioIds) {
  assert(phase3.includes(id), `Phase 3 missing golden scenario ${id}`);
  assert(doc.includes(id) || doc.toLowerCase().includes(id.replace(/-/g, '/')) || doc.toLowerCase().includes(id.replace(/-/g, ' ')), `Phase 3 doc missing scenario ${id}`);
}

assert(phase3.includes('buildPhase3RequirementsClosureControl'), 'Phase 3 builder function missing');
assert(phase3.includes('phase2RequirementsMaterialization.fieldOutcomes.map'), 'Phase 3 must cover Phase 2 field outcomes');
assert(phase3.includes('requirementsImpactClosure.fieldOutcomes.find'), 'Phase 3 must consume requirements impact closure rows');
assert(phase3.includes('requirementsScenarioProof.signals'), 'Phase 3 must consume scenario proof signals');
assert(phase3.includes('reportTruth') && phase3.includes('diagramTruth'), 'Phase 3 must check report and diagram truth consumers');
assert(phase3.includes('The closure matrix does not invent missing downstream facts'), 'Phase 3 notes must explicitly forbid fake consumer proof');

assert(service.includes('buildPhase3RequirementsClosureControl'), 'designCore service does not build Phase 3 control summary');
assert(service.includes('phase3RequirementsClosure,'), 'designCore snapshot does not return Phase 3 summary');
assert(types.includes('phase3RequirementsClosure: Phase3RequirementsClosureControlSummary'), 'backend snapshot type missing Phase 3 summary');
assert(frontendTypes.includes('phase3RequirementsClosure?: Phase3RequirementsClosureControlSummary'), 'frontend snapshot type missing Phase 3 summary');
assert(overview.includes('Phase 3 requirements closure matrix'), 'ProjectOverviewPage missing Phase 3 display');
assert(overview.includes('missingConsumers') && overview.includes('goldenScenarioClosures'), 'Phase 3 frontend display missing closure/scenario fields');
assert(report.includes('Phase 3 Requirements Closure Matrix') && report.includes('Phase 3 Golden Scenario Closure'), 'DOCX/PDF report builder missing Phase 3 section');
assert(csvExport.includes('Phase 3 Requirements Closure') && csvExport.includes('Phase 3 Golden Scenario Closure'), 'CSV export missing Phase 3 evidence rows');
assert(runtimeProof.includes('phase3RequirementsClosureControl'), 'requirements runtime proof release marker missing Phase 3');
assert(goldenSelftest.includes('phase3RequirementsClosure.contractVersion') && goldenSelftest.includes('Phase 3 closure matrix did not cover Phase 2 policy rows'), 'golden scenario selftest missing Phase 3 assertions');

const requiredDocs = [
  'Phase 3 — Requirements Impact, Closure, and Scenario Proof',
  'nothing-got-lost checker',
  'captured requirement',
  'normalized requirement signal',
  'materialized source object OR review/block/no-op state',
  'backend design-core consumption',
  'validation/readiness impact',
  'frontend visibility',
  'report/export evidence',
  'diagram impact when relevant',
  'golden scenario proof',
  'No downstream consumer is allowed to silently disappear',
  'The frontend does not compute this truth locally',
];
for (const marker of requiredDocs) assert(doc.includes(marker), `Phase 3 doc missing ${marker}`);

assert(['0.107.0','0.108.0','0.109.0','0.110.0','0.111.0','0.112.0'].includes(pkg.version), `package version must stay 0.107.0 to preserve inherited release gates, got ${pkg.version}`);
assert(pkg.scripts && pkg.scripts['check:phase3-requirements-closure'] === 'node scripts/check-phase3-requirements-closure.cjs', 'root script check:phase3-requirements-closure missing');
assert(pkg.scripts && pkg.scripts['check:phase3-107-release'], 'root script check:phase3-107-release missing');
assert(pkg.scripts['check:phase3-107-release'].includes('check:phase3-requirements-closure'), 'phase3 release chain must include phase3 check');
assert(pkg.scripts['check:phase3-107-release'].includes('check:phase2-107-release'), 'phase3 release chain must include phase2/phase1/phase0/phase84-107 chain');

console.log('[phase3] requirements impact closure and scenario proof checks passed');
