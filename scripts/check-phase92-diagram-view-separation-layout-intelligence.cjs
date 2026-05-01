#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`Phase 92 check failed: ${message}`); process.exit(1); } }

const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const backendDiagram = read('backend/src/services/designCore/designCore.reportDiagramTruth.ts');
const backendTypes = read('backend/src/services/designCore.types.ts');
const frontendSnapshot = read('frontend/src/lib/designCoreSnapshot.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const page = read('frontend/src/pages/ProjectDiagramPage.tsx');
const check91 = read('scripts/check-phase91-diagram-visual-regression-patch.cjs');
const pkg = read('package.json');
const docs = read('docs/doc/PHASE92-DIAGRAM-VIEW-SEPARATION-LAYOUT-INTELLIGENCE.md');

assert(runtime.includes('diagramViewSeparationLayout: "PHASE_92_DIAGRAM_VIEW_SEPARATION_LAYOUT_INTELLIGENCE"'), 'runtime Phase 92 marker missing');
assert(/version: \"0\.(9[2-9]|[1-9][0-9]{2,})\.0\"/.test(runtime), 'runtime version not advanced to Phase 92 or later');
assert(/\"version\": \"0\.(9[2-9]|[1-9][0-9]{2,})\.0\"/.test(pkg), 'root package version not advanced to Phase 92 or later');
assert(pkg.includes('check:phase92-diagram-view-separation-layout-intelligence'), 'Phase 92 package script missing');
assert(pkg.includes('check:phase84-92-release'), 'Phase 84-92 aggregate script missing');

assert(backendDiagram.includes('professional-view-separated-layout') || backendDiagram.includes('professional-scope-mode-layout') || backendDiagram.includes('professional-usability-polish-layout'), 'backend render model did not advance to view-separated or later scope/mode layout');
assert(backendTypes.includes('"professional-view-separated-layout"'), 'backend render type does not allow Phase 92 layout mode');
assert(frontendSnapshot.includes('"professional-view-separated-layout"'), 'frontend snapshot type does not allow Phase 92 layout mode');
assert(backendDiagram.includes('!\/voice\/i.test(zone.name) || zone.subnetCidrs.length > 0 || zone.vlanIds.length > 0'), 'inactive voice zone filter missing');
assert(backendDiagram.includes('The current planning model uses'), 'internal phase wording cleanup missing from backend topology labels/notes');

assert(canvas.includes('explicitlyRequestsSecurity'), 'canvas lacks explicit security overlay gate');
assert(canvas.includes('explicitlyRequestsAddressing'), 'canvas lacks explicit addressing/services overlay gate');
assert(canvas.includes('nodeAllowedByView') || canvas.includes('Services is a summary layer'), 'services/security view separation logic missing');
assert(canvas.includes('mode === "physical"'), 'physical-view separation logic missing');
assert(canvas.includes('edge.relationship === "site-contains-device"'), 'physical view no longer guarantees site-device edges');
assert(canvas.includes('site-to-site|WAN edge path|internet\\/security edge') || canvas.includes('site-to-site|WAN edge path|internet\\/security edge|routing domain'), 'physical transport edge filter missing');
assert(canvas.includes('scope === "boundaries"') && canvas.includes('shouldShowDhcpSummary(activeOverlays)'), 'services overlay and security boundary separation missing');
assert(canvas.includes('cleanCanvasNote'), 'sidebar note sanitization missing');
assert(!canvas.includes('Phase 27 models'), 'known internal phase wording is still hard-coded in canvas');

assert(page.includes('authoritativeRenderSiteCount'), 'toolbar still uses stale frontend site count instead of authoritative render-model groups');
assert(page.includes('`${authoritativeRenderSiteCount} sites`'), 'toolbar site badge does not use authoritative render-model site count');
assert(check91.includes('compatible runtime version missing for Phase 91 or later'), 'Phase 91 check is still pinned to 0.91.0');
assert(docs.includes('PHASE_92_DIAGRAM_VIEW_SEPARATION_LAYOUT_INTELLIGENCE'), 'Phase 92 docs marker missing');

console.log('Phase 92 diagram view separation and layout intelligence checks passed.');
process.exit(0);
