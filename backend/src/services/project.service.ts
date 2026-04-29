import type { PlanTier } from "../lib/domainTypes.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { addChangeLog } from "./changeLog.service.js";
import { materializeRequirementsForProject } from "./requirementsMaterialization.service.js";
import { canEditProject, ensureCanEditProject, ensureCanViewProject, ensureOrganizationAssignable } from "./access.service.js";

type TemplateKey = "small-office" | "branch-office" | "clinic-starter";

async function enforceProjectLimit(userId: string, planTier: PlanTier) {
  if (planTier === "FREE") {
    const projectCount = await prisma.project.count({ where: { userId } });
    if (projectCount >= 2) {
      throw new ApiError(403, "Free plan limit reached: up to 2 projects allowed.");
    }
  }
}

export async function listProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId },
        { organization: { memberships: { some: { userId } } } },
      ],
    },
    include: { comments: { select: { dueDate: true, taskStatus: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return Promise.all(projects.map(async (project: any) => ({
    ...project,
    canEdit: await canEditProject(userId, project.id),
    taskSummary: {
      open: project.comments.filter((comment: any) => comment.taskStatus !== "DONE").length,
      overdue: project.comments.filter((comment: any) => comment.dueDate && comment.taskStatus !== "DONE" && new Date(comment.dueDate).getTime() < Date.now()).length,
    },
  })));
}

export async function createProject(
  userId: string,
  planTier: PlanTier,
  data: {
    name: string;
    description?: string;
    organizationName?: string;
    organizationId?: string;
    environmentType?: string;
    basePrivateRange?: string;
    logoUrl?: string;
    reportHeader?: string;
    reportFooter?: string;
    approvalStatus?: "DRAFT" | "IN_REVIEW" | "APPROVED";
    reviewerNotes?: string;
    requirementsJson?: string;
    discoveryJson?: string;
    platformProfileJson?: string;
  },
  actorLabel?: string,
) {
  await enforceProjectLimit(userId, planTier);
  const organizationId = await ensureOrganizationAssignable(userId, data.organizationId || null);

  return prisma.$transaction(async (tx: any) => {
    const project = await tx.project.create({
      data: { userId, ...data, organizationId: organizationId || undefined },
    });

    const requirementsMaterialization = data.requirementsJson
      ? await materializeRequirementsForProject(tx, project.id, actorLabel)
      : null;
    await addChangeLog(project.id, `Project created: ${project.name}`, actorLabel, tx);
    return { ...project, requirementsMaterialization };
  });
}

export async function createProjectFromTemplate(
  userId: string,
  planTier: PlanTier,
  templateKey: TemplateKey,
  customName?: string,
  actorLabel?: string,
) {
  await enforceProjectLimit(userId, planTier);

  const templateMap: Record<TemplateKey, { name: string; description: string; organizationName: string; environmentType: string; basePrivateRange: string; sites: Array<{ name: string; location: string; siteCode: string; defaultAddressBlock: string; vlans: Array<{ vlanId: number; vlanName: string; subnetCidr: string; gatewayIp: string; dhcpEnabled: boolean; estimatedHosts: number; purpose: string; }>; }>; }> = {
    "small-office": { name: "Small Office Template", description: "Starter layout for a small office with admin, guest, and servers.", organizationName: "Template", environmentType: "office", basePrivateRange: "10.10.0.0/16", sites: [{ name: "HQ", location: "Main Office", siteCode: "HQ", defaultAddressBlock: "10.10.0.0/16", vlans: [
      { vlanId: 10, vlanName: "ADMIN", subnetCidr: "10.10.10.0/24", gatewayIp: "10.10.10.1", dhcpEnabled: true, estimatedHosts: 40, purpose: "Administrative devices" },
      { vlanId: 30, vlanName: "GUEST", subnetCidr: "10.10.30.0/24", gatewayIp: "10.10.30.1", dhcpEnabled: true, estimatedHosts: 60, purpose: "Guest access" },
      { vlanId: 50, vlanName: "SERVERS", subnetCidr: "10.10.50.0/24", gatewayIp: "10.10.50.1", dhcpEnabled: false, estimatedHosts: 20, purpose: "Server VLAN" },
    ] }] },
    "branch-office": { name: "Branch Office Template", description: "Hub and branch starter layout with admin, voice, and management segmentation.", organizationName: "Template", environmentType: "branch", basePrivateRange: "10.20.0.0/16", sites: [
      { name: "HQ", location: "Core Site", siteCode: "HQ", defaultAddressBlock: "10.20.0.0/16", vlans: [
        { vlanId: 10, vlanName: "ADMIN", subnetCidr: "10.20.10.0/24", gatewayIp: "10.20.10.1", dhcpEnabled: true, estimatedHosts: 50, purpose: "Administrative users" },
        { vlanId: 60, vlanName: "VOICE", subnetCidr: "10.20.60.0/24", gatewayIp: "10.20.60.1", dhcpEnabled: true, estimatedHosts: 40, purpose: "IP phones" },
        { vlanId: 90, vlanName: "MANAGEMENT", subnetCidr: "10.20.90.0/24", gatewayIp: "10.20.90.1", dhcpEnabled: false, estimatedHosts: 20, purpose: "Management devices" },
      ] },
      { name: "Branch 1", location: "Remote Branch", siteCode: "BR1", defaultAddressBlock: "10.21.0.0/16", vlans: [
        { vlanId: 10, vlanName: "ADMIN", subnetCidr: "10.21.10.0/24", gatewayIp: "10.21.10.1", dhcpEnabled: true, estimatedHosts: 30, purpose: "Administrative users" },
        { vlanId: 30, vlanName: "GUEST", subnetCidr: "10.21.30.0/24", gatewayIp: "10.21.30.1", dhcpEnabled: true, estimatedHosts: 40, purpose: "Guest access" },
      ] },
    ] },
    "clinic-starter": { name: "Clinic Starter Template", description: "Healthcare-focused template with admin, clinical, guest, and management VLANs.", organizationName: "Template", environmentType: "clinic", basePrivateRange: "10.30.0.0/16", sites: [{ name: "Clinic", location: "Primary Site", siteCode: "CLN", defaultAddressBlock: "10.30.0.0/16", vlans: [
      { vlanId: 10, vlanName: "ADMIN", subnetCidr: "10.30.10.0/24", gatewayIp: "10.30.10.1", dhcpEnabled: true, estimatedHosts: 30, purpose: "Administrative devices" },
      { vlanId: 20, vlanName: "CLINICAL", subnetCidr: "10.30.20.0/24", gatewayIp: "10.30.20.1", dhcpEnabled: true, estimatedHosts: 80, purpose: "Clinical devices" },
      { vlanId: 30, vlanName: "GUEST", subnetCidr: "10.30.30.0/24", gatewayIp: "10.30.30.1", dhcpEnabled: true, estimatedHosts: 40, purpose: "Guest access" },
      { vlanId: 90, vlanName: "MANAGEMENT", subnetCidr: "10.30.90.0/24", gatewayIp: "10.30.90.1", dhcpEnabled: false, estimatedHosts: 20, purpose: "Managed systems" },
    ] }] },
  };

  const template = templateMap[templateKey];
  if (!template) throw new ApiError(404, "Template not found");

  const project = await prisma.$transaction(async (tx: any) => {
    const createdProject = await tx.project.create({
      data: {
        userId,
        name: customName?.trim() || template.name,
        description: template.description,
        organizationName: template.organizationName,
        environmentType: template.environmentType,
        basePrivateRange: template.basePrivateRange,
      },
    });

    for (const siteTemplate of template.sites) {
      const site = await tx.site.create({ data: { projectId: createdProject.id, name: siteTemplate.name, location: siteTemplate.location, siteCode: siteTemplate.siteCode, defaultAddressBlock: siteTemplate.defaultAddressBlock } });
      await tx.vlan.createMany({ data: siteTemplate.vlans.map((vlan: any) => ({ siteId: site.id, ...vlan })) });
    }

    await addChangeLog(createdProject.id, `Project created from template: ${template.name}`, actorLabel, tx);
    return createdProject;
  });

  return getProject(project.id, userId);
}

export async function duplicateProject(userId: string, planTier: PlanTier, sourceProjectId: string, actorLabel?: string) {
  await enforceProjectLimit(userId, planTier);

  const source = await prisma.project.findFirst({
    where: {
      id: sourceProjectId,
      OR: [{ userId }, { organization: { memberships: { some: { userId } } } }],
    },
    include: { sites: { include: { vlans: true } } },
  });
  if (!source) throw new ApiError(404, "Source project not found");

  const newProject = await prisma.$transaction(async (tx: any) => {
    const createdProject = await tx.project.create({
      data: {
        userId,
        organizationId: source.organizationId,
        name: `${source.name} Copy`,
        description: source.description,
        organizationName: source.organizationName,
        environmentType: source.environmentType,
        basePrivateRange: source.basePrivateRange,
        logoUrl: source.logoUrl,
        reportHeader: source.reportHeader,
        reportFooter: source.reportFooter,
        approvalStatus: source.approvalStatus,
        reviewerNotes: source.reviewerNotes,
        requirementsJson: source.requirementsJson,
        discoveryJson: source.discoveryJson,
        platformProfileJson: source.platformProfileJson,
      },
    });

    for (const sourceSite of source.sites) {
      const newSite = await tx.site.create({
        data: {
          projectId: createdProject.id,
          name: sourceSite.name,
          location: sourceSite.location,
          siteCode: sourceSite.siteCode,
          notes: sourceSite.notes,
          defaultAddressBlock: sourceSite.defaultAddressBlock,
        },
      });

      if (sourceSite.vlans.length > 0) {
        await tx.vlan.createMany({
          data: sourceSite.vlans.map((vlan: any) => ({ siteId: newSite.id, vlanId: vlan.vlanId, vlanName: vlan.vlanName, purpose: vlan.purpose, segmentRole: vlan.segmentRole, subnetCidr: vlan.subnetCidr, gatewayIp: vlan.gatewayIp, dhcpEnabled: vlan.dhcpEnabled, estimatedHosts: vlan.estimatedHosts, department: vlan.department, notes: vlan.notes })),
        });
      }
    }

    await addChangeLog(createdProject.id, `Project duplicated from ${source.name}`, actorLabel, tx);
    return createdProject;
  });

  return getProject(newProject.id, userId);
}

export async function getProject(projectId: string, userId: string) {
  await ensureCanViewProject(userId, projectId);
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    include: {
      sites: { include: { vlans: { orderBy: { vlanId: "asc" } } }, orderBy: { createdAt: "asc" } },
      changeLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!project) return null;
  return { ...project, canEdit: await canEditProject(userId, projectId) };
}

export async function getProjectSites(projectId: string, userId: string) {
  await ensureCanViewProject(userId, projectId);
  const project = await prisma.project.findFirst({ where: { id: projectId }, select: { sites: { orderBy: { createdAt: "asc" } } } });
  return project?.sites ?? [];
}

export async function getProjectVlans(projectId: string, userId: string) {
  await ensureCanViewProject(userId, projectId);
  return prisma.vlan.findMany({
    where: { site: { projectId } },
    include: { site: { select: { id: true, name: true, siteCode: true } } },
    orderBy: [{ site: { name: "asc" } }, { vlanId: "asc" }],
  });
}

export async function updateProject(projectId: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  const project = await ensureCanEditProject(userId, projectId);
  const organizationId = await ensureOrganizationAssignable(userId, (data.organizationId as string | undefined) || project.organizationId || null);
  const normalizedData: Record<string, unknown> = { ...data, organizationId: organizationId || undefined };
  return prisma.$transaction(async (tx: any) => {
    const result = await tx.project.updateMany({ where: { id: projectId }, data: normalizedData });
    const requirementsMaterialization = typeof normalizedData["requirementsJson"] === "string"
      ? await materializeRequirementsForProject(tx, projectId, actorLabel)
      : null;
    await addChangeLog(projectId, `Project settings updated`, actorLabel, tx);
    return { ...result, requirementsMaterialization };
  });
}

export async function deleteProject(projectId: string, userId: string) {
  await ensureCanEditProject(userId, projectId);
  return prisma.project.deleteMany({ where: { id: projectId } });
}
