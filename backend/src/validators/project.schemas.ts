import { z } from "zod";
import {
  normalizeProjectBasePrivateRange,
  validateProjectBasePrivateRange,
} from "../domain/addressing/addressing-validation.js";

const optionalText = (max: number) => z.string().max(max).optional();

export const projectBasePrivateRangeSchema = z.preprocess(
  (value) => normalizeProjectBasePrivateRange(value),
  z.string().max(50).nullable().optional(),
).superRefine((value, ctx) => {
  const validation = validateProjectBasePrivateRange(value);
  for (const issue of validation.issues) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message: issue.message,
    });
  }
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: optionalText(4000),
  organizationName: optionalText(100),
  organizationId: z.string().uuid().optional().or(z.literal("")),
  environmentType: optionalText(50),
  basePrivateRange: projectBasePrivateRangeSchema,
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
  reportHeader: optionalText(120),
  reportFooter: optionalText(160),
  approvalStatus: z.enum(["DRAFT", "IN_REVIEW", "APPROVED"]).optional(),
  reviewerNotes: optionalText(1200),
  requirementsJson: optionalText(50000),
  discoveryJson: optionalText(50000),
  platformProfileJson: optionalText(50000),
});

export const updateProjectSchema = createProjectSchema.partial();

export const saveProjectRequirementsSchema = z.object({
  requirementsJson: z.string().min(2).max(50000),
  environmentType: optionalText(50),
  description: optionalText(4000),
});
