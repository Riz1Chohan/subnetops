import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { queueEmail } from "./email.service.js";
import { recordSecurityAuditEvent } from "./securityAudit.service.js";
import type { PlanTier } from "../lib/domainTypes.js";
import {
  buildSessionClaims,
  normalizeTokenVersion,
  sessionExpiresAt,
  shouldAcceptSession,
  type AuthTokenClaims,
  type SecurityAuditEventInput,
} from "../domain/security/index.js";

export interface AuthTokenPayload extends AuthTokenClaims {
  planTier: PlanTier | string;
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

function userTokenVersion(user: { tokenVersion?: number | null }) {
  return normalizeTokenVersion(user.tokenVersion);
}

function newSessionId() {
  return crypto.randomUUID();
}

function hashSessionToken(token: string) {
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

export async function createAuthSessionForUser(input: {
  user: { id: string; email: string; planTier: PlanTier | string; tokenVersion?: number | null };
  ipAddress?: string | null;
  userAgent?: string | null;
  audit?: Omit<SecurityAuditEventInput, "actorUserId" | "targetType" | "targetId" | "outcome"> & { outcome?: SecurityAuditEventInput["outcome"] };
}) {
  const sessionId = newSessionId();
  const claims = buildSessionClaims({
    userId: input.user.id,
    email: input.user.email,
    planTier: input.user.planTier,
    sessionId,
    tokenVersion: userTokenVersion(input.user),
  });
  const token = signToken(claims as AuthTokenPayload);
  const tokenHash = hashSessionToken(token);
  const expiresAt = sessionExpiresAt();

  await (prisma as any).authSession.create({
    data: {
      id: sessionId,
      userId: input.user.id,
      tokenHash,
      expiresAt,
      ipAddress: input.ipAddress || undefined,
      userAgent: input.userAgent || undefined,
      lastSeenAt: new Date(),
    },
  });

  await recordSecurityAuditEvent({
    action: input.audit?.action || "auth.login",
    outcome: input.audit?.outcome || "created",
    actorUserId: input.user.id,
    targetType: "session",
    targetId: sessionId,
    ipAddress: input.ipAddress || null,
    userAgent: input.userAgent || null,
    detail: { email: input.user.email, ...(input.audit?.detail || {}) },
  });

  return { token, sessionId, expiresAt };
}

export async function validateSessionToken(token: string, requestMeta?: { ipAddress?: string | null; userAgent?: string | null }) {
  const claims = verifyToken(token);
  const tokenHash = hashSessionToken(token);
  const [user, session] = await Promise.all([
    prisma.user.findUnique({ where: { id: claims.sub }, select: { id: true, email: true, planTier: true, tokenVersion: true, tokensInvalidBefore: true } as any }),
    (prisma as any).authSession.findUnique({ where: { id: claims.sid } }),
  ]);

  const result = shouldAcceptSession({ claims, tokenHash, user: user as any, session: session as any });
  if (!result.accepted) {
    await recordSecurityAuditEvent({
      action: "auth.session_rejected",
      outcome: "denied",
      actorUserId: claims.sub,
      targetType: "session",
      targetId: claims.sid,
      ipAddress: requestMeta?.ipAddress || null,
      userAgent: requestMeta?.userAgent || null,
      detail: { reason: result.reason },
    });
    throw new ApiError(401, "Invalid or expired session");
  }

  await (prisma as any).authSession.update({ where: { id: claims.sid }, data: { lastSeenAt: new Date() } }).catch(() => null);
  return claims;
}

export async function revokeAuthSession(input: { token: string; ipAddress?: string | null; userAgent?: string | null }) {
  let claims: AuthTokenPayload | null = null;
  try {
    claims = verifyToken(input.token);
  } catch {
    return false;
  }

  const updated = await (prisma as any).authSession.updateMany({
    where: { id: claims.sid, userId: claims.sub, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (updated.count > 0) {
    await recordSecurityAuditEvent({
      action: "auth.logout",
      outcome: "revoked",
      actorUserId: claims.sub,
      targetType: "session",
      targetId: claims.sid,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    });
  }

  return updated.count > 0;
}

export async function revokeAllUserSessions(input: { userId: string; reason: string; db?: any }) {
  const db = input.db || prisma;
  const now = new Date();
  await db.user.update({
    where: { id: input.userId },
    data: {
      tokenVersion: { increment: 1 },
      tokensInvalidBefore: now,
    },
  });
  await db.authSession.updateMany({
    where: { userId: input.userId, revokedAt: null },
    data: { revokedAt: now },
  });
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

  await recordSecurityAuditEvent({
    action: "auth.register",
    outcome: "created",
    actorUserId: user.id,
    targetType: "user",
    targetId: user.id,
    detail: { email },
  });

  return user;
}

export async function loginUser(input: { email: string; password: string }) {
  const email = normalizedEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    await recordSecurityAuditEvent({ action: "auth.login", outcome: "failed", targetType: "user", detail: { email, reason: "missing_user" } });
    return null;
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordValid) {
    await recordSecurityAuditEvent({ action: "auth.login", outcome: "failed", actorUserId: user.id, targetType: "user", targetId: user.id, detail: { email, reason: "bad_password" } });
    return null;
  }

  return user;
}

export async function changePassword(input: { userId: string; currentPassword: string; newPassword: string }) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw new ApiError(404, "Account not found");
  }

  const passwordValid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!passwordValid) {
    await recordSecurityAuditEvent({ action: "auth.password_change", outcome: "failed", actorUserId: user.id, targetType: "user", targetId: user.id, detail: { reason: "bad_current_password" } });
    throw new ApiError(400, "Current password is incorrect");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx: any) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await revokeAllUserSessions({ userId: user.id, reason: "password_change", db: tx });
    await recordSecurityAuditEvent({ action: "auth.password_change", outcome: "updated", actorUserId: user.id, targetType: "user", targetId: user.id, detail: { sessionsRevoked: true } }, tx);
  });
}

export async function createPasswordResetRequest(input: { email: string }) {
  const email = normalizedEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await recordSecurityAuditEvent({ action: "auth.password_reset_request", outcome: "failed", targetType: "user", detail: { email, reason: "missing_user" } });
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
    await recordSecurityAuditEvent({ action: "auth.password_reset_request", outcome: "created", actorUserId: user.id, targetType: "user", targetId: user.id }, tx);
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
    await revokeAllUserSessions({ userId: resetToken.userId, reason: "password_reset", db: tx });
    await recordSecurityAuditEvent({ action: "auth.password_reset_complete", outcome: "updated", actorUserId: resetToken.userId, targetType: "user", targetId: resetToken.userId, detail: { sessionsRevoked: true } }, tx);
  });
}

export async function getSafeUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, planTier: true, createdAt: true },
  });
}
