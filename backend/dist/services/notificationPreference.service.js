import { prisma } from "../db/prisma.js";
export async function getPreferences(userId) {
    const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing)
        return existing;
    return prisma.notificationPreference.create({ data: { userId } });
}
export async function updatePreferences(userId, data) {
    await getPreferences(userId);
    return prisma.notificationPreference.update({ where: { userId }, data });
}
