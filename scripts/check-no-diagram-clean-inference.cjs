#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function fail(message) {
  console.error(`[no-diagram-clean-inference] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const renderModel = read('backend/src/domain/diagram/render-model.ts');
const control = read('backend/src/services/designCore/designCore.diagramTruthControl.ts');
const types = read('backend/src/domain/diagram/types.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const rootPackage = JSON.parse(read('package.json'));

for (const token of ['truthStateV1', 'readinessImpact', 'sourceRefs', 'validationRefs', 'warningBadges']) {
  assert(types.includes(token), `diagram types must carry ${token}`);
  assert(renderModel.includes(token), `diagram render boundary must materialize ${token}`);
}

assert(renderModel.includes('enforceTruthStateReadiness'), 'diagram render model must enforce readiness from truth state');
assert(renderModel.includes("truthStateV1 === 'ASSUMED'") && renderModel.includes('ASSUMED_OR_INFERRED'), 'assumed diagram evidence must receive a warning badge');
assert(renderModel.includes('OMITTED_EVIDENCE_WARNING'), 'omitted blocker/review evidence must become a visible diagram warning');
assert(control.includes('V1_DIAGRAM_CLEAN_INFERENCE_LEAK'), 'design-core diagram control must explicitly detect clean assumed/inferred evidence');
assert(control.includes('cleanAssumedNodes') && control.includes('cleanAssumedEdges'), 'diagram control must inspect both nodes and edges for clean inference leaks');
assert(control.includes('readinessImpact === "NONE"'), 'diagram control must treat NONE readiness impact on inferred evidence as suspicious');
assert(control.includes('V1_DIAGRAM_OMITTED_BLOCKER_BADGE_MISSING'), 'diagram control must fail missing omitted blocker badges');
assert(canvas.includes('warningBadges') && canvas.includes('omittedEvidenceHasBlockers'), 'frontend canvas must surface backend diagram warnings instead of hiding them');

const badCleanDefaults = [
  /truthStateV1:\s*["']USER_PROVIDED["'][\s\S]{0,120}truthState:\s*["']inferred["']/,
  /truthState:\s*["']inferred["'][\s\S]{0,120}readinessImpact:\s*["']NONE["']/,
  /truthState:\s*["']proposed["'][\s\S]{0,120}readinessImpact:\s*["']NONE["']/,
  /truthState:\s*["']planned["'][\s\S]{0,120}readinessImpact:\s*["']NONE["']/,
];
for (const pattern of badCleanDefaults) {
  assert(!pattern.test(renderModel), 'diagram render model contains a clean default for inferred/proposed/planned evidence');
}

assert(String(rootPackage.scripts['check:quality'] || '').includes('check-no-diagram-clean-inference.cjs'), 'root quality gate must include the diagram clean-inference kill switch');
console.log('[no-diagram-clean-inference] ok');
