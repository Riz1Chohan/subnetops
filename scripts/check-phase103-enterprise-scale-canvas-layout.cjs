const fs = require('fs');

function assert(condition, message) {
  if (!condition) {
    console.error(`[phase103] ${message}`);
    process.exit(1);
  }
}

const canvas = fs.readFileSync('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx', 'utf8');
const page = fs.readFileSync('frontend/src/pages/ProjectDiagramPage.tsx', 'utf8');
const runtime = fs.readFileSync('backend/src/services/requirementsRuntimeProof.service.ts', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const doc = fs.readFileSync('docs/doc/PHASE103-ENTERPRISE-SCALE-CANVAS-LAYOUT.md', 'utf8');

assert(/^0\.(103|104|105|106|107)\.0$/.test(pkg.version), 'package version must be 0.103.0 or a compatible newer diagram release');
assert(runtime.includes('enterpriseScaleCanvasLayout: "PHASE_103_ENTERPRISE_SCALE_CANVAS_AND_LAYOUT"'), 'runtime marker missing');
assert(doc.includes('PHASE_103_ENTERPRISE_SCALE_CANVAS_AND_LAYOUT'), 'phase 103 documentation marker missing');

assert(canvas.includes('PHASE103_ENTERPRISE_SITE_THRESHOLD = 7'), 'enterprise threshold must be explicit');
assert(canvas.includes('PHASE_103_SITE_SUMMARY_CARD'), 'site summary marker missing');
assert(canvas.includes('phase103WithSiteSummary'), 'site summary builder missing');
assert(canvas.includes('IPsec VPN overlay fabric'), 'VPN fabric node/label missing');
assert(canvas.includes('HQ VPN hub termination'), 'HQ fabric termination edge missing');
assert(canvas.includes('mode === "logical" && scope === "global" && orderedSites.some(isPhase103SiteSummaryNode)'), 'large logical global summary layout missing');
assert(canvas.includes('scope === "wan-cloud"') && (canvas.includes('phase107EnterpriseBoard(branches.length)') || canvas.includes('const columns = enterprise ? 3') || canvas.includes('branches.length >= 8 ? 5 : 4') || canvas.includes('phase106EnterpriseColumns(branches.length)')), 'WAN branch grid layout missing');
assert(canvas.includes('edgeSemanticKind(edge) === "vpn-overlay"'), 'VPN orthogonal rail path missing');
assert(canvas.includes('Open Logical / Per-site for full VLAN, subnet, gateway, and DHCP detail'), 'global summary detail handoff missing');
assert(!canvas.includes('/\x08(wan|vpn|sd-wan|edge)\x08/'), 'broken word-boundary regex must not be present');

assert(page.includes('viewSpecificLayerItems'), 'view-specific overlay filtering missing');
assert(page.includes('Large global logical view is summarized by site'), 'large global overlay notice missing');
assert(page.includes('Physical view is equipment and edge-path only'), 'physical overlay notice missing');

console.log('[phase103] enterprise scale canvas and layout checks passed');
