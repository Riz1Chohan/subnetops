import { prisma } from "../db/prisma.js";
import { ensureCanViewProject } from "./access.service.js";
export async function listWatchers(projectId, userId) {
    await ensureCanViewProject(userId, projectId);
    return prisma.projectWatch.findMany({
        where: { projectId },
        include: { user: { select: { id: true, email: true, fullName: true } } },
        orderBy: { createdAt: "asc" },
    });
}
export async function watchProject(projectId, userId) {
    await ensureCanViewProject(userId, projectId);
    return prisma.projectWatch.upsert({
        where: { projectId_userId: { projectId, userId } },
        update: {},
        create: { projectId, userId },
    });
}
export async function unwatchProject(projectId, userId) {
    await ensureCanViewProject(userId, projectId);
    return prisma.projectWatch.deleteMany({ where: { projectId, userId } });
}
