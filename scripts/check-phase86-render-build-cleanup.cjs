#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function assert(condition, message) { if (!condition) { console.error(`Phase 86 check failed: ${message}`); process.exit(1); } }
const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
assert(runtime.includes('PHASE_86_RENDER_BUILD_CLEANUP'), 'runtime Phase 86 marker missing');
assert(/version:\s*"0\.(8[6-9]|9[0-9])\.0"/.test(runtime), 'runtime version was not advanced to at least 0.86.0');
const service = read('backend/src/services/designCore.service.ts');
assert(service.includes('function countNetworkObjectModelObjects(summary: NetworkObjectModelSummary)'), 'backend object-count compatibility helper missing');
assert(!service.includes('networkObjectModel.summary.networkObjectCount'), 'backend still reads nonexistent NetworkObjectModelSummary.networkObjectCount');
assert(service.includes('const designReviewReadiness: DesignTruthReadiness'), 'design review readiness is not explicitly typed');
assert(service.includes('networkObjectCount,'), 'summary does not reuse computed networkObjectCount');
const requirementsPage = read('frontend/src/pages/ProjectRequirementsPage.tsx');
assert(requirementsPage.split(/\r?\n/).length > 1600, 'ProjectRequirementsPage appears truncated');
assert(requirementsPage.includes('message={projectQuery.error instanceof Error ? projectQuery.error.message') || requirementsPage.includes('message={requirementsLoadErrorMessage}'), 'ProjectRequirementsPage error render is missing a stable error message');
assert(requirementsPage.includes('Continue to Logical Design'), 'ProjectRequirementsPage focused view tail is missing');
assert(exists('frontend/src/assets/networks-logo.png'), 'frontend logo asset missing');
assert(exists('frontend/src/router/index.tsx'), 'frontend router module missing');
assert(exists('frontend/src/pages/ProjectReportPage.tsx'), 'ProjectReportPage module missing');
assert(exists('frontend/src/vite-env.d.ts'), 'vite env typings missing');
const doc = read('docs/doc/PHASE86-RENDER-BUILD-CLEANUP.md');
assert(doc.includes('PHASE_86_RENDER_BUILD_CLEANUP'), 'Phase 86 doc marker missing');
const pkg = read('package.json');
assert(pkg.includes('check:phase86-render-build-cleanup'), 'root package check script missing');
console.log('Phase 86 Render build cleanup checks passed.');

process.exit(0);
