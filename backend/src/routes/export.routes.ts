import { Router } from "express";
import * as exportController from "../controllers/export.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/projects/:projectId/csv", asyncHandler(exportController.exportCsv));
router.get("/projects/:projectId/pdf", asyncHandler(exportController.exportPdf));
router.get("/projects/:projectId/docx", asyncHandler(exportController.exportDocx));

export default router;
