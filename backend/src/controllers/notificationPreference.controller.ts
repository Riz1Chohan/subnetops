import type { Request, Response } from "express";
import { ApiError } from "../utils/apiError.js";
import * as service from "../services/notificationPreference.service.js";

export async function getPreferences(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const preferences = await service.getPreferences(userId);
  res.json(preferences);
}

export async function updatePreferences(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const input = req.body || {};
  const allowed: Record<string, unknown> = {};
  const booleanKeys = ["inAppInvites", "inAppMentions", "emailInvites", "emailMentions", "overdueReminders", "emailDigests"] as const;
  for (const key of booleanKeys) {
    if (key in input) {
      if (typeof input[key] !== "boolean") throw new ApiError(400, `${key} must be a boolean`);
      allowed[key] = input[key];
    }
  }
  if ("digestFrequency" in input) {
    if (input.digestFrequency !== "DAILY" && input.digestFrequency !== "WEEKLY") {
      throw new ApiError(400, "digestFrequency must be DAILY or WEEKLY");
    }
    allowed.digestFrequency = input.digestFrequency;
  }

  const preferences = await service.updatePreferences(userId, allowed as any);
  res.json(preferences);
}
