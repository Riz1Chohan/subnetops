import type { ReportExportEvidenceDocument } from "./types.js";

function findingBlocksReady(finding: ReportExportEvidenceDocument["findings"][number]): boolean {
  return finding.readinessImpact !== "READY" || finding.severity === "BLOCKING" || finding.severity === "REVIEW_REQUIRED" || finding.severity === "WARNING";
}

export function reportCanClaimReady(document: ReportExportEvidenceDocument): boolean {
  if (document.readiness !== "READY") return false;
  if (document.findings.some(findingBlocksReady)) return false;
  if (document.proofBoundary.length === 0) return false;
  return document.sections.every((section) => (
    section.status === "verified" &&
    section.evidence.length > 0 &&
    section.limitations.length === 0 &&
    section.findings.every((finding) => !findingBlocksReady(finding))
  ));
}

export function findOverclaimRisks(document: ReportExportEvidenceDocument): string[] {
  const risks: string[] = [];
  if (document.readiness !== "READY") risks.push("Report readiness is not ready, so exports must not claim the design is ready.");
  if (document.proofBoundary.length === 0) risks.push("Report proof boundary is missing; exports must state what is and is not proven.");
  const blockingFindings = document.findings.filter((finding) => finding.readinessImpact === "BLOCKED" || finding.severity === "BLOCKING");
  const reviewFindings = document.findings.filter((finding) => finding.readinessImpact === "REVIEW_REQUIRED" || finding.severity === "REVIEW_REQUIRED" || finding.severity === "WARNING");
  if (blockingFindings.length > 0) risks.push(`${blockingFindings.length} blocking report/export finding(s) exist; the export must preserve blocked readiness.`);
  if (reviewFindings.length > 0) risks.push(`${reviewFindings.length} review/warning report/export finding(s) exist; the export must preserve review wording.`);
  for (const section of document.sections) {
    if (section.status !== "verified") risks.push(`${section.title} is ${section.status}; the export must show review/limitation wording.`);
    if (!section.evidence.length) risks.push(`${section.title} has no evidence and must not be represented as complete.`);
    if (section.status === "verified" && section.limitations.length > 0) risks.push(`${section.title} is marked verified but still carries limitations.`);
    if (section.status === "verified" && section.findings.some(findingBlocksReady)) risks.push(`${section.title} is marked verified but has blocking/review findings.`);
  }
  return risks;
}
