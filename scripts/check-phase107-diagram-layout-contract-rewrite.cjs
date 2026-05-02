const fs = require('fs');

function assert(condition, message) {
  if (!condition) {
    console.error(`[phase107] ${message}`);
    process.exit(1);
  }
}

const canvas = fs.readFileSync('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx', 'utf8');
const runtime = fs.readFileSync('backend/src/services/requirementsRuntimeProof.service.ts', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const doc = fs.readFileSync('docs/doc/PHASE107-DIAGRAM-LAYOUT-CONTRACT-REWRITE.md', 'utf8');

assert(pkg.version === '0.107.0', 'package version must be 0.107.0');
assert(canvas.includes('PHASE_107_DIAGRAM_LAYOUT_CONTRACT_REWRITE'), 'Phase 107 marker missing in canvas');
assert(runtime.includes('PHASE_107_DIAGRAM_LAYOUT_CONTRACT_REWRITE'), 'Phase 107 marker missing in runtime proof');
assert(doc.includes('PHASE_107_DIAGRAM_LAYOUT_CONTRACT_REWRITE'), 'Phase 107 documentation marker missing');
assert(canvas.includes('function phase107EnterpriseBoard'), 'dedicated enterprise board helper missing');
assert(canvas.includes('function phase107BranchPlacement'), 'dedicated branch placement helper missing');
assert(canvas.includes('function phase107EnterpriseCardMetrics'), 'dedicated enterprise card metrics helper missing');
assert(canvas.includes('phase107SummaryColumns'), 'logical global summary contract missing');
assert(canvas.includes('Logical / Per-site gets its own distribution-to-segment contract'), 'logical per-site contract comment missing');
assert(canvas.includes('distribution-to-segment handoff'), 'logical per-site generated segment handoff edge missing');
assert(canvas.includes('scope !== "site" && edge.relationship === "site-contains-vlan"'), 'raw logical site-to-VLAN edges must be suppressed in per-site view');
assert(canvas.includes('const guideWidth = compact ? 178 : 250'), 'compact branch ISP guide width must keep WAN drops away from ISP labels');
assert(canvas.includes('point.x - 720') && canvas.includes('point.x + 660'), 'WAN fabric guide must be centered on the fabric node, not the whole SVG bounds');
assert(!canvas.includes('setEdgePair(site, x - 54, x + 72, y + 205)'), 'old branch gateway placement outside the card must not remain');
assert(canvas.includes('no VPN fabric, no cross-site tunnel rail'), 'physical global no-overlay contract missing');
assert(canvas.includes('Each diagram mode uses its own layout contract'), 'diagram explanatory copy must reflect separate layout contracts');
console.log('[phase107] diagram layout contract rewrite checks passed');
