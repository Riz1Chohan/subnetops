import { ensureCanViewProject } from "./access.service.js";
import {
  classifyGatewayConvention,
  defaultGatewayForSubnet,
  findCoveringSummaryPrefix,
  pushIssue,
  rangeSummary,
} from "./designCore/designCore.helpers.js";
import { buildRequirementsCoverageSummary } from "./designCore/designCore.requirementsCoverage.js";
import { buildStandardsAlignmentSummary } from "./designCore/designCore.standardsAlignment.js";
import { buildTraceability } from "./designCore/designCore.traceability.js";
import {
  buildAllocationPolicySummary,
  buildRoutingIntentSummary,
  buildSecurityIntentSummary,
  buildRouteDomainSummary,
  buildPolicyConsequenceSummary,
  buildWanPlanSummary,
} from "./designCore/designCore.intentSummaries.js";
import {
  buildTraceabilityCoverageSummary,
  buildBrownfieldReadinessSummary,
  buildDiscoveredStateImportPlanSummary,
  buildImplementationReadinessSummary,
  buildEngineConfidenceSummary,
} from "./designCore/designCore.readinessSummaries.js";
import {
  buildAllocatorConfidenceSummary,
  buildTruthStateLedger,
  buildCurrentStateBoundary,
  buildAllocatorDeterminismSummary,
  buildStandardsEnforcementNotes,
} from "./designCore/designCore.confidenceSummaries.js";
import {
  buildPlanningInputCoverageSummary,
  buildPlanningInputDisciplineSummary,
} from "./designCore/designCore.planningInputDiscipline.js";
import { getProjectDesignData } from "./designCore/designCore.repository.js";
import {
  canonicalCidr,
  cidrsOverlap,
  classifySegmentRole,
  containsIp,
  describeSubnet,
  intToIpv4,
  isBroadcastAddress,
  isNetworkAddress,
  isValidIpv4,
  parseCidr,
  recommendedPrefixForHosts,
  suggestedGatewayPattern,
  usableHostCount,
  type ParsedCidr,
  type SegmentRole,
} from "../lib/cidr.js";
import {
  allocateRequestedBlocks,
  canChildFitInsideParent,
  chooseSiteGatewayPreference,
  findNextAvailableNetworkDetailed,
  nextBlockSize,
  sortAllocationCandidates,
  sortSiteAllocationCandidates,
} from "../lib/addressAllocator.js";
import {
  NETWORK_STANDARDS_RULEBOOK,
} from "../lib/networkStandardsRulebook.js";
import {
  type PlanningInputAuditItem,
  type PlanningInputAuditSummary,
} from "../lib/planningInputAudit.js";

import type { DesignCoreIssue, DesignCoreSiteBlock, DesignCoreAddressRow, DesignCoreProposalRow, DesignTraceabilityItem, CurrentStateBoundarySummary, SiteSummarizationReview, TransitPlanRow, LoopbackPlanRow, TruthStateLedger, AllocationPolicySummary, RoutingIntentSummary, SecurityIntentSummary, TraceabilityCoverageSummary, WanPlanSummary, BrownfieldReadinessSummary, AllocatorConfidenceSummary, RouteDomainSummary, PolicyConsequenceSummary, DiscoveredStateImportPlanSummary, ImplementationReadinessSummary, EngineConfidenceSummary, AllocatorDeterminismSummary, StandardsAlignmentSummary, ActivePlanningInputSummary, PlanningInputCoverageSummary, RequirementsCoverageArea, RequirementsCoverageSummary, PlanningInputDisciplineItem, PlanningInputDisciplineSummary, DesignCoreSnapshot } from "./designCore.types.js";

type ProjectWithDesignData = NonNullable<Awaited<ReturnType<typeof getProjectDesignData>>>;
type SiteBlockRecord = DesignCoreSiteBlock & { parsed?: ParsedCidr };
type AddressRowRecord = DesignCoreAddressRow & { parsed?: ParsedCidr };

type ProposedSubnetAssignment = {
  siteId: string;
  vlanId: number;
  proposedSubnetCidr?: string;
  proposedGatewayIp?: string;
};

function evaluateOrganizationBlock(project: ProjectWithDesignData, issues: DesignCoreIssue[]) {
  const notes: string[] = [];
  const sourceValue = project.basePrivateRange ?? undefined;

  if (!sourceValue) {
    notes.push("No organization private range saved yet.");
    return {
      sourceValue,
      validationState: "missing" as const,
      notes,
    };
  }

  try {
    const parsed = parseCidr(sourceValue);
    const canonical = canonicalCidr(sourceValue);
    if (canonical !== sourceValue) {
      notes.push(`Saved organization block canonicalized to ${canonical}.`);
    }
    return {
      sourceValue,
      canonicalCidr: canonical,
      parsed,
      validationState: "valid" as const,
      notes,
    };
  } catch {
    pushIssue(issues, {
      severity: "ERROR",
      code: "ORG_BLOCK_INVALID",
      title: "Invalid organization private range",
      detail: `${sourceValue} is not valid CIDR notation. The top-level planning block should be corrected before site allocation becomes review-ready.`,
      entityType: "PROJECT",
      entityId: project.id,
    });
    notes.push("Saved organization private range is not valid CIDR notation.");
    return {
      sourceValue,
      validationState: "invalid" as const,
      notes,
    };
  }
}

function buildSiteBlockRecords(
  project: ProjectWithDesignData,
  organizationBlock: ReturnType<typeof evaluateOrganizationBlock>,
  issues: DesignCoreIssue[],
) {
  const siteBlocks: SiteBlockRecord[] = project.sites.map((site: ProjectWithDesignData["sites"][number]) => {
    const notes: string[] = [];

    if (!site.defaultAddressBlock) {
      notes.push("No site block saved yet.");
      pushIssue(issues, {
        severity: "WARNING",
        code: "SITE_BLOCK_MISSING",
        title: `Missing site block on ${site.name}`,
        detail: `${site.name} does not yet have a saved site summary block. The backend design core can propose one, but current-state trust is incomplete until the block is confirmed.`,
        entityType: "SITE",
        entityId: site.id,
      });
      return {
        siteId: site.id,
        siteName: site.name,
        siteCode: site.siteCode,
        sourceValue: site.defaultAddressBlock,
        truthState: "configured",
        validationState: "invalid",
        inOrganizationBlock: null,
        overlapsWithSiteIds: [],
        notes,
      };
    }

    try {
      const parsed = parseCidr(site.defaultAddressBlock);
      const canonical = canonicalCidr(site.defaultAddressBlock);
      let inOrganizationBlock: boolean | null = null;
      if (organizationBlock.validationState === "valid" && organizationBlock.parsed) {
        inOrganizationBlock = parsed.network >= organizationBlock.parsed.network && parsed.broadcast <= organizationBlock.parsed.broadcast;
        if (!inOrganizationBlock) {
          pushIssue(issues, {
            severity: "ERROR",
            code: "SITE_BLOCK_OUTSIDE_ORG_RANGE",
            title: `Site block outside organization range on ${site.name}`,
            detail: `${canonical} is outside ${organizationBlock.canonicalCidr}.`,
            entityType: "SITE",
            entityId: site.id,
          });
        }
      }
      if (canonical !== site.defaultAddressBlock) {
        notes.push(`Saved site block canonicalized to ${canonical}.`);
      }
      return {
        siteId: site.id,
        siteName: site.name,
        siteCode: site.siteCode,
        sourceValue: site.defaultAddressBlock,
        canonicalCidr: canonical,
        truthState: "configured",
        validationState: "valid",
        rangeSummary: rangeSummary(parsed),
        inOrganizationBlock,
        overlapsWithSiteIds: [],
        notes,
        parsed,
      };
    } catch {
      pushIssue(issues, {
        severity: "WARNING",
        code: "SITE_BLOCK_INVALID",
        title: `Invalid site block on ${site.name}`,
        detail: `${site.defaultAddressBlock} is not valid CIDR notation.`,
        entityType: "SITE",
        entityId: site.id,
      });
      notes.push("Saved site block is not valid CIDR notation.");
      return {
        siteId: site.id,
        siteName: site.name,
        siteCode: site.siteCode,
        sourceValue: site.defaultAddressBlock,
        truthState: "configured",
        validationState: "invalid",
        inOrganizationBlock: null,
        overlapsWithSiteIds: [],
        notes,
      };
    }
  });

  for (let index = 0; index < siteBlocks.length; index += 1) {
    const current = siteBlocks[index];
    if (!current?.parsed) continue;

    for (let compareIndex = index + 1; compareIndex < siteBlocks.length; compareIndex += 1) {
      const other = siteBlocks[compareIndex];
      if (!other?.parsed) continue;
      if (!cidrsOverlap(current.parsed, other.parsed)) continue;

      current.overlapsWithSiteIds.push(other.siteId);
      other.overlapsWithSiteIds.push(current.siteId);

      pushIssue(issues, {
        severity: "ERROR",
        code: "SITE_BLOCK_OVERLAP",
        title: `Site block overlap between ${current.siteName} and ${other.siteName}`,
        detail: `${current.canonicalCidr} overlaps ${other.canonicalCidr}. Site summary blocks should stay distinct if SubnetOps is to remain a trustworthy planning source.`,
        entityType: "SITE",
        entityId: current.siteId,
      });
    }
  }

  return siteBlocks;
}

function estimateSiteCapacityDemand(site: ProjectWithDesignData["sites"][number]) {
  let requiredAddresses = 0;

  for (const vlan of site.vlans) {
    const role = classifySegmentRole(`${vlan.purpose || ""} ${vlan.vlanName} ${vlan.department || ""} ${vlan.notes || ""}`);
    const estimatedHosts = typeof vlan.estimatedHosts === "number" && vlan.estimatedHosts > 0 ? vlan.estimatedHosts : 0;
    if (estimatedHosts > 0) {
      const recommendedPrefix = recommendedPrefixForHosts(estimatedHosts, role);
      requiredAddresses += nextBlockSize(recommendedPrefix);
      continue;
    }

    try {
      const parsed = parseCidr(vlan.subnetCidr);
      requiredAddresses += nextBlockSize(parsed.prefix);
    } catch {
      requiredAddresses += nextBlockSize(24);
    }
  }

  return Math.max(requiredAddresses, nextBlockSize(24));
}

function recommendedSitePrefixForDemand(requiredAddresses: number) {
  for (let prefix = 30; prefix >= 1; prefix -= 1) {
    if (nextBlockSize(prefix) >= requiredAddresses) return prefix;
  }
  return 1;
}

function proposeSiteBlocks(
  project: ProjectWithDesignData,
  organizationBlock: ReturnType<typeof evaluateOrganizationBlock>,
  siteBlocks: SiteBlockRecord[],
  issues: DesignCoreIssue[],
) {
  if (organizationBlock.validationState !== "valid" || !organizationBlock.parsed) {
    return siteBlocks;
  }

  const usedRanges = siteBlocks
    .filter((siteBlock) => siteBlock.parsed)
    .map((siteBlock) => ({ start: siteBlock.parsed!.network, end: siteBlock.parsed!.broadcast }));

  const pendingSites = project.sites
    .map((site: ProjectWithDesignData["sites"][number]) => {
      const siteBlock = siteBlocks.find((item) => item.siteId === site.id);
      if (!siteBlock || siteBlock.validationState === "valid") return null;

      const demand = estimateSiteCapacityDemand(site);
      const recommendedPrefix = recommendedSitePrefixForDemand(Math.ceil(demand * 1.25));

      return {
        siteId: site.id,
        siteName: site.name,
        siteCode: site.siteCode,
        requiredAddresses: demand,
        recommendedPrefix,
      };
    })
    .filter(Boolean) as Array<{
      siteId: string;
      siteName: string;
      siteCode?: string | null;
      requiredAddresses: number;
      recommendedPrefix: number;
    }>;

  const orderedSites = sortSiteAllocationCandidates(pendingSites);
  const allocationRequests = orderedSites.map((candidate) => ({
    requestId: candidate.siteId,
    prefix: candidate.recommendedPrefix,
  }));
  const allocationResults = allocateRequestedBlocks(
    organizationBlock.parsed,
    usedRanges,
    allocationRequests,
  );

  for (const candidate of orderedSites) {
    const site = project.sites.find((item: ProjectWithDesignData["sites"][number]) => item.id === candidate.siteId);
    const siteBlock = siteBlocks.find((item: SiteBlockRecord) => item.siteId === candidate.siteId);
    const allocation = allocationResults.results.find((item: { requestId: string }) => item.requestId === candidate.siteId);
    if (!site || !siteBlock || !allocation) continue;

    if (allocation.status !== "allocated" || !allocation.proposedSubnetCidr) {
      const detail = allocation.reason === "prefix-outside-parent"
        ? `Requested /${candidate.recommendedPrefix} site block cannot fit inside the organization range ${organizationBlock.canonicalCidr}.`
        : `The organization range ${organizationBlock.canonicalCidr} does not have a free /${candidate.recommendedPrefix} block available for ${site.name}.`;
      pushIssue(issues, {
        severity: "WARNING",
        code: "SITE_BLOCK_PROPOSAL_UNAVAILABLE",
        title: `No clean site block proposal available for ${site.name}`,
        detail,
        entityType: "SITE",
        entityId: site.id,
      });
      siteBlock.notes.push(`Backend site-block proposal blocked: ${allocation.reason ?? "unknown"}.`);
      continue;
    }

    siteBlock.proposedCidr = allocation.proposedSubnetCidr;
    siteBlock.notes.push(`Backend proposal available: ${siteBlock.proposedCidr}.`);
    siteBlock.notes.push(`Proposal order uses largest-demand site allocation first to reduce fragmentation. Estimated demand: ${candidate.requiredAddresses} addresses.`);
  }

  return siteBlocks;
}

function buildAddressingRows(project: ProjectWithDesignData, siteBlocks: SiteBlockRecord[], issues: DesignCoreIssue[]) {
  const rows: AddressRowRecord[] = [];
  const rowsBySite = new Map<string, AddressRowRecord[]>();
  const siteBlockBySiteId = new Map(siteBlocks.map((siteBlock) => [siteBlock.siteId, siteBlock]));

  for (const site of project.sites) {
    const siteRows: AddressRowRecord[] = [];
    const siteBlock = siteBlockBySiteId.get(site.id);

    for (const vlan of site.vlans) {
      const role = classifySegmentRole(`${vlan.purpose || ""} ${vlan.vlanName} ${vlan.department || ""} ${vlan.notes || ""}`);
      const notes: string[] = [];
      const baseRow: AddressRowRecord = {
        id: vlan.id,
        siteId: site.id,
        siteName: site.name,
        siteCode: site.siteCode,
        vlanId: vlan.vlanId,
        vlanName: vlan.vlanName,
        role,
        truthState: "configured",
        sourceSubnetCidr: vlan.subnetCidr,
        sourceGatewayIp: vlan.gatewayIp,
        siteBlockCidr: siteBlock?.canonicalCidr ?? siteBlock?.proposedCidr ?? site.defaultAddressBlock,
        inSiteBlock: null,
        estimatedHosts: vlan.estimatedHosts ?? null,
        gatewayState: "invalid",
        gatewayConvention: "not-applicable",
        capacityState: "unknown",
        dhcpEnabled: vlan.dhcpEnabled,
        notes,
      };

      try {
        const parsed = parseCidr(vlan.subnetCidr);
        baseRow.parsed = parsed;
        baseRow.canonicalSubnetCidr = canonicalCidr(vlan.subnetCidr);
        baseRow.usableHosts = usableHostCount(parsed, role);

        if (baseRow.canonicalSubnetCidr !== vlan.subnetCidr) {
          notes.push(`Saved subnet canonicalized to ${baseRow.canonicalSubnetCidr}.`);
          pushIssue(issues, {
            severity: "INFO",
            code: "SUBNET_CANONICAL_FORM",
            title: `Canonical subnet form available for VLAN ${vlan.vlanId}`,
            detail: `${site.name} VLAN ${vlan.vlanName} is stored as ${vlan.subnetCidr} but canonical network form is ${baseRow.canonicalSubnetCidr}.`,
            entityType: "VLAN",
            entityId: vlan.id,
          });
        }

        if (typeof vlan.estimatedHosts === "number" && vlan.estimatedHosts > 0) {
          baseRow.recommendedPrefix = recommendedPrefixForHosts(vlan.estimatedHosts, role);
          if (baseRow.usableHosts >= vlan.estimatedHosts) {
            baseRow.capacityState = "fits";
          } else {
            baseRow.capacityState = "undersized";
            notes.push(`Estimated host demand of ${vlan.estimatedHosts} exceeds usable hosts in ${baseRow.canonicalSubnetCidr}.`);
            pushIssue(issues, {
              severity: "ERROR",
              code: "SUBNET_UNDERSIZED",
              title: `Undersized subnet on VLAN ${vlan.vlanId}`,
              detail: `${baseRow.canonicalSubnetCidr} provides ${baseRow.usableHosts} usable addresses, which is below the estimated host count of ${vlan.estimatedHosts}.`,
              entityType: "VLAN",
              entityId: vlan.id,
            });
          }
        }

        const selectedSiteBlock = siteBlock?.parsed ?? (siteBlock?.proposedCidr ? parseCidr(siteBlock.proposedCidr) : undefined);
        if (selectedSiteBlock) {
          baseRow.inSiteBlock = parsed.network >= selectedSiteBlock.network && parsed.broadcast <= selectedSiteBlock.broadcast;
          if (!baseRow.inSiteBlock) {
            pushIssue(issues, {
              severity: "ERROR",
              code: "SUBNET_OUTSIDE_SITE_BLOCK",
              title: `Subnet outside site block on ${site.name}`,
              detail: `${baseRow.canonicalSubnetCidr} does not fit inside ${siteBlock?.canonicalCidr ?? siteBlock?.proposedCidr}.`,
              entityType: "VLAN",
              entityId: vlan.id,
            });
          }
        }

        if (!isValidIpv4(vlan.gatewayIp)) {
          baseRow.gatewayState = "invalid";
          notes.push("Saved gateway is not valid IPv4.");
          pushIssue(issues, {
            severity: "ERROR",
            code: "GATEWAY_INVALID",
            title: `Invalid gateway on VLAN ${vlan.vlanId}`,
            detail: `${vlan.gatewayIp} is not a valid IPv4 address.`,
            entityType: "VLAN",
            entityId: vlan.id,
          });
        } else if (!containsIp(parsed, vlan.gatewayIp) || isNetworkAddress(parsed, vlan.gatewayIp) || isBroadcastAddress(parsed, vlan.gatewayIp)) {
          baseRow.gatewayState = "fallback";
          baseRow.proposedGatewayIp = defaultGatewayForSubnet(parsed, role);
          notes.push("Saved gateway is not a usable host inside the subnet. The backend design core should fall back to a computed gateway when proposing downstream service ranges.");
          pushIssue(issues, {
            severity: "ERROR",
            code: "GATEWAY_UNUSABLE",
            title: `Unusable gateway on VLAN ${vlan.vlanId}`,
            detail: `${vlan.gatewayIp} is not a usable host inside ${baseRow.canonicalSubnetCidr}.`,
            entityType: "VLAN",
            entityId: vlan.id,
          });
        } else {
          baseRow.gatewayState = "valid";
          baseRow.effectiveGatewayIp = vlan.gatewayIp;
          baseRow.gatewayConvention = classifyGatewayConvention(parsed, vlan.gatewayIp, role);
          if (!suggestedGatewayPattern(vlan.gatewayIp) && role !== "LOOPBACK" && role !== "WAN_TRANSIT") {
            notes.push("Gateway uses a custom convention instead of first or last usable.");
          }
        }
      } catch {
        notes.push("Saved subnet is not valid CIDR notation.");
        pushIssue(issues, {
          severity: "ERROR",
          code: "SUBNET_INVALID",
          title: `Invalid subnet on VLAN ${vlan.vlanId}`,
          detail: `${vlan.subnetCidr} is not valid CIDR notation.`,
          entityType: "VLAN",
          entityId: vlan.id,
        });
      }

      siteRows.push(baseRow);
      rows.push(baseRow);
    }

    rowsBySite.set(site.id, siteRows);
  }

  for (const site of project.sites) {
    const siteRows = rowsBySite.get(site.id) ?? [];
    const conventionSummary = new Set(siteRows.map((row) => row.gatewayConvention).filter((value) => value !== "not-applicable"));
    if (conventionSummary.size > 1) {
      pushIssue(issues, {
        severity: "WARNING",
        code: "INCONSISTENT_GATEWAY_CONVENTION",
        title: `Mixed gateway conventions on ${site.name}`,
        detail: `The site mixes ${Array.from(conventionSummary).join(", ")} gateway conventions. A consistent standard makes live mapping and future brownfield reconciliation safer.`,
        entityType: "SITE",
        entityId: site.id,
      });
    }
  }

  for (let index = 0; index < rows.length; index += 1) {
    const current = rows[index];
    if (!current?.parsed) continue;

    for (let compareIndex = index + 1; compareIndex < rows.length; compareIndex += 1) {
      const other = rows[compareIndex];
      if (!other?.parsed) continue;
      if (!cidrsOverlap(current.parsed, other.parsed)) continue;

      pushIssue(issues, {
        severity: current.siteId === other.siteId ? "ERROR" : "WARNING",
        code: current.siteId === other.siteId ? "SUBNET_OVERLAP_LOCAL" : "SUBNET_OVERLAP_CROSS_SITE",
        title: current.siteId === other.siteId
          ? `Overlapping VLAN subnets on ${current.siteName}`
          : `Cross-site overlapping subnets between ${current.siteName} and ${other.siteName}`,
        detail: `${current.canonicalSubnetCidr} (${current.siteName} VLAN ${current.vlanId}) overlaps ${other.canonicalSubnetCidr} (${other.siteName} VLAN ${other.vlanId}).`,
        entityType: "VLAN",
        entityId: current.id,
      });
    }
  }

  return rows;
}

function proposeSubnetRows(siteBlocks: SiteBlockRecord[], addressingRows: AddressRowRecord[], issues: DesignCoreIssue[]) {
  const proposals: DesignCoreProposalRow[] = [];
  const assignments = new Map<string, ProposedSubnetAssignment>();
  const rowsBySite = new Map<string, AddressRowRecord[]>();

  for (const row of addressingRows) {
    const existing = rowsBySite.get(row.siteId) ?? [];
    existing.push(row);
    rowsBySite.set(row.siteId, existing);
  }

  for (const siteBlock of siteBlocks) {
    const selectedSiteBlockCidr = siteBlock.canonicalCidr ?? siteBlock.proposedCidr;
    if (!selectedSiteBlockCidr) continue;

    let parsedSiteBlock: ParsedCidr;
    try {
      parsedSiteBlock = parseCidr(selectedSiteBlockCidr);
    } catch {
      continue;
    }

    const siteRows = rowsBySite.get(siteBlock.siteId) ?? [];
    const siteGatewayPreference = chooseSiteGatewayPreference(siteRows.map((row) => ({ gatewayConvention: row.gatewayConvention })));

    const targetRows = siteRows.filter((row) => {
      if (!row.recommendedPrefix) return false;
      if (!row.parsed) return true;
      if (row.capacityState === "undersized") return true;
      if (row.inSiteBlock === false) return true;
      return false;
    });

    const blockedByParentSize = targetRows.filter((row) => !canChildFitInsideParent(parsedSiteBlock, row.recommendedPrefix ?? 24));
    for (const row of blockedByParentSize) {
      const recommendedPrefix = row.recommendedPrefix ?? 24;
      const notes = [`Requested /${recommendedPrefix} cannot fit inside site block ${selectedSiteBlockCidr}.`];
      pushIssue(issues, {
        severity: "WARNING",
        code: "SUBNET_PROPOSAL_BLOCKED_BY_SITE_BLOCK",
        title: `Subnet proposal blocked by site block on VLAN ${row.vlanId}`,
        detail: `${siteBlock.siteName} cannot place a /${recommendedPrefix} subnet inside ${selectedSiteBlockCidr}.`,
        entityType: "VLAN",
        entityId: row.id,
      });
      proposals.push({
        siteId: row.siteId,
        siteName: row.siteName,
        siteCode: row.siteCode,
        vlanId: row.vlanId,
        vlanName: row.vlanName,
        role: row.role,
        reason: "proposal blocked by site block size",
        recommendedPrefix,
        notes,
      });
    }

    const allocatableRows = sortAllocationCandidates(
      targetRows.filter((row) => canChildFitInsideParent(parsedSiteBlock, row.recommendedPrefix ?? 24)),
    );
    const usedRanges = siteRows
      .filter((row) => row.parsed)
      .map((row) => ({ start: row.parsed!.network, end: row.parsed!.broadcast }));

    const allocationRequests = allocatableRows.map((row) => ({
      requestId: `${row.siteId}:${row.vlanId}`,
      prefix: row.recommendedPrefix ?? 24,
      role: row.role,
    }));
    const allocationResults = allocateRequestedBlocks(
      parsedSiteBlock,
      usedRanges,
      allocationRequests,
      { preferredGatewayConvention: siteGatewayPreference },
    );

    for (const row of allocatableRows) {
      const recommendedPrefix = row.recommendedPrefix ?? 24;
      const allocation = allocationResults.results.find((item) => item.requestId === `${row.siteId}:${row.vlanId}`);
      if (!allocation) continue;

      if (allocation.status !== "allocated" || !allocation.proposedSubnetCidr) {
        const notes = [
          `Allocation blocked: ${allocation.reason ?? "unknown"}.`,
          `Normalized used ranges inside the site block: ${allocation.normalizedUsedRangeCount}.`,
        ];
        pushIssue(issues, {
          severity: "WARNING",
          code: "SUBNET_PROPOSAL_UNAVAILABLE",
          title: `No clean subnet proposal available for VLAN ${row.vlanId}`,
          detail: allocation.reason === "prefix-outside-parent"
            ? `${siteBlock.siteName} cannot place a /${recommendedPrefix} subnet inside ${selectedSiteBlockCidr}.`
            : `${siteBlock.siteName} does not have enough free address space inside ${selectedSiteBlockCidr} for a /${recommendedPrefix} proposal.`,
          entityType: "VLAN",
          entityId: row.id,
        });
        proposals.push({
          siteId: row.siteId,
          siteName: row.siteName,
          siteCode: row.siteCode,
          vlanId: row.vlanId,
          vlanName: row.vlanName,
          role: row.role,
          reason: allocation.reason === "prefix-outside-parent" ? "proposal blocked by site block size" : "no free aligned space available",
          recommendedPrefix,
          notes,
        });
        continue;
      }

      const reasonParts: string[] = [];
      if (row.capacityState === "undersized") reasonParts.push("current subnet is undersized");
      if (row.inSiteBlock === false) reasonParts.push("current subnet is outside the site block");
      if (!row.parsed) reasonParts.push("current subnet is invalid");
      if (reasonParts.length === 0) reasonParts.push("backend design-core proposal");

      const notes: string[] = [`Proposal fits inside ${selectedSiteBlockCidr}.`];
      if (allocation.proposedGatewayIp) {
        notes.push(`Proposed gateway follows the site preference of ${siteGatewayPreference}: ${allocation.proposedGatewayIp}.`);
      }

      proposals.push({
        siteId: row.siteId,
        siteName: row.siteName,
        siteCode: row.siteCode,
        vlanId: row.vlanId,
        vlanName: row.vlanName,
        role: row.role,
        reason: reasonParts.join("; "),
        recommendedPrefix,
        proposedSubnetCidr: allocation.proposedSubnetCidr,
        proposedGatewayIp: allocation.proposedGatewayIp,
        notes,
      });

      assignments.set(`${row.siteId}:${row.vlanId}`, {
        siteId: row.siteId,
        vlanId: row.vlanId,
        proposedSubnetCidr: allocation.proposedSubnetCidr,
        proposedGatewayIp: allocation.proposedGatewayIp,
      });
    }
  }

  return { proposals, assignments };
}

function attachProposalAssignments(addressingRows: AddressRowRecord[], assignments: Map<string, ProposedSubnetAssignment>) {
  for (const row of addressingRows) {
    const assignment = assignments.get(`${row.siteId}:${row.vlanId}`);
    if (!assignment) continue;
    row.proposedSubnetCidr = assignment.proposedSubnetCidr;
    row.proposedGatewayIp = assignment.proposedGatewayIp;
    row.notes.push(`Backend proposal available: ${assignment.proposedSubnetCidr}${assignment.proposedGatewayIp ? ` via ${assignment.proposedGatewayIp}` : ""}.`);
  }
}

function buildSiteSummaries(
  siteBlocks: SiteBlockRecord[],
  addressingRows: AddressRowRecord[],
  issues: DesignCoreIssue[],
): SiteSummarizationReview[] {
  const reviews: SiteSummarizationReview[] = [];
  const rowsBySite = new Map<string, AddressRowRecord[]>();

  for (const row of addressingRows) {
    const existing = rowsBySite.get(row.siteId) ?? [];
    existing.push(row);
    rowsBySite.set(row.siteId, existing);
  }

  for (const siteBlock of siteBlocks) {
    const siteRows = (rowsBySite.get(siteBlock.siteId) ?? []).filter((row) => row.parsed || row.proposedSubnetCidr);
    const notes: string[] = [];
    const candidateRanges: ParsedCidr[] = [];

    for (const row of siteRows) {
      if (row.parsed) {
        candidateRanges.push(row.parsed);
        continue;
      }
      if (row.proposedSubnetCidr) {
        try {
          candidateRanges.push(parseCidr(row.proposedSubnetCidr));
        } catch {
          // ignore malformed proposal text
        }
      }
    }

    if (candidateRanges.length === 0) {
      reviews.push({
        siteId: siteBlock.siteId,
        siteName: siteBlock.siteName,
        siteCode: siteBlock.siteCode,
        currentSiteBlock: siteBlock.canonicalCidr ?? siteBlock.sourceValue,
        status: siteBlock.canonicalCidr ? "review" : "missing",
        coveredSubnetCount: 0,
        notes: ["No valid or proposed subnets were available yet to calculate a true site summary requirement."],
      });
      continue;
    }

    const lowestNetwork = Math.min(...candidateRanges.map((item) => item.network));
    const highestBroadcast = Math.max(...candidateRanges.map((item) => item.broadcast));
    const prefix = findCoveringSummaryPrefix(lowestNetwork, highestBroadcast);
    const minimumRequiredSummary = `${intToIpv4(parseCidr(`${intToIpv4(lowestNetwork)}/${prefix}`).network)}/${prefix}`;

    let status: SiteSummarizationReview["status"] = "good";
    const currentSiteBlock = siteBlock.canonicalCidr ?? siteBlock.proposedCidr ?? siteBlock.sourceValue;

    if (!siteBlock.canonicalCidr && !siteBlock.proposedCidr) {
      status = "missing";
      notes.push(`No confirmed site block is present. Minimum covering summary for current design is ${minimumRequiredSummary}.`);
      pushIssue(issues, {
        severity: "WARNING",
        code: "SITE_SUMMARY_MISSING",
        title: `Missing site summary review on ${siteBlock.siteName}`,
        detail: `${siteBlock.siteName} does not yet have a confirmed site summary block. Based on the current subnet set, the smallest clean summary would be ${minimumRequiredSummary}.`,
        entityType: "SITE",
        entityId: siteBlock.siteId,
      });
    } else {
      try {
        const currentParsed = parseCidr(currentSiteBlock as string);
        const minimumParsed = parseCidr(minimumRequiredSummary);
        const currentContainsNeeded = currentParsed.network <= minimumParsed.network && currentParsed.broadcast >= minimumParsed.broadcast;
        if (!currentContainsNeeded) {
          status = "review";
          notes.push(`Current site block does not fully cover the minimum required summary ${minimumRequiredSummary}.`);
          pushIssue(issues, {
            severity: "WARNING",
            code: "SITE_SUMMARY_TOO_SMALL",
            title: `Site summary should be reviewed on ${siteBlock.siteName}`,
            detail: `${currentSiteBlock} does not cleanly cover all known or proposed subnets. Minimum required summary is ${minimumRequiredSummary}.`,
            entityType: "SITE",
            entityId: siteBlock.siteId,
          });
        } else {
          notes.push(`Current site block cleanly covers the minimum required summary ${minimumRequiredSummary}.`);
        }
      } catch {
        status = "review";
        notes.push("Current site block could not be parsed during summarization review.");
      }
    }

    reviews.push({
      siteId: siteBlock.siteId,
      siteName: siteBlock.siteName,
      siteCode: siteBlock.siteCode,
      currentSiteBlock,
      minimumRequiredSummary,
      status,
      coveredSubnetCount: candidateRanges.length,
      notes,
    });
  }

  return reviews;
}

function buildTransitPlan(
  project: ProjectWithDesignData,
  organizationBlock: ReturnType<typeof evaluateOrganizationBlock>,
  siteBlocks: SiteBlockRecord[],
  addressingRows: AddressRowRecord[],
  issues: DesignCoreIssue[],
): TransitPlanRow[] {
  const plan: TransitPlanRow[] = [];
  const existingTransitRows = addressingRows.filter((row) => row.role === "WAN_TRANSIT");

  for (const row of existingTransitRows) {
    plan.push({
      kind: "existing",
      siteId: row.siteId,
      siteName: row.siteName,
      siteCode: row.siteCode,
      vlanId: row.vlanId,
      subnetCidr: row.canonicalSubnetCidr ?? row.sourceSubnetCidr,
      gatewayOrEndpoint: row.effectiveGatewayIp ?? row.proposedGatewayIp,
      notes: [...row.notes],
    });
  }

  const requiresTransitPlanning = project.sites.length > 1;
  if (!requiresTransitPlanning) {
    return plan;
  }

  if (existingTransitRows.length > 0) {
    return plan;
  }

  if (organizationBlock.validationState !== "valid" || !organizationBlock.parsed) {
    pushIssue(issues, {
      severity: "INFO",
      code: "TRANSIT_PLAN_DEFERRED",
      title: "Transit planning deferred",
      detail: "Multi-site transit planning could not be proposed because the organization block is not ready for safe allocator use.",
      entityType: "PROJECT",
      entityId: project.id,
    });
    return plan;
  }

  const usedRanges: Array<{ start: number; end: number }> = [];
  for (const block of siteBlocks) {
    if (block.parsed) usedRanges.push({ start: block.parsed.network, end: block.parsed.broadcast });
    if (!block.parsed && block.proposedCidr) {
      try {
        const parsed = parseCidr(block.proposedCidr);
        usedRanges.push({ start: parsed.network, end: parsed.broadcast });
      } catch {
        // ignore
      }
    }
  }
  for (const row of addressingRows) {
    if (row.parsed) usedRanges.push({ start: row.parsed.network, end: row.parsed.broadcast });
    if (!row.parsed && row.proposedSubnetCidr) {
      try {
        const parsed = parseCidr(row.proposedSubnetCidr);
        usedRanges.push({ start: parsed.network, end: parsed.broadcast });
      } catch {
        // ignore
      }
    }
  }

  const firstSite = project.sites[0];
  if (!firstSite) return plan;

  const transitTargets: ProjectWithDesignData["sites"] = project.sites.slice(1);
  const allocationResults = allocateRequestedBlocks(
    organizationBlock.parsed,
    usedRanges,
    transitTargets.map((site: ProjectWithDesignData["sites"][number]) => ({ requestId: site.id, prefix: 31, role: "WAN_TRANSIT" as SegmentRole })),
    { preferredGatewayConvention: "first-usable" },
  );

  for (const remoteSite of transitTargets) {
    const allocation = allocationResults.results.find((item) => item.requestId === remoteSite.id);
    if (!allocation || allocation.status !== "allocated" || !allocation.proposedSubnetCidr) {
      pushIssue(issues, {
        severity: "WARNING",
        code: "TRANSIT_PROPOSAL_UNAVAILABLE",
        title: `Transit proposal unavailable for ${remoteSite.name}`,
        detail: `A clean /31 transit block could not be proposed for ${firstSite.name} to ${remoteSite.name} inside ${organizationBlock.canonicalCidr}.`,
        entityType: "SITE",
        entityId: remoteSite.id,
      });
      continue;
    }

    const parsedTransit = parseCidr(allocation.proposedSubnetCidr);
    const facts = describeSubnet(parsedTransit, "WAN_TRANSIT");
    plan.push({
      kind: "proposed",
      siteId: remoteSite.id,
      siteName: remoteSite.name,
      siteCode: remoteSite.siteCode,
      subnetCidr: allocation.proposedSubnetCidr,
      gatewayOrEndpoint: allocation.proposedGatewayIp,
      notes: [`Proposed hub-to-site transit from ${firstSite.name} to ${remoteSite.name}.`, `Second endpoint should use ${facts.lastUsableIp ?? "the peer address"}.`],
    });
  }

  return plan;
}

function buildLoopbackPlan(
  project: ProjectWithDesignData,
  organizationBlock: ReturnType<typeof evaluateOrganizationBlock>,
  siteBlocks: SiteBlockRecord[],
  addressingRows: AddressRowRecord[],
  issues: DesignCoreIssue[],
): LoopbackPlanRow[] {
  const plan: LoopbackPlanRow[] = [];
  const existingLoopbacks = addressingRows.filter((row) => row.role === "LOOPBACK");

  for (const row of existingLoopbacks) {
    plan.push({
      kind: "existing",
      siteId: row.siteId,
      siteName: row.siteName,
      siteCode: row.siteCode,
      vlanId: row.vlanId,
      subnetCidr: row.canonicalSubnetCidr ?? row.sourceSubnetCidr,
      endpointIp: row.effectiveGatewayIp ?? row.proposedGatewayIp ?? row.canonicalSubnetCidr?.split("/")[0],
      notes: [...row.notes],
    });
  }

  const sitesMissingLoopbacks = project.sites.filter((site: ProjectWithDesignData["sites"][number]) => !existingLoopbacks.some((row) => row.siteId === site.id));
  if (sitesMissingLoopbacks.length === 0) return plan;

  const reserveParentBlocks = siteBlocks.filter((block) => block.canonicalCidr || block.proposedCidr);
  const usedRanges: Array<{ start: number; end: number }> = [];
  for (const row of addressingRows) {
    if (row.parsed) usedRanges.push({ start: row.parsed.network, end: row.parsed.broadcast });
    if (!row.parsed && row.proposedSubnetCidr) {
      try {
        const parsed = parseCidr(row.proposedSubnetCidr);
        usedRanges.push({ start: parsed.network, end: parsed.broadcast });
      } catch {
        // ignore
      }
    }
  }

  for (const site of sitesMissingLoopbacks) {
    const siteBlock = reserveParentBlocks.find((block) => block.siteId === site.id);
    let parent: ParsedCidr | null = null;
    try {
      if (siteBlock?.canonicalCidr) parent = parseCidr(siteBlock.canonicalCidr);
      else if (siteBlock?.proposedCidr) parent = parseCidr(siteBlock.proposedCidr);
      else if (organizationBlock.validationState === "valid" && organizationBlock.parsed) parent = organizationBlock.parsed;
    } catch {
      parent = null;
    }

    if (!parent) {
      pushIssue(issues, {
        severity: "INFO",
        code: "LOOPBACK_PLAN_DEFERRED",
        title: `Loopback planning deferred for ${site.name}`,
        detail: `No safe parent block was available to suggest a loopback for ${site.name}.`,
        entityType: "SITE",
        entityId: site.id,
      });
      continue;
    }

    const allocation = findNextAvailableNetworkDetailed(parent, 32, usedRanges);
    const proposed = allocation.proposed;
    if (allocation.status !== "allocated" || !proposed) {
      pushIssue(issues, {
        severity: "WARNING",
        code: "LOOPBACK_PROPOSAL_UNAVAILABLE",
        title: `Loopback proposal unavailable for ${site.name}`,
        detail: `A clean /32 loopback could not be proposed inside ${intToIpv4(parent.network)}/${parent.prefix}.`,
        entityType: "SITE",
        entityId: site.id,
      });
      continue;
    }

    const endpointIp = intToIpv4(proposed.network);
    plan.push({
      kind: "proposed",
      siteId: site.id,
      siteName: site.name,
      siteCode: site.siteCode,
      subnetCidr: `${endpointIp}/32`,
      endpointIp,
      notes: ["Proposed loopback for routing identity and management references.", "If the environment uses router IDs or tunnel endpoints, confirm this value before implementation."],
    });
    usedRanges.push({ start: proposed.network, end: proposed.broadcast });
  }

  return plan;
}





















export function buildDesignCoreSnapshot(project: ProjectWithDesignData): DesignCoreSnapshot | null {
  if (!project) return null;

  const issues: DesignCoreIssue[] = [];
  const organizationBlock = evaluateOrganizationBlock(project, issues);
  const traceability = buildTraceability(project);
  const siteBlocks = proposeSiteBlocks(project, organizationBlock, buildSiteBlockRecords(project, organizationBlock, issues), issues);
  const addressingRows = buildAddressingRows(project, siteBlocks, issues);
  const { proposals, assignments } = proposeSubnetRows(siteBlocks, addressingRows, issues);
  attachProposalAssignments(addressingRows, assignments);
  const siteSummaries = buildSiteSummaries(siteBlocks, addressingRows, issues);
  const transitPlan = buildTransitPlan(project, organizationBlock, siteBlocks, addressingRows, issues);
  const loopbackPlan = buildLoopbackPlan(project, organizationBlock, siteBlocks, addressingRows, issues);
  const currentStateBoundary = buildCurrentStateBoundary(siteBlocks, addressingRows, issues);
  const truthStateSummary = buildTruthStateLedger(currentStateBoundary);
  const allocationPolicy = buildAllocationPolicySummary(organizationBlock, siteBlocks, addressingRows, transitPlan, loopbackPlan);
  const routingIntent = buildRoutingIntentSummary(project, siteSummaries, transitPlan, loopbackPlan, issues);
  const routeDomain = buildRouteDomainSummary(project, siteSummaries, transitPlan, loopbackPlan);
  const securityIntent = buildSecurityIntentSummary(project, addressingRows);
  const policyConsequences = buildPolicyConsequenceSummary(securityIntent, traceability);
  const traceabilityCoverage = buildTraceabilityCoverageSummary(traceability);
  const wanPlan = buildWanPlanSummary(project, transitPlan, traceability);
  const brownfieldReadiness = buildBrownfieldReadinessSummary(project, currentStateBoundary, traceabilityCoverage);
  const discoveredStateImportPlan = buildDiscoveredStateImportPlanSummary(brownfieldReadiness, currentStateBoundary, traceabilityCoverage);
  const allocatorConfidence = buildAllocatorConfidenceSummary(issues);
  const implementationReadiness = buildImplementationReadinessSummary(issues, currentStateBoundary, routeDomain, policyConsequences);
  const standardsAlignment = buildStandardsAlignmentSummary(project, organizationBlock, siteSummaries, transitPlan, securityIntent, allocationPolicy, issues);
  for (const note of buildStandardsEnforcementNotes(standardsAlignment)) {
    pushIssue(issues, {
      severity: "ERROR",
      code: "STANDARDS_REQUIRED_RULE_BLOCKER",
      title: "Required standards blockers remain",
      detail: note,
      entityType: "PROJECT",
      entityId: project.id,
    });
  }
  const planningInputCoverage = buildPlanningInputCoverageSummary(project);
  const planningInputDiscipline = buildPlanningInputDisciplineSummary(planningInputCoverage, routingIntent, securityIntent, policyConsequences, wanPlan, siteSummaries, proposals, standardsAlignment);
  const requirementsCoverage = buildRequirementsCoverageSummary(project);
  const engineConfidence = buildEngineConfidenceSummary(traceabilityCoverage, allocatorConfidence, brownfieldReadiness, implementationReadiness, routeDomain, standardsAlignment, planningInputCoverage, requirementsCoverage);
  const allocatorDeterminism = buildAllocatorDeterminismSummary(issues, siteBlocks, proposals);

  const generatedAt = new Date().toISOString();

  const summary = {
    siteCount: project.sites.length,
    vlanCount: addressingRows.length,
    validSiteBlockCount: siteBlocks.filter((item) => item.validationState === "valid").length,
    validSubnetCount: addressingRows.filter((item) => Boolean(item.canonicalSubnetCidr)).length,
    issueCount: issues.length,
    proposedSiteBlockCount: siteBlocks.filter((item) => Boolean(item.proposedCidr)).length,
    proposalCount: proposals.length,
    planningInputNotReflectedCount: planningInputDiscipline.notReflectedCount,
    traceabilityCount: traceability.length,
    summarizationReviewCount: siteSummaries.length,
    transitPlanCount: transitPlan.length,
    loopbackPlanCount: loopbackPlan.length,
    readyForBackendAuthority: !issues.some((issue) => issue.severity === "ERROR"),
    readyForLiveMappingSplit: currentStateBoundary.liveMappingReady,
  };

  return {
    projectId: project.id,
    projectName: project.name,
    generatedAt,
    authority: {
      source: "backend-design-core",
      mode: "authoritative",
      generatedAt,
      requiresEngineerReview: true,
    },
    organizationBlock: {
      sourceValue: organizationBlock.sourceValue,
      canonicalCidr: organizationBlock.canonicalCidr,
      validationState: organizationBlock.validationState,
      notes: organizationBlock.notes,
    },
    summary,
    truthStateSummary,
    allocationPolicy,
    routingIntent,
    routeDomain,
    securityIntent,
    policyConsequences,
    traceabilityCoverage,
    wanPlan,
    brownfieldReadiness,
    discoveredStateImportPlan,
    allocatorConfidence,
    implementationReadiness,
    engineConfidence,
    allocatorDeterminism,
    standardsAlignment,
    planningInputCoverage,
    planningInputDiscipline,
    requirementsCoverage,
    currentStateBoundary,
    siteBlocks: siteBlocks.map(({ parsed: _parsed, ...item }) => item),
    addressingRows: addressingRows.map(({ parsed: _parsed, ...item }) => item),
    proposedRows: proposals,
    siteSummaries,
    transitPlan,
    loopbackPlan,
    traceability,
    standardsRulebook: NETWORK_STANDARDS_RULEBOOK,
    planningInputAudit: PLANNING_INPUT_AUDIT_ITEMS,
    issues: issues.sort((left, right) => left.code.localeCompare(right.code)),
  };
}

export async function getDesignCoreSnapshot(projectId: string, userId: string) {
  await ensureCanViewProject(userId, projectId);
  const project = await getProjectDesignData(projectId);
  return buildDesignCoreSnapshot(project);
}

export async function getDesignCoreSnapshotForExport(projectId: string) {
  const project = await getProjectDesignData(projectId);
  return buildDesignCoreSnapshot(project);
}
export type { DesignCoreIssue, DesignCoreSiteBlock, DesignCoreAddressRow, DesignCoreProposalRow, DesignTraceabilityItem, CurrentStateBoundarySummary, SiteSummarizationReview, TransitPlanRow, LoopbackPlanRow, TruthStateLedger, AllocationPolicySummary, RoutingIntentSummary, SecurityIntentSummary, TraceabilityCoverageSummary, WanPlanSummary, BrownfieldReadinessSummary, AllocatorConfidenceSummary, RouteDomainSummary, PolicyConsequenceSummary, DiscoveredStateImportPlanSummary, ImplementationReadinessSummary, EngineConfidenceSummary, AllocatorDeterminismSummary, StandardsRuleEvaluation, StandardsAlignmentSummary, ActivePlanningInputSummary, PlanningInputCoverageSummary, RequirementsCoverageArea, RequirementsCoverageSummary, PlanningInputDisciplineItem, PlanningInputDisciplineSummary, DesignCoreSnapshot } from "./designCore.types.js";
