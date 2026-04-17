import { prisma } from "../db/prisma.js";
import { createNotification } from "./notification.service.js";
import { queueEmail } from "./email.service.js";
import { env } from "../config/env.js";

export async function runAutomationSweepOnce() {
  await queueAutomatedOverdueReminders();
  await queueAutomatedDigests();
}

async function queueAutomatedOverdueReminders() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tasks = await prisma.projectComment.findMany({
    where: {
      assignedToUserId: { not: null },
      taskStatus: { not: "DONE" },
      dueDate: { lt: new Date() },
      OR: [
        { reminderLastQueuedAt: null },
        { reminderLastQueuedAt: { lt: cutoff } },
      ],
      assignedTo: { notificationPreference: { is: { overdueReminders: true } } },
    },
    include: {
      assignedTo: { select: { id: true, email: true, fullName: true } },
      project: { select: { id: true, name: true } },
    },
  });

  const groups = new Map<string, typeof tasks>();
  for (const task of tasks) {
    if (!task.assignedTo) continue;
    const key = task.assignedTo.id;
    const list = groups.get(key) || [];
    list.push(task);
    groups.set(key, list);
  }

  for (const [userId, userTasks] of groups) {
    const assignee = userTasks[0]?.assignedTo;
    if (!assignee) continue;
    await createNotification({
      userId,
      type: "REVIEW",
      title: "Automated overdue reminder",
      message: `${userTasks.length} overdue task(s) need attention.`,
      link: `/my-tasks`,
    });
    await queueEmail({
      toEmail: assignee.email,
      subject: "SubnetOps overdue tasks reminder",
      templateKey: "automated-overdue-reminder",
      payload: { count: userTasks.length, tasks: userTasks.map((task: any) => ({ id: task.id, body: task.body, project: task.project.name, dueDate: task.dueDate, priority: task.priority })) },
    });
    await prisma.projectComment.updateMany({
      where: { id: { in: userTasks.map((task: any) => task.id) } },
      data: { reminderLastQueuedAt: new Date() },
    });
  }
}

async function queueAutomatedDigests() {
  const prefs = await prisma.notificationPreference.findMany({
    where: { emailDigests: true },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });

  for (const pref of prefs) {
    const minAge = pref.digestFrequency === "WEEKLY" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    if (pref.lastDigestQueuedAt && Date.now() - new Date(pref.lastDigestQueuedAt).getTime() < minAge) continue;

    const tasks = await prisma.projectComment.findMany({
      where: { assignedToUserId: pref.userId, taskStatus: { not: "DONE" } },
      include: { project: { select: { name: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 25,
    });

    const overdue = tasks.filter((task: any) => task.dueDate && new Date(task.dueDate).getTime() < Date.now()).length;
    await queueEmail({
      toEmail: pref.user.email,
      subject: `SubnetOps ${pref.digestFrequency.toLowerCase()} digest`,
      templateKey: "automated-task-digest",
      payload: { frequency: pref.digestFrequency, open: tasks.length, overdue, tasks: tasks.map((task: any) => ({ body: task.body, project: task.project?.name, dueDate: task.dueDate, priority: task.priority })) },
    });
    await createNotification({
      userId: pref.userId,
      type: "SYSTEM",
      title: "Automated digest queued",
      message: `Your ${pref.digestFrequency.toLowerCase()} digest was queued.`,
      link: "/my-tasks",
    });
    await prisma.notificationPreference.update({ where: { userId: pref.userId }, data: { lastDigestQueuedAt: new Date() } });
  }
}

export function startAutomationSweep() {
  if (!env.automationSweepEnabled) return null;
  const run = async () => {
    try {
      await runAutomationSweepOnce();
    } catch (error) {
      console.error("Automation sweep failed", error);
    }
  };
  void run();
  return setInterval(run, env.automationSweepIntervalMs);
}
