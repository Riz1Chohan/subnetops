import { prisma } from "../../db/prisma.js";
import { ensureRequirementsMaterializedForRead } from "../requirementsMaterialization.service.js";

export async function getProjectDesignData(projectId: string) {
  await ensureRequirementsMaterializedForRead(projectId, "SubnetOps runtime", "design-core-read", {
    operation: "design-core-read",
    authorization: { permission: "system-internal-authorized", checkedBy: "designCore.service ensureCanViewProject or export controller authorization" },
    surfacedTo: ["design-core", "change-log", "security-audit", "report-export"],
  });
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
