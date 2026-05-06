import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as organizationController from "../controllers/organization.controller.js";

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(organizationController.listOrganizations));
router.post("/", asyncHandler(organizationController.createOrganization));
router.get("/my-invitations", asyncHandler(organizationController.listMyInvitations));
router.get("/:organizationId/members", asyncHandler(organizationController.listMembers));
router.patch("/:organizationId/members/:membershipId", asyncHandler(organizationController.updateMemberRole));
router.delete("/:organizationId/members/:membershipId", asyncHandler(organizationController.removeMember));
router.post("/:organizationId/members/:membershipId/transfer-ownership", asyncHandler(organizationController.transferOwnership));
router.get("/:organizationId/email-outbox", asyncHandler(organizationController.listEmailOutbox));
router.get("/:organizationId/invitations", asyncHandler(organizationController.listInvitations));
router.post("/:organizationId/invitations", asyncHandler(organizationController.createInvitation));
router.patch("/:organizationId/invitations/:invitationId/revoke", asyncHandler(organizationController.revokeInvitation));
router.post("/invitations/:token/accept", asyncHandler(organizationController.acceptInvitation));

export default router;
