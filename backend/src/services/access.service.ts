import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { canEditProject as canEditProjectRole, canViewProject as canViewProjectRole } from "../domain/security/authorization.js";
import { recordSecurityAuditEvent } from "./securityAudit.service.js";

export async function getMembershipRole(userId: string, organizationId?: string | null) {
  if (!organizationId) return null;
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId },
  });
  return membership?.role ?? null;
}

function projectRoleForUser(project: { userId: string; organizationId?: string | null }, userId: string, membershipRole?: string | null) {
  if (project.userId === userId) return "PROJECT_OWNER";
  return membershipRole || "NONE";
}

export async function ensureCanViewProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) throw new ApiError(404, "Project not found or access denied");

  const membershipRole = await getMembershipRole(userId, project.organizationId);
  const role = projectRoleForUser(project, userId, membershipRole);
  if (canViewProjectRole(role)) return project;

  await recordSecurityAuditEvent({
    action: "project.read",
    outcome: "denied",
    actorUserId: userId,
    projectId,
    targetType: "project",
    targetId: projectId,
    detail: { reason: "missing_project_membership" },
  });
  throw new ApiError(404, "Project not found or access denied");
}

export async function ensureCanEditProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) throw new ApiError(404, "Project not found");

  const membershipRole = await getMembershipRole(userId, project.organizationId);
  const role = projectRoleForUser(project, userId, membershipRole);
  if (canEditProjectRole(role)) return project;

  await recordSecurityAuditEvent({
    action: "project.update",
    outcome: "denied",
    actorUserId: userId,
    projectId,
    targetType: "project",
    targetId: projectId,
    detail: { reason: "insufficient_project_role", role },
  });
  throw new ApiError(403, "You do not have edit access to this project.");
}

export async function canEditProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) return false;
  const membershipRole = await getMembershipRole(userId, project.organizationId);
  return canEditProjectRole(projectRoleForUser(project, userId, membershipRole));
}

export async function ensureCanCommentOnProject(userId: string, projectId: string) {
  return ensureCanViewProject(userId, projectId);
}

export async function ensureOrganizationAssignable(userId: string, organizationId?: string | null) {
  if (!organizationId) return null;
  const role = await getMembershipRole(userId, organizationId);
  if (!canViewProjectRole(role)) {
    await recordSecurityAuditEvent({
      action: "project.create",
      outcome: "denied",
      actorUserId: userId,
      organizationId,
      targetType: "organization",
      targetId: organizationId,
      detail: { reason: "missing_organization_membership" },
    });
    throw new ApiError(403, "You are not a member of that organization.");
  }
  return organizationId;
}
