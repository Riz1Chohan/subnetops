import { prisma } from "../db/prisma.js";

function parseJson<T = Record<string, unknown>>(value?: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function truthy(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export async function getProjectExportData(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sites: {
        include: {
          vlans: {
            orderBy: { vlanId: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
      validations: {
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      },
      changeLogs: {
        orderBy: { createdAt: "desc" },
        take: 15,
      },
    },
  });
}

export function buildExportContext(project: Awaited<ReturnType<typeof getProjectExportData>>) {
  if (!project) return null;

  const requirements = parseJson<Record<string, unknown>>(project.requirementsJson) || {};
  const discovery = parseJson<Record<string, unknown>>(project.discoveryJson) || {};
  const platform = parseJson<Record<string, unknown>>(project.platformProfileJson) || {};
  const siteCount = project.sites.length;
  const vlanCount = project.sites.reduce((sum, site: any) => sum + site.vlans.length, 0);
  const errors = project.validations.filter((item: any) => item.severity === "ERROR");
  const warnings = project.validations.filter((item: any) => item.severity === "WARNING");

  const securityZones = [
    truthy(requirements.guestWifi) ? "Guest" : null,
    truthy(requirements.management) ? "Management" : null,
    truthy(requirements.voice) ? "Voice" : null,
    truthy(requirements.iot) || truthy(requirements.cameras) ? "IoT / Specialty" : null,
    truthy(requirements.remoteAccess) ? "Remote Access" : null,
    "Users",
    "Services",
  ].filter(Boolean) as string[];

  const discoveryHighlights = [
    typeof discovery.topologyBaseline === "string" && discovery.topologyBaseline.trim() ? `Topology baseline: ${discovery.topologyBaseline.trim()}` : null,
    typeof discovery.inventoryNotes === "string" && discovery.inventoryNotes.trim() ? `Inventory/lifecycle: ${discovery.inventoryNotes.trim()}` : null,
    typeof discovery.routingTransportBaseline === "string" && discovery.routingTransportBaseline.trim() ? `Routing/transport baseline: ${discovery.routingTransportBaseline.trim()}` : null,
    typeof discovery.securityPosture === "string" && discovery.securityPosture.trim() ? `Security baseline: ${discovery.securityPosture.trim()}` : null,
    typeof discovery.gapsPainPoints === "string" && discovery.gapsPainPoints.trim() ? `Gaps/pain points: ${discovery.gapsPainPoints.trim()}` : null,
    typeof discovery.constraintsDependencies === "string" && discovery.constraintsDependencies.trim() ? `Constraints/dependencies: ${discovery.constraintsDependencies.trim()}` : null,
  ].filter(Boolean) as string[];

  const bomLines = [
    siteCount > 0 ? `${siteCount} site location${siteCount === 1 ? "" : "s"}` : null,
    vlanCount > 0 ? `${vlanCount} VLAN / subnet design row${vlanCount === 1 ? "" : "s"}` : null,
    typeof platform.vendorStrategy === "string" && platform.vendorStrategy.trim() ? `Vendor strategy: ${platform.vendorStrategy.trim()}` : null,
    typeof platform.platformMode === "string" && platform.platformMode.trim() ? `Platform mode: ${platform.platformMode.trim()}` : null,
    typeof platform.wanPosture === "string" && platform.wanPosture.trim() ? `WAN posture: ${platform.wanPosture.trim()}` : null,
    typeof platform.wirelessPosture === "string" && platform.wirelessPosture.trim() ? `Wireless posture: ${platform.wirelessPosture.trim()}` : null,
    typeof platform.procurementLifecyclePosture === "string" && platform.procurementLifecyclePosture.trim() ? `Lifecycle posture: ${platform.procurementLifecyclePosture.trim()}` : null,
  ].filter(Boolean) as string[];

  return {
    project,
    requirements,
    discovery,
    platform,
    siteCount,
    vlanCount,
    errors,
    warnings,
    securityZones,
    discoveryHighlights,
    bomLines,
  };
}

export async function getCsvRows(projectId: string) {
  const project = await getProjectExportData(projectId);
  const ctx = buildExportContext(project);
  if (!ctx) return [];

  const rows: Array<Record<string, unknown>> = [];

  rows.push(
    { Section: "Project", Scope: "Project", Name: ctx.project.name, Key: "Organization", Value: ctx.project.organizationName ?? "", Notes: "" },
    { Section: "Project", Scope: "Project", Name: ctx.project.name, Key: "Environment", Value: ctx.project.environmentType ?? "", Notes: "" },
    { Section: "Project", Scope: "Project", Name: ctx.project.name, Key: "Base Private Range", Value: ctx.project.basePrivateRange ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Planning For", Value: ctx.requirements.planningFor ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Project Phase", Value: ctx.requirements.projectPhase ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Primary Goal", Value: ctx.requirements.primaryGoal ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Compliance Profile", Value: ctx.requirements.complianceProfile ?? "", Notes: "" },
  );

  for (const site of ctx.project.sites as any[]) {
    rows.push({ Section: "Sites", Scope: "Site", Name: site.name, Key: "Address Block", Value: site.defaultAddressBlock ?? "", Notes: site.location ?? "" });
    for (const vlan of site.vlans as any[]) {
      rows.push({
        Section: "Addressing",
        Scope: site.name,
        Name: `VLAN ${vlan.vlanId} ${vlan.vlanName}`,
        Key: "Subnet",
        Value: vlan.subnetCidr,
        Notes: `Gateway ${vlan.gatewayIp} | DHCP ${vlan.dhcpEnabled ? "Yes" : "No"} | Hosts ${vlan.estimatedHosts ?? ""}`,
      });
    }
  }

  for (const zone of ctx.securityZones) {
    rows.push({ Section: "Security", Scope: "Project", Name: zone, Key: "Zone", Value: zone, Notes: "Generated from current requirements scope" });
  }

  for (const item of ctx.project.validations as any[]) {
    rows.push({ Section: "Validation", Scope: item.entityType, Name: item.title, Key: item.severity, Value: item.message, Notes: item.ruleCode });
  }

  for (const item of ctx.bomLines) {
    rows.push({ Section: "Platform/BOM", Scope: "Project", Name: ctx.project.name, Key: "Foundation", Value: item, Notes: "Review before procurement" });
  }

  for (const item of ctx.discoveryHighlights) {
    rows.push({ Section: "Discovery", Scope: "Project", Name: ctx.project.name, Key: "Highlight", Value: item, Notes: "Current-state input" });
  }

  return rows;
}
