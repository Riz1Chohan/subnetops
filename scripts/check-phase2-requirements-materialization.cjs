#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`[phase2] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const root = process.cwd();
const files = {
  policy: 'backend/src/services/requirementsMaterialization.policy.ts',
  materializer: 'backend/src/services/requirementsMaterialization.service.ts',
  registry: 'backend/src/services/requirementsImpactRegistry.ts',
  types: 'backend/src/services/designCore.types.ts',
  service: 'backend/src/services/designCore.service.ts',
  frontendTypes: 'frontend/src/lib/designCoreSnapshot.ts',
  frontendApi: 'frontend/src/features/projects/api.ts',
  overview: 'frontend/src/pages/ProjectOverviewPage.tsx',
  doc: 'docs/doc/PHASE2-REQUIREMENTS-MATERIALIZATION-POLICY.md',
  phase0: 'backend/src/lib/phase0EngineInventory.ts',
  pkg: 'package.json',
};

const read = (rel) => {
  const abs = path.join(root, rel);
  assert(fs.existsSync(abs), `${rel} missing`);
  return fs.readFileSync(abs, 'utf8');
};

const policy = read(files.policy);
const materializer = read(files.materializer);
const registry = read(files.registry);
const types = read(files.types);
const service = read(files.service);
const frontendTypes = read(files.frontendTypes);
const frontendApi = read(files.frontendApi);
const overview = read(files.overview);
const doc = read(files.doc);
const phase0 = read(files.phase0);
const pkg = JSON.parse(read(files.pkg));

const dispositions = [
  'MATERIALIZED_OBJECT',
  'ENGINE_INPUT_SIGNAL',
  'VALIDATION_BLOCKER',
  'REVIEW_ITEM',
  'EXPLICIT_NO_OP',
  'UNSUPPORTED',
];
for (const value of dispositions) {
  assert(policy.includes(`"${value}"`), `policy missing disposition ${value}`);
  assert(types.includes(`"${value}"`), `backend types missing disposition ${value}`);
  assert(frontendTypes.includes(`"${value}"`), `frontend types missing disposition ${value}`);
  assert(doc.includes(value), `Phase 2 doc missing disposition ${value}`);
}

const registryKeyCount = (registry.match(/key:\s*"[^"]+"/g) || []).length;
assert(registryKeyCount >= 80, `expected broad requirement registry coverage, found ${registryKeyCount}`);
assert(policy.includes('REQUIREMENT_IMPACT_REGISTRY.map(buildRequirementMaterializationPolicy)'), 'policy must be generated from full requirement impact registry');
assert(policy.includes('REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT_VERSION'), 'policy contract marker missing');
assert(policy.includes('PHASE2_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT'), 'Phase 2 contract version missing');
assert(policy.includes('MATERIALIZED_SEGMENT_BY_REQUIREMENT'), 'materialized segment mapping missing');
assert(policy.includes('VALIDATION_BLOCKER_REQUIREMENTS'), 'validation blocker mapping missing');
assert(policy.includes('REVIEW_ONLY_REQUIREMENTS'), 'review-only mapping missing');
assert(policy.includes('isExplicitlyOffOrEmpty'), 'explicit no-op classifier missing');
assert(policy.includes('buildRequirementMaterializationPolicySummary'), 'Phase 2 summary builder missing');
assert(policy.includes('silentDropKeys'), 'Phase 2 summary must expose silent-drop keys');
assert(policy.includes('materializer must not invent real circuits') || policy.includes('must not invent real circuits'), 'policy notes must forbid fake circuits');

const requiredPolicyFields = [
  'normalizedSignal',
  'createdObjectTypes',
  'updatedObjectTypes',
  'backendDesignCoreInputs',
  'affectedEngines',
  'validationImpact',
  'frontendImpact',
  'reportImpact',
  'diagramImpact',
  'noOpReason',
  'reviewRequiredWhen',
  'confidence',
  'actualEvidence',
  'evidenceObjectIds',
];
for (const marker of requiredPolicyFields) {
  assert(policy.includes(marker), `policy missing ${marker}`);
  assert(types.includes(marker), `backend types missing ${marker}`);
  assert(frontendTypes.includes(marker), `frontend types missing ${marker}`);
}

assert(materializer.includes('buildRequirementMaterializationPolicySummary'), 'requirements materializer does not build Phase 2 policy summary');
assert(materializer.includes('phase2MaterializationPolicy'), 'requirements materializer summary missing phase2MaterializationPolicy');
assert(materializer.includes('Pre-save materialization policy active fields'), 'requirements materializer missing before/after policy note');
assert(service.includes('buildRequirementMaterializationPolicySummary'), 'designCore service does not build Phase 2 materialization summary');
assert(service.includes('parseRequirementsForMaterializationPolicy'), 'designCore service does not parse requirements for Phase 2 policy');
assert(service.includes('phase2RequirementsMaterialization,'), 'designCore snapshot does not return Phase 2 materialization summary');
assert(types.includes('phase2RequirementsMaterialization: Phase2RequirementsMaterializationControlSummary'), 'backend snapshot type missing Phase 2 materialization summary');
assert(frontendTypes.includes('phase2RequirementsMaterialization?: Phase2RequirementsMaterializationControlSummary'), 'frontend snapshot type missing Phase 2 materialization summary');
assert(frontendApi.includes('phase2MaterializationPolicy?: Phase2RequirementsMaterializationControlSummary'), 'requirements save API type missing Phase 2 materialization policy response');
assert(overview.includes('Phase 2 requirements materialization policy'), 'overview missing Phase 2 materialization display');
assert(overview.includes('silentDropCount') && overview.includes('fieldOutcomes'), 'overview missing Phase 2 ledger fields');
assert(phase0.includes('Requirements materialization') && phase0.includes('NEEDS_PHASE_REPAIR'), 'Phase 0 inventory must still anchor requirements materialization as repaired by phase order');

const requiredDocs = [
  'Phase 2 — Requirements Materialization Policy',
  'no saved requirement is allowed to vanish',
  'no requirement is allowed to create fake engineering truth',
  'guestWifi=true',
  'dualIsp=true',
  'cloud route tables',
  'Remote access',
  'explicit no-op evidence',
  'all registry requirement fields have a materialization policy',
  'no active requirement can silently disappear',
  'no fake external circuit/cloud/current-state objects',
];
for (const marker of requiredDocs) assert(doc.includes(marker), `Phase 2 doc missing ${marker}`);

assert(['0.107.0','0.108.0','0.109.0','0.110.0','0.111.0','0.112.0'].includes(pkg.version), `package version must stay 0.107.0 to preserve inherited release gates, got ${pkg.version}`);
assert(pkg.scripts && pkg.scripts['check:phase2-requirements-materialization'] === 'node scripts/check-phase2-requirements-materialization.cjs', 'root script check:phase2-requirements-materialization missing');
assert(pkg.scripts && pkg.scripts['check:phase2-107-release'], 'root script check:phase2-107-release missing');
assert(pkg.scripts['check:phase2-107-release'].includes('check:phase2-requirements-materialization'), 'phase2 release chain must include phase2 check');
assert(pkg.scripts['check:phase2-107-release'].includes('check:phase1-107-release'), 'phase2 release chain must include phase1/phase0/phase84-107 chain');

console.log('[phase2] requirements materialization policy checks passed');
