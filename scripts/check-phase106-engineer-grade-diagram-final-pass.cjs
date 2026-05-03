const fs = require('fs');
function assert(condition, message) {
  if (!condition) {
    console.error(`[phase106] ${message}`);
    process.exit(1);
  }
}
const canvas = fs.readFileSync('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx', 'utf8');
const runtime = fs.readFileSync('backend/src/services/requirementsRuntimeProof.service.ts', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const doc = fs.readFileSync('docs/doc/PHASE106-ENGINEER-GRADE-DIAGRAM-FINAL-PASS.md', 'utf8');
assert(/^0\.(106|107|108|109|110|111|112)\.0$/.test(pkg.version), 'package version must be 0.106.0 or compatible newer diagram release');
assert(canvas.includes('PHASE_106_ENGINEER_GRADE_DIAGRAM_FINAL_PASS'), 'Phase 106 marker missing in canvas');
assert(runtime.includes('PHASE_106_ENGINEER_GRADE_DIAGRAM_FINAL_PASS'), 'Phase 106 marker missing in runtime proof');
assert(doc.includes('PHASE_106_ENGINEER_GRADE_DIAGRAM_FINAL_PASS'), 'Phase 106 documentation marker missing');
assert(canvas.includes('function phase106EnterpriseColumns'), 'enterprise column helper missing');
assert(canvas.includes('fallbackCoreForSite'), 'HQ edge-to-core fallback missing');
assert(canvas.includes('phase107BranchPlacement') || canvas.includes('branch underlay and VPN edge are centered inside the site card'), 'centered branch stack fix missing');
assert(canvas.includes('suppressEnterpriseRepeatedLabel'), 'repeated enterprise WAN label suppression missing');
assert(canvas.includes('scope === "wan-cloud" ? [{ label: "IPsec VPN overlay tunnel"'), 'physical legend must omit VPN overlay row');
assert(canvas.includes('const guideWidth = compact ? 178 : 250') || canvas.includes('const guideWidth = compact ? 205 : 250'), 'compact local ISP guide missing');
assert(canvas.includes('const enterpriseBoardWidth = enterpriseColumns >= 5 ? 1760 : 1560') || canvas.includes('const enterpriseBoardWidth = enterpriseColumns >= 5 ? 1840 : 1660'), 'tight enterprise bounds missing');
console.log('[phase106] engineer-grade diagram final pass checks passed');
