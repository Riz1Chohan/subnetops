import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
function normalizedEmail(email) {
    return email.trim().toLowerCase();
}
export async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export function signToken(payload) {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}
export function verifyToken(token) {
    return jwt.verify(token, env.jwtSecret);
}
export function signPasswordResetToken(user) {
    return jwt.sign({ sub: user.id, purpose: "password-reset", email: user.email }, env.jwtSecret, { expiresIn: "30m" });
}
export function verifyPasswordResetToken(token) {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.purpose !== "password-reset") {
        throw new ApiError(400, "Reset token is invalid or expired");
    }
    return payload;
}
export async function registerUser(input) {
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
export async function loginUser(input) {
    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail(input.email) },
    });
    if (!user)
        return null;
    const passwordValid = await verifyPassword(input.password, user.passwordHash);
    if (!passwordValid)
        return null;
    return user;
}
export async function changePassword(input) {
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
export async function createPasswordResetRequest(input) {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail(input.email) } });
    if (!user) {
        return { delivered: false, resetToken: undefined };
    }
    const resetToken = signPasswordResetToken({ id: user.id, email: user.email });
    return { delivered: true, resetToken };
}
export async function resetPassword(input) {
    const payload = verifyPasswordResetToken(input.token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || normalizedEmail(user.email) != normalizedEmail(payload.email)) {
        throw new ApiError(400, "Reset token is invalid or expired");
    }
    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}
export async function getSafeUser(userId) {
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
