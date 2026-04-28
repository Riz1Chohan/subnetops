#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'backend/src/services/designCore/designCore.implementationPlan.ts',
  'backend/src/services/designCore.types.ts',
  'frontend/src/lib/designCoreSnapshot.ts',
  'frontend/src/lib/designCoreAdapter.ts',
  'backend/src/lib/phase36ImplementationPlanningEngine.selftest.ts',
];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required Phase 36 file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

for (const file of requiredFiles) read(file);

const impl = read('backend/src/services/designCore/designCore.implementationPlan.ts');
const backendTypes = read('backend/src/services/designCore.types.ts');
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
const adapter = read('frontend/src/lib/designCoreAdapter.ts');
const selftest = read('backend/src/lib/phase36ImplementationPlanningEngine.selftest.ts');
const backendPackage = JSON.parse(read('backend/package.json'));

function requireIncludes(sourceName, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${sourceName} is missing required Phase 36 marker: ${fragment}`);
    }
  }
}

requireIncludes('backend implementation-plan types', backendTypes, [
  'readinessReasons: string[];',
  'blockers: string[];',
  'upstreamFindingIds: string[];',
  'blastRadius: string[];',
  'requiredEvidence: string[];',
  'acceptanceCriteria: string[];',
  'rollbackIntent: string;',
  'dependencyCount: number;',
  'dependencyObjectIds: string[];',
  'graphDependencyEdgeIds: string[];',
  'ImplementationDependencyGraph',
  'graphDependencyEdgeCount: number;',
  'preciseSecurityDependencyCount: number;',
  'stepWithBlastRadiusCount: number;',
  'stepWithRequiredEvidenceCount: number;',
  'stepWithRollbackIntentCount: number;',
  'operationalSafetyGateCount: number;',
  'operationalSafetyBlockedGateCount: number;',
  'highRiskStepWithSafetyDependencyCount: number;',
  'verificationScope: "object" | "flow" | "route" | "safety" | "cross-cutting";',
  'relatedObjectIds: string[];',
  'objectLevelVerificationCheckCount: number;',
  'routeLevelVerificationCheckCount: number;',
  'flowLevelVerificationCheckCount: number;',
  'blockedVerificationCheckCount: number;',
  'rollbackVerificationCheckCount: number;',
]);

requireIncludes('frontend implementation-plan types', frontendTypes, [
  'readinessReasons: string[];',
  'blockers: string[];',
  'upstreamFindingIds: string[];',
  'blastRadius: string[];',
  'requiredEvidence: string[];',
  'acceptanceCriteria: string[];',
  'rollbackIntent: string;',
  'dependencyCount: number;',
  'dependencyObjectIds: string[];',
  'graphDependencyEdgeIds: string[];',
  'ImplementationDependencyGraph',
  'graphDependencyEdgeCount: number;',
  'operationalSafetyGateCount: number;',
  'operationalSafetyBlockedGateCount: number;',
  'verificationScope: "object" | "flow" | "route" | "safety" | "cross-cutting";',
  'relatedObjectIds: string[];',
  'objectLevelVerificationCheckCount: number;',
  'routeLevelVerificationCheckCount: number;',
  'flowLevelVerificationCheckCount: number;',
  'blockedVerificationCheckCount: number;',
  'rollbackVerificationCheckCount: number;',
]);

requireIncludes('implementation plan engine', impl, [
  'type NormalizedUpstreamFinding',
  'function buildStep',
  'dependenciesWithGate',
  'collectUpstreamFindings',
  'buildGraphLookup',
  'dependenciesForSecurityFlow',
  'buildImplementationDependencyGraph',
  'SecurityNatReview',
  'natReviews: networkObjectModel.securityPolicyFlow.natReviews',
  'stepWithBlastRadiusCount',
  'stepWithRequiredEvidenceCount',
  'stepWithRollbackIntentCount',
  'operationalSafetyGateCount',
  'IMPLEMENTATION_STEP_EVIDENCE_INCOMPLETE',
  'IMPLEMENTATION_DEPENDENCIES_MISSING',
  'Phase 36C adds operational safety gates',
  'buildOperationalSafetySteps',
  'operationalSafetyContextForDevices',
  'IMPLEMENTATION_OPERATIONAL_SAFETY_BLOCKED',
  'Phase 36D expands verification from broad category checks into object-level and flow-level',
  'IMPLEMENTATION_VERIFICATION_MATRIX_INCOMPLETE',
  'implementation-check-rollback-readiness',
  'verificationScope: "route"',
  'verificationScope: "flow"',
]);

requireIncludes('implementation selftest', selftest, [
  'phase 36 adds engineering metadata to every implementation step',
  'phase 36 models real dependencies instead of a flat checklist',
  'phase 36B compiles graph-driven dependencies for security and NAT steps',
  'phase 36 treats uncovered NAT-required flows as implementation blockers',
  'phase 36 exposes evidence, rollback, and blast-radius summary proof',
  'phase 36C creates device operational-safety gates',
  'phase 36C gates risky route security and NAT steps on operational safety',
  'phase 36D generates object-level and flow-level verification matrix checks',
  'phase 36D keeps route missing next-hop as a route-step blocker',
  'phase 36D keeps DHCP without a matching gateway interface blocked',
  'phase 36D keeps missing security policy as a security-step blocker',
  'phase 36D propagates upstream routing ERROR findings into affected implementation steps',
  'phase 36D allows valid covered NAT to avoid blocked readiness',
  'phase 36D turns upstream security WARNING into affected-step review metadata',
]);

requireIncludes('frontend implementation adapter', adapter, [
  'dependency edge',
  'graph dependency edge',
  'dependencyObjectIds',
  'requiredEvidence',
  'blastRadius',
  'stepWithRollbackIntentCount',
  'operationalSafetyGateCount',
  'objectLevelVerificationCheckCount',
  'Required evidence: ${check.requiredEvidence.join(" | ")}',
  'Acceptance: ${check.acceptanceCriteria.join(" | ")}',
]);

if (!backendPackage.scripts['engine:selftest:phase36-implementation']) {
  throw new Error('backend/package.json is missing engine:selftest:phase36-implementation');
}
if (!backendPackage.scripts['engine:selftest:all'].includes('engine:selftest:phase36-implementation')) {
  throw new Error('backend/package.json engine:selftest:all does not include Phase 36 selftest');
}

console.log('Phase 36D verification-matrix implementation planner seam check passed.');
