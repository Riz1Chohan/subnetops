#!/usr/bin/env node
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Phase 66 proof check failed: ${message}`);
    process.exit(1);
  }
}

function includes(path, fragment, message) {
  assert(read(path).includes(fragment), `${message} (${path})`);
}

function notIncludes(path, fragment, message) {
  assert(!read(path).includes(fragment), `${message} (${path})`);
}

const materializer = read('backend/src/services/requirementsMaterialization.service.ts');
assert(materializer.includes('function isRequirementManagedVlan'), 'materializer must detect requirement-managed VLAN rows before refreshing them');
assert(materializer.includes('function isRequirementManagedSite'), 'materializer must detect requirement-managed site rows before refreshing site blocks');
assert(materializer.includes('estimatedHosts: isRequirementManagedVlan(matching, segment) ? segment.estimatedHosts'), 'existing requirement-managed VLAN host demand must refresh when requirements change');
assert(materializer.includes('subnetCidr: isRequirementManagedVlan(matching, segment) ? addressing.cidr'), 'existing requirement-managed VLAN subnet must refresh from the current addressing base/site index');
assert(materializer.includes('const defaultAddressBlock = existing && !isRequirementManagedSite(existing)'), 'site block refresh must distinguish manual site rows from requirement-managed site rows');
notIncludes('backend/src/services/requirementsMaterialization.service.ts', 'asBoolean(requirements.voice) || phoneCount > 0 || hasText(requirements.voiceQos)', 'voice QoS text must not create a voice VLAN when voice itself is not required');
includes('backend/src/services/requirementsMaterialization.service.ts', 'if (asBoolean(requirements.voice) || phoneCount > 0)', 'voice VLAN must still materialize when voice is selected or phones are counted');

notIncludes('backend/src/services/designCore/designCore.requirementsScenarioProof.ts', 'Boolean(requirementValue(requirements, "voiceQos"))', 'scenario proof must not treat voice QoS text as a selected voice requirement by itself');
includes('backend/src/services/designCore/designCore.requirementsScenarioProof.ts', 'const voice = requirementBoolean(requirements, "voice") || requirementNumber(requirements, "phoneCount") > 0;', 'scenario proof must use affirmative voice/phone evidence for voice scenario activation');

notIncludes('backend/src/services/designCore/designCore.securityPolicyFlow.ts', 'Boolean(requirementText(requirements, "voiceQos"))) && voiceZone', 'security policy flow must not create voice flows from QoS text alone');
includes('backend/src/services/designCore/designCore.securityPolicyFlow.ts', 'Boolean(requirementText(requirements, "monitoringModel"))', 'operations flow must be triggered by monitoring requirements');
includes('backend/src/services/designCore/designCore.securityPolicyFlow.ts', 'Boolean(requirementText(requirements, "loggingModel"))', 'operations flow must be triggered by logging requirements');
includes('backend/src/services/designCore/designCore.securityPolicyFlow.ts', 'Boolean(requirementText(requirements, "backupPolicy"))', 'operations flow must be triggered by backup requirements');

includes('backend/src/services/designCore/designCore.requirementsImpactClosure.ts', 'isNegativeOrZeroRequirementEvidence', 'closure audit must recognize negative/zero captured answers');
includes('backend/src/services/designCore/designCore.requirementsImpactClosure.ts', 'Captured negative/zero requirement evidence', 'closure audit must avoid flagging false checkboxes and zero counts as missing concrete output');
includes('backend/src/services/designCore/designCore.requirementsImpactClosure.ts', 'Direct affirmative requirement is captured', 'closure audit missing-evidence wording must apply to affirmative direct requirements');

const scenarioProof = read('backend/src/services/designCore/designCore.requirementsScenarioProof.ts');
for (const id of [
  'scenario-proof-user-capacity',
  'scenario-proof-site-count',
  'scenario-proof-guest-isolation',
  'scenario-proof-management-plane',
  'scenario-proof-remote-access',
  'scenario-proof-cloud-boundary',
  'scenario-proof-voice-qos',
  'scenario-proof-shared-device-isolation',
  'scenario-proof-operations-plane',
  'scenario-proof-resilience-wan',
  'scenario-proof-security-segmentation',
]) {
  assert(scenarioProof.includes(id), `scenario proof is missing ${id}`);
}

const projectHooks = read('frontend/src/features/projects/hooks.ts');
for (const key of [
  '["project", projectId]',
  '["project-sites", projectId]',
  '["project-vlans", projectId]',
  '["design-core", projectId]',
  '["enterprise-ipam", projectId]',
  '["validation", projectId]',
]) {
  assert(projectHooks.includes(key), `requirements save must invalidate ${key}`);
}
assert(projectHooks.includes('await runValidation(projectId)'), 'requirements save/update must rerun validation after materialization');

const overview = read('frontend/src/pages/ProjectOverviewPage.tsx');
for (const fragment of ['Requirement impact closure', 'Requirement scenario proof', 'directCapturedTraceableOnlyKeys', 'requirementsScenarioProof.signals']) {
  assert(overview.includes(fragment), `Project Overview must expose ${fragment}`);
}

const diagram = read('frontend/src/pages/ProjectDiagramPage.tsx');
for (const fragment of ['projectQuery.isLoading || sitesQuery.isLoading || vlansQuery.isLoading', 'const siteMap = new Map', 'const vlanMap = new Map', 'useAuthoritativeDesign', 'BackendDiagramCanvas', 'renderer-input problem, not proof that the project has no sites or VLANs']) {
  assert(diagram.includes(fragment), `Diagram workspace must prove propagation with ${fragment}`);
}

const report = read('backend/src/services/exportDesignCoreReport.service.ts');
for (const fragment of ['Requirement Traceability and Scenario Proof', 'Requirement Impact Closure', 'Requirement Scenario Proof', 'requirementsImpactClosure?.fieldOutcomes', 'requirementsScenarioProof?.signals']) {
  assert(report.includes(fragment), `PDF/DOCX report model must include ${fragment}`);
}

const csv = read('backend/src/services/export.service.ts');
for (const fragment of ['Section: "Requirement Impact Closure"', 'Section: "Requirement Scenario Proof"', 'designCore.requirementsImpactClosure.fieldOutcomes', 'designCore.requirementsScenarioProof.signals']) {
  assert(csv.includes(fragment), `CSV export must include ${fragment}`);
}

const pkg = JSON.parse(read('package.json'));
assert(/^0\.(66|67)\.0$/.test(pkg.version), 'root package version must be Phase 66 or later for runtime UI report proof');
assert(pkg.scripts['check:phase66-runtime-ui-report-proof'].startsWith('node scripts/check-phase66-runtime-ui-report-proof.cjs'), 'package script must expose Phase 66 proof check');
assert(pkg.scripts['check:phase65-requirement-scenario-proof'].includes('check:phase66-runtime-ui-report-proof'), 'Phase 65 chain must continue into Phase 66');

console.log('Phase 66 runtime/UI/report proof check passed.');
