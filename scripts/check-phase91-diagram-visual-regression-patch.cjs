#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`Phase 91 check failed: ${message}`); process.exit(1); } }

const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const renderer = read('frontend/src/features/diagram/components/diagramRendererShared.tsx');
const pkg = read('package.json');
const phase90 = read('scripts/check-phase90-diagram-professional-topology-layout.cjs');
const docs = read('docs/doc/PHASE91-DIAGRAM-VISUAL-REGRESSION-PATCH.md');

assert(runtime.includes('diagramVisualRegressionPatch: "PHASE_91_DIAGRAM_VISUAL_REGRESSION_PATCH"'), 'runtime Phase 91 marker missing');
assert(runtime.includes('version: "0.91.0"'), 'runtime version not advanced to 0.91.0');
assert(pkg.includes('"version": "0.91.0"'), 'root package version not advanced to 0.91.0');
assert(pkg.includes('check:phase91-diagram-visual-regression-patch'), 'Phase 91 package script missing');
assert(pkg.includes('check:phase84-91-release'), 'Phase 84-91 aggregate script missing');

assert(canvas.includes('DeviceIcon, type DeviceKind'), 'backend topology canvas does not reuse the professional device icon family');
assert(canvas.includes('professionalDeviceKind'), 'canvas lacks role-to-icon mapping');
assert(canvas.includes('automaticIconScale'), 'canvas lacks automatic icon scaling for large topologies');
assert(canvas.includes('backend-diagram-grid-major'), 'canvas does not restore faint graph-paper grid background');
assert(canvas.includes('fill="#fbfdff"'), 'canvas does not restore bright paper-style background');
assert(canvas.includes('maxWidth: "none"'), 'canvas still lets CSS shrink the limitless topology canvas');
assert(canvas.includes('calculateCanvasBounds'), 'canvas lacks dynamic topology bounds calculation');
assert(canvas.includes('minWidth: `${canvasBounds.width}px`'), 'canvas does not force real scrollable canvas width');
assert(canvas.includes('Canvas expands with topology size'), 'canvas does not communicate expanding-canvas behavior');
assert(canvas.includes('readinessStroke'), 'canvas still risks white-on-white currentColor rendering');
assert(!canvas.includes('stroke="currentColor"'), 'canvas still uses currentColor for SVG strokes on the paper canvas');
assert(!canvas.includes('fill="var(--canvas-bg, #f7fbff)" opacity={0.9}'), 'old hazy overlay background is still present');
assert(!canvas.includes('return <rect x={-48} y={-28} width={96} height={56} rx={14}'), 'generic rectangle device fallback is still present');
assert(renderer.includes('export function DeviceIcon'), 'shared professional device icon renderer missing');
assert(phase90.includes('compatible runtime version missing for Phase 90 or later'), 'Phase 90 check is still pinned to exactly 0.90.0');
assert(docs.includes('PHASE_91_DIAGRAM_VISUAL_REGRESSION_PATCH'), 'Phase 91 docs marker missing');

console.log('Phase 91 diagram visual regression patch checks passed.');
process.exit(0);
