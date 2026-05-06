import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as controller from "../controllers/notificationPreference.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/", asyncHandler(controller.getPreferences));
router.patch("/", asyncHandler(controller.updatePreferences));

export default router;
