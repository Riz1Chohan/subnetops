import { prisma } from "../db/prisma.js";

export async function addChangeLog(projectId: string, message: string, actorLabel?: string) {
  return prisma.changeLog.create({
    data: {
      projectId,
      actorLabel,
      message,
    },
  });
}
