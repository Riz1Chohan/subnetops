const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assertIncludes(file, text, message) {
  const body = read(file);
  if (!body.includes(text)) {
    throw new Error(`${message}: missing ${text} in ${file}`);
  }
}

function assertJson(path, check, message) {
  const data = JSON.parse(read(path));
  if (!check(data)) throw new Error(message);
}

assertJson('package.json', (pkg) => ['0.79.0', '0.80.0', '0.81.0', '0.82.0', '0.83.0'].includes(pkg.version), 'Root package version must be 0.79.0 or later compatible Phase 83 for Phase 79 checks');
assertJson('package.json', (pkg) => Boolean(pkg.scripts['check:phase79-requirements-read-repair-materialization']), 'Phase 79 check script must be wired');

assertIncludes('backend/src/services/requirementsRuntimeProof.service.ts', 'REQUIREMENTS_RUNTIME_RELEASE', 'Runtime proof service must expose runtime release marker');
assertIncludes('backend/src/services/requirementsRuntimeProof.service.ts', 'selectedSiteCount', 'Runtime proof must expose selected site count');
assertIncludes('backend/src/services/requirementsRuntimeProof.service.ts', 'expectedMinimumVlans', 'Runtime proof must expose expected VLAN count');
assertIncludes('backend/src/services/requirementsRuntimeProof.service.ts', 'addressingRows', 'Runtime proof must expose addressing row count');
assertIncludes('backend/src/services/requirementsRuntimeProof.service.ts', 'assertRequirementsRuntimeProofPass', 'Runtime proof must be able to hard-fail save');

assertIncludes('backend/src/services/project.service.ts', 'runtimeProofBefore', 'Save path must return before runtime proof');
assertIncludes('backend/src/services/project.service.ts', 'runtimeProofAfter', 'Save path must return after runtime proof');
assertIncludes('backend/src/services/project.service.ts', 'assertRequirementsRuntimeProofPass(runtimeProofAfter)', 'Save path must fail when runtime proof is blocked');
assertIncludes('backend/src/services/project.service.ts', 'Phase 79 requirements read-repair materialization passed', 'Save changelog must record Phase 79 runtime proof');

assertIncludes('backend/src/controllers/project.controller.ts', 'getProjectRequirementsRuntimeProof', 'Controller must expose direct runtime proof route');
assertIncludes('backend/src/routes/project.routes.ts', '/:projectId/requirements-runtime-proof', 'Project route must expose direct runtime proof endpoint');
assertIncludes('backend/src/app.ts', 'REQUIREMENTS_RUNTIME_RELEASE', 'Health endpoints must reveal runtime release marker');

assertIncludes('frontend/src/features/projects/api.ts', 'RequirementsRuntimeProof', 'Frontend API must type runtime proof response');
assertIncludes('frontend/src/features/projects/api.ts', 'getRequirementsRuntimeProof', 'Frontend API must expose direct runtime proof fetcher');
assertIncludes('frontend/src/pages/ProjectRequirementsPage.tsx', 'Save response did not include Phase 79 runtime proof', 'Frontend must detect stale backend save responses');
assertIncludes('frontend/src/pages/ProjectRequirementsPage.tsx', 'Requirements runtime proof BLOCKED', 'Frontend must surface blocked runtime proof');
assertIncludes('frontend/src/pages/ProjectRequirementsPage.tsx', 'Save failed:', 'Frontend must show exact backend save failure');
assertIncludes('frontend/src/pages/ProjectRequirementsPage.tsx', 'Backend runtime proof', 'Frontend must display runtime proof counts');

console.log('Phase 79 requirements read-repair materialization static checks passed');

assertIncludes('backend/src/services/requirementsMaterialization.service.ts', 'ensureRequirementsMaterializedForRead', 'Phase 79 must expose read-repair materialization helper');
assertIncludes('backend/src/services/requirementsMaterialization.service.ts', 'Requirements read-repair failed during', 'Phase 79 read-repair must hard-fail if persistence is still broken');
assertIncludes('backend/src/services/designCore/designCore.repository.ts', 'ensureRequirementsMaterializedForRead(projectId, "SubnetOps runtime", "design-core-read")', 'Design-core reads must repair saved requirements before building snapshots');
assertIncludes('backend/src/services/export.service.ts', 'ensureRequirementsMaterializedForRead(projectId, "SubnetOps export", "export-read")', 'Report exports must repair saved requirements before composing report data');
assertIncludes('backend/src/services/project.service.ts', 'ensureRequirementsMaterializedForRead(projectId, "SubnetOps project read", "project-read")', 'Project reads must repair saved requirements before returning project data');

console.log('Phase 79 requirements read-repair materialization static checks passed');
