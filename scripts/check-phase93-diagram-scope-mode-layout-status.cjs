#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`Phase 93 check failed: ${message}`); process.exit(1); } }

const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const backendDiagram = read('backend/src/services/designCore/designCore.reportDiagramTruth.ts');
const backendTypes = read('backend/src/services/designCore.types.ts');
const frontendSnapshot = read('frontend/src/lib/designCoreSnapshot.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const page = read('frontend/src/pages/ProjectDiagramPage.tsx');
const pkg = read('package.json');
const docs = read('docs/doc/PHASE93-DIAGRAM-SCOPE-MODE-LAYOUT-STATUS.md');

assert(runtime.includes('diagramScopeModeLayout: "PHASE_93_DIAGRAM_SCOPE_MODE_LAYOUT_STATUS"'), 'runtime Phase 93 marker missing');
assert(/version: "0\.(9[3-9]|[1-9][0-9]{2,})\.0"/.test(runtime), 'runtime version not compatible with Phase 93+');
assert(/"version": "0\.(9[3-9]|[1-9][0-9]{2,})\.0"/.test(pkg), 'root package version not compatible with Phase 93+');
assert(pkg.includes('check:phase93-diagram-scope-mode-layout-status'), 'Phase 93 package script missing');
assert(pkg.includes('check:phase84-93-release'), 'Phase 84-93 aggregate script missing');

assert(backendDiagram.includes('logicalRowsBySite'), 'backend render model does not emit logical VLAN/subnet rows');
assert(backendDiagram.includes('objectType: "vlan"'), 'backend render model missing VLAN render nodes');
assert(backendDiagram.includes('objectType: "subnet"'), 'backend render model missing subnet render nodes');
assert(backendDiagram.includes('relationship: "site-contains-vlan"'), 'backend render model missing site-to-VLAN relationships');
assert(backendDiagram.includes('relationship: "vlan-uses-subnet"'), 'backend render model missing VLAN-to-subnet relationships');
assert(backendDiagram.includes('professional-scope-mode-layout') || backendDiagram.includes('professional-usability-polish-layout'), 'backend render model did not advance to Phase 93 or later layout mode');
assert(backendTypes.includes('"professional-scope-mode-layout"'), 'backend type does not allow Phase 93 layout mode');
assert(frontendSnapshot.includes('"professional-scope-mode-layout"'), 'frontend snapshot type does not allow Phase 93 layout mode');

assert(canvas.includes('focusedSiteId?: string'), 'canvas does not accept focusedSiteId for per-site isolation');
assert(canvas.includes('nodeAllowedByScope'), 'canvas missing scope-specific node filter');
assert(canvas.includes('edgeAllowedByScope'), 'canvas missing scope-specific edge filter');
assert(canvas.includes('layoutNodesForView'), 'canvas missing mode/scope layout function');
assert(canvas.includes('scope === "site"'), 'canvas missing per-site scope logic');
assert(canvas.includes('scope === "wan-cloud"'), 'canvas missing WAN/cloud scope logic');
assert(canvas.includes('scope === "boundaries"'), 'canvas missing security boundary scope logic');
assert(canvas.includes('node.objectType === "vlan"') && canvas.includes('node.objectType === "subnet"'), 'logical view does not include VLAN/subnet objects');
assert(canvas.includes('edge.relationship === "security-zone-protects-subnet"') && canvas.includes('return false') || canvas.includes('edge.relationship !== "security-zone-protects-subnet"'), 'boundary view still risks zone-boundary spaghetti');
assert(canvas.includes('Design evidence') && canvas.includes('Execution readiness'), 'sidebar does not separate design evidence from execution readiness');
assert(canvas.includes('Sites shown') && canvas.includes('Hidden proof objects'), 'toolbar badges not converted to user-facing counts');
assert(canvas.includes('engineering review model') && !canvas.includes('technical proof model.`'), 'canvas should sanitize raw technical proof wording before display');
assert(page.includes('focusedSiteId={activeSiteId}'), 'ProjectDiagramPage does not pass active site focus to backend canvas');
assert(docs.includes('PHASE_93_DIAGRAM_SCOPE_MODE_LAYOUT_STATUS'), 'Phase 93 docs marker missing');

console.log('Phase 93 diagram scope, mode layout, and status checks passed.');
process.exit(0);
