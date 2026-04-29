#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error(`[phase60] ${message}`);
    process.exit(1);
  }
}

const backendSnapshotViewModel = read('frontend/src/lib/backendSnapshotViewModel.ts');
assert(!backendSnapshotViewModel.includes('backendProvidedCapacityOnly'), 'frontend still references undefined backendProvidedCapacityOnly');
assert(
  backendSnapshotViewModel.includes('organizationCapacity: snapshot.organizationBlock?.totalAddresses ?? 0,'),
  'frontend organization capacity must come from backend snapshot organizationBlock with safe fallback'
);

const phase41Fixtures = read('backend/src/lib/phase41ScenarioMatrix.fixtures.ts');
assert(
  phase41Fixtures.includes('import type { SecurityZone } from "../services/designCore.types.js";'),
  'phase41 scenario fixtures must import backend SecurityZone role type'
);
assert(
  phase41Fixtures.includes('requiredZoneRoles?: Array<SecurityZone["zoneRole"]>;'),
  'phase41 expected zone roles must be typed as SecurityZone zoneRole literals, not broad string[]'
);

console.log('[phase60] Render deploy compile fix checks passed.');
