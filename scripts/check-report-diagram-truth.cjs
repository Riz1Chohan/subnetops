#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const failures = [];
const req = (s, n, m) => { if (!s.includes(n)) failures.push(m); };
const helper = read('frontend/src/lib/reportDiagramTruth.ts');
const reportPage = read('frontend/src/pages/ProjectReportPage.tsx');
const diagramPage = read('frontend/src/pages/ProjectDiagramPage.tsx');
req(helper, 'export function buildReportTruthModel', 'Missing buildReportTruthModel.');
req(helper, 'export function buildDiagramTruthModel', 'Missing buildDiagramTruthModel.');
req(helper, 'implementationPlan', 'Truth helper must derive from implementationPlan.');
req(helper, 'securityPolicyFlow', 'Truth helper must derive from securityPolicyFlow.');
req(helper, 'routingSegmentation', 'Truth helper must derive from routingSegmentation.');
req(reportPage, 'buildReportTruthModel', 'Report page must use report truth helper.');
req(reportPage, 'reportTruth.topImplementationSteps', 'Report page must expose implementation step truth.');
req(reportPage, 'reportTruth.verificationChecksByType', 'Report page must expose verification truth.');
req(reportPage, 'reportTruth.rollbackActions', 'Report page must expose rollback truth.');
req(diagramPage, 'buildDiagramTruthModel', 'Diagram page must use diagram truth helper.');
req(diagramPage, 'diagramTruth.overlaySummaries', 'Diagram page must render overlay summaries.');
req(diagramPage, 'diagramTruth.hotspots', 'Diagram page must render hotspots.');
if (failures.length) { console.error('Report/diagram truth check failed:'); failures.forEach((f) => console.error(' - '+f)); process.exit(1); }
console.log('Report/diagram truth check passed.');
