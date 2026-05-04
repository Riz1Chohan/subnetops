import { isPrivateIpv4Cidr, parseJsonMap, valueAsBoolean, valueAsString } from "./designCore.helpers.js";
import { parseCidr } from "../../domain/addressing/cidr.js";
import { NETWORK_STANDARDS_RULEBOOK, summarizeStandardsRulebook, type StandardsRuleStatus } from "../../lib/networkStandardsRulebook.js";
import type { AllocationPolicySummary, DesignCoreIssue, SecurityIntentSummary, SiteSummarizationReview, StandardsAlignmentSummary, StandardsRuleEvaluation, TransitPlanRow } from "../designCore.types.js";

type StandardsAlignmentProjectInput = {
  basePrivateRange?: string | null;
  requirementsJson?: string | null;
  platformProfileJson?: string | null;
  sites: Array<{ vlans: unknown[] }>;
};

type OrganizationBlockEvaluation = {
  sourceValue?: string | null;
  canonicalCidr?: string;
  validationState: "missing" | "invalid" | "valid";
};

export function buildStandardsAlignmentSummary(
  project: StandardsAlignmentProjectInput,
  organizationBlock: OrganizationBlockEvaluation,
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
        } else if (organizationBlock.validationState === "invalid" || !isPrivateIpv4Cidr(organizationBlock.canonicalCidr || organizationBlock.sourceValue || "")) {
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
        const hasVlans = project.sites.some((site) => site.vlans.length > 0);
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

