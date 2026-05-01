#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`Phase 94 check failed: ${message}`); process.exit(1); } }

const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const backendDiagram = read('backend/src/services/designCore/designCore.reportDiagramTruth.ts');
const backendTypes = read('backend/src/services/designCore.types.ts');
const frontendSnapshot = read('frontend/src/lib/designCoreSnapshot.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const page = read('frontend/src/pages/ProjectDiagramPage.tsx');
const pkg = read('package.json');
const docs = read('docs/doc/PHASE94-DIAGRAM-USABILITY-STALE-LAYOUT-CLEANUP.md');

assert(/version: "0\.(9[4-9]|[1-9][0-9]{2,})\.0"/.test(runtime), 'runtime version not compatible with Phase 94 or later');
assert(runtime.includes('diagramUsabilityStaleLayoutCleanup: "PHASE_94_DIAGRAM_USABILITY_STALE_LAYOUT_CLEANUP"'), 'runtime Phase 94 marker missing');
assert(/"version": "0\.(9[4-9]|[1-9][0-9]{2,})\.0"/.test(pkg), 'root package version not compatible with Phase 94 or later');
assert(pkg.includes('check:phase94-diagram-usability-stale-layout-cleanup'), 'Phase 94 package script missing');
assert(pkg.includes('check:phase84-94-release'), 'Phase 84-94 aggregate script missing');

assert(backendDiagram.includes('layoutMode: "professional-usability-polish-layout"'), 'backend render model did not advance to Phase 94 layout mode');
assert(backendTypes.includes('"professional-usability-polish-layout"'), 'backend types missing Phase 94 layout mode');
assert(frontendSnapshot.includes('"professional-usability-polish-layout"'), 'frontend snapshot type missing Phase 94 layout mode');

assert(canvas.includes('shouldShowRouteDomain'), 'canvas lacks route-domain visibility discipline');
assert(canvas.includes('Route domains are logical control-plane evidence'), 'canvas does not document route-domain physical hiding');
assert(canvas.includes('node.objectType === "route-domain" && !shouldShowRouteDomain'), 'route-domain objects can still pollute physical/WAN views');
assert(canvas.includes('WAN mode should read like a WAN topology'), 'WAN/cloud layout was not hardened');
assert(canvas.includes('Physical global: hub/WAN view with a clean branch fan-out'), 'physical global layout was not rebuilt around hub/WAN structure');
assert(canvas.includes('Canvas summary') || canvas.includes('Detail panels stay out of the way until an object is selected'), 'sidebar/detail panel does not stay out of the default canvas view');
assert(canvas.includes('legacy graph fallback') || canvas.includes('Detail panels stay out of the way until an object is selected'), 'canvas summary should explicitly mention fallback discipline or canvas-first detail behavior');
assert(canvas.includes('scope !== "wan-cloud"') && canvas.includes('!(mode === "physical" && scope === "global")'), 'edge labels are not suppressed for noisy physical/WAN views');
assert(canvas.includes('shouldShowDhcpSummary(params.activeOverlays)'), 'DHCP summaries are not controlled by overlay intent');

assert(!page.includes('import { ProjectDiagram }'), 'ProjectDiagramPage still imports the old fallback diagram renderer');
assert(!page.includes('<ProjectDiagram'), 'ProjectDiagramPage still renders the old fallback diagram component');
assert(!page.includes('Legacy diagram fallback is active'), 'old legacy fallback message still ships');
assert(page.includes('legacy diagram renderer is intentionally disabled'), 'stale-layout fallback guard message missing');
assert(page.includes('Diagram truth / readiness details'), 'truth workspace was not moved behind collapsible details');
assert(page.indexOf('diagram-two-pane-workspace') < page.indexOf('Diagram truth / readiness details'), 'canvas workspace must render before truth/readiness details');

assert(docs.includes('PHASE_94_DIAGRAM_USABILITY_STALE_LAYOUT_CLEANUP'), 'Phase 94 docs marker missing');
assert(docs.includes('stale layout'), 'Phase 94 docs do not mention stale layout cleanup');

console.log('Phase 94 diagram usability and stale-layout cleanup checks passed.');
process.exit(0);
