#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`Phase 95 check failed: ${message}`); process.exit(1); } }

const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const pkg = read('package.json');
const diagramPage = read('frontend/src/pages/ProjectDiagramPage.tsx');
const requirementsPage = read('frontend/src/pages/ProjectRequirementsPage.tsx');

assert(runtime.includes('version: "0.95.0"'), 'runtime version not advanced to 0.95.0');
assert(runtime.includes('renderFrontendCompileFix: "PHASE_95_RENDER_FRONTEND_COMPILE_FIX"'), 'runtime Phase 95 marker missing');
assert(pkg.includes('"version": "0.95.0"'), 'root package version not advanced to 0.95.0');
assert(pkg.includes('check:phase95-render-frontend-compile-fix'), 'Phase 95 package script missing');
assert(pkg.includes('check:phase84-95-release'), 'Phase 84-95 aggregate script missing');

assert(!diagramPage.includes('\n  );\n  );\n}'), 'ProjectDiagramPage still has duplicate return closer that breaks TSX parsing');
assert(diagramPage.includes('Diagram truth / readiness details'), 'Phase 94 canvas-first truth details were lost');
assert(diagramPage.includes('legacy diagram renderer is intentionally disabled'), 'stale layout guard was lost');

assert(requirementsPage.includes('const requirementsLoadErrorMessage = projectQuery.error instanceof Error'), 'requirements error message was not lifted out of JSX');
assert(requirementsPage.includes('message={requirementsLoadErrorMessage}'), 'requirements ErrorState does not use stable message constant');
assert(!requirementsPage.includes('message={projectQuery.error instanceof Error ? projectQuery.error.message'), 'fragile JSX ternary still exists in requirements ErrorState');

const esbuild = path.join(root, 'frontend', 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
if (fs.existsSync(esbuild)) {
  execFileSync(esbuild, ['src/pages/ProjectDiagramPage.tsx', '--loader:.tsx=tsx', '--jsx=automatic', '--format=esm', '--outfile=/tmp/subnetops-phase95-diagram-page.js'], { cwd: path.join(root, 'frontend'), stdio: 'pipe' });
  execFileSync(esbuild, ['src/pages/ProjectRequirementsPage.tsx', '--loader:.tsx=tsx', '--jsx=automatic', '--format=esm', '--outfile=/tmp/subnetops-phase95-requirements-page.js'], { cwd: path.join(root, 'frontend'), stdio: 'pipe' });
}

console.log('Phase 95 Render frontend compile fix checks passed.');
process.exit(0);
