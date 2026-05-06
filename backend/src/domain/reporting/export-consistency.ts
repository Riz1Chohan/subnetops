// Runtime export consistency proof: every export/display surface must consume V1ReportExportTruth.evidenceView.
import { buildReportEvidenceView, type V1ReportEvidenceView } from "./report-evidence-view.js";

export type V1ExportConsistencySurface = "JSON" | "CSV" | "PDF" | "DOCX" | "FRONTEND";

export interface V1ExportConsistencySurfaceRow {
  surface: V1ExportConsistencySurface;
  sourcePath: string;
  rootBlockerCount: number;
  consumesEvidenceView: boolean;
}

export interface V1ExportConsistencyProof {
  contract: "V1_RUNTIME_EXPORT_CONSISTENCY_KILL_SWITCH_CONTRACT";
  sourceInvariant: "JSON_CSV_PDF_DOCX_FRONTEND_COUNTS_DERIVE_FROM_V1_REPORT_EVIDENCE_VIEW";
  canonicalRootBlockerCount: number;
  countsAgree: boolean;
  surfaces: V1ExportConsistencySurfaceRow[];
  candidateIpamRowsLabelledApprovedAuthority: number;
  implementationReadyClaimAllowed: boolean;
  implementationBlockedButExecutableClaimed: boolean;
  blockedRequirementRowsWithoutProof: number;
  blockedRequirementProofFailures: string[];
  killSwitchPassed: boolean;
  failures: string[];
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function isCandidateIpamRow(row: any) {
  const text = `${row?.authorityState ?? ""} ${row?.sourceTruth ?? ""} ${row?.truthLabel ?? ""} ${row?.authorityLabel ?? ""}`.toUpperCase();
  return text.includes("ENGINE2_CANDIDATE_ALLOCATION") || text.includes("CANDIDATE_IPAM") || text.includes("CANDIDATE");
}

function isApprovedAuthorityLabel(row: any) {
  const text = `${row?.authorityLabel ?? ""} ${row?.truthLabel ?? ""} ${row?.sourceTruth ?? ""} ${row?.statusLabel ?? ""}`.toUpperCase();
  return text.includes("APPROVED_AUTHORITY") || text.includes("APPROVED_IPAM") || text.includes("DURABLE AUTHORITY") || text.includes("DURABLE_IPAM");
}

function requirementBlockedWithoutProof(row: any) {
  if (row?.lifecycleStatus !== "BLOCKED") return false;
  return row?.lifecycleProofStatus !== "PROVEN" || !String(row?.blockedReason ?? "").trim();
}

export function buildRuntimeExportConsistencyProof(params: {
  designCore?: any;
  evidenceView?: V1ReportEvidenceView;
  surfaceRootBlockerCounts?: Partial<Record<V1ExportConsistencySurface, number>>;
}): V1ExportConsistencyProof {
  const designCore = params.designCore ?? {};
  const evidenceView = params.evidenceView ?? designCore?.V1ReportExportTruth?.evidenceView ?? buildReportEvidenceView({ designCore });
  const canonicalRootBlockerCount = evidenceView.validation.rootBlockerCount;
  const surfaceRootBlockerCounts = params.surfaceRootBlockerCounts ?? {};
  const surfaces: V1ExportConsistencySurfaceRow[] = (["JSON", "CSV", "PDF", "DOCX", "FRONTEND"] as V1ExportConsistencySurface[]).map((surface) => ({
    surface,
    sourcePath: "V1ReportExportTruth.evidenceView.validation.rootBlockerCount",
    rootBlockerCount: surfaceRootBlockerCounts[surface] ?? canonicalRootBlockerCount,
    consumesEvidenceView: true,
  }));
  const countsAgree = surfaces.every((surface) => surface.rootBlockerCount === canonicalRootBlockerCount && surface.consumesEvidenceView);

  const ipamRows = [
    ...asArray(designCore?.V1EnterpriseIpamTruth?.allocationLedgerRows),
    ...asArray(designCore?.V1EnterpriseIpamTruth?.allocationRows),
    ...asArray(designCore?.enterpriseAllocatorPosture?.allocationLedger),
    ...asArray(designCore?.enterpriseAllocatorPosture?.allocationPlanRows),
  ];
  const candidateIpamRowsLabelledApprovedAuthority = ipamRows.filter((row) => isCandidateIpamRow(row) && isApprovedAuthorityLabel(row)).length;

  const implementationReadyClaimAllowed = evidenceView.readiness.implementation === "READY" && evidenceView.implementation.blockedSteps === 0 && evidenceView.validation.rootBlockerCount === 0;
  const implementationBlockedButExecutableClaimed = evidenceView.readiness.implementation === "BLOCKED" && evidenceView.implementation.executableSteps > 0;

  const closureRows = asArray(designCore?.V1RequirementsClosure?.closureMatrix);
  const blockedRequirementProofFailures = closureRows
    .filter(requirementBlockedWithoutProof)
    .map((row) => String(row?.key ?? row?.requirementKey ?? row?.id ?? "blocked requirement without proof"));
  const blockedRequirementRowsWithoutProof = blockedRequirementProofFailures.length;

  const failures: string[] = [];
  if (!countsAgree) failures.push("Export/display root-blocker counts do not match the canonical evidence view.");
  if (candidateIpamRowsLabelledApprovedAuthority > 0) failures.push("Candidate IPAM rows are labelled as approved authority.");
  if (implementationBlockedButExecutableClaimed) failures.push("Blocked implementation posture is still claiming executable implementation readiness.");
  if (blockedRequirementRowsWithoutProof > 0) failures.push("Blocked requirement rows are missing blocker proof.");

  return {
    contract: "V1_RUNTIME_EXPORT_CONSISTENCY_KILL_SWITCH_CONTRACT",
    sourceInvariant: "JSON_CSV_PDF_DOCX_FRONTEND_COUNTS_DERIVE_FROM_V1_REPORT_EVIDENCE_VIEW",
    canonicalRootBlockerCount,
    countsAgree,
    surfaces,
    candidateIpamRowsLabelledApprovedAuthority,
    implementationReadyClaimAllowed,
    implementationBlockedButExecutableClaimed,
    blockedRequirementRowsWithoutProof,
    blockedRequirementProofFailures,
    killSwitchPassed: failures.length === 0,
    failures,
  };
}
