export interface ParsedIpv6Cidr {
  input: string;
  canonicalCidr: string;
  address: bigint;
  network: bigint;
  lastAddress: bigint;
  prefix: number;
  addressHex: string;
  networkHex: string;
  lastAddressHex: string;
}

const IPV6_BITS = 128n;
const MAX_IPV6 = (1n << IPV6_BITS) - 1n;

function assertPrefix(prefix: number) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) {
    throw new Error(`Invalid IPv6 prefix: ${prefix}`);
  }
}

function expandIpv4Tail(address: string): string {
  if (!address.includes('.')) return address;
  const pieces = address.split(':');
  const ipv4 = pieces.pop();
  if (!ipv4) throw new Error(`Invalid IPv6 address: ${address}`);
  const octets = ipv4.split('.').map((item) => Number(item));
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    throw new Error(`Invalid embedded IPv4 address: ${address}`);
  }
  const high = ((octets[0] << 8) | octets[1]).toString(16);
  const low = ((octets[2] << 8) | octets[3]).toString(16);
  return [...pieces, high, low].join(':');
}

function parseIpv6Address(address: string): bigint {
  const normalized = expandIpv4Tail(address.trim().toLowerCase());
  if (!normalized || normalized.includes(':::')) throw new Error(`Invalid IPv6 address: ${address}`);
  const doubleColonCount = (normalized.match(/::/g) ?? []).length;
  if (doubleColonCount > 1) throw new Error(`Invalid IPv6 address: ${address}`);

  const [leftRaw, rightRaw = ''] = normalized.split('::');
  const left = leftRaw ? leftRaw.split(':') : [];
  const right = rightRaw ? rightRaw.split(':') : [];
  const explicitParts = [...left, ...right];
  if (explicitParts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) {
    throw new Error(`Invalid IPv6 address: ${address}`);
  }

  const missingGroups = doubleColonCount === 1 ? 8 - explicitParts.length : 0;
  const groups = doubleColonCount === 1
    ? [...left, ...Array(missingGroups).fill('0'), ...right]
    : explicitParts;
  if (groups.length !== 8) throw new Error(`Invalid IPv6 address: ${address}`);

  return groups.reduce((value, group) => (value << 16n) + BigInt(parseInt(group, 16)), 0n);
}

function hexGroups(value: bigint): string[] {
  const groups: string[] = [];
  for (let index = 7; index >= 0; index -= 1) {
    groups.push(Number((value >> BigInt(index * 16)) & 0xffffn).toString(16));
  }
  return groups;
}

export function ipv6ToCompressed(value: bigint): string {
  if (value < 0n || value > MAX_IPV6) throw new Error('IPv6 integer is outside the 128-bit range.');
  const groups = hexGroups(value);
  let bestStart = -1;
  let bestLength = 0;
  for (let index = 0; index < groups.length;) {
    if (groups[index] !== '0') { index += 1; continue; }
    let end = index;
    while (end < groups.length && groups[end] === '0') end += 1;
    const length = end - index;
    if (length > bestLength && length > 1) {
      bestStart = index;
      bestLength = length;
    }
    index = end;
  }
  if (bestStart === -1) return groups.join(':');
  const left = groups.slice(0, bestStart).join(':');
  const right = groups.slice(bestStart + bestLength).join(':');
  if (!left && !right) return '::';
  if (!left) return `::${right}`;
  if (!right) return `${left}::`;
  return `${left}::${right}`;
}

export function ipv6ToHex(value: bigint): string {
  return hexGroups(value).map((group) => group.padStart(4, '0')).join(':');
}

export function ipv6BlockSize(prefix: number): bigint {
  assertPrefix(prefix);
  return 1n << BigInt(128 - prefix);
}

export function parseIpv6Cidr(input: string): ParsedIpv6Cidr {
  const [addressText, prefixText] = input.trim().split('/');
  const prefix = Number(prefixText);
  assertPrefix(prefix);
  if (!addressText || prefixText === undefined) throw new Error(`Invalid IPv6 CIDR: ${input}`);
  const address = parseIpv6Address(addressText);
  const blockSize = ipv6BlockSize(prefix);
  const network = (address / blockSize) * blockSize;
  const lastAddress = network + blockSize - 1n;
  return {
    input,
    canonicalCidr: `${ipv6ToCompressed(network)}/${prefix}`,
    address,
    network,
    lastAddress,
    prefix,
    addressHex: ipv6ToHex(address),
    networkHex: ipv6ToHex(network),
    lastAddressHex: ipv6ToHex(lastAddress),
  };
}

export function ipv6CidrsOverlap(left: ParsedIpv6Cidr, right: ParsedIpv6Cidr): boolean {
  return left.network <= right.lastAddress && right.network <= left.lastAddress;
}

export function ipv6Contains(parent: ParsedIpv6Cidr, child: ParsedIpv6Cidr): boolean {
  return child.network >= parent.network && child.lastAddress <= parent.lastAddress;
}

export function classifyIpv6PrefixUse(parsed: ParsedIpv6Cidr) {
  const notes: string[] = [];
  const isUla = parsed.network >= parseIpv6Cidr('fc00::/7').network && parsed.network <= parseIpv6Cidr('fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff/7').lastAddress;
  const isDocumentation = ipv6Contains(parseIpv6Cidr('2001:db8::/32'), parsed);
  const isLinkLocal = ipv6Contains(parseIpv6Cidr('fe80::/10'), parsed);
  const lanPrefixStandard = parsed.prefix === 64 ? 'standard' : parsed.prefix < 64 ? 'too-broad-for-lan' : 'too-narrow-for-general-lan';
  const pointToPointStandard = parsed.prefix === 127 ? 'standard' : 'review';
  if (isDocumentation) notes.push('2001:db8::/32 is documentation-only and must not be used as a production allocation.');
  if (isLinkLocal) notes.push('fe80::/10 is link-local and is not a routed site allocation block.');
  if (parsed.prefix !== 64) notes.push('IPv6 LAN segments normally require /64; do not size IPv6 LANs by host count.');
  return { isUla, isDocumentation, isLinkLocal, lanPrefixStandard, pointToPointStandard, notes };
}

export interface Ipv6UsedRange {
  start: bigint;
  end: bigint;
}

export interface Ipv6FreeRange {
  start: bigint;
  end: bigint;
  totalAddresses: string;
  rangeSummary: string;
}

export function normalizeIpv6UsedRanges(ranges: Ipv6UsedRange[]): Ipv6UsedRange[] {
  const sorted = ranges
    .filter((range) => range.start >= 0n && range.end <= MAX_IPV6 && range.start <= range.end)
    .map((range) => ({ start: range.start, end: range.end }))
    .sort((left, right) => left.start < right.start ? -1 : left.start > right.start ? 1 : 0);

  const merged: Ipv6UsedRange[] = [];
  for (const current of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push({ ...current });
      continue;
    }
    if (current.start <= previous.end + 1n) {
      previous.end = current.end > previous.end ? current.end : previous.end;
      continue;
    }
    merged.push({ ...current });
  }
  return merged;
}

export function clipIpv6UsedRangesToParent(parent: ParsedIpv6Cidr, ranges: Ipv6UsedRange[]): Ipv6UsedRange[] {
  const clipped: Ipv6UsedRange[] = [];
  for (const range of ranges) {
    const start = range.start > parent.network ? range.start : parent.network;
    const end = range.end < parent.lastAddress ? range.end : parent.lastAddress;
    if (start <= end) clipped.push({ start, end });
  }
  return normalizeIpv6UsedRanges(clipped);
}

export function summarizeIpv6Range(start: bigint, end: bigint): string {
  if (start === end) return `${ipv6ToCompressed(start)}/128`;
  return `${ipv6ToCompressed(start)} - ${ipv6ToCompressed(end)}`;
}

export function calculateIpv6FreeRanges(parent: ParsedIpv6Cidr, ranges: Ipv6UsedRange[]): Ipv6FreeRange[] {
  const normalized = clipIpv6UsedRangesToParent(parent, ranges);
  const freeRanges: Ipv6FreeRange[] = [];
  let cursor = parent.network;
  for (const used of normalized) {
    if (cursor < used.start) {
      const start = cursor;
      const end = used.start - 1n;
      freeRanges.push({ start, end, totalAddresses: (end - start + 1n).toString(), rangeSummary: summarizeIpv6Range(start, end) });
    }
    cursor = used.end + 1n > cursor ? used.end + 1n : cursor;
  }
  if (cursor <= parent.lastAddress) {
    const start = cursor;
    const end = parent.lastAddress;
    freeRanges.push({ start, end, totalAddresses: (end - start + 1n).toString(), rangeSummary: summarizeIpv6Range(start, end) });
  }
  return freeRanges;
}

function alignIpv6Network(candidate: bigint, prefix: number): bigint {
  const size = ipv6BlockSize(prefix);
  return candidate % size === 0n ? candidate : ((candidate / size) + 1n) * size;
}

export function findNextAvailableIpv6Prefix(parent: ParsedIpv6Cidr, prefix: number, usedRanges: Ipv6UsedRange[]) {
  assertPrefix(prefix);
  if (prefix < parent.prefix) {
    return {
      status: 'blocked' as const,
      reason: 'prefix-outside-parent' as const,
      allocatorExplanation: `Requested IPv6 /${prefix} cannot fit inside parent ${parent.canonicalCidr}.`,
      freeRanges: calculateIpv6FreeRanges(parent, usedRanges),
    };
  }

  const blockSize = ipv6BlockSize(prefix);
  const freeRanges = calculateIpv6FreeRanges(parent, usedRanges);
  for (const free of freeRanges) {
    const network = alignIpv6Network(free.start, prefix);
    const lastAddress = network + blockSize - 1n;
    if (network >= free.start && lastAddress <= free.end) {
      const proposed = parseIpv6Cidr(`${ipv6ToCompressed(network)}/${prefix}`);
      return {
        status: 'allocated' as const,
        proposed,
        allocatorExplanation: `Allocated ${proposed.canonicalCidr} from IPv6 parent ${parent.canonicalCidr}; largest free range before allocation was ${free.rangeSummary}.`,
        freeRanges,
      };
    }
  }
  return {
    status: 'blocked' as const,
    reason: 'parent-exhausted' as const,
    allocatorExplanation: `No free IPv6 /${prefix} remains inside parent ${parent.canonicalCidr}.`,
    freeRanges,
  };
}
