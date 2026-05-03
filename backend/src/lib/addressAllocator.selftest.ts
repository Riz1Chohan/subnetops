import assert from "node:assert/strict";
import { intToIpv4, parseCidr } from "./cidr.js";
import {
  chooseGatewayForSubnet,
  calculateFreeRanges,
  summarizeAllocationCapacity,
  allocateRequestedBlocks,
  canChildFitInsideParent,
  chooseSiteGatewayPreference,
  findNextAvailableNetwork,
  findNextAvailableNetworkDetailed,
  clipUsedRangesToParent,
  normalizeUsedRanges,
  sortAllocationCandidates,
  sortSiteAllocationCandidates,
  type AllocationCandidate,
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

run("site gateway preference follows the site majority convention", () => {
  const preference = chooseSiteGatewayPreference([
    { gatewayConvention: "last-usable" },
    { gatewayConvention: "last-usable" },
    { gatewayConvention: "first-usable" },
  ]);

  assert.equal(preference, "last-usable");
});

run("allocator falls back to first usable when no consistent preference exists", () => {
  const preference = chooseSiteGatewayPreference([
    { gatewayConvention: "custom" },
    { gatewayConvention: "not-applicable" },
  ]);

  assert.equal(preference, "first-usable");
});

run("gateway generation respects a last-usable site preference", () => {
  const gateway = chooseGatewayForSubnet(parseCidr("10.20.30.0/24"), "USER", "last-usable");
  assert.equal(gateway, "10.20.30.254");
});

run("allocator finds the next aligned block after a conflicting range", () => {
  const proposed = findNextAvailableNetwork(parseCidr("10.0.0.0/24"), 26, [
    { start: parseCidr("10.0.0.0/26").network, end: parseCidr("10.0.0.0/26").broadcast },
  ]);

  assert.equal(proposed ? intToIpv4(proposed.network) : null, "10.0.0.64");
});

run("allocation candidate sorting is stable and engineering-oriented", () => {
  const candidates: AllocationCandidate[] = [
    {
      id: "b",
      siteId: "site-1",
      siteName: "HQ",
      siteCode: "HQ",
      vlanId: 20,
      vlanName: "Users",
      role: "USER",
      recommendedPrefix: 26,
      capacityState: "undersized",
      inSiteBlock: false,
    },
    {
      id: "a",
      siteId: "site-1",
      siteName: "HQ",
      siteCode: "HQ",
      vlanId: 10,
      vlanName: "Management",
      role: "MANAGEMENT",
      recommendedPrefix: 26,
      capacityState: "undersized",
      inSiteBlock: false,
    },
  ];

  const ordered = sortAllocationCandidates(candidates).map((item) => item.id);
  assert.deepEqual(ordered, ["a", "b"]);
});

run("site block candidate sorting allocates larger demands first", () => {
  const ordered = sortSiteAllocationCandidates([
    { siteId: "b", siteName: "Branch", siteCode: "BR", requiredAddresses: 256, recommendedPrefix: 23 },
    { siteId: "a", siteName: "HQ", siteCode: "HQ", requiredAddresses: 64, recommendedPrefix: 24 },
    { siteId: "c", siteName: "Clinic", siteCode: "CL", requiredAddresses: 96, recommendedPrefix: 24 },
  ]).map((item) => item.siteId);

  assert.deepEqual(ordered, ["b", "c", "a"]);
});

run("allocator skips fragmented ranges and lands on the next aligned block", () => {
  const proposed = findNextAvailableNetwork(parseCidr("10.0.0.0/22"), 24, [
    { start: parseCidr("10.0.0.0/24").network, end: parseCidr("10.0.0.0/24").broadcast },
    { start: parseCidr("11.0.0.0/25").network, end: parseCidr("11.0.0.0/25").broadcast },
  ]);

  assert.equal(proposed ? intToIpv4(proposed.network) : null, "10.0.2.0");
});


run("allocator normalizer discards invalid used ranges instead of poisoning placement", () => {
  const normalized = normalizeUsedRanges([
    { start: parseCidr("10.0.0.128/25").network, end: parseCidr("10.0.0.0/25").broadcast },
    { start: parseCidr("10.0.0.0/26").network, end: parseCidr("10.0.0.0/26").broadcast },
  ]);

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0]?.start, parseCidr("10.0.0.0/26").network);
});

run("allocator merges overlapping and adjacent used ranges before searching", () => {
  const normalized = normalizeUsedRanges([
    { start: parseCidr("10.0.0.0/26").network, end: parseCidr("10.0.0.0/26").broadcast },
    { start: parseCidr("10.0.0.64/26").network, end: parseCidr("10.0.0.64/26").broadcast },
    { start: parseCidr("10.0.0.32/27").network, end: parseCidr("10.0.0.32/27").broadcast },
  ]);

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0]?.start, parseCidr("10.0.0.0/26").network);
  assert.equal(normalized[0]?.end, parseCidr("10.0.0.64/26").broadcast);
});

run("allocator returns null when the requested block is larger than the parent block", () => {
  const proposed = findNextAvailableNetwork(parseCidr("10.0.0.0/24"), 23, []);
  assert.equal(proposed, null);
});


run("allocator ignores used ranges that sit fully outside the parent block", () => {
  const proposed = findNextAvailableNetwork(parseCidr("10.10.0.0/24"), 26, [
    { start: parseCidr("10.20.0.0/24").network, end: parseCidr("10.20.0.0/24").broadcast },
  ]);

  assert.equal(proposed ? intToIpv4(proposed.network) : null, "10.10.0.0");
});

run("allocator clips partially overlapping used ranges to the parent block", () => {
  const clipped = clipUsedRangesToParent(parseCidr("10.0.0.0/24"), [
    { start: parseCidr("9.255.255.0/24").network, end: parseCidr("10.0.0.63/26").broadcast },
    { start: parseCidr("10.0.0.128/25").network, end: parseCidr("10.0.1.127/25").broadcast },
  ]);

  assert.deepEqual(clipped, [
    { start: parseCidr("10.0.0.0/26").network, end: parseCidr("10.0.0.63/26").broadcast },
    { start: parseCidr("10.0.0.128/25").network, end: parseCidr("10.0.0.255/24").broadcast },
  ]);
});

run("allocator returns null when the parent block is fully exhausted for the requested prefix", () => {
  const proposed = findNextAvailableNetwork(parseCidr("10.0.0.0/24"), 26, [
    { start: parseCidr("10.0.0.0/26").network, end: parseCidr("10.0.0.0/26").broadcast },
    { start: parseCidr("10.0.0.64/26").network, end: parseCidr("10.0.0.64/26").broadcast },
    { start: parseCidr("10.0.0.128/26").network, end: parseCidr("10.0.0.128/26").broadcast },
    { start: parseCidr("10.0.0.192/26").network, end: parseCidr("10.0.0.192/26").broadcast },
  ]);

  assert.equal(proposed, null);
});

run("allocator returns a detailed blocked result when the prefix cannot fit inside the parent", () => {
  const result = findNextAvailableNetworkDetailed(parseCidr("10.0.0.0/24"), 23, []);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "prefix-outside-parent");
});

run("allocator returns a detailed exhausted result when no aligned block remains", () => {
  const result = findNextAvailableNetworkDetailed(parseCidr("10.0.0.0/24"), 26, [
    { start: parseCidr("10.0.0.0/26").network, end: parseCidr("10.0.0.0/26").broadcast },
    { start: parseCidr("10.0.0.64/26").network, end: parseCidr("10.0.0.64/26").broadcast },
    { start: parseCidr("10.0.0.128/26").network, end: parseCidr("10.0.0.128/26").broadcast },
    { start: parseCidr("10.0.0.192/26").network, end: parseCidr("10.0.0.192/26").broadcast },
  ]);

  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "parent-exhausted");
  assert.equal(result.normalizedUsedRangeCount, 1);
});

run("child-fit check returns true only when the requested prefix can live inside the parent", () => {
  assert.equal(canChildFitInsideParent(parseCidr("10.0.0.0/24"), 26), true);
  assert.equal(canChildFitInsideParent(parseCidr("10.0.0.0/24"), 23), false);
});

console.log("\nAddress allocator self-test complete.");

run("allocator explanation is readable and names the requested prefix and parent block", () => {
  const result = findNextAvailableNetworkDetailed(parseCidr("10.44.0.0/24"), 26, []);
  assert.equal(result.status, "allocated");
  assert.match(result.allocatorExplanation, /first available \/26/i);
  assert.match(result.allocatorExplanation, /10\.44\.0\.0\/24/);
});

run("batch allocator keeps working after a blocked request", () => {
  const result = allocateRequestedBlocks(parseCidr("10.50.0.0/24"), [], [
    { requestId: "too-large", prefix: 23, role: "USER" },
    { requestId: "valid", prefix: 26, role: "USER" },
  ]);
  assert.equal(result.results[0]?.status, "blocked");
  assert.equal(result.results[1]?.status, "allocated");
  assert.equal(result.results[1]?.proposedSubnetCidr, "10.50.0.0/26");
});

run("exact-fit parent block allocates deterministically", () => {
  const first = allocateRequestedBlocks(parseCidr("10.60.0.0/26"), [], [{ requestId: "exact", prefix: 26, role: "USER" }]);
  const second = allocateRequestedBlocks(parseCidr("10.60.0.0/26"), [], [{ requestId: "exact", prefix: 26, role: "USER" }]);
  assert.equal(first.results[0]?.proposedSubnetCidr, "10.60.0.0/26");
  assert.deepEqual(first.results, second.results);
});

run("allocator reports free ranges, utilization, and largest available space", () => {
  const parent = parseCidr("10.70.0.0/24");
  const summary = summarizeAllocationCapacity(parent, [
    { start: parseCidr("10.70.0.0/26").network, end: parseCidr("10.70.0.0/26").broadcast },
    { start: parseCidr("10.70.0.128/26").network, end: parseCidr("10.70.0.128/26").broadcast },
  ], 26);

  assert.equal(summary.parentCidr, "10.70.0.0/24");
  assert.equal(summary.usedRangeCount, 2);
  assert.equal(summary.freeRangeCount, 2);
  assert.equal(summary.usedAddresses, 128);
  assert.equal(summary.freeAddresses, 128);
  assert.equal(summary.utilizationPercent, 50);
  assert.equal(summary.largestFreeRange?.rangeSummary, "10.70.0.64 - 10.70.0.127");
  assert.equal(summary.canFitRequestedPrefix, true);
});

run("allocator exposes placement telemetry on batch results", () => {
  const result = allocateRequestedBlocks(parseCidr("10.80.0.0/24"), [
    { start: parseCidr("10.80.0.0/26").network, end: parseCidr("10.80.0.0/26").broadcast },
  ], [{ requestId: "users", prefix: 26, role: "USER" }]);

  assert.equal(result.results[0]?.status, "allocated");
  assert.equal(result.results[0]?.allocatorParentCidr, "10.80.0.0/24");
  assert.equal(result.results[0]?.allocatorUsedRangeCount, 1);
  assert.equal(result.results[0]?.allocatorFreeRangeCount, 1);
  assert.equal(result.results[0]?.allocatorLargestFreeRange, "10.80.0.64 - 10.80.0.255");
});

run("free range calculation clips outside ranges before reporting gaps", () => {
  const ranges = calculateFreeRanges(parseCidr("11.0.0.0/24"), [
    { start: parseCidr("10.89.255.0/24").network, end: parseCidr("11.0.0.63/26").broadcast },
  ]);

  assert.equal(ranges.length, 1);
  assert.equal(ranges[0]?.rangeSummary, "11.0.0.64 - 11.0.0.255");
});

run("free range calculation handles a fully exhausted /32 without unsigned wraparound", () => {
  const host = parseCidr("203.0.113.9/32");
  const ranges = calculateFreeRanges(host, [{ start: host.network, end: host.broadcast }]);
  assert.equal(ranges.length, 0);
});
