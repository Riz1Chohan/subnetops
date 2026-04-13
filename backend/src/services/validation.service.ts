import type { EntityType, ValidationSeverity } from "../lib/domainTypes.js";
import { prisma } from "../db/prisma.js";
import {
  cidrsOverlap,
  containsIp,
  describeRange,
  isBroadcastAddress,
  isNetworkAddress,
  isValidIpv4,
  parseCidr,
  suggestedGatewayPattern,
  usableHostCount,
  recommendedPrefixForHosts,
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
    siteName: string;
    vlanId: number;
    vlanName: string;
    parsed: ReturnType<typeof parseCidr>;
  }> = [];

  for (const site of project.sites) {
    for (const vlan of site.vlans) {
      let parsedCidr: ReturnType<typeof parseCidr> | null = null;

      try {
        parsedCidr = parseCidr(vlan.subnetCidr);
        parsedVlans.push({
          id: vlan.id,
          siteName: site.name,
          vlanId: vlan.vlanId,
          vlanName: vlan.vlanName,
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

      if (!containsIp(parsedCidr, vlan.gatewayIp)) {
        results.push(
          makeItem({
            projectId,
            severity: "ERROR",
            ruleCode: "GATEWAY_OUTSIDE_SUBNET",
            title: `Gateway outside subnet on VLAN ${vlan.vlanId}`,
            message: `Gateway ${vlan.gatewayIp} is not inside ${vlan.subnetCidr}. Valid range is ${describeRange(parsedCidr)}.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      } else {
        if (isNetworkAddress(parsedCidr, vlan.gatewayIp)) {
          results.push(
            makeItem({
              projectId,
              severity: "ERROR",
              ruleCode: "GATEWAY_IS_NETWORK_ADDRESS",
              title: `Gateway uses network address on VLAN ${vlan.vlanId}`,
              message: `Gateway ${vlan.gatewayIp} matches the network address of ${vlan.subnetCidr}.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        }

        if (isBroadcastAddress(parsedCidr, vlan.gatewayIp)) {
          results.push(
            makeItem({
              projectId,
              severity: "ERROR",
              ruleCode: "GATEWAY_IS_BROADCAST_ADDRESS",
              title: `Gateway uses broadcast address on VLAN ${vlan.vlanId}`,
              message: `Gateway ${vlan.gatewayIp} matches the broadcast address of ${vlan.subnetCidr}.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        }
      }

      const usableHosts = usableHostCount(parsedCidr);
      if (typeof vlan.estimatedHosts === "number" && vlan.estimatedHosts > 0) {
        const recommendedPrefix = recommendedPrefixForHosts(vlan.estimatedHosts);
        const recommendedUsableHosts = usableHostCount(parseCidr(`0.0.0.0/${recommendedPrefix}`));
        if (vlan.estimatedHosts > usableHosts) {
          results.push(
            makeItem({
              projectId,
              severity: "ERROR",
              ruleCode: "INSUFFICIENT_HOST_CAPACITY",
              title: `Subnet too small on VLAN ${vlan.vlanId}`,
              message: `VLAN ${vlan.vlanName} estimates ${vlan.estimatedHosts} hosts, but ${vlan.subnetCidr} supports only ${usableHosts} usable hosts. A better fit would be /${recommendedPrefix} with about ${recommendedUsableHosts} usable hosts.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        } else if (usableHosts > 0 && vlan.estimatedHosts / usableHosts >= 0.8) {
          const nextPrefix = Math.max(1, parsedCidr.prefix - 1);
          const nextUsableHosts = usableHostCount(parseCidr(`0.0.0.0/${nextPrefix}`));
          results.push(
            makeItem({
              projectId,
              severity: "WARNING",
              ruleCode: "HOST_CAPACITY_NEAR_LIMIT",
              title: `Subnet nearing capacity on VLAN ${vlan.vlanId}`,
              message: `VLAN ${vlan.vlanName} estimates ${vlan.estimatedHosts} hosts out of ${usableHosts} usable addresses in ${vlan.subnetCidr}. Consider expanding toward /${nextPrefix} for roughly ${nextUsableHosts} usable hosts.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        } else if (usableHosts > 0 && vlan.estimatedHosts / usableHosts <= 0.25 && parsedCidr.prefix < 30) {
          results.push(
            makeItem({
              projectId,
              severity: "INFO",
              ruleCode: "RIGHTSIZE_RECOMMENDATION",
              title: `Possible right-size improvement on VLAN ${vlan.vlanId}`,
              message: `VLAN ${vlan.vlanName} uses ${vlan.subnetCidr} with ${usableHosts} usable hosts, but the current estimate is only ${vlan.estimatedHosts}. A tighter fit could be /${recommendedPrefix} with about ${recommendedUsableHosts} usable hosts.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        }
      }

      if (!suggestedGatewayPattern(vlan.gatewayIp)) {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "NONSTANDARD_GATEWAY_PATTERN",
            title: `Non-standard gateway pattern on VLAN ${vlan.vlanId}`,
            message: `Gateway ${vlan.gatewayIp} is valid, but it does not follow common conventions like .1 or .254.`,
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
        message: "All current VLAN subnet and gateway checks passed.",
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
