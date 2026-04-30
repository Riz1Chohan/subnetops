#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) failures.push(message); }
function assertIncludes(rel, text, message) { assert(read(rel).includes(text), message); }
const pkg = JSON.parse(read('package.json'));
assert(['0.81.0','0.82.0','0.83.0'].includes(pkg.version), 'Root package version must be 0.81.0 or successor 0.83.0 for Phase 81');
assert(Boolean(pkg.scripts['check:phase81-workspace-report-reconciliation']), 'Phase 81 check script must be wired');
assert(String(pkg.scripts['check:phase80-validation-diagram-reconciliation'] || '').includes('check:phase81-workspace-report-reconciliation'), 'Phase 80 chain must continue into Phase 81');
assert(read('backend/src/services/requirementsRuntimeProof.service.ts').includes('PHASE_81_WORKSPACE_REPORT_RECONCILIATION') || read('backend/src/services/requirementsRuntimeProof.service.ts').includes('PHASE_82_REPORT_GENERATION_UX_EXPORT_PROGRESS') || read('backend/src/services/requirementsRuntimeProof.service.ts').includes('PHASE_83_REQUIREMENT_PROPAGATION_COMPLETION_AUDIT'), 'Health/runtime proof marker must expose Phase 81 or successor Phase 82');
assert(read('backend/src/services/requirementsRuntimeProof.service.ts').includes('version: "0.81.0"') || read('backend/src/services/requirementsRuntimeProof.service.ts').includes('version: "0.82.0"') || read('backend/src/services/requirementsRuntimeProof.service.ts').includes('version: "0.83.0"'), 'Runtime proof marker must expose Phase 81 or successor Phase 82 version');
assertIncludes('frontend/src/styles.css', 'grid-template-rows: auto minmax(0, 1fr) auto auto', 'Project stage nav pane must reserve an independent scroll row');
assertIncludes('frontend/src/styles.css', 'height: calc(100vh - 116px)', 'Project stage nav pane must be viewport bounded');
assertIncludes('frontend/src/styles.css', 'overscroll-behavior: contain', 'Project stage card rail must contain scroll behavior');
assertIncludes('frontend/src/styles.css', 'scrollbar-gutter: stable', 'Project stage card rail must reserve scrollbar space');
assertIncludes('frontend/src/styles.css', 'project-stage-nav-list::-webkit-scrollbar', 'Project stage card rail must expose scrollbar styling');
assertIncludes('backend/src/services/exportDesignCoreReport.service.ts', 'Phase 83 Requirement Propagation Completion Audit', 'Report export must include Phase 81 reconciliation section');
assertIncludes('backend/src/services/exportDesignCoreReport.service.ts', 'Remaining blockers belong to implementation execution readiness, not to requirements materialization.', 'Report export must separate implementation blockers from requirement-output evidence');
assertIncludes('docs/doc/PHASE81-WORKSPACE-USABILITY-REPORT-RECONCILIATION.md', 'independent vertical scrolling', 'Phase 81 documentation must describe workspace scroll repair');
if (failures.length) {
  console.error('Phase 81 workspace/report reconciliation check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('Phase 81 workspace/report reconciliation checks passed.');
