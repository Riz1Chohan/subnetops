import type { Request, Response } from "express";
import { requireParam } from "../utils/request.js";
import { ApiError } from "../utils/apiError.js";
import * as notificationService from "../services/notification.service.js";

export async function listNotifications(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const items = await notificationService.listNotifications(userId);
  res.json(items);
}

export async function getSummary(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const summary = await notificationService.getNotificationSummary(userId);
  res.json(summary);
}

export async function markRead(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  await notificationService.markNotificationRead(userId, requireParam(req, "notificationId"));
  res.json({ message: "Notification marked as read" });
}

export async function markAllRead(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  await notificationService.markAllNotificationsRead(userId);
  res.json({ message: "Notifications marked as read" });
}
