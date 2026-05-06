#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function fail(message) {
  console.error(`[wizard-design-graph-lineage-completion] ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const graph = read('backend/src/services/designCore/designCore.graph.ts');
const backendTypes = read('backend/src/services/designCore.types.ts');
const implTypes = read('backend/src/domain/implementation/types.ts');
const diagramTypes = read('backend/src/domain/diagram/types.ts');
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
const packageJson = JSON.parse(read('package.json'));
const quality = String(packageJson.scripts['check:quality'] || '');

const relationships = [
  'site-owns-route-domain',
  'security-zone-belongs-to-route-domain',
  'policy-rule-uses-service',
  'nat-rule-translates-subnet',
  'route-intent-uses-next-hop-object',
  'security-flow-uses-service',
];

for (const relationship of relationships) {
  assert(graph.includes(`relationship: "${relationship}"`) || graph.includes(`relationship: '${relationship}'`), `graph builder must emit ${relationship}`);
  assert(backendTypes.includes(`"${relationship}"`), `backend design-core type union must include ${relationship}`);
  assert(implTypes.includes(`"${relationship}"`), `implementation domain type union must include ${relationship}`);
  assert(frontendTypes.includes(`"${relationship}"`), `frontend snapshot type union must include ${relationship}`);
  assert(diagramTypes.includes(`'${relationship}'`) || diagramTypes.includes(`"${relationship}"`), `diagram domain type union must include ${relationship}`);
}

assert(graph.includes('ensureSecurityServiceNode'), 'graph builder must create/reuse service evidence nodes for policy and flow references');
assert(graph.includes('routeDomain.siteIds'), 'route-domain nodes must be attached to saved site scope');
assert(graph.includes('natRule.sourceSubnetCidrs'), 'NAT rules must link to translated source subnet evidence');
assert(graph.includes('routeIntent.nextHopObjectId'), 'route intents must resolve next-hop object lineage when available');
assert(quality.includes('check-wizard-design-graph-lineage-completion.cjs'), 'check:quality must include wizard design-graph lineage guard');

const readme = read('README.md');
assert(readme.includes('Wizard design-graph lineage completion'), 'README must document wizard design-graph lineage completion');
assert(readme.includes('check-wizard-design-graph-lineage-completion.cjs'), 'README must document the design-graph lineage guard');

console.log('[wizard-design-graph-lineage-completion] ok');
