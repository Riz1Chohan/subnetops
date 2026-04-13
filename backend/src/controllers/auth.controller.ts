import type { Request, Response } from "express";
import { ApiError } from "../utils/apiError.js";
import { loginSchema, registerSchema } from "../validators/auth.schemas.js";
import { getSafeUser, loginUser, registerUser, signToken } from "../services/auth.service.js";

function setAuthCookie(res: Response, token: string) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("subnetops_token", token, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function register(req: Request, res: Response) {
  const data = registerSchema.parse(req.body);
  const user = await registerUser(data);
  const token = signToken({ sub: user.id, email: user.email, planTier: user.planTier });
  setAuthCookie(res, token);

  const safeUser = await getSafeUser(user.id);
  res.status(201).json({ user: safeUser });
}

export async function login(req: Request, res: Response) {
  const data = loginSchema.parse(req.body);
  const user = await loginUser(data);
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signToken({ sub: user.id, email: user.email, planTier: user.planTier });
  setAuthCookie(res, token);

  const safeUser = await getSafeUser(user.id);
  res.json({ user: safeUser });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("subnetops_token");
  res.json({ message: "Logged out" });
}

export async function me(req: Request, res: Response) {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  const safeUser = await getSafeUser(req.user.id);
  res.json({ user: safeUser });
}
