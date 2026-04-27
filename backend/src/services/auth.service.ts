import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { queueEmail } from "./email.service.js";
import type { PlanTier } from "../lib/domainTypes.js";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  planTier: PlanTier;
}

const passwordResetTtlMs = 30 * 60 * 1000;

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function createRandomResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
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
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}

export async function createPasswordResetRequest(input: { email: string }) {
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail(input.email) } });
  if (!user) {
    return { delivered: false as const, resetToken: undefined as string | undefined };
  }

  const resetToken = createRandomResetToken();
  const tokenHash = hashResetToken(resetToken);
  const expiresAt = new Date(Date.now() + passwordResetTtlMs);

  await prisma.$transaction(async (tx: any) => {
    await tx.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { userId: user.id, usedAt: null },
        ],
      },
    });

    await tx.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
  });

  const resetUrl = `${env.frontendAppUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await queueEmail({
    toEmail: user.email,
    subject: "Reset your SubnetOps password",
    templateKey: "password-reset",
    payload: { resetUrl },
  });

  return { delivered: true as const, resetToken };
}

export async function resetPassword(input: { token: string; newPassword: string }) {
  const tokenHash = hashResetToken(input.token);
  const passwordHash = await hashPassword(input.newPassword);
  const now = new Date();

  await prisma.$transaction(async (tx: any) => {
    const resetToken = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= now.getTime()) {
      throw new ApiError(400, "Reset token is invalid or expired");
    }

    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) {
      throw new ApiError(400, "Reset token is invalid or expired");
    }

    await tx.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
  });
}

export async function getSafeUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, planTier: true, createdAt: true },
  });
}
