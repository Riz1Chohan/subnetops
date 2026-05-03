import type { PlanTier } from "../lib/domainTypes.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { addChangeLog } from "./changeLog.service.js";
import { ensureCanEditProject } from "./access.service.js";

export async function createSite(userId: string, planTier: PlanTier, data: { projectId: string; name: string; location?: string; streetAddress?: string; buildingLabel?: string; floorLabel?: string; siteCode?: string; notes?: string; defaultAddressBlock?: string }, actorLabel?: string) {
  const project = await ensureCanEditProject(userId, data.projectId);
  if (!project) throw new ApiError(404, "Project not found");

  if (planTier === "FREE") {
    const siteCount = await prisma.site.count({ where: { projectId: data.projectId } });
    if (siteCount >= 2) throw new ApiError(403, "Free plan limit reached: up to 2 sites per project allowed.");
  }

  return prisma.$transaction(async (tx: any) => {
    const site = await tx.site.create({ data });
    await addChangeLog(data.projectId, `Site created: ${site.name}`, actorLabel, tx);
    return site;
  });
}

export async function updateSite(siteId: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  const site = await prisma.site.findFirst({ where: { id: siteId }, include: { project: true } });
  if (!site) throw new ApiError(404, "Site not found");
  await ensureCanEditProject(userId, site.projectId);

  return prisma.$transaction(async (tx: any) => {
    const updated = await tx.site.update({ where: { id: siteId }, data });
    await addChangeLog(site.projectId, `Site updated: ${updated.name}`, actorLabel, tx);
    return updated;
  });
}

export async function deleteSite(siteId: string, userId: string, actorLabel?: string) {
  const site = await prisma.site.findFirst({ where: { id: siteId } });
  if (!site) throw new ApiError(404, "Site not found");
  await ensureCanEditProject(userId, site.projectId);

  return prisma.$transaction(async (tx: any) => {
    const deleted = await tx.site.delete({ where: { id: siteId } });
    await addChangeLog(site.projectId, `Site deleted: ${deleted.name}`, actorLabel, tx);
    return deleted;
  });
}
