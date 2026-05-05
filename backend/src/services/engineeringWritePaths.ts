import {
  normalizeProjectBasePrivateRange,
  validateDhcpScope,
  validateProjectBasePrivateRange,
  validateSiteAddressBlock,
  validateVlanAddressing,
  formatAddressingValidationIssues,
  type AddressingValidationIssue,
  type DhcpScopeAddressingCandidate,
  type VlanAddressingCandidate,
} from "../domain/addressing/addressing-validation.js";
import { ApiError } from "../utils/apiError.js";

export type VlanWriteFields = VlanAddressingCandidate & {
  subnetCidr?: unknown;
  gatewayIp?: unknown;
};

export type SiteWriteFields = {
  defaultAddressBlock?: unknown;
};

export type ProjectWriteFields = {
  basePrivateRange?: unknown;
};

function validationFailure(prefix: string, issues: AddressingValidationIssue[]): ApiError {
  return new ApiError(400, `${prefix}: ${formatAddressingValidationIssues(issues)}`);
}


export function assertProjectBasePrivateRangeWritable(basePrivateRange: unknown, context = "Project base private range failed engineering validation"): void {
  const validation = validateProjectBasePrivateRange(basePrivateRange);
  if (!validation.ok) {
    throw validationFailure(context, validation.issues);
  }
}

export function normalizeProjectBasePrivateRangeForWrite(basePrivateRange: unknown): string | null | undefined {
  assertProjectBasePrivateRangeWritable(basePrivateRange);
  return normalizeProjectBasePrivateRange(basePrivateRange);
}

export function buildProjectWriteCandidate(existing: ProjectWriteFields, patch: Record<string, unknown>): ProjectWriteFields {
  const candidate = {
    basePrivateRange: existing.basePrivateRange,
    ...patch,
  };
  if (Object.prototype.hasOwnProperty.call(candidate, "basePrivateRange")) {
    candidate.basePrivateRange = normalizeProjectBasePrivateRangeForWrite(candidate.basePrivateRange);
  }
  return candidate;
}

export function assertGeneratedProjectBasePrivateRangeWritable(candidate: ProjectWriteFields, source: string): void {
  assertProjectBasePrivateRangeWritable(candidate.basePrivateRange, `${source} generated an invalid project base private range`);
}

export function assertSiteAddressBlockWritable(defaultAddressBlock: unknown, context = "Site addressing failed engineering validation"): void {
  const validation = validateSiteAddressBlock(defaultAddressBlock);
  if (!validation.ok) {
    throw validationFailure(context, validation.issues);
  }
}

export function buildSiteWriteCandidate(existing: SiteWriteFields, patch: Record<string, unknown>): SiteWriteFields {
  const candidate = {
    defaultAddressBlock: existing.defaultAddressBlock,
    ...patch,
  };
  assertSiteAddressBlockWritable(candidate.defaultAddressBlock);
  return candidate;
}

export function assertVlanAddressingWritable(candidate: VlanWriteFields, context = "VLAN addressing failed engineering validation"): void {
  const validation = validateVlanAddressing(candidate);
  if (!validation.ok) {
    throw validationFailure(context, validation.issues);
  }
}

export function buildVlanWriteCandidate(existing: VlanWriteFields, patch: Record<string, unknown>): VlanWriteFields {
  const candidate = {
    subnetCidr: existing.subnetCidr,
    gatewayIp: existing.gatewayIp,
    segmentRole: existing.segmentRole,
    vlanName: existing.vlanName,
    purpose: existing.purpose,
    department: existing.department,
    notes: existing.notes,
    ...patch,
  };
  assertVlanAddressingWritable(candidate);
  return candidate;
}

export function assertDhcpScopeAddressingWritable(candidate: DhcpScopeAddressingCandidate, context = "DHCP scope failed engineering validation"): void {
  const validation = validateDhcpScope(candidate);
  if (!validation.ok) {
    throw validationFailure(context, validation.issues);
  }
}

export function assertGeneratedSiteAddressingWritable(candidate: SiteWriteFields, source: string): void {
  assertSiteAddressBlockWritable(candidate.defaultAddressBlock, `${source} generated an invalid site address block`);
}

export function assertGeneratedVlanAddressingWritable(candidate: VlanWriteFields, source: string): void {
  assertVlanAddressingWritable(candidate, `${source} generated invalid VLAN addressing`);
}

export function assertGeneratedDhcpScopeAddressingWritable(candidate: DhcpScopeAddressingCandidate, source: string): void {
  assertDhcpScopeAddressingWritable(candidate, `${source} generated invalid DHCP scope addressing`);
}
