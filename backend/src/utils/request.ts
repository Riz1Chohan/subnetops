import type { Request } from "express";
import { ApiError } from "./apiError.js";

export function requireParam(req: Request, key: string): string {
  const value = req.params?.[key];
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  throw new ApiError(400, `Missing route parameter: ${key}`);
}
