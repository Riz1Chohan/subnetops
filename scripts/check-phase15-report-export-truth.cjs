const fs=require('fs'), path=require('path');
const r=f=>fs.readFileSync(path.join(process.cwd(),f),'utf8');
function a(f,needles){const c=r(f); for(const n of needles) if(!c.includes(n)) throw new Error(`${f} missing ${n}`)}
a('backend/src/services/designCore/designCore.phase15ReportExportTruthControl.ts',['PHASE15_REPORT_EXPORT_TRUTH_CONTRACT','REPORT_EXPORT_BACKEND_TRUTH_REQUIREMENT_TRACEABILITY_DELIVERABLE_GATE','Requirement Traceability Matrix','pdfDocxCsvCovered','truthLabelRows','sectionGates']);
a('backend/src/services/designCore.types.ts',['Phase15ReportExportTruthControlSummary','phase15ReportExportTruth']);
a('backend/src/services/designCore.service.ts',['buildPhase15ReportExportTruthControl','phase15ReportExportTruth']);
a('backend/src/services/validation.service.ts',['PHASE15_REPORT_EXPORT_TRUTH_BLOCKING','phase15ReportExportTruth']);
a('backend/src/services/exportDesignCoreReport.service.ts',['Report Requirement Traceability Matrix','Phase 15 Report and Export Truth','phase15ReportExportTruth']);
a('backend/src/services/export.service.ts',['Phase 15 Report Export Truth','Requirement Traceability Matrix','phase15ReportExportTruth']);
a('frontend/src/lib/designCoreSnapshot.ts',['Phase15ReportExportTruthControlSummary','phase15ReportExportTruth']);
a('frontend/src/pages/ProjectReportPage.tsx',['Report/export truth','phase15ReportExportTruth','polished trash']);
a('backend/src/lib/phase15ReportExportTruth.selftest.ts',['Report/export truth selftest passed','PHASE15_REPORT_EXPORT_TRUTH_CONTRACT']);
a('backend/src/lib/phase0EngineInventory.ts',['phase: 15','designCore.phase15ReportExportTruthControl.ts','currentPhase0Verdict: "CONTROLLED"']);
console.log('[phase15] static release contract passed');
