import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError.js";
import { env } from "../config/env.js";

const CSRF_COOKIE_NAME = "subnetops_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfCookieOptions() {
  const isProduction = env.nodeEnv === "production";
  return {
    httpOnly: false,
    sameSite: isProduction ? "none" as const : "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function issueCsrfToken(res: Response) {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions());
  return token;
}

export function csrfTokenHandler(_req: Request, res: Response) {
  const token = issueCsrfToken(res);
  res.json({ csrfToken: token });
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerValue = req.header(CSRF_HEADER_NAME);
  const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new ApiError(403, "CSRF validation failed"));
  }

  return next();
}
