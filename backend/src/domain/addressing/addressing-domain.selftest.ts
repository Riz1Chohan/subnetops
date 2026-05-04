import assert from "node:assert/strict";
import {
  canonicalCidr,
  cidrsOverlap,
  containsIp,
  describeSubnet,
  dottedMaskFromPrefix,
  firstUsableIp,
  intToIpv4,
  isBroadcastAddress,
  isNetworkAddress,
  isUsableHostIp,
  isValidIpv4,
  lastUsableIp,
  parseCidr,
  recommendedCapacityPlanForHosts,
  recommendedPrefixForHosts,
  usableHostCount,
  validateGatewayForSubnet,
  wildcardMaskFromPrefix,
} from "./cidr.js";
import {
  allocateRequestedBlocks,
  calculateFreeRanges,
  canChildFitInsideParent,
  chooseGatewayForSubnet,
  clipUsedRangesToParent,
  findNextAvailableNetwork,
  findNextAvailableNetworkDetailed,
  normalizeUsedRanges,
  summarizeAllocationCapacity,
} from "./allocation-fit.js";
import {
  calculateIpv6FreeRanges,
  classifyIpv6PrefixUse,
  findNextAvailableIpv6Prefix,
  ipv6Contains,
  ipv6CidrsOverlap,
  parseIpv6Cidr,
} from "./ipv6.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

run("IPv4 parser accepts valid CIDR and rejects malformed input", () => {
  assert.equal(isValidIpv4("10.0.0.1"), true);
  assert.equal(isValidIpv4("010.0.0.1"), false);
  assert.equal(isValidIpv4("256.0.0.1"), false);
  assert.equal(canonicalCidr("10.0.1.20/24"), "10.0.1.0/24");
  assert.throws(() => parseCidr("10.0.0.0"));
  assert.throws(() => parseCidr("10.0.0.0/33"));
  assert.throws(() => parseCidr("10.0.0.0/024"));
  assert.throws(() => parseCidr("10.0.0.0/24/extra"));
});

run("IPv4 subnet facts are canonical and unsigned-safe", () => {
  const parsed = parseCidr("192.168.10.99/24");
  const facts = describeSubnet(parsed, "USER");
  assert.equal(facts.canonicalCidr, "192.168.10.0/24");
  assert.equal(facts.networkAddress, "192.168.10.0");
  assert.equal(facts.broadcastAddress, "192.168.10.255");
  assert.equal(facts.firstUsableIp, "192.168.10.1");
  assert.equal(facts.lastUsableIp, "192.168.10.254");
  assert.equal(dottedMaskFromPrefix(24), "255.255.255.0");
  assert.equal(wildcardMaskFromPrefix(24), "0.0.0.255");
  assert.equal(containsIp(parsed, "192.168.10.44"), true);
  assert.equal(containsIp(parsed, "192.168.11.44"), false);
  assert.equal(isNetworkAddress(parsed, "192.168.10.0"), true);
  assert.equal(isBroadcastAddress(parsed, "192.168.10.255"), true);
});

run("IPv4 /30, /31, and /32 behavior stays role-aware", () => {
  assert.equal(usableHostCount(parseCidr("10.0.0.4/30"), "USER"), 2);
  assert.equal(firstUsableIp(parseCidr("10.0.0.4/30"), "USER"), "10.0.0.5");
  assert.equal(lastUsableIp(parseCidr("10.0.0.4/30"), "USER"), "10.0.0.6");
  assert.equal(usableHostCount(parseCidr("10.0.0.8/31"), "WAN_TRANSIT"), 2);
  assert.equal(isUsableHostIp(parseCidr("10.0.0.8/31"), "10.0.0.8", "WAN_TRANSIT"), true);
  assert.equal(isUsableHostIp(parseCidr("10.0.0.8/31"), "10.0.0.8", "USER"), false);
  assert.equal(usableHostCount(parseCidr("10.0.0.9/32"), "LOOPBACK"), 1);
  assert.equal(isUsableHostIp(parseCidr("10.0.0.9/32"), "10.0.0.9", "LOOPBACK"), true);
  assert.equal(isUsableHostIp(parseCidr("10.0.0.9/32"), "10.0.0.9", "USER"), false);
});

run("IPv4 overlap, containment, gateway, and capacity checks are strict", () => {
  const parent = parseCidr("10.10.0.0/24");
  assert.equal(cidrsOverlap(parent, parseCidr("10.10.0.128/25")), true);
  assert.equal(cidrsOverlap(parent, parseCidr("10.10.1.0/24")), false);
  assert.equal(validateGatewayForSubnet(parent, "10.10.0.1", "USER").status, "usable");
  assert.equal(validateGatewayForSubnet(parent, "10.10.0.0", "USER").status, "network-address");
  assert.equal(validateGatewayForSubnet(parent, "10.10.0.255", "USER").status, "broadcast-address");
  assert.equal(validateGatewayForSubnet(parent, "10.10.1.1", "USER").status, "outside-subnet");
  assert.equal(recommendedPrefixForHosts(2, "WAN_TRANSIT"), 31);
  assert.equal(recommendedPrefixForHosts(1, "LOOPBACK"), 32);
  const plan = recommendedCapacityPlanForHosts(50, "USER");
  assert.equal(plan.requiredUsableHosts, 65);
  assert.equal(plan.recommendedPrefix, 25);
});

run("IPv4 allocator clips invalid parent relationships and reports fit honestly", () => {
  const parent = parseCidr("10.20.0.0/24");
  const clipped = clipUsedRangesToParent(parent, [
    { start: parseCidr("10.19.255.0/24").network, end: parseCidr("10.20.0.63/26").broadcast },
    { start: parseCidr("10.20.0.128/25").network, end: parseCidr("10.20.1.127/25").broadcast },
  ]);
  assert.deepEqual(clipped, [
    { start: parseCidr("10.20.0.0/26").network, end: parseCidr("10.20.0.63/26").broadcast },
    { start: parseCidr("10.20.0.128/25").network, end: parseCidr("10.20.0.255/24").broadcast },
  ]);

  const normalized = normalizeUsedRanges([
    { start: parseCidr("10.20.0.64/26").network, end: parseCidr("10.20.0.64/26").broadcast },
    { start: parseCidr("10.20.0.0/26").network, end: parseCidr("10.20.0.0/26").broadcast },
  ]);
  assert.equal(normalized.length, 1);
  assert.equal(findNextAvailableNetwork(parent, 26, normalized)?.original, "10.20.0.128/26");
  assert.equal(findNextAvailableNetworkDetailed(parent, 23, []).reason, "prefix-outside-parent");
  assert.equal(canChildFitInsideParent(parent, 26), true);
  assert.equal(canChildFitInsideParent(parent, 23), false);
});

run("IPv4 allocator proposes deterministic blocks and gateway choices", () => {
  const parent = parseCidr("10.30.0.0/24");
  const result = allocateRequestedBlocks(parent, [
    { start: parseCidr("10.30.0.0/26").network, end: parseCidr("10.30.0.0/26").broadcast },
  ], [
    { requestId: "users", prefix: 26, role: "USER" },
    { requestId: "voice", prefix: 27, role: "VOICE" },
  ], { preferredGatewayConvention: "last-usable" });
  assert.equal(result.results[0]?.status, "allocated");
  assert.equal(result.results[0]?.proposedSubnetCidr, "10.30.0.64/26");
  assert.equal(result.results[0]?.proposedGatewayIp, "10.30.0.126");
  assert.equal(result.results[1]?.proposedSubnetCidr, "10.30.0.128/27");
  assert.equal(chooseGatewayForSubnet(parseCidr("10.40.0.0/24"), "USER", "first-usable"), "10.40.0.1");
  assert.equal(chooseGatewayForSubnet(parseCidr("10.40.0.0/24"), "USER", "last-usable"), "10.40.0.254");
});

run("IPv4 free-range summaries expose utilization and largest space", () => {
  const parent = parseCidr("10.50.0.0/24");
  const used = [
    { start: parseCidr("10.50.0.0/26").network, end: parseCidr("10.50.0.0/26").broadcast },
    { start: parseCidr("10.50.0.128/26").network, end: parseCidr("10.50.0.128/26").broadcast },
  ];
  const ranges = calculateFreeRanges(parent, used);
  const summary = summarizeAllocationCapacity(parent, used, 26);
  assert.equal(ranges.length, 2);
  assert.equal(ranges[0]?.rangeSummary, "10.50.0.64 - 10.50.0.127");
  assert.equal(summary.usedAddresses, 128);
  assert.equal(summary.freeAddresses, 128);
  assert.equal(summary.utilizationPercent, 50);
  assert.equal(summary.largestFreeRange?.rangeSummary, "10.50.0.64 - 10.50.0.127");
});

run("IPv6 CIDR parsing, containment, overlap, and free ranges are deterministic", () => {
  const parent = parseIpv6Cidr("fd00:1234::/48");
  const child = parseIpv6Cidr("fd00:1234::/64");
  const sibling = parseIpv6Cidr("fd00:1234:0:1::/64");
  assert.equal(parent.canonicalCidr, "fd00:1234::/48");
  assert.equal(child.canonicalCidr, "fd00:1234::/64");
  assert.equal(ipv6Contains(parent, child), true);
  assert.equal(ipv6CidrsOverlap(child, sibling), false);
  assert.equal(classifyIpv6PrefixUse(child).isUla, true);
  const next = findNextAvailableIpv6Prefix(parent, 64, [{ start: child.network, end: child.lastAddress }]);
  assert.equal(next.status, "allocated");
  assert.equal(next.proposed?.canonicalCidr, "fd00:1234:0:1::/64");
  const freeRanges = calculateIpv6FreeRanges(child, [{ start: child.network, end: child.lastAddress }]);
  assert.equal(freeRanges.length, 0);
});

console.log("\nAddressing domain self-test complete.");
