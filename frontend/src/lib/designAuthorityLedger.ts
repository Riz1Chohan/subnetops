import type { SynthesizedLogicalDesign } from "./designSynthesis.types";
import type { DesignTruthAuthoritySource } from "./designTruthModel";

export interface AuthoritySourceMixItem {
  source: DesignTruthAuthoritySource;
  label: string;
  count: number;
  share: number;
  detail: string;
}

export interface AuthorityDebtItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  fixPath: string;
  actionLabel: string;
}

export interface SiteAuthorityReview {
  siteId: string;
  siteName: string;
  status: "ready" | "partial" | "pending";
  strongestSource: DesignTruthAuthoritySource | "none";
  strongestSourceLabel: string;
  debtCount: number;
  detail: string;
  blockers: string[];
  fixPath: string;
}

export interface DesignAuthorityLedger {
  confidenceScore: number;
  confidenceLabel: string;
  status: "strong" | "mixed" | "weak";
  summary: string;
  sourceMix: AuthoritySourceMixItem[];
  debtItems: AuthorityDebtItem[];
  siteReviews: SiteAuthorityReview[];
  masterEvidence: {
    explicitCoreObjects: number;
    inferredCoreObjects: number;
    unresolvedReferences: number;
    requiredFlowsReady: number;
    requiredFlowsTotal: number;
    traceabilityItems: number;
    lowLevelDesignRows: number;
    partialSites: number;
    pendingSites: number;
  };
}

const sourceLabels: Record<DesignTruthAuthoritySource, string> = {
  "saved-design": "Saved design",
  "discovery-derived": "Discovery-backed",
  "backend-unconfirmed": "Backend-unconfirmed",
  inferred: "Still inferred",
};

const sourceWeights: Record<DesignTruthAuthoritySource, number> = {
  "saved-design": 1,
  "discovery-derived": 0.82,
  "backend-unconfirmed": 0.64,
  inferred: 0.24,
};

function unique(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && `${value}`.trim()))));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value);
}

function sourceRank(source: DesignTruthAuthoritySource | "none") {
  switch (source) {
    case "saved-design":
      return 4;
    case "discovery-derived":
      return 3;
    case "backend-unconfirmed":
      return 2;
    case "inferred":
      return 1;
    default:
      return 0;
  }
}

function dominantSourceLabel(source: DesignTruthAuthoritySource | "none") {
  return source === "none" ? "No strong anchor yet" : sourceLabels[source];
}

export function buildDesignAuthorityLedger(projectId: string, design: SynthesizedLogicalDesign): DesignAuthorityLedger {
  const truth = design.designTruthModel;
  const routeSources = truth.routeDomains.map((item) => item.authoritySource);
  const boundarySources = truth.boundaryDomains.map((item) => item.authoritySource);
  const sources = [...routeSources, ...boundarySources];
  const totalAnchors = Math.max(1, sources.length);
  const sourceMix: AuthoritySourceMixItem[] = (["saved-design", "discovery-derived", "backend-unconfirmed", "inferred"] as DesignTruthAuthoritySource[]).map((source) => {
    const count = sources.filter((item) => item === source).length;
    const share = count / totalAnchors;
    const detail = source === "saved-design"
      ? "Directly persisted design objects and shared-project truth."
      : source === "discovery-derived"
        ? "Strength taken from discovery evidence or current-state capture."
        : source === "backend-unconfirmed"
          ? "Backend snapshot marked this object as not fully confirmed yet; keep it out of implementation sign-off until backend evidence improves."
          : "Objects still being inferred because the stronger source is not there yet.";
    return {
      source,
      label: sourceLabels[source],
      count,
      share,
      detail,
    };
  });

  const weightedScoreRaw = sources.reduce((sum, source) => sum + sourceWeights[source], 0) / totalAnchors;
  const requiredFlows = design.flowCoverage.filter((item) => item.required);
  const requiredFlowsReady = requiredFlows.filter((item) => item.status === "ready").length;
  const unresolvedPenalty = Math.min(18, truth.unresolvedReferences.length * 3);
  const pendingSites = truth.siteNodes.filter((site) => site.authorityStatus === "pending").length;
  const partialSites = truth.siteNodes.filter((site) => site.authorityStatus === "partial").length;
  const sitePenalty = Math.min(16, pendingSites * 6 + partialSites * 3);
  const flowPenalty = requiredFlows.length === 0 ? 8 : Math.round((1 - (requiredFlowsReady / requiredFlows.length)) * 14);
  const confidenceScore = clamp(round(weightedScoreRaw * 100) - unresolvedPenalty - sitePenalty - flowPenalty, 0, 100);
  const status = confidenceScore >= 78 ? "strong" : confidenceScore >= 52 ? "mixed" : "weak";
  const confidenceLabel = status === "strong" ? "Strong authority mix" : status === "mixed" ? "Mixed authority mix" : "Weak authority mix";

  const routeInferred = truth.routeDomains.filter((item) => item.authoritySource === "inferred").length;
  const boundaryInferred = truth.boundaryDomains.filter((item) => item.authoritySource === "inferred").length;
  const explicitCoreObjects = truth.routeDomains.filter((item) => item.sourceModel === "explicit").length + truth.boundaryDomains.filter((item) => item.sourceModel === "explicit").length;
  const inferredCoreObjects = truth.routeDomains.filter((item) => item.sourceModel === "inferred").length + truth.boundaryDomains.filter((item) => item.sourceModel === "inferred").length;

  const debtItems: AuthorityDebtItem[] = unique([
    routeInferred > 0 ? "route-inference" : undefined,
    boundaryInferred > 0 ? "boundary-inference" : undefined,
    truth.unresolvedReferences.length > 0 ? "unresolved-refs" : undefined,
    pendingSites + partialSites > 0 ? "site-authority" : undefined,
    requiredFlowsReady < requiredFlows.length ? "flow-coverage" : undefined,
    design.traceability.length === 0 ? "traceability" : undefined,
    design.lowLevelDesign.length === 0 ? "lld" : undefined,
  ]).map((key) => {
    switch (key) {
      case "route-inference":
        return {
          id: key,
          severity: "critical" as const,
          title: "Route authority is still partly inferred",
          detail: `${routeInferred} route domain${routeInferred === 1 ? " is" : "s are"} still inferred instead of coming from stronger saved, discovery, or backend-confirmed truth.`,
          fixPath: `/projects/${projectId}/routing?focus=route-anchors`,
          actionLabel: "Open Routing",
        };
      case "boundary-inference":
        return {
          id: key,
          severity: "critical" as const,
          title: "Boundary authority is still partly inferred",
          detail: `${boundaryInferred} security boundary domain${boundaryInferred === 1 ? " is" : "s are"} still inferred, which keeps security and diagram review less trustworthy.`,
          fixPath: `/projects/${projectId}/security?focus=boundary-truth`,
          actionLabel: "Open Security",
        };
      case "unresolved-refs":
        return {
          id: key,
          severity: "critical" as const,
          title: "Cross-model references are still unresolved",
          detail: `${truth.unresolvedReferences.length} unresolved relationship reference${truth.unresolvedReferences.length === 1 ? " is" : "s are"} still flowing into report, diagram, or validation surfaces.`,
          fixPath: `/projects/${projectId}/core-model?focus=unresolved-references`,
          actionLabel: "Open Core Model",
        };
      case "site-authority":
        return {
          id: key,
          severity: pendingSites > 0 ? "critical" : "warning",
          title: "Some sites are still authority-thin",
          detail: `${pendingSites} pending and ${partialSites} partial site authority row${pendingSites + partialSites === 1 ? " is" : "s are"} still holding back a stronger design handoff.`,
          fixPath: `/projects/${projectId}/requirements?step=scenario`,
          actionLabel: "Open Requirements",
        };
      case "flow-coverage":
        return {
          id: key,
          severity: "warning" as const,
          title: "Required traffic-path coverage is incomplete",
          detail: `${requiredFlowsReady} of ${requiredFlows.length} required flow categor${requiredFlows.length === 1 ? "y is" : "ies are"} fully ready, so path and enforcement review is still incomplete.`,
          fixPath: `/projects/${projectId}/routing?focus=flow-coverage`,
          actionLabel: "Review Flows",
        };
      case "traceability":
        return {
          id: key,
          severity: "warning" as const,
          title: "Traceability has not been filled strongly enough",
          detail: "The report package still needs requirement-to-design traceability so the handoff can explain why design outputs exist.",
          fixPath: `/projects/${projectId}/report?section=validation`,
          actionLabel: "Open Report",
        };
      case "lld":
        return {
          id: key,
          severity: "warning" as const,
          title: "Per-site low-level design is still too thin",
          detail: "The current design package still needs stronger site-by-site low-level design rows before it can be treated as a stronger engineering handoff.",
          fixPath: `/projects/${projectId}/report?section=site-lld`,
          actionLabel: "Open Report",
        };
      default:
        return {
          id: key,
          severity: "info" as const,
          title: "Recovery review item",
          detail: "A recovery review item still needs another pass.",
          fixPath: `/projects/${projectId}/core-model?focus=unresolved-references`,
          actionLabel: "Open Core Model",
        };
    }
  });

  const siteReviews: SiteAuthorityReview[] = truth.siteNodes.map((site) => {
    const routeSourcesForSite = truth.routeDomains.filter((item) => item.siteId === site.siteId).map((item) => item.authoritySource);
    const boundarySourcesForSite = truth.boundaryDomains.filter((item) => item.siteId === site.siteId || item.siteName === site.siteName).map((item) => item.authoritySource);
    const siteSources = [...routeSourcesForSite, ...boundarySourcesForSite];
    const strongestSource = (["saved-design", "discovery-derived", "backend-unconfirmed", "inferred"] as DesignTruthAuthoritySource[])
      .filter((source) => siteSources.includes(source))
      .sort((a, b) => sourceRank(b) - sourceRank(a))[0] ?? "none";
    const blockers = unique([...site.authorityNotes, ...site.notes]).slice(0, 4);
    const debtCount = blockers.length + (site.authorityStatus === "ready" ? 0 : site.authorityStatus === "partial" ? 1 : 2);
    const detail = site.authorityStatus === "ready"
      ? `${site.siteName} currently reads as review-ready with ${dominantSourceLabel(strongestSource).toLowerCase()} authority behind its main objects.`
      : site.authorityStatus === "partial"
        ? `${site.siteName} has some stronger anchors, but still needs cleanup before topology and report outputs can fully trust it.`
        : `${site.siteName} is still too dependent on thin or inferred design truth for a confident handoff.`;
    return {
      siteId: site.siteId,
      siteName: site.siteName,
      status: site.authorityStatus,
      strongestSource,
      strongestSourceLabel: dominantSourceLabel(strongestSource),
      debtCount,
      detail,
      blockers,
      fixPath: `/projects/${projectId}/requirements?step=scenario&site=${site.siteId}`,
    };
  }).sort((a, b) => {
    const statusWeight = (value: SiteAuthorityReview["status"]) => value === "pending" ? 0 : value === "partial" ? 1 : 2;
    const delta = statusWeight(a.status) - statusWeight(b.status);
    if (delta !== 0) return delta;
    return b.debtCount - a.debtCount;
  });

  const topSource = [...sourceMix].sort((a, b) => b.count - a.count)[0];
  const summary = status === "strong"
    ? `The current authority mix is mostly being carried by ${topSource?.label.toLowerCase() || "strong anchors"}, which means the shared design truth is much closer to a real handoff state.`
    : status === "mixed"
      ? `The authority mix is improving, but too much of the design is still split between ${sourceMix.filter((item) => item.count > 0 && item.source !== "saved-design").map((item) => item.label.toLowerCase()).join(", ")} rather than strong persisted truth.`
      : `The authority mix is still weak. Too much of the shared model is being carried by inferred or thin preview truth instead of stronger design anchors.`;

  return {
    confidenceScore,
    confidenceLabel,
    status,
    summary,
    sourceMix,
    debtItems,
    siteReviews,
    masterEvidence: {
      explicitCoreObjects,
      inferredCoreObjects,
      unresolvedReferences: truth.unresolvedReferences.length,
      requiredFlowsReady,
      requiredFlowsTotal: requiredFlows.length,
      traceabilityItems: design.traceability.length,
      lowLevelDesignRows: design.lowLevelDesign.length,
      partialSites,
      pendingSites,
    },
  };
}
