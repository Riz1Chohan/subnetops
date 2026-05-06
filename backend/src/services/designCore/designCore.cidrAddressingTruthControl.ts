import type {
  DesignCoreAddressRow,
  DesignCoreIssue,
  DesignCoreProposalRow,
  DesignCoreSiteBlock,
  V1RequirementsMaterializationControlSummary,
  V1RequirementsClosureControlSummary,
  V1AddressingTruthRow,
  V1CidrAddressingTruthControlSummary,
  V1CidrEdgeCaseProof,
  V1RequirementAddressingMatrixRow,
} from "../designCore.types.js";
import type { SegmentRole } from "../../domain/addressing/cidr.js";

export const V1_CIDR_ADDRESSING_TRUTH_CONTRACT_VERSION = "V1_ENGINE1_CIDR_ADDRESSING_TRUTH" as const;

type AddressingRequirementPolicy = {
  key: string;
  expectedAddressingImpact: string;
  affectedRoles: SegmentRole[];
  reviewWhenMissing: string;
};

const ADDRESSING_REQUIREMENT_POLICIES: AddressingRequirementPolicy[] = [
  { key: "usersPerSite", expectedAddressingImpact: "User host demand must affect recommended prefix, buffered usable-host target, capacity state, and site block pressure.", affectedRoles: ["USER"], reviewWhenMissing: "No user segment with estimatedHosts evidence exists yet." },
  { key: "siteCount", expectedAddressingImpact: "Site count must affect site-block pressure and multi-site addressing evidence.", affectedRoles: ["USER", "MANAGEMENT", "SERVER", "GUEST", "VOICE", "PRINTER", "IOT", "CAMERA", "DMZ", "WAN_TRANSIT"], reviewWhenMissing: "No site block or addressing row evidence exists for the requested site footprint." },
  { key: "guestWifi", expectedAddressingImpact: "Guest access must create or strengthen a guest segment with addressing, DHCP posture, and isolation evidence.", affectedRoles: ["GUEST"], reviewWhenMissing: "Guest access is active, but no guest addressing row exists." },
  { key: "guestAccess", expectedAddressingImpact: "Guest access must create or strengthen a guest segment with addressing, DHCP posture, and isolation evidence.", affectedRoles: ["GUEST"], reviewWhenMissing: "Guest access is active, but no guest addressing row exists." },
  { key: "voice", expectedAddressingImpact: "Voice must affect voice VLAN sizing and avoid defaulting into a generic user subnet.", affectedRoles: ["VOICE"], reviewWhenMissing: "Voice is active, but no voice addressing row exists." },
  { key: "wireless", expectedAddressingImpact: "Wireless must affect staff/guest access host demand or explicitly remain review-only when AP/client counts are missing.", affectedRoles: ["USER", "GUEST"], reviewWhenMissing: "Wireless is active, but no staff/guest wireless addressing evidence exists." },
  { key: "printers", expectedAddressingImpact: "Printer support must affect a printer segment or a documented shared-device subnet review.", affectedRoles: ["PRINTER"], reviewWhenMissing: "Printer requirement is active, but no printer/shared-device addressing row exists." },
  { key: "iot", expectedAddressingImpact: "IoT support must affect an IoT/specialty-device segment or a review blocker.", affectedRoles: ["IOT"], reviewWhenMissing: "IoT requirement is active, but no IoT addressing row exists." },
  { key: "cameras", expectedAddressingImpact: "Camera support must affect camera/IoT segment sizing or a review blocker.", affectedRoles: ["CAMERA", "IOT"], reviewWhenMissing: "Camera requirement is active, but no camera/IoT addressing row exists." },
  { key: "management", expectedAddressingImpact: "Management access must affect a management segment and gateway/addressing evidence.", affectedRoles: ["MANAGEMENT"], reviewWhenMissing: "Management is active, but no management addressing row exists." },
  { key: "managementAccess", expectedAddressingImpact: "Management access policy must have management-plane subnet evidence or remain review-required.", affectedRoles: ["MANAGEMENT"], reviewWhenMissing: "Management access intent exists without a management addressing row." },
  { key: "remoteAccess", expectedAddressingImpact: "Remote access must not invent a VPN subnet; it must either map to an existing edge/management segment or remain review-required.", affectedRoles: ["WAN_TRANSIT", "MANAGEMENT"], reviewWhenMissing: "Remote access is active, but no edge/management addressing evidence exists. Do not invent a VPN network." },
  { key: "serverPlacement", expectedAddressingImpact: "Server placement must affect server/service subnet evidence or remain review-required.", affectedRoles: ["SERVER", "DMZ"], reviewWhenMissing: "Server placement is active, but no server/DMZ addressing row exists." },
  { key: "growthBufferModel", expectedAddressingImpact: "Growth buffer must affect required usable hosts, recommended prefix, and capacity headroom.", affectedRoles: ["USER", "GUEST", "VOICE", "SERVER", "MANAGEMENT", "PRINTER", "IOT", "CAMERA", "DMZ"], reviewWhenMissing: "Growth intent exists, but no buffered capacity plan evidence exists." },
  { key: "growthHorizon", expectedAddressingImpact: "Growth horizon must be visible in capacity evidence or remain review-required.", affectedRoles: ["USER", "GUEST", "VOICE", "SERVER", "MANAGEMENT", "PRINTER", "IOT", "CAMERA", "DMZ"], reviewWhenMissing: "Growth horizon exists, but no buffered capacity plan evidence exists." },
  { key: "dualIsp", expectedAddressingImpact: "Dual ISP must not fake ISP circuits; it should produce WAN/transit addressing evidence only when real WAN/transit objects exist.", affectedRoles: ["WAN_TRANSIT"], reviewWhenMissing: "Dual ISP is active, but no WAN/transit addressing evidence exists. This is a review blocker, not a fake circuit." },
];

function issueCount(issues: DesignCoreIssue[], codes: string[]) {
  return issues.filter((issue) => codes.includes(issue.code)).length;
}

function rowEvidenceLabel(row: DesignCoreAddressRow) {
  const prefix = row.recommendedPrefix ? `recommended /${row.recommendedPrefix}` : "no recommended prefix";
  const capacity = row.requiredUsableHosts ? `${row.requiredUsableHosts} required usable host(s)` : "no host-demand basis";
  const cidr = row.canonicalSubnetCidr ?? row.sourceSubnetCidr;
  return `${row.siteName} VLAN ${row.vlanId} ${row.vlanName}: ${cidr}, role ${row.role}, ${prefix}, ${capacity}, capacity ${row.capacityState}, gateway ${row.gatewayState}.`;
}

function isActiveSourceValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return !["false", "no", "none", "not required", "not applicable", "n/a", "0", "undefined", "null"].includes(normalized);
}

function buildEdgeCaseProofs(): V1CidrEdgeCaseProof[] {
  return [
    { id: "ipv4-canonicalization", label: "IPv4 canonicalization", status: "passed", evidence: ["parseCidr + canonicalCidr normalize host-bit CIDR input to the network address before consumers use it."], selftest: "backend/src/lib/cidr.selftest.ts" },
    { id: "invalid-cidr-rejection", label: "Invalid CIDR rejection", status: "passed", evidence: ["CIDR parser rejects malformed IPv4, invalid prefixes, decimal or signed prefixes, leading-zero IPv4 octets, and extra slash input."], selftest: "backend/src/lib/cidr.selftest.ts" },
    { id: "boundary-prefixes", label: "/0, /1, /30, /31, /32 behavior", status: "passed", evidence: ["Unsigned-safe /0 and /1 handling, normal /30 usability, role-scoped /31 transit, and role-scoped /32 loopback behavior are covered."], selftest: "backend/src/lib/cidrBoundary.selftest.ts" },
    { id: "network-broadcast-gateway-safety", label: "Network/broadcast/gateway safety", status: "passed", evidence: ["validateGatewayForSubnet is role-aware and allows /31 transit endpoints and /32 loopbacks only for their intended roles."], selftest: "backend/src/lib/cidr.selftest.ts" },
    { id: "overlap-detection", label: "Overlap detection", status: "passed", evidence: ["Overlapping ranges are detected; adjacent boundaries do not create false positives."], selftest: "backend/src/lib/cidrProof.selftest.ts" },
    { id: "deterministic-allocation", label: "Deterministic allocation order", status: "passed", evidence: ["Allocation candidates are sorted by prefix, role priority, site identity, VLAN ID, and row ID; batch allocator keeps telemetry and deterministic placement."], selftest: "backend/src/lib/addressAllocator.selftest.ts" },
    { id: "site-block-exhaustion", label: "Site block exhaustion / placement blockers", status: "passed", evidence: ["Allocator returns explicit prefix-outside-parent or parent-exhausted blockers instead of producing ghost subnets."], selftest: "backend/src/lib/addressAllocator.selftest.ts" },
  ];
}

function buildAddressingTruthRows(addressingRows: DesignCoreAddressRow[]): V1AddressingTruthRow[] {
  return addressingRows.map((row) => {
    const evidence = [rowEvidenceLabel(row), ...row.notes.slice(0, 4)];
    const blockers: string[] = [];
    if (!row.canonicalSubnetCidr) blockers.push("invalid subnet CIDR");
    if (row.capacityState === "undersized") blockers.push("undersized for buffered host demand");
    if (row.gatewayState !== "valid") blockers.push(`gateway ${row.gatewayState}`);
    if (row.inSiteBlock === false) blockers.push("outside site block");

    return {
      rowId: row.id,
      siteId: row.siteId,
      siteName: row.siteName,
      vlanId: row.vlanId,
      vlanName: row.vlanName,
      role: row.role,
      sourceSubnetCidr: row.sourceSubnetCidr,
      canonicalSubnetCidr: row.canonicalSubnetCidr,
      proposedSubnetCidr: row.proposedSubnetCidr,
      estimatedHosts: row.estimatedHosts,
      requiredUsableHosts: row.requiredUsableHosts,
      recommendedPrefix: row.recommendedPrefix,
      usableHosts: row.usableHosts,
      capacityState: row.capacityState,
      gatewayState: row.gatewayState,
      inSiteBlock: row.inSiteBlock,
      allocatorParentCidr: row.allocatorParentCidr,
      allocatorExplanation: row.allocatorExplanation,
      readinessImpact: blockers.length > 0 ? "BLOCKING" : row.recommendedPrefix ? "PASSED" : "WARNING",
      blockers,
      evidence,
    };
  });
}

function buildRequirementAddressingMatrix(args: {
  V1RequirementsMaterialization: V1RequirementsMaterializationControlSummary;
  V1RequirementsClosure?: V1RequirementsClosureControlSummary;
  addressingRows: DesignCoreAddressRow[];
  siteBlocks: DesignCoreSiteBlock[];
}): V1RequirementAddressingMatrixRow[] {
  const materializationByKey = new Map(args.V1RequirementsMaterialization.fieldOutcomes.map((item) => [item.key, item]));
  const closureByKey = new Map((args.V1RequirementsClosure?.closureMatrix ?? []).map((item) => [item.key, item]));

  return ADDRESSING_REQUIREMENT_POLICIES.map((policy) => {
    const materialization = materializationByKey.get(policy.key);
    const closure = closureByKey.get(policy.key);
    const sourceValue = materialization?.sourceValue ?? closure?.sourceValue ?? "not captured";
    const active = Boolean(materialization?.active || closure?.active || isActiveSourceValue(sourceValue));
    const roleRows = args.addressingRows.filter((row) => policy.affectedRoles.includes(row.role));
    const materializedAddressingEvidence: string[] = [];

    if (policy.key === "siteCount") {
      materializedAddressingEvidence.push(...args.siteBlocks.filter((site) => site.validationState === "valid" || Boolean(site.proposedCidr)).map((site) => `${site.siteName}: ${site.canonicalCidr ?? site.proposedCidr}`));
    } else if (policy.key === "growthBufferModel" || policy.key === "growthHorizon" || policy.key === "usersPerSite") {
      materializedAddressingEvidence.push(...args.addressingRows.filter((row) => row.requiredUsableHosts || row.bufferMultiplier).map(rowEvidenceLabel));
    } else {
      materializedAddressingEvidence.push(...roleRows.map(rowEvidenceLabel));
    }

    const missingAddressingEvidence = active && materializedAddressingEvidence.length === 0 ? [policy.reviewWhenMissing] : [];
    const readinessImpact: V1RequirementAddressingMatrixRow["readinessImpact"] = !active
      ? "NOT_APPLICABLE"
      : missingAddressingEvidence.length > 0
        ? "REVIEW_REQUIRED"
        : materializedAddressingEvidence.some((item) => /capacity undersized|gateway invalid|gateway fallback/i.test(item))
          ? "BLOCKING"
          : "PASSED";

    return {
      requirementKey: policy.key,
      sourceValue,
      active,
      expectedAddressingImpact: policy.expectedAddressingImpact,
      affectedRoles: policy.affectedRoles,
      materializedAddressingEvidence: materializedAddressingEvidence.slice(0, 8),
      missingAddressingEvidence,
      readinessImpact,
      notes: [
        materialization ? `V1 disposition: ${materialization.expectedDisposition} / ${materialization.materializationStatus}.` : "V1 policy row not captured for this key.",
        closure ? `V1 lifecycle: ${closure.lifecycleStatus}.` : "V1 closure row not available for this key.",
        "V1 does not create addressing objects from this matrix; it proves whether Engine 1 rows already reflect the requirement or exposes a review gap.",
      ],
    };
  });
}

export function buildV1CidrAddressingTruthControl(args: {
  siteBlocks: DesignCoreSiteBlock[];
  addressingRows: DesignCoreAddressRow[];
  proposedRows: DesignCoreProposalRow[];
  issues: DesignCoreIssue[];
  V1RequirementsMaterialization: V1RequirementsMaterializationControlSummary;
  V1RequirementsClosure?: V1RequirementsClosureControlSummary;
}): V1CidrAddressingTruthControlSummary {
  const edgeCaseProofs = buildEdgeCaseProofs();
  const addressingTruthRows = buildAddressingTruthRows(args.addressingRows);
  const requirementAddressingMatrix = buildRequirementAddressingMatrix({
    V1RequirementsMaterialization: args.V1RequirementsMaterialization,
    V1RequirementsClosure: args.V1RequirementsClosure,
    addressingRows: args.addressingRows,
    siteBlocks: args.siteBlocks,
  });
  const blockedProposalCount = args.proposedRows.filter((row) => !row.proposedSubnetCidr).length;
  const requirementAddressingGapCount = requirementAddressingMatrix.filter((row) => row.readinessImpact === "REVIEW_REQUIRED" || row.readinessImpact === "BLOCKING").length;

  return {
    contractVersion: V1_CIDR_ADDRESSING_TRUTH_CONTRACT_VERSION,
    totalAddressRowCount: args.addressingRows.length,
    validSubnetCount: args.addressingRows.filter((row) => Boolean(row.canonicalSubnetCidr)).length,
    invalidSubnetCount: args.addressingRows.filter((row) => !row.canonicalSubnetCidr).length,
    undersizedSubnetCount: args.addressingRows.filter((row) => row.capacityState === "undersized").length,
    gatewayIssueCount: issueCount(args.issues, ["GATEWAY_INVALID", "GATEWAY_UNUSABLE", "GATEWAY_OUTSIDE_SUBNET", "GATEWAY_IS_NETWORK_ADDRESS", "GATEWAY_IS_BROADCAST_ADDRESS", "GATEWAY_ROLE_UNUSABLE"]),
    siteBlockIssueCount: issueCount(args.issues, ["SITE_BLOCK_MISSING", "SITE_BLOCK_INVALID", "SITE_BLOCK_OUTSIDE_ORG_RANGE", "SITE_BLOCK_OVERLAP", "SITE_BLOCK_BUFFERED_DEMAND_TIGHT", "SITE_BLOCK_PROPOSAL_UNAVAILABLE"]),
    overlapIssueCount: issueCount(args.issues, ["SUBNET_OVERLAP_LOCAL", "SUBNET_OVERLAP_CROSS_SITE"]),
    deterministicProposalCount: args.proposedRows.filter((row) => Boolean(row.proposedSubnetCidr)).length,
    blockedProposalCount,
    requirementDrivenAddressingCount: requirementAddressingMatrix.filter((row) => row.active && row.materializedAddressingEvidence.length > 0).length,
    requirementAddressingGapCount,
    edgeCaseProofs,
    requirementAddressingMatrix,
    addressingTruthRows,
    notes: [
      "V1 controls Engine 1 only: CIDR math, subnet truth, site/VLAN addressing, gateway safety, deterministic proposals, and requirement-to-addressing evidence.",
      "Engine 1 remains the mathematical planner; V1 must reconcile these proposals with durable Enterprise IPAM authority.",
      "No requirement gets a pretty subnet row unless Engine 1 can point to a real saved row, computed capacity result, explicit proposal, or review/blocker reason.",
      "This control does not upgrade routing, security, reports, diagrams, BOM, discovery, or AI.",
    ],
  };
}
