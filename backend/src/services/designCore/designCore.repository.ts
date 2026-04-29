import { prisma } from "../../db/prisma.js";

export async function getProjectDesignData(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sites: {
        include: {
          vlans: {
            orderBy: [{ vlanId: "asc" }],
          },
        },
        orderBy: [{ name: "asc" }],
      },
      routeDomains: { orderBy: [{ name: "asc" }] },
      ipPools: { orderBy: [{ name: "asc" }] },
      ipAllocations: { orderBy: [{ createdAt: "asc" }] },
      dhcpScopes: { orderBy: [{ createdAt: "asc" }] },
      ipReservations: { orderBy: [{ createdAt: "asc" }] },
      brownfieldImports: { orderBy: [{ importedAt: "desc" }] },
      brownfieldNetworks: { orderBy: [{ createdAt: "asc" }] },
      allocationApprovals: { orderBy: [{ createdAt: "desc" }] },
      allocationLedger: { orderBy: [{ createdAt: "desc" }] },
    },
  });
}
