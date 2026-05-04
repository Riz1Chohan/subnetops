import type { ReportExportEvidenceDocument, ReportExportSection, ReportExportReadiness, V1ReportExportTruthControlSummary } from "./types.js";

function statusFromReadiness(readiness: ReportExportReadiness): ReportExportSection["status"] {
  if (readiness === "READY") return "verified";
  if (readiness === "BLOCKED") return "requires_review";
  return "partial";
}

export function buildReportEvidenceDocument(summary: V1ReportExportTruthControlSummary): ReportExportEvidenceDocument {
  const sections: ReportExportSection[] = summary.sectionGates.map((gate) => {
    const sectionFindings = summary.findings.filter((finding) => finding.affectedSectionKeys.includes(gate.sectionKey));
    return {
      key: gate.sectionKey,
      title: gate.title,
      status: statusFromReadiness(gate.readinessImpact),
      summary: gate.blockers.length
        ? `${gate.title} is gated by ${gate.blockers.length} blocker/review item(s).`
        : `${gate.title} has recorded backend evidence.`,
      facts: gate.evidence,
      findings: sectionFindings,
      evidence: gate.evidence,
      limitations: gate.readinessImpact === "READY" ? [] : gate.blockers,
      recommendedActions: sectionFindings.map((finding) => finding.remediation),
    };
  });

  return {
    readiness: summary.overallReadiness,
    sections,
    findings: summary.findings,
    proofBoundary: summary.proofBoundary,
  };
}
