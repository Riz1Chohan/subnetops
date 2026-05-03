import assert from "node:assert/strict";
import { canonicalCidr, isUsableHostIp, parseCidr, recommendedCapacityPlanForHosts, validateGatewayForSubnet } from "./cidr.js";
import { allocateRequestedBlocks } from "./addressAllocator.js";
import { buildPhase4CidrAddressingTruthControl } from "../services/designCore/designCore.phase4CidrAddressingTruthControl.js";
import type { DesignCoreAddressRow, Phase2RequirementsMaterializationControlSummary } from "../services/designCore.types.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

run("Phase 4 CIDR edge cases stay strict and role-aware", () => {
  assert.equal(canonicalCidr("10.4.1.99/24"), "10.4.1.0/24");
  assert.throws(() => parseCidr("10.0.0.0/24.0"));
  assert.throws(() => parseCidr("10.0.0.0/+24"));
  assert.equal(isUsableHostIp(parseCidr("10.0.0.0/31"), "10.0.0.0", "WAN_TRANSIT"), true);
  assert.equal(isUsableHostIp(parseCidr("10.0.0.0/31"), "10.0.0.0", "USER"), false);
  assert.equal(validateGatewayForSubnet(parseCidr("10.0.0.1/32"), "10.0.0.1", "LOOPBACK").status, "usable");
});

run("Phase 4 capacity sizing remains role-aware and buffered", () => {
  const users = recommendedCapacityPlanForHosts(50, "USER");
  assert.equal(users.requiredUsableHosts, 65);
  assert.equal(users.recommendedPrefix, 25);
  const transit = recommendedCapacityPlanForHosts(2, "WAN_TRANSIT");
  assert.equal(transit.recommendedPrefix, 31);
});

run("Phase 4 allocator proof keeps deterministic proposal telemetry", () => {
  const result = allocateRequestedBlocks(parseCidr("10.4.0.0/24"), [], [
    { requestId: "users", prefix: 26, role: "USER" },
    { requestId: "voice", prefix: 27, role: "VOICE" },
  ]);
  assert.equal(result.results[0]?.proposedSubnetCidr, "10.4.0.0/26");
  assert.equal(result.results[1]?.proposedSubnetCidr, "10.4.0.64/27");
  assert.equal(typeof result.results[0]?.allocatorExplanation, "string");
});

run("Phase 4 control summary exposes requirement-to-addressing gaps instead of hiding them", () => {
  const phase2: Phase2RequirementsMaterializationControlSummary = {
    contractVersion: "PHASE2_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT",
    totalPolicyCount: 2,
    capturedFieldCount: 2,
    activeFieldCount: 2,
    materializedObjectCount: 1,
    engineInputSignalCount: 1,
    validationBlockerCount: 0,
    reviewItemCount: 0,
    explicitNoOpCount: 0,
    unsupportedCount: 0,
    policyMissingCount: 0,
    silentDropCount: 0,
    silentDropKeys: [],
    fieldOutcomes: [
      { key: "usersPerSite", label: "Users per site", category: "capacity", expectedDisposition: "ENGINE_INPUT_SIGNAL", normalizedSignal: "usersPerSite=50", createdObjectTypes: [], updatedObjectTypes: ["addressing-row"], backendDesignCoreInputs: ["estimatedHosts"], affectedEngines: ["Engine 1 CIDR/addressing"], validationImpact: "capacity", frontendImpact: ["addressing"], reportImpact: "addressing", diagramImpact: "labels", noOpReason: "", reviewRequiredWhen: [], confidence: "high", sourceValue: "50", captured: true, active: true, materializationStatus: "engine-input-signal", evidenceObjectIds: ["vlan-users"], actualEvidence: ["users" ] },
      { key: "guestWifi", label: "Guest Wi-Fi", category: "segmentation", expectedDisposition: "MATERIALIZED_OBJECT", normalizedSignal: "guestWifi=true", createdObjectTypes: ["guest-segment"], updatedObjectTypes: [], backendDesignCoreInputs: ["segment-role"], affectedEngines: ["Engine 1 CIDR/addressing"], validationImpact: "guest addressing required", frontendImpact: ["addressing"], reportImpact: "addressing", diagramImpact: "guest zone", noOpReason: "", reviewRequiredWhen: [], confidence: "high", sourceValue: "true", captured: true, active: true, materializationStatus: "materialized", evidenceObjectIds: [], actualEvidence: [] },
    ],
    notes: [],
  };

  const rows: DesignCoreAddressRow[] = [
    { id: "vlan-users", siteId: "site-hq", siteName: "HQ", vlanId: 10, vlanName: "Users", role: "USER", truthState: "configured", sourceSubnetCidr: "10.4.1.0/25", canonicalSubnetCidr: "10.4.1.0/25", sourceGatewayIp: "10.4.1.1", effectiveGatewayIp: "10.4.1.1", inSiteBlock: true, estimatedHosts: 50, recommendedPrefix: 25, requiredUsableHosts: 65, recommendedUsableHosts: 126, bufferMultiplier: 1.3, capacityState: "fits", usableHosts: 126, gatewayState: "valid", gatewayConvention: "first-usable", dhcpEnabled: true, notes: ["Capacity checked against buffered demand."] },
  ];

  const summary = buildPhase4CidrAddressingTruthControl({ siteBlocks: [], addressingRows: rows, proposedRows: [], issues: [], phase2RequirementsMaterialization: phase2 });
  assert.equal(summary.contractVersion, "PHASE4_ENGINE1_CIDR_ADDRESSING_TRUTH");
  assert.equal(summary.requirementDrivenAddressingCount >= 1, true);
  assert.equal(summary.requirementAddressingMatrix.some((item) => item.requirementKey === "guestWifi" && item.readinessImpact === "REVIEW_REQUIRED"), true);
});

console.log("\nPhase 4 CIDR/addressing truth self-test complete.");
