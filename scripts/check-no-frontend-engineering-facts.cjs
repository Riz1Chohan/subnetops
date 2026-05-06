#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const frontendSrc = path.join(root, 'frontend', 'src');
function fail(message) {
  console.error(`[no-frontend-engineering-facts] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}
function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/i.test(entry.name)) files.push(full);
  }
  return files;
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function relative(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

const files = walk(frontendSrc);
const frontendTruth = read('frontend/src/lib/frontendTruthContract.ts');
const hooks = read('frontend/src/features/designCore/hooks.ts');
const displayShell = read('frontend/src/lib/backendDesignDisplayModel.ts');
const adapter = read('frontend/src/lib/designCoreAdapter.ts');

assert(frontendTruth.includes('does not compute CIDR, VLAN, route, security-policy, report, or diagram engineering truth'), 'frontend truth contract must explicitly ban browser-side engineering fact creation');
assert(hooks.includes('isUsingFrontendFallback: false'), 'authoritative design hook must keep frontend engineering fallback disabled');
assert(!hooks.includes('isUsingFrontendFallback: true'), 'frontend engineering fallback must not be re-enabled');
assert(displayShell.includes('does not infer subnets') && displayShell.includes('Frontend display shell only'), 'empty display shell must stay non-authoritative');
assert(adapter.includes('CIDR canonicalization, masks, usable ranges, capacity, gateway, and containment facts are backend design-core outputs'), 'design-core adapter must document backend-only addressing authority');

const forbiddenIdentifier = [
  'allocateSubnet',
  'calculateSubnet',
  'deriveSubnet',
  'generateSubnet',
  'generateVlan',
  'materializeRequirements',
  'buildRoutingPlan',
  'generateRoutingPlan',
  'buildSecurityPolicy',
  'generateSecurityPolicy',
  'calculateUsableHosts',
  'canonicalizeCidr',
  'validateGateway',
  'validateVlanAddressing',
  'validateCanonicalCidr',
  'validateDhcpScope',
  'ipToInt',
  'intToIp',
  'ipv4ToNumber',
  'numberToIpv4',
  'nextSubnet',
  'subnetMaskFromPrefix',
  'broadcastAddressForCidr',
  'networkAddressForCidr',
];
const forbiddenDeclaration = new RegExp(`(?:function|const|let|var|export\\s+function)\\s+(?:${forbiddenIdentifier.join('|')})\\b`, 'i');
const forbiddenCalls = new RegExp(`\\b(?:${forbiddenIdentifier.join('|')})\\s*\\(`, 'i');
const forbiddenImports = [
  /from\s+["'][^"']*backend\/src\/domain\/addressing/i,
  /from\s+["'][^"']*backend\/src\/services/i,
  /from\s+["'][^"']*requirementsMaterialization/i,
  /from\s+["'][^"']*engineeringWritePaths/i,
];
const cidrMathPatterns = [
  /\.split\(["']\/["']\).*Math\.pow\(2,?\s*32/i,
  /Math\.pow\(2,?\s*32\s*-\s*prefix/i,
  /(?:>>>|<<)\s*\d+.*(?:cidr|ip|subnet|gateway)/i,
  /(?:cidr|subnet|gateway).*?(?:>>>|<<)\s*\d+/i,
];

for (const file of files) {
  const rel = relative(file);
  const text = fs.readFileSync(file, 'utf8');
  if (rel.endsWith('.d.ts') || rel === 'frontend/src/lib/designSynthesis.types.ts' || rel === 'frontend/src/lib/designCoreSnapshot.ts') continue;
  assert(!forbiddenDeclaration.test(text), `${rel} declares a browser-side engineering fact function`);
  for (const pattern of forbiddenImports) assert(!pattern.test(text), `${rel} imports backend engineering authority into the browser`);
  for (const pattern of cidrMathPatterns) assert(!pattern.test(text), `${rel} appears to perform browser-side CIDR/IP math`);

  const localAllowed = rel === 'frontend/src/lib/designCoreAdapter.ts' || rel === 'frontend/src/lib/backendSnapshotViewModel.ts';
  if (!localAllowed) {
    assert(!forbiddenCalls.test(text), `${rel} calls a forbidden browser-side engineering function`);
  }
}

console.log('[no-frontend-engineering-facts] ok');
