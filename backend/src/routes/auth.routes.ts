import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit, passwordResetRateLimit } from "../middleware/rateLimit.js";

const router = Router();

router.get("/csrf", authController.csrfTokenHandler);
router.post("/register", authRateLimit, asyncHandler(authController.register));
router.post("/login", authRateLimit, asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));
router.get("/me", requireAuth, asyncHandler(authController.me));
router.post("/change-password", authRateLimit, requireAuth, asyncHandler(authController.changePasswordHandler));
router.post("/request-password-reset", passwordResetRateLimit, asyncHandler(authController.requestPasswordReset));
router.post("/reset-password", passwordResetRateLimit, asyncHandler(authController.resetPasswordHandler));

export default router;
