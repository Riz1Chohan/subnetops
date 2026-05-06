import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as controller from "../controllers/projectWatch.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/:projectId", asyncHandler(controller.listWatchers));
router.post("/:projectId", asyncHandler(controller.watchProject));
router.delete("/:projectId", asyncHandler(controller.unwatchProject));

export default router;
