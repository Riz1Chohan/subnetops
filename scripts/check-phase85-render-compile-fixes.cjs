#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`Phase 85 check failed: ${message}`); process.exit(1); } }
const runtime = read('backend/src/services/requirementsRuntimeProof.service.ts');
assert(runtime.includes('PHASE_85_RENDER_COMPILE_FIXES_FOR_PHASE_84'), 'Phase 85 runtime marker missing');
assert(runtime.includes('version: "0.86.0"') || runtime.includes('version: "0.84.1"'), 'Phase 85 compile-fix version missing');
const viewModel = read('frontend/src/lib/backendSnapshotViewModel.ts');
assert(!viewModel.includes('backendProvidedCapacityOnly'), 'frontend still references undefined backendProvidedCapacityOnly');
assert(viewModel.includes('organizationBlock?.totalAddresses') || viewModel.includes('organizationCapacity'), 'frontend capacity summary is not derived from backend evidence');
const impact = read('backend/src/services/designCore/designCore.requirementsImpactClosure.ts');
assert(impact.includes('vlanId?: string | number'), 'requirements impact closure still rejects numeric DHCP VLAN ids');
assert(impact.includes('purpose?: string'), 'requirements impact closure does not tolerate interface purpose evidence');
assert(impact.includes('linkType?: string'), 'requirements impact closure does not tolerate linkType evidence');
const types = read('backend/src/services/designCore.types.ts');
assert(types.includes('purpose?: string;'), 'NetworkInterface lacks optional purpose compatibility field');
assert(types.includes('linkType?: string;'), 'NetworkLink lacks optional linkType compatibility field');
const proof = read('backend/src/services/designCore/designCore.requirementsScenarioProof.ts');
assert(!proof.includes('link.linkType ?? link.name'), 'scenario proof still directly reads undeclared linkType');
assert(!proof.includes('iface.purpose ?? iface.name'), 'scenario proof still directly reads undeclared purpose');
const project = read('backend/src/services/project.service.ts');
assert(project.includes('const sourceProjectForCopy = source as any;'), 'project duplication source scalar compatibility cast missing');
assert(project.includes('requirementsJson: sourceProjectForCopy.requirementsJson'), 'requirementsJson copy still risks minimal access-control inference');
const doc = read('docs/doc/PHASE85-RENDER-COMPILE-FIXES-FOR-PHASE84.md');
assert(doc.includes('PHASE_85_RENDER_COMPILE_FIXES_FOR_PHASE_84'), 'Phase 85 doc marker missing');
console.log('Phase 85 Render compile fixes for Phase 84 checks passed.');

process.exit(0);
