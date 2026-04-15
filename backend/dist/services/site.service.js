import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { addChangeLog } from "./changeLog.service.js";
import { ensureCanEditProject } from "./access.service.js";
export async function createSite(userId, planTier, data, actorLabel) {
    const project = await ensureCanEditProject(userId, data.projectId);
    if (!project)
        throw new ApiError(404, "Project not found");
    if (planTier === "FREE") {
        const siteCount = await prisma.site.count({ where: { projectId: data.projectId } });
        if (siteCount >= 2)
            throw new ApiError(403, "Free plan limit reached: up to 2 sites per project allowed.");
    }
    const site = await prisma.site.create({ data });
    await addChangeLog(data.projectId, `Site created: ${site.name}`, actorLabel);
    return site;
}
export async function updateSite(siteId, userId, data, actorLabel) {
    const site = await prisma.site.findFirst({ where: { id: siteId }, include: { project: true } });
    if (!site)
        throw new ApiError(404, "Site not found");
    await ensureCanEditProject(userId, site.projectId);
    const updated = await prisma.site.update({ where: { id: siteId }, data });
    await addChangeLog(site.projectId, `Site updated: ${updated.name}`, actorLabel);
    return updated;
}
export async function deleteSite(siteId, userId, actorLabel) {
    const site = await prisma.site.findFirst({ where: { id: siteId } });
    if (!site)
        throw new ApiError(404, "Site not found");
    await ensureCanEditProject(userId, site.projectId);
    const deleted = await prisma.site.delete({ where: { id: siteId } });
    await addChangeLog(site.projectId, `Site deleted: ${deleted.name}`, actorLabel);
    return deleted;
}
