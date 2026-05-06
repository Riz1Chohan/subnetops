#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
function fail(message) {
  console.error(`Service validation coverage check failed: ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const requiredFiles = [
  'backend/src/domain/addressing/addressing-validation.ts',
  'backend/src/services/engineeringWritePaths.ts',
  'backend/src/services/engineeringWritePaths.selftest.ts',
];
for (const file of requiredFiles) assert(exists(file), `missing ${file}`);

const vlanService = read('backend/src/services/vlan.service.ts');
assert(vlanService.includes('./engineeringWritePaths.js'), 'VLAN service must use the service write-path validation helper');
assert(vlanService.includes('assertVlanAddressingWritable(data)'), 'createVlan must validate full addressing before write');
const updateIndex = vlanService.indexOf('buildVlanWriteCandidate(vlan, data)');
const writeIndex = vlanService.indexOf('tx.vlan.update');
assert(updateIndex !== -1 && writeIndex !== -1 && updateIndex < writeIndex, 'updateVlan must validate merged existing VLAN plus patch before the DB update');
assert(!vlanService.includes('collectVlanAddressingValidationMessages'), 'VLAN service must not keep a private validator path');

const siteService = read('backend/src/services/site.service.ts');
assert(siteService.includes('./engineeringWritePaths.js'), 'Site service must use the service write-path validation helper');
assert(siteService.includes('assertSiteAddressBlockWritable(data.defaultAddressBlock)'), 'createSite must validate site address block before write');
const siteUpdateIndex = siteService.indexOf('buildSiteWriteCandidate(site, data)');
const siteWriteIndex = siteService.indexOf('tx.site.update');
assert(siteUpdateIndex !== -1 && siteWriteIndex !== -1 && siteUpdateIndex < siteWriteIndex, 'updateSite must validate merged existing site plus patch before the DB update');
assert(!siteService.includes('collectSiteAddressBlockValidationMessages'), 'Site service must not keep a private validator path');

const projectService = read('backend/src/services/project.service.ts');
assert(projectService.includes('./engineeringWritePaths.js'), 'Project service must use shared generated-object validation before template/duplication writes');
assert(projectService.includes('assertGeneratedSiteAddressingWritable(siteTemplate, "Project template")'), 'Project templates must validate site address blocks before createMany/write');
assert(projectService.includes('assertGeneratedVlanAddressingWritable(vlanTemplate, "Project template")'), 'Project templates must validate VLAN addressing before createMany/write');
assert(projectService.includes('assertGeneratedSiteAddressingWritable(sourceSite, "Project duplication")'), 'Project duplication must validate copied site address blocks before write');
assert(projectService.includes('assertGeneratedVlanAddressingWritable(sourceVlan, "Project duplication")'), 'Project duplication must validate copied VLAN addressing before write');

const materializationService = read('backend/src/services/requirementsMaterialization.service.ts');
assert(materializationService.includes('./engineeringWritePaths.js'), 'Requirements materialization must use shared generated-object validation');
assert(/assertGeneratedSiteAddressingWritable\(\s*siteData\s*,\s*["']Requirements materializer["']\s*,?\s*\)/.test(materializationService), 'requirements materializer missing site validation call');
assert(/assertGeneratedVlanAddressingWritable\(\s*vlanData\s*,\s*["']Requirements materializer["']\s*,?\s*\)/.test(materializationService), 'requirements materializer missing VLAN validation call');
assert(/assertGeneratedDhcpScopeAddressingWritable\(\s*\{/.test(materializationService), 'requirements materializer missing DHCP validation call');
assert(materializationService.search(/assertGeneratedSiteAddressingWritable\(\s*siteData\s*,\s*["']Requirements materializer["']\s*,?\s*\)/) < materializationService.indexOf('tx.site.create'), 'requirements materializer must validate site data before site create');
assert(materializationService.search(/assertGeneratedVlanAddressingWritable\(\s*vlanData\s*,\s*["']Requirements materializer["']\s*,?\s*\)/) < materializationService.indexOf('tx.vlan.create'), 'requirements materializer must validate VLAN data before VLAN create');
assert(materializationService.search(/assertGeneratedDhcpScopeAddressingWritable\(\s*\{/) < materializationService.indexOf('tx.designDhcpScope.create'), 'requirements materializer must validate DHCP scope data before DHCP create');

const enterpriseService = read('backend/src/services/enterpriseIpam.service.ts');
assert(enterpriseService.includes('./engineeringWritePaths.js'), 'Engine 2 IPAM service must use the service write-path validation helper');
assert(enterpriseService.includes('assertDhcpScopeAddressingWritable'), 'DHCP scope writes must use shared addressing validation');
assert(enterpriseService.includes('parentSubnetCidr: vlan?.subnetCidr'), 'DHCP scope validation must bind scope to the selected VLAN subnet when present');
assert(enterpriseService.includes('parentSubnetCidr: allocation.cidr'), 'DHCP scope validation must bind scope to the selected allocation when present');

const addressingValidation = read('backend/src/domain/addressing/addressing-validation.ts');
for (const exported of ['validateSiteAddressBlock', 'validateVlanAddressing', 'validateDhcpScope', 'validateGateway', 'validateCanonicalCidr']) {
  assert(addressingValidation.includes(`export function ${exported}`), `addressing validation must export ${exported}`);
}
assert(!/from\s+["'][^"']*prisma[^"']*["']/.test(addressingValidation), 'addressing validation domain must not import Prisma');
assert(!/from\s+["'][^"']*express[^"']*["']/.test(addressingValidation), 'addressing validation domain must not import Express');

const backendPackage = JSON.parse(read('backend/package.json'));
const engineeringWritePaths = read('backend/src/services/engineeringWritePaths.ts');
for (const exported of ['assertSiteAddressBlockWritable', 'buildSiteWriteCandidate', 'assertGeneratedSiteAddressingWritable', 'assertGeneratedVlanAddressingWritable', 'assertGeneratedDhcpScopeAddressingWritable']) {
  assert(engineeringWritePaths.includes(`export function ${exported}`), `engineering write paths must export ${exported}`);
}
assert(backendPackage.scripts['selftest:engineering-write-paths'] === 'tsx src/services/engineeringWritePaths.selftest.ts', 'backend must expose the engineering write-path selftest');
assert(String(backendPackage.scripts['selftest:services'] || '').includes('selftest:engineering-write-paths'), 'backend service selftests must include engineering write-path coverage');
assert(String(backendPackage.scripts['selftest:all'] || '').includes('selftest:services'), 'backend full selftest must include service selftests');

const rootPackage = JSON.parse(read('package.json'));
assert(String(rootPackage.scripts['check:trust'] || '').includes('selftest:services'), 'root trust gate must run service write-path selftests');
assert(String(rootPackage.scripts['check:quality'] || '').includes('check-service-validation-coverage.cjs'), 'root quality gate must include static service validation coverage');

console.log('Service validation coverage check passed.');
