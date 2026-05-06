#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
function fail(message) {
  console.error(`Project CIDR validation check failed: ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

const requiredFiles = [
  'backend/src/domain/addressing/addressing-validation.ts',
  'backend/src/validators/project.schemas.ts',
  'backend/src/services/engineeringWritePaths.ts',
  'backend/src/services/engineeringWritePaths.selftest.ts',
];
for (const file of requiredFiles) assert(exists(file), `missing ${file}`);

const addressing = read('backend/src/domain/addressing/addressing-validation.ts');
for (const token of [
  'validateProjectBasePrivateRange',
  'normalizeProjectBasePrivateRange',
  'PROJECT_BASE_RANGE_NON_CANONICAL',
  'PROJECT_BASE_RANGE_NOT_PRIVATE',
  'RFC1918_PRIVATE_BLOCKS',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
]) {
  assert(addressing.includes(token), `addressing validation must include ${token}`);
}
assert(addressing.includes('Public ranges require an explicit future exception/review path'), 'public CIDR must not be saved as clean project truth');

const schema = read('backend/src/validators/project.schemas.ts');
assert(schema.includes('projectBasePrivateRangeSchema'), 'project schema must have a dedicated projectBasePrivateRangeSchema');
assert(schema.includes('validateProjectBasePrivateRange'), 'project schema must call shared validation brain');
assert(schema.includes('normalizeProjectBasePrivateRange'), 'project schema must normalize blank base ranges');
assert(!/basePrivateRange:\s*z\.string\(\)\.max\(50\)\.optional\(\)/.test(schema), 'basePrivateRange must not be only a max-length string');

const service = read('backend/src/services/project.service.ts');
for (const token of [
  'buildProjectWriteCandidate',
  'normalizeProjectDataForWrite',
  'assertGeneratedProjectBasePrivateRangeWritable',
  'const normalizedProjectData = normalizeProjectDataForWrite',
  'const normalizedData: Record<string, unknown> = normalizeProjectDataForWrite',
]) {
  assert(service.includes(token), `project service must include ${token}`);
}

const writePaths = read('backend/src/services/engineeringWritePaths.ts');
for (const token of [
  'assertProjectBasePrivateRangeWritable',
  'normalizeProjectBasePrivateRangeForWrite',
  'buildProjectWriteCandidate',
  'assertGeneratedProjectBasePrivateRangeWritable',
]) {
  assert(writePaths.includes(`export function ${token}`), `engineering write paths must export ${token}`);
}

const selftest = read('backend/src/services/engineeringWritePaths.selftest.ts');
for (const text of [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '10.0.0.9/24',
  '999.1.1.1/24',
  '8.8.8.0/24',
  'hello',
  'RFC1918 private IPv4 space',
]) {
  assert(selftest.includes(text), `engineering write-path selftest must cover ${text}`);
}

const rootPackage = JSON.parse(read('package.json'));
assert(String(rootPackage.scripts['check:quality'] || '').includes('check-project-cidr-validation.cjs'), 'root quality gate must include project CIDR validation regression check');

console.log('Project CIDR validation check passed.');
