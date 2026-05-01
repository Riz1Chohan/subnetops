#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`Phase 90 check failed: ${message}`);
    process.exit(1);
  }
}

const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const backendTypes = read('backend/src/services/designCore.types.ts');
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
const truth = read('backend/src/services/designCore/designCore.reportDiagramTruth.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const report = read('backend/src/services/exportDesignCoreReport.service.ts');
const pkg = read('package.json');
const phase89 = read('scripts/check-phase89-professional-report-audience-cleanup.cjs');
const docs = read('docs/doc/PHASE90-DIAGRAM-PROFESSIONAL-TOPOLOGY-LAYOUT.md');

assert(runtime.includes('diagramProfessionalLayout: "PHASE_90_DIAGRAM_PROFESSIONAL_TOPOLOGY_LAYOUT"'), 'runtime Phase 90 marker missing');
assert(/version:\s*"0\.(9[0-9]|1[0-9]{2})\.0"/.test(runtime), 'compatible runtime version missing for Phase 90 or later');
assert(/"version":\s*"0\.(9[0-9]|1[0-9]{2})\.0"/.test(pkg), 'compatible package version missing for Phase 90 or later');
assert(pkg.includes('check:phase90-diagram-professional-topology-layout'), 'Phase 90 package script missing');
assert(pkg.includes('check:phase84-90-release'), 'Phase 84-90 aggregate script missing');

assert(backendTypes.includes('"professional-topology-layout"'), 'backend render model type does not support professional topology layout');
assert(frontendTypes.includes('"professional-topology-layout"'), 'frontend render model type does not support professional topology layout');

assert(truth.includes('buildProfessionalTopologyRenderModel'), 'backend lacks professional topology render model builder');
assert(truth.includes('layoutMode: "professional-topology-layout"'), 'backend render model does not declare professional topology layout');
assert(truth.includes('render-edge-hub-spoke'), 'backend render model does not create hub-spoke topology edges');
assert(truth.includes('render-dhcp-summary'), 'backend render model does not collapse DHCP pools into readable site summaries');
assert(truth.includes('render-wan-internet-edge'), 'backend render model does not create a clear WAN/Internet edge node');
assert(!truth.includes('const graphNodes = networkObjectModel.designGraph.nodes.slice(0, 260);'), 'backend still uses raw graph-node slice as the primary diagram model');

assert(canvas.includes('Authoritative topology canvas'), 'frontend canvas still uses backend/debug title');
assert(canvas.includes('professional topology object(s)'), 'frontend canvas does not explain professional topology object filtering');
assert(canvas.includes('cleanCanvasLabel'), 'frontend canvas lacks label cleanup for raw ids');
assert(canvas.includes('Topology object'), 'frontend sidebar still exposes backend object language');
assert(!canvas.includes('<strong>Object ID</strong>'), 'frontend sidebar still exposes raw object IDs by default');
assert(!canvas.includes('Backend-authoritative diagram canvas'), 'frontend still uses old backend-authoritative canvas title');
assert(!canvas.includes('backend nodes'), 'frontend still describes raw backend node counts to users');

assert(report.includes('authoritative design model posture aligned'), 'professional report grammar cleanup for design model posture missing');
assert(report.includes('replace(/\\bbackend design-core\\b/gi, "authoritative design model")'), 'professional sanitizer does not clean backend design-core wording');
assert(phase89.includes('compatible runtime version missing for Phase 89 or later'), 'Phase 89 check is still pinned to exactly 0.89.0');
assert(docs.includes('PHASE_90_DIAGRAM_PROFESSIONAL_TOPOLOGY_LAYOUT'), 'Phase 90 docs marker missing');

console.log('Phase 90 diagram professional topology layout checks passed.');
process.exit(0);
