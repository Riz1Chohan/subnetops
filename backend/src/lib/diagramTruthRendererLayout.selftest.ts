import assert from "node:assert/strict";
import { buildV1DiagramTruthControl, V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT } from "../services/designCore/designCore.diagramTruthControl.js";

const diagramTruth: any = {
  overallReadiness: "review",
  hasModeledTopology: true,
  topologySummary: { siteCount: 1, deviceCount: 1, interfaceCount: 1, linkCount: 1, routeDomainCount: 1, securityZoneCount: 1 },
  nodes: [],
  edges: [],
  overlaySummaries: [],
  hotspots: [],
  renderModel: {
    summary: {
      nodeCount: 6,
      edgeCount: 4,
      groupCount: 1,
      overlayCount: 4,
      backendAuthored: true,
      layoutMode: "V1-backend-truth-layout-contract",
      contractId: "V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT",
      truthContract: "backend-only-render-model",
      modeCount: 6,
    },
    nodes: [
      { id: "render-site-hq", objectId: "site-hq", objectType: "site", label: "HQ", layer: "site", readiness: "ready", truthState: "materialized", x: 100, y: 100, sourceEngine: "object-model", relatedFindingIds: [], notes: [] },
      { id: "render-device-core", objectId: "device-core", objectType: "network-device", label: "HQ Core", layer: "device", readiness: "ready", truthState: "materialized", x: 100, y: 180, sourceEngine: "object-model", relatedFindingIds: [], notes: [] },
      { id: "render-interface-core", objectId: "if-core-vlan10", objectType: "network-interface", label: "VLAN 10 SVI", layer: "interface", readiness: "ready", truthState: "materialized", x: 100, y: 250, sourceEngine: "object-model", relatedFindingIds: [], notes: [] },
      { id: "render-route-default", objectId: "rd-default", objectType: "route-domain", label: "Default VRF", layer: "routing", readiness: "review", truthState: "planned", x: 260, y: 100, sourceEngine: "routing", relatedFindingIds: [], notes: [] },
      { id: "render-zone-guest", objectId: "zone-guest", objectType: "security-zone", label: "Guest Zone", layer: "security", readiness: "review", truthState: "materialized", x: 420, y: 100, sourceEngine: "security", relatedFindingIds: [], notes: [] },
      { id: "render-step-guest", objectId: "step-guest-isolation", objectType: "implementation-step", label: "Verify guest isolation", layer: "implementation", readiness: "review", truthState: "planned", x: 420, y: 230, sourceEngine: "implementation", relatedFindingIds: [], notes: [] },
    ],
    edges: [
      { id: "edge-site-device", relationship: "site-contains-device", sourceNodeId: "render-site-hq", targetNodeId: "render-device-core", label: "contains", readiness: "ready", overlayKeys: ["addressing"], relatedObjectIds: ["site-hq", "device-core"], notes: [] },
      { id: "edge-interface-route", relationship: "interface-belongs-to-route-domain", sourceNodeId: "render-interface-core", targetNodeId: "render-route-default", label: "route domain", readiness: "review", overlayKeys: ["routing"], relatedObjectIds: ["if-core-vlan10", "rd-default"], notes: [] },
      { id: "edge-zone-policy", relationship: "security-zone-applies-policy", sourceNodeId: "render-zone-guest", targetNodeId: "render-step-guest", label: "policy consequence", readiness: "review", overlayKeys: ["security"], relatedObjectIds: ["zone-guest", "policy-guest-deny"], notes: [] },
      { id: "edge-step-verification", relationship: "implementation-step-targets-object", sourceNodeId: "render-step-guest", targetNodeId: "render-zone-guest", label: "verifies", readiness: "review", overlayKeys: ["implementation", "verification"], relatedObjectIds: ["step-guest-isolation", "zone-guest"], notes: [] },
    ],
    groups: [{ id: "site:site-hq", groupType: "site", label: "HQ", readiness: "ready", nodeIds: ["render-site-hq", "render-device-core", "render-interface-core"], notes: [] }],
    overlays: [],
  },
};

const networkObjectModel: any = {
  interfaces: [{ id: "if-core-vlan10" }],
  implementationPlan: { steps: [{ id: "step-guest-isolation" }], verificationChecks: [{ id: "verify-guest" }] },
};

const V1ReportExportTruth: any = { overallReadiness: "REVIEW_REQUIRED" };
const result = buildV1DiagramTruthControl({ diagramTruth, networkObjectModel, V1ReportExportTruth });

assert.equal(result.contract, V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT);
assert.equal(result.role, "BACKEND_ONLY_DIAGRAM_RENDERER_NO_PRETTY_GARBAGE");
assert.equal(result.backendAuthored, true);
assert.equal(result.nodesWithoutBackendObjectId, 0);
assert.equal(result.edgesWithoutRelatedObjects, 0);
assert.equal(result.modeContractCount, 6);
assert(result.modeContracts.some((row) => row.mode === "physical" && row.status === "AVAILABLE"));
assert(result.modeContracts.some((row) => row.mode === "security" && row.requiredBackendEvidence.includes("security zones")));
assert(result.renderCoverage.some((row) => row.rowType === "node" && row.renderId === "render-zone-guest" && row.modeImpacts.includes("security")));
assert(result.proofBoundary.some((line) => line.includes("Frontend canvas may lay out backend renderModel data")));
assert.equal(result.findings[0].code, "V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTROLLED");
console.log("[V1] Diagram truth/render/layout selftest passed");
