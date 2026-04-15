import { prisma } from "../db/prisma.js";
export async function createNotification(input) {
    return prisma.notification.create({
        data: {
            userId: input.userId,
            type: input.type || "SYSTEM",
            title: input.title,
            message: input.message,
            link: input.link,
        },
    });
}
export async function listNotifications(userId) {
    return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
}
export async function getNotificationSummary(userId) {
    const unread = await prisma.notification.count({ where: { userId, status: "UNREAD" } });
    const total = await prisma.notification.count({ where: { userId } });
    return { unread, total };
}
export async function markNotificationRead(userId, notificationId) {
    return prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { status: "READ", readAt: new Date() },
    });
}
export async function markAllNotificationsRead(userId) {
    return prisma.notification.updateMany({
        where: { userId, status: "UNREAD" },
        data: { status: "READ", readAt: new Date() },
    });
}
