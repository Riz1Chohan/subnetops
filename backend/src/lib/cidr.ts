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
  | "WAN_TRANSIT"
  | "LOOPBACK"
  | "OTHER";

export function isValidIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}

export function ipv4ToInt(ip: string): number {
  if (!isValidIpv4(ip)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }

  return ip
    .split(".")
    .map(Number)
    .reduce((acc, octet) => ((acc << 8) | octet) >>> 0, 0);
}

export function intToIpv4(value: number): string {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".");
}

export function parseCidr(input: string): ParsedCidr {
  const [ip, prefixText] = input.split("/");
  const prefix = Number(prefixText);

  if (!ip || prefixText === undefined || !isValidIpv4(ip) || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
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
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid prefix: ${prefix}`);
  }
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return intToIpv4(mask);
}

export function wildcardMaskFromPrefix(prefix: number): string {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid prefix: ${prefix}`);
  }
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return intToIpv4((~mask >>> 0) >>> 0);
}

export function totalAddressCount(prefix: number): number {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid prefix: ${prefix}`);
  }
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
  if (text.includes("server") || text.includes("dmz")) return "SERVER";
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

export function suggestedGatewayPattern(ip: string): boolean {
  const lastOctet = Number(ip.split(".").at(-1));
  return lastOctet === 1 || lastOctet === 254;
}

export function describeRange(cidr: ParsedCidr): string {
  return `${intToIpv4(cidr.network)} - ${intToIpv4(cidr.broadcast)}`;
}

export function describeSubnet(cidr: ParsedCidr, role: SegmentRole = "OTHER") {
  return {
    canonicalCidr: `${intToIpv4(cidr.network)}/${cidr.prefix}`,
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

export function recommendedPrefixForHosts(hosts: number, role: SegmentRole = "OTHER") {
  if (!Number.isFinite(hosts) || hosts < 0) {
    throw new Error(`Invalid host count: ${hosts}`);
  }

  if (role === "LOOPBACK") return 32;
  if (role === "WAN_TRANSIT") return hosts <= 2 ? 31 : 30;

  const bufferMultiplier = role === "USER" || role === "GUEST" || role === "VOICE" ? 1.3 : 1.2;
  const target = Math.max(2, Math.ceil(hosts * bufferMultiplier));
  const minimumPrefixByRole: Partial<Record<SegmentRole, number>> = {
    PRINTER: 29,
  };
  const maximumAllowedPrefix = minimumPrefixByRole[role];

  for (let prefix = 30; prefix >= 1; prefix -= 1) {
    if (usableHostCount(parseCidr(`0.0.0.0/`), role) >= target) {
      return maximumAllowedPrefix === undefined ? prefix : Math.min(prefix, maximumAllowedPrefix);
    }
  }
  return 1;
}
