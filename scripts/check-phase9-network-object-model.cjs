const fs = require('fs');
const path = require('path');
const root = process.cwd();
const checks = [
  ['backend/src/services/designCore/designCore.networkObjectModel.ts', ['Phase 9 object truth label', 'annotateObject', 'sourceRequirementIds', 'implementationReadiness', 'diagramImpact']],
  ['backend/src/services/designCore/designCore.phase9NetworkObjectModelControl.ts', ['PHASE9_NETWORK_OBJECT_MODEL_TRUTH_CONTRACT', 'NETWORK_OBJECT_METADATA_GAP', 'NETWORK_OBJECT_FAKE_AUTHORITY_RISK', 'NETWORK_OBJECT_REQUIREMENT_LINEAGE_GAP']],
  ['backend/src/services/designCore.types.ts', ['Phase9NetworkObjectModelControlSummary', 'Phase9NetworkObjectLineageRow', 'phase9NetworkObjectModel', 'Phase9NetworkObjectImplementationReadiness']],
  ['backend/src/services/designCore.service.ts', ['buildPhase9NetworkObjectModelControl', 'phase9NetworkObjectModel']],
  ['backend/src/services/validation.service.ts', ['PHASE9_NETWORK_OBJECT_MODEL_BLOCKING', 'PHASE9_NETWORK_OBJECT_MODEL_REVIEW_REQUIRED']],
  ['backend/src/services/export.service.ts', ['Phase 9 Network Object Model Truth', 'Phase 9 Object Lineage Rows', 'Phase 9 Requirement Object Lineage']],
  ['backend/src/services/exportDesignCoreReport.service.ts', ['Phase 9 Network Object Model Truth', 'Phase 9 Object Model Summary', 'Phase 9 Object Findings']],
  ['frontend/src/lib/designCoreSnapshot.ts', ['Phase9NetworkObjectModelControlSummary', 'phase9NetworkObjectModel', 'Phase9NetworkObjectProvenanceFields']],
  ['frontend/src/pages/ProjectOverviewPage.tsx', ['Phase 9 network object model truth', 'metadataGapObjectCount', 'requirementObjectLineage']],
  ['backend/src/lib/phase0EngineInventory.ts', ['designCore.phase9NetworkObjectModelControl.ts', 'phase9NetworkObjectModel.selftest.ts', 'currentPhase0Verdict: "CONTROLLED"']],
  ['backend/src/lib/phase9NetworkObjectModel.selftest.ts', ['Network object model truth selftest passed', 'PHASE9_NETWORK_OBJECT_MODEL_TRUTH_CONTRACT']],
  ['docs/doc/PHASE9-NETWORK-OBJECT-MODEL-TRUTH.md', ['PHASE9_NETWORK_OBJECT_MODEL_TRUTH_CONTRACT', 'Requirement input → normalized requirement signal', 'No fake topology authority']],
  ['package.json', ['check:phase9-network-object-model', 'check:phase9-107-release']],
  ['backend/package.json', ['engine:selftest:phase9-network-object-model']],
];
const failures = [];
for (const [file, markers] of checks) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { failures.push(`${file}: missing file`); continue; }
  const text = fs.readFileSync(full, 'utf8');
  for (const marker of markers) if (!text.includes(marker)) failures.push(`${file}: missing marker ${marker}`);
}
if (failures.length) { console.error('[phase9] Network object model truth checks failed'); failures.forEach(f => console.error(`- ${f}`)); process.exit(1); }
console.log('[phase9] Network object model truth checks passed');
