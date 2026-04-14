import { z } from "zod";

export const createSiteSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  location: z.string().max(100).optional(),
  siteCode: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  defaultAddressBlock: z.string().max(50).optional(),
});

export const updateSiteSchema = createSiteSchema.omit({ projectId: true }).partial();
