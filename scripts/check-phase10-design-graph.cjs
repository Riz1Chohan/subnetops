const fs = require('fs');
const path = require('path');
const root = process.cwd();
const checks = [
  ['backend/src/services/designCore/designCore.phase10DesignGraphControl.ts', ['PHASE10_DESIGN_GRAPH_DEPENDENCY_INTEGRITY_CONTRACT', 'REQUIREMENT_TO_OBJECT_TO_CONSUMER_DEPENDENCY_GRAPH', 'requirementDependencyPaths', 'objectCoverage', 'PHASE10_DIAGRAM_NODE_WITHOUT_BACKEND_GRAPH_OBJECT', 'PHASE10_REQUIREMENT_DEPENDENCY_PATH_GAP']],
  ['backend/src/services/designCore/designCore.graph.ts', ['DesignGraph', 'integrityFindings', 'implementation-step-targets-object', 'security-flow-covered-by-policy']],
  ['backend/src/services/designCore.types.ts', ['Phase10DesignGraphControlSummary', 'Phase10RequirementDependencyPath', 'Phase10DesignGraphObjectCoverageRow', 'phase10DesignGraph']],
  ['backend/src/services/designCore.service.ts', ['buildPhase10DesignGraphControl', 'phase10DesignGraph']],
  ['backend/src/services/validation.service.ts', ['PHASE10_DESIGN_GRAPH_BLOCKING', 'PHASE10_DESIGN_GRAPH_REVIEW_REQUIRED']],
  ['backend/src/services/export.service.ts', ['Phase 10 Design Graph Dependency Integrity', 'Phase 10 Requirement Dependency Paths', 'Phase 10 Object Graph Coverage']],
  ['backend/src/services/exportDesignCoreReport.service.ts', ['Phase 10 Design Graph Dependency Integrity', 'Phase 10 Requirement Dependency Paths', 'Phase 10 Graph Findings']],
  ['frontend/src/lib/designCoreSnapshot.ts', ['Phase10DesignGraphControlSummary', 'phase10DesignGraph', 'Phase10RequirementDependencyPath']],
  ['frontend/src/pages/ProjectOverviewPage.tsx', ['Phase 10 design graph dependency integrity', 'requirementDependencyPaths', 'objectCoverageGapCount']],
  ['backend/src/lib/phase0EngineInventory.ts', ['designCore.phase10DesignGraphControl.ts', 'phase10DesignGraph.selftest.ts', 'currentPhase0Verdict: "CONTROLLED"']],
  ['backend/src/lib/phase10DesignGraph.selftest.ts', ['Design graph dependency integrity selftest passed', 'PHASE10_DESIGN_GRAPH_DEPENDENCY_INTEGRITY_CONTRACT']],
  ['docs/doc/PHASE10-DESIGN-GRAPH-DEPENDENCY-INTEGRITY.md', ['PHASE10_DESIGN_GRAPH_DEPENDENCY_INTEGRITY_CONTRACT', 'requirement → object → graph relationship', 'No diagram-only topology authority']],
  ['package.json', ['check:phase10-design-graph', 'check:phase10-107-release']],
  ['backend/package.json', ['engine:selftest:phase10-design-graph']],
];
const failures = [];
for (const [file, markers] of checks) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { failures.push(`${file}: missing file`); continue; }
  const text = fs.readFileSync(full, 'utf8');
  for (const marker of markers) if (!text.includes(marker)) failures.push(`${file}: missing marker ${marker}`);
}
if (failures.length) { console.error('[phase10] Design graph dependency integrity checks failed'); failures.forEach(f => console.error(`- ${f}`)); process.exit(1); }
console.log('[phase10] Design graph dependency integrity checks passed');
