#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const selftest = read('backend/src/lib/phase41ScenarioMatrix.selftest.ts');
const packageJson = JSON.parse(read('package.json'));

expect(
  selftest.includes('const zoneRoles = new Set<string>(snapshot.networkObjectModel.securityZones.map((zone) => zone.zoneRole));'),
  'Phase 41 scenario selftest must widen zoneRoles to Set<string> so Render TypeScript build accepts requiredZoneRoles iteration.'
);

expect(
  !selftest.includes('const zoneRoles = new Set(snapshot.networkObjectModel.securityZones.map((zone) => zone.zoneRole));'),
  'Phase 41 scenario selftest still contains the narrow inferred Set that caused Render TS2345.'
);

expect(
  fs.existsSync(path.join(root, 'docs/doc/PHASE67-RENDER-BACKEND-COMPILE-FIX.md')),
  'Missing Phase 67 documentation under docs/doc.'
);

expect(/^0\.(6[7-9]|7[0-9])\.0$/.test(packageJson.version), 'Root package version must be 0.67.0 or later for Phase 67.');
expect(
  packageJson.scripts?.['check:phase67-render-backend-compile-fix']?.startsWith('node scripts/check-phase67-render-backend-compile-fix.cjs'),
  'Missing check:phase67-render-backend-compile-fix script.'
);
expect(
  packageJson.scripts?.['check:phase66-runtime-ui-report-proof']?.includes('check:phase67-render-backend-compile-fix'),
  'Phase 66 check chain must include Phase 67 compile-fix gate.'
);

if (failures.length) {
  console.error('Phase 67 Render backend compile fix check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('Phase 67 Render backend compile fix check passed.');
