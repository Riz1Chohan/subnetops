#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}
function fail(message) {
  console.error(`Phase 73 validation honesty check failed: ${message}`);
  process.exit(1);
}
function requireText(file, token) {
  const content = read(file);
  if (!content.includes(token)) fail(`${file} is missing token: ${token}`);
}

requireText('backend/src/services/validation.service.ts', 'addRequirementsHonestyValidation');
requireText('backend/src/services/validation.service.ts', 'parseRequirementsJson');
requireText('backend/src/services/validation.service.ts', 'REQ_SITE_COUNT_NOT_MATERIALIZED');
requireText('backend/src/services/validation.service.ts', 'REQ_NO_SEGMENTS_MATERIALIZED');
requireText('backend/src/services/validation.service.ts', 'REQ_USER_SEGMENT_MISSING');
requireText('backend/src/services/validation.service.ts', 'REQ_GUEST_SEGMENT_MISSING');
requireText('backend/src/services/validation.service.ts', 'REQ_MANAGEMENT_SEGMENT_MISSING');
requireText('backend/src/services/validation.service.ts', 'REQ_ADDRESS_ROWS_MISSING');
requireText('backend/src/services/validation.service.ts', 'REQ_TOPOLOGY_OBJECTS_MISSING');
requireText('backend/src/services/validation.service.ts', 'REQ_MULTISITE_LINKS_MISSING');
requireText('backend/src/services/validation.service.ts', 'REQ_REMOTE_ACCESS_CONSEQUENCE_MISSING');
requireText('backend/src/services/validation.service.ts', 'REQ_CLOUD_BOUNDARY_MISSING');
requireText('backend/src/services/validation.service.ts', 'REQ_SECURITY_FLOWS_MISSING');
requireText('backend/src/services/validation.service.ts', 'REQ_SCENARIO_PROOF_ZERO_PASS');
requireText('backend/src/services/validation.service.ts', 'addRequirementsHonestyValidation(results, projectId, project, designSnapshot);');
requireText('docs/doc/PHASE73-VALIDATION-HONESTY-HARDENING.md', 'An empty or under-materialized design must not validate as clean');
requireText('docs/doc/PHASE73-VALIDATION-HONESTY-HARDENING.md', 'There is no third option.');

console.log('Phase 73 validation honesty static checks passed.');
