export interface ParsedCidr {
  original: string;
  ip: string;
  prefix: number;
  mask: number;
  network: number;
  broadcast: number;
}

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
  const network = ipInt & mask;
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

export function containsIp(cidr: ParsedCidr, ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  return ipInt >= cidr.network && ipInt <= cidr.broadcast;
}

export function cidrsOverlap(a: ParsedCidr, b: ParsedCidr): boolean {
  return a.network <= b.broadcast && b.network <= a.broadcast;
}

export function usableHostCount(cidr: ParsedCidr): number {
  if (cidr.prefix >= 31) return 0;
  return Math.max(0, 2 ** (32 - cidr.prefix) - 2);
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


export function recommendedPrefixForHosts(hosts: number): number {
  const target = Math.max(2, Math.ceil(hosts * 1.25));
  for (let prefix = 30; prefix >= 1; prefix -= 1) {
    if (usableHostCount(parseCidr(`0.0.0.0/${prefix}`)) >= target) return prefix;
  }
  return 1;
}
