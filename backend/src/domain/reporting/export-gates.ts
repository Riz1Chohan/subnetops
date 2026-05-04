import type { ReportExportEvidenceDocument } from "./types.js";

export function reportCanClaimReady(document: ReportExportEvidenceDocument): boolean {
  return document.readiness === "READY" && document.sections.every((section) => section.status === "verified");
}

export function findOverclaimRisks(document: ReportExportEvidenceDocument): string[] {
  const risks: string[] = [];
  if (document.readiness !== "READY") risks.push("Report readiness is not ready, so exports must not claim the design is ready.");
  for (const section of document.sections) {
    if (section.status !== "verified") risks.push(`${section.title} is ${section.status}; the export must show review/limitation wording.`);
    if (!section.evidence.length) risks.push(`${section.title} has no evidence and must not be represented as complete.`);
  }
  return risks;
}
