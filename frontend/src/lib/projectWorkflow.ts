import type { SynthesizedLogicalDesign } from "./designSynthesis.types";
import { buildDesignAuthorityLedger } from "./designAuthorityLedger";
import { buildRecoveryFocusPlan } from "./recoveryFocus";
import { buildRecoveryRoadmapStatus, type RecoveryPhaseStatus } from "./recoveryRoadmap";

export interface WorkflowStageReview {
  key: "discovery" | "requirements" | "design" | "validation" | "deliver";
  label: string;
  path: string;
  status: RecoveryPhaseStatus;
  statusLabel: string;
  summary: string;
  blockers: string[];
  recommendedActionLabel: string;
  recommendedActionPath: string;
}

export interface WorkflowActionQueueItem {
  key: string;
  title: string;
  detail: string;
  path: string;
  label: string;
  severity: "primary" | "warning" | "secondary";
}

export interface ProjectWorkflowReview {
  stages: WorkflowStageReview[];
  actionQueue: WorkflowActionQueueItem[];
}

function unique<T extends { key: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}

function statusLabel(status: RecoveryPhaseStatus) {
  return status === "ready" ? "Ready" : status === "partial" ? "Partial" : "Needs work";
}

function combineStatus(statuses: RecoveryPhaseStatus[]): RecoveryPhaseStatus {
  if (statuses.every((status) => status === "ready")) return "ready";
  if (statuses.some((status) => status === "partial" || status === "ready")) return "partial";
  return "pending";
}

export function buildProjectWorkflowReview(projectId: string, design: SynthesizedLogicalDesign, validationErrorCount = 0): ProjectWorkflowReview {
  const recovery = buildRecoveryRoadmapStatus(design);
  const ledger = buildDesignAuthorityLedger(projectId, design);
  const focus = buildRecoveryFocusPlan(projectId, design, validationErrorCount);
  const truth = design.designTruthModel;
  const requirementsGapCount = truth.siteNodes.filter((site) => site.authorityStatus !== "ready").length;
  const discoveryAnchors = truth.routeDomains.filter((item) => item.authoritySource === "discovery-derived").length
    + truth.boundaryDomains.filter((item) => item.authoritySource === "discovery-derived").length;

  const phaseMap = new Map(recovery.phases.map((phase) => [phase.key, phase]));
  const phaseB = phaseMap.get("phase-b");
  const phaseC = phaseMap.get("phase-c");
  const phaseD = phaseMap.get("phase-d");
  const phaseE = phaseMap.get("phase-e");
  const phaseF = phaseMap.get("phase-f");
  const phaseG = phaseMap.get("phase-g");
  const phaseH = phaseMap.get("phase-h");
  const phaseI = phaseMap.get("phase-i");
  const phaseJ = phaseMap.get("phase-j");

  const discoveryStatus = discoveryAnchors > 0 ? (requirementsGapCount > 0 ? "partial" : "ready") : "pending";
  const requirementsStatus = requirementsGapCount === 0 ? "ready" : requirementsGapCount <= 2 ? "partial" : "pending";
  const designStatus = combineStatus([phaseB?.status || "pending", phaseC?.status || "pending", phaseD?.status || "pending", phaseE?.status || "pending", phaseF?.status || "pending"]);
  const validationStatus = validationErrorCount === 0 && ledger.debtItems.length <= 1 ? "ready" : validationErrorCount === 0 ? "partial" : "pending";
  const deliverStatus = combineStatus([phaseG?.status || "pending", phaseH?.status || "pending", phaseI?.status || "pending", phaseJ?.status || "pending"]);

  const stages: WorkflowStageReview[] = [
    {
      key: "discovery",
      label: "Discovery",
      path: `/projects/${projectId}/discovery`,
      status: discoveryStatus,
      statusLabel: statusLabel(discoveryStatus),
      summary: discoveryAnchors > 0
        ? `Discovery is already lifting ${discoveryAnchors} route or boundary anchor${discoveryAnchors === 1 ? "" : "s"} into the shared model.`
        : "Discovery is still too note-like and needs stronger current-state anchors feeding the design engine.",
      blockers: discoveryAnchors > 0
        ? (requirementsGapCount > 0 ? [`${requirementsGapCount} site authority row${requirementsGapCount === 1 ? " still needs" : "s still need"} stronger upstream evidence.`] : [])
        : ["Discovery-backed route and boundary anchors are still thin."],
      recommendedActionLabel: "Open Discovery",
      recommendedActionPath: `/projects/${projectId}/discovery?section=authority`,
    },
    {
      key: "requirements",
      label: "Requirements",
      path: `/projects/${projectId}/requirements`,
      status: requirementsStatus,
      statusLabel: statusLabel(requirementsStatus),
      summary: requirementsGapCount === 0
        ? "Requirements are feeding every site with a stronger authority footprint."
        : `Requirements still leave ${requirementsGapCount} site authority row${requirementsGapCount === 1 ? "" : "s"} weaker than the rest of the design package.`,
      blockers: ledger.siteReviews.filter((site) => site.status !== "ready").slice(0, 2).map((site) => `${site.siteName}: ${site.blockers[0] || site.detail}`),
      recommendedActionLabel: "Open Requirements",
      recommendedActionPath: `/projects/${projectId}/requirements?step=scenario`,
    },
    {
      key: "design",
      label: "Design Package",
      path: `/projects/${projectId}/logical-design`,
      status: designStatus,
      statusLabel: statusLabel(designStatus),
      summary: `The design package is currently being carried by ${ledger.confidenceLabel.toLowerCase()} with ${ledger.masterEvidence.explicitCoreObjects} explicit core object${ledger.masterEvidence.explicitCoreObjects === 1 ? "" : "s"}.`,
      blockers: [
        ...(phaseB?.blockers.slice(0, 1) ?? []),
        ...(phaseE?.blockers.slice(0, 1) ?? []),
        ...(phaseF?.blockers.slice(0, 1) ?? []),
      ].slice(0, 3),
      recommendedActionLabel: focus.primaryAction.label,
      recommendedActionPath: focus.primaryAction.path,
    },
    {
      key: "validation",
      label: "Validation",
      path: `/projects/${projectId}/validation`,
      status: validationStatus,
      statusLabel: statusLabel(validationStatus),
      summary: validationErrorCount > 0
        ? `${validationErrorCount} blocking validation finding${validationErrorCount === 1 ? " is" : "s are"} still ahead of a confident handoff.`
        : `Validation is now mostly dealing with authority debt and recovery cleanup instead of raw blocking findings.`,
      blockers: [
        ...(validationErrorCount > 0 ? [`${validationErrorCount} validation blocker${validationErrorCount === 1 ? " remains" : "s remain"}.`] : []),
        ...ledger.debtItems.slice(0, 2).map((item) => item.title),
      ].slice(0, 3),
      recommendedActionLabel: validationErrorCount > 0 ? "Run Validation" : "Open Validation",
      recommendedActionPath: `/projects/${projectId}/validation?section=focus`,
    },
    {
      key: "deliver",
      label: "Deliver",
      path: `/projects/${projectId}/report`,
      status: deliverStatus,
      statusLabel: statusLabel(deliverStatus),
      summary: `Delivery surfaces now have report, diagram, and workflow truth signals, but they still need to stay honest about remaining recovery debt.`,
      blockers: [
        ...(phaseG?.blockers.slice(0, 1) ?? []),
        ...(phaseJ?.blockers.slice(0, 1) ?? []),
        ...(phaseI?.blockers.slice(0, 1) ?? []),
      ].slice(0, 3),
      recommendedActionLabel: "Open Report",
      recommendedActionPath: `/projects/${projectId}/report?section=issues`,
    },
  ];

  const actionQueue = unique([
    {
      key: `focus-${focus.primaryAction.key}`,
      title: focus.headline,
      detail: focus.summary,
      path: focus.primaryAction.path,
      label: focus.primaryAction.label,
      severity: "primary" as const,
    },
    ...ledger.debtItems.slice(0, 3).map((item, index) => ({
      key: `debt-${item.id}-${index}`,
      title: item.title,
      detail: item.detail,
      path: item.fixPath,
      label: item.actionLabel,
      severity: item.severity === "critical" ? "warning" as const : "secondary" as const,
    })),
    ...stages.filter((stage) => stage.status !== "ready").slice(0, 2).map((stage) => ({
      key: `stage-${stage.key}`,
      title: `${stage.label} still needs work`,
      detail: stage.blockers[0] || stage.summary,
      path: stage.recommendedActionPath,
      label: stage.recommendedActionLabel,
      severity: "secondary" as const,
    })),
  ]).slice(0, 5);

  return { stages, actionQueue };
}
