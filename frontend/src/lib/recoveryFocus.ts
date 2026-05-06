import type { SynthesizedLogicalDesign } from "./designSynthesis.types";
import { buildRecoveryRoadmapStatus, type RecoveryStageReview } from "./recoveryRoadmap";

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

function stageAction(projectId: string, stage: RecoveryStageReview): RecoveryFocusAction {
  switch (stage.key) {
    case "stage-b":
      return {
        key: stage.key,
        label: "Strengthen the core model",
        path: `/projects/${projectId}/core-model`,
        reason: "Reduce inferred route and boundary objects, and clean up unresolved references in the shared engineering model.",
        emphasis: "primary",
      };
    case "stage-c":
      return {
        key: stage.key,
        label: "Tighten topology-specific behavior",
        path: `/projects/${projectId}/logical-design`,
        reason: "Make the chosen topology change placement, path, and cloud-breakout behavior more explicitly.",
        emphasis: "primary",
      };
    case "stage-d":
      return {
        key: stage.key,
        label: "Repair the addressing backbone",
        path: `/projects/${projectId}/addressing`,
        reason: "Use the addressing model to anchor site blocks, zones, management networks, and route visibility.",
        emphasis: "primary",
      };
    case "stage-e":
      return {
        key: stage.key,
        label: "Close the remaining flow gaps",
        path: `/projects/${projectId}/routing`,
        reason: "Make required traffic paths explicit with route, control-point, and enforcement detail.",
        emphasis: "primary",
      };
    case "stage-f":
      return {
        key: stage.key,
        label: "Make boundary design more concrete",
        path: `/projects/${projectId}/security`,
        reason: "Tie zones, peers, control points, and published services to named boundary objects.",
        emphasis: "primary",
      };
    case "stage-g":
      return {
        key: stage.key,
        label: "Tighten the report package",
        path: `/projects/${projectId}/report`,
        reason: "Keep the report fact-first and driven from the same explicit design truth as the other workspaces.",
        emphasis: "primary",
      };
    case "stage-h":
      return {
        key: stage.key,
        label: "Run the UX density cleanup",
        path: `/projects/${projectId}/logical-design`,
        reason: "Keep the main workflow focused on critical outputs first and lower-value detail second.",
        emphasis: "secondary",
      };
    case "stage-i":
      return {
        key: stage.key,
        label: "Audit the weaker controls",
        path: `/projects/${projectId}/validation`,
        reason: "Remove or demote low-value interactions and keep only controls that create visible engineering value.",
        emphasis: "secondary",
      };
    case "stage-j":
      return {
        key: stage.key,
        label: "Push diagram convergence further",
        path: `/projects/${projectId}/diagram`,
        reason: "Make placement, overlays, and trust signals read more directly from the unified truth model.",
        emphasis: "primary",
      };
    default:
      return {
        key: stage.key,
        label: stage.label,
        path: `/projects/${projectId}/logical-design`,
        reason: stage.detail,
        emphasis: "secondary",
      };
  }
}

const priorityOrder: Record<string, number> = {
  "stage-b": 1,
  "stage-e": 2,
  "stage-f": 3,
  "stage-j": 4,
  "stage-g": 5,
  "stage-d": 6,
  "stage-c": 7,
  "stage-h": 8,
  "stage-i": 9,
};

export function buildRecoveryFocusPlan(projectId: string, design: SynthesizedLogicalDesign, validationErrorCount = 0): RecoveryFocusPlan {
  const recovery = buildRecoveryRoadmapStatus(design);
  const truth = design.designTruthModel;
  const nonReadyStages = [...recovery.stages]
    .filter((stage) => stage.status !== "ready")
    .sort((a, b) => (priorityOrder[a.key] ?? 99) - (priorityOrder[b.key] ?? 99));

  const chosenStage = nonReadyStages[0] ?? recovery.stages[0];
  const primaryAction = validationErrorCount > 0
    ? {
        key: "validation-errors",
        label: `Resolve ${validationErrorCount} validation blocker${validationErrorCount === 1 ? "" : "s"}`,
        path: `/projects/${projectId}/validation`,
        reason: "Validation blockers should be cleared before the design package is treated as stable.",
        emphasis: "primary" as const,
      }
    : stageAction(projectId, chosenStage);

  const supportActions = uniqueByKey(
    nonReadyStages
      .filter((stage) => stage.key !== chosenStage.key)
      .map((stage) => stageAction(projectId, stage))
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
