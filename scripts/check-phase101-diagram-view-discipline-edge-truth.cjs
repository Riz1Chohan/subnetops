const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error(`Phase 101 check failed: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(read('package.json'));
const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const doc = read('docs/doc/PHASE101-DIAGRAM-VIEW-DISCIPLINE-EDGE-TRUTH.md');

assert(/^0\.(101|102|103|104|105|106|107)\.0$/.test(pkg.version), 'root package version must be 0.101.0 or later compatible release version');
assert(pkg.scripts['check:phase101-diagram-view-discipline-edge-truth'], 'Phase 101 script missing');
assert(pkg.scripts['check:phase84-101-release'], 'Phase 84-101 release chain missing');
assert(/version: \"0\.(101|102|103|104|105|106|107)\.0\"/.test(runtime), 'runtime version not advanced to a compatible Phase 101+ version');
assert(runtime.includes('diagramViewDisciplineEdgeTruth: "PHASE_101_DIAGRAM_VIEW_DISCIPLINE_EDGE_TRUTH"'), 'Phase 101 runtime marker missing');
assert(canvas.includes('Phase 101: view-discipline pass locks physical views'), 'Phase 101 canvas marker missing');
assert(canvas.includes('physical topology is not a subnet chart'), 'physical view discipline guard missing');
assert(canvas.includes('physical per-site is a small equipment-path drawing') || canvas.includes('VLAN/subnet cards are deliberately absent here'), 'physical per-site VLAN/subnet suppression missing');
assert(canvas.includes('local ISP underlay'), 'explicit local ISP underlay connector missing');
assert(canvas.includes('firewall-to-core handoff'), 'firewall-to-core connector missing');
assert(canvas.includes('VPN must terminate on the security/VPN edge'), 'VPN edge termination comment missing');
assert(canvas.includes('notes must not accidentally turn every connector into a VPN tunnel'), 'underlay/overlay classifier safety guard missing');
assert(canvas.includes('function phase101TopologyLegend'), 'Phase 101 topology legend guard missing');
assert(canvas.includes('mode !== "physical" && scope !== "wan-cloud"'), 'topology legend must not pollute logical views');
assert(canvas.includes('policyActionBadge'), 'security matrix action badges missing');
assert(canvas.includes('Needs implementation evidence') || canvas.includes('Implementation blocker'), 'security matrix repeated implementation-blocked wording not compacted');
assert(canvas.includes('Each diagram mode uses its own layout contract') || canvas.includes('VLAN detail reserved for logical views'), 'user-facing view discipline copy missing');
assert(!canvas.includes('local internet handoff", "ready"'), 'old ambiguous local internet handoff connector still present');
assert(doc.includes('PHASE_101_DIAGRAM_VIEW_DISCIPLINE_EDGE_TRUTH'), 'Phase 101 documentation marker missing');

console.log('Phase 101 diagram view discipline and edge truth checks passed.');
