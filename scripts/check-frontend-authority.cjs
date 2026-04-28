#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fail = (message) => {
  console.error(`Frontend authority check failed: ${message}`);
  process.exit(1);
};

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const frontendSrc = path.join(root, "frontend", "src");
const files = walk(frontendSrc);
const rel = (file) => path.relative(root, file).replace(/\\/g, "/");

for (const legacy of [
  "frontend/src/lib/frontendPreviewDesign.ts",
  "frontend/src/lib/designSynthesis.ts",
  "frontend/src/lib/designSynthesis.implementation.ts",
  "frontend/src/lib/designSynthesis.topology.ts",
  "frontend/src/lib/cidrCore.ts",
  "frontend/src/lib/networkValidators.ts",
]) {
  if (fs.existsSync(path.join(root, legacy))) {
    fail(`${legacy} must not exist. Frontend planning/synthesis, CIDR, and validator modules are banned after the authority lockdown.`);
  }
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const relative = rel(file);
  if (/from\s+["'][^"']*frontendPreviewDesign["']/.test(source)) {
    fail(`${relative} imports frontendPreviewDesign. Browser-side planning fallback is disabled.`);
  }
  if (/from\s+["'][^"']*designSynthesis(?:\.implementation|\.topology)?["']/.test(source)) {
    fail(`${relative} imports removed frontend synthesis modules. Use backend design-core display models and designSynthesis.types only.`);
  }
  if (/synthesizeLogicalDesign\s*\(/.test(source) || /buildFrontendDraftPreviewDesign\s*\(/.test(source)) {
    fail(`${relative} calls frontend design synthesis. The frontend may display, explain, filter, and visualize only.`);
  }
  if (/from\s+["'][^"']*(?:networkValidators|cidrCore)["']/.test(source)) {
    fail(`${relative} imports frontend CIDR/network validation helpers. Subnet math belongs in backend design-core.`);
  }
  if (/(suggestSubnetWithinBlock|planningHintForHosts|recommendedPrefixForHosts|classifySegmentRole|subnetFacts|parseCidrRange|canonicalizeCidr)\s*\(/.test(source)) {
    fail(`${relative} runs browser-side subnet or role-planning logic. Move that authority to backend design-core.`);
  }
}

const hookPath = "frontend/src/features/designCore/hooks.ts";
const hook = fs.readFileSync(path.join(root, hookPath), "utf8");
for (const required of [
  "buildBackendOnlyDisplayDesign",
  "applyDesignCoreSnapshotToDisplayDesign",
  "resolveDesignAuthorityState",
  "backendOnlyDisplayShell",
  "isUsingFrontendFallback: false",
]) {
  if (!hook.includes(required)) fail(`${hookPath} is missing ${required}.`);
}
for (const banned of ["buildFrontendDraftPreviewDesign", "frontendDraftPreview", "frontendPreviewDesign", "authority.isFallback"]) {
  if (hook.includes(banned)) fail(`${hookPath} still references ${banned}.`);
}

const displayModel = fs.readFileSync(path.join(root, "frontend/src/lib/backendDesignDisplayModel.ts"), "utf8");
for (const required of ["buildBackendOnlyDisplayDesign", "does not infer subnets", "No browser-side design synthesis was executed"]) {
  if (!displayModel.includes(required)) fail(`backendDesignDisplayModel.ts is missing ${required}.`);
}

const snapshotViewModel = fs.readFileSync(path.join(root, "frontend/src/lib/backendSnapshotViewModel.ts"), "utf8");
for (const required of ["buildBackendSnapshotViewModel", "Backend design-core", "not frontend-inferred"]) {
  if (!snapshotViewModel.includes(required)) fail(`backendSnapshotViewModel.ts is missing ${required}.`);
}

const authority = fs.readFileSync(path.join(root, "frontend/src/lib/designAuthority.tsx"), "utf8");
for (const required of ["backend-unavailable", "Backend design-core unavailable", "frontend is intentionally not generating", "DesignAuthorityBanner"]) {
  if (!authority.includes(required)) fail(`designAuthority.tsx is missing ${required}.`);
}
for (const banned of ["Frontend draft preview only", "frontend-fallback", "browser-side preview"]){
  if (authority.includes(banned)) fail(`designAuthority.tsx still contains banned fallback wording: ${banned}.`);
}

const requirements = fs.readFileSync(path.join(root, "frontend/src/pages/ProjectRequirementsPage.tsx"), "utf8");
if (!requirements.includes("This page collects and saves requirements only") || /synthesizedPreview|planner-preview|buildFrontendDraftPreviewDesign/.test(requirements)) {
  fail("ProjectRequirementsPage must collect requirements only and must not render frontend design previews.");
}

const diagram = fs.readFileSync(path.join(root, "frontend/src/features/diagram/components/ProjectDiagram.tsx"), "utf8");
if (!diagram.includes("synthesizedDesign: SynthesizedLogicalDesign") || /synthesizeLogicalDesign\s*\(/.test(diagram)) {
  fail("ProjectDiagram must accept a backend-resolved design prop and must not synthesize its own design.");
}

const vlanForm = fs.readFileSync(path.join(root, "frontend/src/features/vlans/components/VlanForm.tsx"), "utf8");
if (!vlanForm.includes("backend design-core responsibilities") || /Suggested placement|Use Suggested Subnet|recommended minimum size|subnetFacts|suggestSubnet/.test(vlanForm)) {
  fail("VlanForm must collect inputs only and must not calculate or suggest subnet plans.");
}

const vlanTable = fs.readFileSync(path.join(root, "frontend/src/features/vlans/components/VlanTable.tsx"), "utf8");
if (!vlanTable.includes("Stored-input table only") || /usableAddresses|dottedMask|utilizationForCidr|classifySegmentRole|subnetFacts/.test(vlanTable)) {
  fail("VlanTable must display stored inputs only; backend design-core owns subnet facts.");
}

console.log("Frontend authority check passed.");
process.exit(0);
