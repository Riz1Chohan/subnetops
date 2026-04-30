#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error(`Phase 70 requirements execution wiring check failed: ${msg}`); process.exit(1); }
function requireText(rel, needle) {
  const text = read(rel);
  if (!text.includes(needle)) fail(`${rel} missing required text: ${needle}`);
}

requireText('backend/src/routes/project.routes.ts', 'router.patch("/:projectId/requirements", asyncHandler(projectController.saveProjectRequirements));');
requireText('backend/src/controllers/project.controller.ts', 'saveProjectRequirementsSchema.parse(req.body)');
requireText('backend/src/controllers/project.controller.ts', 'projectService.saveProjectRequirements(requireParam(req, "projectId"), userId, data, req.user?.email)');
requireText('backend/src/validators/project.schemas.ts', 'saveProjectRequirementsSchema');
requireText('backend/src/validators/project.schemas.ts', 'requirementsJson: z.string().min(2).max(50000)');
requireText('backend/src/validators/project.schemas.ts', 'requirementsJson: z.string().max(50000).optional()');
requireText('backend/src/services/project.service.ts', 'export async function saveProjectRequirements(');
requireText('backend/src/services/project.service.ts', 'await materializeRequirementsForProject(tx, projectId, actorLabel, { requirementsJson: data.requirementsJson })');
requireText('backend/src/services/project.service.ts', 'outputCounts: { sites: siteCount, vlans: vlanCount }');
requireText('backend/src/services/project.service.ts', 'Requirements saved and materialized:');
requireText('frontend/src/features/projects/api.ts', 'export function saveProjectRequirements(projectId: string');
requireText('frontend/src/features/projects/api.ts', '`/projects/${projectId}/requirements`');
requireText('frontend/src/features/projects/hooks.ts', 'export function useSaveProjectRequirements(projectId: string)');
requireText('frontend/src/features/projects/hooks.ts', 'queryKey: ["project-sites", projectId]');
requireText('frontend/src/features/projects/hooks.ts', 'queryKey: ["project-vlans", projectId]');
requireText('frontend/src/features/projects/hooks.ts', 'queryKey: ["design-core", projectId]');
requireText('frontend/src/features/projects/hooks.ts', 'await runValidation(projectId)');
requireText('frontend/src/pages/ProjectRequirementsPage.tsx', 'useSaveProjectRequirements(projectId)');
requireText('frontend/src/pages/ProjectRequirementsPage.tsx', 'Saved and materialized at');
requireText('frontend/src/pages/ProjectRequirementsPage.tsx', 'result.outputCounts.sites');
requireText('docs/doc/PHASE70-REQUIREMENTS-SAVE-EXECUTION-WIRING.md', 'PATCH /api/projects/:projectId/requirements');
requireText('docs/doc/PHASE70-REQUIREMENTS-SAVE-EXECUTION-WIRING.md', 'outputCounts.sites >= 10');

console.log('Phase 70 requirements execution wiring check passed.');
