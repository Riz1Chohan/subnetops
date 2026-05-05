import type { ReportExportEvidenceDocument } from "./types.js";

const FORBIDDEN_CLEAN_CLAIMS = [
  "ready for deployment",
  "validated",
  "complete",
  "best practice compliant",
  "production-ready",
  "implementation-ready",
] as const;

function findingBlocksReady(finding: ReportExportEvidenceDocument["findings"][number]): boolean {
  return finding.readinessImpact !== "READY" || finding.severity === "BLOCKING" || finding.severity === "REVIEW_REQUIRED" || finding.severity === "WARNING";
}

export function reportCanClaimReady(document: ReportExportEvidenceDocument): boolean {
  if (document.readiness !== "READY") return false;
  if (!document.canClaimImplementationReady || !document.canClaimProductionReady) return false;
  if (document.findings.some(findingBlocksReady)) return false;
  if (document.proofBoundary.length === 0) return false;
  if (document.omittedEvidenceSummaries.some((summary) => summary.omittedHasBlockers || summary.omittedHasReviewRequired)) return false;
  if (document.antiOverclaimRules.some((rule) => !rule.claimAllowed)) return false;
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
  if (!document.canClaimImplementationReady) risks.push("Implementation-ready claim is not allowed by backend report/export proof.");
  if (!document.canClaimProductionReady) risks.push("Production-ready / ready-for-deployment claim is not allowed by backend proof.");
  if (document.proofBoundary.length === 0) risks.push("Report proof boundary is missing; exports must state what is and is not proven.");
  const blockingFindings = document.findings.filter((finding) => finding.readinessImpact === "BLOCKED" || finding.severity === "BLOCKING");
  const reviewFindings = document.findings.filter((finding) => finding.readinessImpact === "REVIEW_REQUIRED" || finding.severity === "REVIEW_REQUIRED" || finding.severity === "WARNING");
  if (blockingFindings.length > 0) risks.push(`${blockingFindings.length} blocking report/export finding(s) exist; the export must preserve blocked readiness.`);
  if (reviewFindings.length > 0) risks.push(`${reviewFindings.length} review/warning report/export finding(s) exist; the export must preserve review wording.`);
  for (const summary of document.omittedEvidenceSummaries) {
    if (summary.omittedHasBlockers) risks.push(`${summary.collection} omitted blocker evidence on ${summary.surface}; export must show omitted warning and full appendix.`);
    if (summary.omittedHasReviewRequired) risks.push(`${summary.collection} omitted review-required evidence on ${summary.surface}; export must show omitted warning and full appendix.`);
  }
  for (const rule of document.antiOverclaimRules) {
    if (!rule.claimAllowed) risks.push(`Clean claim '${rule.phrase}' is not allowed; use '${rule.replacement}'.`);
  }
  for (const section of document.sections) {
    if (section.status !== "verified") risks.push(`${section.title} is ${section.status}; the export must show review/limitation wording.`);
    if (!section.evidence.length) risks.push(`${section.title} has no evidence and must not be represented as complete.`);
    if (section.status === "verified" && section.limitations.length > 0) risks.push(`${section.title} is marked verified but still carries limitations.`);
    if (section.status === "verified" && section.findings.some(findingBlocksReady)) risks.push(`${section.title} is marked verified but has blocking/review findings.`);
  }
  return risks;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rewriteForbiddenReportClaim(text: string, canClaimReady: boolean): string {
  if (canClaimReady) return text;
  let output = text;
  for (const phrase of FORBIDDEN_CLEAN_CLAIMS) {
    const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "gi");
    output = output.replace(pattern, phrase === "validated" ? "review-gated" : phrase === "complete" ? "evidence-incomplete" : "not implementation-ready");
  }
  return output;
}
