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

export function usableHostsForPrefix(prefix: number): number {
  if (prefix >= 31) return 0;
  return Math.max(0, 2 ** (32 - prefix) - 2);
}

export function parsePrefixFromCidr(cidr: string): number | null {
  if (!isValidCidr(cidr)) return null;
  return Number(cidr.split("/")[1]);
}

export function recommendedPrefixForHosts(hosts: number): number {
  const target = Math.max(2, Math.ceil(hosts * 1.25));
  for (let prefix = 30; prefix >= 1; prefix -= 1) {
    if (usableHostsForPrefix(prefix) >= target) return prefix;
  }
  return 1;
}

export function planningHintForHosts(hosts?: number) {
  if (typeof hosts !== "number" || Number.isNaN(hosts) || hosts <= 0) return null;
  const recommendedPrefix = recommendedPrefixForHosts(hosts);
  const usableHosts = usableHostsForPrefix(recommendedPrefix);
  return {
    recommendedPrefix,
    usableHosts,
    reserveBuffer: Math.max(0, usableHosts - hosts),
  };
}

export function utilizationForCidr(cidr: string, estimatedHosts?: number) {
  const prefix = parsePrefixFromCidr(cidr);
  if (prefix === null || typeof estimatedHosts !== "number" || estimatedHosts <= 0) return null;
  const usable = usableHostsForPrefix(prefix);
  if (usable <= 0) return null;
  const utilization = estimatedHosts / usable;
  return {
    prefix,
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

export function cidrOverlap(a: ParsedCidrRange, b: ParsedCidrRange): boolean {
  return a.network <= b.broadcast && b.network <= a.broadcast;
}

export function suggestSubnetWithinBlock(siteBlockCidr?: string, existingSubnetCidrs: string[] = [], estimatedHosts?: number) {
  if (!siteBlockCidr || typeof estimatedHosts !== "number" || estimatedHosts <= 0) return null;
  const siteBlock = parseCidrRange(siteBlockCidr);
  if (!siteBlock) return null;

  const prefix = recommendedPrefixForHosts(estimatedHosts);
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
        gatewayIp: `${intToIpv4(candidate.network + 1)}`,
        usableHosts: usableHostsForPrefix(prefix),
      };
    }
    candidateNetwork += step;
  }

  return null;
}
