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
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

export function ipv4ToInt(ip: string): number {
  if (!isValidIpv4(ip)) throw new Error(`Invalid IP: ${ip}`);
  return ip.split(".").map(Number).reduce((acc, octet) => ((acc << 8) | octet) >>> 0, 0);
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
  const [ip, prefix] = value.split("/");
  if (!ip || prefix === undefined) return false;
  if (!isValidIpv4(ip)) return false;
  if (!/^\d+$/.test(prefix)) return false;
  const n = Number(prefix);
  return n >= 0 && n <= 32;
}

export function classifySegmentRole(input?: string): SegmentRole {
  const text = (input || "").toLowerCase();
  if (!text.trim()) return "OTHER";
  if (text.includes("guest")) return "GUEST";
  if (text.includes("server") || text.includes("dmz")) return "SERVER";
  if (text.includes("management") || text.includes("mgmt") || text.includes("admin-mgmt")) return "MANAGEMENT";
  if (text.includes("voice") || text.includes("voip")) return "VOICE";
  if (text.includes("printer") || text.includes("print")) return "PRINTER";
  if (text.includes("iot") || text.includes("medical") || text.includes("lab") || text.includes("ot")) return "IOT";
  if (text.includes("camera") || text.includes("cctv") || text.includes("surveillance")) return "CAMERA";
  if (text.includes("wan") || text.includes("transit") || text.includes("p2p") || text.includes("point-to-point")) return "WAN_TRANSIT";
  if (text.includes("loopback") || text.includes("lo0")) return "LOOPBACK";
  if (text.includes("user") || text.includes("staff") || text.includes("client") || text.includes("admin")) return "USER";
  return "OTHER";
}

export function usableHostsForPrefix(prefix: number, role: SegmentRole = "OTHER"): number {
  if (prefix === 32) return role === "LOOPBACK" ? 1 : 0;
  if (prefix === 31) return role === "WAN_TRANSIT" ? 2 : 0;
  if (prefix < 0 || prefix > 32) return 0;
  return Math.max(0, 2 ** (32 - prefix) - 2);
}

export function parsePrefixFromCidr(cidr: string): number | null {
  if (!isValidCidr(cidr)) return null;
  return Number(cidr.split("/")[1]);
}

export function dottedMaskFromPrefix(prefix: number): string {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return intToIpv4(mask);
}

export function wildcardMaskFromPrefix(prefix: number): string {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return intToIpv4((~mask >>> 0) >>> 0);
}

export function recommendedPrefixForHosts(hosts: number, role: SegmentRole = "OTHER"): number {
  const bufferMultiplier = role === "USER" || role === "GUEST" || role === "VOICE" ? 1.3 : 1.2;
  const minimumRequired = role === "WAN_TRANSIT" ? 2 : role === "LOOPBACK" ? 1 : 2;
  const target = Math.max(minimumRequired, Math.ceil(hosts * bufferMultiplier));

  if (role === "LOOPBACK") return 32;
  if (role === "WAN_TRANSIT" && target <= 2) return 31;

  for (let prefix = 30; prefix >= 1; prefix -= 1) {
    if (usableHostsForPrefix(prefix, role) >= target) return prefix;
  }
  return 1;
}

export function planningHintForHosts(hosts?: number, role: SegmentRole = "OTHER") {
  if (typeof hosts !== "number" || Number.isNaN(hosts) || hosts <= 0) return null;
  const recommendedPrefix = recommendedPrefixForHosts(hosts, role);
  const usableHosts = usableHostsForPrefix(recommendedPrefix, role);
  return {
    recommendedPrefix,
    usableHosts,
    reserveBuffer: Math.max(0, usableHosts - hosts),
  };
}

export function utilizationForCidr(cidr: string, estimatedHosts?: number, role: SegmentRole = "OTHER") {
  const parsed = parseCidrRange(cidr);
  if (!parsed || typeof estimatedHosts !== "number" || estimatedHosts <= 0) return null;
  const usable = usableHostsForPrefix(parsed.prefix, role);
  if (usable <= 0) return null;
  const utilization = estimatedHosts / usable;
  return {
    prefix: parsed.prefix,
    usable,
    estimatedHosts,
    headroom: Math.max(0, usable - estimatedHosts),
    utilization,
  };
}

export interface ParsedCidrRange {
  ip: string;
  prefix: number;
  network: number;
  broadcast: number;
}

export function parseCidrRange(cidr: string): ParsedCidrRange | null {
  if (!isValidCidr(cidr)) return null;
  const [ip, prefixText] = cidr.split("/");
  const prefix = Number(prefixText);
  const ipInt = ipv4ToInt(ip);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = ipInt & mask;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  return { ip, prefix, network, broadcast };
}

export function canonicalizeCidr(cidr: string): string | null {
  const parsed = parseCidrRange(cidr);
  if (!parsed) return null;
  return `${intToIpv4(parsed.network)}/${parsed.prefix}`;
}

export function cidrOverlap(a: ParsedCidrRange, b: ParsedCidrRange): boolean {
  return a.network <= b.broadcast && b.network <= a.broadcast;
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
  const canonical = canonicalizeCidr(cidr)!;
  return {
    parsed,
    canonicalCidr: canonical,
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

export function suggestSubnetWithinBlock(siteBlockCidr?: string, existingSubnetCidrs: string[] = [], estimatedHosts?: number, role: SegmentRole = "OTHER") {
  if (!siteBlockCidr || typeof estimatedHosts !== "number" || estimatedHosts <= 0) return null;
  const siteBlock = parseCidrRange(siteBlockCidr);
  if (!siteBlock) return null;

  const prefix = recommendedPrefixForHosts(estimatedHosts, role);
  if (prefix < siteBlock.prefix) return null;

  const step = 2 ** (32 - prefix);
  const existing = existingSubnetCidrs.map(parseCidrRange).filter((item): item is ParsedCidrRange => Boolean(item));

  let candidateNetwork = siteBlock.network;
  while (candidateNetwork + step - 1 <= siteBlock.broadcast) {
    const candidate: ParsedCidrRange = {
      ip: intToIpv4(candidateNetwork),
      prefix,
      network: candidateNetwork,
      broadcast: candidateNetwork + step - 1,
    };
    const overlaps = existing.some((item) => cidrOverlap(candidate, item));
    if (!overlaps) {
      return {
        subnetCidr: `${intToIpv4(candidate.network)}/${prefix}`,
        gatewayIp: role === "WAN_TRANSIT" ? intToIpv4(candidate.network) : intToIpv4(candidate.network + 1),
        usableHosts: usableHostsForPrefix(prefix, role),
      };
    }
    candidateNetwork += step;
  }

  return null;
}
