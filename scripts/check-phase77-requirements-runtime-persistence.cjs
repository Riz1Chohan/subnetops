#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(message) { console.error(`Phase 77 requirements runtime persistence check failed: ${message}`); process.exit(1); }
function requireText(rel, needle) {
  const text = read(rel);
  if (!text.includes(needle)) fail(`${rel} is missing required text: ${needle}`);
}
function requireOrder(rel, first, second) {
  const text = read(rel);
  const firstIndex = text.indexOf(first);
  const secondIndex = text.indexOf(second);
  if (firstIndex === -1) fail(`${rel} is missing required text: ${first}`);
  if (secondIndex === -1) fail(`${rel} is missing required text: ${second}`);
  if (firstIndex > secondIndex) fail(`${rel} has ${first} after ${second}; route/order contract is unsafe.`);
}

requireText('frontend/src/pages/ProjectRequirementsPage.tsx', 'useSaveProjectRequirements(projectId)');
requireText('frontend/src/pages/ProjectRequirementsPage.tsx', 'requirementsJson: stringifyRequirementsProfile(requirements)');
requireText('frontend/src/features/projects/api.ts', 'export function saveProjectRequirements(projectId: string');
requireText('frontend/src/features/projects/api.ts', '`/projects/${projectId}/requirements`');
requireText('frontend/src/features/projects/hooks.ts', 'mutationFn: (values: Parameters<typeof saveProjectRequirements>[1]) => saveProjectRequirements(projectId, values)');
requireText('frontend/src/features/projects/hooks.ts', 'queryKey: ["project-sites", projectId]');
requireText('frontend/src/features/projects/hooks.ts', 'queryKey: ["project-vlans", projectId]');
requireText('frontend/src/features/projects/hooks.ts', 'queryKey: ["design-core", projectId]');
requireText('frontend/src/features/projects/hooks.ts', 'await runValidation(projectId)');

requireOrder('backend/src/routes/project.routes.ts', 'router.patch("/:projectId/requirements", asyncHandler(projectController.saveProjectRequirements));', 'router.patch("/:projectId", asyncHandler(projectController.updateProject));');
requireText('backend/src/app.ts', 'app.use("/api/projects", projectRoutes);');
requireText('backend/src/controllers/project.controller.ts', 'saveProjectRequirementsSchema.parse(req.body)');
requireText('backend/src/controllers/project.controller.ts', 'projectService.saveProjectRequirements(requireParam(req, "projectId"), userId, data, req.user?.email)');

requireText('backend/src/services/requirementsMaterialization.service.ts', 'options?: { requirementsJson?: string | null }');
requireText('backend/src/services/requirementsMaterialization.service.ts', 'const requirementsSource = typeof options?.requirementsJson === "string" ? options.requirementsJson : project?.requirementsJson;');
requireText('backend/src/services/requirementsMaterialization.service.ts', 'await tx.site.create({');
requireText('backend/src/services/requirementsMaterialization.service.ts', 'projectId,');
requireText('backend/src/services/requirementsMaterialization.service.ts', 'defaultAddressBlock,');
requireText('backend/src/services/requirementsMaterialization.service.ts', 'await tx.vlan.create({');
for (const required of ['siteId: site.id', 'vlanId: segment.vlanId', 'vlanName: segment.vlanName', 'segmentRole: segment.segmentRole', 'subnetCidr: addressing.cidr', 'gatewayIp: addressing.gateway ?? ""', 'dhcpEnabled: segment.dhcpEnabled', 'estimatedHosts: segment.estimatedHosts']) {
  requireText('backend/src/services/requirementsMaterialization.service.ts', required);
}

requireText('backend/src/services/project.service.ts', 'await materializeRequirementsForProject(tx, projectId, actorLabel, { requirementsJson: data.requirementsJson })');
requireText('backend/src/services/project.service.ts', 'await materializeRequirementsForProject(tx, projectId, actorLabel, { requirementsJson: normalizedData["requirementsJson"] as string })');
requireText('backend/src/services/project.service.ts', 'await materializeRequirementsForProject(tx, project.id, actorLabel, { requirementsJson: data.requirementsJson })');
requireText('backend/src/services/project.service.ts', 'async function assertRequirementsPersistenceContract');
requireText('backend/src/services/project.service.ts', 'Requirements materialization failed: selected ${selectedSiteCount} site(s), but only ${siteCount} durable Site row(s) exist after save.');
requireText('backend/src/services/project.service.ts', 'Requirements materialization failed: expected at least ${selectedSiteCount * expectedSegments.length} durable VLAN/segment row(s)');
requireText('backend/src/services/project.service.ts', 'outputCounts: { sites: siteCount, vlans: vlanCount');

requireText('backend/src/services/designCore/designCore.repository.ts', 'sites: {');
requireText('backend/src/services/designCore/designCore.repository.ts', 'vlans: {');
requireText('backend/src/services/designCore.service.ts', 'const addressingRows = buildAddressingRows(project, siteBlocks, issues);');
requireText('backend/src/services/designCore.service.ts', 'siteCount: project.sites.length');
requireText('backend/src/services/designCore.service.ts', 'vlanCount: addressingRows.length');

requireText('docs/doc/PHASE77-REQUIREMENTS-MATERIALIZATION-RUNTIME-PERSISTENCE-FIX.md', 'Phase 77 — Requirements Materialization Runtime Persistence Fix');
requireText('docs/doc/PHASE77-REQUIREMENTS-MATERIALIZATION-RUNTIME-PERSISTENCE-FIX.md', 'first real break fixed');
requireText('docs/doc/PHASE77-REQUIREMENTS-MATERIALIZATION-RUNTIME-PERSISTENCE-FIX.md', 'selected 10 site(s) must not complete with 0 durable Site row(s)');

const pkg = JSON.parse(read('package.json'));
if (!/^0\.(77|78)\.0$/.test(pkg.version)) fail(`expected package version 0.77.0 or 0.78.0, got ${pkg.version}`);
if (!pkg.scripts['check:phase77-requirements-runtime-persistence']?.includes('node scripts/check-phase77-requirements-runtime-persistence.cjs')) fail('missing phase77 check script.');
if (!pkg.scripts['check:phase76-requirements-save-field-coverage']?.includes('check:phase77-requirements-runtime-persistence')) fail('Phase 76 script must chain Phase 77.');

console.log('Phase 77 requirements runtime persistence checks passed.');
