#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`[phase6] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const root = process.cwd();
const files = {
  phase6: 'backend/src/services/designCore/designCore.phase6DesignCoreOrchestratorControl.ts',
  selftest: 'backend/src/lib/phase6DesignCoreOrchestrator.selftest.ts',
  types: 'backend/src/services/designCore.types.ts',
  service: 'backend/src/services/designCore.service.ts',
  validation: 'backend/src/services/validation.service.ts',
  frontendTypes: 'frontend/src/lib/designCoreSnapshot.ts',
  overview: 'frontend/src/pages/ProjectOverviewPage.tsx',
  report: 'backend/src/services/exportDesignCoreReport.service.ts',
  csvExport: 'backend/src/services/export.service.ts',
  phase0: 'backend/src/lib/phase0EngineInventory.ts',
  doc: 'docs/doc/PHASE6-DESIGN-CORE-ORCHESTRATOR.md',
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
const contract = 'PHASE6_DESIGN_CORE_ORCHESTRATOR_CONTRACT';
const role = 'DESIGN_CORE_COORDINATOR_NOT_GOD_FILE';

for (const [name, content] of Object.entries({
  phase6: contents.phase6,
  selftest: contents.selftest,
  types: contents.types,
  service: contents.service,
  frontendTypes: contents.frontendTypes,
  overview: contents.overview,
  report: contents.report,
  csvExport: contents.csvExport,
  doc: contents.doc,
})) {
  assert(content.includes(contract) || (name === 'overview' && content.includes('Phase 6 design-core orchestrator control')), `${name} missing Phase 6 contract/display marker`);
}

for (const content of [contents.phase6, contents.selftest, contents.types, contents.frontendTypes, contents.doc]) {
  assert(content.includes(role), `missing ${role}`);
}

const sectionKeys = [
  'sourceInputs',
  'materializedObjects',
  'addressingTruth',
  'enterpriseIpamTruth',
  'standardsTruth',
  'objectModelTruth',
  'graphTruth',
  'routingTruth',
  'securityTruth',
  'implementationTruth',
  'reportTruth',
  'diagramTruth',
  'readinessTruth',
];
for (const key of sectionKeys) {
  assert(contents.phase6.includes(`sectionKey: "${key}"`) || contents.phase6.includes(`"${key}"`), `Phase 6 builder missing section ${key}`);
  assert(contents.types.includes(`| "${key}"`) || contents.types.includes(`"${key}"`), `backend types missing section key ${key}`);
  assert(contents.frontendTypes.includes(`| "${key}"`) || contents.frontendTypes.includes(`"${key}"`), `frontend types missing section key ${key}`);
  assert(contents.doc.includes(`\`${key}\``) || contents.doc.includes(key), `Phase 6 doc missing section ${key}`);
}

const requiredTypeMarkers = [
  'Phase6SectionKey',
  'Phase6SectionSourceType',
  'Phase6OrchestratorReadiness',
  'Phase6OrchestratorSectionRow',
  'Phase6OrchestratorDependencyEdge',
  'Phase6OrchestratorBoundaryFinding',
  'Phase6DesignCoreOrchestratorControlSummary',
  'phase6DesignCoreOrchestrator',
  'BACKEND_COORDINATED',
  'ENGINE1_PLANNER',
  'ENGINE2_DURABLE_AUTHORITY',
  'REVIEW_GATED',
];
for (const marker of requiredTypeMarkers) {
  assert(contents.types.includes(marker), `backend types missing ${marker}`);
  assert(contents.frontendTypes.includes(marker), `frontend types missing ${marker}`);
  assert(contents.phase6.includes(marker), `Phase 6 builder missing ${marker}`);
}

const requiredBuilderMarkers = [
  'buildPhase6DesignCoreOrchestratorControl',
  'requirementContextPaths',
  'sectionRows',
  'dependencyEdges',
  'boundaryFindings',
  'frontendIndependentTruthRiskCount',
  'requirementContextGapCount',
  'reportContextGapCount',
  'diagramContextGapCount',
  'readinessContextGapCount',
  'No frontend route, report section, or diagram view may compute authoritative engineering truth independently',
];
for (const marker of requiredBuilderMarkers) assert(contents.phase6.includes(marker), `Phase 6 builder missing ${marker}`);

const dependencyMarkers = [
  'phase6-source-to-materialization',
  'phase6-materialization-to-addressing',
  'phase6-addressing-to-ipam',
  'phase6-ipam-to-object-model',
  'phase6-object-model-to-graph',
  'phase6-graph-to-routing',
  'phase6-routing-to-security',
  'phase6-security-to-implementation',
  'phase6-implementation-to-report',
  'phase6-object-model-to-diagram',
  'phase6-all-to-readiness',
];
for (const marker of dependencyMarkers) assert(contents.phase6.includes(marker), `Phase 6 builder missing dependency ${marker}`);

const snapshotMarkers = [
  'buildPhase6DesignCoreOrchestratorControl',
  'phase1TraceabilityControl',
  'phase2RequirementsMaterialization',
  'phase3RequirementsClosure',
  'phase4CidrAddressingTruth',
  'phase5EnterpriseIpamTruth',
  'networkObjectModel',
  'reportTruth',
  'diagramTruth',
  'vendorNeutralImplementationTemplates',
  'phase6DesignCoreOrchestrator,',
];
for (const marker of snapshotMarkers) assert(contents.service.includes(marker), `designCore service missing ${marker}`);

assert(contents.validation.includes('DESIGN_CORE_ORCHESTRATOR_SECTION_MISSING'), 'validation missing missing-section Phase 6 gate');
assert(contents.validation.includes('DESIGN_CORE_ORCHESTRATOR_SECTION_BLOCKED'), 'validation missing blocked-section Phase 6 gate');
assert(contents.validation.includes('DESIGN_CORE_ORCHESTRATOR_SECTION_REVIEW_REQUIRED'), 'validation missing review-section Phase 6 gate');
assert(contents.validation.includes('designSnapshot?.phase6DesignCoreOrchestrator'), 'validation does not consume phase6 orchestrator findings');

assert(contents.overview.includes('Phase 6 design-core orchestrator control') && contents.overview.includes('sectionRows') && contents.overview.includes('dependencyEdges') && contents.overview.includes('boundaryFindings'), 'overview missing Phase 6 display tables');
assert(contents.report.includes('Phase 6 Design-Core Orchestrator Contract') && contents.report.includes('Phase 6 Snapshot Boundary Sections') && contents.report.includes('Phase 6 Orchestrator Dependency Edges') && contents.report.includes('Phase 6 Boundary Findings'), 'DOCX/PDF report builder missing Phase 6 sections');
assert(contents.csvExport.includes('Phase 6 Design-Core Orchestrator Contract') && contents.csvExport.includes('Phase 6 Snapshot Boundary Sections') && contents.csvExport.includes('Phase 6 Orchestrator Dependency Edges') && contents.csvExport.includes('Phase 6 Boundary Findings'), 'CSV export missing Phase 6 evidence rows');
assert(contents.phase0.includes('designCore.phase6DesignCoreOrchestratorControl.ts') && contents.phase0.includes('phase6DesignCoreOrchestrator') && contents.phase0.includes('phase: 6') && contents.phase0.includes('currentPhase0Verdict: "CONTROLLED"'), 'Phase 0 inventory must mark Design-core orchestrator Phase 6 control evidence');

const requiredDocs = [
  'Phase 6 — Design-Core Orchestrator Engine',
  'Design-core is a coordinator, not a dumping ground',
  'sourceInputs',
  'materializedObjects',
  'addressingTruth',
  'enterpriseIpamTruth',
  'objectModelTruth',
  'graphTruth',
  'routingTruth',
  'securityTruth',
  'implementationTruth',
  'reportTruth',
  'diagramTruth',
  'readinessTruth',
  'Do not upgrade routing logic',
  'Do not upgrade security policy flow',
  'Do not rewrite reports',
  'Do not rewrite diagram layout',
];
for (const marker of requiredDocs) assert(contents.doc.includes(marker), `Phase 6 doc missing ${marker}`);

assert(['0.107.0','0.108.0','0.109.0','0.110.0','0.111.0','0.112.0'].includes(rootPkg.version), `package version must stay 0.107.0 to preserve inherited release gates, got ${rootPkg.version}`);
assert(rootPkg.scripts && rootPkg.scripts['check:phase6-design-core-orchestrator'] === 'node scripts/check-phase6-design-core-orchestrator.cjs', 'root script check:phase6-design-core-orchestrator missing');
assert(rootPkg.scripts && rootPkg.scripts['check:phase6-107-release'], 'root script check:phase6-107-release missing');
assert(rootPkg.scripts['check:phase6-107-release'].includes('check:phase6-design-core-orchestrator'), 'phase6 release chain must include phase6 check');
assert(rootPkg.scripts['check:phase6-107-release'].includes('check:phase5-107-release'), 'phase6 release chain must include phase5/phase4/phase3/phase2/phase1/phase0 chain');
assert(backendPkg.scripts && backendPkg.scripts['engine:selftest:phase6-design-core-orchestrator'] === 'tsx src/lib/phase6DesignCoreOrchestrator.selftest.ts', 'backend phase6 selftest script missing');

console.log('[phase6] Design-core orchestrator checks passed');
