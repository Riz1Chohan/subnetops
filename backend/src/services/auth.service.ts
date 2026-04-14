import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import type { PlanTier } from "../lib/domainTypes.js";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  planTier: PlanTier;
}

interface PasswordResetTokenPayload {
  sub: string;
  purpose: "password-reset";
  email: string;
}

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}

export function signPasswordResetToken(user: { id: string; email: string }) {
  return jwt.sign(
    { sub: user.id, purpose: "password-reset", email: user.email } satisfies PasswordResetTokenPayload,
    env.jwtSecret,
    { expiresIn: "30m" },
  );
}

export function verifyPasswordResetToken(token: string) {
  const payload = jwt.verify(token, env.jwtSecret) as PasswordResetTokenPayload;
  if (payload.purpose !== "password-reset") {
    throw new ApiError(400, "Reset token is invalid or expired");
  }
  return payload;
}

export async function registerUser(input: { email: string; password: string; fullName?: string }) {
  const email = normalizedEmail(input.email);
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(409, "An account with that email already exists. Please log in instead.");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: input.fullName?.trim() || undefined,
    },
  });

  return user;
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail(input.email) },
  });

  if (!user) return null;

  const passwordValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordValid) return null;

  return user;
}

export async function changePassword(input: { userId: string; currentPassword: string; newPassword: string }) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw new ApiError(404, "Account not found");
  }

  const passwordValid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!passwordValid) {
    throw new ApiError(400, "Current password is incorrect");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
}

export async function createPasswordResetRequest(input: { email: string }) {
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail(input.email) } });
  if (!user) {
    return { delivered: false as const, resetToken: undefined as string | undefined };
  }

  const resetToken = signPasswordResetToken({ id: user.id, email: user.email });
  return { delivered: true as const, resetToken };
}

export async function resetPassword(input: { token: string; newPassword: string }) {
  const payload = verifyPasswordResetToken(input.token);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || normalizedEmail(user.email) != normalizedEmail(payload.email)) {
    throw new ApiError(400, "Reset token is invalid or expired");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}

export async function getSafeUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      planTier: true,
      createdAt: true,
    },
  });
}
