import type { Request, Response } from "express";
import { requireParam } from "../utils/request.js";
import { ApiError } from "../utils/apiError.js";
import * as designCoreService from "../services/designCore.service.js";

export async function getDesignCoreSnapshot(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const snapshot = await designCoreService.getDesignCoreSnapshot(requireParam(req, "projectId"), userId);
  if (!snapshot) throw new ApiError(404, "Project not found");
  res.json(snapshot);
}
