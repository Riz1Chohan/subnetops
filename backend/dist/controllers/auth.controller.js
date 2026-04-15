import { ApiError } from "../utils/apiError.js";
import { changePasswordSchema, loginSchema, registerSchema, requestPasswordResetSchema, resetPasswordSchema, } from "../validators/auth.schemas.js";
import { changePassword, createPasswordResetRequest, getSafeUser, loginUser, registerUser, resetPassword, signToken, } from "../services/auth.service.js";
function authCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";
    const sameSite = isProduction ? "none" : "lax";
    return {
        httpOnly: true,
        sameSite,
        secure: isProduction,
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };
}
function setAuthCookie(res, token) {
    res.cookie("subnetops_token", token, authCookieOptions());
}
function clearAuthCookie(res) {
    res.clearCookie("subnetops_token", {
        ...authCookieOptions(),
        maxAge: 0,
    });
}
export async function register(req, res) {
    const data = registerSchema.parse(req.body);
    const user = await registerUser(data);
    const token = signToken({ sub: user.id, email: user.email, planTier: user.planTier });
    setAuthCookie(res, token);
    const safeUser = await getSafeUser(user.id);
    res.status(201).json({ user: safeUser });
}
export async function login(req, res) {
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
export async function logout(_req, res) {
    clearAuthCookie(res);
    res.status(204).send();
}
export async function me(req, res) {
    if (!req.user?.id) {
        throw new ApiError(401, "Unauthorized");
    }
    const safeUser = await getSafeUser(req.user.id);
    res.json({ user: safeUser });
}
export async function changePasswordHandler(req, res) {
    if (!req.user?.id) {
        throw new ApiError(401, "Unauthorized");
    }
    const data = changePasswordSchema.parse(req.body);
    await changePassword({ userId: req.user.id, ...data });
    clearAuthCookie(res);
    res.json({ message: "Password changed successfully. Please sign in again." });
}
export async function requestPasswordReset(req, res) {
    const data = requestPasswordResetSchema.parse(req.body);
    const result = await createPasswordResetRequest(data);
    const response = {
        message: "If an account exists for that email, reset instructions are ready.",
    };
    if (process.env.NODE_ENV !== "production" && result.resetToken) {
        response.resetToken = result.resetToken;
    }
    res.json(response);
}
export async function resetPasswordHandler(req, res) {
    const data = resetPasswordSchema.parse(req.body);
    await resetPassword(data);
    clearAuthCookie(res);
    res.json({ message: "Password reset successfully. Please sign in with your new password." });
}
