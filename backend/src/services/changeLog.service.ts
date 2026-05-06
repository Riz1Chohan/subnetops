import { prisma } from "../db/prisma.js";

export async function addChangeLog(projectId: string, message: string, actorLabel?: string, db: any = prisma) {
  return db.changeLog.create({ data: { projectId, actorLabel, message } });
}
