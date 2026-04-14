import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  organizationName: z.string().max(100).optional(),
  organizationId: z.string().uuid().optional().or(z.literal("")),
  environmentType: z.string().max(50).optional(),
  basePrivateRange: z.string().max(50).optional(),
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
  reportHeader: z.string().max(120).optional(),
  reportFooter: z.string().max(160).optional(),
  approvalStatus: z.enum(["DRAFT", "IN_REVIEW", "APPROVED"]).optional(),
  reviewerNotes: z.string().max(1200).optional(),
  requirementsJson: z.string().max(12000).optional(),
  discoveryJson: z.string().max(50000).optional(),
  platformProfileJson: z.string().max(50000).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();
