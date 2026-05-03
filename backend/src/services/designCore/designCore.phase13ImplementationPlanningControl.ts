import type {
  ImplementationPlanModel,
  ImplementationPlanStep,
  ImplementationDependencyGraphEdge,
  NetworkObjectModel,
  NetworkObjectTruthState,
  Phase10DesignGraphControlSummary,
  Phase11RoutingSegmentationControlSummary,
  Phase12SecurityPolicyFlowControlSummary,
  Phase13ImplementationPlanningControlSummary,
  Phase13ImplementationStepGateRow,
  Phase13ImplementationStageGateRow,
  Phase13ImplementationDependencyGateRow,
  Phase13ImplementationFinding,
  Phase13ImplementationReadiness,
  Phase13ImplementationState,
} from "../designCore.types.js";

const EXECUTABLE_SOURCE_TRUTH_STATES = new Set<NetworkObjectTruthState>(["configured", "durable", "imported", "approved", "discovered"]);

function uniq(values: string[]) { return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0))); }

function objectRequirementIndex(networkObjectModel: NetworkObjectModel) {
  const index = new Map<string, string[]>();
  const rows: any[] = [
    ...(networkObjectModel.routeDomains ?? []),
    ...(networkObjectModel.securityZones ?? []),
    ...(networkObjectModel.devices ?? []),
    ...(networkObjectModel.interfaces ?? []),
    ...(networkObjectModel.links ?? []),
    ...(networkObjectModel.policyRules ?? []),
    ...(networkObjectModel.natRules ?? []),
    ...(networkObjectModel.dhcpPools ?? []),
    ...(networkObjectModel.ipReservations ?? []),
    ...(networkObjectModel.routingSegmentation?.routeIntents ?? []),
    ...(networkObjectModel.securityPolicyFlow?.flowRequirements ?? []),
  ];
  for (const row of rows) if (row?.id) index.set(String(row.id), uniq([...(row.sourceRequirementIds ?? []), ...(row.requirementKeys ?? [])]));
  return index;
}

function objectTruthIndex(networkObjectModel: NetworkObjectModel) {
  const index = new Map<string, NetworkObjectTruthState>();
  const rows: any[] = [
    ...(networkObjectModel.routeDomains ?? []), ...(networkObjectModel.securityZones ?? []), ...(networkObjectModel.devices ?? []),
    ...(networkObjectModel.interfaces ?? []), ...(networkObjectModel.links ?? []), ...(networkObjectModel.policyRules ?? []),
    ...(networkObjectModel.natRules ?? []), ...(networkObjectModel.dhcpPools ?? []), ...(networkObjectModel.ipReservations ?? []),
    ...(networkObjectModel.routingSegmentation?.routeIntents ?? []), ...(networkObjectModel.securityPolicyFlow?.flowRequirements ?? []),
  ];
  for (const row of rows) if (row?.id && row.truthState) index.set(String(row.id), row.truthState);
  return index;
}

function sourceObjectIdsForStep(step: ImplementationPlanStep) { return uniq([step.targetObjectId ?? "", ...step.dependencyObjectIds]); }

function sourceRequirementIdsForStep(params: { step: ImplementationPlanStep; objectRequirementIds: Map<string, string[]>; phase10DesignGraph?: Phase10DesignGraphControlSummary; phase11RoutingSegmentation?: Phase11RoutingSegmentationControlSummary; phase12SecurityPolicyFlow?: Phase12SecurityPolicyFlowControlSummary; }) {
  const ids = sourceObjectIdsForStep(params.step);
  const fromObjects = ids.flatMap((id) => params.objectRequirementIds.get(id) ?? []);
  const fromGraphCoverage = ((params.phase10DesignGraph as any)?.objectCoverage ?? []).filter((row: any) => ids.includes(row.objectId)).flatMap((row: any) => row.sourceRequirementIds ?? []);
  const fromGraphPaths = ((params.phase10DesignGraph as any)?.requirementDependencyPaths ?? []).filter((row: any) => (row.actualObjectIds ?? []).some((id: string) => ids.includes(id))).flatMap((row: any) => [row.requirementId, row.sourceKey]);
  const fromRouting = ((params.phase11RoutingSegmentation as any)?.protocolIntents ?? []).filter((row: any) => (row.sourceObjectIds ?? []).some((id: string) => ids.includes(id)) || (row.sourceRouteIntentIds ?? []).some((id: string) => ids.includes(id))).flatMap((row: any) => row.requirementKeys ?? []);
  const fromSecurity = ((params.phase12SecurityPolicyFlow as any)?.flowConsequences ?? []).filter((row: any) => ids.includes(row.flowRequirementId)).flatMap((row: any) => row.requirementKeys ?? []);
  return uniq([...fromObjects, ...fromGraphCoverage, ...fromGraphPaths, ...fromRouting, ...fromSecurity]);
}

function truthStateForStep(step: ImplementationPlanStep, truthIndex: Map<string, NetworkObjectTruthState>) { return step.targetObjectId ? truthIndex.get(step.targetObjectId) : undefined; }

function stateFromStep(step: ImplementationPlanStep): Phase13ImplementationState { if (step.readiness === "ready") return "READY"; if (step.readiness === "blocked") return "BLOCKED"; if (step.readiness === "deferred") return "DRAFT_ONLY"; return "REVIEW_REQUIRED"; }

function readinessImpact(params: { step: ImplementationPlanStep; sourceObjectIds: string[]; sourceRequirementIds: string[]; truthState?: NetworkObjectTruthState; }): Phase13ImplementationReadiness {
  if (params.step.readiness === "blocked") return "BLOCKED";
  if (params.step.category !== "preparation" && params.sourceObjectIds.length === 0) return "BLOCKED";
  if (params.step.readiness === "review" || params.step.readiness === "deferred" || params.step.engineerReviewRequired) return "REVIEW_REQUIRED";
  if (!params.step.rollbackIntent || params.step.requiredEvidence.length === 0 || params.step.acceptanceCriteria.length === 0) return "BLOCKED";
  if (params.step.category !== "preparation" && params.sourceRequirementIds.length === 0) return "REVIEW_REQUIRED";
  if (params.truthState && !EXECUTABLE_SOURCE_TRUTH_STATES.has(params.truthState)) return "REVIEW_REQUIRED";
  return "READY";
}

function reviewReason(step: ImplementationPlanStep, impact: Phase13ImplementationReadiness, truthState: NetworkObjectTruthState | undefined, sourceObjectIds: string[], sourceRequirementIds: string[]) {
  if (impact === "READY") return undefined;
  if (step.readiness === "blocked") return step.blockers[0] ?? "Backend implementation plan marks this step blocked.";
  if (sourceObjectIds.length === 0 && step.category !== "preparation") return "No backend source object is linked to this implementation step.";
  if (!step.rollbackIntent || step.requiredEvidence.length === 0 || step.acceptanceCriteria.length === 0) return "Step is missing rollback, required evidence, or acceptance criteria.";
  if (truthState && !EXECUTABLE_SOURCE_TRUTH_STATES.has(truthState)) return `Target source truth state is ${truthState}; Phase 13 keeps it review-gated.`;
  if (sourceRequirementIds.length === 0 && step.category !== "preparation") return "No requirement lineage was resolved for this step; engineer review is required.";
  if (step.engineerReviewRequired) return "Backend implementation plan explicitly requires engineer review.";
  return "Phase 13 review is required before execution.";
}

function buildStepGates(plan: ImplementationPlanModel, networkObjectModel: NetworkObjectModel, phase10DesignGraph?: Phase10DesignGraphControlSummary, phase11RoutingSegmentation?: Phase11RoutingSegmentationControlSummary, phase12SecurityPolicyFlow?: Phase12SecurityPolicyFlowControlSummary): Phase13ImplementationStepGateRow[] {
  const requirementIndex = objectRequirementIndex(networkObjectModel);
  const truthIndex = objectTruthIndex(networkObjectModel);
  return plan.steps.map((step) => {
    const sourceObjectIds = sourceObjectIdsForStep(step);
    const sourceRequirementIds = sourceRequirementIdsForStep({ step, objectRequirementIds: requirementIndex, phase10DesignGraph, phase11RoutingSegmentation, phase12SecurityPolicyFlow });
    const sourceTruthState = truthStateForStep(step, truthIndex);
    const readiness = readinessImpact({ step, sourceObjectIds, sourceRequirementIds, truthState: sourceTruthState });
    return { stepId: step.id, title: step.title, stageId: step.stageId, category: step.category, targetObjectType: step.targetObjectType, targetObjectId: step.targetObjectId, sourceObjectIds, sourceRequirementIds, sourceTruthState, preconditions: uniq([...step.readinessReasons, ...step.dependencies.map((d) => d.reason)]), operatorAction: step.implementationIntent || step.action, verificationEvidence: uniq([...step.requiredEvidence, ...step.acceptanceCriteria]), rollbackStep: step.rollbackIntent, riskLevel: step.riskLevel, dependencyStepIds: step.dependencies.map((d) => d.stepId), blockingDependencyIds: step.readiness === "blocked" ? step.dependencies.map((d) => d.stepId) : [], readinessState: stateFromStep(step), readinessImpact: readiness, evidence: uniq([`Backend readiness=${step.readiness}`, ...step.sourceEvidence]), reviewReason: reviewReason(step, readiness, sourceTruthState, sourceObjectIds, sourceRequirementIds), notes: uniq(step.notes) };
  });
}

function buildStageGates(plan: ImplementationPlanModel, stepGates: Phase13ImplementationStepGateRow[]): Phase13ImplementationStageGateRow[] { return plan.stages.map((stage) => { const rows = stepGates.filter((step) => step.stageId === stage.id); const blocked = rows.filter((step) => step.readinessImpact === "BLOCKED").map((step) => step.stepId); const review = rows.filter((step) => step.readinessImpact === "REVIEW_REQUIRED").map((step) => step.stepId); const ready = rows.filter((step) => step.readinessImpact === "READY").map((step) => step.stepId); return { stageId: stage.id, stageName: stage.name, stageType: stage.stageType, sequence: stage.sequence, stepIds: rows.map((step) => step.stepId), readyStepIds: ready, reviewStepIds: review, blockedStepIds: blocked, exitCriteria: stage.exitCriteria, readinessImpact: blocked.length ? "BLOCKED" : review.length ? "REVIEW_REQUIRED" : "READY", blockers: rows.filter((step) => step.readinessImpact === "BLOCKED").flatMap((step) => step.reviewReason ? [`${step.title}: ${step.reviewReason}`] : []), evidence: [`Objective: ${stage.objective}`, `${rows.length} implementation step(s) mapped to this stage.`], notes: ["Stage readiness is derived from backend Phase 13 step gates."] }; }); }

function buildDependencyGates(plan: ImplementationPlanModel, stepGates: Phase13ImplementationStepGateRow[]): Phase13ImplementationDependencyGateRow[] { const byId = new Map(stepGates.map((step) => [step.stepId, step])); return plan.dependencyGraph.edges.map((edge: ImplementationDependencyGraphEdge) => { const source = edge.sourceStepId ? byId.get(edge.sourceStepId) : undefined; const target = edge.targetStepId ? byId.get(edge.targetStepId) : undefined; const readinessImpact: Phase13ImplementationReadiness = source?.readinessImpact === "BLOCKED" || target?.readinessImpact === "BLOCKED" ? "BLOCKED" : source?.readinessImpact === "REVIEW_REQUIRED" || target?.readinessImpact === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "READY"; return { dependencyId: edge.id, sourceStepId: edge.sourceStepId, targetStepId: edge.targetStepId, sourceObjectId: edge.sourceObjectId, targetObjectId: edge.targetObjectId, relationship: edge.relationship, required: edge.required, readinessImpact, evidence: [edge.reason], notes: [edge.source === "design-graph" ? "Dependency came from backend design graph." : `Dependency source: ${edge.source}.`] }; }); }

function buildFindings(plan: ImplementationPlanModel, stepGates: Phase13ImplementationStepGateRow[]): Phase13ImplementationFinding[] { const findings: Phase13ImplementationFinding[] = []; const blocked = stepGates.filter((step) => step.readinessImpact === "BLOCKED"); const review = stepGates.filter((step) => step.readinessImpact === "REVIEW_REQUIRED"); const noSource = stepGates.filter((step) => step.category !== "preparation" && step.sourceObjectIds.length === 0); const noReq = stepGates.filter((step) => step.category !== "preparation" && step.sourceRequirementIds.length === 0); const incomplete = stepGates.filter((step) => step.preconditions.length === 0 || step.verificationEvidence.length === 0 || !step.rollbackStep); const readyInferred = stepGates.filter((step) => step.readinessState === "READY" && step.sourceTruthState && !EXECUTABLE_SOURCE_TRUTH_STATES.has(step.sourceTruthState)); const highRiskNoSafety = plan.steps.filter((step) => step.riskLevel === "high" && !step.dependencies.some((dependency) => dependency.stepId.toLowerCase().includes("safety")) && step.category !== "preparation"); if (plan.steps.length === 0) findings.push({ severity: "BLOCKING", code: "PHASE13_IMPLEMENTATION_PLAN_EMPTY", title: "Implementation plan is empty", detail: "No backend implementation steps were generated.", affectedStepIds: [], readinessImpact: "BLOCKED", remediation: "Generate implementation steps from verified upstream objects or explicit no-op/review reasons." }); if (blocked.length) findings.push({ severity: "BLOCKING", code: "PHASE13_BLOCKED_STEPS_PRESENT", title: "Implementation contains blocked steps", detail: `${blocked.length} step(s) are blocked by upstream evidence.`, affectedStepIds: blocked.map((s) => s.stepId), readinessImpact: "BLOCKED", remediation: "Resolve blockers or defer affected implementation scope." }); if (noSource.length) findings.push({ severity: "BLOCKING", code: "PHASE13_STEP_SOURCE_OBJECT_MISSING", title: "Implementation steps lack source objects", detail: `${noSource.length} non-preparation step(s) have no source object lineage.`, affectedStepIds: noSource.map((s) => s.stepId), readinessImpact: "BLOCKED", remediation: "Tie each step to backend source objects or explicit review/no-op items." }); if (incomplete.length) findings.push({ severity: "BLOCKING", code: "PHASE13_STEP_EVIDENCE_ROLLBACK_INCOMPLETE", title: "Implementation steps are missing preconditions, verification, or rollback", detail: `${incomplete.length} step(s) are incomplete.`, affectedStepIds: incomplete.map((s) => s.stepId), readinessImpact: "BLOCKED", remediation: "Every step needs preconditions, verification evidence, and rollback." }); if (readyInferred.length) findings.push({ severity: "REVIEW_REQUIRED", code: "PHASE13_READY_STEP_INFERRED_SOURCE_OBJECT", title: "Ready implementation step uses non-authoritative source truth", detail: `${readyInferred.length} ready step(s) use inferred/proposed/planned source objects.`, affectedStepIds: readyInferred.map((s) => s.stepId), readinessImpact: "REVIEW_REQUIRED", remediation: "Approve/import/discover/configure source object before execution." }); if (noReq.length) findings.push({ severity: "REVIEW_REQUIRED", code: "PHASE13_STEP_REQUIREMENT_LINEAGE_MISSING", title: "Implementation steps lack requirement lineage", detail: `${noReq.length} non-preparation step(s) have no requirement lineage.`, affectedStepIds: noReq.map((s) => s.stepId), readinessImpact: "REVIEW_REQUIRED", remediation: "Propagate source requirement IDs into implementation gates." }); if (highRiskNoSafety.length) findings.push({ severity: "REVIEW_REQUIRED", code: "PHASE13_HIGH_RISK_STEP_MISSING_SAFETY_GATE", title: "High-risk implementation step lacks operational safety dependency", detail: `${highRiskNoSafety.length} high-risk step(s) do not depend on an operational safety gate.`, affectedStepIds: highRiskNoSafety.map((s) => s.id), readinessImpact: "REVIEW_REQUIRED", remediation: "Add operational-safety dependency before execution." }); if (review.length) findings.push({ severity: "REVIEW_REQUIRED", code: "PHASE13_REVIEW_STEPS_PRESENT", title: "Review-required implementation steps are present", detail: `${review.length} step(s) require engineer review.`, affectedStepIds: review.map((s) => s.stepId), readinessImpact: "REVIEW_REQUIRED", remediation: "Review source truth, evidence, dependencies, and rollback before execution." }); if (!findings.length) findings.push({ severity: "PASSED", code: "PHASE13_IMPLEMENTATION_PLANNING_CONTROLLED", title: "Implementation planning is controlled", detail: "Every implementation step is source-object gated with lineage, evidence, rollback, dependencies, and readiness.", affectedStepIds: [], readinessImpact: "READY", remediation: "Continue to Phase 14 vendor-neutral templates." }); return findings; }

export function buildPhase13ImplementationPlanningControl(params: { networkObjectModel: NetworkObjectModel; phase9NetworkObjectModel?: unknown; phase10DesignGraph?: Phase10DesignGraphControlSummary; phase11RoutingSegmentation?: Phase11RoutingSegmentationControlSummary; phase12SecurityPolicyFlow?: Phase12SecurityPolicyFlowControlSummary; }): Phase13ImplementationPlanningControlSummary {
  const plan = params.networkObjectModel.implementationPlan;
  const stepGates = buildStepGates(plan, params.networkObjectModel, params.phase10DesignGraph, params.phase11RoutingSegmentation, params.phase12SecurityPolicyFlow);
  const stageGates = buildStageGates(plan, stepGates);
  const dependencyGates = buildDependencyGates(plan, stepGates);
  const findings = buildFindings(plan, stepGates);
  const blockedStepGateCount = stepGates.filter((s) => s.readinessImpact === "BLOCKED").length;
  const reviewStepGateCount = stepGates.filter((s) => s.readinessImpact === "REVIEW_REQUIRED").length;
  const overallReadiness: Phase13ImplementationReadiness = blockedStepGateCount ? "BLOCKED" : reviewStepGateCount ? "REVIEW_REQUIRED" : "READY";
  return { contract: "PHASE13_IMPLEMENTATION_PLANNING_CONTRACT", role: "VERIFIED_SOURCE_OBJECT_GATED_IMPLEMENTATION_PLAN_NOT_VENDOR_CONFIG", overallReadiness, stageGateCount: stageGates.length, stepGateCount: stepGates.length, readyStepGateCount: stepGates.filter((s) => s.readinessImpact === "READY").length, reviewStepGateCount, blockedStepGateCount, highRiskStepCount: stepGates.filter((s) => s.riskLevel === "high").length, highRiskStepWithSafetyGateCount: plan.steps.filter((s) => s.riskLevel === "high" && s.dependencies.some((d) => d.stepId.toLowerCase().includes("safety"))).length, dependencyGateCount: dependencyGates.length, graphBackedDependencyCount: dependencyGates.filter((d) => d.notes.some((n) => n.includes("design graph"))).length, verificationEvidenceGateCount: stepGates.filter((s) => s.verificationEvidence.length > 0).length, rollbackGateCount: stepGates.filter((s) => Boolean(s.rollbackStep)).length, requirementLineageGapCount: stepGates.filter((s) => s.category !== "preparation" && s.sourceRequirementIds.length === 0).length, sourceObjectGapCount: stepGates.filter((s) => s.category !== "preparation" && s.sourceObjectIds.length === 0).length, blockedFindingCount: findings.filter((f) => f.severity === "BLOCKING").length, reviewFindingCount: findings.filter((f) => f.severity === "REVIEW_REQUIRED").length, findingCount: findings.length, implementationReadiness: plan.summary.implementationReadiness, stageGates, stepGates, dependencyGates, findings, notes: ["Phase 13 controls implementation planning; it does not emit vendor configuration commands."] };
}
