import assert from "node:assert/strict";
import {
  canonicalCidr,
  cidrsOverlap,
  classifySegmentRole,
  containsIp,
  describeSubnet,
  isBroadcastAddress,
  isNetworkAddress,
  parseCidr,
  recommendedPrefixForHosts,
  suggestedGatewayPattern,
  usableHostCount,
} from "./cidr.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

run("canonical CIDR normalizes host bits", () => {
  assert.equal(canonicalCidr("10.10.0.10/26"), "10.10.0.0/26");
});

run("usable host count handles normal IPv4 subnets", () => {
  assert.equal(usableHostCount(parseCidr("10.0.0.0/24"), "USER"), 254);
});

run("/31 is only treated as usable for WAN transit", () => {
  assert.equal(usableHostCount(parseCidr("10.0.0.0/31"), "WAN_TRANSIT"), 2);
  assert.equal(usableHostCount(parseCidr("10.0.0.0/31"), "USER"), 0);
});

run("/32 is only treated as usable for loopback role", () => {
  assert.equal(usableHostCount(parseCidr("10.0.0.1/32"), "LOOPBACK"), 1);
  assert.equal(usableHostCount(parseCidr("10.0.0.1/32"), "USER"), 0);
});

run("network and broadcast address checks work for standard subnets", () => {
  const subnet = parseCidr("10.0.0.0/24");
  assert.equal(isNetworkAddress(subnet, "10.0.0.0"), true);
  assert.equal(isBroadcastAddress(subnet, "10.0.0.255"), true);
});

run("containsIp respects subnet boundaries", () => {
  const subnet = parseCidr("10.0.1.0/24");
  assert.equal(containsIp(subnet, "10.0.1.20"), true);
  assert.equal(containsIp(subnet, "10.0.2.20"), false);
});

run("recommended prefix grows by role-aware buffer", () => {
  assert.equal(recommendedPrefixForHosts(40, "USER"), 26);
  assert.equal(recommendedPrefixForHosts(2, "WAN_TRANSIT"), 31);
  assert.equal(recommendedPrefixForHosts(1, "LOOPBACK"), 32);
});

run("describeSubnet returns usable boundaries", () => {
  const detail = describeSubnet(parseCidr("10.0.2.0/26"), "USER");
  assert.equal(detail.firstUsableIp, "10.0.2.1");
  assert.equal(detail.lastUsableIp, "10.0.2.62");
});

run("role classification recognizes common segment names", () => {
  assert.equal(classifySegmentRole("Guest Wi-Fi"), "GUEST");
  assert.equal(classifySegmentRole("Management VLAN"), "MANAGEMENT");
  assert.equal(classifySegmentRole("WAN Transit"), "WAN_TRANSIT");
});

run("overlap detection distinguishes adjacent and overlapping blocks", () => {
  assert.equal(cidrsOverlap(parseCidr("10.0.0.0/24"), parseCidr("10.0.0.128/25")), true);
  assert.equal(cidrsOverlap(parseCidr("10.0.0.0/24"), parseCidr("10.0.1.0/24")), false);
});

run("gateway suggestion detects common readable gateway conventions", () => {
  assert.equal(suggestedGatewayPattern("10.0.0.1"), true);
  assert.equal(suggestedGatewayPattern("10.0.0.254"), true);
  assert.equal(suggestedGatewayPattern("10.0.0.7"), false);
});

run("recommended prefix preserves deterministic sizing at common thresholds", () => {
  assert.equal(recommendedPrefixForHosts(1, "PRINTER"), 29);
  assert.equal(recommendedPrefixForHosts(120, "USER"), 24);
  assert.equal(recommendedPrefixForHosts(500, "USER"), 22);
});


run("adjacent /31 transit links do not overlap", () => {
  assert.equal(cidrsOverlap(parseCidr("10.0.0.0/31"), parseCidr("10.0.0.2/31")), false);
});

run("canonical /32 keeps the exact host address", () => {
  assert.equal(canonicalCidr("10.0.0.9/32"), "10.0.0.9/32");
});

console.log("\nCIDR proof self-test complete.");
