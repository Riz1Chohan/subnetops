const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assertContains = (file, needle, label) => {
  const body = read(file);
  if (!body.includes(needle)) {
    throw new Error(`${label} missing in ${file}`);
  }
};

assertContains("backend/src/lib/cidr.ts", "recommendedCapacityPlanForHosts", "buffered CIDR capacity plan");
assertContains("backend/src/lib/cidr.ts", "parseCidr(`0.0.0.0/${prefix}`)", "fixed recommended-prefix loop CIDR parsing");
assertContains("backend/src/services/designCore.service.ts", "requiredUsableHosts", "backend required usable host output");
assertContains("backend/src/services/designCore.service.ts", "capacityHeadroom", "backend capacity headroom output");
assertContains("backend/src/services/designCore.service.ts", "dottedMask", "backend dotted mask output");
assertContains("backend/src/services/designCore.service.ts", "wildcardMask", "backend wildcard mask output");
assertContains("backend/src/services/designCore.service.ts", "proposedSubnetCidr", "backend proposal output");
assertContains("frontend/src/lib/designCoreAdapter.ts", "configuredSubnetCidr", "frontend configured/proposed subnet mapping");
assertContains("frontend/src/lib/designCoreAdapter.ts", "requiredUsableHosts", "frontend required host target mapping");
assertContains("frontend/src/pages/ProjectAddressingPage.tsx", "Proposed Correction", "frontend proposed correction column");
assertContains("frontend/src/pages/ProjectAddressingPage.tsx", "Network → Broadcast", "frontend CIDR range column");
assertContains("frontend/src/lib/backendSnapshotViewModel.ts", "siteBlockTotalAddresses", "frontend site block capacity mapping");
assertContains("backend/package.json", "engine:selftest:cidr-core", "scoped Engine 1 selftest script");

console.log("PASS Engine 1 CIDR/allocator output hardening static check.");
