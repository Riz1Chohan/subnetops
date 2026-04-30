const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assertIncludes(file, text, message) {
  const body = read(file);
  if (!body.includes(text)) {
    throw new Error(`${message}: missing ${text} in ${file}`);
  }
}

function assertJson(path, check, message) {
  const data = JSON.parse(read(path));
  if (!check(data)) throw new Error(message);
}

assertJson('package.json', (pkg) => ['0.80.0','0.81.0'].includes(pkg.version), 'Root package version must be 0.80.0 or compatible Phase 81 for Phase 80');
assertJson('package.json', (pkg) => Boolean(pkg.scripts['check:phase80-validation-diagram-reconciliation']), 'Phase 80 check script must be wired');
assertJson('package.json', (pkg) => String(pkg.scripts['check:phase79-requirements-read-repair-materialization'] || '').includes('check:phase80-validation-diagram-reconciliation'), 'Phase 79 chain must continue into Phase 80');

assertJson('package.json', (pkg) => pkg.version === '0.81.0' || read('backend/src/services/requirementsRuntimeProof.service.ts').includes('PHASE_80_VALIDATION_DIAGRAM_RECONCILIATION'), 'Health/runtime proof marker must expose Phase 80 or compatible Phase 81');
assertJson('package.json', (pkg) => pkg.version === '0.81.0' || read('backend/src/services/requirementsRuntimeProof.service.ts').includes('version: "0.80.0"'), 'Runtime proof marker must expose Phase 80 or compatible Phase 81 version');

assertIncludes('backend/src/services/validation.service.ts', 'ensureRequirementsMaterializedForRead(projectId, "SubnetOps validation", "validation-read")', 'Validation must repair saved requirements before reading rows');
assertIncludes('backend/src/services/validation.service.ts', 'return runValidation(projectId);', 'Validation GET must return reconciled live validation, not stale persisted rows');
assertIncludes('backend/src/services/validation.service.ts', 'Phase 80: validation reads must reconcile', 'Validation stale-state guard must be documented inline');

assertIncludes('backend/src/services/export.service.ts', 'import { runValidation } from "./validation.service.js";', 'Export must import validation refresh');
assertIncludes('backend/src/services/export.service.ts', 'await runValidation(projectId);', 'Export must refresh validation after read-repair before composing report data');
assertIncludes('backend/src/services/export.service.ts', 'Phase 80: export validation detail must be generated', 'Export stale-validation reconciliation must be documented inline');

assertIncludes('backend/src/services/designCore/designCore.routingSegmentation.ts', 'hubTransitPathForDestination', 'Routing validation must model hub-transit branch-to-branch paths');
assertIncludes('backend/src/services/designCore/designCore.routingSegmentation.ts', 'Phase 80 hub-transit reconciliation', 'Routing checks must annotate hub-transit reconciliation evidence');
assertIncludes('backend/src/services/designCore/designCore.routingSegmentation.ts', 'combineRouteLegStates', 'Routing checks must combine multi-leg route state instead of assuming full mesh');

assertIncludes('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx', 'visibleNodeSet(renderModel, mode, scope, activeOverlays)', 'Diagram canvas must use a filtered visible node set');
assertIncludes('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx', 'Phase 80 default hides DHCP, implementation, and verification proof nodes', 'Diagram canvas must explain that proof nodes are hidden by default');
assertIncludes('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx', 'visibleNodes.map((node)', 'Diagram canvas must render the filtered node set');
assertIncludes('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx', 'visibleNodeIds.has(edge.sourceNodeId)', 'Diagram canvas must hide edges whose endpoints are hidden');

console.log('Phase 80 validation/diagram reconciliation static checks passed');
