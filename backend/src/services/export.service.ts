import { prisma } from "../db/prisma.js";

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
    },
  });
}

export async function getCsvRows(projectId: string) {
  const project = await getProjectExportData(projectId);

  if (!project) return [];

  return project.sites.flatMap((site: any) =>
    site.vlans.map((vlan: any) => ({
      Project: project.name,
      Organization: project.organizationName ?? "",
      Site: site.name,
      Location: site.location ?? "",
      "VLAN ID": vlan.vlanId,
      "VLAN Name": vlan.vlanName,
      Purpose: vlan.purpose ?? "",
      Subnet: vlan.subnetCidr,
      Gateway: vlan.gatewayIp,
      DHCP: vlan.dhcpEnabled ? "Yes" : "No",
      "Estimated Hosts": vlan.estimatedHosts ?? "",
      Department: vlan.department ?? "",
      Notes: vlan.notes ?? "",
    })),
  );
}
