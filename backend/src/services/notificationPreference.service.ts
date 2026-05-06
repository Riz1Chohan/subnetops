import { prisma } from "../db/prisma.js";

export async function getPreferences(userId: string) {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.notificationPreference.create({ data: { userId } });
}

export async function updatePreferences(userId: string, data: Partial<{ inAppInvites: boolean; inAppMentions: boolean; emailInvites: boolean; emailMentions: boolean; overdueReminders: boolean; emailDigests: boolean; digestFrequency: "DAILY" | "WEEKLY"; }>) {
  await getPreferences(userId);
  return prisma.notificationPreference.update({ where: { userId }, data });
}
