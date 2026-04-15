import { z } from "zod";
const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be 100 characters or less");
export const registerSchema = z.object({
    fullName: z.preprocess((value) => {
        if (typeof value !== "string")
            return value;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : undefined;
    }, z.string().max(100).optional()),
    email: z.string().trim().email(),
    password: passwordSchema,
});
export const loginSchema = z.object({
    email: z.string().trim().email(),
    password: passwordSchema,
});
export const changePasswordSchema = z.object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
}).refine((value) => value.currentPassword !== value.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current password",
});
export const requestPasswordResetSchema = z.object({
    email: z.string().trim().email(),
});
export const resetPasswordSchema = z.object({
    token: z.string().min(20, "Reset token is invalid"),
    newPassword: passwordSchema,
});
