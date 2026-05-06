export interface ParsedCidr {
  original: string;
  ip: string;
  prefix: number;
  mask: number;
  network: number;
  broadcast: number;
}

export type SegmentRole =
  | "USER"
  | "GUEST"
  | "SERVER"
  | "MANAGEMENT"
  | "VOICE"
  | "PRINTER"
  | "IOT"
  | "CAMERA"
  | "DMZ"
  | "WAN_TRANSIT"
  | "LOOPBACK"
  | "OTHER";

export interface RecommendedCapacityPlan {
  requestedHosts: number;
  role: SegmentRole;
  bufferMultiplier: number;
  requiredUsableHosts: number;
  recommendedPrefix: number;
  recommendedUsableHosts: number;
  notes: string[];
}

function assertValidPrefix(prefix: number): void {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid prefix: ${prefix}`);
  }
}

export function isValidIpv4(ip: string): boolean {
  const value = ip.trim();
  const parts = value.split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    if (part.length > 1 && part.startsWith("0")) return false;
    const octet = Number(part);
    return Number.isInteger(octet) && octet >= 0 && octet <= 255;
  });
}

export function ipv4ToInt(ip: string): number {
  const value = ip.trim();
  if (!isValidIpv4(value)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }

  return value
    .split(".")
    .map(Number)
    .reduce((acc, octet) => ((acc << 8) | octet) >>> 0, 0);
}

export function intToIpv4(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`Invalid IPv4 integer: ${value}`);
  }

  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".");
}

export function parseCidr(input: string): ParsedCidr {
  const trimmed = input.trim();
  const parts = trimmed.split("/");
  if (parts.length !== 2) {
    throw new Error(`Invalid CIDR: ${input}`);
  }

  const [ipText, prefixText] = parts;
  const ip = ipText.trim();
  const prefixValue = prefixText.trim();
  if (!/^\d+$/.test(prefixValue) || (prefixValue.length > 1 && prefixValue.startsWith("0"))) {
    throw new Error(`Invalid CIDR: ${input}`);
  }
  const prefix = Number(prefixValue);

  if (!ip || !isValidIpv4(ip) || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid CIDR: ${input}`);
  }

  const ipInt = ipv4ToInt(ip);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;

  return {
    original: input,
    ip,
    prefix,
    mask,
    network,
    broadcast,
  };
}

export function canonicalCidr(input: string): string {
  const parsed = parseCidr(input);
  return `${intToIpv4(parsed.network)}/${parsed.prefix}`;
}

export function dottedMaskFromPrefix(prefix: number): string {
  assertValidPrefix(prefix);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return intToIpv4(mask);
}

export function wildcardMaskFromPrefix(prefix: number): string {
  assertValidPrefix(prefix);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return intToIpv4((~mask >>> 0) >>> 0);
}

export function totalAddressCount(prefix: number): number {
  assertValidPrefix(prefix);
  return 2 ** (32 - prefix);
}

export function containsIp(cidr: ParsedCidr, ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  return ipInt >= cidr.network && ipInt <= cidr.broadcast;
}

export function cidrsOverlap(a: ParsedCidr, b: ParsedCidr): boolean {
  return a.network <= b.broadcast && b.network <= a.broadcast;
}

export function classifySegmentRole(input?: string): SegmentRole {
  const text = (input || "").toLowerCase();
  if (!text.trim()) return "OTHER";
  if (text.includes("guest")) return "GUEST";
  if (text.includes("dmz")) return "DMZ";
  if (text.includes("server")) return "SERVER";
  if (text.includes("management") || text.includes("mgmt") || text.includes("admin-mgmt")) return "MANAGEMENT";
  if (text.includes("voice") || text.includes("voip")) return "VOICE";
  if (text.includes("printer") || text.includes("print")) return "PRINTER";
  if (text.includes("iot") || text.includes("ot") || text.includes("medical") || text.includes("lab")) return "IOT";
  if (text.includes("camera") || text.includes("cctv") || text.includes("surveillance")) return "CAMERA";
  if (text.includes("wan") || text.includes("transit") || text.includes("p2p") || text.includes("point-to-point")) return "WAN_TRANSIT";
  if (text.includes("loopback") || text.includes("lo0")) return "LOOPBACK";
  if (text.includes("user") || text.includes("staff") || text.includes("client") || text.includes("admin")) return "USER";
  return "OTHER";
}

export function usableHostCount(cidr: ParsedCidr, role: SegmentRole = "OTHER"): number {
  if (cidr.prefix === 32) return role === "LOOPBACK" ? 1 : 0;
  if (cidr.prefix === 31) return role === "WAN_TRANSIT" ? 2 : 0;
  return Math.max(0, 2 ** (32 - cidr.prefix) - 2);
}

export function firstUsableIp(cidr: ParsedCidr, role: SegmentRole = "OTHER"): string | null {
  if (cidr.prefix === 32) return role === "LOOPBACK" ? intToIpv4(cidr.network) : null;
  if (cidr.prefix === 31) return role === "WAN_TRANSIT" ? intToIpv4(cidr.network) : null;
  if (cidr.prefix >= 31) return null;
  return intToIpv4(cidr.network + 1);
}

export function lastUsableIp(cidr: ParsedCidr, role: SegmentRole = "OTHER"): string | null {
  if (cidr.prefix === 32) return role === "LOOPBACK" ? intToIpv4(cidr.network) : null;
  if (cidr.prefix === 31) return role === "WAN_TRANSIT" ? intToIpv4(cidr.broadcast) : null;
  if (cidr.prefix >= 31) return null;
  return intToIpv4(cidr.broadcast - 1);
}

export function isNetworkAddress(cidr: ParsedCidr, ip: string): boolean {
  return ipv4ToInt(ip) === cidr.network;
}

export function isBroadcastAddress(cidr: ParsedCidr, ip: string): boolean {
  return ipv4ToInt(ip) === cidr.broadcast;
}

export type HostUsabilityStatus =
  | "usable"
  | "invalid-ip"
  | "outside-subnet"
  | "network-address"
  | "broadcast-address"
  | "role-incompatible";

export interface HostUsabilityResult {
  usable: boolean;
  status: HostUsabilityStatus;
  canonicalCidr: string;
  role: SegmentRole;
  explanation: string;
}

export function validateHostUsability(cidr: ParsedCidr, ip: string, role: SegmentRole = "OTHER"): HostUsabilityResult {
  const canonical = `${intToIpv4(cidr.network)}/${cidr.prefix}`;
  if (!isValidIpv4(ip)) {
    return {
      usable: false,
      status: "invalid-ip",
      canonicalCidr: canonical,
      role,
      explanation: `${ip} is not valid IPv4 notation.`,
    };
  }

  const value = ipv4ToInt(ip);
  if (value < cidr.network || value > cidr.broadcast) {
    return {
      usable: false,
      status: "outside-subnet",
      canonicalCidr: canonical,
      role,
      explanation: `${ip} is outside ${canonical}.`,
    };
  }

  if (cidr.prefix === 32) {
    return role === "LOOPBACK"
      ? { usable: true, status: "usable", canonicalCidr: canonical, role, explanation: `${ip} is the loopback /32 host address.` }
      : { usable: false, status: "role-incompatible", canonicalCidr: canonical, role, explanation: `${canonical} is only usable as a single host when the segment role is LOOPBACK.` };
  }

  if (cidr.prefix === 31) {
    return role === "WAN_TRANSIT"
      ? { usable: true, status: "usable", canonicalCidr: canonical, role, explanation: `${ip} is usable on a /31 WAN transit link.` }
      : { usable: false, status: "role-incompatible", canonicalCidr: canonical, role, explanation: `${canonical} is only treated as two usable host addresses when the segment role is WAN_TRANSIT.` };
  }

  if (value === cidr.network) {
    return { usable: false, status: "network-address", canonicalCidr: canonical, role, explanation: `${ip} is the network address of ${canonical}.` };
  }

  if (value === cidr.broadcast) {
    return { usable: false, status: "broadcast-address", canonicalCidr: canonical, role, explanation: `${ip} is the broadcast address of ${canonical}.` };
  }

  return { usable: true, status: "usable", canonicalCidr: canonical, role, explanation: `${ip} is a usable host address inside ${canonical}.` };
}

export function isUsableHostIp(cidr: ParsedCidr, ip: string, role: SegmentRole = "OTHER"): boolean {
  return validateHostUsability(cidr, ip, role).usable;
}

export function validateGatewayForSubnet(cidr: ParsedCidr, gatewayIp: string, role: SegmentRole = "OTHER"): HostUsabilityResult {
  return validateHostUsability(cidr, gatewayIp, role);
}

export function suggestedGatewayPattern(ip: string): boolean {
  if (!isValidIpv4(ip)) return false;
  const lastOctet = Number(ip.trim().split(".").at(-1));
  return lastOctet === 1 || lastOctet === 254;
}

export function describeRange(cidr: ParsedCidr): string {
  return `${intToIpv4(cidr.network)} - ${intToIpv4(cidr.broadcast)}`;
}

export function describeSubnet(cidr: ParsedCidr, role: SegmentRole = "OTHER") {
  return {
    canonicalCidr: `${intToIpv4(cidr.network)}/${cidr.prefix}`,
    prefix: cidr.prefix,
    networkAddress: intToIpv4(cidr.network),
    broadcastAddress: intToIpv4(cidr.broadcast),
    firstUsableIp: firstUsableIp(cidr, role),
    lastUsableIp: lastUsableIp(cidr, role),
    dottedMask: dottedMaskFromPrefix(cidr.prefix),
    wildcardMask: wildcardMaskFromPrefix(cidr.prefix),
    totalAddresses: totalAddressCount(cidr.prefix),
    usableAddresses: usableHostCount(cidr, role),
  };
}

export function growthBufferMultiplierForRole(role: SegmentRole = "OTHER"): number {
  if (role === "LOOPBACK" || role === "WAN_TRANSIT") return 1;
  if (role === "USER" || role === "GUEST" || role === "VOICE") return 1.3;
  return 1.2;
}

export function recommendedCapacityPlanForHosts(hosts: number, role: SegmentRole = "OTHER"): RecommendedCapacityPlan {
  if (!Number.isFinite(hosts) || hosts < 0) {
    throw new Error(`Invalid host count: ${hosts}`);
  }

  const requestedHosts = Math.ceil(hosts);
  const notes: string[] = [];

  if (role === "LOOPBACK") {
    const requiredUsableHosts = requestedHosts <= 1 ? 1 : requestedHosts;
    const recommendedPrefix = requestedHosts <= 1 ? 32 : smallestPrefixForUsableHosts(requiredUsableHosts, "OTHER");
    notes.push(requestedHosts <= 1
      ? "Loopback role uses a single /32 host address."
      : "Multiple loopback endpoints should normally be modeled as separate /32 objects; a larger holding block is shown only because requested host count is greater than one.");
    return {
      requestedHosts,
      role,
      bufferMultiplier: 1,
      requiredUsableHosts,
      recommendedPrefix,
      recommendedUsableHosts: usableHostCount(parseCidr(`0.0.0.0/${recommendedPrefix}`), requestedHosts <= 1 ? "LOOPBACK" : "OTHER"),
      notes,
    };
  }

  if (role === "WAN_TRANSIT" && requestedHosts <= 2) {
    notes.push("Point-to-point WAN transit uses /31 addressing when both endpoints support RFC 3021 behavior.");
    return {
      requestedHosts,
      role,
      bufferMultiplier: 1,
      requiredUsableHosts: 2,
      recommendedPrefix: 31,
      recommendedUsableHosts: 2,
      notes,
    };
  }

  const bufferMultiplier = growthBufferMultiplierForRole(role);
  const requiredUsableHosts = Math.max(2, Math.ceil(requestedHosts * bufferMultiplier));
  const recommendedPrefix = smallestPrefixForUsableHosts(requiredUsableHosts, role);

  notes.push(
    bufferMultiplier === 1
      ? `Recommended prefix covers ${requiredUsableHosts} required usable host address(es).`
      : `Recommended prefix covers ${requestedHosts} requested host(s) with ${Math.round((bufferMultiplier - 1) * 100)}% growth buffer: ${requiredUsableHosts} required usable addresses.`,
  );

  return {
    requestedHosts,
    role,
    bufferMultiplier,
    requiredUsableHosts,
    recommendedPrefix,
    recommendedUsableHosts: usableHostCount(parseCidr(`0.0.0.0/${recommendedPrefix}`), role),
    notes,
  };
}

function smallestPrefixForUsableHosts(requiredUsableHosts: number, role: SegmentRole = "OTHER"): number {
  const minimumPrefixByRole: Partial<Record<SegmentRole, number>> = {
    PRINTER: 29,
  };
  const maximumAllowedPrefix = minimumPrefixByRole[role];

  for (let prefix = 32; prefix >= 1; prefix -= 1) {
    const usable = usableHostCount(parseCidr(`0.0.0.0/${prefix}`), role);
    if (usable >= requiredUsableHosts) {
      return maximumAllowedPrefix === undefined ? prefix : Math.min(prefix, maximumAllowedPrefix);
    }
  }
  return 1;
}

export function recommendedPrefixForHosts(hosts: number, role: SegmentRole = "OTHER") {
  return recommendedCapacityPlanForHosts(hosts, role).recommendedPrefix;
}
