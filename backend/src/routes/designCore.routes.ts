import { Router } from "express";
import * as designCoreController from "../controllers/designCore.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/projects/:projectId", asyncHandler(designCoreController.getDesignCoreSnapshot));

export default router;
