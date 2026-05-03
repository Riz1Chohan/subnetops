import assert from "node:assert/strict";
import {
  V1_DISCOVERY_CURRENT_STATE_CONTRACT,
  buildV1DiscoveryCurrentStateControl,
} from "../services/designCore/designCore.discoveryCurrentStateControl.js";

const networkObjectModel: any = {
  summary: { deviceCount: 5, interfaceCount: 12, linkCount: 4, routeDomainCount: 2, securityZoneCount: 4, policyRuleCount: 3, natRuleCount: 1, dhcpPoolCount: 2, ipReservationCount: 1 },
  devices: [],
  interfaces: [],
  routeDomains: [],
  securityZones: [],
  links: [],
  policyRules: [],
  natRules: [],
  dhcpPools: [],
  ipReservations: [],
  designGraph: { summary: { nodeCount: 0, edgeCount: 0, orphanedNodeCount: 0, missingDependencyCount: 0, blockingFindingCount: 0, reviewFindingCount: 0 }, nodes: [], edges: [], integrityFindings: [] },
  routingSegmentation: { summary: {}, routeDomains: [], routes: [], segmentationExpectations: [], reachabilityFindings: [] },
  securityPolicyFlow: { summary: {}, serviceObjects: [], policyMatrix: [], natReview: [], findings: [] },
  implementationPlan: { summary: {}, stages: [], steps: [], findings: [] },
  integrityNotes: [],
};

const result = buildV1DiscoveryCurrentStateControl({
  project: {
    environmentType: "Healthcare brownfield migration",
    requirementsJson: JSON.stringify({
      brownfield: true,
      migration: true,
      siteCount: 3,
      multiSite: true,
      dualIsp: true,
      cloudHybrid: true,
      guestAccess: true,
      remoteAccess: true,
      voice: true,
      wireless: true,
      planningFor: "existing network upgrade and migration",
    }),
    discoveryJson: JSON.stringify({
      topologyText: "HQ MPLS Branch 1\nAzure VPN gateway from HQ firewall",
      inventoryText: "Core switch legacy EOS next year\nFirewall pair current",
      addressingText: "VLAN 10 192.168.10.0/24 gateway .1\nGuest subnet overlap at Branch 2",
      routingText: "show ip route export present\nOSPF internal plus static default route",
      securityText: "Palo Alto firewall zones and VPN policy export needed",
      wirelessText: "Guest SSID WPA2 Enterprise controller APs",
      gapText: "Duplicate guest subnet conflict\nNo route summarization",
      constraintsText: "Weekend cutovers only",
      "routing-tablesImport": "show ip route captured",
      "firewall-configsImport": "security rule export captured",
      "cloud-networkImport": "Azure VNet route table export captured",
    }),
    sites: [{ id: "site-hq", name: "HQ" }, { id: "site-1", name: "Branch 1" }, { id: "site-2", name: "Branch 2" }],
    brownfieldImports: [],
    brownfieldNetworks: [],
    dhcpScopes: [{ id: "scope-guest" }],
    ipPools: [{ id: "pool-default" }],
    ipAllocations: [],
  },
  networkObjectModel,
  currentStateBoundary: { configuredObjectCount: 8, proposedObjectCount: 2, inferredObjectCount: 0, discoveredObjectCount: 0, currentStateReady: true, proposedStateReady: true, liveMappingReady: true, notes: [] },
  brownfieldReadiness: { mode: "brownfield", currentStateEvidence: "strong", importReadiness: "review", driftReviewReadiness: "review", notes: [] },
  discoveredStateImportPlan: { readiness: "review", suggestedSources: [], requiredNormalizations: [], notes: [] },
});

assert.equal(result.contract, V1_DISCOVERY_CURRENT_STATE_CONTRACT);
assert.equal(result.role, "MANUAL_DISCOVERY_BOUNDARY_NO_LIVE_DISCOVERY_CLAIMS");
assert.equal(result.currentStateAuthority, "MANUAL_OR_IMPORTED_EVIDENCE_ONLY_NOT_LIVE_DISCOVERY");
assert(result.areaRows.some((row) => row.area === "Addressing and VLAN baseline" && row.state === "CONFLICTING"));
assert(result.importTargets.some((target) => target.target === "Routing tables" && ["IMPORTED", "CONFLICTING"].includes(target.state)));
assert(result.importTargets.some((target) => target.target === "Cloud VPC/VNet data" && ["IMPORTED", "CONFLICTING"].includes(target.state)));
assert(result.tasks.some((task) => task.requirementId === "requirements:brownfield"));
assert(result.tasks.some((task) => task.requirementId === "requirements:migration" && task.linkedTargets.includes("DHCP scope exports")));
assert(result.requirementDrivers.some((driver) => driver.requirementId === "requirements:multiSite" && driver.affectedImportTargets.includes("Routing tables")));
assert(result.findings.some((finding) => finding.code === "V1_DISCOVERY_CONFLICT_REQUIRES_RECONCILIATION"));
assert(result.proofBoundary.some((line) => line.includes("does not perform live network discovery")));

const emptyResult = buildV1DiscoveryCurrentStateControl({
  project: {
    requirementsJson: JSON.stringify({ siteCount: 1 }),
    discoveryJson: null,
    sites: [{ id: "site-1", name: "Site 1" }],
  },
  networkObjectModel,
  currentStateBoundary: { configuredObjectCount: 0, proposedObjectCount: 0, inferredObjectCount: 0, discoveredObjectCount: 0, currentStateReady: true, proposedStateReady: false, liveMappingReady: true, notes: [] },
  brownfieldReadiness: { mode: "greenfield", currentStateEvidence: "thin", importReadiness: "not-ready", driftReviewReadiness: "not-ready", notes: [] },
  discoveredStateImportPlan: { readiness: "not-ready", suggestedSources: [], requiredNormalizations: [], notes: [] },
});

assert(emptyResult.findings.some((finding) => finding.code === "V1_MANUAL_DISCOVERY_EMPTY_STATE"));
console.log("[V1] Discovery/current-state selftest passed");
