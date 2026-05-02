const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error(`Phase 98 check failed: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(read('package.json'));
const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const doc = read('docs/doc/PHASE98-DIAGRAM-SEMANTICS-PROFESSIONAL-RENDERING.md');

assert(/^0\.(98|99)\.0$/.test(pkg.version), 'root package version must be 0.98.0 or later Phase 99 compatible version');
assert(pkg.scripts['check:phase98-diagram-semantics-professional-rendering'], 'Phase 98 script missing');
assert(pkg.scripts['check:phase84-98-release'], 'Phase 84-98 release chain missing');
assert(runtime.includes('version: "0.98.0"') || runtime.includes('version: "0.99.0"'), 'runtime version not advanced to 0.98.0 or later Phase 99 compatible version');
assert(runtime.includes('diagramSemanticsProfessionalRendering: "PHASE_98_DIAGRAM_SEMANTICS_PROFESSIONAL_RENDERING"'), 'Phase 98 runtime marker missing');
assert(canvas.includes('function supplementPresentationEdges'), 'presentation connector supplement missing');
assert(canvas.includes('firewall-to-core handoff'), 'firewall-to-core handoff connector missing');
assert(canvas.includes('SecurityPolicyMatrixPanel'), 'security policy matrix component missing');
assert(canvas.includes('Source zone') && canvas.includes('Allowed / permitted') && canvas.includes('Denied / isolated'), 'security matrix table columns missing');
assert(canvas.includes('Filtered evidence'), 'production-friendly filtered evidence wording missing');
assert(!canvas.includes('Hidden proof objects'), 'debug wording still leaks into diagram UI');
assert(canvas.includes('policy rules are shown as readable matrix rows') || canvas.includes('Policy rules are shown as readable matrix rows'), 'matrix-readable copy missing');
assert(doc.includes('PHASE_98_DIAGRAM_SEMANTICS_PROFESSIONAL_RENDERING'), 'Phase 98 documentation marker missing');

console.log('Phase 98 diagram semantics and professional rendering checks passed.');
