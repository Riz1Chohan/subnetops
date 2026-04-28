import type { DesignCoreSnapshot } from "./designCoreSnapshot";

export type DesignAuthorityMode = "backend-authoritative" | "backend-review" | "backend-unavailable";

export interface DesignAuthorityState {
  mode: DesignAuthorityMode;
  label: string;
  detail: string;
  isBackendAuthority: boolean;
  isFallback: boolean;
  backendRequired: boolean;
  requiresEngineerReview: boolean;
  warnings: string[];
}

export function resolveDesignAuthorityState(snapshot?: DesignCoreSnapshot | null, isLoading = false, error?: unknown): DesignAuthorityState {
  if (snapshot) {
    const blockerCount = snapshot.issues.filter((issue) => issue.severity === "ERROR").length;
    const reviewCount = snapshot.issues.filter((issue) => issue.severity === "WARNING").length;
    const mode: DesignAuthorityMode = snapshot.summary.readyForBackendAuthority ? "backend-authoritative" : "backend-review";
    const label = snapshot.summary.readyForBackendAuthority ? "Backend design-core authority" : "Backend design-core authority — review required";
    const warnings = [
      snapshot.authority?.requiresEngineerReview ? "Engineer review is still required before production implementation." : null,
      blockerCount > 0 ? `${blockerCount} backend blocker${blockerCount === 1 ? "" : "s"} must be resolved before implementation.` : null,
      reviewCount > 0 ? `${reviewCount} backend warning${reviewCount === 1 ? "" : "s"} need review.` : null,
    ].filter(Boolean) as string[];

    return {
      mode,
      label,
      detail: `${snapshot.summary.networkObjectCount || snapshot.summary.vlanCount} backend-modeled object${(snapshot.summary.networkObjectCount || snapshot.summary.vlanCount) === 1 ? "" : "s"}; ${snapshot.summary.implementationPlanStepCount || 0} implementation step${snapshot.summary.implementationPlanStepCount === 1 ? "" : "s"}; ${blockerCount} blocker${blockerCount === 1 ? "" : "s"}.`,
      isBackendAuthority: true,
      isFallback: false,
      backendRequired: false,
      requiresEngineerReview: true,
      warnings,
    };
  }

  const fallbackReason = error instanceof Error
    ? `Backend design-core request failed: ${error.message}`
    : isLoading
      ? "Backend design-core snapshot is still loading."
      : "Backend design-core snapshot is unavailable.";

  return {
    mode: "backend-unavailable",
    label: "Backend design-core unavailable",
    detail: `${fallbackReason} The frontend is intentionally not generating a substitute network plan.`,
    isBackendAuthority: false,
    isFallback: false,
    backendRequired: true,
    requiresEngineerReview: true,
    warnings: [
      fallbackReason,
      "No authoritative backend design snapshot is available.",
      "Frontend planning fallback is disabled: this UI may display, explain, filter, and visualize backend facts only.",
      "Resolve backend design-core availability before using implementation, routing, security, diagram, or export views for sign-off.",
    ],
  };
}

export function DesignAuthorityBanner({ authority, compact = false }: { authority: DesignAuthorityState; compact?: boolean }) {
  const className = authority.backendRequired ? "validation-card warning" : authority.mode === "backend-review" ? "validation-card warning" : "validation-card";
  return (
    <div className={className} style={{ display: "grid", gap: compact ? 6 : 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <strong>{authority.label}</strong>
        <span className={authority.backendRequired ? "badge badge-warning" : authority.mode === "backend-review" ? "badge badge-warning" : "badge badge-info"}>
          {authority.mode.replace(/-/g, " ")}
        </span>
      </div>
      <p className="muted" style={{ margin: 0 }}>{authority.detail}</p>
      {!compact && authority.warnings.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {authority.warnings.slice(0, 4).map((warning) => <li key={warning} style={{ marginBottom: 4 }}>{warning}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
