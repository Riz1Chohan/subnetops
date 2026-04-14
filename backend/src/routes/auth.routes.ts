import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));
router.get("/me", requireAuth, asyncHandler(authController.me));
router.post("/change-password", requireAuth, asyncHandler(authController.changePasswordHandler));
router.post("/request-password-reset", asyncHandler(authController.requestPasswordReset));
router.post("/reset-password", asyncHandler(authController.resetPasswordHandler));

export default router;
