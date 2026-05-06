import type { Request, Response } from "express";
import { requireParam } from "../utils/request.js";
import { ApiError } from "../utils/apiError.js";
import * as commentService from "../services/comment.service.js";

export async function listAssignedTasks(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const items = await commentService.listAssignedTasks(userId);
  res.json(items);
}

export async function listComments(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const comments = await commentService.listComments(requireParam(req, "projectId"), userId);
  res.json(comments);
}

export async function listMentionSuggestions(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const items = await commentService.listMentionSuggestions(requireParam(req, "projectId"), userId);
  res.json(items);
}

export async function createComment(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const body = String(req.body?.body || "").trim();
  if (!body) throw new ApiError(400, "Comment body is required");
  const comment = await commentService.createComment(requireParam(req, "projectId"), userId, {
    body,
    parentId: req.body?.parentId || undefined,
    visibility: req.body?.visibility || "ALL",
    isPinned: Boolean(req.body?.isPinned),
    assignedToUserId: req.body?.assignedToUserId || undefined,
    dueDate: req.body?.dueDate || undefined,
    taskStatus: req.body?.taskStatus || undefined,
    priority: req.body?.priority || undefined,
    targetType: req.body?.targetType || undefined,
    targetId: req.body?.targetId || undefined,
  });
  res.status(201).json(comment);
}

export async function toggleResolve(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const comment = await commentService.toggleResolve(requireParam(req, "commentId"), userId);
  res.json(comment);
}

export async function togglePin(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const comment = await commentService.togglePin(requireParam(req, "commentId"), userId);
  res.json(comment);
}

export async function updateTask(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const comment = await commentService.updateTask(requireParam(req, "commentId"), userId, req.body || {});
  res.json(comment);
}

export async function bulkReassignTasks(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const result = await commentService.bulkReassignTasks(requireParam(req, "projectId"), userId, req.body || {});
  res.json(result);
}

export async function queueOverdueReminders(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const result = await commentService.queueOverdueReminders(requireParam(req, "projectId"), userId);
  res.json(result);
}

export async function queueMyDigest(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const result = await commentService.queueMyDigest(userId);
  res.json(result);
}
