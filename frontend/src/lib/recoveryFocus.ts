import type { SynthesizedLogicalDesign } from "./designSynthesis.types";
import { buildRecoveryRoadmapStatus, type RecoveryPhaseReview } from "./recoveryRoadmap";

export interface RecoveryFocusAction {
  key: string;
  label: string;
  path: string;
  reason: string;
  emphasis: "primary" | "secondary" | "deferred";
}

export interface RecoveryFocusPlan {
  headline: string;
  summary: string;
  primaryAction: RecoveryFocusAction;
  supportActions: RecoveryFocusAction[];
  deferredActions: RecoveryFocusAction[];
  focusSignals: string[];
}

function uniqueByKey<T extends { key: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}

function phaseAction(projectId: string, phase: RecoveryPhaseReview): RecoveryFocusAction {
  switch (phase.key) {
    case "phase-b":
      return {
        key: phase.key,
        label: "Strengthen the core model",
        path: `/projects/${projectId}/core-model`,
        reason: "Reduce inferred route and boundary objects, and clean up unresolved references in the shared engineering model.",
        emphasis: "primary",
      };
    case "phase-c":
      return {
        key: phase.key,
        label: "Tighten topology-specific behavior",
        path: `/projects/${projectId}/logical-design`,
        reason: "Make the chosen topology change placement, path, and cloud-breakout behavior more explicitly.",
        emphasis: "primary",
      };
    case "phase-d":
      return {
        key: phase.key,
        label: "Repair the addressing backbone",
        path: `/projects/${projectId}/addressing`,
        reason: "Use the addressing model to anchor site blocks, zones, management networks, and route visibility.",
        emphasis: "primary",
      };
    case "phase-e":
      return {
        key: phase.key,
        label: "Close the remaining flow gaps",
        path: `/projects/${projectId}/routing`,
        reason: "Make required traffic paths explicit with route, control-point, and enforcement detail.",
        emphasis: "primary",
      };
    case "phase-f":
      return {
        key: phase.key,
        label: "Make boundary design more concrete",
        path: `/projects/${projectId}/security`,
        reason: "Tie zones, peers, control points, and published services to named boundary objects.",
        emphasis: "primary",
      };
    case "phase-g":
      return {
        key: phase.key,
        label: "Tighten the report package",
        path: `/projects/${projectId}/report`,
        reason: "Keep the report fact-first and driven from the same explicit design truth as the other workspaces.",
        emphasis: "primary",
      };
    case "phase-h":
      return {
        key: phase.key,
        label: "Run the UX density cleanup",
        path: `/projects/${projectId}/logical-design`,
        reason: "Keep the main workflow focused on critical outputs first and lower-value detail second.",
        emphasis: "secondary",
      };
    case "phase-i":
      return {
        key: phase.key,
        label: "Audit the weaker controls",
        path: `/projects/${projectId}/validation`,
        reason: "Remove or demote low-value interactions and keep only controls that create visible engineering value.",
        emphasis: "secondary",
      };
    case "phase-j":
      return {
        key: phase.key,
        label: "Push diagram convergence further",
        path: `/projects/${projectId}/diagram`,
        reason: "Make placement, overlays, and trust signals read more directly from the unified truth model.",
        emphasis: "primary",
      };
    default:
      return {
        key: phase.key,
        label: phase.label,
        path: `/projects/${projectId}/logical-design`,
        reason: phase.detail,
        emphasis: "secondary",
      };
  }
}

const priorityOrder: Record<string, number> = {
  "phase-b": 1,
  "phase-e": 2,
  "phase-f": 3,
  "phase-j": 4,
  "phase-g": 5,
  "phase-d": 6,
  "phase-c": 7,
  "phase-h": 8,
  "phase-i": 9,
};

export function buildRecoveryFocusPlan(projectId: string, design: SynthesizedLogicalDesign, validationErrorCount = 0): RecoveryFocusPlan {
  const recovery = buildRecoveryRoadmapStatus(design);
  const truth = design.designTruthModel;
  const nonReadyPhases = [...recovery.phases]
    .filter((phase) => phase.status !== "ready")
    .sort((a, b) => (priorityOrder[a.key] ?? 99) - (priorityOrder[b.key] ?? 99));

  const chosenPhase = nonReadyPhases[0] ?? recovery.phases[0];
  const primaryAction = validationErrorCount > 0
    ? {
        key: "validation-errors",
        label: `Resolve ${validationErrorCount} validation blocker${validationErrorCount === 1 ? "" : "s"}`,
        path: `/projects/${projectId}/validation`,
        reason: "Validation blockers should be cleared before the design package is treated as stable.",
        emphasis: "primary" as const,
      }
    : phaseAction(projectId, chosenPhase);

  const supportActions = uniqueByKey(
    nonReadyPhases
      .filter((phase) => phase.key !== chosenPhase.key)
      .map((phase) => phaseAction(projectId, phase))
      .filter((action) => action.path !== primaryAction.path)
      .slice(0, 3),
  );

  const deferredActions: RecoveryFocusAction[] = [
    {
      key: "tasks",
      label: "Keep tasks secondary",
      path: `/projects/${projectId}/tasks`,
      reason: "Tasks remain useful, but they should not pull attention away from the current recovery blocker.",
      emphasis: "deferred",
    },
    {
      key: "settings",
      label: "Keep settings secondary",
      path: `/projects/${projectId}/settings`,
      reason: "Settings and shell tweaks stay secondary until the design package is steadier.",
      emphasis: "deferred",
    },
  ];

  const requiredFlows = design.flowCoverage.filter((item) => item.required);
  const missingRequiredFlows = requiredFlows.filter((item) => item.status !== "ready").length;
  const inferredCount = truth.inferenceSummary.routeDomains + truth.inferenceSummary.boundaryDomains;
  const pendingSiteAuthorities = truth.siteNodes.filter((site) => site.authorityStatus !== "ready").length;

  const focusSignals = [
    inferredCount > 0 ? `${inferredCount} core object${inferredCount === 1 ? " is" : "s are"} still inferred.` : "Core route and boundary objects are now explicit.",
    truth.unresolvedReferences.length > 0 ? `${truth.unresolvedReferences.length} unresolved cross-object reference${truth.unresolvedReferences.length === 1 ? " remains" : "s remain"}.` : "No unresolved cross-object references are visible in the shared model.",
    missingRequiredFlows > 0 ? `${missingRequiredFlows} required flow categor${missingRequiredFlows === 1 ? "y is" : "ies are"} still not fully covered.` : "Required traffic-path coverage is currently complete.",
    pendingSiteAuthorities > 0 ? `${pendingSiteAuthorities} site authority row${pendingSiteAuthorities === 1 ? " still needs" : "s still need"} deeper cleanup.` : "Every site currently carries a stronger authority footprint.",
  ];

  const headline = validationErrorCount > 0
    ? "Clear the blocking validation issues first"
    : primaryAction.label;
  const summary = validationErrorCount > 0
    ? "SubnetOps should keep the current repair cycle focused on validation blockers before pushing lower-priority shell or workflow cleanup."
    : primaryAction.reason;

  return {
    headline,
    summary,
    primaryAction,
    supportActions,
    deferredActions,
    focusSignals,
  };
}
