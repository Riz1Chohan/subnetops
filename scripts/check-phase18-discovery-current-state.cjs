#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
function fail(message) { console.error(`[phase18] ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }
function read(file) { return fs.readFileSync(path.join(process.cwd(), file), 'utf8'); }
const pkg = JSON.parse(read('package.json'));
const backendPkg = JSON.parse(read('backend/package.json'));
const files = [
  'backend/src/services/designCore/designCore.phase18DiscoveryCurrentStateControl.ts',
  'backend/src/services/designCore.types.ts',
  'backend/src/services/designCore.service.ts',
  'backend/src/services/validation.service.ts',
  'backend/src/services/exportDesignCoreReport.service.ts',
  'backend/src/services/export.service.ts',
  'frontend/src/lib/designCoreSnapshot.ts',
  'frontend/src/pages/ProjectDiscoveryPage.tsx',
  'frontend/src/layouts/ProjectLayout.tsx',
  'backend/src/lib/phase0EngineInventory.ts',
  'backend/src/lib/phase18DiscoveryCurrentState.selftest.ts',
  'docs/doc/PHASE18-DISCOVERY-CURRENT-STATE.md',
];
assert(['0.110.0','0.111.0','0.112.0'].includes(pkg.version), 'package version must be 0.110.0 or 0.111.0');
assert(pkg.scripts['check:phase18-discovery-current-state'] === 'node scripts/check-phase18-discovery-current-state.cjs', 'root phase18 check script missing');
assert(pkg.scripts['check:phase18-110-release'] === 'npm run check:phase18-discovery-current-state && npm run check:phase17-109-release', 'phase18 release chain missing');
assert(backendPkg.scripts['engine:selftest:phase18-discovery'] === 'tsx src/lib/phase18DiscoveryCurrentState.selftest.ts', 'backend phase18 selftest script missing');
assert((backendPkg.scripts['engine:selftest:all'] || '').includes('engine:selftest:phase18-discovery'), 'phase18 selftest not included in backend all selftests');
for (const file of files) assert(read(file).includes('PHASE18_DISCOVERY_CURRENT_STATE_CONTRACT'), `phase18 marker missing from ${file}`);
const control = read('backend/src/services/designCore/designCore.phase18DiscoveryCurrentStateControl.ts');
assert(control.includes('MANUAL_DISCOVERY_BOUNDARY_NO_LIVE_DISCOVERY_CLAIMS'), 'phase18 role marker missing');
assert(control.includes('MANUAL_OR_IMPORTED_EVIDENCE_ONLY_NOT_LIVE_DISCOVERY'), 'phase18 current-state authority marker missing');
assert(control.includes('NOT_PROVIDED') && control.includes('MANUALLY_ENTERED') && control.includes('IMPORTED') && control.includes('VALIDATED') && control.includes('CONFLICTING') && control.includes('REVIEW_REQUIRED'), 'phase18 discovery state machine missing');
assert(control.includes('Subnet/IPAM exports') && control.includes('DHCP scope exports') && control.includes('ARP tables') && control.includes('MAC tables') && control.includes('Routing tables') && control.includes('Firewall configs and policy exports') && control.includes('Switch configs') && control.includes('LLDP/CDP neighbor data') && control.includes('Cloud VPC/VNet data') && control.includes('NetBox-style inventory / CMDB'), 'phase18 structured import targets missing');
assert(control.includes('does not perform live network discovery') && control.includes('SNMP polling') && control.includes('config scraping') && control.includes('cloud API inventory') && control.includes('automatic reconciliation'), 'phase18 no-live-discovery proof boundary missing');
assert(control.includes('addTask("brownfield"') && control.includes('addTask("migration"') && control.includes('addTask("multiSite"') && control.includes('addTask("dualIsp"') && control.includes('addTask("cloudHybrid"'), 'phase18 requirement-created discovery tasks missing');
assert(read('backend/src/services/designCore.types.ts').includes('Phase18DiscoveryCurrentStateControlSummary'), 'phase18 backend type missing');
assert(read('frontend/src/lib/designCoreSnapshot.ts').includes('phase18DiscoveryCurrentState?: Phase18DiscoveryCurrentStateControlSummary'), 'frontend phase18 snapshot type missing');
assert(read('backend/src/services/designCore.service.ts').includes('buildPhase18DiscoveryCurrentStateControl') && read('backend/src/services/designCore.service.ts').includes('phase18DiscoveryCurrentState,'), 'design-core phase18 wiring missing');
assert(read('backend/src/services/validation.service.ts').includes('PHASE18_DISCOVERY_CURRENT_STATE_BLOCKING') && read('backend/src/services/validation.service.ts').includes('PHASE18_DISCOVERY_CURRENT_STATE_REVIEW_REQUIRED'), 'validation phase18 wiring missing');
assert(read('backend/src/services/exportDesignCoreReport.service.ts').includes('Phase 18 Discovery/Current-State'), 'DOCX/PDF report phase18 section missing');
assert(read('backend/src/services/export.service.ts').includes('Phase 18 Discovery/Current-State'), 'CSV export phase18 rows missing');
assert(read('frontend/src/pages/ProjectDiscoveryPage.tsx').includes('Phase 18 backend discovery/current-state contract') && read('frontend/src/layouts/ProjectLayout.tsx').includes('Backend contract'), 'ProjectDiscoveryPage/Layout phase18 evidence panel missing');
assert(read('backend/src/lib/phase0EngineInventory.ts').includes('phase18DiscoveryCurrentState') && read('backend/src/lib/phase0EngineInventory.ts').includes('currentPhase0Verdict: "CONTROLLED"'), 'phase0 inventory phase18 not controlled');
console.log('[phase18] discovery/current-state checks passed');
