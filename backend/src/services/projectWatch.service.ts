import { prisma } from "../db/prisma.js";
import { ensureCanViewProject } from "./access.service.js";

export async function listWatchers(projectId: string, userId: string) {
  await ensureCanViewProject(userId, projectId);
  return prisma.projectWatch.findMany({
    where: { projectId },
    include: { user: { select: { id: true, email: true, fullName: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function watchProject(projectId: string, userId: string) {
  await ensureCanViewProject(userId, projectId);
  return prisma.projectWatch.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: { projectId, userId },
  });
}

export async function unwatchProject(projectId: string, userId: string) {
  await ensureCanViewProject(userId, projectId);
  return prisma.projectWatch.deleteMany({ where: { projectId, userId } });
}
