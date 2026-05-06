import type { Request, Response } from "express";
import { requireParam } from "../utils/request.js";
import { createSiteSchema, updateSiteSchema } from "../validators/site.schemas.js";
import * as siteService from "../services/site.service.js";
import { ApiError } from "../utils/apiError.js";

export async function createSite(req: Request, res: Response) {
  const userId = req.user?.id;
  const planTier = req.user?.planTier;
  if (!userId || !planTier) throw new ApiError(401, "Unauthorized");
  const data = createSiteSchema.parse(req.body);
  const site = await siteService.createSite(userId, planTier, data, req.user?.email);
  res.status(201).json(site);
}

export async function updateSite(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const data = updateSiteSchema.parse(req.body);
  const site = await siteService.updateSite(requireParam(req, "siteId"), userId, data, req.user?.email);
  res.json(site);
}

export async function deleteSite(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  await siteService.deleteSite(requireParam(req, "siteId"), userId, req.user?.email);
  res.status(204).send();
}
