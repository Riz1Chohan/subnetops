import assert from "node:assert/strict";
import {
  canonicalCidr,
  cidrsOverlap,
  containsIp,
  describeSubnet,
  dottedMaskFromPrefix,
  firstUsableIp,
  isBroadcastAddress,
  isNetworkAddress,
  lastUsableIp,
  parseCidr,
  isUsableHostIp,
  validateGatewayForSubnet,
  recommendedPrefixForHosts,
  recommendedCapacityPlanForHosts,
  usableHostCount,
  wildcardMaskFromPrefix,
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

run("canonical CIDR uses the network address", () => {
  assert.equal(canonicalCidr("10.10.10.99/24"), "10.10.10.0/24");
});

run("dotted and wildcard masks match the prefix", () => {
  assert.equal(dottedMaskFromPrefix(24), "255.255.255.0");
  assert.equal(wildcardMaskFromPrefix(24), "0.0.0.255");
});

run("standard /24 host calculations stay correct", () => {
  const parsed = parseCidr("10.20.30.0/24");
  assert.equal(usableHostCount(parsed, "USER"), 254);
  assert.equal(firstUsableIp(parsed, "USER"), "10.20.30.1");
  assert.equal(lastUsableIp(parsed, "USER"), "10.20.30.254");
});

run("/31 is valid for WAN transit only", () => {
  const parsed = parseCidr("10.0.0.8/31");
  assert.equal(usableHostCount(parsed, "WAN_TRANSIT"), 2);
  assert.equal(firstUsableIp(parsed, "WAN_TRANSIT"), "10.0.0.8");
  assert.equal(lastUsableIp(parsed, "WAN_TRANSIT"), "10.0.0.9");
  assert.equal(usableHostCount(parsed, "USER"), 0);
});

run("/32 is valid for loopbacks only", () => {
  const parsed = parseCidr("10.255.255.1/32");
  assert.equal(usableHostCount(parsed, "LOOPBACK"), 1);
  assert.equal(firstUsableIp(parsed, "LOOPBACK"), "10.255.255.1");
  assert.equal(lastUsableIp(parsed, "LOOPBACK"), "10.255.255.1");
  assert.equal(usableHostCount(parsed, "USER"), 0);
});

run("overlap detection catches colliding subnets", () => {
  const left = parseCidr("10.10.0.0/24");
  const right = parseCidr("10.10.0.128/25");
  const outside = parseCidr("10.11.0.0/24");
  assert.equal(cidrsOverlap(left, right), true);
  assert.equal(cidrsOverlap(left, outside), false);
});

run("containsIp and address identity helpers remain consistent", () => {
  const parsed = parseCidr("192.168.50.0/24");
  assert.equal(containsIp(parsed, "192.168.50.25"), true);
  assert.equal(containsIp(parsed, "192.168.51.25"), false);
  assert.equal(isNetworkAddress(parsed, "192.168.50.0"), true);
  assert.equal(isBroadcastAddress(parsed, "192.168.50.255"), true);
});

run("recommended prefix keeps WAN and loopback special cases", () => {
  assert.equal(recommendedPrefixForHosts(2, "WAN_TRANSIT"), 31);
  assert.equal(recommendedPrefixForHosts(1, "LOOPBACK"), 32);
  assert.equal(recommendedPrefixForHosts(200, "USER"), 23);
});


run("recommended capacity plan exposes buffered usable-host target", () => {
  const plan = recommendedCapacityPlanForHosts(50, "USER");
  assert.equal(plan.requiredUsableHosts, 65);
  assert.equal(plan.recommendedPrefix, 25);
  assert.equal(plan.recommendedUsableHosts, 126);
});

run("WAN transit sizing grows beyond /31 only when more than two endpoints are requested", () => {
  assert.equal(recommendedPrefixForHosts(2, "WAN_TRANSIT"), 31);
  assert.equal(recommendedPrefixForHosts(3, "WAN_TRANSIT"), 29);
});

run("subnet description stays coherent", () => {
  const facts = describeSubnet(parseCidr("172.16.10.0/24"), "SERVER");
  assert.equal(facts.canonicalCidr, "172.16.10.0/24");
  assert.equal(facts.networkAddress, "172.16.10.0");
  assert.equal(facts.broadcastAddress, "172.16.10.255");
  assert.equal(facts.usableAddresses, 254);
});

console.log("\nCIDR engine self-test complete.");

run("strict CIDR parsing rejects malformed, leading-zero, and extra-slash input", () => {
  assert.throws(() => parseCidr("10.0.0.0"));
  assert.throws(() => parseCidr("10.0.0.0/33"));
  assert.throws(() => parseCidr("10.0.0.0/24/extra"));
  assert.throws(() => parseCidr("010.0.0.0/24"));
  assert.throws(() => parseCidr("256.0.0.1/24"));
  assert.throws(() => parseCidr("10.0.0.0/+24"));
  assert.throws(() => parseCidr("10.0.0.0/24.0"));
  assert.throws(() => parseCidr("10.0.0.0/024"));
});

run("CIDR boundary prefixes /0 and /1 remain unsigned-safe", () => {
  assert.equal(canonicalCidr("255.255.255.255/0"), "0.0.0.0/0");
  assert.equal(describeSubnet(parseCidr("128.0.0.1/1"), "USER").canonicalCidr, "128.0.0.0/1");
});

run("/30 /31 /32 usable behavior is role-aware and canonical", () => {
  assert.equal(usableHostCount(parseCidr("10.0.0.4/30"), "USER"), 2);
  assert.equal(usableHostCount(parseCidr("10.0.0.4/31"), "WAN_TRANSIT"), 2);
  assert.equal(usableHostCount(parseCidr("10.0.0.4/31"), "USER"), 0);
  assert.equal(usableHostCount(parseCidr("10.0.0.4/32"), "LOOPBACK"), 1);
});

run("adjacent subnets that only touch at boundaries do not overlap", () => {
  assert.equal(cidrsOverlap(parseCidr("10.0.0.0/25"), parseCidr("10.0.0.128/25")), false);
});

run("role-aware host usability allows /31 WAN endpoints and /32 loopbacks only", () => {
  assert.equal(isUsableHostIp(parseCidr("10.0.0.8/31"), "10.0.0.8", "WAN_TRANSIT"), true);
  assert.equal(isUsableHostIp(parseCidr("10.0.0.8/31"), "10.0.0.8", "USER"), false);
  assert.equal(isUsableHostIp(parseCidr("10.0.0.9/32"), "10.0.0.9", "LOOPBACK"), true);
  assert.equal(isUsableHostIp(parseCidr("10.0.0.9/32"), "10.0.0.9", "USER"), false);
});

run("gateway validation explains outside, network, broadcast, and role-incompatible cases", () => {
  assert.equal(validateGatewayForSubnet(parseCidr("10.0.0.0/24"), "10.0.0.1", "USER").status, "usable");
  assert.equal(validateGatewayForSubnet(parseCidr("10.0.0.0/24"), "10.0.0.0", "USER").status, "network-address");
  assert.equal(validateGatewayForSubnet(parseCidr("10.0.0.0/24"), "10.0.1.1", "USER").status, "outside-subnet");
  assert.equal(validateGatewayForSubnet(parseCidr("10.0.0.0/31"), "10.0.0.0", "WAN_TRANSIT").status, "usable");
  assert.equal(validateGatewayForSubnet(parseCidr("10.0.0.0/31"), "10.0.0.0", "USER").status, "role-incompatible");
});
