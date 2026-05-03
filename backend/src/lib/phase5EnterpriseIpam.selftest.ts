import { buildPhase5EnterpriseIpamTruthControl } from "../services/designCore/designCore.phase5EnterpriseIpamTruthControl.js";
import type { DesignCoreAddressRow, Phase3RequirementsClosureControlSummary, Phase4CidrAddressingTruthControlSummary } from "../services/designCore.types.js";
import type { EnterpriseAllocatorPosture, EnterpriseAllocatorSource } from "./enterpriseAddressAllocator.js";

// PHASE5_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const baseRow: DesignCoreAddressRow = {
  id: "vlan-user-10",
  siteId: "site-hq",
  siteName: "HQ",
  vlanId: 10,
  vlanName: "Users",
  role: "USER",
  truthState: "configured",
  sourceSubnetCidr: "10.10.10.0/24",
  canonicalSubnetCidr: "10.10.10.0/24",
  sourceGatewayIp: "10.10.10.1",
  effectiveGatewayIp: "10.10.10.1",
  inSiteBlock: true,
  estimatedHosts: 80,
  requiredUsableHosts: 100,
  recommendedPrefix: 25,
  capacityState: "fits",
  gatewayState: "valid",
  gatewayConvention: "first-usable",
  dhcpEnabled: true,
  notes: [],
};

const phase4: Phase4CidrAddressingTruthControlSummary = {
  contractVersion: "PHASE4_ENGINE1_CIDR_ADDRESSING_TRUTH",
  totalAddressRowCount: 1,
  validSubnetCount: 1,
  invalidSubnetCount: 0,
  undersizedSubnetCount: 0,
  gatewayIssueCount: 0,
  siteBlockIssueCount: 0,
  overlapIssueCount: 0,
  deterministicProposalCount: 0,
  blockedProposalCount: 0,
  requirementDrivenAddressingCount: 1,
  requirementAddressingGapCount: 0,
  edgeCaseProofs: [],
  requirementAddressingMatrix: [],
  addressingTruthRows: [],
  notes: [],
};

const phase3 = undefined as unknown as Phase3RequirementsClosureControlSummary;

const basePosture: EnterpriseAllocatorPosture = {
  sourceOfTruthReadiness: "ready",
  dualStackReadiness: "review",
  vrfReadiness: "ready",
  brownfieldReadiness: "ready",
  dhcpReadiness: "ready",
  reservePolicyReadiness: "ready",
  approvalReadiness: "ready",
  ipv4ConfiguredSubnetCount: 1,
  ipv6ConfiguredPrefixCount: 0,
  ipv6ReviewFindingCount: 0,
  vrfDomainCount: 1,
  dhcpScopeCount: 1,
  reservationPolicyCount: 1,
  brownfieldEvidenceState: "configured",
  durablePoolCount: 1,
  durableAllocationCount: 1,
  durableBrownfieldNetworkCount: 1,
  allocationApprovalCount: 1,
  allocationLedgerEntryCount: 1,
  ipv6AllocationCount: 0,
  vrfOverlapFindingCount: 0,
  brownfieldConflictCount: 0,
  dhcpFindingCount: 0,
  reservePolicyFindingCount: 0,
  staleAllocationCount: 0,
  currentInputHash: "hash-current",
  allocationPlanRows: [],
  reviewFindings: [],
  notes: [],
  reviewQueue: [],
};

const approvedSource: EnterpriseAllocatorSource = {
  routeDomains: [{ id: "rd-corp", routeDomainKey: "corp", name: "Corp", allowOverlappingCidrs: false }],
  ipPools: [{ id: "pool-user", name: "HQ user pool", addressFamily: "IPV4", cidr: "10.10.0.0/16", routeDomainId: "rd-corp", status: "ACTIVE", reservePercent: 20 }],
  ipAllocations: [{ id: "alloc-user", poolId: "pool-user", routeDomainId: "rd-corp", siteId: "site-hq", vlanId: "vlan-user-10", addressFamily: "IPV4", cidr: "10.10.10.0/24", status: "APPROVED", inputHash: "hash-current" }],
  dhcpScopes: [{ id: "dhcp-user", siteId: "site-hq", vlanId: "vlan-user-10", allocationId: "alloc-user", addressFamily: "IPV4", scopeCidr: "10.10.10.0/24", defaultGateway: "10.10.10.1", dnsServersJson: '["10.10.0.10"]' }],
  ipReservations: [{ id: "res-printer", siteId: "site-hq", vlanId: "vlan-user-10", dhcpScopeId: "dhcp-user", allocationId: "alloc-user", addressFamily: "IPV4", ipAddress: "10.10.10.20", hostname: "reserved-host" }],
  brownfieldNetworks: [],
  allocationApprovals: [{ id: "approval-user", allocationId: "alloc-user", decision: "APPROVED", designInputHash: "hash-current" }],
  allocationLedger: [{ id: "ledger-user", allocationId: "alloc-user", action: "APPROVED", designInputHash: "hash-current", summary: "Approved user allocation" }],
};

const approved = buildPhase5EnterpriseIpamTruthControl({
  addressingRows: [baseRow],
  enterpriseAllocatorPosture: basePosture,
  enterpriseAllocatorSource: approvedSource,
  phase4CidrAddressingTruth: phase4,
  phase3RequirementsClosure: phase3,
});
assert(approved.contractVersion === "PHASE5_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW", "Phase 5 contract marker missing");
assert(approved.reconciliationRows[0].reconciliationState === "ENGINE2_APPROVED_ALLOCATION", "Approved Engine 2 allocation should be authoritative");
assert(approved.overallReadiness === "PASSED", "Approved current allocation should pass Phase 5");
assert(approved.requirementIpamMatrix.some((row) => row.requirementKey === "usersPerSite" && row.approvedAllocationCount > 0), "Requirement-to-IPAM matrix should prove usersPerSite against approved allocation");

const proposalOnly = buildPhase5EnterpriseIpamTruthControl({
  addressingRows: [baseRow],
  enterpriseAllocatorPosture: { ...basePosture, durableAllocationCount: 0, allocationApprovalCount: 0, dhcpScopeCount: 0, reservationPolicyCount: 0 },
  enterpriseAllocatorSource: { ...approvedSource, ipAllocations: [], dhcpScopes: [], ipReservations: [], allocationApprovals: [], allocationLedger: [] },
  phase4CidrAddressingTruth: phase4,
  phase3RequirementsClosure: phase3,
});
assert(proposalOnly.reconciliationRows[0].reconciliationState === "ENGINE1_PROPOSAL_ONLY", "Engine 1 plan without Engine 2 durable allocation must stay proposal-only");
assert(proposalOnly.overallReadiness === "REVIEW_REQUIRED", "Proposal-only rows must require review");

const stale = buildPhase5EnterpriseIpamTruthControl({
  addressingRows: [baseRow],
  enterpriseAllocatorPosture: basePosture,
  enterpriseAllocatorSource: { ...approvedSource, ipAllocations: [{ ...approvedSource.ipAllocations![0], inputHash: "hash-old" }] },
  phase4CidrAddressingTruth: phase4,
  phase3RequirementsClosure: phase3,
});
assert(stale.reconciliationRows[0].reconciliationState === "ENGINE2_STALE_ALLOCATION_REVIEW", "Stale approved allocation hash must block Phase 5");
assert(stale.overallReadiness === "BLOCKING", "Stale approved allocation should be blocking");

console.log("Phase 5 Enterprise IPAM selftest passed");
