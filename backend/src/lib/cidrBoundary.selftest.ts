import assert from "node:assert/strict";
import { canonicalCidr, cidrsOverlap, containsIp, parseCidr, recommendedPrefixForHosts } from "../domain/addressing/cidr.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

run("192.168 signed-boundary CIDR containment is unsigned-safe", () => {
  const lan = parseCidr("192.168.1.0/24");
  assert.equal(canonicalCidr("192.168.1.44/24"), "192.168.1.0/24");
  assert.equal(containsIp(lan, "192.168.1.5"), true);
  assert.equal(containsIp(lan, "8.8.8.8"), false);
  assert.equal(cidrsOverlap(lan, parseCidr("8.8.8.0/24")), false);
});

run("172.16/12 private block boundaries are correct", () => {
  const privateBlock = parseCidr("172.16.0.0/12");
  assert.equal(containsIp(privateBlock, "172.20.1.1"), true);
  assert.equal(containsIp(privateBlock, "172.31.255.254"), true);
  assert.equal(containsIp(privateBlock, "172.32.0.1"), false);
});

run("WAN transit and loopback sizing are not inflated by growth buffers", () => {
  assert.equal(recommendedPrefixForHosts(1, "LOOPBACK"), 32);
  assert.equal(recommendedPrefixForHosts(2, "WAN_TRANSIT"), 31);
  assert.equal(recommendedPrefixForHosts(3, "WAN_TRANSIT"), 29);
});
