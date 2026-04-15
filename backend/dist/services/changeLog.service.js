import { prisma } from "../db/prisma.js";
export async function addChangeLog(projectId, message, actorLabel) {
    return prisma.changeLog.create({
        data: {
            projectId,
            actorLabel,
            message,
        },
    });
}
