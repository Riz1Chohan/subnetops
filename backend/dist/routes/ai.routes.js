import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as aiController from "../controllers/ai.controller.js";
const router = Router();
router.use(requireAuth);
router.post("/plan-draft", asyncHandler(aiController.generateDraft));
router.post("/explain-validation", asyncHandler(aiController.explainValidation));
export default router;
