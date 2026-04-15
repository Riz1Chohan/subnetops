import { prisma } from "../db/prisma.js";
import { canEditProject, ensureCanCommentOnProject, ensureCanEditProject } from "./access.service.js";
import { createNotification } from "./notification.service.js";
import { addChangeLog } from "./changeLog.service.js";
import { queueEmail } from "./email.service.js";
import { ApiError } from "../utils/apiError.js";
function extractMentions(body) {
    return Array.from(new Set((body.match(/@[\w.-]+/g) || []).map((item) => item.slice(1).toLowerCase())));
}
function matchesMention(candidate, token) {
    const email = candidate.email.toLowerCase();
    const local = email.split("@")[0];
    const fullName = (candidate.fullName || "").toLowerCase().replace(/\s+/g, "");
    return email === token || local === token || fullName === token;
}
function priorityWeight(priority) {
    if (priority === "CRITICAL")
        return 4;
    if (priority === "HIGH")
        return 3;
    if (priority === "MEDIUM")
        return 2;
    return 1;
}
async function getProjectAudience(projectId, ownerId, organizationId) {
    const candidates = new Map();
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, email: true, fullName: true } });
    if (owner)
        candidates.set(owner.id, owner);
    const watchers = await prisma.projectWatch.findMany({
        where: { projectId },
        include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    watchers.forEach((item) => candidates.set(item.user.id, item.user));
    if (organizationId) {
        const memberships = await prisma.membership.findMany({
            where: { organizationId },
            include: { user: { select: { id: true, email: true, fullName: true } } },
        });
        memberships.forEach((item) => candidates.set(item.user.id, item.user));
    }
    return Array.from(candidates.values());
}
async function notifyAudience({ projectId, ownerId, organizationId, actorUserId, actorLabel, body, projectName }) {
    const mentions = extractMentions(body);
    const audience = await getProjectAudience(projectId, ownerId, organizationId);
    for (const candidate of audience) {
        if (candidate.id === actorUserId)
            continue;
        const prefs = await prisma.notificationPreference.findUnique({ where: { userId: candidate.id } });
        const isMentioned = mentions.some((token) => matchesMention(candidate, token));
        if (isMentioned) {
            if (prefs?.inAppMentions !== false) {
                await createNotification({
                    userId: candidate.id,
                    type: "MENTION",
                    title: "You were mentioned in a comment",
                    message: `${actorLabel} mentioned you in ${projectName}.`,
                    link: `/projects/${projectId}`,
                });
            }
            if (prefs?.emailMentions) {
                await queueEmail({
                    toEmail: candidate.email,
                    subject: `You were mentioned in ${projectName}`,
                    templateKey: "comment-mention",
                    payload: { projectId, projectName, body, author: actorLabel },
                });
            }
        }
        else {
            await createNotification({
                userId: candidate.id,
                type: "COMMENT",
                title: "New project comment",
                message: `${actorLabel} commented on ${projectName}.`,
                link: `/projects/${projectId}`,
            });
        }
    }
}
function buildCommentInclude() {
    return {
        user: { select: { id: true, email: true, fullName: true } },
        assignedTo: { select: { id: true, email: true, fullName: true } },
        replies: {
            include: {
                user: { select: { id: true, email: true, fullName: true } },
                assignedTo: { select: { id: true, email: true, fullName: true } },
            },
            orderBy: { createdAt: "asc" },
        },
    };
}
async function ensureAssignableUser(projectId, projectOwnerId, organizationId, assignedToUserId) {
    if (!assignedToUserId)
        return null;
    const audience = await getProjectAudience(projectId, projectOwnerId, organizationId);
    const match = audience.find((candidate) => candidate.id === assignedToUserId);
    if (!match)
        throw new ApiError(400, "Assigned user is not eligible for this project");
    return match.id;
}
async function ensureCanManageComment(userId, commentId) {
    const comment = await prisma.projectComment.findFirst({ where: { id: commentId }, include: { user: true } });
    if (!comment)
        throw new ApiError(404, "Comment not found");
    const isEditor = await canEditProject(userId, comment.projectId);
    const isAuthor = comment.userId === userId;
    const isAssignee = comment.assignedToUserId === userId;
    if (!isEditor && !isAuthor && !isAssignee) {
        throw new ApiError(403, "You do not have permission to manage this comment task");
    }
    return { comment, isEditor, isAuthor, isAssignee };
}
export async function listComments(projectId, userId) {
    await ensureCanCommentOnProject(userId, projectId);
    const isEditor = await canEditProject(userId, projectId);
    const comments = await prisma.projectComment.findMany({
        where: {
            projectId,
            parentId: null,
            ...(isEditor ? {} : {
                OR: [
                    { visibility: "ALL" },
                    { userId },
                    { assignedToUserId: userId },
                ],
            }),
        },
        include: buildCommentInclude(),
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
    if (isEditor)
        return comments;
    return comments.map((comment) => ({
        ...comment,
        replies: (comment.replies || []).filter((reply) => reply.visibility === "ALL" || reply.userId === userId || reply.assignedToUserId === userId),
    }));
}
export async function listMentionSuggestions(projectId, userId) {
    const project = await ensureCanCommentOnProject(userId, projectId);
    const audience = await getProjectAudience(projectId, project.userId, project.organizationId);
    return audience.filter((item) => item.id !== userId).map((item) => ({
        id: item.id,
        email: item.email,
        fullName: item.fullName,
        mentionToken: `@${item.email.split("@")[0]}`,
    }));
}
export async function createComment(projectId, userId, input) {
    const project = await ensureCanCommentOnProject(userId, projectId);
    if (input.parentId) {
        const parent = await prisma.projectComment.findFirst({ where: { id: input.parentId, projectId } });
        if (!parent)
            throw new ApiError(404, "Parent comment not found");
    }
    const comment = await prisma.projectComment.create({
        data: {
            projectId,
            userId,
            body: input.body,
            parentId: input.parentId || null,
            visibility: input.visibility || "ALL",
            isPinned: Boolean(input.isPinned),
            assignedToUserId: await ensureAssignableUser(projectId, project.userId, project.organizationId, input.assignedToUserId) || null,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            taskStatus: input.taskStatus || "OPEN",
            priority: input.priority || "MEDIUM",
            targetType: input.targetType || "PROJECT",
            targetId: input.targetId || null,
        },
        include: buildCommentInclude(),
    });
    await addChangeLog(projectId, `${input.parentId ? "Reply" : "Comment"} added by ${comment.user.fullName || comment.user.email}`, comment.user.email);
    if (input.assignedToUserId && input.assignedToUserId !== userId) {
        await createNotification({
            userId: input.assignedToUserId,
            type: "REVIEW",
            title: "Comment task assigned to you",
            message: `${comment.user.fullName || comment.user.email} assigned a ${comment.priority.toLowerCase()} priority review item in ${project.name}.`,
            link: `/projects/${projectId}`,
        });
    }
    await notifyAudience({
        projectId,
        ownerId: project.userId,
        organizationId: project.organizationId,
        actorUserId: userId,
        actorLabel: comment.user.fullName || comment.user.email,
        body: input.body,
        projectName: project.name,
    });
    return comment;
}
export async function toggleResolve(commentId, userId) {
    const { comment } = await ensureCanManageComment(userId, commentId);
    const updated = await prisma.projectComment.update({ where: { id: commentId }, data: { isResolved: !comment.isResolved } });
    await addChangeLog(comment.projectId, `Comment ${updated.isResolved ? "resolved" : "reopened"}`, comment.user.email);
    return updated;
}
export async function togglePin(commentId, userId) {
    const { comment, isEditor, isAuthor } = await ensureCanManageComment(userId, commentId);
    if (!isEditor && !isAuthor)
        throw new ApiError(403, "Only editors or the comment author can pin comments");
    const updated = await prisma.projectComment.update({ where: { id: commentId }, data: { isPinned: !comment.isPinned } });
    await addChangeLog(comment.projectId, `Comment ${updated.isPinned ? "pinned" : "unpinned"}`, comment.user.email);
    return updated;
}
export async function updateTask(commentId, userId, input) {
    const { comment, isEditor, isAuthor, isAssignee } = await ensureCanManageComment(userId, commentId);
    if ((input.assignedToUserId !== undefined || input.priority !== undefined || input.targetType !== undefined || input.targetId !== undefined) && !isEditor && !isAuthor) {
        throw new ApiError(403, "Only editors or the comment author can change assignee, priority, or target");
    }
    if ((input.taskStatus !== undefined || input.dueDate !== undefined) && !isEditor && !isAuthor && !isAssignee) {
        throw new ApiError(403, "You do not have permission to update this task state");
    }
    const project = await prisma.project.findFirst({ where: { id: comment.projectId }, select: { userId: true, organizationId: true } });
    const updated = await prisma.projectComment.update({
        where: { id: commentId },
        data: {
            assignedToUserId: input.assignedToUserId === undefined ? undefined : (await ensureAssignableUser(comment.projectId, project?.userId || comment.userId, project?.organizationId, input.assignedToUserId) || null),
            dueDate: input.dueDate === undefined ? undefined : (input.dueDate ? new Date(input.dueDate) : null),
            taskStatus: input.taskStatus || undefined,
            priority: input.priority || undefined,
            targetType: input.targetType || undefined,
            targetId: input.targetId === undefined ? undefined : input.targetId,
        },
        include: buildCommentInclude(),
    });
    await addChangeLog(comment.projectId, `Comment task updated`, comment.user.email);
    if (updated.assignedToUserId && updated.assignedToUserId !== comment.assignedToUserId) {
        await createNotification({
            userId: updated.assignedToUserId,
            type: "REVIEW",
            title: "Task assigned to you",
            message: `A ${updated.priority.toLowerCase()} priority task was assigned to you.`,
            link: `/projects/${comment.projectId}`,
        });
    }
    return updated;
}
export async function listAssignedTasks(userId) {
    const items = await prisma.projectComment.findMany({
        where: { assignedToUserId: userId },
        include: {
            project: { select: { id: true, name: true } },
            user: { select: { id: true, email: true, fullName: true } },
            assignedTo: { select: { id: true, email: true, fullName: true } },
        },
    });
    return items.sort((a, b) => {
        const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const priorityDelta = priorityWeight(b.priority) - priorityWeight(a.priority);
        if (priorityDelta !== 0)
            return priorityDelta;
        if (dueA !== dueB)
            return dueA - dueB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}
export async function bulkReassignTasks(projectId, userId, input) {
    const project = await ensureCanEditProject(userId, projectId);
    const validIds = Array.from(new Set((input.commentIds || []).filter(Boolean)));
    if (validIds.length === 0)
        throw new ApiError(400, "No tasks selected");
    const assigneeId = await ensureAssignableUser(projectId, project.userId, project.organizationId, input.assignedToUserId);
    const result = await prisma.projectComment.updateMany({
        where: { id: { in: validIds }, projectId },
        data: { assignedToUserId: assigneeId || null },
    });
    if (assigneeId) {
        await createNotification({
            userId: assigneeId,
            type: "REVIEW",
            title: "Tasks reassigned to you",
            message: `${result.count} task(s) were reassigned to you in a project.`,
            link: `/projects/${projectId}`,
        });
    }
    await addChangeLog(projectId, `Bulk reassigned ${result.count} task(s)`, userId);
    return { updated: result.count };
}
export async function queueOverdueReminders(projectId, userId) {
    const project = await ensureCanEditProject(userId, projectId);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tasks = await prisma.projectComment.findMany({
        where: {
            projectId,
            assignedToUserId: { not: null },
            taskStatus: { not: "DONE" },
            dueDate: { lt: new Date() },
            OR: [
                { reminderLastQueuedAt: null },
                { reminderLastQueuedAt: { lt: cutoff } },
            ],
        },
        include: {
            assignedTo: { select: { id: true, email: true, fullName: true } },
            project: { select: { id: true, name: true } },
        },
    });
    const grouped = new Map();
    for (const task of tasks) {
        if (!task.assignedTo)
            continue;
        const list = grouped.get(task.assignedTo.id) || [];
        list.push(task);
        grouped.set(task.assignedTo.id, list);
    }
    let queued = 0;
    for (const [assigneeId, userTasks] of grouped) {
        const assignee = userTasks[0]?.assignedTo;
        if (!assignee)
            continue;
        const prefs = await prisma.notificationPreference.findUnique({ where: { userId: assigneeId } });
        if (prefs?.overdueReminders === false)
            continue;
        await createNotification({
            userId: assigneeId,
            type: "REVIEW",
            title: "Overdue review task reminder",
            message: `${userTasks.length} overdue task(s) in ${project.name} need attention.`,
            link: `/projects/${projectId}`,
        });
        await queueEmail({
            toEmail: assignee.email,
            subject: `Overdue tasks reminder: ${project.name}`,
            templateKey: "overdue-task-reminder-batch",
            payload: {
                projectId,
                projectName: project.name,
                count: userTasks.length,
                tasks: userTasks.map((task) => ({ id: task.id, body: task.body, dueDate: task.dueDate, priority: task.priority })),
            },
        });
        for (const task of userTasks) {
            await prisma.projectComment.update({ where: { id: task.id }, data: { reminderLastQueuedAt: new Date() } });
        }
        queued += userTasks.length;
    }
    await addChangeLog(projectId, `Queued ${queued} overdue reminder(s)`, userId);
    return { queued };
}
export async function queueMyDigest(userId) {
    const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } });
    if (!user)
        throw new ApiError(404, "User not found");
    if (prefs?.emailDigests === false)
        return { queued: false, reason: "Email digests disabled" };
    const tasks = await listAssignedTasks(userId);
    const overdue = tasks.filter((task) => task.dueDate && task.taskStatus !== "DONE" && new Date(task.dueDate).getTime() < Date.now()).length;
    const open = tasks.filter((task) => task.taskStatus !== "DONE").length;
    await queueEmail({
        toEmail: user.email,
        subject: `SubnetOps ${prefs?.digestFrequency === "WEEKLY" ? "weekly" : "daily"} digest`,
        templateKey: "task-digest",
        payload: { open, overdue, total: tasks.length, frequency: prefs?.digestFrequency || "DAILY" },
    });
    await createNotification({
        userId,
        type: "SYSTEM",
        title: "Digest queued",
        message: `Your ${prefs?.digestFrequency === "WEEKLY" ? "weekly" : "daily"} task digest has been queued.`,
        link: "/my-tasks",
    });
    return { queued: true, open, overdue };
}
