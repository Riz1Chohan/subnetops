export interface ReportTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ReportSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  tables?: ReportTable[];
}

export interface ReportMetadata {
  organizationName: string;
  environment: string;
  reportVersion: string;
  revisionStatus: string;
  documentOwner: string;
  approvalStatus: string;
  projectPhase?: string;
  planningFocus?: string;
  primaryObjective?: string;
  generatedFrom: string;
}

export interface ReportVisualSnapshot {
  metrics: Array<[string, string]>;
  topologyRows: string[][];
}

export interface ProfessionalReport {
  title: string;
  subtitle: string;
  generatedAt: string;
  executiveSummary: string[];
  sections: ReportSection[];
  appendices?: ReportSection[];
  metadata?: ReportMetadata;
  visualSnapshot?: ReportVisualSnapshot;
}
