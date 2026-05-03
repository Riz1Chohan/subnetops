const fs = require('fs');

function assert(condition, message) {
  if (!condition) {
    console.error(`[phase104] ${message}`);
    process.exit(1);
  }
}

const canvas = fs.readFileSync('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx', 'utf8');
const runtime = fs.readFileSync('backend/src/services/requirementsRuntimeProof.service.ts', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const doc = fs.readFileSync('docs/doc/PHASE104-ENTERPRISE-WAN-FABRIC-POLISH.md', 'utf8');

assert(/^0\.(104|105|106|107|108|109|110|111|112)\.0$/.test(pkg.version), 'package version must be 0.104.0 or compatible newer diagram release');
assert(runtime.includes('enterpriseWanFabricPolish: "PHASE_104_ENTERPRISE_WAN_FABRIC_POLISH"'), 'runtime Phase 104 marker missing');
assert(doc.includes('PHASE_104_ENTERPRISE_WAN_FABRIC_POLISH'), 'Phase 104 documentation marker missing');
assert(canvas.includes('PHASE_104_ENTERPRISE_WAN_FABRIC_POLISH'), 'canvas Phase 104 marker missing');
assert(canvas.includes('only the WAN / Cloud view owns the enterprise overlay fabric'), 'physical global must not own WAN fabric');
assert(canvas.includes('if (scope !== "wan-cloud") return nodes;'), 'VPN fabric must be restricted to WAN / Cloud scope');
assert(canvas.includes('large Physical / Global suppresses cross-site tunnel overlays entirely'), 'large physical global cross-site tunnel suppression missing');
assert(canvas.includes('branch tunnel edges to the enterprise fabric become clean vertical stubs'), 'vertical WAN fabric stub routing missing');
assert(canvas.includes('point.x + 660') || canvas.includes('bounds.width - 230'), 'fabric guide must span the enterprise branch grid');
assert(canvas.includes('scope === "site" || wantsAddressing') && canvas.includes('edge.relationship === "vlan-uses-subnet"'), 'Logical / Per-site must show subnet detail by default');
assert(canvas.includes('!visibleNodes.some(isPhase103SiteSummaryNode) ? phase97LogicalSiteGuides'), 'logical summary board must suppress oversized site-lane guides');
assert(canvas.includes('enterpriseView && (scope === "wan-cloud" || mode === "physical") && count > 1') || canvas.includes('suppressEnterpriseRepeatedLabel'), 'duplicate enterprise link labels must be suppressed');
assert(canvas.includes('board.gapY') || canvas.includes('gapY = enterprise ? 320') || canvas.includes('gapY = enterprise ? 275') || canvas.includes('Math.floor(index / columns) * 440'), 'WAN enterprise row spacing must prevent site-card overlap');
assert(canvas.includes('board.gapY') || canvas.includes('gapY = enterprise ? 300') || canvas.includes('gapY = enterprise ? 260') || canvas.includes('Math.floor(index / columns) * 420'), 'physical enterprise row spacing must prevent site-card overlap');

console.log('[phase104] enterprise WAN fabric polish checks passed');
