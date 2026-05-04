import type { PlanTier } from "../lib/domainTypes.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { addChangeLog } from "./changeLog.service.js";
import { ensureCanEditProject } from "./access.service.js";
import { collectVlanAddressingValidationMessages } from "../validators/addressingTrust.schemas.js";

function assertVlanAddressingWritable(candidate: { subnetCidr?: unknown; gatewayIp?: unknown; segmentRole?: unknown; vlanName?: unknown; purpose?: unknown; department?: unknown; notes?: unknown }) {
  const messages = collectVlanAddressingValidationMessages(candidate);
  if (messages.length > 0) {
    throw new ApiError(400, `VLAN addressing failed engineering validation: ${messages.join(" ")}`);
  }
}

export async function createVlan(userId: string, planTier: PlanTier, data: { siteId: string; vlanId: number; vlanName: string; purpose?: string; segmentRole?: string; subnetCidr: string; gatewayIp: string; dhcpEnabled: boolean; estimatedHosts?: number; department?: string; notes?: string }, actorLabel?: string) {
  const site = await prisma.site.findFirst({ where: { id: data.siteId }, include: { project: true } });
  if (!site) throw new ApiError(404, "Site not found");
  await ensureCanEditProject(userId, site.projectId);
  assertVlanAddressingWritable(data);

  if (planTier === "FREE") {
    const vlanCount = await prisma.vlan.count({ where: { site: { projectId: site.projectId } } });
    if (vlanCount >= 15) throw new ApiError(403, "Free plan limit reached: up to 15 VLANs per project allowed.");
  }

  return prisma.$transaction(async (tx: any) => {
    const vlan = await tx.vlan.create({ data });
    await addChangeLog(site.projectId, `VLAN created: ${vlan.vlanId} ${vlan.vlanName}`, actorLabel, tx);
    return vlan;
  });
}

export async function updateVlan(vlanId: string, userId: string, data: Record<string, unknown>, actorLabel?: string) {
  const vlan = await prisma.vlan.findFirst({ where: { id: vlanId }, include: { site: true } });
  if (!vlan) throw new ApiError(404, "VLAN not found");
  await ensureCanEditProject(userId, vlan.site.projectId);
  const merged = {
    subnetCidr: vlan.subnetCidr,
    gatewayIp: vlan.gatewayIp,
    segmentRole: vlan.segmentRole,
    vlanName: vlan.vlanName,
    purpose: vlan.purpose,
    department: vlan.department,
    notes: vlan.notes,
    ...data,
  };
  assertVlanAddressingWritable(merged);

  return prisma.$transaction(async (tx: any) => {
    const updated = await tx.vlan.update({ where: { id: vlanId }, data });
    await addChangeLog(vlan.site.projectId, `VLAN updated: ${updated.vlanId} ${updated.vlanName}`, actorLabel, tx);
    return updated;
  });
}

export async function deleteVlan(vlanId: string, userId: string, actorLabel?: string) {
  const vlan = await prisma.vlan.findFirst({ where: { id: vlanId }, include: { site: true } });
  if (!vlan) throw new ApiError(404, "VLAN not found");
  await ensureCanEditProject(userId, vlan.site.projectId);

  return prisma.$transaction(async (tx: any) => {
    const deleted = await tx.vlan.delete({ where: { id: vlanId } });
    await addChangeLog(vlan.site.projectId, `VLAN deleted: ${deleted.vlanId} ${deleted.vlanName}`, actorLabel, tx);
    return deleted;
  });
}
