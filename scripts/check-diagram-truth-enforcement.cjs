#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => {
  console.error(`Diagram truth enforcement check failed: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => { if (!condition) fail(message); };

const domainTypes = read('backend/src/domain/diagram/types.ts');
const renderModel = read('backend/src/domain/diagram/render-model.ts');
const coverage = read('backend/src/domain/diagram/coverage.ts');
const control = read('backend/src/services/designCore/designCore.diagramTruthControl.ts');
const backendTypes = read('backend/src/services/designCore.types.ts');
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');

for (const field of ['truthStateV1', 'readinessImpact', 'sourceRefs', 'validationRefs', 'warningBadges']) {
  assert(domainTypes.includes(field), `domain diagram types must expose ${field}`);
  assert(renderModel.includes(field), `diagram render model must materialize ${field}`);
  assert(backendTypes.includes(field), `backend snapshot types must expose ${field}`);
  assert(frontendTypes.includes(field), `frontend snapshot types must expose ${field}`);
}

assert(/export type DiagramV1TruthState/.test(domainTypes), 'domain must expose V1 diagram truth states');
assert(/USER_PROVIDED/.test(domainTypes) && /DERIVED/.test(domainTypes) && /ASSUMED/.test(domainTypes) && /IMPORTED/.test(domainTypes) && /REVIEW_REQUIRED/.test(domainTypes) && /BLOCKED/.test(domainTypes), 'V1 diagram truth states must include user/derived/assumed/imported/review/blocked labels');
assert(/interface DiagramRenderEdge[\s\S]*truthState: DiagramTruthState/.test(domainTypes), 'render edges must carry truthState');
assert(/decorateRenderNode/.test(renderModel) && /decorateRenderEdge/.test(renderModel), 'render model must decorate nodes and edges at the backend boundary');
assert(/v1TruthStateFromDiagramTruthState/.test(renderModel), 'render model must map backend truth states to V1 diagram truth states');
assert(/enforceTruthStateReadiness/.test(renderModel), 'render model must enforce truth-state readiness');
assert(/ASSUMED_OR_INFERRED/.test(renderModel), 'assumed/inferred diagram evidence must get warning badges');
assert(/OMITTED_EVIDENCE_WARNING/.test(renderModel), 'omitted evidence must be badgeable in diagram truth');
assert(/truthState: edge\.truthState/.test(coverage), 'edge coverage must preserve edge truth state');

assert(/V1_DIAGRAM_TRUTH_EVIDENCE_MISSING/.test(control), 'diagram truth control must block missing truth/evidence fields');
assert(/V1_DIAGRAM_CLEAN_INFERENCE_LEAK/.test(control), 'diagram truth control must block clean assumed/inferred evidence');
assert(/V1_DIAGRAM_OMITTED_BLOCKER_BADGE_MISSING/.test(control), 'diagram truth control must block missing omitted-evidence warnings');
assert(/sourceRefs/.test(control) && /validationRefs/.test(control), 'diagram truth control must inspect source and validation refs');

assert(/warningBadges/.test(canvas), 'frontend canvas must surface warning badges');
assert(/sourceRefs/.test(canvas) && /validationRefs/.test(canvas), 'frontend canvas must display source and validation refs');
assert(/omittedEvidenceHasBlockers/.test(canvas) && /omittedEvidenceHasReviewRequired/.test(canvas), 'frontend canvas must surface omitted blocker/review warnings');

console.log('Diagram truth enforcement check passed.');
