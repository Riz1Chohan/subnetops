import { Router } from "express";
import * as validationController from "../controllers/validation.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
router.use(requireAuth);
router.post("/projects/:projectId/run", asyncHandler(validationController.runValidation));
router.get("/projects/:projectId", asyncHandler(validationController.getValidationResults));
export default router;
