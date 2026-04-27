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
    },
  });
}
