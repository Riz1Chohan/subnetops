#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function assertContains(rel, needle) {
  const body = read(rel);
  if (!body.includes(needle)) {
    console.error(`Phase 75 check failed: ${rel} is missing ${needle}`);
    process.exit(1);
  }
}

const selftest = "backend/src/services/requirementsGoldenScenarios.selftest.ts";
assertContains(selftest, "materializeRequirementsForProject");
assertContains(selftest, "buildDesignCoreSnapshot");
assertContains(selftest, "single-site small office");
assertContains(selftest, "10-site multi-site business");
assertContains(selftest, "security/segmentation-heavy design");
assertContains(selftest, "guest and wireless design");
assertContains(selftest, "remote access plus cloud/hybrid design");
assertContains(selftest, "voice/printer/IoT/camera-heavy design");
assertContains(selftest, "dual ISP and resilience design");
assertContains(selftest, "brownfield/existing upgrade scenario");
assertContains(selftest, "expectedSitesAtLeast");
assertContains(selftest, "expectedVlansAtLeast");
assertContains(selftest, "expectedSecurityFlowsAtLeast");
assertContains(selftest, "expectedRouteIntentsAtLeast");
assertContains(selftest, "requirementsScenarioProof.passedSignalCount > 0");
assertContains(selftest, "VLAN ${missingCidr?.vlanName} is missing CIDR/gateway output");
assertContains(selftest, "design-core created no topology devices");
assertContains(selftest, "design-core created no links");
assertContains(selftest, "scenario proof regressed to 0 passed signals");

assertContains("docs/doc/PHASE75-GOLDEN-SCENARIO-RUNTIME-TESTS.md", "Phase 75");
assertContains("docs/doc/PHASE75-GOLDEN-SCENARIO-RUNTIME-TESTS.md", "requirements JSON → materializer → Sites/VLANs/CIDR/gateways → design-core");

const rootPackage = JSON.parse(read("package.json"));
if (!/^0\.(75|76)\.0$/.test(rootPackage.version)) {
  console.error(`Phase 75 check failed: expected root package version 0.75.0 or later Phase 76 release version, got ${rootPackage.version}`);
  process.exit(1);
}
if (!rootPackage.scripts["check:phase75-golden-scenario-tests"]?.includes("node scripts/check-phase75-golden-scenario-tests.cjs")) {
  console.error("Phase 75 check failed: missing root check:phase75-golden-scenario-tests script.");
  process.exit(1);
}
if (!rootPackage.scripts["check:phase74-report-diagram-truth-lock"]?.includes("check:phase75-golden-scenario-tests")) {
  console.error("Phase 75 check failed: Phase 74 script does not chain Phase 75.");
  process.exit(1);
}

const backendPackage = JSON.parse(read("backend/package.json"));
if (backendPackage.scripts["engine:selftest:phase75-golden-requirements"] !== "tsx src/services/requirementsGoldenScenarios.selftest.ts") {
  console.error("Phase 75 check failed: missing backend engine:selftest:phase75-golden-requirements script.");
  process.exit(1);
}
if (!backendPackage.scripts["engine:selftest:all"]?.includes("engine:selftest:phase75-golden-requirements")) {
  console.error("Phase 75 check failed: backend engine:selftest:all does not include Phase 75.");
  process.exit(1);
}

console.log("Phase 75 golden scenario runtime test static checks passed.");
