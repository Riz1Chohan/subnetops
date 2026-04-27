import assert from "node:assert/strict";
import {
  canonicalCidr,
  cidrsOverlap,
  containsIp,
  describeSubnet,
  parseCidr,
  recommendedPrefixForHosts,
  usableHostCount,
} from "./cidr.js";
import {
  allocateRequestedBlocks,
  clipUsedRangesToParent,
  findNextAvailableNetwork,
  findNextAvailableNetworkDetailed,
  normalizeUsedRanges,
  type BlockAllocationRequest,
  type UsedRange,
} from "./addressAllocator.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

function range(cidr: string): UsedRange {
  const parsed = parseCidr(cidr);
  return { start: parsed.network, end: parsed.broadcast };
}

run("canonicalization normalizes misaligned user, transit, and loopback CIDRs", () => {
  assert.equal(canonicalCidr("10.20.30.14/24"), "10.20.30.0/24");
  assert.equal(canonicalCidr("10.20.30.7/31"), "10.20.30.6/31");
  assert.equal(canonicalCidr("10.20.30.9/32"), "10.20.30.9/32");
});

run("overlap detection distinguishes containment, adjacency, and separation", () => {
  assert.equal(cidrsOverlap(parseCidr("10.0.0.0/23"), parseCidr("10.0.1.0/24")), true);
  assert.equal(cidrsOverlap(parseCidr("10.0.0.0/24"), parseCidr("10.0.1.0/24")), false);
  assert.equal(cidrsOverlap(parseCidr("10.0.0.0/31"), parseCidr("10.0.0.2/31")), false);
});

run("usable host calculations stay role-aware at edge prefixes", () => {
  assert.equal(usableHostCount(parseCidr("10.0.0.0/30"), "USER"), 2);
  assert.equal(usableHostCount(parseCidr("10.0.0.0/31"), "WAN_TRANSIT"), 2);
  assert.equal(usableHostCount(parseCidr("10.0.0.0/31"), "MANAGEMENT"), 0);
  assert.equal(usableHostCount(parseCidr("10.0.0.5/32"), "LOOPBACK"), 1);
});

run("containsIp respects first and last usable boundaries without escaping the subnet", () => {
  const subnet = parseCidr("10.50.60.0/26");
  const detail = describeSubnet(subnet, "USER");
  assert.equal(containsIp(subnet, detail.firstUsableIp ?? ""), true);
  assert.equal(containsIp(subnet, detail.lastUsableIp ?? ""), true);
  assert.equal(containsIp(subnet, "10.50.60.64"), false);
});

run("recommended prefix behavior stays deterministic at common threshold boundaries", () => {
  assert.equal(recommendedPrefixForHosts(62, "USER"), 25);
  assert.equal(recommendedPrefixForHosts(63, "USER"), 24);
  assert.equal(recommendedPrefixForHosts(64, "MANAGEMENT"), 25);
  assert.equal(recommendedPrefixForHosts(2, "WAN_TRANSIT"), 31);
  assert.equal(recommendedPrefixForHosts(1, "LOOPBACK"), 32);
});

run("used-range normalization merges overlaps and adjacencies consistently", () => {
  const normalized = normalizeUsedRanges([
    range("10.0.0.0/26"),
    range("10.0.0.64/26"),
    range("10.0.0.96/27"),
    range("10.0.1.0/26"),
  ]);

  assert.deepEqual(normalized, [
    { start: parseCidr("10.0.0.0/25").network, end: parseCidr("10.0.0.0/25").broadcast },
    { start: parseCidr("10.0.1.0/26").network, end: parseCidr("10.0.1.0/26").broadcast },
  ]);
});

run("used-range clipping keeps only parent-relevant consumption", () => {
  const parent = parseCidr("10.0.10.0/24");
  const clipped = clipUsedRangesToParent(parent, [
    { start: parseCidr("10.0.9.0/24").network, end: parseCidr("10.0.10.31/27").broadcast },
    { start: parseCidr("10.0.10.128/25").network, end: parseCidr("10.0.11.127/25").broadcast },
    { start: parseCidr("10.0.12.0/24").network, end: parseCidr("10.0.12.255/24").broadcast },
  ]);

  assert.deepEqual(clipped, [
    { start: parseCidr("10.0.10.0/27").network, end: parseCidr("10.0.10.31/27").broadcast },
    { start: parseCidr("10.0.10.128/25").network, end: parseCidr("10.0.10.255/24").broadcast },
  ]);
});

run("next-available allocation remains stable under fragmented but valid free space", () => {
  const parent = parseCidr("10.0.0.0/22");
  const used = [
    range("10.0.0.0/24"),
    range("10.0.1.0/25"),
    range("10.0.3.0/24"),
  ];

  const first = findNextAvailableNetwork(parent, 24, used);
  const second = findNextAvailableNetwork(parent, 24, used);

  assert.equal(first ? canonicalCidr(`${first.ip}/${first.prefix}`) : null, "10.0.2.0/24");
  assert.equal(second ? canonicalCidr(`${second.ip}/${second.prefix}`) : null, "10.0.2.0/24");
});

run("detailed allocator returns explicit blocked reasons for impossible and exhausted cases", () => {
  const impossible = findNextAvailableNetworkDetailed(parseCidr("10.0.0.0/24"), 23, []);
  assert.equal(impossible.status, "blocked");
  assert.equal(impossible.reason, "prefix-outside-parent");

  const exhausted = findNextAvailableNetworkDetailed(parseCidr("10.0.0.0/24"), 26, [
    range("10.0.0.0/26"),
    range("10.0.0.64/26"),
    range("10.0.0.128/26"),
    range("10.0.0.192/26"),
  ]);
  assert.equal(exhausted.status, "blocked");
  assert.equal(exhausted.reason, "parent-exhausted");
});

run("batch allocation stays deterministic and preserves blocked requests without corrupting later valid ones", () => {
  const parent = parseCidr("10.10.0.0/24");
  const used = [range("10.10.0.0/26")];
  const requests: BlockAllocationRequest[] = [
    { requestId: "too-big", prefix: 23, role: "USER" },
    { requestId: "mgmt", prefix: 26, role: "MANAGEMENT" },
    { requestId: "guest", prefix: 26, role: "GUEST" },
  ];

  const first = allocateRequestedBlocks(parent, used, requests, { preferredGatewayConvention: "first-usable" });
  const second = allocateRequestedBlocks(parent, used, requests, { preferredGatewayConvention: "first-usable" });

  assert.deepEqual(first, second);
  assert.deepEqual(first.results, [
    {
      requestId: "too-big",
      status: "blocked",
      reason: "prefix-outside-parent",
      normalizedUsedRangeCount: 1,
    },
    {
      requestId: "mgmt",
      status: "allocated",
      proposedSubnetCidr: "10.10.0.64/26",
      proposedGatewayIp: "10.10.0.65",
      normalizedUsedRangeCount: 1,
    },
    {
      requestId: "guest",
      status: "allocated",
      proposedSubnetCidr: "10.10.0.128/26",
      proposedGatewayIp: "10.10.0.129",
      normalizedUsedRangeCount: 1,
    },
  ]);
});

run("batch allocation respects last-usable gateway preference consistently", () => {
  const parent = parseCidr("10.20.0.0/24");
  const requests: BlockAllocationRequest[] = [
    { requestId: "users", prefix: 26, role: "USER" },
    { requestId: "printers", prefix: 27, role: "PRINTER" },
  ];

  const result = allocateRequestedBlocks(parent, [], requests, { preferredGatewayConvention: "last-usable" });

  assert.deepEqual(result.results, [
    {
      requestId: "users",
      status: "allocated",
      proposedSubnetCidr: "10.20.0.0/26",
      proposedGatewayIp: "10.20.0.62",
      normalizedUsedRangeCount: 0,
    },
    {
      requestId: "printers",
      status: "allocated",
      proposedSubnetCidr: "10.20.0.64/27",
      proposedGatewayIp: "10.20.0.94",
      normalizedUsedRangeCount: 1,
    },
  ]);
});

console.log("\nProof matrix self-test complete.");
