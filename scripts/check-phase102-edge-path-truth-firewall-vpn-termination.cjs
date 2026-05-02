const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error(`Phase 102 check failed: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(read('package.json'));
const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const doc = read('docs/doc/PHASE102-EDGE-PATH-TRUTH-FIREWALL-VPN-TERMINATION.md');

assert(/^0\.(102|103|104|105)\.0$/.test(pkg.version), 'root package version must preserve Phase 102 or newer release version');
assert(pkg.scripts['check:phase102-edge-path-truth-firewall-vpn-termination'], 'Phase 102 script missing');
assert(pkg.scripts['check:phase84-102-release'], 'Phase 84-102 release chain missing');
assert(runtime.includes('edgePathTruthFirewallVpnTermination: "PHASE_102_EDGE_PATH_TRUTH_FIREWALL_VPN_TERMINATION"'), 'runtime must preserve Phase 102 marker after later releases');
assert(runtime.includes('edgePathTruthFirewallVpnTermination: "PHASE_102_EDGE_PATH_TRUTH_FIREWALL_VPN_TERMINATION"'), 'Phase 102 runtime marker missing');
assert(canvas.includes('Phase 102: edge-path truth makes security/VPN edge detection label-first'), 'Phase 102 canvas marker missing');
assert(canvas.includes('function hasSecurityFirewallLabel'), 'label-first firewall helper missing');
assert(canvas.includes('function isSecurityOrVpnEdgeDevice'), 'security/VPN edge helper missing');
assert(canvas.includes('notes may say a core gateway participates in security/VPN decisions'), 'notes cannot steal firewall role guard missing');
assert(canvas.includes('function securityOrVpnEdgeForSite'), 'site security/VPN edge selector missing');
assert(canvas.includes('function coreInsideDeviceForSite'), 'site core inside selector missing');
assert(canvas.includes('VPN must terminate on the label-identified security/VPN edge'), 'VPN termination comment missing');
assert(canvas.includes('local ISP/Internet -> security or VPN edge -> core/distribution'), 'explicit edge path comment missing');
assert(canvas.includes('core gateway into a firewall icon'), 'label-first icon role guard missing');
assert(canvas.includes('add(localInternet, edgeDevice, "local ISP underlay", "ready")'), 'local ISP must connect to edge device');
assert(canvas.includes('add(edgeDevice, coreDevice, "firewall-to-core handoff", "ready")'), 'edge device must connect inward to core device');
assert(doc.includes('PHASE_102_EDGE_PATH_TRUTH_FIREWALL_VPN_TERMINATION'), 'Phase 102 documentation marker missing');

console.log('Phase 102 edge path truth and firewall/VPN termination checks passed.');
