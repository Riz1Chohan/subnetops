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

assertJson('package.json', (pkg) => pkg.version === '0.78.0', 'Root package version must be 0.78.0 for Phase 78');
assertJson('package.json', (pkg) => Boolean(pkg.scripts['check:phase78-requirements-runtime-truth-bomb']), 'Phase 78 check script must be wired');

assertIncludes('backend/src/services/requirementsRuntimeProof.service.ts', 'PHASE_78_REQUIREMENTS_RUNTIME_TRUTH_BOMB', 'Runtime proof service must expose Phase 78 marker');
assertIncludes('backend/src/services/requirementsRuntimeProof.service.ts', 'selectedSiteCount', 'Runtime proof must expose selected site count');
assertIncludes('backend/src/services/requirementsRuntimeProof.service.ts', 'expectedMinimumVlans', 'Runtime proof must expose expected VLAN count');
assertIncludes('backend/src/services/requirementsRuntimeProof.service.ts', 'addressingRows', 'Runtime proof must expose addressing row count');
assertIncludes('backend/src/services/requirementsRuntimeProof.service.ts', 'assertRequirementsRuntimeProofPass', 'Runtime proof must be able to hard-fail save');

assertIncludes('backend/src/services/project.service.ts', 'runtimeProofBefore', 'Save path must return before runtime proof');
assertIncludes('backend/src/services/project.service.ts', 'runtimeProofAfter', 'Save path must return after runtime proof');
assertIncludes('backend/src/services/project.service.ts', 'assertRequirementsRuntimeProofPass(runtimeProofAfter)', 'Save path must fail when runtime proof is blocked');
assertIncludes('backend/src/services/project.service.ts', 'Phase 78 requirements runtime truth bomb passed', 'Save changelog must record Phase 78 runtime proof');

assertIncludes('backend/src/controllers/project.controller.ts', 'getProjectRequirementsRuntimeProof', 'Controller must expose direct runtime proof route');
assertIncludes('backend/src/routes/project.routes.ts', '/:projectId/requirements-runtime-proof', 'Project route must expose direct runtime proof endpoint');
assertIncludes('backend/src/app.ts', 'REQUIREMENTS_RUNTIME_RELEASE', 'Health endpoints must reveal runtime release marker');

assertIncludes('frontend/src/features/projects/api.ts', 'RequirementsRuntimeProof', 'Frontend API must type runtime proof response');
assertIncludes('frontend/src/features/projects/api.ts', 'getRequirementsRuntimeProof', 'Frontend API must expose direct runtime proof fetcher');
assertIncludes('frontend/src/pages/ProjectRequirementsPage.tsx', 'Save response did not include Phase 78 runtime proof', 'Frontend must detect stale backend save responses');
assertIncludes('frontend/src/pages/ProjectRequirementsPage.tsx', 'Requirements runtime proof BLOCKED', 'Frontend must surface blocked runtime proof');
assertIncludes('frontend/src/pages/ProjectRequirementsPage.tsx', 'Save failed:', 'Frontend must show exact backend save failure');
assertIncludes('frontend/src/pages/ProjectRequirementsPage.tsx', 'Backend runtime proof', 'Frontend must display runtime proof counts');

console.log('Phase 78 requirements runtime truth bomb static checks passed');
