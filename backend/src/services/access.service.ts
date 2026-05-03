import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";

export async function getMembershipRole(userId: string, organizationId?: string | null) {
  if (!organizationId) return null;
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId },
  });
  return membership?.role ?? null;
}

export async function ensureCanViewProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { userId },
        { organization: { memberships: { some: { userId } } } },
      ],
    },
  });

  if (!project) throw new ApiError(404, "Project not found or access denied");
  return project;
}

export async function ensureCanEditProject(userId: string, projectId: string) {
  const owned = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (owned) return owned;

  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) throw new ApiError(404, "Project not found");

  const role = await getMembershipRole(userId, project.organizationId);
  if (role === "OWNER" || role === "ADMIN") {
    return project;
  }

  throw new ApiError(403, "You do not have edit access to this project.");
}

export async function canEditProject(userId: string, projectId: string) {
  const owned = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (owned) return true;

  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) return false;

  const role = await getMembershipRole(userId, project.organizationId);
  return role === "OWNER" || role === "ADMIN";
}

export async function ensureCanCommentOnProject(userId: string, projectId: string) {
  return ensureCanViewProject(userId, projectId);
}

export async function ensureOrganizationAssignable(userId: string, organizationId?: string | null) {
  if (!organizationId) return null;
  const role = await getMembershipRole(userId, organizationId);
  if (!role) {
    throw new ApiError(403, "You are not a member of that organization.");
  }
  return organizationId;
}
