import {
  canonicalizeCidr,
  cidrOverlap,
  dottedMaskFromPrefix,
  firstUsableIp,
  intToIpv4,
  ipv4ToInt,
  isValidCidr,
  isValidIpv4,
  lastUsableIp,
  parseCidrRange,
  subnetFacts,
  subnetWithinBlock,
  tryIpv4ToInt,
  usableHostsForPrefix,
  wildcardMaskFromPrefix,
  type ParsedCidrRange,
  type SegmentRole,
} from "./cidrCore";

export type { ParsedCidrRange, SegmentRole };
export {
  canonicalizeCidr,
  cidrOverlap,
  dottedMaskFromPrefix,
  firstUsableIp,
  intToIpv4,
  ipv4ToInt,
  isValidCidr,
  isValidIpv4,
  lastUsableIp,
  parseCidrRange,
  subnetFacts,
  subnetWithinBlock,
  tryIpv4ToInt,
  usableHostsForPrefix,
  wildcardMaskFromPrefix,
};

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

export function parsePrefixFromCidr(cidr: string): number | null {
  if (!isValidCidr(cidr)) return null;
  return Number(cidr.split("/")[1]);
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
