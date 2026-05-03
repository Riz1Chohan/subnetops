#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`[phase1] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const root = process.cwd();
const files = {
  types: 'backend/src/services/designCore.types.ts',
  traceability: 'backend/src/services/designCore/designCore.traceability.ts',
  planning: 'backend/src/services/designCore/designCore.planningInputDiscipline.ts',
  phase1: 'backend/src/services/designCore/designCore.phase1TraceabilityControl.ts',
  service: 'backend/src/services/designCore.service.ts',
  frontendTypes: 'frontend/src/lib/designCoreSnapshot.ts',
  overview: 'frontend/src/pages/ProjectOverviewPage.tsx',
  doc: 'docs/doc/PHASE1-PLANNING-INPUT-DISCIPLINE-TRACEABILITY.md',
  phase0: 'backend/src/lib/phase0EngineInventory.ts',
  pkg: 'package.json',
};

const read = (rel) => {
  const abs = path.join(root, rel);
  assert(fs.existsSync(abs), `${rel} missing`);
  return fs.readFileSync(abs, 'utf8');
};

const types = read(files.types);
const traceability = read(files.traceability);
const planning = read(files.planning);
const phase1 = read(files.phase1);
const service = read(files.service);
const frontendTypes = read(files.frontendTypes);
const overview = read(files.overview);
const doc = read(files.doc);
const phase0 = read(files.phase0);
const pkg = JSON.parse(read(files.pkg));

const requiredSourceTypes = [
  'USER_PROVIDED',
  'REQUIREMENT_MATERIALIZED',
  'BACKEND_COMPUTED',
  'ENGINE2_DURABLE',
  'INFERRED',
  'ESTIMATED',
  'IMPORTED',
  'REVIEW_REQUIRED',
  'UNSUPPORTED',
];
for (const value of requiredSourceTypes) {
  assert(types.includes(`"${value}"`), `backend type missing source label ${value}`);
  assert(frontendTypes.includes(`"${value}"`), `frontend type missing source label ${value}`);
  assert(phase1.includes(`sourceType: "${value}"`) || phase1.includes(`sourceType: ${JSON.stringify(value)}`) || phase1.includes(`{ sourceType: "${value}"`), `phase1 policy missing ${value}`);
  assert(doc.includes(value), `phase1 doc missing ${value}`);
}

const requiredTypeMarkers = [
  'DesignTruthSourceType',
  'DesignProofStatus',
  'RequirementPropagationLifecycleStatus',
  'DesignSourceTraceLabel',
  'DesignOutputTruthLabel',
  'RequirementPropagationTraceItem',
  'Phase1PlanningTraceabilityControlSummary',
  'sourceRequirementIds',
  'sourceObjectIds',
  'sourceEngine',
  'confidence',
  'proofStatus',
  'reviewReason',
  'consumerPath',
];
for (const marker of requiredTypeMarkers) {
  assert(types.includes(marker), `backend types missing ${marker}`);
  assert(frontendTypes.includes(marker), `frontend types missing ${marker}`);
}

assert(types.includes('export interface DesignTraceabilityItem extends DesignSourceTraceLabel'), 'DesignTraceabilityItem must carry source/proof labels');
assert(types.includes('export interface PlanningInputDisciplineItem extends DesignSourceTraceLabel'), 'PlanningInputDisciplineItem must carry source/proof labels');
assert(types.includes('phase1TraceabilityControl: Phase1PlanningTraceabilityControlSummary'), 'DesignCoreSnapshot missing Phase 1 control summary');
assert(traceability.includes('sourceType: item.captured ? "USER_PROVIDED" : "UNSUPPORTED"'), 'traceability rows do not label captured/unsupported requirements');
assert(traceability.includes('sourceRequirementIds: [sourceId]'), 'traceability rows missing sourceRequirementIds');
assert(traceability.includes('propagationLifecycleStatus'), 'traceability rows missing lifecycle status');
assert(planning.includes('sourceType: input.sourceArea === "discovery" ? "IMPORTED" : "USER_PROVIDED"'), 'planning discipline rows missing source type labeling');
assert(planning.includes('Captured but not currently design-driving'), 'planning discipline missing no-op/review wording');
assert(planning.includes('Requires manual review'), 'planning discipline missing manual review wording');
assert(phase1.includes('PHASE1_TRUTH_SOURCE_TYPE_POLICIES'), 'Phase 1 source policy registry missing');
assert(phase1.includes('REQUIRED_OUTPUTS'), 'Phase 1 output coverage list missing');
assert(phase1.includes('buildPhase1PlanningTraceabilityControl'), 'Phase 1 builder missing');
assert(phase1.includes('requirementId') && phase1.includes('backendDesignCoreInputs') && phase1.includes('engineOutputs'), 'Phase 1 lineage chain fields missing');
assert(phase1.includes('frontendConsumers') && phase1.includes('reportExportConsumers') && phase1.includes('diagramConsumers'), 'Phase 1 consumer chain missing');
assert(phase1.includes('Captured but not currently design-driving'), 'Phase 1 missing explicit no-op wording');
assert(phase1.includes('Requires manual review'), 'Phase 1 missing manual review wording');
assert(service.includes('buildPhase1PlanningTraceabilityControl'), 'designCore service does not build Phase 1 control summary');
assert(service.includes('phase1TraceabilityControl,'), 'designCore snapshot does not return Phase 1 control summary');
assert(frontendTypes.includes('phase1TraceabilityControl?: Phase1PlanningTraceabilityControlSummary'), 'frontend snapshot type missing Phase 1 control summary');
assert(overview.includes('Phase 1 truth source ledger'), 'ProjectOverviewPage missing Phase 1 frontend display');
assert(overview.includes('outputLabelCoverage') && overview.includes('requirementLineageCoverage'), 'Phase 1 frontend display missing coverage fields');
assert(phase0.includes('Planning input discipline / traceability') && phase0.includes('NEEDS_PHASE_REPAIR'), 'Phase 0 inventory still needs to anchor Phase 1 repair');

const requiredDocs = [
  'Phase 1 — Planning Input Discipline / Traceability',
  'Requirement input',
  'normalized requirement signal',
  'materialized source object OR explicit no-op/review reason',
  'backend design-core input',
  'engine-specific computation',
  'traceability evidence',
  'validation/readiness impact',
  'frontend display',
  'report/export impact',
  'diagram impact where relevant',
  'test/golden scenario proof',
  'requirementId → design object → engine output → UI/report/diagram consumer',
  'Captured but not currently design-driving',
  'Requires manual review',
  'No ghost outputs',
  'No fake confidence',
];
for (const marker of requiredDocs) assert(doc.includes(marker), `Phase 1 doc missing ${marker}`);

assert(['0.107.0','0.108.0','0.109.0','0.110.0','0.111.0','0.112.0'].includes(pkg.version), `package version must stay 0.107.0 to preserve the inherited Phase 84-107 release gates, got ${pkg.version}`);
assert(pkg.scripts && pkg.scripts['check:phase1-planning-traceability'] === 'node scripts/check-phase1-planning-traceability.cjs', 'root script check:phase1-planning-traceability missing');
assert(pkg.scripts && pkg.scripts['check:phase1-107-release'], 'root script check:phase1-107-release missing');
assert(pkg.scripts['check:phase1-107-release'].includes('check:phase1-planning-traceability'), 'phase1 release chain must include phase1 check');
assert(pkg.scripts['check:phase1-107-release'].includes('check:phase0-107-release'), 'phase1 release chain must include phase0/phase84-107 chain');

console.log('[phase1] planning input discipline and traceability checks passed');
