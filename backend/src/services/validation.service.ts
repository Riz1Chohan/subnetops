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
} from "../lib/cidr.js";

interface ValidationItem {
  projectId: string;
  severity: ValidationSeverity;
  ruleCode: string;
  title: string;
  message: string;
  entityType: EntityType;
  entityId?: string;
}

function makeItem(item: ValidationItem): ValidationItem {
  return item;
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

  await prisma.validationResult.deleteMany({ where: { projectId } });

  const results: ValidationItem[] = [];
  const parsedVlans: Array<{
    id: string;
    siteId: string;
    siteName: string;
    siteBlock?: string | null;
    vlanId: number;
    vlanName: string;
    role: ReturnType<typeof classifySegmentRole>;
    parsed: ReturnType<typeof parseCidr>;
  }> = [];

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
      const role = classifySegmentRole(`${vlan.purpose || ""} ${vlan.vlanName} ${vlan.department || ""} ${vlan.notes || ""}`);
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

  await prisma.validationResult.createMany({ data: results });

  return prisma.validationResult.findMany({
    where: { projectId },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });
}

export async function getValidationResults(projectId: string) {
  return prisma.validationResult.findMany({
    where: { projectId },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });
}
