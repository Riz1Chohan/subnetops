import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRequirementSegments, buildSegmentAddressingPlans, buildSiteBlock } from "./apply.js";
import { asBoolean, asNumber, asString, parseRequirementsJson } from "./normalize.js";
import { buildRequirementReviewItems, buildRequirementTraceRecords, consumedRequirementFields } from "./traceability.js";
import { buildRequirementMaterializationPolicySummary } from "./policy.js";

const requirements = {
  siteCount: "2",
  usersPerSite: "120",
  guestWifi: true,
  wireless: true,
  voice: true,
  printers: true,
  printerCount: "12",
  iot: true,
  iotDeviceCount: "40",
  management: true,
  remoteAccess: true,
  cloudConnected: true,
  dualIsp: true,
  monitoringModel: "centralized logging and monitoring",
  gatewayConvention: "last usable",
  primaryGoal: "segmentation",
};

assert.equal(asString("  hello  "), "hello");
assert.equal(asString("", "fallback"), "fallback");
assert.equal(asNumber("999999", 1, 1, 500), 500);
assert.equal(asBoolean("true"), true);
assert.equal(parseRequirementsJson(JSON.stringify(requirements))?.siteCount, "2");
assert.equal(parseRequirementsJson("not-json"), null);
assert.equal(parseRequirementsJson("[]"), null);

const segments = buildRequirementSegments(requirements);
const segmentNames = segments.map((segment) => segment.vlanName);
assert.deepEqual(segmentNames, [
  "USERS",
  "GUEST",
  "STAFF-WIFI",
  "VOICE",
  "PRINTERS",
  "IOT",
  "MANAGEMENT",
  "REMOTE-ACCESS",
  "CLOUD-EDGE",
  "WAN-TRANSIT",
  "OPERATIONS",
]);
assert.equal(segments.find((segment) => segment.vlanName === "USERS")?.estimatedHosts, 120);
assert.equal(segments.find((segment) => segment.vlanName === "MANAGEMENT")?.dhcpEnabled, false);

assert.equal(buildSiteBlock("10.44.0.0/16", 0), "10.44.0.0/16");
assert.equal(buildSiteBlock("10.44.0.0/16", 1), "10.45.0.0/16");

const plans = buildSegmentAddressingPlans("10.44.0.0/16", 0, segments, requirements);
const usersPlan = plans.get(10);
const wanPlan = plans.get(120);
if (!usersPlan) throw new Error("USERS addressing plan missing");
if (!wanPlan) throw new Error("WAN addressing plan missing");
assert.ok(usersPlan.cidr.startsWith("10.44."));
assert.ok(usersPlan.gateway?.startsWith("10.44."));
assert.ok(usersPlan.recommendedPrefix <= 25, "120 users should not be squeezed into a /25-or-smaller usable host mistake");
assert.ok(wanPlan.cidr.startsWith("10.44."));

const consumed = consumedRequirementFields(requirements);
assert.ok(consumed.includes("siteCount"));
assert.ok(consumed.includes("guestWifi"));
assert.ok(consumed.includes("gatewayConvention"));

const traces = buildRequirementTraceRecords(requirements);
assert.ok(traces.some((trace) => trace.key === "guestWifi" && trace.status === "applied"));
assert.ok(traces.some((trace) => trace.key === "gatewayConvention" && trace.status === "applied"));
assert.ok(traces.every((trace) => ["applied", "requires_review", "not_supported", "not_applicable", "blocked"].includes(trace.status)));

const reviewItems = buildRequirementReviewItems(requirements);
assert.ok(Array.isArray(reviewItems));

const policy = buildRequirementMaterializationPolicySummary(requirements, {
  sites: [
    {
      id: "site-1",
      name: "HQ",
      siteCode: "HQ",
      defaultAddressBlock: "10.44.0.0/16",
      vlans: segments.map((segment) => ({
        id: `vlan-${segment.vlanId}`,
        vlanId: segment.vlanId,
        vlanName: segment.vlanName,
        subnetCidr: plans.get(segment.vlanId)?.cidr,
        gatewayIp: plans.get(segment.vlanId)?.gateway,
        dhcpEnabled: segment.dhcpEnabled,
      })),
    },
  ],
  dhcpScopes: segments
    .filter((segment) => segment.dhcpEnabled)
    .map((segment) => ({ id: `scope-${segment.vlanId}`, vlanId: `vlan-${segment.vlanId}`, scopeCidr: plans.get(segment.vlanId)?.cidr })),
});
assert.equal(policy.contractVersion, "V1_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT");
assert.ok(policy.totalPolicyCount > 0);
assert.ok(policy.activeFieldCount > 0);
assert.ok(policy.fieldOutcomes.some((outcome) => outcome.key === "guestWifi" && outcome.active));

const domainDir = path.dirname(fileURLToPath(import.meta.url));
const domainFiles = (fs.readdirSync(domainDir) as string[]).filter((name: string) => name.endsWith(".ts") && !name.endsWith(".selftest.ts"));
for (const file of domainFiles) {
  const source = fs.readFileSync(path.join(domainDir, file), "utf8");
  assert.equal(/from\s+["'](?:\.\.\/){1,}db\//.test(source), false, `${file} must not import db/prisma`);
  assert.equal(/from\s+["'](?:\.\.\/){1,}controllers?\//.test(source), false, `${file} must not import controllers`);
  assert.equal(/from\s+["'](?:\.\.\/){1,}routes?\//.test(source), false, `${file} must not import routes`);
  assert.equal(/from\s+["'](?:express|@prisma\/client|react)["']/.test(source), false, `${file} must stay framework-free`);
}

console.log("requirements-domain selftest passed");
