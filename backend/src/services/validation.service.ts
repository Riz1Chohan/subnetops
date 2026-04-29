import type { EntityType, ValidationSeverity } from "../lib/domainTypes.js";
import { prisma } from "../db/prisma.js";
import {
  canonicalCidr,
  cidrsOverlap,
  classifySegmentRole,
  containsIp,
  describeRange,
  describeSubnet,
  isBroadcastAddress,
  isNetworkAddress,
  isValidIpv4,
  parseCidr,
  recommendedPrefixForHosts,
  suggestedGatewayPattern,
  usableHostCount,
  type SegmentRole,
} from "../lib/cidr.js";
import { buildDesignCoreSnapshot } from "./designCore.service.js";

function normalizeValidationSegmentRole(value?: string | null): SegmentRole | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "USERS") return "USER";
  if (normalized === "SERVERS") return "SERVER";
  if (normalized === "MGMT") return "MANAGEMENT";
  if (normalized === "TRANSIT") return "WAN_TRANSIT";
  if (["USER", "SERVER", "GUEST", "MANAGEMENT", "DMZ", "VOICE", "PRINTER", "IOT", "CAMERA", "WAN_TRANSIT", "LOOPBACK", "OTHER"].includes(normalized)) return normalized as SegmentRole;
  return null;
}

function resolveValidationSegmentRole(vlan: { segmentRole?: string | null; purpose?: string | null; vlanName: string; department?: string | null; notes?: string | null }): SegmentRole {
  const explicitRole = normalizeValidationSegmentRole(vlan.segmentRole);
  if (explicitRole) return explicitRole;
  return classifySegmentRole(`${vlan.purpose || ""} ${vlan.vlanName} ${vlan.department || ""} ${vlan.notes || ""}`);
}

interface ValidationItem {
  projectId: string;
  severity: ValidationSeverity;
  ruleCode: string;
  title: string;
  message: string;
  entityType: EntityType;
  entityId?: string;
}

interface ValidationNarrative {
  issue: string;
  impact: string;
  recommendation: string;
}

const validationGuidanceByRuleCode: Record<string, Partial<ValidationNarrative>> = {
  SITE_SUMMARY_MISSING: {
    impact: "Routing summaries, growth planning, and implementation review become weaker when the site boundary is not explicitly confirmed.",
    recommendation: "Add or confirm the site's parent address block before using the design package for implementation planning.",
  },
  SITE_SUMMARY_REVIEW: {
    impact: "A weak or oversized site summary can create route sprawl, wasted address space, or unclear site ownership.",
    recommendation: "Review the site summary against the actual VLAN list, expected growth, and WAN routing plan.",
  },
  ROUTING_SUMMARIZATION_BLOCKED: {
    impact: "Blocked summarization can make WAN routing harder to operate and can hide addressing mistakes until implementation.",
    recommendation: "Correct the site block or subnet boundary issues before treating route summaries as review-ready.",
  },
  INVALID_SITE_BLOCK: {
    impact: "Invalid site blocks prevent reliable subnet containment checks and can break downstream addressing recommendations.",
    recommendation: "Replace the site block with valid CIDR notation such as 10.10.0.0/20.",
  },
  INVALID_CIDR: {
    impact: "Invalid subnet notation prevents capacity, gateway, overlap, and routing checks from being trusted.",
    recommendation: "Enter a valid CIDR block using the true network address and prefix length.",
  },
  INVALID_GATEWAY_IP: {
    impact: "A bad gateway value can cause failed client onboarding, broken routing, and misleading implementation documents.",
    recommendation: "Replace the gateway with a valid IPv4 address inside the VLAN subnet.",
  },
  NONCANONICAL_CIDR: {
    impact: "Non-canonical subnet notation confuses engineers and can cause wrong summaries or duplicate-looking networks.",
    recommendation: "Store the subnet using the true network address for the selected prefix.",
  },
  SUBNET_OUTSIDE_SITE_BLOCK: {
    impact: "A subnet outside its parent site block breaks summarization and makes site ownership unclear.",
    recommendation: "Move the subnet into the site's assigned block or adjust the site block after review.",
  },
  SLASH31_NONTRANSIT: {
    impact: "A /31 is normally a point-to-point transit pattern; using it for access segments can leave no room for normal hosts.",
    recommendation: "Use /31 only for WAN transit or mark the segment correctly; otherwise choose a larger access subnet.",
  },
  SLASH32_NONLOOPBACK: {
    impact: "A /32 is normally a loopback or host route, not a usable VLAN segment for clients.",
    recommendation: "Use /32 only for loopbacks or host routes; otherwise assign a subnet with usable host capacity.",
  },
  GATEWAY_OUTSIDE_SUBNET: {
    impact: "Devices in the subnet will not be able to use a gateway that lives outside their Layer 3 segment.",
    recommendation: "Choose a gateway address inside the subnet's usable host range.",
  },
  GATEWAY_IS_NETWORK_ADDRESS: {
    impact: "The network address identifies the subnet itself and cannot be used as a normal gateway on LAN segments.",
    recommendation: "Use a usable host address, commonly the first usable or last usable address.",
  },
  GATEWAY_IS_BROADCAST_ADDRESS: {
    impact: "The broadcast address is reserved for the subnet and cannot be used as a normal gateway.",
    recommendation: "Use a usable host address, commonly the first usable or last usable address.",
  },
  INSUFFICIENT_HOST_CAPACITY: {
    impact: "Host demand exceeds subnet capacity, which can cause address exhaustion and failed device onboarding.",
    recommendation: "Increase the subnet size or reduce the declared host count before implementation review.",
  },
  HOST_CAPACITY_NEAR_LIMIT: {
    impact: "The subnet may work on day one but has limited growth room and can fail during onboarding or expansion.",
    recommendation: "Review the growth buffer and consider a larger prefix before finalizing the addressing plan.",
  },
  RIGHTSIZE_RECOMMENDATION: {
    impact: "Overly large subnets can waste address space and make route summarization less clean.",
    recommendation: "Consider a tighter prefix if the segment is unlikely to grow significantly.",
  },
  NONSTANDARD_GATEWAY_PATTERN: {
    impact: "A custom gateway convention can slow troubleshooting if it is not intentional and documented.",
    recommendation: "Standardize on a project-wide gateway convention or document why this segment is different.",
  },
  GATEWAY_CONVENTION_REVIEW: {
    impact: "Inconsistent gateway placement can make operations and troubleshooting harder over time.",
    recommendation: "Confirm whether the project should use a first-usable, last-usable, or documented custom gateway pattern.",
  },
  OVERLAPPING_SUBNETS: {
    impact: "Overlapping subnets can break routing, firewall policy, DHCP scopes, and site-to-site reachability.",
    recommendation: "Assign non-overlapping subnet ranges and rerun validation.",
  },
  VALIDATION_PASSED: {
    impact: "No current blocker was detected by the saved validation checks, but this is not a live-network discovery result.",
    recommendation: "Continue engineer review against live inventory, business policy, and vendor implementation requirements.",
  },
};

function normalizeValidationText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripStructuredPrefixes(message: string) {
  return message
    .replace(/^Issue:\s*/i, "")
    .replace(/\s+Impact:\s+.*$/i, "")
    .replace(/\s+Recommendation:\s+.*$/i, "")
    .trim();
}

function fallbackImpact(severity: ValidationSeverity) {
  if (severity === "ERROR") return "This can create an implementation blocker or cause the generated design package to mislead reviewers.";
  if (severity === "WARNING") return "This may not stop the design, but it creates review debt that should be resolved or accepted explicitly.";
  return "This does not appear fatal, but it is still useful context for engineering review.";
}

function fallbackRecommendation(severity: ValidationSeverity) {
  if (severity === "ERROR") return "Correct the input, rerun validation, and confirm the finding clears before implementation handoff.";
  if (severity === "WARNING") return "Review the item, document the decision, and adjust the design if the warning is not intentional.";
  return "Review and document the item if it affects the final design basis.";
}

function buildValidationNarrative(item: ValidationItem): ValidationNarrative {
  const guidance = validationGuidanceByRuleCode[item.ruleCode] ?? {};
  const rawIssue = (guidance.issue ?? stripStructuredPrefixes(item.message)) || item.title;
  return {
    issue: normalizeValidationText(rawIssue),
    impact: normalizeValidationText(guidance.impact ?? fallbackImpact(item.severity)),
    recommendation: normalizeValidationText(guidance.recommendation ?? fallbackRecommendation(item.severity)),
  };
}

function composeValidationMessage(narrative: ValidationNarrative) {
  return `Issue: ${narrative.issue} Impact: ${narrative.impact} Recommendation: ${narrative.recommendation}`;
}

function makeItem(item: ValidationItem): ValidationItem {
  const narrative = buildValidationNarrative(item);
  return {
    ...item,
    message: composeValidationMessage(narrative),
  };
}

function parseStructuredValidationMessage(message: string, ruleCode: string, title: string, severity: ValidationSeverity): ValidationNarrative {
  const match = message.match(/^Issue:\s*(.*?)\s+Impact:\s*(.*?)\s+Recommendation:\s*(.*)$/i);
  if (match) {
    return {
      issue: normalizeValidationText(match[1] || title),
      impact: normalizeValidationText(match[2] || fallbackImpact(severity)),
      recommendation: normalizeValidationText(match[3] || fallbackRecommendation(severity)),
    };
  }

  return buildValidationNarrative({
    projectId: "",
    severity,
    ruleCode,
    title,
    message,
    entityType: "PROJECT",
  });
}

function enrichValidationResult<T extends { message: string; ruleCode: string; title: string; severity: ValidationSeverity }>(item: T) {
  const narrative = parseStructuredValidationMessage(item.message, item.ruleCode, item.title, item.severity);
  return {
    ...item,
    issue: narrative.issue,
    impact: narrative.impact,
    recommendation: narrative.recommendation,
  };
}

export async function runValidation(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sites: {
        include: {
          vlans: {
            orderBy: { vlanId: "asc" },
          },
        },
      },
    },
  });

  if (!project) {
    return [];
  }

  const results: ValidationItem[] = [];
  const parsedVlans: Array<{
    id: string;
    siteId: string;
    siteName: string;
    siteBlock?: string | null;
    vlanId: number;
    vlanName: string;
    role: SegmentRole;
    parsed: ReturnType<typeof parseCidr>;
  }> = [];



  const designSnapshot = buildDesignCoreSnapshot(project);
  if (designSnapshot) {
    for (const review of designSnapshot.siteSummaries) {
      if (review.status === "missing") {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "SITE_SUMMARY_MISSING",
            title: `Missing site summary review on ${review.siteName}`,
            message: review.notes.join(" ") || `${review.siteName} does not yet have a confirmed site summary block.`,
            entityType: "SITE",
            entityId: review.siteId,
          }),
        );
      } else if (review.status === "review") {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "SITE_SUMMARY_REVIEW",
            title: `Site summarization should be reviewed on ${review.siteName}`,
            message: review.notes.join(" ") || `${review.siteName} has a site summary that should be reviewed.`,
            entityType: "SITE",
            entityId: review.siteId,
          }),
        );
      }
    }

    if (designSnapshot.routingIntent.summarizationReadiness === "blocked") {
      results.push(
        makeItem({
          projectId,
          severity: "WARNING",
          ruleCode: "ROUTING_SUMMARIZATION_BLOCKED",
          title: "Routing summarization is blocked by boundary issues",
          message: designSnapshot.routingIntent.notes.join(" ") || "At least one site summary boundary still blocks clean routing summarization.",
          entityType: "PROJECT",
          entityId: projectId,
        }),
      );
    }
  }



  for (const site of project.sites) {
    const parsedSiteBlock = site.defaultAddressBlock ? (() => {
      try {
        return parseCidr(site.defaultAddressBlock);
      } catch {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "INVALID_SITE_BLOCK",
            title: `Invalid site block on ${site.name}`,
            message: `${site.name} has a default address block of ${site.defaultAddressBlock}, but that value is not valid CIDR notation.`,
            entityType: "SITE",
            entityId: site.id,
          }),
        );
        return null;
      }
    })() : null;

    for (const vlan of site.vlans) {
      const role = resolveValidationSegmentRole(vlan);
      let parsedCidr: ReturnType<typeof parseCidr> | null = null;

      try {
        parsedCidr = parseCidr(vlan.subnetCidr);
        parsedVlans.push({
          id: vlan.id,
          siteId: site.id,
          siteName: site.name,
          siteBlock: site.defaultAddressBlock,
          vlanId: vlan.vlanId,
          vlanName: vlan.vlanName,
          role,
          parsed: parsedCidr,
        });
      } catch {
        results.push(
          makeItem({
            projectId,
            severity: "ERROR",
            ruleCode: "INVALID_CIDR",
            title: `Invalid CIDR on VLAN ${vlan.vlanId}`,
            message: `VLAN ${vlan.vlanName} at ${site.name} uses an invalid subnet value: ${vlan.subnetCidr}.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }

      if (!isValidIpv4(vlan.gatewayIp)) {
        results.push(
          makeItem({
            projectId,
            severity: "ERROR",
            ruleCode: "INVALID_GATEWAY_IP",
            title: `Invalid gateway on VLAN ${vlan.vlanId}`,
            message: `VLAN ${vlan.vlanName} at ${site.name} uses an invalid gateway IP: ${vlan.gatewayIp}.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
        continue;
      }

      if (!parsedCidr) {
        continue;
      }

      const canonical = canonicalCidr(vlan.subnetCidr);
      const subnetFacts = describeSubnet(parsedCidr, role);

      if (canonical !== vlan.subnetCidr) {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "NONCANONICAL_CIDR",
            title: `CIDR should be written on its network boundary for VLAN ${vlan.vlanId}`,
            message: `${vlan.subnetCidr} resolves to the canonical network block ${canonical}. Store the subnet using the true network address to reduce confusion and improve summarization.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }

      if (parsedSiteBlock) {
        if (parsedCidr.network < parsedSiteBlock.network || parsedCidr.broadcast > parsedSiteBlock.broadcast) {
          results.push(
            makeItem({
              projectId,
              severity: "ERROR",
              ruleCode: "SUBNET_OUTSIDE_SITE_BLOCK",
              title: `Subnet falls outside the site block on VLAN ${vlan.vlanId}`,
              message: `${vlan.subnetCidr} does not fit inside ${site.name}'s default block ${site.defaultAddressBlock}. Subnets should remain inside the parent site allocation.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        }
      }

      if (parsedCidr.prefix === 31 && role !== "WAN_TRANSIT") {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "SLASH31_NONTRANSIT",
            title: `Review /31 usage on VLAN ${vlan.vlanId}`,
            message: `${vlan.subnetCidr} is a /31. That is realistic for point-to-point WAN transit links, but unusual for a user or access VLAN. Consider a larger subnet or mark this segment as WAN transit.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }

      if (parsedCidr.prefix === 32 && role !== "LOOPBACK") {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "SLASH32_NONLOOPBACK",
            title: `Review /32 usage on VLAN ${vlan.vlanId}`,
            message: `${vlan.subnetCidr} is a /32. That is typically used for a loopback or host route, not a normal VLAN segment.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }

      if (!containsIp(parsedCidr, vlan.gatewayIp)) {
        results.push(
          makeItem({
            projectId,
            severity: "ERROR",
            ruleCode: "GATEWAY_OUTSIDE_SUBNET",
            title: `Gateway outside subnet on VLAN ${vlan.vlanId}`,
            message: `Gateway ${vlan.gatewayIp} is not inside ${canonical}. Valid address range is ${describeRange(parsedCidr)}.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      } else {
        const shouldSkipNetworkBroadcastChecks = parsedCidr.prefix === 31 && role === "WAN_TRANSIT";

        if (!shouldSkipNetworkBroadcastChecks && isNetworkAddress(parsedCidr, vlan.gatewayIp)) {
          results.push(
            makeItem({
              projectId,
              severity: "ERROR",
              ruleCode: "GATEWAY_IS_NETWORK_ADDRESS",
              title: `Gateway uses network address on VLAN ${vlan.vlanId}`,
              message: `Gateway ${vlan.gatewayIp} matches the network address of ${canonical}.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        }

        if (!shouldSkipNetworkBroadcastChecks && isBroadcastAddress(parsedCidr, vlan.gatewayIp)) {
          results.push(
            makeItem({
              projectId,
              severity: "ERROR",
              ruleCode: "GATEWAY_IS_BROADCAST_ADDRESS",
              title: `Gateway uses broadcast address on VLAN ${vlan.vlanId}`,
              message: `Gateway ${vlan.gatewayIp} matches the broadcast address of ${canonical}.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        }
      }

      const usableHosts = usableHostCount(parsedCidr, role);
      if (typeof vlan.estimatedHosts === "number" && vlan.estimatedHosts > 0) {
        const recommendedPrefix = recommendedPrefixForHosts(vlan.estimatedHosts, role);
        const recommendedUsableHosts = usableHostCount(parseCidr(`0.0.0.0/${recommendedPrefix}`), role);

        if (vlan.estimatedHosts > usableHosts) {
          results.push(
            makeItem({
              projectId,
              severity: "ERROR",
              ruleCode: "INSUFFICIENT_HOST_CAPACITY",
              title: `Subnet too small on VLAN ${vlan.vlanId}`,
              message: `VLAN ${vlan.vlanName} estimates ${vlan.estimatedHosts} hosts, but ${canonical} supports only ${usableHosts} usable addresses for a ${role.toLowerCase().replace("_", " ")} segment. A better fit would be /${recommendedPrefix} with about ${recommendedUsableHosts} usable addresses.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        } else if (usableHosts > 0 && vlan.estimatedHosts / usableHosts >= 0.8) {
          const nextPrefix = Math.max(role === "WAN_TRANSIT" ? 31 : 1, parsedCidr.prefix - 1);
          const nextUsableHosts = usableHostCount(parseCidr(`0.0.0.0/${nextPrefix}`), role);
          results.push(
            makeItem({
              projectId,
              severity: "WARNING",
              ruleCode: "HOST_CAPACITY_NEAR_LIMIT",
              title: `Subnet nearing capacity on VLAN ${vlan.vlanId}`,
              message: `VLAN ${vlan.vlanName} estimates ${vlan.estimatedHosts} hosts out of ${usableHosts} usable addresses in ${canonical}. Consider expanding toward /${nextPrefix} for roughly ${nextUsableHosts} usable addresses.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        } else if (usableHosts > 0 && vlan.estimatedHosts / usableHosts <= 0.25 && parsedCidr.prefix < 30 && role !== "WAN_TRANSIT" && role !== "LOOPBACK") {
          results.push(
            makeItem({
              projectId,
              severity: "INFO",
              ruleCode: "RIGHTSIZE_RECOMMENDATION",
              title: `Possible right-size improvement on VLAN ${vlan.vlanId}`,
              message: `VLAN ${vlan.vlanName} uses ${canonical} with ${usableHosts} usable addresses, but the current estimate is only ${vlan.estimatedHosts}. A tighter fit could be /${recommendedPrefix} with about ${recommendedUsableHosts} usable addresses.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        }
      }

      if (parsedCidr.prefix <= 30 && role !== "WAN_TRANSIT" && role !== "LOOPBACK" && !suggestedGatewayPattern(vlan.gatewayIp)) {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "NONSTANDARD_GATEWAY_PATTERN",
            title: `Non-standard gateway pattern on VLAN ${vlan.vlanId}`,
            message: `Gateway ${vlan.gatewayIp} is valid, but it does not follow common conventions like .1 or .254 for normal LAN segments.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }

      if (subnetFacts.firstUsableIp && subnetFacts.lastUsableIp && vlan.gatewayIp !== subnetFacts.firstUsableIp && vlan.gatewayIp !== subnetFacts.lastUsableIp && role !== "WAN_TRANSIT") {
        results.push(
          makeItem({
            projectId,
            severity: "INFO",
            ruleCode: "GATEWAY_CONVENTION_REVIEW",
            title: `Gateway convention review on VLAN ${vlan.vlanId}`,
            message: `Common gateway placements for ${canonical} would be ${subnetFacts.firstUsableIp} or ${subnetFacts.lastUsableIp}. The current gateway ${vlan.gatewayIp} is valid, but review whether you want a standard gateway convention across the project.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }
    }
  }

  for (let i = 0; i < parsedVlans.length; i += 1) {
    for (let j = i + 1; j < parsedVlans.length; j += 1) {
      const left = parsedVlans[i];
      const right = parsedVlans[j];

      if (cidrsOverlap(left.parsed, right.parsed)) {
        results.push(
          makeItem({
            projectId,
            severity: "ERROR",
            ruleCode: "OVERLAPPING_SUBNETS",
            title: "Overlapping subnets detected",
            message: `${left.siteName} VLAN ${left.vlanId} (${left.vlanName}) overlaps with ${right.siteName} VLAN ${right.vlanId} (${right.vlanName}).`,
            entityType: "VLAN",
            entityId: left.id,
          }),
        );
      }
    }
  }


  if (designSnapshot) {
    const hiddenIssueCodes = new Set([
      "SITE_SUMMARY_MISSING",
      "SITE_BLOCK_PROPOSAL_UNAVAILABLE",
      "SUBNET_PROPOSAL_BLOCKED_BY_SITE_BLOCK",
      "SUBNET_PROPOSAL_UNAVAILABLE",
      "TRANSIT_PLAN_DEFERRED",
      "TRANSIT_PROPOSAL_UNAVAILABLE",
      "LOOPBACK_PLAN_DEFERRED",
      "LOOPBACK_PROPOSAL_UNAVAILABLE",
      "STANDARDS_REQUIRED_RULE_BLOCKER",
    ]);

    const seenDesignCoreIssues = new Set<string>();
    for (const issue of designSnapshot.issues) {
      if (hiddenIssueCodes.has(issue.code)) continue;

      const dedupeKey = `${issue.code}|${issue.entityType}|${issue.entityId || ""}|${issue.detail}`;
      if (seenDesignCoreIssues.has(dedupeKey)) continue;
      seenDesignCoreIssues.add(dedupeKey);

      results.push(makeItem({
        projectId,
        severity: issue.severity,
        ruleCode: issue.code,
        title: issue.title,
        message: issue.detail,
        entityType: issue.entityType,
        entityId: issue.entityId,
      }));
    }
  }


  if (results.length === 0) {
    results.push(
      makeItem({
        projectId,
        severity: "INFO",
        ruleCode: "VALIDATION_PASSED",
        title: "No validation issues found",
        message: "All current subnet boundary, gateway, capacity, and overlap checks passed.",
        entityType: "PROJECT",
        entityId: projectId,
      }),
    );
  }

  const savedResults = await prisma.$transaction(async (tx: any) => {
    await tx.validationResult.deleteMany({ where: { projectId } });
    await tx.validationResult.createMany({ data: results });
    return tx.validationResult.findMany({
      where: { projectId },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });
  });

  return savedResults.map(enrichValidationResult);
}

export async function getValidationResults(projectId: string) {
  const results = await prisma.validationResult.findMany({
    where: { projectId },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });

  return results.map(enrichValidationResult);
}
