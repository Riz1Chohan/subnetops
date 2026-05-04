import type {
  DesignCoreAddressRow,
  V1RequirementsClosureControlSummary,
  V1CidrAddressingTruthControlSummary,
  V1EnterpriseIpamConflictRow,
  V1EnterpriseIpamReconciliationRow,
  V1EnterpriseIpamRequirementMatrixRow,
  V1EnterpriseIpamTruthControlSummary,
  V1IpamReadinessImpact,
  V1IpamReconciliationState,
} from "../designCore.types.js";
import type {
  EnterpriseAllocatorPosture,
  EnterpriseAllocatorSource,
  EnterpriseAllocationRecord,
  EnterprisePoolRecord,
  EnterpriseDhcpScopeRecord,
  EnterpriseReservationRecord,
} from "../../domain/ipam/enterprise-ipam.js";

// V1_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW
// Snapshot surface: V1EnterpriseIpamTruth

type RequirementPolicy = {
  key: string;
  label: string;
  expectedIpamImpact: string;
  activeWhen: (row: DesignCoreAddressRow) => boolean;
};

type BuilderInput = {
  addressingRows: DesignCoreAddressRow[];
  enterpriseAllocatorPosture: EnterpriseAllocatorPosture;
  enterpriseAllocatorSource: EnterpriseAllocatorSource;
  V1CidrAddressingTruth: V1CidrAddressingTruthControlSummary;
  V1RequirementsClosure?: V1RequirementsClosureControlSummary;
};

const REQUIREMENT_POLICIES: RequirementPolicy[] = [
  {
    key: "usersPerSite",
    label: "User population must reconcile with durable pool/allocation authority",
    expectedIpamImpact: "Engine 1 host demand should become Engine 2 proposal/candidate or approved durable allocation evidence before implementation readiness.",
    activeWhen: (row) => row.role === "USER" || (typeof row.estimatedHosts === "number" && row.estimatedHosts > 0),
  },
  {
    key: "siteCount",
    label: "Multi-site scope must have durable site/route-domain allocation evidence",
    expectedIpamImpact: "Each materialized site segment should either be a planned Engine 1 proposal, a durable Engine 2 candidate, or an approved allocation; otherwise site address ownership is review-only.",
    activeWhen: () => true,
  },
  {
    key: "guestAccess",
    label: "Guest access needs durable guest subnet ownership before implementation",
    expectedIpamImpact: "Guest addressing must not be a pretty subnet row if Engine 2 has a brownfield, reserved-pool, or approval blocker.",
    activeWhen: (row) => row.role === "GUEST",
  },
  {
    key: "guestWifi",
    label: "Guest Wi-Fi needs durable guest subnet ownership before implementation",
    expectedIpamImpact: "Guest Wi-Fi addressing should reconcile against Engine 2 pools, DHCP scopes, and reservations.",
    activeWhen: (row) => row.role === "GUEST",
  },
  {
    key: "voice",
    label: "Voice subnet needs durable allocation and DHCP/QoS review evidence",
    expectedIpamImpact: "Voice VLAN addressing can remain planned, but implementation readiness requires Engine 2 allocation and DHCP/option review evidence.",
    activeWhen: (row) => row.role === "VOICE",
  },
  {
    key: "managementAccess",
    label: "Management access requires durable management address ownership",
    expectedIpamImpact: "Management subnet rows must reconcile with durable IPAM and cannot be hidden behind inferred/default addressing.",
    activeWhen: (row) => row.role === "MANAGEMENT",
  },
  {
    key: "management",
    label: "Management network requires durable management address ownership",
    expectedIpamImpact: "Management subnet rows must reconcile with durable IPAM and approval state before they are treated as implementation-ready.",
    activeWhen: (row) => row.role === "MANAGEMENT",
  },
  {
    key: "printers",
    label: "Printer/shared-device addressing requires durable ownership or review",
    expectedIpamImpact: "Shared-device subnets should become durable allocations or stay marked review-only.",
    activeWhen: (row) => row.role === "PRINTER",
  },
  {
    key: "iot",
    label: "IoT addressing requires durable ownership or review",
    expectedIpamImpact: "IoT subnets should become durable allocations or stay marked review-only because IoT isolation usually depends on stable address ownership.",
    activeWhen: (row) => row.role === "IOT",
  },
  {
    key: "cameras",
    label: "Camera/security-device addressing requires durable ownership or review",
    expectedIpamImpact: "Camera subnets should become durable allocations or stay marked review-only because camera systems often need fixed DHCP/reservation design.",
    activeWhen: (row) => row.role === "CAMERA",
  },
  {
    key: "wireless",
    label: "Wireless addressing requires durable access subnet ownership",
    expectedIpamImpact: "Wireless/user/guest access segments must reconcile against Engine 2 before implementation readiness.",
    activeWhen: (row) => row.role === "USER" || row.role === "GUEST",
  },
  {
    key: "dualIsp",
    label: "Dual ISP must not create fake WAN circuits",
    expectedIpamImpact: "Dual ISP creates WAN/transit allocation review pressure; without actual WAN/transit durable objects it remains a review blocker, not an invented circuit.",
    activeWhen: (row) => row.role === "WAN_TRANSIT",
  },
  {
    key: "cloudHybrid",
    label: "Cloud/hybrid must not create fake cloud route tables",
    expectedIpamImpact: "Cloud/hybrid creates cloud-edge allocation review pressure; actual cloud/VPC/VNet address objects must be imported or reviewed before authority is claimed.",
    activeWhen: (row) => row.role === "WAN_TRANSIT" || row.role === "DMZ" || row.role === "SERVER",
  },
  {
    key: "cloudConnected",
    label: "Cloud-connected scope must not create fake cloud route tables",
    expectedIpamImpact: "Cloud-connected scope creates cloud-edge allocation review pressure; actual cloud/VPC/VNet address objects must be imported or reviewed before authority is claimed.",
    activeWhen: (row) => row.role === "WAN_TRANSIT" || row.role === "DMZ" || row.role === "SERVER",
  },
  {
    key: "remoteAccess",
    label: "Remote access needs stable VPN/edge addressing evidence",
    expectedIpamImpact: "Remote-access address consequences remain review-only unless durable VPN/edge/management allocation objects exist.",
    activeWhen: (row) => row.role === "MANAGEMENT" || row.role === "WAN_TRANSIT" || row.role === "DMZ",
  },
  {
    key: "growthBufferModel",
    label: "Growth buffer must reconcile against pool reserve policy",
    expectedIpamImpact: "Growth-driven subnet proposals must be checked against Engine 2 pool reserve policy and stale allocation hashes.",
    activeWhen: (row) => typeof row.estimatedHosts === "number" && row.estimatedHosts > 0,
  },
];

function normalizeFamily(value: unknown): "IPV4" | "IPV6" {
  return String(value ?? "IPV4").toUpperCase().includes("6") ? "IPV6" : "IPV4";
}

function sameCidr(left?: string | null, right?: string | null) {
  return Boolean(left && right && String(left).trim().toLowerCase() === String(right).trim().toLowerCase());
}

function routeDomainKeyForId(source: EnterpriseAllocatorSource, routeDomainId?: string | null): string {
  if (!routeDomainId) return "default";
  return source.routeDomains?.find((domain) => domain.id === routeDomainId)?.routeDomainKey ?? routeDomainId;
}

function poolById(source: EnterpriseAllocatorSource, poolId?: string | null): EnterprisePoolRecord | undefined {
  if (!poolId) return undefined;
  return source.ipPools?.find((pool) => pool.id === poolId);
}

function matchAllocation(row: DesignCoreAddressRow, source: EnterpriseAllocatorSource): EnterpriseAllocationRecord | undefined {
  const candidates = source.ipAllocations ?? [];
  return candidates.find((allocation) => allocation.vlanId === row.id)
    ?? candidates.find((allocation) => allocation.siteId === row.siteId && (sameCidr(allocation.cidr, row.canonicalSubnetCidr) || sameCidr(allocation.cidr, row.proposedSubnetCidr) || sameCidr(allocation.cidr, row.sourceSubnetCidr)))
    ?? candidates.find((allocation) => sameCidr(allocation.cidr, row.canonicalSubnetCidr) || sameCidr(allocation.cidr, row.proposedSubnetCidr) || sameCidr(allocation.cidr, row.sourceSubnetCidr));
}

function matchingDhcpScopes(row: DesignCoreAddressRow, allocation: EnterpriseAllocationRecord | undefined, source: EnterpriseAllocatorSource): EnterpriseDhcpScopeRecord[] {
  return (source.dhcpScopes ?? []).filter((scope) => {
    if (allocation?.id && scope.allocationId === allocation.id) return true;
    if (scope.vlanId === row.id) return true;
    if (scope.siteId === row.siteId && (sameCidr(scope.scopeCidr, row.canonicalSubnetCidr) || sameCidr(scope.scopeCidr, row.sourceSubnetCidr) || sameCidr(scope.scopeCidr, row.proposedSubnetCidr))) return true;
    return false;
  });
}

function matchingReservations(row: DesignCoreAddressRow, allocation: EnterpriseAllocationRecord | undefined, dhcpScopes: EnterpriseDhcpScopeRecord[], source: EnterpriseAllocatorSource): EnterpriseReservationRecord[] {
  const scopeIds = new Set(dhcpScopes.map((scope) => scope.id));
  return (source.ipReservations ?? []).filter((reservation) => {
    if (allocation?.id && reservation.allocationId === allocation.id) return true;
    if (reservation.vlanId === row.id) return true;
    if (reservation.dhcpScopeId && scopeIds.has(reservation.dhcpScopeId)) return true;
    return false;
  });
}

function hasBlockedFinding(posture: EnterpriseAllocatorPosture, cidrCandidates: string[]) {
  const textCandidates = cidrCandidates.filter(Boolean);
  return posture.reviewFindings.find((finding) => finding.severity === "blocked" && textCandidates.some((cidr) => finding.detail.includes(cidr)));
}

function hasReviewFinding(posture: EnterpriseAllocatorPosture, cidrCandidates: string[]) {
  const textCandidates = cidrCandidates.filter(Boolean);
  return posture.reviewFindings.find((finding) => finding.severity === "review" && textCandidates.some((cidr) => finding.detail.includes(cidr)));
}

function classifyAllocationState(params: {
  row: DesignCoreAddressRow;
  allocation?: EnterpriseAllocationRecord;
  dhcpScopes: EnterpriseDhcpScopeRecord[];
  reservations: EnterpriseReservationRecord[];
  posture: EnterpriseAllocatorPosture;
}): { state: V1IpamReconciliationState; readinessImpact: V1IpamReadinessImpact; blockers: string[]; reviewReasons: string[] } {
  const { row, allocation, dhcpScopes, reservations, posture } = params;
  const cidrCandidates = [row.canonicalSubnetCidr, row.proposedSubnetCidr, row.sourceSubnetCidr].filter(Boolean) as string[];
  const blockedFinding = hasBlockedFinding(posture, cidrCandidates);
  const reviewFinding = hasReviewFinding(posture, cidrCandidates);
  const blockers: string[] = [];
  const reviewReasons: string[] = [];

  if (blockedFinding) {
    blockers.push(`${blockedFinding.code}: ${blockedFinding.title}`);
    return { state: "ENGINE2_CONFLICT_REVIEW_BLOCKER", readinessImpact: "BLOCKING", blockers, reviewReasons };
  }

  if (!allocation) {
    if (posture.durablePoolCount === 0) reviewReasons.push("No durable Engine 2 pool exists for this planned address need.");
    else reviewReasons.push("No durable Engine 2 allocation has been materialized for this Engine 1 row.");
    return { state: "ENGINE1_PROPOSAL_ONLY", readinessImpact: "REVIEW_REQUIRED", blockers, reviewReasons };
  }

  const status = String(allocation.status ?? "PROPOSED").toUpperCase();
  if ((status === "APPROVED" || status === "IMPLEMENTED") && allocation.inputHash && allocation.inputHash !== posture.currentInputHash) {
    blockers.push(`Allocation input hash ${allocation.inputHash} is stale against current Engine 2 hash ${posture.currentInputHash}.`);
    return { state: "ENGINE2_STALE_ALLOCATION_REVIEW", readinessImpact: "BLOCKING", blockers, reviewReasons };
  }

  if (reviewFinding) reviewReasons.push(`${reviewFinding.code}: ${reviewFinding.title}`);
  if (row.dhcpEnabled && dhcpScopes.length === 0) reviewReasons.push("VLAN DHCP is enabled but no durable Engine 2 DHCP scope is linked.");
  if (dhcpScopes.length > 0 && reservations.length === 0 && ["VOICE", "PRINTER", "IOT", "CAMERA", "MANAGEMENT"].includes(row.role)) {
    reviewReasons.push(`${row.role} segment has durable DHCP scope evidence but no reservation evidence yet.`);
  }

  if (status === "APPROVED" || status === "IMPLEMENTED") {
    return {
      state: reviewReasons.length > 0 ? "ENGINE2_APPROVED_WITH_REVIEW_NOTES" : "ENGINE2_APPROVED_ALLOCATION",
      readinessImpact: reviewReasons.length > 0 ? "WARNING" : "PASSED",
      blockers,
      reviewReasons,
    };
  }

  if (status === "REVIEW_REQUIRED") {
    reviewReasons.push("Durable allocation status is REVIEW_REQUIRED.");
    return { state: "ENGINE2_CONFLICT_REVIEW_BLOCKER", readinessImpact: "REVIEW_REQUIRED", blockers, reviewReasons };
  }

  if (status === "REJECTED" || status === "SUPERSEDED") {
    blockers.push(`Durable allocation status is ${status}.`);
    return { state: "ENGINE2_CONFLICT_REVIEW_BLOCKER", readinessImpact: "BLOCKING", blockers, reviewReasons };
  }

  return { state: "ENGINE2_DURABLE_CANDIDATE", readinessImpact: reviewReasons.length > 0 ? "WARNING" : "REVIEW_REQUIRED", blockers, reviewReasons };
}

function buildReconciliationRows(input: BuilderInput): V1EnterpriseIpamReconciliationRow[] {
  return input.addressingRows.map((row) => {
    const allocation = matchAllocation(row, input.enterpriseAllocatorSource);
    const pool = poolById(input.enterpriseAllocatorSource, allocation?.poolId);
    const dhcpScopes = matchingDhcpScopes(row, allocation, input.enterpriseAllocatorSource);
    const reservations = matchingReservations(row, allocation, dhcpScopes, input.enterpriseAllocatorSource);
    const state = classifyAllocationState({ row, allocation, dhcpScopes, reservations, posture: input.enterpriseAllocatorPosture });
    const routeDomainKey = routeDomainKeyForId(input.enterpriseAllocatorSource, allocation?.routeDomainId ?? pool?.routeDomainId ?? null);
    const approvedHashMatches = allocation?.inputHash ? allocation.inputHash === input.enterpriseAllocatorPosture.currentInputHash : false;

    return {
      rowId: row.id,
      siteId: row.siteId,
      siteName: row.siteName,
      vlanId: row.vlanId,
      vlanName: row.vlanName,
      role: row.role,
      engine1PlannedCidr: row.canonicalSubnetCidr ?? row.sourceSubnetCidr,
      engine1ProposedCidr: row.proposedSubnetCidr,
      engine2AllocationId: allocation?.id,
      engine2AllocationCidr: allocation?.cidr,
      engine2AllocationStatus: allocation ? String(allocation.status ?? "PROPOSED") : undefined,
      engine2PoolId: allocation?.poolId ?? undefined,
      engine2PoolName: pool?.name,
      routeDomainKey,
      sourceTruth: allocation ? "ENGINE2_DURABLE" : "ENGINE1_PLANNED",
      reconciliationState: state.state,
      readinessImpact: state.readinessImpact,
      approvedHashMatches,
      currentInputHash: input.enterpriseAllocatorPosture.currentInputHash,
      dhcpScopeIds: dhcpScopes.map((scope) => scope.id),
      reservationIds: reservations.map((reservation) => reservation.id),
      blockers: state.blockers,
      reviewReasons: state.reviewReasons,
      evidence: [
        `Engine 1 planned ${row.canonicalSubnetCidr ?? row.sourceSubnetCidr}${row.proposedSubnetCidr ? ` with proposal ${row.proposedSubnetCidr}` : ""}.`,
        allocation ? `Engine 2 durable allocation ${allocation.cidr} status ${String(allocation.status ?? "PROPOSED")}.` : "No matching Engine 2 durable allocation found.",
        pool ? `Pool ${pool.name} ${pool.cidr}.` : "No durable pool matched this allocation row.",
        `Route domain ${routeDomainKey}.`,
        `${dhcpScopes.length} DHCP scope(s), ${reservations.length} reservation(s) linked by Engine 2 evidence.`,
      ],
    };
  });
}

function buildRequirementMatrix(rows: V1EnterpriseIpamReconciliationRow[]): V1EnterpriseIpamRequirementMatrixRow[] {
  return REQUIREMENT_POLICIES.map((policy) => {
    const matching = rows.filter((row) => {
      const fakeAddressRow = {
        role: row.role,
        estimatedHosts: null,
      } as DesignCoreAddressRow;
      return policy.activeWhen(fakeAddressRow) || (policy.key === "siteCount" && rows.length > 0);
    });
    const active = matching.length > 0;
    const blocking = matching.filter((row) => row.readinessImpact === "BLOCKING");
    const review = matching.filter((row) => row.readinessImpact === "REVIEW_REQUIRED");
    const approved = matching.filter((row) => row.reconciliationState === "ENGINE2_APPROVED_ALLOCATION" || row.reconciliationState === "ENGINE2_APPROVED_WITH_REVIEW_NOTES");
    const proposalOnly = matching.filter((row) => row.reconciliationState === "ENGINE1_PROPOSAL_ONLY");
    const candidate = matching.filter((row) => row.reconciliationState === "ENGINE2_DURABLE_CANDIDATE");
    const materializedEvidence = matching.map((row) => `${row.siteName} VLAN ${row.vlanId}: ${row.reconciliationState}${row.engine2AllocationCidr ? ` ${row.engine2AllocationCidr}` : ""}`);
    const missing = [
      ...proposalOnly.map((row) => `${row.siteName} VLAN ${row.vlanId} is still Engine 1 proposal only.`),
      ...review.map((row) => `${row.siteName} VLAN ${row.vlanId} requires Engine 2 review.`),
      ...blocking.map((row) => `${row.siteName} VLAN ${row.vlanId} is blocked by Engine 2.`),
    ];
    const readinessImpact: V1IpamReadinessImpact = !active
      ? "NOT_APPLICABLE"
      : blocking.length > 0
        ? "BLOCKING"
        : review.length > 0 || proposalOnly.length > 0 || candidate.length > 0
          ? "REVIEW_REQUIRED"
          : "PASSED";

    return {
      requirementKey: policy.key,
      label: policy.label,
      active,
      expectedIpamImpact: policy.expectedIpamImpact,
      plannedNeedCount: matching.length,
      engine1ProposalOnlyCount: proposalOnly.length,
      durableCandidateCount: candidate.length,
      approvedAllocationCount: approved.length,
      conflictOrReviewBlockerCount: blocking.length + review.length,
      materializedIpamEvidence: materializedEvidence,
      missingIpamEvidence: missing,
      readinessImpact,
      notes: active
        ? [`${matching.length} row(s) evaluated against Engine 2 authority for ${policy.key}.`]
        : [`No active addressing row currently exercises ${policy.key}.`],
    };
  });
}

function buildConflictRows(posture: EnterpriseAllocatorPosture): V1EnterpriseIpamConflictRow[] {
  return posture.reviewFindings.map((finding, index) => ({
    id: `V1-ipam-finding-${index + 1}`,
    code: finding.code,
    severity: finding.severity,
    title: finding.title,
    detail: finding.detail,
    readinessImpact: finding.severity === "blocked" ? "BLOCKING" : finding.severity === "review" ? "REVIEW_REQUIRED" : "WARNING",
  }));
}

export function buildV1EnterpriseIpamTruthControl(input: BuilderInput): V1EnterpriseIpamTruthControlSummary {
  const reconciliationRows = buildReconciliationRows(input);
  const requirementIpamMatrix = buildRequirementMatrix(reconciliationRows);
  const conflictRows = buildConflictRows(input.enterpriseAllocatorPosture);
  const engine1ProposalOnlyCount = reconciliationRows.filter((row) => row.reconciliationState === "ENGINE1_PROPOSAL_ONLY").length;
  const durableCandidateCount = reconciliationRows.filter((row) => row.reconciliationState === "ENGINE2_DURABLE_CANDIDATE").length;
  const approvedAllocationCount = reconciliationRows.filter((row) => row.reconciliationState === "ENGINE2_APPROVED_ALLOCATION" || row.reconciliationState === "ENGINE2_APPROVED_WITH_REVIEW_NOTES").length;
  const staleAllocationCount = reconciliationRows.filter((row) => row.reconciliationState === "ENGINE2_STALE_ALLOCATION_REVIEW").length;
  const conflictBlockerCount = conflictRows.filter((row) => row.readinessImpact === "BLOCKING").length + reconciliationRows.filter((row) => row.readinessImpact === "BLOCKING").length;
  const reviewRequiredCount = reconciliationRows.filter((row) => row.readinessImpact === "REVIEW_REQUIRED").length + conflictRows.filter((row) => row.readinessImpact === "REVIEW_REQUIRED").length;
  const dhcpConflictCount = conflictRows.filter((row) => row.code.includes("DHCP")).length;
  const reservationConflictCount = conflictRows.filter((row) => row.code.includes("RESERVATION")).length;
  const brownfieldConflictCount = conflictRows.filter((row) => row.code.includes("BROWNFIELD")).length;
  const reservePolicyConflictCount = conflictRows.filter((row) => row.code.includes("RESERVE")).length;
  const activeRequirementIpamGapCount = requirementIpamMatrix.filter((row) => row.active && row.readinessImpact !== "PASSED" && row.readinessImpact !== "NOT_APPLICABLE").length;
  const overallReadiness: V1IpamReadinessImpact = conflictBlockerCount > 0 || staleAllocationCount > 0
    ? "BLOCKING"
    : reviewRequiredCount > 0 || engine1ProposalOnlyCount > 0 || activeRequirementIpamGapCount > 0
      ? "REVIEW_REQUIRED"
      : "PASSED";

  return {
    contractVersion: "V1_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW",
    engineRelationship: {
      engine1Role: "Engine 1 is the mathematical planner. It proposes and validates subnet math but does not become durable enterprise authority.",
      engine2Role: "Engine 2 is the durable IPAM authority for route domains, pools, allocations, DHCP scopes, reservations, brownfield conflicts, approvals, and ledger state.",
      designCoreRole: "Design-core reconciles Engine 1 planned rows with Engine 2 durable records and blocks/reviews split-brain claims.",
    },
    routeDomainCount: input.enterpriseAllocatorPosture.vrfDomainCount,
    durablePoolCount: input.enterpriseAllocatorPosture.durablePoolCount,
    durableAllocationCount: input.enterpriseAllocatorPosture.durableAllocationCount,
    dhcpScopeCount: input.enterpriseAllocatorPosture.dhcpScopeCount,
    reservationCount: input.enterpriseAllocatorPosture.reservationPolicyCount,
    brownfieldNetworkCount: input.enterpriseAllocatorPosture.durableBrownfieldNetworkCount,
    approvalCount: input.enterpriseAllocatorPosture.allocationApprovalCount,
    ledgerEntryCount: input.enterpriseAllocatorPosture.allocationLedgerEntryCount,
    currentInputHash: input.enterpriseAllocatorPosture.currentInputHash,
    overallReadiness,
    engine1ProposalOnlyCount,
    durableCandidateCount,
    approvedAllocationCount,
    staleAllocationCount,
    conflictBlockerCount,
    reviewRequiredCount,
    dhcpConflictCount,
    reservationConflictCount,
    brownfieldConflictCount,
    reservePolicyConflictCount,
    activeRequirementIpamGapCount,
    reconciliationRows,
    requirementIpamMatrix,
    conflictRows,
    notes: [
      "V1 does not replace Engine 1. It reconciles Engine 1 planned rows against durable Engine 2 authority.",
      "No requirement can create a pretty subnet row while Engine 2 says the pool, brownfield import, DHCP scope, reservation, approval, or hash state is blocked.",
      "Dual ISP and cloud/hybrid requirements create review pressure only; this control does not invent provider circuits, cloud route tables, VNets, VPCs, VPN gateways, or private links.",
      "Approved/implemented allocations are trusted only when their stored input hash matches the current Engine 2 hash.",
    ],
  };
}
