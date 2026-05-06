import { Router } from "express";
import * as exportController from "../controllers/export.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { exportRateLimit } from "../middleware/rateLimit.js";

const router = Router();

router.use(requireAuth);
<<<<<<< HEAD
router.get("/projects/:projectId/json", exportRateLimit, asyncHandler(exportController.exportJson));
=======
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
router.get("/projects/:projectId/csv", exportRateLimit, asyncHandler(exportController.exportCsv));
router.post("/projects/:projectId/csv", exportRateLimit, asyncHandler(exportController.exportCsv));
router.get("/projects/:projectId/pdf", exportRateLimit, asyncHandler(exportController.exportPdf));
router.post("/projects/:projectId/pdf", exportRateLimit, asyncHandler(exportController.exportPdf));
router.get("/projects/:projectId/docx", exportRateLimit, asyncHandler(exportController.exportDocx));
router.post("/projects/:projectId/docx", exportRateLimit, asyncHandler(exportController.exportDocx));

export default router;
