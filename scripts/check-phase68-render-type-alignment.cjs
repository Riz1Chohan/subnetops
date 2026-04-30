const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function expect(condition, message) {
  if (!condition) {
    console.error(`Phase 68 Render type alignment check failed: ${message}`);
    process.exit(1);
  }
}

const packageJson = JSON.parse(read('package.json'));
const impactClosure = read('backend/src/services/designCore/designCore.requirementsImpactClosure.ts');
const scenarioProof = read('backend/src/services/designCore/designCore.requirementsScenarioProof.ts');
const projectService = read('backend/src/services/project.service.ts');
const phase68Doc = 'docs/doc/PHASE68-RENDER-TYPE-ALIGNMENT.md';

expect(/^0\.(68|69|7[0-9])\.0$/.test(packageJson.version), 'root package version must be 0.68.0 or later.');
expect(
  packageJson.scripts?.['check:phase68-render-type-alignment']?.includes('node scripts/check-phase68-render-type-alignment.cjs'),
  'missing check:phase68-render-type-alignment script.'
);
expect(
  packageJson.scripts?.['check:phase67-render-backend-compile-fix']?.includes('check:phase68-render-type-alignment'),
  'Phase 67 chain must continue into Phase 68.'
);

expect(
  impactClosure.includes('vlanId?: string | number'),
  'requirements impact closure model must accept real NetworkObjectModel DHCP vlanId numbers.'
);
expect(
  impactClosure.includes('interfaceRole?: string') && impactClosure.includes('linkRole?: string'),
  'requirements impact closure model must accept actual interfaceRole/linkRole fields.'
);
expect(
  scenarioProof.includes('link.linkRole ?? link.name') && !scenarioProof.includes('link.linkType ?? link.name'),
  'scenario proof must use real NetworkLink.linkRole instead of non-existent linkType.'
);
expect(
  scenarioProof.includes('iface.interfaceRole ?? iface.name') && !scenarioProof.includes('iface.purpose ?? iface.name'),
  'scenario proof must use real NetworkInterface.interfaceRole instead of non-existent purpose.'
);
expect(
  projectService.includes('const normalizedData: Record<string, unknown>') &&
    projectService.includes('normalizedData["requirementsJson"]'),
  'project update requirements materialization guard must use an explicitly typed normalizedData record.'
);
expect(fs.existsSync(phase68Doc), 'missing Phase 68 documentation under docs/doc.');

console.log('Phase 68 Render type alignment check passed.');
