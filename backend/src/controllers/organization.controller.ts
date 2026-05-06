import type { Request, Response } from "express";
import { requireParam } from "../utils/request.js";
import { ApiError } from "../utils/apiError.js";
import * as organizationService from "../services/organization.service.js";

export async function listOrganizations(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const organizations = await organizationService.listOrganizations(userId);
  res.json(organizations);
}

export async function createOrganization(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const name = String(req.body?.name || "").trim();
  if (!name) throw new ApiError(400, "Organization name is required");
  const organization = await organizationService.createOrganization(userId, name);
  res.status(201).json(organization);
}

export async function listMembers(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const members = await organizationService.listMembers(userId, requireParam(req, "organizationId"));
  res.json(members);
}

export async function updateMemberRole(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const role = req.body?.role as "OWNER" | "ADMIN" | "MEMBER";
  const member = await organizationService.updateMemberRole(userId, requireParam(req, "organizationId"), requireParam(req, "membershipId"), role);
  res.json(member);
}

export async function removeMember(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  await organizationService.removeMember(userId, requireParam(req, "organizationId"), requireParam(req, "membershipId"));
  res.status(204).send();
}

export async function transferOwnership(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const member = await organizationService.transferOwnership(userId, requireParam(req, "organizationId"), requireParam(req, "membershipId"));
  res.json(member);
}

export async function listEmailOutbox(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const items = await organizationService.listEmailOutbox(userId, requireParam(req, "organizationId"));
  res.json(items);
}

export async function listInvitations(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const invites = await organizationService.listInvitations(userId, requireParam(req, "organizationId"));
  res.json(invites);
}

export async function createInvitation(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const email = String(req.body?.email || "").trim();
  const role = (req.body?.role || "MEMBER") as "OWNER" | "ADMIN" | "MEMBER";
  if (!email) throw new ApiError(400, "Invite email is required");
  const invite = await organizationService.createInvitation(userId, requireParam(req, "organizationId"), email, role);
  res.status(201).json(invite);
}

export async function revokeInvitation(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const invite = await organizationService.revokeInvitation(userId, requireParam(req, "organizationId"), requireParam(req, "invitationId"));
  res.json(invite);
}

export async function listMyInvitations(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const invites = await organizationService.listMyInvitations(userId);
  res.json(invites);
}

export async function acceptInvitation(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const invite = await organizationService.acceptInvitation(userId, requireParam(req, "token"));
  res.json(invite);
}
