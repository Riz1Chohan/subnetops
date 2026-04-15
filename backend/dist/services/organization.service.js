import crypto from "node:crypto";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { listEmailOutbox as listQueuedEmails, queueEmail } from "./email.service.js";
import { createNotification } from "./notification.service.js";
function slugify(value) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function requireMembership(userId, organizationId) {
    const membership = await prisma.membership.findFirst({ where: { userId, organizationId } });
    if (!membership)
        throw new ApiError(403, "You are not a member of this organization.");
    return membership;
}
async function ensureOrgAdmin(userId, organizationId) {
    const membership = await requireMembership(userId, organizationId);
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
        throw new ApiError(403, "You do not have permission to manage this organization.");
    }
    return membership;
}
async function ensureOrgOwner(userId, organizationId) {
    const membership = await requireMembership(userId, organizationId);
    if (membership.role !== "OWNER") {
        throw new ApiError(403, "Only an owner can perform that action.");
    }
    return membership;
}
export async function listOrganizations(userId) {
    const memberships = await prisma.membership.findMany({
        where: { userId },
        include: { organization: true },
        orderBy: { createdAt: "asc" },
    });
    return memberships.map((membership) => ({ ...membership.organization, role: membership.role }));
}
export async function createOrganization(userId, name) {
    const slug = slugify(name);
    if (!slug)
        throw new ApiError(400, "Invalid organization name");
    return prisma.organization.create({
        data: {
            name,
            slug,
            memberships: { create: { userId, role: "OWNER" } },
        },
    });
}
export async function listMembers(userId, organizationId) {
    await requireMembership(userId, organizationId);
    return prisma.membership.findMany({
        where: { organizationId },
        include: { user: { select: { id: true, email: true, fullName: true } } },
        orderBy: { createdAt: "asc" },
    });
}
export async function listInvitations(userId, organizationId) {
    await ensureOrgAdmin(userId, organizationId);
    return prisma.orgInvitation.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}
export async function createInvitation(userId, organizationId, email, role) {
    await ensureOrgAdmin(userId, organizationId);
    const normalizedEmail = email.toLowerCase().trim();
    const token = crypto.randomUUID();
    const invite = await prisma.orgInvitation.create({ data: { organizationId, email: normalizedEmail, role, token } });
    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    await queueEmail({
        toEmail: normalizedEmail,
        subject: `You were invited to ${organization?.name || "an organization"} on SubnetOps`,
        templateKey: "org-invite",
        payload: { organizationId, organizationName: organization?.name, token, role },
    });
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } }).catch(() => null);
    if (existingUser) {
        await createNotification({
            userId: existingUser.id,
            type: "INVITE",
            title: "Organization invitation",
            message: `You were invited to join ${organization?.name || "an organization"} as ${role}.`,
            link: "/dashboard",
        });
    }
    return invite;
}
export async function listMyInvitations(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new ApiError(404, "User not found");
    return prisma.orgInvitation.findMany({
        where: { email: user.email.toLowerCase(), status: "PENDING" },
        include: { organization: true },
        orderBy: { createdAt: "desc" },
    });
}
export async function acceptInvitation(userId, token) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new ApiError(404, "User not found");
    const invitation = await prisma.orgInvitation.findUnique({ where: { token } });
    if (!invitation || invitation.status !== "PENDING")
        throw new ApiError(404, "Invitation not found or no longer available.");
    if (invitation.email.toLowerCase() !== user.email.toLowerCase())
        throw new ApiError(403, "This invitation does not match your account email.");
    await prisma.membership.upsert({
        where: { userId_organizationId: { userId, organizationId: invitation.organizationId } },
        update: { role: invitation.role },
        create: { userId, organizationId: invitation.organizationId, role: invitation.role },
    });
    return prisma.orgInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
}
export async function updateMemberRole(userId, organizationId, membershipId, role) {
    const actingMembership = await ensureOrgAdmin(userId, organizationId);
    const target = await prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
    if (!target)
        throw new ApiError(404, "Member not found");
    if (role === "OWNER" && actingMembership.role !== "OWNER") {
        throw new ApiError(403, "Only an owner can promote another owner.");
    }
    return prisma.membership.update({ where: { id: membershipId }, data: { role } });
}
export async function removeMember(userId, organizationId, membershipId) {
    const actingMembership = await ensureOrgAdmin(userId, organizationId);
    const target = await prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
    if (!target)
        throw new ApiError(404, "Member not found");
    if (actingMembership.role !== "OWNER" && target.role === "OWNER") {
        throw new ApiError(403, "Only an owner can remove another owner.");
    }
    if (actingMembership.id === target.id) {
        throw new ApiError(400, "Use ownership transfer before removing yourself.");
    }
    return prisma.membership.delete({ where: { id: membershipId } });
}
export async function revokeInvitation(userId, organizationId, invitationId) {
    await ensureOrgAdmin(userId, organizationId);
    const invitation = await prisma.orgInvitation.findFirst({ where: { id: invitationId, organizationId } });
    if (!invitation)
        throw new ApiError(404, "Invitation not found");
    return prisma.orgInvitation.update({ where: { id: invitationId }, data: { status: "REVOKED" } });
}
export async function transferOwnership(userId, organizationId, membershipId) {
    const currentOwner = await ensureOrgOwner(userId, organizationId);
    const target = await prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
    if (!target)
        throw new ApiError(404, "Target member not found");
    await prisma.membership.update({ where: { id: currentOwner.id }, data: { role: "ADMIN" } });
    return prisma.membership.update({ where: { id: membershipId }, data: { role: "OWNER" } });
}
export async function listEmailOutbox(userId, organizationId) {
    await ensureOrgAdmin(userId, organizationId);
    const items = await listQueuedEmails(50);
    return items.filter((item) => (item.payloadJson || "").includes(organizationId));
}
