import { z } from "zod";
import { addSiteAddressBlockValidation } from "./addressingTrust.schemas.js";

const rawCreateSiteSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  location: z.string().max(100).optional(),
  streetAddress: z.string().max(160).optional(),
  buildingLabel: z.string().max(80).optional(),
  floorLabel: z.string().max(80).optional(),
  siteCode: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  defaultAddressBlock: z.string().max(50).optional(),
});

export const createSiteSchema = rawCreateSiteSchema.superRefine((value, ctx) => {
  addSiteAddressBlockValidation(ctx, value.defaultAddressBlock);
});

export const updateSiteSchema = rawCreateSiteSchema.omit({ projectId: true }).partial().superRefine((value, ctx) => {
  addSiteAddressBlockValidation(ctx, value.defaultAddressBlock);
});
