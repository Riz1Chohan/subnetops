import type { SynthesizedLogicalDesign } from "./designSynthesis";
import { buildDesignAuthorityLedger, type AuthorityDebtItem } from "./designAuthorityLedger";
import { buildProjectWorkflowReview } from "./projectWorkflow";
import { buildRecoveryMasterRoadmapGate, buildRecoveryRoadmapStatus } from "./recoveryRoadmap";

export interface RecoveryCompletionTask {
  id: string;
  title: string;
  detail: string;
  path: string;
  label: string;
  severity: "critical" | "warning" | "secondary";
}

export interface RecoveryCompletionPlan {
  status: "stay-on-recovery" | "near-transition" | "ready-for-master";
  percentComplete: number;
  headline: string;
  summary: string;
  mustFinish: RecoveryCompletionTask[];
  shouldFinish: RecoveryCompletionTask[];
  evidence: string[];
}

function dedupeTasks(tasks: RecoveryCompletionTask[]) {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
}

function toTask(projectId: string, item: AuthorityDebtItem): RecoveryCompletionTask {
  return {
    id: item.id,
    title: item.title,
    detail: item.detail,
    path: item.fixPath,
    label: item.actionLabel,
    severity: item.severity === "info" ? "secondary" : item.severity,
  };
}

export function buildRecoveryCompletionPlan(projectId: string, design: SynthesizedLogicalDesign, validationErrorCount = 0): RecoveryCompletionPlan {
  const recovery = buildRecoveryRoadmapStatus(design);
  const gate = buildRecoveryMasterRoadmapGate(recovery);
  const workflow = buildProjectWorkflowReview(projectId, design, validationErrorCount);
  const authorityLedger = buildDesignAuthorityLedger(projectId, design);
  const totalPhases = Math.max(1, recovery.phases.length);
  const percentComplete = Math.max(0, Math.min(100, Math.round(((recovery.completedCount + recovery.partialCount * 0.5) / totalPhases) * 100)));

  const debtTasks = authorityLedger.debtItems.map((item) => toTask(projectId, item));
  const blockerTasks: RecoveryCompletionTask[] = recovery.topBlockers.slice(0, 3).map((item, index) => ({
    id: `blocker-${index}`,
    title: item,
    detail: item,
    path: workflow.actionQueue[0]?.path || `/projects/${projectId}/core-model`,
    label: workflow.actionQueue[0]?.label || "Open workspace",
    severity: "warning",
  }));
  const stageTasks: RecoveryCompletionTask[] = workflow.stages
    .filter((stage) => stage.status !== "ready")
    .slice(0, 3)
    .map((stage) => ({
      id: `stage-${stage.key}`,
      title: `${stage.label} still needs work`,
      detail: stage.blockers[0] || stage.summary,
      path: stage.recommendedActionPath,
      label: stage.recommendedActionLabel,
      severity: stage.status === "pending" ? "critical" : "secondary",
    }));

  const mustFinish = dedupeTasks([
    ...debtTasks.filter((item) => item.severity === "critical"),
    ...stageTasks.filter((item) => item.severity === "critical"),
    ...blockerTasks,
  ]).slice(0, 5);

  const shouldFinish = dedupeTasks([
    ...debtTasks.filter((item) => item.severity !== "critical"),
    ...stageTasks.filter((item) => item.severity !== "critical"),
  ]).slice(0, 5);

  const evidence = [
    `${recovery.completedCount} recovery phase${recovery.completedCount === 1 ? " is" : "s are"} currently ready and ${recovery.partialCount} ${recovery.partialCount === 1 ? "is" : "are"} partial.`,
    `${authorityLedger.masterEvidence.explicitCoreObjects} explicit core object${authorityLedger.masterEvidence.explicitCoreObjects === 1 ? " is" : "s are"} backing the shared model, with ${authorityLedger.masterEvidence.inferredCoreObjects} still inferred.`,
    authorityLedger.masterEvidence.requiredFlowsTotal > 0
      ? `${authorityLedger.masterEvidence.requiredFlowsReady} of ${authorityLedger.masterEvidence.requiredFlowsTotal} required flow categories are fully ready.`
      : "Required flow coverage has not been established strongly enough yet.",
    authorityLedger.masterEvidence.pendingSites + authorityLedger.masterEvidence.partialSites > 0
      ? `${authorityLedger.masterEvidence.pendingSites} pending and ${authorityLedger.masterEvidence.partialSites} partial site authority rows still affect the handoff quality.`
      : "Every site currently has a ready authority status.",
  ];

  const headline = gate.status === "ready-for-master"
    ? "Recovery scope is strong enough to move into the master roadmap"
    : gate.status === "near-transition"
      ? "Recovery is close, but the final blockers still matter"
      : "Recovery work still needs another focused pass before the master roadmap";

  return {
    status: gate.status === "ready-for-master" ? "ready-for-master" : gate.status === "near-transition" ? "near-transition" : "stay-on-recovery",
    percentComplete,
    headline,
    summary: gate.summary,
    mustFinish,
    shouldFinish,
    evidence,
  };
}
