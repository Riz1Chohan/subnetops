import { Router } from "express";
import * as vlanController from "../controllers/vlan.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.post("/", asyncHandler(vlanController.createVlan));
router.patch("/:vlanId", asyncHandler(vlanController.updateVlan));
router.delete("/:vlanId", asyncHandler(vlanController.deleteVlan));

export default router;
