#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const failures = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(condition, message) { if (!condition) failures.push(message); }
function assertIncludes(rel, text, message) { assert(read(rel).includes(text), message); }
const pkg = JSON.parse(read('package.json'));
const release = read('backend/src/services/requirementsRuntimeProof.service.ts');
const materializer = read('backend/src/services/requirementsMaterialization.service.ts');
const scenarioProof = read('backend/src/services/designCore/designCore.requirementsScenarioProof.ts');
const closure = read('backend/src/services/designCore/designCore.requirementsImpactClosure.ts');
const report = read('backend/src/services/exportDesignCoreReport.service.ts');
assert(pkg.version === '0.83.0', 'Root package version must be 0.83.0');
assert(String(pkg.scripts['check:phase83-requirement-propagation'] || '').includes('check-phase83-requirement-propagation.cjs'), 'Phase 83 check script must be wired');
assert(release.includes('PHASE_83_REQUIREMENT_PROPAGATION_COMPLETION_AUDIT'), 'Backend runtime marker must expose Phase 83');
assert(release.includes('version: "0.83.0"'), 'Backend runtime marker must expose 0.83.0');
assert(materializer.includes('createdDhcpScopes') && materializer.includes('updatedDhcpScopes'), 'Materializer summary must expose durable DHCP scope create/update counts');
assert(materializer.includes('upsertRequirementDhcpScope'), 'Materializer must create or refresh durable DHCP scope rows');
assert(materializer.includes('designDhcpScope.create') && materializer.includes('designDhcpScope.update'), 'Materializer must persist DHCP scope rows through Prisma');
assert(materializer.includes('expectedMinimumDhcpScopes'), 'Read-repair must include DHCP scope gap detection');
assert(materializer.includes('dhcpScopes: { select: { id: true } }'), 'Read-repair must count durable DHCP scopes');
assert(scenarioProof.includes('managementZoneIds') && scenarioProof.includes('vlanId === 90'), 'Management scenario proof must detect management object-model evidence');
assert(scenarioProof.includes('management interface object count'), 'Management proof must report management interface object evidence');
assert(closure.includes('handledFieldCount') && closure.includes('explicitlyUnusedKeys'), 'Requirement impact closure must distinguish handled/inventoried fields from uncaptured fields');
assert(closure.includes('durable DHCP scope evidence'), 'Requirement impact closure must expose DHCP scope evidence');
assert(report.includes('Phase 83 Requirement Propagation Completion Audit'), 'Report must include Phase 83 propagation audit section');
assert(report.includes('requirementOutputAddressRowCount'), 'Report must count authoritative addressing rows, not only proposals');
assert(report.includes('handled/inventoried fields'), 'Report must explicitly show handled/inventoried requirement fields');
assertIncludes('docs/doc/PHASE83-REQUIREMENT-PROPAGATION-COMPLETION-AUDIT.md', 'Phase 83', 'Phase 83 documentation must exist');
if (failures.length) {
  console.error('Phase 83 requirement propagation check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('Phase 83 requirement propagation checks passed');
