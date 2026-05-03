#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
function fail(message) { console.error(`[phase16] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }
function read(file) { return fs.readFileSync(path.join(process.cwd(), file), 'utf8'); }
const pkg = JSON.parse(read('package.json'));
const backendPkg = JSON.parse(read('backend/package.json'));
const control = read('backend/src/services/designCore/designCore.phase16DiagramTruthControl.ts');
const types = read('backend/src/services/designCore.types.ts');
const designCore = read('backend/src/services/designCore.service.ts');
const validation = read('backend/src/services/validation.service.ts');
const report = read('backend/src/services/exportDesignCoreReport.service.ts');
const csv = read('backend/src/services/export.service.ts');
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
const diagramPage = read('frontend/src/pages/ProjectDiagramPage.tsx');
const renderTruth = read('backend/src/services/designCore/designCore.reportDiagramTruth.ts');
const inventory = read('backend/src/lib/phase0EngineInventory.ts');
const selftest = read('backend/src/lib/phase16DiagramTruthRendererLayout.selftest.ts');
const doc = read('docs/doc/PHASE16-DIAGRAM-TRUTH-RENDERER-LAYOUT.md');
assert(['0.108.0','0.109.0','0.110.0','0.111.0','0.112.0'].includes(pkg.version), 'package version must be 0.108.0, 0.109.0, 0.110.0, or 0.111.0');
assert(pkg.scripts['check:phase16-diagram-truth-renderer-layout'] === 'node scripts/check-phase16-diagram-truth-renderer-layout.cjs', 'root phase16 check script missing');
assert(backendPkg.scripts['engine:selftest:phase16-diagram-truth'] === 'tsx src/lib/phase16DiagramTruthRendererLayout.selftest.ts', 'backend phase16 selftest script missing');
for (const source of [control, types, designCore, validation, report, csv, frontendTypes, diagramPage, renderTruth, inventory, selftest, doc]) {
  assert(source.includes('PHASE16_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT'), 'phase16 marker missing from a required source');
}
assert(control.includes('BACKEND_ONLY_DIAGRAM_RENDERER_NO_PRETTY_GARBAGE'), 'phase16 role marker missing');
assert(control.includes('Every render node must carry backend objectId'), 'node identity proof boundary missing');
assert(control.includes('Every render edge must carry relatedObjectIds or a design graph relationship'), 'edge relationship proof boundary missing');
assert(types.includes('Phase16DiagramTruthControlSummary'), 'phase16 backend type missing');
assert(frontendTypes.includes('phase16DiagramTruth?: Phase16DiagramTruthControlSummary'), 'frontend phase16 snapshot type missing');
assert(designCore.includes('buildPhase16DiagramTruthControl') && designCore.includes('phase16DiagramTruth,'), 'design-core phase16 wiring missing');
assert(validation.includes('PHASE16_DIAGRAM_TRUTH_BLOCKING'), 'validation phase16 blocker wiring missing');
assert(report.includes('Phase 16 Diagram Truth / Renderer / Layout'), 'DOCX/PDF report phase16 section missing');
assert(csv.includes('Phase 16 Diagram Truth'), 'CSV export phase16 rows missing');
assert(renderTruth.includes('phase16-backend-truth-layout-contract'), 'backend render model layout contract missing');
assert(diagramPage.includes('Phase 16 diagram truth contract'), 'ProjectDiagramPage phase16 evidence panel missing');
assert(inventory.includes('currentPhase0Verdict: "CONTROLLED"') && inventory.includes('phase16DiagramTruth'), 'phase0 inventory phase16 not controlled');
console.log('[phase16] diagram truth / renderer / layout contract checks passed');
