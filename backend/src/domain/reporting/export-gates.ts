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
<<<<<<< HEAD
  if (document.omittedEvidenceDecisionSummary.decisionImpact !== "NONE") return false;
=======
  if (document.omittedEvidenceSummaries.some((summary) => summary.omittedHasBlockers || summary.omittedHasReviewRequired)) return false;
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
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
<<<<<<< HEAD
  if (document.omittedEvidenceDecisionSummary.blockingSurfaces.length > 0) {
    risks.push(`${document.omittedEvidenceDecisionSummary.blockingSurfaces.length} omitted-evidence surface(s) contain hidden blockers; export must remain blocked and show the affected surfaces.`);
  }
  if (document.omittedEvidenceDecisionSummary.reviewSurfaces.length > 0) {
    risks.push(`${document.omittedEvidenceDecisionSummary.reviewSurfaces.length} omitted-evidence surface(s) contain hidden review-required rows; export must remain review-gated and show the affected surfaces.`);
=======
  for (const summary of document.omittedEvidenceSummaries) {
    if (summary.omittedHasBlockers) risks.push(`${summary.collection} omitted blocker evidence on ${summary.surface}; export must show omitted warning and full appendix.`);
    if (summary.omittedHasReviewRequired) risks.push(`${summary.collection} omitted review-required evidence on ${summary.surface}; export must show omitted warning and full appendix.`);
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
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

function replacementForForbiddenClaim(phrase: string): string {
  if (phrase === "validated") return "review-gated";
  if (phrase === "complete") return "evidence-incomplete";
  if (phrase === "ready for deployment") return "deployment-gated";
  if (phrase === "production-ready") return "production-gated";
  if (phrase === "implementation-ready") return "implementation-gated";
  if (phrase === "best practice compliant") return "standards-review-gated";
  return "review-gated";
}

function isAlreadyNegated(prefix: string): boolean {
  return /(?:\bnot|\bno|\bwithout|\bcannot|\bmust not|\bdoes not|\bdo not)\s+(?:currently\s+|yet\s+|claim\s+|claiming\s+|be\s+|become\s+|treat(?:ed)?\s+as\s+)?$/i.test(prefix.slice(-48));
}

export function rewriteForbiddenReportClaim(text: string, canClaimReady: boolean): string {
  if (canClaimReady) return text;
  let output = text;
  for (const phrase of FORBIDDEN_CLEAN_CLAIMS) {
    const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "gi");
    output = output.replace(pattern, (match, offset: number, fullText: string) => {
      const prefix = String(fullText).slice(0, offset);
      return isAlreadyNegated(prefix) ? match : replacementForForbiddenClaim(phrase);
    });
  }
  return output
    .replace(/\bnot\s+not\s+implementation-ready\b/gi, "not implementation-ready")
    .replace(/\bnot\s+implementation-gated\b/gi, "not implementation-ready")
    .replace(/\bnot\s+deployment-gated\b/gi, "not ready for deployment")
    .replace(/\bnot\s+production-gated\b/gi, "not production-ready")
    .replace(/\bnot\s+standards-review-gated\b/gi, "not best-practice-compliant");
}
