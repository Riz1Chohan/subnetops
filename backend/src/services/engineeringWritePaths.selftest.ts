import assert from "node:assert/strict";
import {
  assertDhcpScopeAddressingWritable,
  assertGeneratedProjectBasePrivateRangeWritable,
  assertGeneratedDhcpScopeAddressingWritable,
  assertGeneratedSiteAddressingWritable,
  assertGeneratedVlanAddressingWritable,
  buildProjectWriteCandidate,
  buildSiteWriteCandidate,
  buildVlanWriteCandidate,
} from "./engineeringWritePaths.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

function expectReject(name: string, fn: () => void, expectedText: string) {
  run(name, () => {
    assert.throws(fn, (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      assert.ok(message.includes(expectedText), `expected error to include ${expectedText}, got ${message}`);
      return true;
    });
  });
}



run("project base private range accepts canonical RFC1918 ranges and blank planning state", () => {
  assertGeneratedProjectBasePrivateRangeWritable({ basePrivateRange: "10.0.0.0/8" }, "Project template");
  assertGeneratedProjectBasePrivateRangeWritable({ basePrivateRange: "172.16.0.0/12" }, "Project template");
  assertGeneratedProjectBasePrivateRangeWritable({ basePrivateRange: "192.168.0.0/16" }, "Project template");
  const blankCandidate = buildProjectWriteCandidate({ basePrivateRange: "10.0.0.0/8" }, { basePrivateRange: "   " });
  assert.equal(blankCandidate.basePrivateRange, null);
});

expectReject("project base private range rejects noncanonical CIDR before write", () => {
  buildProjectWriteCandidate({ basePrivateRange: "10.0.0.0/8" }, { basePrivateRange: "10.0.0.9/24" });
}, "network boundary: 10.0.0.0/24");

expectReject("project base private range rejects malformed CIDR before write", () => {
  buildProjectWriteCandidate({ basePrivateRange: null }, { basePrivateRange: "999.1.1.1/24" });
}, "valid IPv4 CIDR");

expectReject("project base private range rejects plain text before write", () => {
  buildProjectWriteCandidate({ basePrivateRange: null }, { basePrivateRange: "hello" });
}, "valid IPv4 CIDR");

expectReject("project base private range rejects public CIDR as clean project truth", () => {
  buildProjectWriteCandidate({ basePrivateRange: null }, { basePrivateRange: "8.8.8.0/24" });
}, "RFC1918 private IPv4 space");

expectReject("project base private range rejects a CIDR that crosses outside private space", () => {
  buildProjectWriteCandidate({ basePrivateRange: null }, { basePrivateRange: "172.0.0.0/8" });
}, "RFC1918 private IPv4 space");

expectReject("site update rejects noncanonical default address block before write", () => {
  buildSiteWriteCandidate({ defaultAddressBlock: "10.20.0.0/16" }, { defaultAddressBlock: "10.20.1.9/24" });
}, "network boundary: 10.20.1.0/24");

run("site update preserves existing valid address block when patch omits it", () => {
  const candidate = buildSiteWriteCandidate({ defaultAddressBlock: "10.20.0.0/16" }, { name: "HQ" });
  assert.equal(candidate.defaultAddressBlock, "10.20.0.0/16");
});

run("requirement-generated site addressing uses the same validation helper", () => {
  assertGeneratedSiteAddressingWritable({ defaultAddressBlock: "10.30.0.0/16" }, "Requirements materializer");
});

expectReject("requirement-generated site addressing rejects invalid CIDR", () => {
  assertGeneratedSiteAddressingWritable({ defaultAddressBlock: "10.30.1.9/24" }, "Requirements materializer");
}, "network boundary: 10.30.1.0/24");

run("requirement-generated VLAN addressing uses the same validation helper", () => {
  assertGeneratedVlanAddressingWritable({
    vlanName: "USERS",
    purpose: "Requirement-derived users",
    subnetCidr: "10.40.10.0/24",
    gatewayIp: "10.40.10.1",
    segmentRole: "USER",
  }, "Requirements materializer");
});

expectReject("requirement-generated VLAN addressing rejects gateway outside subnet", () => {
  assertGeneratedVlanAddressingWritable({
    vlanName: "USERS",
    purpose: "Requirement-derived users",
    subnetCidr: "10.40.10.0/24",
    gatewayIp: "10.40.99.1",
    segmentRole: "USER",
  }, "Requirements materializer");
}, "outside 10.40.10.0/24");

run("requirement-generated DHCP scope addressing uses the same validation helper", () => {
  assertGeneratedDhcpScopeAddressingWritable({
    addressFamily: "IPV4",
    scopeCidr: "10.40.10.0/24",
    defaultGateway: "10.40.10.1",
    parentSubnetCidr: "10.40.10.0/24",
    segmentRole: "USER",
  }, "Requirements materializer");
});

const existingVlan = {
  subnetCidr: "10.20.10.0/24",
  gatewayIp: "10.20.10.1",
  segmentRole: "USER",
  vlanName: "Corporate Users",
  purpose: "user access",
  department: "Operations",
  notes: "saved VLAN state",
};

expectReject("gateway-only VLAN update cannot move gateway outside saved subnet", () => {
  buildVlanWriteCandidate(existingVlan, { gatewayIp: "10.99.99.1" });
}, "outside 10.20.10.0/24");

expectReject("subnet-only VLAN update cannot strand the saved gateway", () => {
  buildVlanWriteCandidate(existingVlan, { subnetCidr: "10.21.0.0/24" });
}, "outside 10.21.0.0/24");

expectReject("subnet-only VLAN update rejects noncanonical CIDR before write", () => {
  buildVlanWriteCandidate(existingVlan, { subnetCidr: "10.20.10.9/24" });
}, "network boundary: 10.20.10.0/24");

run("paired subnet and gateway VLAN update passes after merge validation", () => {
  const candidate = buildVlanWriteCandidate(existingVlan, { subnetCidr: "10.21.0.0/24", gatewayIp: "10.21.0.1" });
  assert.equal(candidate.subnetCidr, "10.21.0.0/24");
  assert.equal(candidate.gatewayIp, "10.21.0.1");
});

expectReject("broadcast address cannot be saved as VLAN gateway", () => {
  buildVlanWriteCandidate(existingVlan, { gatewayIp: "10.20.10.255" });
}, "broadcast address");

expectReject("network address cannot be saved as VLAN gateway", () => {
  buildVlanWriteCandidate(existingVlan, { gatewayIp: "10.20.10.0" });
}, "network address");

expectReject("gateway outside subnet cannot be saved", () => {
  buildVlanWriteCandidate(existingVlan, { gatewayIp: "10.20.11.1" });
}, "outside 10.20.10.0/24");

run("DHCP scope inside the VLAN subnet passes service write validation", () => {
  assertDhcpScopeAddressingWritable({
    addressFamily: "IPV4",
    scopeCidr: "10.20.10.0/24",
    defaultGateway: "10.20.10.1",
    parentSubnetCidr: "10.20.10.0/24",
    segmentRole: "USER",
  });
});

expectReject("DHCP scope outside the VLAN subnet is rejected before write", () => {
  assertDhcpScopeAddressingWritable({
    addressFamily: "IPV4",
    scopeCidr: "10.20.11.0/24",
    defaultGateway: "10.20.11.1",
    parentSubnetCidr: "10.20.10.0/24",
    segmentRole: "USER",
  });
}, "must stay inside parent subnet 10.20.10.0/24");

expectReject("DHCP default gateway must be a usable host, not the broadcast address", () => {
  assertDhcpScopeAddressingWritable({
    addressFamily: "IPV4",
    scopeCidr: "10.20.10.0/24",
    defaultGateway: "10.20.10.255",
    parentSubnetCidr: "10.20.10.0/24",
    segmentRole: "USER",
  });
}, "broadcast address");

console.log("\nEngineering write-path self-test complete.");
