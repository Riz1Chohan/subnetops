import { z } from "zod";

const optionalString = z.string().trim().min(1).optional().nullable();
const optionalJsonText = z.string().trim().optional().nullable();

export const addressFamilySchema = z.enum(["IPV4", "IPV6"]);
export const ipPoolScopeSchema = z.enum(["ORGANIZATION", "SITE", "SEGMENT", "TRANSIT", "LOOPBACK", "RESERVED"]);
export const ipPoolStatusSchema = z.enum(["ACTIVE", "RESERVED", "DEPRECATED"]);
export const ipAllocationStatusSchema = z.enum(["PROPOSED", "REVIEW_REQUIRED", "APPROVED", "REJECTED", "SUPERSEDED", "IMPLEMENTED"]);
export const brownfieldObjectKindSchema = z.enum(["NETWORK", "VLAN", "DHCP_SCOPE", "RESERVATION", "ROUTE", "FIREWALL_POLICY", "UNKNOWN"]);
export const approvalDecisionSchema = z.enum(["APPROVED", "REJECTED", "NEEDS_CHANGES"]);
export const brownfieldConflictDecisionSchema = z.enum(["ACCEPT_BROWNFIELD", "KEEP_PROPOSED", "IGNORE_NOT_APPLICABLE", "SUPERSEDE_PROPOSED", "SPLIT_REQUIRED", "CHANGE_WINDOW_REQUIRED"]);

export const routeDomainCreateSchema = z.object({
  routeDomainKey: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  vrfName: optionalString,
  routeDistinguisher: optionalString,
  description: optionalString,
  allowOverlappingCidrs: z.boolean().optional(),
  sourceState: z.string().trim().min(1).max(80).optional(),
});
export const routeDomainUpdateSchema = routeDomainCreateSchema.partial();

export const ipPoolCreateSchema = z.object({
  routeDomainId: optionalString,
  siteId: optionalString,
  name: z.string().trim().min(1).max(160),
  addressFamily: addressFamilySchema,
  scope: ipPoolScopeSchema.optional(),
  cidr: z.string().trim().min(1).max(128),
  status: ipPoolStatusSchema.optional(),
  purpose: optionalString,
  ownerLabel: optionalString,
  businessUnit: optionalString,
  reservePercent: z.coerce.number().int().min(0).max(95).optional(),
  noAllocate: z.boolean().optional(),
  sourceState: z.string().trim().min(1).max(80).optional(),
  notes: optionalString,
});
export const ipPoolUpdateSchema = ipPoolCreateSchema.partial();

export const ipAllocationCreateSchema = z.object({
  poolId: optionalString,
  routeDomainId: optionalString,
  siteId: optionalString,
  vlanId: optionalString,
  addressFamily: addressFamilySchema,
  cidr: z.string().trim().min(1).max(128),
  gatewayIp: optionalString,
  purpose: optionalString,
  status: ipAllocationStatusSchema.optional(),
  source: z.string().trim().min(1).max(80).optional(),
  confidence: z.string().trim().min(1).max(80).optional(),
  inputHash: optionalString,
  notes: optionalString,
});
export const ipAllocationUpdateSchema = ipAllocationCreateSchema.partial();
export const ipAllocationFromPlanSchema = z.object({
  poolId: z.string().trim().min(1),
  family: z.enum(["ipv4", "ipv6", "IPV4", "IPV6"]),
  proposedCidr: z.string().trim().min(1).max(128),
  siteId: optionalString,
  vlanNumber: z.coerce.number().int().min(1).max(4094).optional().nullable(),
  routeDomainKey: optionalString,
  purpose: optionalString,
  notes: optionalString,
});

export const dhcpScopeCreateSchema = z.object({
  siteId: optionalString,
  vlanId: optionalString,
  routeDomainId: optionalString,
  allocationId: optionalString,
  addressFamily: addressFamilySchema.optional(),
  scopeCidr: z.string().trim().min(1).max(128),
  defaultGateway: optionalString,
  dnsServersJson: optionalJsonText,
  leaseSeconds: z.coerce.number().int().positive().optional().nullable(),
  excludedRangesJson: optionalJsonText,
  optionsJson: optionalJsonText,
  relayTargetsJson: optionalJsonText,
  serverLocation: optionalString,
  source: z.string().trim().min(1).max(80).optional(),
  notes: optionalString,
});
export const dhcpScopeUpdateSchema = dhcpScopeCreateSchema.partial();

export const ipReservationCreateSchema = z.object({
  siteId: optionalString,
  vlanId: optionalString,
  dhcpScopeId: optionalString,
  allocationId: optionalString,
  addressFamily: addressFamilySchema.optional(),
  ipAddress: z.string().trim().min(1).max(128),
  macAddress: optionalString,
  hostname: optionalString,
  ownerLabel: optionalString,
  purpose: optionalString,
  source: z.string().trim().min(1).max(80).optional(),
  notes: optionalString,
});
export const ipReservationUpdateSchema = ipReservationCreateSchema.partial();

export const brownfieldNetworkInputSchema = z.object({
  routeDomainKey: optionalString,
  addressFamily: addressFamilySchema,
  cidr: z.string().trim().min(1).max(128),
  vlanNumber: z.coerce.number().int().min(1).max(4094).optional().nullable(),
  siteName: optionalString,
  ownerLabel: optionalString,
  sourceObjectKind: brownfieldObjectKindSchema.optional(),
  sourceObjectId: optionalString,
  confidence: z.string().trim().min(1).max(80).optional(),
  notes: optionalString,
});
export const brownfieldImportCreateSchema = z.object({
  sourceType: z.string().trim().min(1).max(80),
  sourceName: optionalString,
  notes: optionalString,
  networks: z.array(brownfieldNetworkInputSchema).min(1).max(250),
});
export const brownfieldImportDryRunSchema = z.object({
  sourceType: z.string().trim().min(1).max(80).optional(),
  sourceName: optionalString,
  notes: optionalString,
  networks: z.array(brownfieldNetworkInputSchema).min(1).max(250),
});
export const brownfieldNetworkUpdateSchema = brownfieldNetworkInputSchema.partial();

export const allocationApprovalCreateSchema = z.object({
  allocationId: z.string().trim().min(1),
  decision: approvalDecisionSchema,
  reviewerLabel: optionalString,
  reason: optionalString,
  designInputHash: optionalString,
});

export const allocationStatusSchema = z.object({
  status: ipAllocationStatusSchema,
  actorLabel: optionalString,
  summary: optionalString,
  designInputHash: optionalString,
});

export const brownfieldConflictResolutionCreateSchema = z.object({
  conflictKey: z.string().trim().min(1),
  code: z.string().trim().min(1).max(120),
  routeDomainKey: optionalString,
  addressFamily: addressFamilySchema,
  importedCidr: z.string().trim().min(1).max(128),
  proposedCidr: optionalString,
  existingObjectType: z.string().trim().min(1).max(120),
  existingObjectId: optionalString,
  decision: brownfieldConflictDecisionSchema,
  reviewerLabel: optionalString,
  reason: z.string().trim().min(1).max(2000),
  designInputHash: optionalString,
  applySupersede: z.boolean().optional(),
});
