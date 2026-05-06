#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function fail(message) {
  console.error(`[diagram-graph-lineage-enforcement] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const types = read('backend/src/domain/diagram/types.ts');
const lineage = read('backend/src/domain/diagram/lineage.ts');
const renderModel = read('backend/src/domain/diagram/render-model.ts');
const coverage = read('backend/src/domain/diagram/coverage.ts');
const control = read('backend/src/services/designCore/designCore.diagramTruthControl.ts');
const backendTypes = read('backend/src/services/designCore.types.ts');
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const domainSelftest = read('backend/src/domain/diagram/diagram-domain.selftest.ts');
const packageJson = JSON.parse(read('package.json'));
const quality = String(packageJson.scripts['check:quality'] || '');
const regression = read('scripts/check-regression-kill-switches.cjs');
const readme = read('README.md');

for (const token of ['DiagramLineageStatus', 'GRAPH_BACKED', 'GRAPH_RELATIONSHIP_BACKED', 'AGGREGATED_BACKEND_EVIDENCE', 'VISUAL_ONLY_NON_EVIDENCE', 'BLOCKED_LINEAGE']) {
  assert(types.includes(token), `domain diagram types must include ${token}`);
  assert(backendTypes.includes(token.replace('DiagramLineageStatus', 'BackendDiagramLineageStatus')) || backendTypes.includes(token), `backend snapshot types must include ${token}`);
  assert(frontendTypes.includes(token.replace('DiagramLineageStatus', 'BackendDiagramLineageStatus')) || frontendTypes.includes(token), `frontend snapshot types must include ${token}`);
}

for (const field of ['lineageStatus', 'graphNodeId', 'graphEdgeIds', 'implementationEvidence', 'lineageRefs']) {
  assert(types.includes(field), `diagram types must expose ${field}`);
  assert(renderModel.includes(field), `render model must materialize ${field}`);
  assert(backendTypes.includes(field), `backend snapshot types must expose ${field}`);
  assert(frontendTypes.includes(field), `frontend snapshot types must expose ${field}`);
  assert(canvas.includes(field), `frontend canvas must surface ${field}`);
}

assert(lineage.includes('applyDiagramGraphLineage'), 'diagram lineage domain must expose applyDiagramGraphLineage');
assert(lineage.includes('missing-design-graph-node') && lineage.includes('missing-design-graph-edge'), 'lineage domain must emit missing graph lineage refs');
assert(lineage.includes("VISUAL_ONLY_NON_EVIDENCE") && lineage.includes("? false : implementationEvidenceFor"), 'visual-only diagram elements must be non-evidence');
assert(renderModel.includes('applyDiagramGraphLineage({ nodes, edges, designGraph: networkObjectModel.designGraph })'), 'render model must apply graph lineage before returning nodes/edges');
assert(renderModel.includes('nodesWithoutGraphLineage') && renderModel.includes('edgesWithoutGraphLineage'), 'assertBackendDiagramRenderModel must inspect graph lineage');
assert(coverage.includes('hasGraphLineage') && coverage.includes('implementationEvidence'), 'diagram coverage must expose graph lineage and implementation evidence status');
assert(control.includes('V1_DIAGRAM_GRAPH_LINEAGE_MISSING'), 'diagram truth control must block missing graph lineage');
assert(control.includes('V1_VISUAL_ONLY_IMPLEMENTATION_EVIDENCE_LEAK'), 'diagram truth control must block visual-only implementation evidence');
assert(canvas.includes('VISUAL_ONLY_NON_EVIDENCE') && canvas.includes('not implementation evidence'), 'frontend presentation-only elements must be marked non-evidence');
assert(domainSelftest.includes('nodesWithoutGraphLineage') && domainSelftest.includes('edgesWithoutGraphLineage'), 'diagram selftest must assert graph lineage');
assert(quality.includes('check-diagram-graph-lineage-enforcement.cjs'), 'check:quality must include diagram graph lineage guard');
assert(regression.includes('check-diagram-graph-lineage-enforcement.cjs'), 'regression kill switches must include diagram graph lineage guard');
assert(readme.includes('Diagram graph lineage enforcement'), 'README must document diagram graph lineage enforcement');

console.log('[diagram-graph-lineage-enforcement] ok');
