#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const hookPath = "frontend/src/features/designCore/hooks.ts";
const hook = read(hookPath);
for (const required of [
  "export function useAuthoritativeDesign",
  "buildBackendOnlyDisplayDesign",
  "applyDesignCoreSnapshotToDisplayDesign",
  "resolveDesignAuthorityState",
  "useDesignCoreSnapshot(projectId)",
]) {
  if (!hook.includes(required)) {
    fail(`Backend authority seam failed: ${hookPath} is missing ${required}.`);
  }
}

const authoritativeSurfaces = [
  "frontend/src/layouts/ProjectLayout.tsx",
  "frontend/src/pages/ProjectOverviewPage.tsx",
  "frontend/src/pages/ProjectDiscoveryPage.tsx",
  "frontend/src/pages/ProjectAddressingPage.tsx",
  "frontend/src/pages/ProjectCoreModelPage.tsx",
  "frontend/src/pages/ProjectImplementationPage.tsx",
  "frontend/src/pages/ProjectRoutingPage.tsx",
  "frontend/src/pages/ProjectSecurityPage.tsx",
  "frontend/src/pages/ProjectStandardsPage.tsx",
  "frontend/src/pages/ProjectValidationPage.tsx",
  "frontend/src/pages/ProjectReportPage.tsx",
  "frontend/src/pages/ProjectDiagramPage.tsx",
  "frontend/src/pages/ProjectPlatformBomPage.tsx",
];

for (const surface of authoritativeSurfaces) {
  const source = read(surface);
  if (!source.includes("useAuthoritativeDesign")) {
    fail(`Backend authority seam failed: ${surface} must render through useAuthoritativeDesign.`);
  }
  if (source.includes("../lib/designSynthesis") || source.includes("useDesignCoreSnapshot(projectId)") || source.includes("applyDesignCoreSnapshotToDisplayDesign")) {
    fail(`Backend authority seam failed: ${surface} is bypassing the shared authority hook.`);
  }
}

const adapter = read("frontend/src/lib/designCoreAdapter.ts");
for (const required of ["backendCheckedAddressingPlan", "Backend design-core proposal", "backendImplementationPlanSummary", "backendSecurityMatrix", "backendRoutingPlan"]) {
  if (!adapter.includes(required)) {
    fail(`Backend authority seam failed: designCoreAdapter must expose ${required}.`);
  }
}

const authority = read("frontend/src/lib/designAuthority.tsx");
if (!authority.includes("Backend design-core unavailable") || !authority.includes("DesignAuthorityBanner")) {
  fail("Backend authority seam failed: frontend authority banner must disclose backend availability state.");
}
if (authority.includes("Frontend draft preview only") || authority.includes("frontend-fallback")) {
  fail("Backend authority seam failed: frontend fallback planning language is banned.");
}

console.log("Backend authority seam check passed.");

process.exit(0);
