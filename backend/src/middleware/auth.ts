import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError.js";
import { verifyToken } from "../services/auth.service.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.subnetops_token;
  if (!token) {
    return next(new ApiError(401, "Unauthorized"));
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      planTier: payload.planTier,
    };
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired session"));
  }
}
