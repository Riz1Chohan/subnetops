#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const failures = [];
const req = (source, needle, message) => { if (!source.includes(needle)) failures.push(message); };

const backendTypes = read('backend/src/services/designCore.types.ts');
const backendTruth = read('backend/src/services/designCore/designCore.reportDiagramTruth.ts');
const frontendTypes = read('frontend/src/lib/designCoreSnapshot.ts');
const frontendTruth = read('frontend/src/lib/reportDiagramTruth.ts');
const diagramPage = read('frontend/src/pages/ProjectDiagramPage.tsx');
const backendCanvas = read('frontend/src/features/diagram/components/BackendDiagramCanvas.tsx');
const exportService = read('backend/src/services/exportDesignCoreReport.service.ts');

req(backendTypes, 'BackendDiagramRenderModel', 'Backend must type BackendDiagramRenderModel.');
req(backendTypes, 'BackendDiagramRenderNode', 'Backend must type backend-authored render nodes.');
req(backendTypes, 'BackendDiagramRenderEdge', 'Backend must type backend-authored render edges.');
req(backendTypes, 'renderModel: BackendDiagramRenderModel', 'Backend diagramTruth must expose renderModel.');
req(backendTruth, 'buildBackendDiagramRenderModel', 'Backend must build diagram render model.');
req(backendTruth, 'backendAuthored: true', 'Render model must mark backendAuthored true.');
req(backendTruth, 'layoutMode: "backend-deterministic-grid"', 'Render model must declare backend deterministic layout mode.');
req(backendTruth, 'overlayKeysForRelationship', 'Render edges must map relationships to backend overlay keys.');
req(backendTruth, 'readinessForObject', 'Render nodes must derive readiness from backend findings/steps/checks.');
req(frontendTypes, 'BackendDiagramRenderModel', 'Frontend must type BackendDiagramRenderModel.');
req(frontendTruth, 'renderModel: designCore.diagramTruth.renderModel', 'Frontend truth helper must prefer backend render model.');
req(diagramPage, 'BackendDiagramCanvas', 'Diagram page must import backend diagram canvas.');
req(diagramPage, 'diagramTruth.renderModel', 'Diagram page must render backend render model when available.');
req(diagramPage, 'Legacy diagram fallback is active', 'Diagram page must label legacy fallback explicitly.');
req(backendCanvas, 'Backend-authoritative diagram canvas', 'Backend canvas must identify backend-authoritative rendering.');
req(backendCanvas, 'renderModel.edges', 'Backend canvas must render backend edges.');
req(backendCanvas, 'renderModel.nodes', 'Backend canvas must render backend nodes.');
req(backendCanvas, 'relatedFindingIds', 'Backend canvas must expose related finding IDs.');
req(exportService, 'Phase 39 Backend Diagram Render Model', 'Export service must include backend diagram render model summary.');

if (failures.length) {
  console.error('Backend diagram render model check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Backend diagram render model check passed.');
