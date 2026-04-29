#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
function fail(message) {
  console.error(`Phase 63 requirements policy consequence check failed: ${message}`);
  process.exit(1);
}
const securitySource = read('backend/src/services/designCore/designCore.securityPolicyFlow.ts');
for (const token of [
  'requirementsJson?: string | null',
  'parseRequirementsJson',
  'buildRequirementDrivenFlowInputs',
  'dedupedFlowInputs',
  'requirementKeys',
  'requirement-flow-guest-to-internal-default-deny',
  'requirement-flow-admin-to-management-plane-review',
  'requirement-flow-wan-to-remote-access-edge-review',
  'requirement-flow-internal-to-cloud-edge-review',
  'requirement-flow-voice-services-qos-review',
  'requirement-flow-shared-device-to-internal-default-deny',
  'Requirement-driven flow evidence',
]) {
  if (!securitySource.includes(token)) fail(`security policy flow missing ${token}`);
}
const networkSource = read('backend/src/services/designCore/designCore.networkObjectModel.ts');
for (const token of [
  'requirementsJson?: string | null',
  'requirementsJson: project.requirementsJson',
  'addressRow.role === "PRINTER"',
  'requirement-driven policy consequences',
]) {
  if (!networkSource.includes(token)) fail(`network object model missing ${token}`);
}
const backendTypes = read('backend/src/services/designCore.types.ts');
if (!/export interface SecurityFlowRequirement[\s\S]*requirementKeys\?: string\[\]/.test(backendTypes)) {
  fail('backend SecurityFlowRequirement does not expose requirementKeys');
}
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
if (!/export interface SecurityFlowRequirement[\s\S]*requirementKeys\?: string\[\]/.test(frontendTypes)) {
  fail('frontend SecurityFlowRequirement does not expose requirementKeys');
}
const packageJson = JSON.parse(read('package.json'));
if (packageJson.version !== '0.66.0') fail(`expected package version 0.66.0, found ${packageJson.version}`);
if (!packageJson.scripts['check:phase63-requirements-policy-consequences']) fail('package script missing check:phase63-requirements-policy-consequences');
console.log('Phase 63 requirements policy consequence check passed.');
