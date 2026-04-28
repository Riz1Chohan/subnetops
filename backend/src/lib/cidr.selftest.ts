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
  recommendedPrefixForHosts,
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
  const outside = parseCidr("10.10.1.0/24");
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

run("subnet description stays coherent", () => {
  const facts = describeSubnet(parseCidr("172.16.10.0/24"), "SERVER");
  assert.equal(facts.canonicalCidr, "172.16.10.0/24");
  assert.equal(facts.networkAddress, "172.16.10.0");
  assert.equal(facts.broadcastAddress, "172.16.10.255");
  assert.equal(facts.usableAddresses, 254);
});

console.log("\nCIDR engine self-test complete.");
