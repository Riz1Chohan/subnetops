#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fail = (message) => {
  console.error(`Routing engine upgrade check failed: ${message}`);
  process.exit(1);
};
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const mustExist = (relative) => {
  if (!fs.existsSync(path.join(root, relative))) fail(`missing ${relative}`);
};
const mustContain = (relative, needle, message) => {
  const source = read(relative);
  if (!source.includes(needle)) fail(`${message}: expected ${relative} to contain ${needle}`);
};

mustExist("backend/src/lib/phase34RoutingEngine.selftest.ts");
mustContain("backend/package.json", "engine:selftest:phase34-routing", "backend package must register the Phase 34 routing selftest");
mustContain("backend/package.json", "engine:selftest:phase34-routing", "backend all-selftest chain must include Phase 34 routing selftest");
mustContain("backend/src/services/designCore/designCore.routingSegmentation.ts", "RouteTableEntry", "routing engine must expose neutral route table entries");
mustContain("backend/src/services/designCore/designCore.routingSegmentation.ts", "buildSiteReachabilityChecks", "routing engine must build a site-to-site reachability matrix");
mustContain("backend/src/services/designCore/designCore.routingSegmentation.ts", "ROUTING_NEXT_HOP_OBJECT_MISSING", "routing engine must validate next-hop object references");
mustContain("backend/src/services/designCore/designCore.routingSegmentation.ts", "ROUTING_DUPLICATE_DESTINATION_INTENT", "routing engine must detect duplicate route destinations");
mustContain("backend/src/services/designCore/designCore.routingSegmentation.ts", "ROUTING_SITE_TO_SITE_RETURN_PATH_MISSING", "routing engine must detect missing return paths");
mustContain("backend/src/services/designCore.types.ts", "SiteToSiteReachabilityCheck", "backend snapshot types must include reachability checks");
mustContain("frontend/src/lib/designCoreSnapshot.ts", "SiteToSiteReachabilityCheck", "frontend snapshot contract must mirror routing outputs without computing them");

for (const requiredCase of [
  "phase 34 generates backend route table entries with neutral administrative distance and longest-prefix metadata",
  "phase 34 validates static and default route next-hop objects against backend network objects",
  "phase 34 builds a bidirectional site-to-site reachability matrix",
  "phase 34 detects route duplicates overlaps and missing next-hop objects in direct backend routing model input",
  "phase 34 blocks multi-site reachability claims when transit and return paths are not modeled",
]) {
  mustContain("backend/src/lib/phase34RoutingEngine.selftest.ts", requiredCase, "missing Phase 34 routing test case");
}

console.log("Routing engine upgrade check passed.");
process.exit(0);
