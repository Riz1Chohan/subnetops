import crypto from "node:crypto";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { listEmailOutbox as listQueuedEmails, queueEmail } from "./email.service.js";
import { createNotification } from "./notification.service.js";
import { canManageOrganization, canTransferOrganizationOwnership } from "../domain/security/authorization.js";
import { recordSecurityAuditEvent } from "./securityAudit.service.js";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function sanitizeInvitation<T extends { token?: string }>(invitation: T | null) {
  if (!invitation) return invitation;
  const { token: _token, ...safeInvitation } = invitation as T & { token?: string };
  return safeInvitation;
}

function sanitizeInvitations<T extends { token?: string }>(invitations: T[]) {
  return invitations.map((invitation) => sanitizeInvitation(invitation));
}

async function requireMembership(userId: string, organizationId: string, db: any = prisma) {
  const membership = await db.membership.findFirst({ where: { userId, organizationId } });
  if (!membership) throw new ApiError(403, "You are not a member of this organization.");
  return membership;
}

async function ensureOrgAdmin(userId: string, organizationId: string, db: any = prisma) {
  const membership = await requireMembership(userId, organizationId, db);
  if (!canManageOrganization(membership.role)) throw new ApiError(403, "You do not have permission to manage this organization.");
  return membership;
}

async function ensureOrgOwner(userId: string, organizationId: string, db: any = prisma) {
  const membership = await requireMembership(userId, organizationId, db);
  if (!canTransferOrganizationOwnership(membership.role)) throw new ApiError(403, "Only an owner can perform that action.");
  return membership;
}

export async function listOrganizations(userId: string) {
  const memberships = await prisma.membership.findMany({ where: { userId }, include: { organization: true }, orderBy: { createdAt: "asc" } });
  return memberships.map((membership: any) => ({ ...membership.organization, role: membership.role }));
}

export async function createOrganization(userId: string, name: string) {
  const slug = slugify(name);
  if (!slug) throw new ApiError(400, "Invalid organization name");
  const organization = await prisma.organization.create({ data: { name, slug, memberships: { create: { userId, role: "OWNER" } } } });
  await recordSecurityAuditEvent({ action: "org.create", outcome: "created", actorUserId: userId, organizationId: organization.id, targetType: "organization", targetId: organization.id });
  return organization;
}

export async function listMembers(userId: string, organizationId: string) {
  await requireMembership(userId, organizationId);
  return prisma.membership.findMany({ where: { organizationId }, include: { user: { select: { id: true, email: true, fullName: true } } }, orderBy: { createdAt: "asc" } });
}

export async function listInvitations(userId: string, organizationId: string) {
  await ensureOrgAdmin(userId, organizationId);
  const invitations = await prisma.orgInvitation.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
  return sanitizeInvitations(invitations);
}

export async function createInvitation(userId: string, organizationId: string, email: string, role: "OWNER" | "ADMIN" | "MEMBER") {
  const actingMembership = await ensureOrgAdmin(userId, organizationId);
  if (role === "OWNER" && actingMembership.role !== "OWNER") throw new ApiError(403, "Only an owner can invite another owner.");
  const normalizedEmail = email.toLowerCase().trim();
  const token = crypto.randomUUID();
  const invite = await prisma.orgInvitation.create({ data: { organizationId, email: normalizedEmail, role, token, invitedByUserId: userId } });
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  await queueEmail({ toEmail: normalizedEmail, subject: `You were invited to ${organization?.name || "an organization"} on SubnetOps`, templateKey: "org-invite", payload: { organizationId, organizationName: organization?.name, token, role } });
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } }).catch(() => null);
  if (existingUser) await createNotification({ userId: existingUser.id, type: "INVITE", title: "Organization invitation", message: `You were invited to join ${organization?.name || "an organization"} as ${role}.`, link: "/dashboard" });
  await recordSecurityAuditEvent({ action: "org.invite", outcome: "created", actorUserId: userId, organizationId, targetType: "organization", targetId: organizationId, detail: { invitedEmail: normalizedEmail, role } });
  return sanitizeInvitation(invite);
}

export async function listMyInvitations(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");
  const invitations = await prisma.orgInvitation.findMany({ where: { email: user.email.toLowerCase(), status: "PENDING" }, include: { organization: true }, orderBy: { createdAt: "desc" } });
  return sanitizeInvitations(invitations);
}

export async function acceptInvitation(userId: string, token: string) {
  return prisma.$transaction(async (tx: any) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, "User not found");
    const invitation = await tx.orgInvitation.findUnique({ where: { token } });
    if (!invitation || invitation.status !== "PENDING") throw new ApiError(404, "Invitation not found or no longer available.");
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) throw new ApiError(403, "This invitation does not match your account email.");
    const claimed = await tx.orgInvitation.updateMany({ where: { id: invitation.id, status: "PENDING" }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    if (claimed.count !== 1) throw new ApiError(404, "Invitation not found or no longer available.");
    await tx.membership.upsert({ where: { userId_organizationId: { userId, organizationId: invitation.organizationId } }, update: { role: invitation.role }, create: { userId, organizationId: invitation.organizationId, role: invitation.role } });
    const acceptedInvitation = await tx.orgInvitation.findUnique({ where: { id: invitation.id } });
    return sanitizeInvitation(acceptedInvitation);
  });
}

export async function updateMemberRole(userId: string, organizationId: string, membershipId: string, role: "OWNER" | "ADMIN" | "MEMBER") {
  const actingMembership = await ensureOrgAdmin(userId, organizationId);
  const target = await prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
  if (!target) throw new ApiError(404, "Member not found");
  if (role === "OWNER" && actingMembership.role !== "OWNER") throw new ApiError(403, "Only an owner can promote another owner.");
  const updated = await prisma.membership.update({ where: { id: membershipId }, data: { role } });
  await recordSecurityAuditEvent({ action: "org.member_role_update", outcome: "updated", actorUserId: userId, organizationId, targetType: "user", targetId: updated.userId, detail: { role } });
  return updated;
}

export async function removeMember(userId: string, organizationId: string, membershipId: string) {
  const actingMembership = await ensureOrgAdmin(userId, organizationId);
  const target = await prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
  if (!target) throw new ApiError(404, "Member not found");
  if (actingMembership.role !== "OWNER" && target.role === "OWNER") throw new ApiError(403, "Only an owner can remove another owner.");
  if (actingMembership.id === target.id) throw new ApiError(400, "Use ownership transfer before removing yourself.");
  const removed = await prisma.membership.delete({ where: { id: membershipId } });
  await recordSecurityAuditEvent({ action: "org.member_remove", outcome: "updated", actorUserId: userId, organizationId, targetType: "user", targetId: removed.userId });
  return removed;
}

export async function revokeInvitation(userId: string, organizationId: string, invitationId: string) {
  await ensureOrgAdmin(userId, organizationId);
  const invitation = await prisma.orgInvitation.findFirst({ where: { id: invitationId, organizationId } });
  if (!invitation) throw new ApiError(404, "Invitation not found");
  const revokedInvitation = await prisma.orgInvitation.update({ where: { id: invitationId }, data: { status: "REVOKED" } });
  return sanitizeInvitation(revokedInvitation);
}

export async function transferOwnership(userId: string, organizationId: string, membershipId: string) {
  return prisma.$transaction(async (tx: any) => {
    const currentOwner = await ensureOrgOwner(userId, organizationId, tx);
    const target = await tx.membership.findFirst({ where: { id: membershipId, organizationId } });
    if (!target) throw new ApiError(404, "Target member not found");
    if (target.id === currentOwner.id) throw new ApiError(400, "Target member is already the owner.");
    await tx.membership.update({ where: { id: membershipId }, data: { role: "OWNER" } });
    await tx.membership.update({ where: { id: currentOwner.id }, data: { role: "ADMIN" } });
    const transferred = await tx.membership.findUnique({ where: { id: membershipId } });
    await recordSecurityAuditEvent({ action: "org.ownership_transfer", outcome: "updated", actorUserId: userId, organizationId, targetType: "user", targetId: target.userId }, tx);
    return transferred;
  });
}

export async function listEmailOutbox(userId: string, organizationId: string) {
  await ensureOrgAdmin(userId, organizationId);
  const items = await listQueuedEmails(50);
  return items.filter((item: any) => (item.payloadJson || "").includes(organizationId));
}
