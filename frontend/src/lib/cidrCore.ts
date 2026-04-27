export interface ParsedCidrRange {
  ip: string;
  prefix: number;
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

export function isValidIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length != 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const octetNumber = Number(part);
    return octetNumber >= 0 && octetNumber <= 255;
  });
}

export function tryIpv4ToInt(ip: string): number | null {
  if (!isValidIpv4(ip)) return null;
  return ip.split(".").map(Number).reduce((acc, octet) => ((acc << 8) | octet) >>> 0, 0);
}

export function ipv4ToInt(ip: string): number {
  const parsed = tryIpv4ToInt(ip);
  if (parsed === null) {
    throw new Error(`Invalid IP: ${ip}`);
  }
  return parsed;
}

export function intToIpv4(value: number): string {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".");
}

export function isValidCidr(value: string): boolean {
  const [ip, prefixText] = value.split("/");
  if (!ip || prefixText === undefined) return false;
  if (!isValidIpv4(ip)) return false;
  if (!/^\d+$/.test(prefixText)) return false;
  const prefix = Number(prefixText);
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= 32;
}

export function parseCidrRange(cidr: string): ParsedCidrRange | null {
  if (!isValidCidr(cidr)) return null;

  const [ip, prefixText] = cidr.split("/");
  const prefix = Number(prefixText);
  const ipInt = ipv4ToInt(ip);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;

  return {
    ip,
    prefix,
    network,
    broadcast,
  };
}

export function canonicalizeCidr(cidr: string): string | null {
  const parsed = parseCidrRange(cidr);
  if (!parsed) return null;
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

export function cidrOverlap(a: ParsedCidrRange, b: ParsedCidrRange): boolean {
  return a.network <= b.broadcast && b.network <= a.broadcast;
}

export function usableHostsForPrefix(prefix: number, role: SegmentRole = "OTHER"): number {
  if (prefix === 32) return role === "LOOPBACK" ? 1 : 0;
  if (prefix === 31) return role === "WAN_TRANSIT" ? 2 : 0;
  if (prefix < 0 || prefix > 32) return 0;
  return Math.max(0, 2 ** (32 - prefix) - 2);
}

export function firstUsableIp(parsed: ParsedCidrRange, role: SegmentRole = "OTHER"): string | null {
  if (parsed.prefix === 32) return role === "LOOPBACK" ? intToIpv4(parsed.network) : null;
  if (parsed.prefix === 31) return role === "WAN_TRANSIT" ? intToIpv4(parsed.network) : null;
  if (parsed.prefix >= 31) return null;
  return intToIpv4(parsed.network + 1);
}

export function lastUsableIp(parsed: ParsedCidrRange, role: SegmentRole = "OTHER"): string | null {
  if (parsed.prefix === 32) return role === "LOOPBACK" ? intToIpv4(parsed.network) : null;
  if (parsed.prefix === 31) return role === "WAN_TRANSIT" ? intToIpv4(parsed.broadcast) : null;
  if (parsed.prefix >= 31) return null;
  return intToIpv4(parsed.broadcast - 1);
}

export function subnetFacts(cidr: string, role: SegmentRole = "OTHER") {
  const parsed = parseCidrRange(cidr);
  if (!parsed) return null;

  return {
    parsed,
    canonicalCidr: `${intToIpv4(parsed.network)}/${parsed.prefix}`,
    networkAddress: intToIpv4(parsed.network),
    broadcastAddress: intToIpv4(parsed.broadcast),
    firstUsableIp: firstUsableIp(parsed, role),
    lastUsableIp: lastUsableIp(parsed, role),
    dottedMask: dottedMaskFromPrefix(parsed.prefix),
    wildcardMask: wildcardMaskFromPrefix(parsed.prefix),
    totalAddresses: 2 ** (32 - parsed.prefix),
    usableAddresses: usableHostsForPrefix(parsed.prefix, role),
  };
}

export function subnetWithinBlock(subnetCidr?: string, parentBlockCidr?: string) {
  const subnet = subnetCidr ? parseCidrRange(subnetCidr) : null;
  const parent = parentBlockCidr ? parseCidrRange(parentBlockCidr) : null;
  if (!subnet || !parent) return null;
  return subnet.network >= parent.network && subnet.broadcast <= parent.broadcast;
}
