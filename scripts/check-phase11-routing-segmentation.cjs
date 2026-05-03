const fs = require('fs');
const path = require('path');
const root = process.cwd();
const checks = [
  ['backend/src/services/designCore/designCore.phase11RoutingSegmentationControl.ts', ['PHASE11_ROUTING_SEGMENTATION_PROTOCOL_AWARE_PLANNING_CONTRACT', 'ROUTING_INTENT_REVIEW_NOT_PACKET_SIMULATION', 'ROUTING_SIMULATION_UNAVAILABLE', 'cloud-route-table', 'route-leaking', 'asymmetric-routing', 'buildPhase11RoutingSegmentationControl']],
  ['backend/src/services/designCore/designCore.routingSegmentation.ts', ['routeIntents', 'routeEntries', 'siteReachabilityChecks', 'segmentationExpectations']],
  ['backend/src/services/designCore.types.ts', ['Phase11RoutingSegmentationControlSummary', 'Phase11ProtocolIntentRow', 'Phase11RequirementRoutingMatrixRow', 'phase11RoutingSegmentation']],
  ['backend/src/services/designCore.service.ts', ['buildPhase11RoutingSegmentationControl', 'phase11RoutingSegmentation']],
  ['backend/src/services/validation.service.ts', ['PHASE11_ROUTING_SEGMENTATION_BLOCKING', 'PHASE11_ROUTING_SEGMENTATION_REVIEW_REQUIRED']],
  ['backend/src/services/export.service.ts', ['Phase 11 Routing Segmentation Protocol-Aware Planning', 'Phase 11 Protocol Intent Rows', 'Phase 11 Requirement Routing Matrix']],
  ['backend/src/services/exportDesignCoreReport.service.ts', ['Phase 11 Routing Segmentation Protocol-Aware Planning', 'OSPF', 'BGP', 'ECMP', 'It is not a packet simulator']],
  ['frontend/src/lib/designCoreSnapshot.ts', ['Phase11RoutingSegmentationControlSummary', 'phase11RoutingSegmentation', 'ROUTING_SIMULATION_UNAVAILABLE']],
  ['frontend/src/pages/ProjectOverviewPage.tsx', ['Phase 11 routing segmentation protocol-aware planning', 'protocolIntents', 'requirementRoutingMatrix', 'Simulation unavailable']],
  ['backend/src/lib/phase0EngineInventory.ts', ['designCore.phase11RoutingSegmentationControl.ts', 'phase11RoutingSegmentation.selftest.ts', 'simulation-unavailable protocol rows', 'currentPhase0Verdict: "CONTROLLED"']],
  ['backend/src/lib/phase11RoutingSegmentation.selftest.ts', ['Routing segmentation protocol-aware planning selftest passed', 'PHASE11_ROUTING_SEGMENTATION_PROTOCOL_AWARE_PLANNING_CONTRACT']],
  ['docs/doc/PHASE11-ROUTING-SEGMENTATION-PROTOCOL-AWARE-PLANNING.md', ['PHASE11_ROUTING_SEGMENTATION_PROTOCOL_AWARE_PLANNING_CONTRACT', 'routing intent', 'routing review', 'routing simulation unavailable', 'not a packet simulator']],
  ['package.json', ['check:phase11-routing-segmentation', 'check:phase11-107-release']],
  ['backend/package.json', ['engine:selftest:phase11-routing-segmentation']],
];
const failures = [];
for (const [file, markers] of checks) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { failures.push(`${file}: missing file`); continue; }
  const text = fs.readFileSync(full, 'utf8');
  for (const marker of markers) if (!text.includes(marker)) failures.push(`${file}: missing marker ${marker}`);
}
if (failures.length) { console.error('[phase11] Routing segmentation protocol-aware planning checks failed'); failures.forEach((f) => console.error(`- ${f}`)); process.exit(1); }
console.log('[phase11] Routing segmentation protocol-aware planning checks passed');
