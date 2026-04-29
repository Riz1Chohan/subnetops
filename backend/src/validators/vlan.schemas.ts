import { z } from "zod";

export const segmentRoleSchema = z.enum(["USER", "SERVER", "GUEST", "MANAGEMENT", "DMZ", "VOICE", "PRINTER", "IOT", "CAMERA", "WAN_TRANSIT", "LOOPBACK", "OTHER"]);

export const createVlanSchema = z.object({
  siteId: z.string().uuid(),
  vlanId: z.number().int().min(1).max(4094),
  vlanName: z.string().min(1).max(100),
  purpose: z.string().max(200).optional(),
  segmentRole: segmentRoleSchema.optional(),
  subnetCidr: z.string().min(1).max(50),
  gatewayIp: z.string().min(1).max(50),
  dhcpEnabled: z.boolean(),
  estimatedHosts: z.number().int().nonnegative().optional(),
  department: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const updateVlanSchema = createVlanSchema.omit({ siteId: true }).partial();
