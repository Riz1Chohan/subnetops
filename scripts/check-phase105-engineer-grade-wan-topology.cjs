const fs = require('fs');

function assert(condition, message) {
  if (!condition) {
    console.error(`[phase105] ${message}`);
    process.exit(1);
  }
}

const canvas = fs.readFileSync('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx', 'utf8');
const runtime = fs.readFileSync('backend/src/services/requirementsRuntimeProof.service.ts', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const doc = fs.readFileSync('docs/doc/PHASE105-ENGINEER-GRADE-WAN-TOPOLOGY.md', 'utf8');

assert(/^0\.(105|106|107)\.0$/.test(pkg.version), 'package version must be 0.105.0 or compatible newer diagram release');
assert(runtime.includes('engineerGradeWanTopology: "PHASE_105_ENGINEER_GRADE_WAN_TOPOLOGY"'), 'runtime Phase 105 marker missing');
assert(doc.includes('PHASE_105_ENGINEER_GRADE_WAN_TOPOLOGY'), 'Phase 105 documentation marker missing');
assert(canvas.includes('PHASE_105_ENGINEER_GRADE_WAN_TOPOLOGY'), 'canvas Phase 105 marker missing');
assert(canvas.includes('never let raw backend relationship/model edges leak into professional physical/WAN drawings'), 'raw physical/WAN model-edge suppression missing');
assert(canvas.includes('const result: BackendDiagramRenderEdge[] = (mode === "physical" || scope === "wan-cloud"'), 'physical/WAN drawings must rebuild deterministic presentation edges only');
assert(canvas.includes('Security policy evidence belongs in the Security / Boundaries matrix'), 'security policy canvas separation missing');
assert(canvas.includes('scope === "wan-cloud" ? nodes.find(isPhase103VpnFabric) : undefined'), 'fabric guide must be hidden outside WAN / Cloud');
assert(canvas.includes('phase105-enterprise-site-cards'), 'fixed enterprise site card renderer missing');
assert(canvas.includes('phase107EnterpriseBoard(branches.length)') || canvas.includes('phase106EnterpriseColumns(branches.length)'), '10-site enterprise layout must use compact branch grid');
assert(canvas.includes('no VPN fabric, no cross-site tunnel rail') || canvas.includes('Physical / Global must stay a physical equipment-and-site view'), 'physical global must declare no overlay fabric intent');
assert(canvas.includes('Implementation blocker') && !canvas.includes('Needs implementation evidence" : executionReadinessText'), 'security matrix repeated weak evidence text must be compacted');

console.log('[phase105] engineer-grade WAN topology checks passed');
