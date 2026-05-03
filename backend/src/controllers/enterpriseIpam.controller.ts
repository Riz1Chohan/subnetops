import type { Request, Response } from "express";
import { ApiError } from "../utils/apiError.js";
import { requireParam } from "../utils/request.js";
import * as enterpriseIpamService from "../services/enterpriseIpam.service.js";
import {
  allocationApprovalCreateSchema,
  allocationStatusSchema,
  brownfieldImportCreateSchema,
  brownfieldImportDryRunSchema,
  brownfieldConflictResolutionCreateSchema,
  brownfieldNetworkUpdateSchema,
  dhcpScopeCreateSchema,
  dhcpScopeUpdateSchema,
  ipAllocationCreateSchema,
  ipAllocationFromPlanSchema,
  ipAllocationUpdateSchema,
  ipPoolCreateSchema,
  ipPoolUpdateSchema,
  ipReservationCreateSchema,
  ipReservationUpdateSchema,
  routeDomainCreateSchema,
  routeDomainUpdateSchema,
} from "../validators/enterpriseIpam.schemas.js";

function requireUser(req: Request) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  return userId;
}

export async function getEnterpriseIpamSnapshot(req: Request, res: Response) {
  res.json(await enterpriseIpamService.getEnterpriseIpamSnapshot(requireParam(req, "projectId"), requireUser(req)));
}
export async function createRouteDomain(req: Request, res: Response) { res.status(201).json(await enterpriseIpamService.createRouteDomain(requireParam(req, "projectId"), requireUser(req), routeDomainCreateSchema.parse(req.body), req.user?.email)); }
export async function updateRouteDomain(req: Request, res: Response) { res.json(await enterpriseIpamService.updateRouteDomain(requireParam(req, "id"), requireUser(req), routeDomainUpdateSchema.parse(req.body), req.user?.email)); }
export async function deleteRouteDomain(req: Request, res: Response) { await enterpriseIpamService.deleteRouteDomain(requireParam(req, "id"), requireUser(req), req.user?.email); res.status(204).send(); }
export async function createIpPool(req: Request, res: Response) { res.status(201).json(await enterpriseIpamService.createIpPool(requireParam(req, "projectId"), requireUser(req), ipPoolCreateSchema.parse(req.body), req.user?.email)); }
export async function updateIpPool(req: Request, res: Response) { res.json(await enterpriseIpamService.updateIpPool(requireParam(req, "id"), requireUser(req), ipPoolUpdateSchema.parse(req.body), req.user?.email)); }
export async function deleteIpPool(req: Request, res: Response) { await enterpriseIpamService.deleteIpPool(requireParam(req, "id"), requireUser(req), req.user?.email); res.status(204).send(); }
export async function createIpAllocation(req: Request, res: Response) { res.status(201).json(await enterpriseIpamService.createIpAllocation(requireParam(req, "projectId"), requireUser(req), ipAllocationCreateSchema.parse(req.body), req.user?.email)); }
export async function createAllocationFromPlan(req: Request, res: Response) { res.status(201).json(await enterpriseIpamService.createAllocationFromPlan(requireParam(req, "projectId"), requireUser(req), ipAllocationFromPlanSchema.parse(req.body), req.user?.email)); }
export async function updateIpAllocation(req: Request, res: Response) { res.json(await enterpriseIpamService.updateIpAllocation(requireParam(req, "id"), requireUser(req), ipAllocationUpdateSchema.parse(req.body), req.user?.email)); }
export async function updateIpAllocationStatus(req: Request, res: Response) { res.json(await enterpriseIpamService.updateIpAllocationStatus(requireParam(req, "id"), requireUser(req), allocationStatusSchema.parse(req.body), req.user?.email)); }
export async function deleteIpAllocation(req: Request, res: Response) { await enterpriseIpamService.deleteIpAllocation(requireParam(req, "id"), requireUser(req), req.user?.email); res.status(204).send(); }
export async function createDhcpScope(req: Request, res: Response) { res.status(201).json(await enterpriseIpamService.createDhcpScope(requireParam(req, "projectId"), requireUser(req), dhcpScopeCreateSchema.parse(req.body), req.user?.email)); }
export async function updateDhcpScope(req: Request, res: Response) { res.json(await enterpriseIpamService.updateDhcpScope(requireParam(req, "id"), requireUser(req), dhcpScopeUpdateSchema.parse(req.body), req.user?.email)); }
export async function deleteDhcpScope(req: Request, res: Response) { await enterpriseIpamService.deleteDhcpScope(requireParam(req, "id"), requireUser(req), req.user?.email); res.status(204).send(); }
export async function createIpReservation(req: Request, res: Response) { res.status(201).json(await enterpriseIpamService.createIpReservation(requireParam(req, "projectId"), requireUser(req), ipReservationCreateSchema.parse(req.body), req.user?.email)); }
export async function updateIpReservation(req: Request, res: Response) { res.json(await enterpriseIpamService.updateIpReservation(requireParam(req, "id"), requireUser(req), ipReservationUpdateSchema.parse(req.body), req.user?.email)); }
export async function deleteIpReservation(req: Request, res: Response) { await enterpriseIpamService.deleteIpReservation(requireParam(req, "id"), requireUser(req), req.user?.email); res.status(204).send(); }
export async function previewBrownfieldImport(req: Request, res: Response) { res.json(await enterpriseIpamService.previewBrownfieldImport(requireParam(req, "projectId"), requireUser(req), brownfieldImportDryRunSchema.parse(req.body))); }
export async function getBrownfieldConflictReview(req: Request, res: Response) { res.json(await enterpriseIpamService.getBrownfieldConflictReview(requireParam(req, "projectId"), requireUser(req))); }
export async function createBrownfieldImport(req: Request, res: Response) { res.status(201).json(await enterpriseIpamService.createBrownfieldImport(requireParam(req, "projectId"), requireUser(req), brownfieldImportCreateSchema.parse(req.body), req.user?.email)); }
export async function createBrownfieldConflictResolution(req: Request, res: Response) { res.status(201).json(await enterpriseIpamService.createBrownfieldConflictResolution(requireParam(req, "projectId"), requireUser(req), brownfieldConflictResolutionCreateSchema.parse(req.body), req.user?.email)); }
export async function updateBrownfieldNetwork(req: Request, res: Response) { res.json(await enterpriseIpamService.updateBrownfieldNetwork(requireParam(req, "id"), requireUser(req), brownfieldNetworkUpdateSchema.parse(req.body), req.user?.email)); }
export async function deleteBrownfieldNetwork(req: Request, res: Response) { await enterpriseIpamService.deleteBrownfieldNetwork(requireParam(req, "id"), requireUser(req), req.user?.email); res.status(204).send(); }
export async function createAllocationApproval(req: Request, res: Response) { res.status(201).json(await enterpriseIpamService.createAllocationApproval(requireParam(req, "projectId"), requireUser(req), allocationApprovalCreateSchema.parse(req.body), req.user?.email)); }
