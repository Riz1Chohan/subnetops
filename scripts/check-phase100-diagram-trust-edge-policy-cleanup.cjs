const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error(`Phase 100 check failed: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(read('package.json'));
const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const doc = read('docs/doc/PHASE100-DIAGRAM-TRUST-EDGE-POLICY-CLEANUP.md');

assert(pkg.version === '0.100.0', 'root package version must be 0.100.0');
assert(pkg.scripts['check:phase100-diagram-trust-edge-policy-cleanup'], 'Phase 100 script missing');
assert(pkg.scripts['check:phase84-100-release'], 'Phase 84-100 release chain missing');
assert(runtime.includes('version: "0.100.0"'), 'runtime version not advanced to 0.100.0');
assert(runtime.includes('diagramTrustEdgePolicyCleanup: "PHASE_100_DIAGRAM_TRUST_EDGE_POLICY_CLEANUP"'), 'Phase 100 runtime marker missing');
assert(canvas.includes('Phase 100: diagram trust pass removes raw database relationship labels'), 'Phase 100 canvas marker missing');
assert(canvas.includes('deny/block/isolate language wins before allow/approved language'), 'deny precedence policy classification guard missing');
assert(canvas.indexOf('\\bdeny\\b') < canvas.indexOf('\\ballow\\b'), 'deny classifier must appear before allow classifier');
assert(canvas.includes('return scope === "boundaries";'), 'route domain must be kept out of regular topology canvases');
assert(canvas.includes('return false;\n}'), 'DHCP fake-device suppression must be present');
assert(canvas.includes('Raw model edges like summary/route-domain relationships are not professional topology links'), 'WAN raw-edge filter missing');
assert(canvas.includes('edges.filter((edge) => edgeSemanticKind(edge) === "security-policy")'), 'physical/WAN raw relationship edge drop missing');
assert(canvas.includes('if (node.objectType === "site" && (mode === "physical" || scope === "wan-cloud")) return null;'), 'site bubble suppression missing');
assert(canvas.includes('noisyRelationshipLabel'), 'raw relationship label suppression missing');
assert(canvas.includes('IPsec VPN tunnel to HQ'), 'explicit HQ VPN tunnel connector missing');
assert(canvas.includes('firewall-to-core handoff'), 'edge/core handoff connector missing');
assert(canvas.includes('Physical and WAN views show sites as containers'), 'Phase 100 user-facing topology copy missing');
assert(doc.includes('PHASE_100_DIAGRAM_TRUST_EDGE_POLICY_CLEANUP'), 'Phase 100 documentation marker missing');

console.log('Phase 100 diagram trust, edge semantics, and policy cleanup checks passed.');
