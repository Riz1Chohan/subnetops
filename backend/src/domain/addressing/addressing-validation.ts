import {
  canonicalCidr,
  classifySegmentRole,
  containsIp,
  isValidIpv4,
  intToIpv4,
  parseCidr,
  validateGatewayForSubnet,
  type SegmentRole,
} from "./cidr.js";
import { ipv6Contains, parseIpv6Cidr } from "./ipv6.js";

export type AddressFamily = "IPV4" | "IPV6";
export type AddressingIssueSeverity = "ERROR" | "WARNING";

export type AddressingValidationIssue = {
  code: string;
  field: string;
  message: string;
  severity: AddressingIssueSeverity;
};

export type AddressingValidationResult = {
  ok: boolean;
  issues: AddressingValidationIssue[];
};

export type VlanAddressingCandidate = {
  subnetCidr?: unknown;
  gatewayIp?: unknown;
  segmentRole?: unknown;
  vlanName?: unknown;
  purpose?: unknown;
  department?: unknown;
  notes?: unknown;
};

export type DhcpScopeAddressingCandidate = {
  addressFamily?: unknown;
  scopeCidr?: unknown;
  defaultGateway?: unknown;
  parentSubnetCidr?: unknown;
  excludedRangesJson?: unknown;
  segmentRole?: unknown;
};

const SEGMENT_ROLES: readonly SegmentRole[] = ["USER", "SERVER", "GUEST", "MANAGEMENT", "DMZ", "VOICE", "PRINTER", "IOT", "CAMERA", "WAN_TRANSIT", "LOOPBACK", "OTHER"] as const;


const RFC1918_PRIVATE_BLOCKS = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"].map(parseCidr);

function isInsideIpv4Cidr(child: ReturnType<typeof parseCidr>, parent: ReturnType<typeof parseCidr>): boolean {
  return child.network >= parent.network && child.broadcast <= parent.broadcast;
}

export function normalizeProjectBasePrivateRange(value: unknown): string | null | undefined {
  if (typeof value === "undefined") return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateProjectBasePrivateRange(value: unknown): AddressingValidationResult {
  const normalized = normalizeProjectBasePrivateRange(value);
  const issues: AddressingValidationIssue[] = [];

  if (typeof normalized === "undefined" || normalized === null) return result(issues);
  if (typeof value !== "string") {
    return result([issue("PROJECT_BASE_RANGE_INVALID_TYPE", "basePrivateRange", "Base private range must be an IPv4 CIDR string or blank.")]);
  }

  let parsed: ReturnType<typeof parseCidr>;
  try {
    parsed = parseCidr(normalized);
  } catch {
    return result([issue("PROJECT_BASE_RANGE_INVALID", "basePrivateRange", "Base private range must be valid IPv4 CIDR notation, for example 10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16.")]);
  }

  const canonical = `${intToIpv4(parsed.network)}/${parsed.prefix}`;
  if (normalized !== canonical) {
    issues.push(issue("PROJECT_BASE_RANGE_NON_CANONICAL", "basePrivateRange", `Base private range must be stored on its network boundary: ${canonical}.`));
  }

  const containedInPrivateBlock = RFC1918_PRIVATE_BLOCKS.some((privateBlock) => isInsideIpv4Cidr(parsed, privateBlock));
  if (!containedInPrivateBlock) {
    issues.push(issue("PROJECT_BASE_RANGE_NOT_PRIVATE", "basePrivateRange", "Base private range must be fully contained in RFC1918 private IPv4 space: 10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16. Public ranges require an explicit future exception/review path and cannot be saved as clean project truth."));
  }

  return result(issues);
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function issue(code: string, field: string, message: string, severity: AddressingIssueSeverity = "ERROR"): AddressingValidationIssue {
  return { code, field, message, severity };
}

function result(issues: AddressingValidationIssue[]): AddressingValidationResult {
  return { ok: !issues.some((item) => item.severity === "ERROR"), issues };
}

function toFamily(value: unknown): AddressFamily {
  return String(value ?? "IPV4").toUpperCase().includes("6") ? "IPV6" : "IPV4";
}

function roleFromCandidate(candidate: VlanAddressingCandidate | DhcpScopeAddressingCandidate): SegmentRole {
  const explicitRole = clean(candidate.segmentRole).toUpperCase().replace(/[\s-]+/g, "_");
  if ((SEGMENT_ROLES as readonly string[]).includes(explicitRole)) return explicitRole as SegmentRole;
  if (explicitRole === "USERS") return "USER";
  if (explicitRole === "SERVERS") return "SERVER";
  if (explicitRole === "MGMT") return "MANAGEMENT";
  if (explicitRole === "TRANSIT") return "WAN_TRANSIT";
  return classifySegmentRole(["purpose" in candidate ? candidate.purpose : undefined, "vlanName" in candidate ? candidate.vlanName : undefined, "department" in candidate ? candidate.department : undefined, "notes" in candidate ? candidate.notes : undefined].map(clean).join(" "));
}

export function formatAddressingValidationIssues(issues: AddressingValidationIssue[]): string {
  return issues.map((item) => item.message).join(" ");
}

export function collectAddressingMessages(validation: AddressingValidationResult): string[] {
  return validation.issues.filter((item) => item.severity === "ERROR").map((item) => item.message);
}

export function validateCanonicalCidr(value: unknown, field = "cidr", label = "CIDR"): AddressingValidationResult {
  const cidr = clean(value);
  const issues: AddressingValidationIssue[] = [];
  if (!cidr) return result(issues);

  try {
    const canonical = canonicalCidr(cidr);
    if (cidr !== canonical) {
      issues.push(issue("CIDR_NON_CANONICAL", field, `${label} must be stored on its network boundary: ${canonical}.`));
    }
  } catch {
    issues.push(issue("CIDR_INVALID", field, `${label} must be valid IPv4 CIDR notation, for example 10.20.30.0/24.`));
  }

  return result(issues);
}

export function validateSiteAddressBlock(defaultAddressBlock: unknown): AddressingValidationResult {
  const value = clean(defaultAddressBlock);
  if (!value) return result([]);
  const validation = validateCanonicalCidr(value, "defaultAddressBlock", "Default address block");
  if (!validation.ok) return validation;
  return result([]);
}

export function validateGateway(subnetCidr: unknown, gatewayIp: unknown, role: SegmentRole = "OTHER", field = "gatewayIp"): AddressingValidationResult {
  const cidr = clean(subnetCidr);
  const gateway = clean(gatewayIp);
  const issues: AddressingValidationIssue[] = [];

  if (!gateway) return result(issues);
  if (!isValidIpv4(gateway)) {
    return result([issue("GATEWAY_INVALID", field, "Gateway must be valid IPv4 notation with no leading-zero octets.")]);
  }
  if (!cidr) return result(issues);

  let parsed: ReturnType<typeof parseCidr>;
  try {
    parsed = parseCidr(cidr);
  } catch {
    return result([issue("CIDR_INVALID", "subnetCidr", "Subnet must be valid IPv4 CIDR notation, for example 10.20.30.0/24.")]);
  }

  const gatewayValidation = validateGatewayForSubnet(parsed, gateway, role);
  if (!gatewayValidation.usable) {
    issues.push(issue("GATEWAY_NOT_USABLE", field, `${gatewayValidation.explanation} Gateway must be a role-usable host inside ${gatewayValidation.canonicalCidr}.`));
  }

  return result(issues);
}

export function validateVlanAddressing(candidate: VlanAddressingCandidate): AddressingValidationResult {
  const issues: AddressingValidationIssue[] = [];
  const subnetCidr = clean(candidate.subnetCidr);
  const gatewayIp = clean(candidate.gatewayIp);
  const role = roleFromCandidate(candidate);

  if (!subnetCidr && !gatewayIp) return result(issues);

  if (subnetCidr) {
    issues.push(...validateCanonicalCidr(subnetCidr, "subnetCidr", "Subnet").issues);
  }

  if (gatewayIp) {
    issues.push(...validateGateway(subnetCidr, gatewayIp, role, "gatewayIp").issues);
  }

  return result(issues);
}

function ipv6AddressToPrefix(ip: string) {
  if (ip.includes("/")) throw new Error("IPv6 address must not include prefix");
  return parseIpv6Cidr(`${ip}/128`);
}

function validateIpInsidePrefix(field: string, ip: string, cidr: string, family: AddressFamily): AddressingValidationIssue[] {
  if (!ip) return [];
  if (family === "IPV4") {
    if (!isValidIpv4(ip)) return [issue("IP_INVALID", field, `${field} must be a valid IPv4 address.`)];
    try {
      const parsed = parseCidr(cidr);
      if (!containsIp(parsed, ip)) return [issue("IP_OUTSIDE_CIDR", field, `${field} ${ip} must be inside ${canonicalCidr(cidr)}.`)];
    } catch {
      return [issue("CIDR_INVALID", "scopeCidr", "DHCP scope CIDR must be valid IPv4 CIDR notation.")];
    }
    return [];
  }

  try {
    const parsed = parseIpv6Cidr(cidr);
    if (!ipv6Contains(parsed, ipv6AddressToPrefix(ip))) return [issue("IP_OUTSIDE_CIDR", field, `${field} ${ip} must be inside ${parsed.canonicalCidr}.`)];
  } catch {
    return [issue("IP_INVALID", field, `${field} must be a valid IPv6 address inside the DHCP scope.`)];
  }
  return [];
}

function cidrInsideParent(childCidr: string, parentCidr: string, family: AddressFamily): boolean {
  if (family === "IPV4") {
    const child = parseCidr(childCidr);
    const parent = parseCidr(parentCidr);
    return child.network >= parent.network && child.broadcast <= parent.broadcast;
  }
  return ipv6Contains(parseIpv6Cidr(parentCidr), parseIpv6Cidr(childCidr));
}

export function validateDhcpScope(candidate: DhcpScopeAddressingCandidate): AddressingValidationResult {
  const family = toFamily(candidate.addressFamily);
  const scopeCidr = clean(candidate.scopeCidr);
  const defaultGateway = clean(candidate.defaultGateway);
  const parentSubnetCidr = clean(candidate.parentSubnetCidr);
  const role = roleFromCandidate(candidate);
  const issues: AddressingValidationIssue[] = [];

  if (!scopeCidr) return result(issues);

  if (family === "IPV4") {
    issues.push(...validateCanonicalCidr(scopeCidr, "scopeCidr", "DHCP scope CIDR").issues);
    if (defaultGateway) issues.push(...validateGateway(scopeCidr, defaultGateway, role, "defaultGateway").issues);
  } else {
    try {
      parseIpv6Cidr(scopeCidr);
    } catch {
      issues.push(issue("DHCP_SCOPE_CIDR_INVALID", "scopeCidr", "DHCP scope CIDR must be valid IPv6 CIDR notation."));
    }
    if (defaultGateway) issues.push(...validateIpInsidePrefix("defaultGateway", defaultGateway, scopeCidr, family));
  }

  if (parentSubnetCidr) {
    try {
      if (!cidrInsideParent(scopeCidr, parentSubnetCidr, family)) {
        issues.push(issue("DHCP_SCOPE_OUTSIDE_PARENT", "scopeCidr", `DHCP scope ${scopeCidr} must stay inside parent subnet ${parentSubnetCidr}.`));
      }
    } catch {
      issues.push(issue("DHCP_PARENT_INVALID", "parentSubnetCidr", `Parent subnet ${parentSubnetCidr} must be valid ${family} CIDR notation.`));
    }
  }

  return result(issues);
}
