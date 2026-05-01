const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error(`Phase 87 check failed: ${message}`);
    process.exit(1);
  }
}

const release = read('backend/src/services/requirementsRuntimeProof.service.ts');
const designCore = read('backend/src/services/designCore.service.ts');
const routing = read('backend/src/services/designCore/designCore.routingSegmentation.ts');
const security = read('backend/src/services/designCore/designCore.securityPolicyFlow.ts');
const networkObject = read('backend/src/services/designCore/designCore.networkObjectModel.ts');
const validation = read('backend/src/services/validation.service.ts');
const report = read('backend/src/services/exportDesignCoreReport.service.ts');
const exportService = read('backend/src/services/export.service.ts');
const exportController = read('backend/src/controllers/export.controller.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const frontendVm = read('frontend/src/lib/backendSnapshotViewModel.ts');
const docs = read('docs/doc/PHASE87-READINESS-POLICY-WARNING-REPORT-DIAGRAM-STABILIZATION.md');

assert(release.includes('PHASE_87_READINESS_POLICY_WARNING_REPORT_DIAGRAM_STABILIZATION'), 'runtime release marker missing');
assert(designCore.includes('structuralDesignErrorCount') && designCore.includes('reviewOnlyEngineFindingCount'), 'design readiness split still collapses review-only engine findings into blocked');
assert(designCore.includes('!designMaterializedEvidenceReady || structuralDesignErrorCount > 0'), 'design review readiness must only block for missing materialized evidence or structural design errors');
assert(routing.includes('findPolicyActionForExpectation') && routing.includes('expectedAction === "deny"'), 'routing segmentation does not prefer explicit deny rules when validating deny expectations');
assert(security.includes('chooseObservedPolicyRule(matchedPolicyRules, expectedAction') || security.includes('chooseObservedPolicyRule(matchedPolicyRules, params.flowInput.expectedAction)'), 'security flow evaluator does not choose observed policy by expected action');
assert(networkObject.includes('policy-deny-general-internal-users-to-management'), 'internal users to management deny guardrail missing');
assert(networkObject.includes('policy-deny-guest-to-dmz'), 'guest to DMZ deny guardrail missing');
assert(networkObject.includes('policy-deny-general-wan-to-dmz'), 'general WAN to DMZ deny guardrail missing');
assert(security.includes('security-flow-phase87-internal-users-to-management-deny'), 'internal users to management deny flow missing');
assert(security.includes('security-flow-phase87-guest-to-dmz-deny'), 'guest to DMZ deny flow missing');
assert(security.includes('security-flow-phase87-general-wan-to-dmz-deny'), 'general WAN to DMZ deny flow missing');
assert(validation.includes('gatewayIsUsableConvention') && validation.includes('neither the first usable'), 'gateway warning logic is not based on first/last usable convention');
assert(!validation.includes('suggestedGatewayPattern,'), 'validation still imports last-octet-only gateway pattern helper');
assert(report.includes('ProfessionalReportMode') && report.includes('reportMode === "full-proof"'), 'report mode separation missing');
assert(report.includes('Requirement Output Verification') && report.includes('Design Trust and Policy Reconciliation'), 'professional report headings were not renamed');
assert(!report.includes('title: "Phase 83 Requirement Propagation Completion Audit"'), 'default professional report still has Phase 83 heading');
assert(!report.includes('title: "Phase 84 Design Trust and Policy Reconciliation"'), 'default professional report still has Phase 84 heading');
assert(exportService.includes('reportMode: ProfessionalReportMode = "professional"'), 'export service lacks default professional report mode');
assert(exportController.includes('parseReportMode') && exportController.includes('req.query.reportMode'), 'export controller does not expose reportMode query support');
assert((canvas.includes('visibleEdgesForView') && canvas.includes('visibleIds.add(edge.sourceNodeId)') && canvas.includes('backendOverlayKeysForActiveOverlays')) || (canvas.includes('buildVisibleDiagram') && canvas.includes('visibleIds.add(source.id)') && canvas.includes('visibleIds.add(target.id)')), 'diagram canvas does not preserve visible connected edges/endpoints');
assert(!canvas.includes('Phase 80 default hides'), 'diagram canvas still exposes internal phase wording');
assert(!frontendVm.includes('Phase 84 readiness split'), 'frontend summary still exposes internal phase wording');
assert(docs.includes('PHASE_87_READINESS_POLICY_WARNING_REPORT_DIAGRAM_STABILIZATION'), 'Phase 87 doc marker missing');
console.log('Phase 87 readiness, policy, warning, report, and diagram stabilization checks passed.');

process.exit(0);
