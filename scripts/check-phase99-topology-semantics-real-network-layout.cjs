const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error(`Phase 99 check failed: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(read('package.json'));
const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
const canvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const doc = read('docs/doc/PHASE99-TOPOLOGY-SEMANTICS-REAL-NETWORK-LAYOUT.md');

assert(/^0\.(99|1[0-9]{2})\.0$/.test(pkg.version), 'root package version must be 0.99.0 or later Phase 100 compatible version');
assert(pkg.scripts['check:phase99-topology-semantics-real-network-layout'], 'Phase 99 script missing');
assert(pkg.scripts['check:phase84-99-release'], 'Phase 84-99 release chain missing');
assert(/version:\s*"0\.(99|1[0-9]{2})\.0"/.test(runtime), 'runtime version not advanced to 0.99.0 or later Phase 100 compatible version');
assert(runtime.includes('topologySemanticsRealNetworkLayout: "PHASE_99_TOPOLOGY_SEMANTICS_REAL_NETWORK_LAYOUT"'), 'Phase 99 runtime marker missing');
assert(canvas.includes('Phase 99: topology semantics now separate local Internet underlay, VPN overlay, and internal site handoff paths'), 'Phase 99 canvas marker missing');
assert(canvas.includes('createLocalInternetNode'), 'local Internet breakout node factory missing');
assert(canvas.includes('addLocalInternetBreakouts'), 'local Internet breakout injection missing');
assert(canvas.includes('IPsec VPN tunnel to HQ'), 'explicit branch-to-HQ VPN overlay connector missing');
assert(canvas.includes('local internet handoff'), 'local Internet underlay connector missing');
assert(canvas.includes('edgeSemanticKind'), 'semantic edge style classifier missing');
assert(canvas.includes('phase99TopologyLegend'), 'topology legend missing');
assert(canvas.includes('phase99SiteContainers'), 'site container guide missing');
assert(!canvas.includes('add(wan, edgeDevice'), 'old global WAN-to-every-site connector still present');
assert(canvas.includes('Physical and WAN views separate local Internet underlay from VPN overlay and internal site handoffs.'), 'user-facing topology semantics copy missing');
assert(doc.includes('PHASE_99_TOPOLOGY_SEMANTICS_REAL_NETWORK_LAYOUT'), 'Phase 99 documentation marker missing');

console.log('Phase 99 topology semantics and real network layout checks passed.');
