// V1_PROFESSIONAL_REPORT_EVIDENCE_BOUNDARY
// Keeps the main professional report decision-focused while preserving detailed evidence in appendices.

export type ProfessionalReportLike = {
  title: string;
  subtitle?: string;
  sections: Array<{
    title: string;
    paragraphs?: string[];
    bullets?: string[];
    tables?: Array<{ title: string; headers: string[]; rows: string[][] }>;
  }>;
  appendices?: Array<{
    title: string;
    paragraphs?: string[];
    bullets?: string[];
    tables?: Array<{ title: string; headers: string[]; rows: string[][] }>;
  }>;
};

const MAIN_PROFESSIONAL_SECTION_RE = /^\s*(?:[1-9]|1[0-3])\.\s+/;
const APPENDIX_RE = /^\s*Appendix\s+[A-Z]\./i;

const INTERNAL_PROOF_TABLE_RE = /(?:Anti-overclaim Rules|Template Variables|Template Proof Boundary|Runtime Proof|Audit Dump|Proof Boundary|Command Safety|Source Object IDs?|Object Reference IDs?)/i;
const INTERNAL_PROOF_SECTION_RE = /(?:Full Proof|Runtime Proof Dump|Audit Dump|Vendor-Neutral Implementation Templates)/i;

function sectionTitle(value: unknown) {
  return String(value ?? "").trim();
}

export function isProfessionalMainReportSection(title: string) {
  return MAIN_PROFESSIONAL_SECTION_RE.test(title);
}

export function isProfessionalAppendixSection(title: string) {
  return APPENDIX_RE.test(title) || /Evidence Appendix|Evidence Summary|Validation Detail|Detailed Addressing/i.test(title);
}

export function isInternalProofOnlySection(title: string) {
  return INTERNAL_PROOF_SECTION_RE.test(title);
}

export function isInternalProofOnlyTable(title: string) {
  return INTERNAL_PROOF_TABLE_RE.test(title);
}

function appendEngineeringEvidencePrefix(title: string) {
  if (APPENDIX_RE.test(title)) return title;
  if (/Engineering Evidence/i.test(title)) return title;
  if (/Full Evidence Appendix/i.test(title)) return "Appendix C. Engineering Evidence Appendix";
  return `Appendix C. Engineering Evidence — ${title}`;
}

function cleanAppendixTables<T extends { title: string; tables?: Array<{ title: string; headers: string[]; rows: string[][] }> }>(section: T): T {
  if (Array.isArray(section.tables)) {
    section.tables = section.tables.filter((table) => !isInternalProofOnlyTable(sectionTitle(table.title)));
  }
  return section;
}

export function applyProfessionalReportEvidenceBoundary(report: ProfessionalReportLike): ProfessionalReportLike {
  const mainSections: ProfessionalReportLike["sections"] = [];
  const evidenceAppendices: NonNullable<ProfessionalReportLike["appendices"]> = [];

  for (const section of report.sections ?? []) {
    const title = sectionTitle(section.title);
    if (isProfessionalMainReportSection(title)) {
      mainSections.push(section);
      continue;
    }
    if (!isInternalProofOnlySection(title)) {
      evidenceAppendices.push(cleanAppendixTables({ ...section, title: appendEngineeringEvidencePrefix(title) }));
    }
  }

  const existingAppendices = (report.appendices ?? [])
    .filter((section) => !isInternalProofOnlySection(sectionTitle(section.title)))
    .map((section) => cleanAppendixTables({ ...section, title: appendEngineeringEvidencePrefix(sectionTitle(section.title)) }));

  report.sections = mainSections;
  report.appendices = [...existingAppendices, ...evidenceAppendices];
  return report;
}
