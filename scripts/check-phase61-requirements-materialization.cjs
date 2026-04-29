#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assertContains(file, text, label) {
  const body = read(file);
  if (!body.includes(text)) {
    console.error(`Missing ${label} in ${file}`);
    process.exit(1);
  }
}

assertContains(
  "backend/src/services/requirementsMaterialization.service.ts",
  "export async function materializeRequirementsForProject",
  "requirements materializer export",
);

assertContains(
  "backend/src/services/requirementsMaterialization.service.ts",
  "buildSegments",
  "segment materialization planner",
);

assertContains(
  "backend/src/services/requirementsMaterialization.service.ts",
  "siteCount",
  "site count consumption",
);

assertContains(
  "backend/src/services/project.service.ts",
  "materializeRequirementsForProject",
  "project service materialization call",
);

assertContains(
  "frontend/src/features/projects/hooks.ts",
  'queryKey: ["project-sites", projectId]',
  "site query invalidation after project update",
);

assertContains(
  "frontend/src/features/projects/hooks.ts",
  'queryKey: ["project-vlans", projectId]',
  "VLAN query invalidation after project update",
);

assertContains(
  "frontend/src/features/projects/hooks.ts",
  'queryKey: ["design-core", projectId]',
  "design-core query invalidation after project update",
);

assertContains(
  "frontend/src/features/projects/hooks.ts",
  'queryKey: ["enterprise-ipam", projectId]',
  "Engine 2 query invalidation after project update",
);

assertContains(
  "docs/doc/PHASE61-REQUIREMENTS-TO-DESIGN-MATERIALIZATION.md",
  "Requirements-to-Design Materialization",
  "phase documentation",
);

console.log("Phase 61 requirements materialization static check passed.");
