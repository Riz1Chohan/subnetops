import assert from "node:assert/strict";
import {
  buildReadRepairEvidence,
  buildReadRepairPolicyDecision,
  normalizeReadRepairOperation,
} from "./readRepairPolicy.js";

const authorization = {
  permission: "upstream-view-check" as const,
  userId: "user-1",
  checkedBy: "ensureCanViewProject",
};

const allowed = buildReadRepairPolicyDecision({
  operation: "project-read",
  authorization,
  requirementsPresent: true,
  materializationIncomplete: true,
});
assert.equal(allowed.allowed, true);
assert.equal(allowed.action, "READ_REPAIR_MATERIALIZATION");

const noRequirements = buildReadRepairPolicyDecision({
  operation: "project-read",
  authorization,
  requirementsPresent: false,
  materializationIncomplete: true,
});
assert.equal(noRequirements.status, "NO_OP");
assert.equal(noRequirements.allowed, false);

const complete = buildReadRepairPolicyDecision({
  operation: "design-core-read",
  authorization: { permission: "system-internal-authorized", checkedBy: "designCore.service ensureCanViewProject" },
  requirementsPresent: true,
  materializationIncomplete: false,
});
assert.equal(complete.status, "NO_OP");

const missingPermission = buildReadRepairPolicyDecision({
  operation: "export-read",
  authorization: { permission: "system-internal-authorized", checkedBy: "" },
  requirementsPresent: true,
  materializationIncomplete: true,
});
assert.equal(missingPermission.status, "BLOCK_REPAIR");
assert.equal(missingPermission.allowed, false);

assert.equal(normalizeReadRepairOperation("validation-read"), "validation-read");
assert.equal(normalizeReadRepairOperation("not-real"), "project-read");

const evidence = buildReadRepairEvidence({
  projectId: "project-1",
  operation: "project-read",
  reason: "project-read",
  authorization,
  beforeState: { sites: 0, vlans: 0, addressingRows: 0, dhcpScopes: 0, dhcpEnabledVlans: 0 },
  afterState: { sites: 1, vlans: 2, addressingRows: 2, dhcpScopes: 1, dhcpEnabledVlans: 1 },
  repaired: true,
  repairLogged: true,
  materialization: {
    createdSites: 1,
    updatedSites: 0,
    createdVlans: 2,
    updatedVlans: 0,
    createdDhcpScopes: 1,
    updatedDhcpScopes: 0,
    reviewRequiredObjects: 1,
    blockedImplementationObjects: 1,
  },
  surfacedTo: ["project-response", "change-log", "security-audit"],
});
assert.equal(evidence.action, "READ_REPAIR_MATERIALIZATION");
assert.deepEqual(evidence.createdObjects, { sites: 1, vlans: 2, addressingRows: 2, dhcpScopes: 1 });
assert.equal(evidence.reviewRequiredObjects, 1);
assert.equal(evidence.repairLogged, true);
assert.equal(evidence.surfacedTo.includes("project-response"), true);

console.log("Read-repair policy selftest passed");
