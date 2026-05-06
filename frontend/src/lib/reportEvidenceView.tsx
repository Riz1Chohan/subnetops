// V1_FRONTEND_TRUTH_CARDS_BACKEND_EVIDENCE_CONTRACT: frontend truth cards consume V1ReportExportTruth.evidenceView only.
import type { ReactNode } from "react";
import type { DesignCoreSnapshot, V1ReportEvidenceView, V1ReportExportTruthReadiness } from "./designCoreSnapshot";

export const FRONTEND_EVIDENCE_VIEW_SOURCE_PATH = "V1ReportExportTruth.evidenceView" as const;

export function getCanonicalReportEvidenceView(designCore?: DesignCoreSnapshot | null): V1ReportEvidenceView | null {
  return designCore?.V1ReportExportTruth?.evidenceView ?? null;
}

export function evidenceReadinessLabel(readiness?: V1ReportExportTruthReadiness | string | null) {
  if (readiness === "READY") return "Ready";
  if (readiness === "BLOCKED") return "Blocked";
  return "Review required";
}

export function evidenceReadinessBadgeClass(readiness?: V1ReportExportTruthReadiness | string | null) {
  if (readiness === "READY") return "badge badge-info";
  if (readiness === "BLOCKED") return "badge badge-error";
  return "badge badge-warning";
}

function metricCard(label: string, value: number | string, detail: string) {
  return (
    <div className="summary-card" data-frontend-truth-source={FRONTEND_EVIDENCE_VIEW_SOURCE_PATH}>
      <div className="muted">{label}</div>
      <div className="value">{value}</div>
      <div className="muted" style={{ marginTop: 6 }}>{detail}</div>
    </div>
  );
}

export function BackendEvidenceTruthCards({ evidenceView, compact = false }: { evidenceView?: V1ReportEvidenceView | null; compact?: boolean }) {
  if (!evidenceView) {
    return (
      <div className="panel" data-frontend-truth-source="V1ReportExportTruth.evidenceView.missing">
        <strong>Backend evidence view unavailable</strong>
        <p className="muted" style={{ margin: "6px 0 0" }}>Truth cards are withheld because the backend did not return the canonical report evidence view.</p>
      </div>
    );
  }

  const cards: ReactNode[] = [
    metricCard("Design readiness", evidenceReadinessLabel(evidenceView.readiness.designReview), "Backend evidence-view readiness."),
    metricCard("Implementation readiness", evidenceReadinessLabel(evidenceView.readiness.implementation), "Backend execution-gate readiness."),
    metricCard("Root blockers", evidenceView.validation.rootBlockerCount, "Canonical backend root-blocker count."),
    metricCard("Propagated blockers", evidenceView.validation.propagatedBlockerCount, "Downstream blocker effects, not roots."),
    metricCard("Review items", evidenceView.validation.reviewItemCount, "Review debt surfaced by backend."),
    metricCard("Candidate IPAM", evidenceView.ipam.candidateAllocations, "Candidate allocation rows only."),
    metricCard("Approved IPAM", evidenceView.ipam.approvedAllocations, "Approved allocation authority."),
    metricCard("Hidden blocker surfaces", evidenceView.omittedEvidence.hiddenBlockerSurfaces, "Omitted evidence still affecting readiness."),
    metricCard("Hidden review surfaces", evidenceView.omittedEvidence.hiddenReviewSurfaces, "Windowed review evidence still visible."),
  ];

  return (
    <div className="panel" data-frontend-truth-contract="V1_FRONTEND_TRUTH_CARDS_BACKEND_EVIDENCE_CONTRACT" data-frontend-truth-source={FRONTEND_EVIDENCE_VIEW_SOURCE_PATH}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{compact ? "Backend evidence" : "Backend evidence truth cards"}</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>These cards are read from {FRONTEND_EVIDENCE_VIEW_SOURCE_PATH}; the browser does not recompute readiness, IPAM authority, or hidden evidence counts.</p>
        </div>
        <span className={evidenceReadinessBadgeClass(evidenceView.readiness.designReview)}>{evidenceReadinessLabel(evidenceView.readiness.designReview)}</span>
      </div>
      <div className="grid-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {compact ? cards.slice(0, 6) : cards}
      </div>
    </div>
  );
}
