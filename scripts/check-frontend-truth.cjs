#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontendSrc = path.join(root, 'frontend', 'src');
const fail = (message) => {
  console.error(`Frontend truth check failed: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/i.test(entry.name)) files.push(full);
  }
  return files;
}

const files = walk(frontendSrc);
const textByRelative = new Map(files.map((file) => [path.relative(root, file).replace(/\\/g, '/'), fs.readFileSync(file, 'utf8')]));

const routerText = textByRelative.get('frontend/src/router/index.tsx') || '';
assert(/lazyNamedPage/.test(routerText) && /Suspense/.test(routerText), 'router must lazy-load page modules instead of importing the full pages barrel eagerly');
assert(!/from "\.\.\/pages"/.test(routerText) && !/from '\.\.\/pages'/.test(routerText), 'router must not import from the eager pages barrel');

const hooksText = textByRelative.get('frontend/src/features/designCore/hooks.ts') || '';
assert(/frontendTruthContract/.test(hooksText), 'useAuthoritativeDesign must expose the frontend truth contract');
assert(/isUsingFrontendFallback:\s*false/.test(hooksText), 'browser-side engineering fallback must stay disabled');
assert(!/isUsingFrontendFallback:\s*true/.test(hooksText), 'browser-side engineering fallback must never be enabled');

const forbiddenFunctionPatterns = [
  /function\s+(generatePlan|synthesizeDesign|inferTopology|calculateSubnet|assignGateway|buildSecurityZones|createRoutePlan|fakeValidation|fallbackReport|fallbackDiagram)\b/i,
  /const\s+(generatePlan|synthesizeDesign|inferTopology|calculateSubnet|assignGateway|buildSecurityZones|createRoutePlan|fakeValidation|fallbackReport|fallbackDiagram)\s*=/i,
  /export\s+function\s+(generatePlan|synthesizeDesign|inferTopology|calculateSubnet|assignGateway|buildSecurityZones|createRoutePlan|fakeValidation|fallbackReport|fallbackDiagram)\b/i,
];

for (const [relative, text] of textByRelative) {
  if (relative === 'frontend/src/lib/designSynthesis.types.ts') continue;
  for (const pattern of forbiddenFunctionPatterns) {
    assert(!pattern.test(text), `${relative} defines a forbidden browser-side engineering planner function`);
  }
}


const backendCanvasText = textByRelative.get('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx') || '';
const visibleDiagramMatch = backendCanvasText.match(/function buildVisibleDiagram[\s\S]*?function layoutNodesForView/);
assert(Boolean(visibleDiagramMatch), 'BackendDiagramCanvas must keep an inspectable buildVisibleDiagram function');
const visibleDiagramText = visibleDiagramMatch ? visibleDiagramMatch[0] : '';
assert(!/addLocalInternetBreakouts\(/.test(visibleDiagramText), 'diagram canvas must not add frontend-created local Internet nodes');
assert(!/addV1VpnFabric\(/.test(visibleDiagramText), 'diagram canvas must not add frontend-created VPN fabric nodes');
assert(!/supplementPresentationEdges\(/.test(visibleDiagramText), 'diagram canvas must not add frontend-created presentation edges');
assert(/dedupeEdgesForReadableView\(filteredEdges/.test(visibleDiagramText), 'diagram canvas may only dedupe/filter backend edges inside visible diagram preparation');


const reportPageText = textByRelative.get('frontend/src/pages/ProjectReportPage.tsx') || '';
assert(/reportTruthLabel/.test(reportPageText), 'report page must translate raw report evidence labels before display');
assert(!/polished trash/i.test(reportPageText), 'report page must use professional wording for unsupported or overclaimed outputs');
assert(!/Engine 1|Engine 2|Engine1|Engine2/.test(reportPageText), 'report page must not show internal engine numbering language');

const displayShellText = textByRelative.get('frontend/src/lib/backendDesignDisplayModel.ts') || '';
assert(/does not infer subnets/.test(displayShellText), 'backend-only display shell must explicitly reject browser-side design inference');
assert(/Frontend display shell only/.test(displayShellText), 'backend-only display shell must preserve honest empty-state notes');

console.log('Frontend truth check passed.');
