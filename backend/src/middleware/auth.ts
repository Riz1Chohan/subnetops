import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError.js";
import { validateSessionToken } from "../services/auth.service.js";

function requestIp(req: Request) {
  return req.ip || req.socket.remoteAddress || null;
}

function requestUserAgent(req: Request) {
  const value = req.headers["user-agent"];
  return Array.isArray(value) ? value.join(" ") : value || null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.subnetops_token;
  if (!token) {
    return next(new ApiError(401, "Unauthorized"));
  }

  try {
    const payload = await validateSessionToken(token, { ipAddress: requestIp(req), userAgent: requestUserAgent(req) });
    req.user = {
      id: payload.sub,
      email: payload.email,
      planTier: payload.planTier as "FREE" | "PAID",
      sessionId: payload.sid,
      tokenVersion: payload.tokenVersion,
    };
    return next();
  } catch (error) {
    return next(error instanceof ApiError ? error : new ApiError(401, "Invalid or expired session"));
  }
}
