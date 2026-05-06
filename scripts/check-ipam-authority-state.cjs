#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`[ipam-authority-state] ${message}`); process.exit(1); };
const mustInclude = (rel, marker) => { if (!read(rel).includes(marker)) fail(`${rel} missing ${marker}`); };
const mustNotInclude = (rel, marker) => { if (read(rel).includes(marker)) fail(`${rel} still contains forbidden marker ${marker}`); };

mustInclude('backend/src/domain/ipam/authority-state.ts', 'V1_ENGINE2_IPAM_AUTHORITY_STATE_CONTRACT');
mustInclude('backend/src/domain/ipam/authority-state.ts', 'ENGINE1_PLANNED_ONLY');
mustInclude('backend/src/domain/ipam/authority-state.ts', 'ENGINE2_CANDIDATE_ALLOCATION');
mustInclude('backend/src/domain/ipam/authority-state.ts', 'ENGINE2_APPROVED_ALLOCATION');
mustInclude('backend/src/domain/ipam/authority-state.ts', 'ENGINE2_STALE_APPROVAL');
mustInclude('backend/src/domain/ipam/authority-state.ts', 'CANDIDATE_IPAM');
mustInclude('backend/src/domain/ipam/authority-state.ts', 'APPROVED_IPAM');
mustInclude('backend/src/domain/ipam/authority-state.ts', 'not implementation authority');

mustInclude('backend/src/domain/ipam/enterprise-ipam.ts', 'candidateAllocationCount');
mustInclude('backend/src/domain/ipam/enterprise-ipam.ts', 'approvedAllocationCount');
mustInclude('backend/src/domain/ipam/enterprise-ipam.ts', "approvedAllocationCount > 0");
mustInclude('backend/src/domain/ipam/enterprise-ipam.ts', "sourceOfTruthReadiness: EnterpriseReadiness = durablePoolCount > 0 && approvedAllocationCount > 0");

mustInclude('backend/src/services/designCore/designCore.enterpriseIpamTruthControl.ts', 'sourceTruthForIpamAuthorityState');
mustInclude('backend/src/services/designCore/designCore.enterpriseIpamTruthControl.ts', 'ipamAuthorityEvidenceLabel');
mustInclude('backend/src/services/designCore/designCore.enterpriseIpamTruthControl.ts', 'ENGINE2_CANDIDATE_ALLOCATION');
mustInclude('backend/src/services/designCore/designCore.enterpriseIpamTruthControl.ts', 'ENGINE1_PLANNED_ONLY');
mustInclude('backend/src/services/designCore/designCore.enterpriseIpamTruthControl.ts', 'candidateAllocationCount');

mustInclude('backend/src/services/exportDesignCoreReport.service.ts', 'candidate allocation(s)');
mustInclude('backend/src/services/exportDesignCoreReport.service.ts', 'approved allocation(s)');
mustInclude('backend/src/domain/reporting/report-export-truth.ts', 'candidate allocation rows');
mustInclude('frontend/src/lib/designCoreSnapshot.ts', 'ENGINE2_CANDIDATE_ALLOCATION');
mustInclude('frontend/src/lib/designCoreSnapshot.ts', 'CANDIDATE_IPAM');
mustInclude('frontend/src/pages/ProjectEnterpriseIpamPage.tsx', 'Create candidate allocation');

for (const rel of [
  'backend/src/services/designCore/designCore.enterpriseIpamTruthControl.ts',
  'backend/src/services/exportDesignCoreReport.service.ts',
  'backend/src/services/export.service.ts',
  'frontend/src/pages/ProjectOverviewPage.tsx',
  'frontend/src/pages/ProjectEnterpriseIpamPage.tsx',
]) {
  mustNotInclude(rel, 'ENGINE2_DURABLE_CANDIDATE');
  mustNotInclude(rel, 'ENGINE1_PROPOSAL_ONLY');
  mustNotInclude(rel, 'proposal-only');
  mustNotInclude(rel, 'durable allocation');
  mustNotInclude(rel, 'durable IPAM');
}

mustInclude('backend/package.json', 'selftest:ipam-authority-state');
mustInclude('package.json', 'check-ipam-authority-state.cjs');
mustInclude('scripts/check-regression-kill-switches.cjs', 'check-ipam-authority-state.cjs');
mustInclude('README.md', 'Candidate IPAM is not approved authority');

console.log('[ipam-authority-state] ok');
