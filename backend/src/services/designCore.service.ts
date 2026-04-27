import { ensureCanViewProject } from "./access.service.js";
import {
  classifyGatewayConvention,
  defaultGatewayForSubnet,
  findCoveringSummaryPrefix,
  hasMeaningfulValue,
  isPrivateIpv4Cidr,
  parseJsonMap,
  pushIssue,
  rangeSummary,
  valueAsBoolean,
  valueAsString,
} from "./designCore/designCore.helpers.js";
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
  summarizeStandardsRulebook,
  type StandardsRule,
  type StandardsRulebookSummary,
  type StandardsRuleStatus,
} from "../lib/networkStandardsRulebook.js";
import {
  PLANNING_INPUT_AUDIT_ITEMS,
  summarizePlanningInputAudit,
  type PlanningInputAuditItem,
  type PlanningInputAuditSummary,
} from "../lib/planningInputAudit.js";

import type { DesignCoreIssue, DesignCoreSiteBlock, DesignCoreAddressRow, DesignCoreProposalRow, DesignTraceabilityItem, CurrentStateBoundarySummary, SiteSummarizationReview, TransitPlanRow, LoopbackPlanRow, TruthStateLedger, AllocationPolicySummary, RoutingIntentSummary, SecurityIntentSummary, TraceabilityCoverageSummary, WanPlanSummary, BrownfieldReadinessSummary, AllocatorConfidenceSummary, RouteDomainSummary, PolicyConsequenceSummary, DiscoveredStateImportPlanSummary, ImplementationReadinessSummary, EngineConfidenceSummary, AllocatorDeterminismSummary, StandardsRuleEvaluation, StandardsAlignmentSummary, ActivePlanningInputSummary, PlanningInputCoverageSummary, RequirementsCoverageArea, RequirementsCoverageSummary, PlanningInputDisciplineItem, PlanningInputDisciplineSummary, DesignCoreSnapshot } from "./designCore.types.js";

type ProjectWithDesignData = NonNullable<Awaited<ReturnType<typeof getProjectDesignData>>>;
type SiteBlockRecord = DesignCoreSiteBlock & { parsed?: ParsedCidr };
type AddressRowRecord = DesignCoreAddressRow & { parsed?: ParsedCidr };

type ProposedSubnetAssignment = {
  siteId: string;
  vlanId: number;
  proposedSubnetCidr?: string;
  proposedGatewayIp?: string;
};

function buildTraceability(project: ProjectWithDesignData): DesignTraceabilityItem[] {
  const requirements = parseJsonMap(project.requirementsJson);
  const discovery = parseJsonMap(project.discoveryJson);
  const platform = parseJsonMap(project.platformProfileJson);
  const traceability: DesignTraceabilityItem[] = [];

  const addTrace = (
    sourceArea: DesignTraceabilityItem["sourceArea"],
    sourceKey: string,
    sourceLabel: string,
    sourceValue: unknown,
    impacts: string[],
    confidence: DesignTraceabilityItem["confidence"],
  ) => {
    const text = valueAsString(sourceValue);
    if (!text) return;
    traceability.push({
      sourceArea,
      sourceKey,
      sourceLabel,
      sourceValue: text,
      impacts,
      confidence,
    });
  };

  addTrace("requirements", "planningFor", "Planning objective", requirements.planningFor, [
    "Architecture pattern selection",
    "Documentation tone and output package",
  ], "high");
  addTrace("requirements", "primaryGoal", "Primary design goal", requirements.primaryGoal, [
    "Validation emphasis",
    "Segmentation and routing tradeoffs",
  ], "high");
  addTrace("requirements", "usersPerSite", "Users per site", requirements.usersPerSite, [
    "Subnet sizing",
    "Growth buffer calculations",
    "Wireless and access-layer assumptions",
  ], "high");
  addTrace("requirements", "remoteAccess", "Remote access requirement", requirements.remoteAccess, [
    "Security architecture",
    "VPN and identity boundary planning",
  ], valueAsBoolean(requirements.remoteAccess) ? "high" : "advisory");
  addTrace("requirements", "guestWifi", "Guest access requirement", requirements.guestWifi, [
    "Guest segmentation",
    "Firewall and policy boundaries",
  ], valueAsBoolean(requirements.guestWifi) ? "high" : "advisory");
  addTrace("requirements", "voice", "Voice requirement", requirements.voice, [
    "Voice VLAN planning",
    "QoS intent",
  ], valueAsBoolean(requirements.voice) ? "high" : "advisory");
  addTrace("requirements", "iot", "IoT / OT requirement", requirements.iot, [
    "Specialty segmentation",
    "Trust boundary hardening",
  ], valueAsBoolean(requirements.iot) ? "high" : "advisory");
  addTrace("requirements", "serverPlacement", "Server placement", requirements.serverPlacement, [
    "Shared services placement",
    "WAN dependency assumptions",
  ], "medium");
  addTrace("requirements", "internetModel", "Internet breakout model", requirements.internetModel, [
    "WAN edge design",
    "Firewall placement intent",
  ], "medium");
  addTrace("requirements", "complianceProfile", "Compliance profile", requirements.complianceProfile, [
    "Security control strictness",
    "Logging and segmentation requirements",
  ], "medium");
  addTrace("discovery", "topologyBaseline", "Current topology baseline", discovery.topologyBaseline, [
    "Current-state mapping readiness",
    "Brownfield reconciliation",
  ], "medium");
  addTrace("discovery", "addressingVlanBaseline", "Addressing baseline", discovery.addressingVlanBaseline, [
    "Current-state addressing trust",
    "Conflict detection depth",
  ], "medium");
  addTrace("discovery", "routingTransportBaseline", "Routing baseline", discovery.routingTransportBaseline, [
    "Routing design intent",
    "Migration risk analysis",
  ], "medium");
  addTrace("discovery", "securityPosture", "Security posture", discovery.securityPosture, [
    "Firewall and zone design",
    "Management access boundaries",
  ], "medium");
  addTrace("platform", "routingPosture", "Routing posture", platform.routingPosture, [
    "Routing protocol intent",
    "Summarization expectations",
  ], "medium");
  addTrace("platform", "firewallPosture", "Firewall posture", platform.firewallPosture, [
    "Policy baseline",
    "Security design narrative",
  ], "medium");
  addTrace("platform", "wanPosture", "WAN posture", platform.wanPosture, [
    "WAN topology intent",
    "Transit subnet planning",
  ], "medium");
  addTrace("platform", "cloudPosture", "Cloud posture", platform.cloudPosture, [
    "Cloud boundary planning",
    "Hybrid routing assumptions",
  ], "medium");

  return traceability;
}

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


function buildAllocationPolicySummary(
  organizationBlock: ReturnType<typeof evaluateOrganizationBlock>,
  siteBlocks: SiteBlockRecord[],
  addressingRows: AddressRowRecord[],
  transitPlan: TransitPlanRow[],
  loopbackPlan: LoopbackPlanRow[],
): AllocationPolicySummary {
  const notes: string[] = [];
  const configuredSiteBlocks = siteBlocks.filter((item) => Boolean(item.canonicalCidr)).length;
  const proposedSiteBlocks = siteBlocks.filter((item) => Boolean(item.proposedCidr)).length;
  const gatewayModes = new Set(addressingRows.map((row) => row.gatewayConvention).filter((value) => value !== "not-applicable"));

  let siteAllocationMode: AllocationPolicySummary["siteAllocationMode"] = "configured";
  if (configuredSiteBlocks > 0 && proposedSiteBlocks > 0) siteAllocationMode = "mixed";
  else if (configuredSiteBlocks === 0 && proposedSiteBlocks > 0) siteAllocationMode = "backend-proposed";

  let gatewayMode: AllocationPolicySummary["gatewayMode"] = "not-applicable";
  if (gatewayModes.size === 1) {
    gatewayMode = Array.from(gatewayModes)[0] as AllocationPolicySummary["gatewayMode"];
  } else if (gatewayModes.size > 1) {
    gatewayMode = "mixed";
  }

  if (siteAllocationMode === "mixed") {
    notes.push("Some site summary blocks are saved and some are currently backend-proposed. Confirm the final per-site hierarchy before treating it as review-ready.");
  }
  if (gatewayMode === "mixed") {
    notes.push("Gateway conventions vary across the project. That can be acceptable, but it should be deliberate rather than accidental.");
  }
  if (transitPlan.some((item) => item.kind === "proposed")) {
    notes.push("Transit allocations are currently planned with /31 preference where the environment looks multi-site.");
  }
  if (loopbackPlan.some((item) => item.kind === "proposed")) {
    notes.push("Loopbacks are currently planned as one /32 identity allocation per site when needed.");
  }

  return {
    organizationBlockStrategy: organizationBlock.validationState === "valid" ? "confirmed" : organizationBlock.validationState,
    siteAllocationMode,
    gatewayMode,
    transitMode: transitPlan.length > 0 ? "/31-preferred" : "deferred",
    loopbackMode: loopbackPlan.length > 0 ? "/32-per-site" : "deferred",
    notes,
  };
}

function buildRoutingIntentSummary(
  project: ProjectWithDesignData,
  siteSummaries: SiteSummarizationReview[],
  transitPlan: TransitPlanRow[],
  loopbackPlan: LoopbackPlanRow[],
  issues: DesignCoreIssue[],
): RoutingIntentSummary {
  const platform = parseJsonMap(project.platformProfileJson);
  const topologyStyle: RoutingIntentSummary["topologyStyle"] = project.sites.length <= 1 ? "single-site" : "hub-and-spoke";
  const routingPosture = valueAsString(platform.routingPosture) || (project.sites.length <= 1 ? "single-site routed access" : "summarized multi-site routing");
  const hasSummaryBlocker = siteSummaries.some((item) => item.status === "missing") || issues.some((issue) => issue.code === "SITE_BLOCK_OVERLAP");
  const hasSummaryReview = siteSummaries.some((item) => item.status === "review");
  const proposedTransitCount = transitPlan.filter((item) => item.kind === "proposed").length;
  const proposedLoopbackCount = loopbackPlan.filter((item) => item.kind === "proposed").length;
  const notes: string[] = [];

  if (hasSummaryBlocker) notes.push("At least one site still lacks a stable summary boundary, so routing summarization is not yet clean enough to be treated as final.");
  else if (hasSummaryReview) notes.push("Site summary boundaries exist but still need review before they should drive protocol summarization decisions.");
  else notes.push("Site summary boundaries are clean enough to support routing-domain summarization planning.");

  if (project.sites.length > 1 && proposedTransitCount === 0 && !transitPlan.some((item) => item.kind === "existing")) {
    notes.push("The project looks multi-site, but no transit segments are confirmed yet. Review WAN adjacency and transport intent before implementation.");
  }
  if (proposedLoopbackCount === 0 && !loopbackPlan.some((item) => item.kind === "existing")) {
    notes.push("No loopback identity segments are confirmed yet. That may be acceptable for simpler environments, but routed designs often benefit from stable loopback references.");
  }

  return {
    topologyStyle,
    routingPosture,
    summarizationReadiness: hasSummaryBlocker ? "blocked" : hasSummaryReview ? "review" : "ready",
    transitReadiness: project.sites.length <= 1 ? "deferred" : proposedTransitCount > 0 || transitPlan.some((item) => item.kind === "existing") ? "ready" : "partial",
    loopbackReadiness: proposedLoopbackCount > 0 || loopbackPlan.some((item) => item.kind === "existing") ? "ready" : "partial",
    notes,
  };
}

function buildSecurityIntentSummary(project: ProjectWithDesignData, addressingRows: AddressRowRecord[]): SecurityIntentSummary {
  const requirements = parseJsonMap(project.requirementsJson);
  const zoneNames = Array.from(new Set(addressingRows.map((row) => row.role))).sort();
  const managementIsolationExpected = valueAsBoolean(requirements.management) || zoneNames.includes("MANAGEMENT");
  const guestIsolationExpected = valueAsBoolean(requirements.guestWifi) || zoneNames.includes("GUEST");
  const remoteAccessExpected = valueAsBoolean(requirements.remoteAccess);
  const eastWestSegmentationExpected = valueAsBoolean(requirements.iot) || zoneNames.includes("SERVER") || zoneNames.includes("IOT");
  const notes: string[] = [];
  if (guestIsolationExpected) notes.push("Guest access should remain separated from trusted user and management zones.");
  if (managementIsolationExpected) notes.push("Management plane traffic should be restricted to approved administrative paths.");
  if (remoteAccessExpected) notes.push("Remote access requirements imply VPN, identity, and logging control points.");
  if (eastWestSegmentationExpected) notes.push("East-west segmentation should be explicit where servers, management, IoT, or specialty segments exist.");

  let posture: SecurityIntentSummary["posture"] = "baseline";
  if (guestIsolationExpected || managementIsolationExpected || remoteAccessExpected) posture = "segmented";
  if (eastWestSegmentationExpected && (guestIsolationExpected || managementIsolationExpected)) posture = "restricted";

  return {
    zoneNames,
    managementIsolationExpected,
    guestIsolationExpected,
    remoteAccessExpected,
    eastWestSegmentationExpected,
    posture,
    notes,
  };
}

function buildRouteDomainSummary(
  project: ProjectWithDesignData,
  siteSummaries: SiteSummarizationReview[],
  transitPlan: TransitPlanRow[],
  loopbackPlan: LoopbackPlanRow[],
): RouteDomainSummary {
  const notes: string[] = [];
  const domainModel: RouteDomainSummary["domainModel"] = project.sites.length <= 1
    ? "single-domain"
    : siteSummaries.every((item) => item.status === "good")
      ? "site-summarized"
      : "mixed";
  const summarizationBoundariesReady = siteSummaries.length > 0 && siteSummaries.every((item) => item.status === "good");
  const transitGraphReady = project.sites.length <= 1 || transitPlan.some((item) => item.kind === "existing" || item.kind === "proposed");
  const routeIdentityReady = loopbackPlan.some((item) => item.kind === "existing" || item.kind === "proposed") || project.sites.length <= 1;

  if (!summarizationBoundariesReady) notes.push("Route-domain summarization is not fully ready because at least one site still lacks a clean summary boundary.");
  else notes.push("Site summary boundaries are strong enough to anchor route-domain summarization.");
  if (!transitGraphReady) notes.push("Transit graph planning is still incomplete, so WAN adjacency intent should not yet be treated as final.");
  if (!routeIdentityReady) notes.push("Stable route-identity references are still incomplete because loopback planning is not yet present everywhere it would help.");

  return {
    domainModel,
    summarizationBoundariesReady,
    transitGraphReady,
    routeIdentityReady,
    notes,
  };
}

function buildPolicyConsequenceSummary(
  securityIntent: SecurityIntentSummary,
  traceability: DesignTraceabilityItem[],
): PolicyConsequenceSummary {
  const notes: string[] = [];
  const traceKeys = new Set(traceability.map((item) => `${item.sourceArea}:${item.sourceKey}`));

  const managementPlaneProtectionState: PolicyConsequenceSummary["managementPlaneProtectionState"] = securityIntent.managementIsolationExpected
    ? "expected"
    : traceKeys.has("discovery:securityPosture") || securityIntent.zoneNames.includes("MANAGEMENT")
      ? "partial"
      : "not-signaled";

  const guestContainmentState: PolicyConsequenceSummary["guestContainmentState"] = securityIntent.guestIsolationExpected
    ? "expected"
    : securityIntent.zoneNames.includes("GUEST")
      ? "partial"
      : "not-signaled";

  const remoteAccessControlState: PolicyConsequenceSummary["remoteAccessControlState"] = securityIntent.remoteAccessExpected
    ? "expected"
    : traceKeys.has("requirements:remoteAccess")
      ? "partial"
      : "not-signaled";

  const eastWestRestrictionState: PolicyConsequenceSummary["eastWestRestrictionState"] = securityIntent.eastWestSegmentationExpected
    ? "expected"
    : securityIntent.zoneNames.includes("SERVER") || securityIntent.zoneNames.includes("IOT")
      ? "partial"
      : "not-signaled";

  if (managementPlaneProtectionState !== "expected") notes.push("Management-plane policy consequences are not yet fully signaled from requirements and design structure.");
  if (guestContainmentState !== "expected" && securityIntent.zoneNames.includes("GUEST")) notes.push("Guest segments exist, but guest-containment intent still needs stronger policy consequence signaling.");
  if (remoteAccessControlState === "expected") notes.push("Remote access requirements imply identity, VPN, logging, and restricted management-plane consequences.");
  if (eastWestRestrictionState === "expected") notes.push("Server, IoT, and management presence imply stronger east-west restriction consequences.");

  return {
    managementPlaneProtectionState,
    guestContainmentState,
    remoteAccessControlState,
    eastWestRestrictionState,
    notes,
  };
}

function buildDiscoveredStateImportPlanSummary(
  brownfieldReadiness: BrownfieldReadinessSummary,
  currentStateBoundary: CurrentStateBoundarySummary,
  traceabilityCoverage: TraceabilityCoverageSummary,
): DiscoveredStateImportPlanSummary {
  const suggestedSources = ["spreadsheet addressing export", "device inventory export", "configuration excerpts", "NMS or CMDB data"].filter(Boolean);
  const requiredNormalizations = [
    "canonical CIDR format",
    "site-code and site-name matching",
    "VLAN ID and VLAN name normalization",
    "gateway and subnet reconciliation",
    "truth-state tagging for discovered objects",
  ];
  const notes: string[] = [];
  let readiness: DiscoveredStateImportPlanSummary["readiness"] = "not-ready";

  if (brownfieldReadiness.importReadiness === "ready" && currentStateBoundary.liveMappingReady && traceabilityCoverage.coverageState !== "thin") readiness = "ready";
  else if (brownfieldReadiness.importReadiness !== "not-ready" || currentStateBoundary.liveMappingReady) readiness = "review";

  if (readiness === "not-ready") notes.push("Discovered-state import should wait until addressing boundaries and traceability are cleaner.");
  if (readiness === "review") notes.push("Discovered-state import looks feasible, but normalization and reconciliation rules should be confirmed before it is trusted for planning.");
  if (readiness === "ready") notes.push("The project is structurally ready for a first discovered-state import pass, as long as imported data is normalized into canonical design objects.");

  return {
    readiness,
    suggestedSources,
    requiredNormalizations,
    notes,
  };
}

function buildImplementationReadinessSummary(
  issues: DesignCoreIssue[],
  currentStateBoundary: CurrentStateBoundarySummary,
  routeDomain: RouteDomainSummary,
  policyConsequences: PolicyConsequenceSummary,
): ImplementationReadinessSummary {
  const blockers = Array.from(new Set(
    issues
      .filter((issue) => issue.severity === "ERROR")
      .map((issue) => issue.code),
  )).sort();

  const prerequisites: string[] = [];
  const notes: string[] = [];
  if (!currentStateBoundary.currentStateReady) prerequisites.push("clean current-state addressing and gateway blockers");
  if (!routeDomain.summarizationBoundariesReady) prerequisites.push("confirm site summary boundaries");
  if (!routeDomain.transitGraphReady) prerequisites.push("confirm WAN adjacency and transit intent");
  if (policyConsequences.managementPlaneProtectionState !== "expected") prerequisites.push("confirm management-plane restriction intent");
  if (policyConsequences.guestContainmentState === "partial") prerequisites.push("confirm guest isolation policy consequences");

  let state: ImplementationReadinessSummary["state"] = "ready";
  if (blockers.length > 0) state = "blocked";
  else if (prerequisites.length > 0) state = "review";

  if (state === "blocked") notes.push("Implementation planning is blocked because structural design errors still exist.");
  if (state === "review") notes.push("Implementation planning can begin at a draft level, but prerequisite design confirmations are still outstanding.");
  if (state === "ready") notes.push("Implementation planning can proceed because no structural blockers remain and the main route and policy prerequisites are signaled.");

  return {
    state,
    blockers,
    prerequisites,
    notes,
  };
}

function buildEngineConfidenceSummary(
  traceabilityCoverage: TraceabilityCoverageSummary,
  allocatorConfidence: AllocatorConfidenceSummary,
  brownfieldReadiness: BrownfieldReadinessSummary,
  implementationReadiness: ImplementationReadinessSummary,
  routeDomain: RouteDomainSummary,
  standardsAlignment: StandardsAlignmentSummary,
  planningInputCoverage: PlanningInputCoverageSummary,
  requirementsCoverage: RequirementsCoverageSummary,
): EngineConfidenceSummary {
  let score = 100;
  const drivers: string[] = [];
  const notes: string[] = [];

  if (allocatorConfidence.state === "medium") {
    score -= 15;
    drivers.push("allocator confidence reduced by structural addressing blockers");
  } else if (allocatorConfidence.state === "low") {
    score -= 30;
    drivers.push("allocator confidence reduced by multiple structural addressing blockers");
  } else {
    drivers.push("allocator confidence is strong");
  }

  if (traceabilityCoverage.coverageState === "partial") {
    score -= 10;
    drivers.push("traceability coverage is partial");
  } else if (traceabilityCoverage.coverageState === "thin") {
    score -= 20;
    drivers.push("traceability coverage is thin");
  } else {
    drivers.push("traceability coverage is strong");
  }

  if (brownfieldReadiness.currentStateEvidence === "partial") {
    score -= 8;
    drivers.push("current-state evidence is only partial");
  } else if (brownfieldReadiness.currentStateEvidence === "thin") {
    score -= 15;
    drivers.push("current-state evidence is thin");
  }

  if (!routeDomain.summarizationBoundariesReady) {
    score -= 10;
    drivers.push("route-domain summarization boundaries still need work");
  }
  if (!routeDomain.transitGraphReady) {
    score -= 7;
    drivers.push("WAN transit graph is not fully ready");
  }
  if (implementationReadiness.state === "blocked") {
    score -= 15;
    drivers.push("implementation readiness is blocked");
  } else if (implementationReadiness.state === "review") {
    score -= 5;
    drivers.push("implementation readiness still needs review");
  }

  if (standardsAlignment.violatedRuleIds.length > 0) {
    score -= Math.min(20, standardsAlignment.violatedRuleIds.length * 8);
    drivers.push("one or more required standards rulebook items are currently violated");
  }
  if (standardsAlignment.reviewRuleIds.length > 0) {
    score -= Math.min(10, standardsAlignment.reviewRuleIds.length * 2);
    drivers.push("some standards and best-practice items still need engineering review");
  }
  if (planningInputCoverage.activeNotYetImplementedCount > 0) {
    score -= Math.min(10, planningInputCoverage.activeNotYetImplementedCount * 3);
    drivers.push("the current project uses saved inputs that still do not change outputs deeply enough");
  }

  if (requirementsCoverage.missingCount > 0) {
    score -= Math.min(12, requirementsCoverage.missingCount * 2);
    drivers.push("some planning requirement areas are still missing or too shallow to drive strong outputs");
  }
  if (requirementsCoverage.partialCount > 0) {
    score -= Math.min(8, requirementsCoverage.partialCount);
    drivers.push("some planning requirement areas are only partially implemented in the current engine");
  }

  score = Math.max(0, Math.min(100, score));
  let state: EngineConfidenceSummary["state"] = "high";
  if (score < 80) state = "medium";
  if (score < 60) state = "low";

  if (state === "high") notes.push("Engine confidence is high enough for serious design review use, though not a substitute for implementation review.");
  if (state === "medium") notes.push("Engine confidence is usable, but the design still needs targeted review before it should be treated as review-ready.");
  if (state === "low") notes.push("Engine confidence is currently too low for blind trust because structural design or traceability weaknesses still remain.");

  return {
    state,
    score,
    drivers,
    notes,
  };
}

function buildTraceabilityCoverageSummary(traceability: DesignTraceabilityItem[]): TraceabilityCoverageSummary {
  const missingAreas = ["requirements", "discovery", "platform"].filter((area) => !traceability.some((item) => item.sourceArea === area));
  const notes: string[] = [];
  let coverageState: TraceabilityCoverageSummary["coverageState"] = "thin";
  if (traceability.length >= 8 && missingAreas.length === 0) coverageState = "strong";
  else if (traceability.length >= 4) coverageState = "partial";

  if (missingAreas.length > 0) notes.push(`Traceability is still missing coverage from: ${missingAreas.join(", ")}.`);
  if (coverageState === "thin") notes.push("Design explainability is still shallow. Save more requirement, discovery, or platform details if this package will be used for review or migration planning.");
  if (coverageState === "strong") notes.push("Traceability covers requirements, discovery, and platform inputs strongly enough to support design review conversations.");

  return {
    itemCount: traceability.length,
    coverageState,
    missingAreas,
    notes,
  };
}

function buildWanPlanSummary(
  project: ProjectWithDesignData,
  transitPlan: TransitPlanRow[],
  traceability: DesignTraceabilityItem[],
): WanPlanSummary {
  const requirements = parseJsonMap(project.requirementsJson);
  const sharedServices = valueAsString(requirements.serverPlacement).toLowerCase();
  const internetModel = valueAsString(requirements.internetModel).toLowerCase();
  const notes: string[] = [];

  let recommendedModel: WanPlanSummary["recommendedModel"] = "single-site";
  if (project.sites.length > 1) recommendedModel = "hub-and-spoke";
  if (project.sites.length > 3 && internetModel.includes("local")) recommendedModel = "hybrid";
  if (project.sites.length > 4 && internetModel.includes("mesh")) recommendedModel = "partial-mesh";

  let centralization: WanPlanSummary["centralization"] = "local";
  if (sharedServices.includes("central") || sharedServices.includes("shared")) centralization = "shared-services";
  if (sharedServices.includes("hybrid")) centralization = "hybrid";

  const proposedTransitCount = transitPlan.filter((item) => item.kind === "proposed").length;
  const existingTransitCount = transitPlan.filter((item) => item.kind === "existing").length;
  let transitStrategy: WanPlanSummary["transitStrategy"] = "deferred";
  if (existingTransitCount > 0 && proposedTransitCount === 0) transitStrategy = "existing-only";
  if (proposedTransitCount > 0) transitStrategy = "proposal-ready";

  if (project.sites.length <= 1) notes.push("WAN planning is naturally minimal because the current design is single-site.");
  else notes.push(`Backend WAN view assumes ${recommendedModel} connectivity for ${project.sites.length} sites.`);
  if (centralization !== "local") notes.push(`Service placement suggests a ${centralization} WAN dependency model.`);
  if (traceability.some((item) => item.sourceArea === "platform" && item.sourceKey === "wanPosture")) {
    notes.push("Platform WAN posture exists and can support later discovered-versus-proposed reconciliation.");
  }

  return {
    recommendedModel,
    siteLinkCount: Math.max(project.sites.length - 1, 0),
    transitStrategy,
    centralization,
    notes,
  };
}

function buildBrownfieldReadinessSummary(
  project: ProjectWithDesignData,
  currentStateBoundary: CurrentStateBoundarySummary,
  traceabilityCoverage: TraceabilityCoverageSummary,
): BrownfieldReadinessSummary {
  const discovery = parseJsonMap(project.discoveryJson);
  const requirements = parseJsonMap(project.requirementsJson);
  const notes: string[] = [];

  const topologyBaseline = valueAsString(discovery.topologyBaseline).toLowerCase();
  let mode: BrownfieldReadinessSummary["mode"] = "greenfield";
  if (topologyBaseline.includes("brownfield") || topologyBaseline.includes("existing")) mode = "brownfield";
  else if (topologyBaseline.includes("refresh") || topologyBaseline.includes("migration")) mode = "mixed";
  if (valueAsString(requirements.planningFor).toLowerCase().includes("upgrade") && mode === "greenfield") mode = "mixed";

  let currentStateEvidence: BrownfieldReadinessSummary["currentStateEvidence"] = "thin";
  const discoverySignals = [
    discovery.topologyBaseline,
    discovery.addressingVlanBaseline,
    discovery.routingTransportBaseline,
    discovery.securityPosture,
  ].map(valueAsString).filter(Boolean).length;
  if (discoverySignals >= 3) currentStateEvidence = "strong";
  else if (discoverySignals >= 1) currentStateEvidence = "partial";

  let importReadiness: BrownfieldReadinessSummary["importReadiness"] = "not-ready";
  if (currentStateBoundary.liveMappingReady && currentStateEvidence !== "thin") importReadiness = "ready";
  else if (currentStateEvidence !== "thin") importReadiness = "review";

  let driftReviewReadiness: BrownfieldReadinessSummary["driftReviewReadiness"] = "not-ready";
  if (traceabilityCoverage.coverageState === "strong" && currentStateBoundary.liveMappingReady) driftReviewReadiness = "ready";
  else if (traceabilityCoverage.coverageState !== "thin" || currentStateEvidence !== "thin") driftReviewReadiness = "review";

  if (mode !== "greenfield") notes.push("The project contains signs of brownfield or upgrade work, so discovered-state separation matters.");
  if (currentStateEvidence === "thin") notes.push("Discovery evidence is still thin, so live mapping import should not be treated as trusted current-state evidence yet.");
  if (!currentStateBoundary.liveMappingReady) notes.push("Saved addressing still needs cleanup before safe current-state reconciliation becomes credible.");
  if (driftReviewReadiness === "ready") notes.push("Traceability and boundary quality are strong enough to support future drift review workflows.");

  return {
    mode,
    currentStateEvidence,
    importReadiness,
    driftReviewReadiness,
    notes,
  };
}

function buildAllocatorConfidenceSummary(issues: DesignCoreIssue[]): AllocatorConfidenceSummary {
  const blockerCodes = Array.from(new Set(
    issues
      .filter((issue) => issue.severity === "ERROR" && [
        "ORG_BLOCK_INVALID",
        "SITE_BLOCK_INVALID",
        "SITE_BLOCK_OVERLAP",
        "SITE_BLOCK_OUTSIDE_ORG_RANGE",
        "SUBNET_INVALID",
        "SUBNET_OVERLAP_LOCAL",
        "SUBNET_OUTSIDE_SITE_BLOCK",
        "SUBNET_UNDERSIZED",
      ].includes(issue.code))
      .map((issue) => issue.code),
  ));

  const notes: string[] = [];
  let state: AllocatorConfidenceSummary["state"] = "high";
  if (blockerCodes.length >= 3) state = "low";
  else if (blockerCodes.length >= 1) state = "medium";

  if (state === "high") notes.push("Allocator confidence is high because there are no structural addressing blockers in the current snapshot.");
  if (state === "medium") notes.push("Allocator confidence is reduced because at least one structural addressing blocker still exists.");
  if (state === "low") notes.push("Allocator confidence is low because multiple structural blockers still exist. Backend proposals should be reviewed before trust increases.");

  return {
    state,
    blockerCodes,
    notes,
  };
}

function buildTruthStateLedger(currentStateBoundary: CurrentStateBoundarySummary): TruthStateLedger {
  const notes: string[] = [];
  if (currentStateBoundary.discoveredObjectCount === 0) {
    notes.push("No discovered live-state objects exist yet. Current-state entries still represent saved planner data rather than imported evidence.");
  }
  if (currentStateBoundary.proposedObjectCount > 0) {
    notes.push("Backend-generated proposal objects are now tracked separately from saved planner objects.");
  }
  notes.push("As-built count remains zero until the product ingests verified deployment evidence.");

  return {
    configuredCount: currentStateBoundary.configuredObjectCount,
    inferredCount: currentStateBoundary.inferredObjectCount,
    proposedCount: currentStateBoundary.proposedObjectCount,
    discoveredCount: currentStateBoundary.discoveredObjectCount,
    asBuiltCount: 0,
    notes,
  };
}

function buildCurrentStateBoundary(siteBlocks: SiteBlockRecord[], addressingRows: AddressRowRecord[], issues: DesignCoreIssue[]): CurrentStateBoundarySummary {
  const configuredObjectCount = siteBlocks.length + addressingRows.length;
  const proposedObjectCount = siteBlocks.filter((item) => item.proposedCidr).length + addressingRows.filter((item) => item.proposedSubnetCidr).length;
  const inferredObjectCount = 0;
  const discoveredObjectCount = 0;
  const currentStateReady = !issues.some((issue) => issue.severity === "ERROR" && [
    "ORG_BLOCK_INVALID",
    "SITE_BLOCK_INVALID",
    "SITE_BLOCK_OVERLAP",
    "SITE_BLOCK_OUTSIDE_ORG_RANGE",
    "SUBNET_INVALID",
    "SUBNET_OVERLAP_LOCAL",
    "SUBNET_UNDERSIZED",
    "SUBNET_OUTSIDE_SITE_BLOCK",
    "GATEWAY_INVALID",
    "GATEWAY_UNUSABLE",
  ].includes(issue.code));
  const proposedStateReady = siteBlocks.some((item) => Boolean(item.proposedCidr)) || addressingRows.some((item) => Boolean(item.proposedSubnetCidr));
  const liveMappingReady = currentStateReady && !issues.some((issue) => issue.code === "SITE_BLOCK_OVERLAP");
  const notes: string[] = [];

  if (!currentStateReady) {
    notes.push("Current-state trust is not yet clean enough for blind brownfield mapping because at least one saved addressing or boundary issue still exists.");
  }
  if (!proposedStateReady) {
    notes.push("No backend proposals were required or generated yet. That can be healthy if the saved model is already clean.");
  } else {
    notes.push("The snapshot now separates saved current-state objects from backend-generated proposed corrections.");
  }
  if (liveMappingReady) {
    notes.push("Site boundary and addressing conditions are clean enough to introduce future discovered-versus-proposed live mapping states.");
  }

  return {
    configuredObjectCount,
    proposedObjectCount,
    inferredObjectCount,
    discoveredObjectCount,
    currentStateReady,
    proposedStateReady,
    liveMappingReady,
    notes,
  };
}

function buildAllocatorDeterminismSummary(
  issues: DesignCoreIssue[],
  siteBlocks: SiteBlockRecord[],
  proposals: DesignCoreProposalRow[],
): AllocatorDeterminismSummary {
  const blockingConditions = Array.from(new Set(
    issues
      .filter((issue) => issue.severity === "ERROR")
      .map((issue) => issue.code),
  )).sort();

  const evaluationOrder = proposals
    .map((proposal) => `${proposal.siteCode || proposal.siteName}:VLAN${proposal.vlanId}:/${proposal.recommendedPrefix}`)
    .sort((left, right) => left.localeCompare(right));

  let state: AllocatorDeterminismSummary["state"] = "high";
  if (blockingConditions.length >= 4) state = "low";
  else if (blockingConditions.length >= 1) state = "medium";

  const notes: string[] = [];
  if (siteBlocks.some((item) => Boolean(item.proposedCidr))) {
    notes.push("Backend site-block proposals are generated from a consistent free-space search inside the organization block.");
  }
  if (proposals.length > 0) {
    notes.push("Subnet proposals are ordered by prefix size, role priority, site identity, VLAN identifier, and row identifier so repeated evaluations stay stable for the same saved inputs.");
  } else {
    notes.push("No subnet proposals were required, so allocator determinism is judged mainly from saved-state cleanliness.");
  }
  if (blockingConditions.length > 0) {
    notes.push(`Determinism confidence is reduced because blocking conditions still exist: ${blockingConditions.join(", ")}.`);
  }

  return {
    state,
    evaluationOrder,
    blockingConditions,
    notes,
  };
}

function buildStandardsAlignmentSummary(
  project: ProjectWithDesignData,
  organizationBlock: ReturnType<typeof evaluateOrganizationBlock>,
  siteSummaries: SiteSummarizationReview[],
  transitPlan: TransitPlanRow[],
  securityIntent: SecurityIntentSummary,
  allocationPolicy: AllocationPolicySummary,
  issues: DesignCoreIssue[],
): StandardsAlignmentSummary {
  const requirements = parseJsonMap(project.requirementsJson);
  const evaluations: StandardsRuleEvaluation[] = [];

  for (const rule of NETWORK_STANDARDS_RULEBOOK) {
    let status: StandardsRuleStatus = "deferred";
    const notes: string[] = [];

    switch (rule.id) {
      case "ADDR-PRIVATE-IPV4":
        if (organizationBlock.validationState === "missing") {
          status = "review";
          notes.push("The organization block is still missing, so private IPv4 compliance cannot be confirmed yet.");
        } else if (organizationBlock.validationState === "invalid" || !isPrivateIpv4Cidr(organizationBlock.canonicalCidr || organizationBlock.sourceValue)) {
          status = "violated";
          notes.push("The current organization block is not a clean RFC 1918 private IPv4 range.");
        } else {
          status = "applied";
          notes.push("The organization block stays inside RFC 1918 private IPv4 space.");
        }
        break;
      case "ADDR-CIDR-HIERARCHY":
        if (siteSummaries.length === 0) {
          status = "review";
          notes.push("No site summaries exist yet, so CIDR hierarchy cannot be confirmed.");
        } else if (siteSummaries.some((item) => item.status === "missing")) {
          status = "violated";
          notes.push("At least one site is missing a usable summary boundary.");
        } else if (siteSummaries.some((item) => item.status === "review")) {
          status = "review";
          notes.push("CIDR hierarchy exists, but at least one site summary still needs review.");
        } else {
          status = "applied";
          notes.push("Site boundaries are summarizable and aligned with hierarchical CIDR planning.");
        }
        break;
      case "WAN-POINT-TO-POINT-31": {
        const existingTransitCidrs = transitPlan.map((item) => item.subnetCidr).filter((value): value is string => Boolean(value));
        const hasNon31Transit = existingTransitCidrs.some((cidr) => {
          try {
            return parseCidr(cidr).prefix !== 31;
          } catch {
            return false;
          }
        });
        if (project.sites.length <= 1) {
          status = "deferred";
          notes.push("Point-to-point WAN transit is not relevant for a single-site project.");
        } else if (hasNon31Transit) {
          status = "review";
          notes.push("At least one existing transit segment is not a /31. That can be valid, but it should be reviewed instead of assumed.");
        } else if (allocationPolicy.transitMode === "/31-preferred") {
          status = "applied";
          notes.push("Backend transit planning prefers /31 only for point-to-point transit use.");
        } else {
          status = "review";
          notes.push("Multi-site WAN planning exists, but /31 point-to-point preference is still deferred or not yet confirmed.");
        }
        break;
      }
      case "IPV6-ARCHITECTURE":
      case "IPV6-ULA": {
        const ipv6Enabled = valueAsBoolean(requirements.ipv6Enabled) || valueAsString(requirements.internetProtocol).toLowerCase().includes("ipv6");
        if (!ipv6Enabled) {
          status = "deferred";
          notes.push("IPv6 planning is not enabled in the current project inputs.");
        } else {
          status = "review";
          notes.push("IPv6 is in scope, but deep IPv6 synthesis and validation are still not complete in the engine.");
        }
        break;
      }
      case "VLAN-SEGMENTATION": {
        const hasVlans = project.sites.some((site: ProjectWithDesignData["sites"][number]) => site.vlans.length > 0);
        const segmentationExpected = valueAsBoolean(requirements.guestWifi)
          || valueAsBoolean(requirements.management)
          || valueAsBoolean(requirements.iot)
          || valueAsBoolean(requirements.voice)
          || valueAsBoolean(requirements.wireless)
          || valueAsBoolean(requirements.remoteAccess)
          || project.sites.length > 1;
        if (hasVlans) {
          status = "applied";
          notes.push("The current design uses VLAN-backed segments and the engine keeps that logic within normal VLAN-aware Ethernet planning.");
        } else if (segmentationExpected) {
          status = "violated";
          notes.push("The requirements clearly imply segmented enterprise networking, but no VLAN-backed segmentation objects are present yet.");
        } else {
          status = "review";
          notes.push("No VLAN-backed segments are present yet, so segmentation implementation detail still needs review.");
        }
        break;
      }
      case "ACCESS-CONTROL-8021X":
        if (!securityIntent.remoteAccessExpected && !valueAsBoolean(requirements.nacRequired)) {
          status = "deferred";
          notes.push("The current project does not explicitly require NAC or standards-based authenticated edge access yet.");
        } else {
          status = "review";
          notes.push("Access-control expectations exist, but 802.1X-specific synthesis remains advisory at this stage.");
        }
        break;
      case "LINK-AGGREGATION":
        if (!valueAsBoolean(requirements.linkAggregation) && !valueAsBoolean(requirements.redundancy)) {
          status = "deferred";
          notes.push("The project does not currently signal aggregated uplinks or strong redundancy needs.");
        } else {
          status = "review";
          notes.push("Resiliency intent exists, but link-aggregation synthesis is still standards-aware guidance rather than final platform logic.");
        }
        break;
      case "WLAN-STANDARDS":
        if (valueAsBoolean(requirements.wireless) || valueAsBoolean(requirements.guestWifi)) {
          status = "applied";
          notes.push("Wireless scope is present and is treated within normal IEEE 802.11 planning language.");
        } else {
          status = "deferred";
          notes.push("Wireless scope is not active in the saved requirements.");
        }
        break;
      case "FIREWALL-POLICY": {
        const firewallPosture = valueAsString(parseJsonMap(project.platformProfileJson).firewallPosture);
        const missingGuestBoundary = securityIntent.guestIsolationExpected && !securityIntent.zoneNames.includes("GUEST");
        const missingManagementBoundary = securityIntent.managementIsolationExpected && !securityIntent.zoneNames.includes("MANAGEMENT");
        if (missingGuestBoundary || missingManagementBoundary) {
          status = "violated";
          if (missingGuestBoundary) notes.push("Guest access is expected, but the security structure does not yet show a distinct guest boundary for firewall policy enforcement.");
          if (missingManagementBoundary) notes.push("Management isolation is expected, but a distinct management boundary is not yet visible for firewall policy enforcement.");
        } else if (securityIntent.zoneNames.length <= 1 && !firewallPosture) {
          status = "review";
          notes.push("Firewall policy expectations exist, but the current design does not yet express enough zone separation or firewall posture detail to prove structured policy boundaries.");
        } else {
          status = "applied";
          notes.push("The design expresses multiple security postures and treats firewalling as a trust-boundary discipline.");
        }
        break;
      }
      case "ZERO-TRUST-RESOURCE-FOCUS":
        if (securityIntent.remoteAccessExpected || securityIntent.eastWestSegmentationExpected) {
          status = "applied";
          notes.push("Zero-trust ideas are being used as a resource-focused overlay where the requirements justify tighter access control and segmentation.");
        } else {
          status = "deferred";
          notes.push("Current requirements do not yet justify a stronger zero-trust overlay.");
        }
        break;
      case "MGMT-ISOLATION":
        if (!securityIntent.managementIsolationExpected) {
          status = "deferred";
          notes.push("The current requirements do not clearly call for management isolation yet.");
        } else if (securityIntent.zoneNames.includes("MANAGEMENT")) {
          status = "applied";
          notes.push("A management zone is present and management isolation is expected by the design.");
        } else {
          status = "violated";
          notes.push("Management isolation is expected, but a distinct management zone is not yet visible in the current design rows.");
        }
        break;
      case "GUEST-ISOLATION":
        if (!securityIntent.guestIsolationExpected) {
          status = "deferred";
          notes.push("Guest isolation is not required because guest access is not currently in scope.");
        } else if (securityIntent.zoneNames.includes("GUEST")) {
          status = "applied";
          notes.push("Guest access is present and guest isolation is visible in the segmentation model.");
        } else {
          status = "violated";
          notes.push("Guest access is expected, but a distinct guest zone is not yet visible in the design rows.");
        }
        break;
      case "HIERARCHICAL-SITE-BLOCKS":
        if (project.sites.length <= 1) {
          status = "deferred";
          notes.push("Per-site hierarchy is naturally less important in a single-site design.");
        } else if (issues.some((issue) => ["SITE_BLOCK_MISSING", "SITE_BLOCK_INVALID"].includes(issue.code))) {
          status = "violated";
          notes.push("Multi-site design exists, but at least one site still has no valid site block at all.");
        } else if (siteSummaries.some((item) => item.status === "missing")) {
          status = "review";
          notes.push("Multi-site design exists, but at least one site still lacks a reliable summary block.");
        } else {
          status = "applied";
          notes.push("Per-site summary blocks exist or are being enforced for hierarchical multi-site design.");
        }
        break;
      case "GATEWAY-CONSISTENCY":
        if (allocationPolicy.gatewayMode === "mixed" || allocationPolicy.gatewayMode === "custom") {
          status = "review";
          notes.push("Gateway placement is mixed or custom, so engineering review is still required for consistency.");
        } else if (allocationPolicy.gatewayMode === "not-applicable") {
          status = "deferred";
          notes.push("Gateway consistency cannot be evaluated because no effective gateway pattern is visible yet.");
        } else {
          status = "applied";
          notes.push("Gateway placement is consistent enough to support normal operational readability.");
        }
        break;
      default:
        status = "deferred";
        notes.push("This rule is not yet evaluated by the current engine logic.");
        break;
    }

    evaluations.push({
      ruleId: rule.id,
      title: rule.title,
      authority: rule.authority,
      strength: rule.strength,
      status,
      notes,
    });
  }

  const applied = evaluations.filter((item) => item.status === "applied").map((item) => item.ruleId).sort();
  const deferred = evaluations.filter((item) => item.status === "deferred").map((item) => item.ruleId).sort();
  const violated = evaluations.filter((item) => item.status === "violated").map((item) => item.ruleId).sort();
  const review = evaluations.filter((item) => item.status === "review").map((item) => item.ruleId).sort();

  const notes: string[] = [
    "Formal protocol and security standards should be enforced where they truly exist.",
    "Best-practice rules are evaluated separately so the engine does not mistake common design habits for universal standards law.",
  ];
  if (violated.length > 0) {
    notes.push(`The current project violates or clearly misses ${violated.length} rulebook item${violated.length === 1 ? "" : "s"} that need correction.`);
  }
  if (review.length > 0) {
    notes.push(`The current project also has ${review.length} rulebook item${review.length === 1 ? "" : "s"} that still need engineering review.`);
  }

  return {
    rulebook: summarizeStandardsRulebook(),
    evaluations,
    appliedRuleIds: applied,
    deferredRuleIds: deferred,
    violatedRuleIds: violated,
    reviewRuleIds: review,
    notes,
  };
}

function buildStandardsEnforcementNotes(standardsAlignment: StandardsAlignmentSummary): string[] {
  const notes: string[] = [];
  const requiredViolations = standardsAlignment.evaluations
    .filter((item) => item.status === "violated" && item.strength === "required")
    .map((item) => item.title);

  if (requiredViolations.length > 0) {
    notes.push(`Required standards blockers remain: ${requiredViolations.join("; ")}.`);
  }

  return notes;
}

function buildPlanningInputCoverageSummary(project: ProjectWithDesignData): PlanningInputCoverageSummary {
  const directKeys = PLANNING_INPUT_AUDIT_ITEMS.filter((item) => item.impact === "direct").map((item) => item.key);
  const indirectKeys = PLANNING_INPUT_AUDIT_ITEMS.filter((item) => item.impact === "indirect").map((item) => item.key);
  const notYetImplementedKeys = PLANNING_INPUT_AUDIT_ITEMS.filter((item) => item.impact === "not-yet-implemented").map((item) => item.key);

  const sourceMaps = {
    requirements: parseJsonMap(project.requirementsJson),
    discovery: parseJsonMap(project.discoveryJson),
    platform: parseJsonMap(project.platformProfileJson),
  } as const;

  const activeInputs: ActivePlanningInputSummary[] = PLANNING_INPUT_AUDIT_ITEMS
    .map((item) => {
      const rawValue = sourceMaps[item.sourceArea][item.key];
      if (!hasMeaningfulValue(rawValue)) return null;
      const value = typeof rawValue === "string" ? rawValue.trim() : String(rawValue);
      return {
        sourceArea: item.sourceArea,
        key: item.key,
        impact: item.impact,
        value,
        outputAreas: item.outputAreas,
        note: item.note,
      } satisfies ActivePlanningInputSummary;
    })
    .filter((item): item is ActivePlanningInputSummary => Boolean(item));

  const activeDirectCount = activeInputs.filter((item) => item.impact === "direct").length;
  const activeIndirectCount = activeInputs.filter((item) => item.impact === "indirect").length;
  const activeNotYetImplementedCount = activeInputs.filter((item) => item.impact === "not-yet-implemented").length;

  const notes = [
    "Direct inputs already change design outputs or trust signals.",
    "Indirect inputs influence summaries or posture but still need deeper synthesis.",
    "Not-yet-implemented inputs are intentionally labeled so the planner does not overclaim what they change today.",
  ];
  if (activeNotYetImplementedCount > 0) {
    notes.push(`The current project actively uses ${activeNotYetImplementedCount} saved input${activeNotYetImplementedCount === 1 ? "" : "s"} that still do not change the design deeply enough yet.`);
  }

  return {
    audit: summarizePlanningInputAudit(),
    directKeys,
    indirectKeys,
    notYetImplementedKeys,
    activeInputs,
    activeDirectCount,
    activeIndirectCount,
    activeNotYetImplementedCount,
    notes,
  };
}

function buildPlanningInputDisciplineSummary(
  planningInputCoverage: PlanningInputCoverageSummary,
  routingIntent: RoutingIntentSummary,
  securityIntent: SecurityIntentSummary,
  policyConsequences: PolicyConsequenceSummary,
  wanPlan: WanPlanSummary,
  siteSummaries: SiteSummarizationReview[],
  proposedRows: DesignCoreProposalRow[],
  standardsAlignment: StandardsAlignmentSummary,
): PlanningInputDisciplineSummary {
  const hasGuestBoundary = securityIntent.zoneNames.includes("guest") || standardsAlignment.appliedRuleIds.includes("bp-guest-isolation");
  const hasRemoteAccessSignal = securityIntent.remoteAccessExpected || policyConsequences.remoteAccessControlState !== "not-signaled";
  const hasWanSignal = wanPlan.recommendedModel !== "single-site" || wanPlan.transitStrategy !== "deferred" || routingIntent.topologyStyle !== "single-site";
  const hasDemandSignal = siteSummaries.length > 0 || proposedRows.length > 0;

  const items: PlanningInputDisciplineItem[] = planningInputCoverage.activeInputs.map((input) => {
    let reflectedInOutputs = false;
    const reflectionNotes: string[] = [];

    switch (`${input.sourceArea}:${input.key}`) {
      case "requirements:usersPerSite":
        reflectedInOutputs = hasDemandSignal;
        reflectionNotes.push(reflectedInOutputs
          ? "Demand inputs are reflected in subnet sizing and proposal review outputs."
          : "User demand is saved, but current sizing and proposal outputs still do not show enough demand-driven behavior.");
        break;
      case "requirements:guestWifi":
        reflectedInOutputs = hasGuestBoundary && securityIntent.guestIsolationExpected;
        reflectionNotes.push(reflectedInOutputs
          ? "Guest access is reflected in security intent and guest-boundary design outputs."
          : "Guest access is saved, but the current design outputs still do not show a clear guest boundary.");
        break;
      case "requirements:remoteAccess":
        reflectedInOutputs = hasRemoteAccessSignal;
        reflectionNotes.push(reflectedInOutputs
          ? "Remote access is reflected in security intent and policy consequence outputs."
          : "Remote access is saved, but policy and design outputs still do not clearly reflect it.");
        break;
      case "requirements:serverPlacement":
        reflectedInOutputs = wanPlan.centralization !== "local" || wanPlan.notes.some((note) => note.toLowerCase().includes("shared"));
        reflectionNotes.push(reflectedInOutputs
          ? "Server placement is reflected in WAN and service centralization outputs."
          : "Server placement is saved, but WAN and service outputs still do not clearly reflect it.");
        break;
      case "requirements:internetModel":
        reflectedInOutputs = wanPlan.notes.some((note) => note.toLowerCase().includes("internet") || note.toLowerCase().includes("breakout")) || hasWanSignal;
        reflectionNotes.push(reflectedInOutputs
          ? "Internet model is reflected in WAN and edge planning outputs."
          : "Internet model is saved, but WAN and edge outputs still do not clearly reflect it.");
        break;
      case "discovery:topologyBaseline":
        reflectedInOutputs = routingIntent.topologyStyle !== "single-site" || wanPlan.recommendedModel !== "single-site";
        reflectionNotes.push(reflectedInOutputs
          ? "Topology baseline is reflected in topology and WAN planning outputs."
          : "Topology baseline is saved, but outputs still do not clearly show topology-aware planning.");
        break;
      case "discovery:addressingVlanBaseline":
        reflectedInOutputs = siteSummaries.length > 0 || standardsAlignment.appliedRuleIds.includes("bp-hierarchical-site-blocks");
        reflectionNotes.push(reflectedInOutputs
          ? "Addressing baseline is reflected in hierarchy and summary review outputs."
          : "Addressing baseline is saved, but hierarchy outputs still need stronger reflection.");
        break;
      case "platform:routingPosture":
        reflectedInOutputs = routingIntent.routingPosture.trim().length > 0 && routingIntent.routingPosture !== "unspecified";
        reflectionNotes.push(reflectedInOutputs
          ? "Routing posture is reflected in routing intent outputs."
          : "Routing posture is saved, but routing outputs still do not clearly reflect it.");
        break;
      case "platform:firewallPosture":
        reflectedInOutputs = securityIntent.posture !== "baseline" || policyConsequences.managementPlaneProtectionState !== "not-signaled" || policyConsequences.guestContainmentState !== "not-signaled";
        reflectionNotes.push(reflectedInOutputs
          ? "Firewall posture is reflected in security and policy outputs."
          : "Firewall posture is saved, but security outputs still do not clearly reflect it.");
        break;
      case "platform:wanPosture":
        reflectedInOutputs = hasWanSignal;
        reflectionNotes.push(reflectedInOutputs
          ? "WAN posture is reflected in WAN planning and transit outputs."
          : "WAN posture is saved, but WAN outputs still do not clearly reflect it.");
        break;
      default:
        reflectedInOutputs = input.impact !== "not-yet-implemented";
        reflectionNotes.push(reflectedInOutputs
          ? "This input currently influences at least one design or review output."
          : "This input is intentionally labeled as not yet deeply implemented.");
        break;
    }

    return {
      sourceArea: input.sourceArea,
      key: input.key,
      impact: input.impact,
      value: input.value,
      outputAreas: input.outputAreas,
      reflectedInOutputs,
      reflectionNotes,
    };
  });

  const notReflected = items.filter((item) => !item.reflectedInOutputs);

  return {
    items,
    reflectedCount: items.length - notReflected.length,
    notReflectedCount: notReflected.length,
    notReflectedKeys: notReflected.map((item) => `${item.sourceArea}:${item.key}`),
    notes: [
      "Active planning inputs should be visible in design, validation, or exported review outputs.",
      "Inputs that are saved but not reflected should be treated as cleanup or future-engine work, not as hidden design truth.",
    ],
  };
}

function buildRequirementsCoverageSummary(project: ProjectWithDesignData): RequirementsCoverageSummary {
  const requirements = parseJsonMap(project.requirementsJson);
  const discovery = parseJsonMap(project.discoveryJson);
  const platform = parseJsonMap(project.platformProfileJson);
  const sites = project.sites;
  const totalVlans = sites.reduce((sum: number, site: ProjectWithDesignData["sites"][number]) => sum + site.vlans.length, 0);
  const hasUsersPerSite = typeof requirements.usersPerSite === "number" && Number.isFinite(requirements.usersPerSite as number);
  const hasEstimatedHosts = sites.some((site: ProjectWithDesignData["sites"][number]) => site.vlans.some((vlan: ProjectWithDesignData["sites"][number]["vlans"][number]) => (vlan.estimatedHosts ?? 0) > 0));

  const text = valueAsString;
  const bool = valueAsBoolean;

  const areas: RequirementsCoverageArea[] = [
    {
      id: "site-topology",
      title: "Site and topology model",
      status: sites.length > 0 && text(requirements.planningFor) ? "implemented" : sites.length > 0 ? "partial" : "missing",
      signals: [
        `${sites.length} site${sites.length === 1 ? "" : "s"}`,
        text(requirements.planningFor) ? `planning for: ${text(requirements.planningFor)}` : "",
      ].filter(Boolean),
      notes: sites.length > 0
        ? ["Site records exist, so topology and site-boundary planning can begin."]
        : ["At least one site is required before the engine can produce a real multi-site design."],
    },
    {
      id: "endpoint-demand",
      title: "Users, endpoints, and segment demand",
      status: hasUsersPerSite || hasEstimatedHosts ? "implemented" : totalVlans > 0 ? "partial" : "missing",
      signals: [
        hasUsersPerSite ? `users per site: ${String(requirements.usersPerSite)}` : "",
        hasEstimatedHosts ? "estimated host counts present" : "",
        totalVlans > 0 ? `${totalVlans} VLAN row${totalVlans === 1 ? "" : "s"}` : "",
      ].filter(Boolean),
      notes: ["Demand should be tied to host counts or endpoint estimates so subnet sizing is deterministic."],
    },
    {
      id: "applications-services",
      title: "Applications and service placement",
      status: text(requirements.serverPlacement) && text(requirements.businessApps) ? "implemented" : text(requirements.serverPlacement) ? "partial" : "missing",
      signals: [text(requirements.serverPlacement), text(requirements.businessApps)].filter(Boolean),
      notes: ["Server placement is already used by WAN and security summaries, but application dependency depth still needs improvement."],
    },
    {
      id: "wan-internet",
      title: "WAN and internet design intent",
      status: text(requirements.internetModel) && text(platform.wanPosture) ? "implemented" : text(requirements.internetModel) || text(platform.wanPosture) ? "partial" : "missing",
      signals: [text(requirements.internetModel), text(platform.wanPosture)].filter(Boolean),
      notes: ["WAN and internet breakout choices should materially change edge, transit, and service-centralization decisions."],
    },
    {
      id: "segmentation-security",
      title: "Segmentation and security requirements",
      status: bool(requirements.guestWifi) || bool(requirements.remoteAccess) || bool(requirements.management) || bool(requirements.iot)
        ? "implemented"
        : text(discovery.securityPosture)
          ? "partial"
          : "missing",
      signals: [
        bool(requirements.guestWifi) ? "guest access" : "",
        bool(requirements.remoteAccess) ? "remote access" : "",
        bool(requirements.management) ? "management" : "",
        bool(requirements.iot) ? "IoT" : "",
        text(discovery.securityPosture),
      ].filter(Boolean),
      notes: ["Segmentation and security requirements are core drivers for VLAN, policy, and trust-boundary design."],
    },
    {
      id: "routing-transport",
      title: "Routing and transport posture",
      status: text(platform.routingPosture) && text(discovery.routingTransportBaseline) ? "implemented" : text(platform.routingPosture) || text(discovery.routingTransportBaseline) ? "partial" : "missing",
      signals: [text(platform.routingPosture), text(discovery.routingTransportBaseline)].filter(Boolean),
      notes: ["Routing posture should drive summarization, loopback, transit, and future migration planning."],
    },
    {
      id: "operations-management",
      title: "Operations and management posture",
      status: text(platform.firewallPosture) && text(platform.operationsModel) ? "implemented" : text(platform.firewallPosture) || text(platform.operationsModel) || text(platform.automationReadiness) ? "partial" : "missing",
      signals: [text(platform.firewallPosture), text(platform.operationsModel), text(platform.automationReadiness)].filter(Boolean),
      notes: ["Operations inputs should affect management-plane restrictions, handoff readiness, and long-term support planning."],
    },
    {
      id: "wireless-remote-access",
      title: "Wireless and remote-access scope",
      status: (bool(requirements.wireless) || bool(requirements.guestWifi)) && bool(requirements.remoteAccess)
        ? "implemented"
        : bool(requirements.wireless) || bool(requirements.guestWifi) || bool(requirements.remoteAccess)
          ? "partial"
          : "missing",
      signals: [
        bool(requirements.wireless) ? "wireless" : "",
        bool(requirements.guestWifi) ? "guest Wi‑Fi" : "",
        bool(requirements.remoteAccess) ? "remote access" : "",
      ].filter(Boolean),
      notes: ["Wireless and remote-access scope materially affect edge policy, segmentation, and support assumptions."],
    },
    {
      id: "implementation-constraints",
      title: "Implementation and migration constraints",
      status: text(requirements.cutoverWindow) && (text(requirements.rollbackNeed) || text(requirements.outageTolerance))
        ? "partial"
        : text(requirements.cutoverWindow) || text(requirements.rollbackNeed) || text(requirements.outageTolerance)
          ? "partial"
          : "missing",
      signals: [text(requirements.cutoverWindow), text(requirements.rollbackNeed), text(requirements.outageTolerance)].filter(Boolean),
      notes: ["Constraint capture exists, but deeper implementation-planning synthesis still needs more engine work."],
    },
    {
      id: "brownfield-baseline",
      title: "Brownfield and current-state baseline",
      status: text(discovery.topologyBaseline) && text(discovery.addressingVlanBaseline) ? "implemented" : text(discovery.topologyBaseline) || text(discovery.addressingVlanBaseline) ? "partial" : "missing",
      signals: [text(discovery.topologyBaseline), text(discovery.addressingVlanBaseline)].filter(Boolean),
      notes: ["Current-state baseline quality determines how safely future discovered-state import can be reconciled against proposed design."],
    },
    {
      id: "handoff-reporting",
      title: "Handoff and reporting readiness",
      status: text(requirements.reportAudience) && text(requirements.documentationDepth) ? "implemented" : text(requirements.reportAudience) || text(requirements.documentationDepth) ? "partial" : "missing",
      signals: [text(requirements.reportAudience), text(requirements.documentationDepth)].filter(Boolean),
      notes: ["Export and handoff expectations should be explicit so the output package matches who will consume it."],
    },
  ];

  const implementedCount = areas.filter((area) => area.status === "implemented").length;
  const partialCount = areas.filter((area) => area.status === "partial").length;
  const missingAreaIds = areas.filter((area) => area.status === "missing").map((area) => area.id);
  const missingCount = missingAreaIds.length;

  const notes = [
    "Requirement coverage is reported separately from standards posture so missing planning depth is visible before implementation review.",
    "Areas marked missing should either be captured explicitly or acknowledged as out of scope for the current project.",
  ];
  if (missingCount > 0) {
    notes.push(`The current project is still missing ${missingCount} planning area${missingCount === 1 ? "" : "s"} that normally strengthen design trust.`);
  }
  if (partialCount > 0) {
    notes.push(`Another ${partialCount} planning area${partialCount === 1 ? " is" : "s are"} only partially represented today.`);
  }

  return {
    areas,
    implementedCount,
    partialCount,
    missingCount,
    missingAreaIds,
    notes,
  };
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
