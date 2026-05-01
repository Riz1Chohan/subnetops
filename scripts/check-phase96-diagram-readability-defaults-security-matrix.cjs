#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`Phase 96 check failed: ${message}`); process.exit(1); } }

const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const pkg = read('package.json');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const page = read('frontend/src/pages/ProjectDiagramPage.tsx');
const phase93 = read('scripts/check-phase93-diagram-scope-mode-layout-status.cjs');
const phase94 = read('scripts/check-phase94-diagram-usability-stale-layout-cleanup.cjs');
const phase95 = read('scripts/check-phase95-render-frontend-compile-fix.cjs');
const docs = read('docs/doc/PHASE96-DIAGRAM-READABILITY-DEFAULTS-SECURITY-MATRIX.md');

assert(/version: "0\.(9[6-9]|[1-9][0-9]{2,})\.0"/.test(runtime), 'runtime version not compatible with Phase 96 or later');
assert(runtime.includes('diagramReadabilityPolish: "PHASE_96_DIAGRAM_READABILITY_DEFAULTS_AND_SECURITY_MATRIX"'), 'runtime Phase 96 marker missing');
assert(/"version": "0\.(9[6-9]|[1-9][0-9]{2,})\.0"/.test(pkg), 'root package version not compatible with Phase 96 or later');
assert(pkg.includes('check:phase96-diagram-readability-defaults-security-matrix'), 'Phase 96 package script missing');
assert(pkg.includes('check:phase84-96-release'), 'Phase 84-96 aggregate script missing');

assert(canvas.includes('DiagramLabelMode'), 'canvas does not receive label mode for zoom/detail-aware rendering');
assert(canvas.includes('canvasZoom: number'), 'canvas does not receive canvas zoom for detail-aware labels');
assert(canvas.includes('compactLabels = labelMode === "essential" || canvasZoom < 0.75'), 'zoom/detail-aware compact labels missing');
assert(canvas.includes('DHCP/services are shown only in focused site drawings') || canvas.includes('Site physical can expose local VLAN/service detail only on request'), 'global DHCP/service clutter guard missing');
assert(canvas.includes('node.objectType === "dhcp-pool" && scope === "site"'), 'DHCP summaries are still allowed to pollute global physical/WAN views');
assert(canvas.includes('node.objectType === "subnet" && wantsAddressing'), 'logical subnet detail is not gated by addressing intent');
assert(canvas.includes('edge.relationship === "security-zone-applies-policy"'), 'security view does not limit to primary policy-map edges');
assert(canvas.includes('policyColumn') || canvas.includes('policyActionColumn'), 'security/boundary policy columns missing');
assert(canvas.includes('dedupeEdgesForReadableView'), 'edge dedupe for readable physical/WAN diagrams missing');
assert(canvas.includes('Detail panels stay out of the way until an object is selected'), 'canvas copy does not reflect collapsed detail-panel behavior');
assert(!canvas.includes('gridTemplateColumns: "minmax(720px, 1fr) minmax(260px, 340px)"'), 'right sidebar still steals default canvas width');
assert(canvas.includes('maxWidth: 720'), 'object detail panel is no longer constrained below the canvas');
assert(canvas.includes('mode === "physical" || scope === "wan-cloud"') && canvas.includes('return `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`'), 'physical/WAN links are not simplified');
assert(page.includes('labelMode={labelMode}') && page.includes('canvasZoom={canvasZoom}'), 'ProjectDiagramPage does not pass label/zoom controls into the canvas');
assert(page.includes('setActiveOverlays([])') && page.includes('setLabelMode("essential")') && page.includes('setLinkAnnotationMode("minimal")'), 'clean reset/default overlay behavior missing');
assert(phase93.includes('9[3-9]'), 'Phase 93 check is still pinned to old versions');
assert(phase94.includes('9[4-9]'), 'Phase 94 check is still pinned to old versions');
assert(phase95.includes('9[5-9]'), 'Phase 95 check is still pinned to 0.95.0');
assert(docs.includes('PHASE_96_DIAGRAM_READABILITY_DEFAULTS_AND_SECURITY_MATRIX'), 'Phase 96 docs marker missing');

const esbuild = path.join(root, 'frontend', 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
if (fs.existsSync(esbuild)) {
  execFileSync(esbuild, ['src/features/diagram/components/BackendDiagramCanvas.tsx', '--loader:.tsx=tsx', '--jsx=automatic', '--format=esm', '--outfile=/tmp/subnetops-phase96-diagram-canvas.js'], { cwd: path.join(root, 'frontend'), stdio: 'pipe' });
  execFileSync(esbuild, ['src/pages/ProjectDiagramPage.tsx', '--loader:.tsx=tsx', '--jsx=automatic', '--format=esm', '--outfile=/tmp/subnetops-phase96-diagram-page.js'], { cwd: path.join(root, 'frontend'), stdio: 'pipe' });
}

console.log('Phase 96 diagram readability/default/security matrix checks passed.');
process.exit(0);
