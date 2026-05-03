import type {
  ImplementationPlanModel,
  ImplementationPlanRollbackAction,
  ImplementationPlanStage,
  ImplementationPlanStep,
  ImplementationPlanVerificationCheck,
  VendorNeutralImplementationTemplate,
  VendorNeutralImplementationTemplateGroup,
  VendorNeutralImplementationTemplateModel,
  VendorNeutralImplementationTemplateVariable,
} from "../designCore.types.js";

type BuildVendorNeutralImplementationTemplatesInput = {
  implementationPlan: ImplementationPlanModel;
};

type TemplateReadiness = VendorNeutralImplementationTemplate["readiness"];

const VENDOR_NEUTRAL_SAFETY_NOTICE =
  "V1 templates are vendor-neutral implementation guidance only. They intentionally do not contain Cisco, Palo Alto, Fortinet, Juniper, Aruba, Linux, cloud, or any other platform command syntax.";

function normalizeIdentifierSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unnamed";
}

function createTemplateId(step: ImplementationPlanStep) {
  return `vendor-neutral-template-${normalizeIdentifierSegment(step.id)}`;
}

function createGroupId(stage: ImplementationPlanStage) {
  return `vendor-neutral-template-group-${normalizeIdentifierSegment(stage.id)}`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function joinList(values: string[], fallback: string) {
  const clean = unique(values);
  return clean.length > 0 ? clean.join("; ") : fallback;
}

function readinessRank(readiness: TemplateReadiness) {
  if (readiness === "blocked") return 3;
  if (readiness === "review") return 2;
  return 1;
}

function worstReadiness(readinessValues: TemplateReadiness[]): TemplateReadiness {
  return readinessValues.reduce<TemplateReadiness>((current, next) => (readinessRank(next) > readinessRank(current) ? next : current), "ready");
}

function sortSteps(steps: ImplementationPlanStep[]) {
  return [...steps].sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
}

function checksForStep(step: ImplementationPlanStep, checks: ImplementationPlanVerificationCheck[]) {
  return checks.filter((check) => check.relatedStepIds.includes(step.id));
}

function rollbackForStep(step: ImplementationPlanStep, rollbackActions: ImplementationPlanRollbackAction[]) {
  return rollbackActions.filter((action) => action.relatedStepIds.includes(step.id));
}

function neutralActionLanguage(step: ImplementationPlanStep) {
  const target = step.targetObjectId ? `target object ${step.targetObjectId}` : "the referenced design object";

  if (step.category === "vlan-and-interface" || step.category === "routed-interface") {
    return [
      `Confirm the Layer 2/Layer 3 boundary for ${target} against the backend design-core snapshot before any change is made.`,
      "Create or update the VLAN/interface intent in the target platform using the site, subnet, gateway, and route-domain ownership from the backend model.",
      "Do not invent a subnet, gateway, native VLAN, trunk scope, or interface placement outside the backend-authored addressing and object model.",
    ];
  }

  if (step.category === "routing") {
    return [
      `Confirm the route-domain, destination prefix, and next-hop intent for ${target} before applying routing changes.`,
      "Apply the route intent in the chosen platform using the vendor-neutral route purpose, administrative state, and reachability evidence from the backend model.",
      "Do not convert a review or missing route intent into a production route without engineer approval and post-change reachability proof.",
    ];
  }

  if (step.category === "security-policy" || step.category === "security-policy-and-nat" || step.category === "nat") {
    return [
      `Confirm source zone, destination zone, required service scope, NAT status, and default-deny posture for ${target}.`,
      "Create or update explicit security/NAT intent only for the backend-modeled flow requirements and NAT reviews.",
      "Do not replace missing policy coverage with broad permit rules, broad service matching, or hidden allow-any behavior.",
    ];
  }

  if (step.category === "dhcp") {
    return [
      `Confirm DHCP pool ownership, gateway, subnet boundary, and exclusion/reservation intent for ${target}.`,
      "Create or update the address service intent in the target platform using backend-modeled subnet and gateway truth.",
      "Do not activate DHCP until overlap, capacity, and gateway validity have been reviewed.",
    ];
  }

  if (step.category === "operational-safety") {
    return [
      "Confirm management access, current configuration backup, fallback path, and rollback authority before any dependent change proceeds.",
      "Attach proof evidence to the implementation record before moving risky dependent steps out of blocked/review posture.",
      "Do not treat safety gates as documentation-only items; they control whether later changes are allowed to proceed.",
    ];
  }

  if (step.category === "verification") {
    return [
      "Run the backend-linked verification checks for this step and capture evidence before marking the change accepted.",
      "Validate both positive reachability and negative security expectations where applicable.",
      "If verification fails, stop further rollout and invoke the related rollback action or engineer review path.",
    ];
  }

  if (step.category === "rollback") {
    return [
      "Confirm rollback trigger conditions, affected implementation steps, and recovery intent before change execution.",
      "Keep rollback evidence separate from the success path so a failed change can be reversed cleanly.",
      "Do not rely on memory or vendor-default undo behavior as the rollback plan.",
    ];
  }

  return [
    `Review ${target} against the backend implementation plan and apply only the vendor-neutral intent documented by SubnetOps.`,
    "Record pre-change evidence, implementation evidence, verification evidence, and rollback readiness in the implementation record.",
    "Escalate to engineer review when readiness is blocked/review or when source evidence is incomplete.",
  ];
}

function buildPreChecks(step: ImplementationPlanStep) {
  return unique([
    "Confirm the backend design-core snapshot is the implementation source of truth.",
    "Confirm engineer approval, maintenance window, and affected-site blast radius.",
    ...step.sourceEvidence.map((item) => `Confirm source evidence: ${item}`),
    ...step.requiredEvidence.map((item) => `Collect required evidence before change: ${item}`),
    ...step.dependencies.map((dependency) => `Confirm dependency ${dependency.stepId}: ${dependency.reason}`),
    ...step.blockers.map((blocker) => `Resolve blocker before execution: ${blocker}`),
  ]);
}

function buildVerificationEvidence(step: ImplementationPlanStep, verificationChecks: ImplementationPlanVerificationCheck[]) {
  const directEvidence = verificationChecks.flatMap((check) => [
    `${check.name}: ${check.expectedResult}`,
    ...check.requiredEvidence.map((item) => `${check.name} evidence: ${item}`),
    ...check.acceptanceCriteria.map((item) => `${check.name} acceptance: ${item}`),
  ]);

  return unique([
    ...directEvidence,
    ...step.acceptanceCriteria.map((item) => `Step acceptance: ${item}`),
    step.expectedOutcome ? `Expected step outcome: ${step.expectedOutcome}` : "",
  ]);
}

function buildRollbackEvidence(step: ImplementationPlanStep, rollbackActions: ImplementationPlanRollbackAction[]) {
  return unique([
    step.rollbackIntent ? `Step rollback intent: ${step.rollbackIntent}` : "",
    ...rollbackActions.map((action) => `${action.name}: trigger ${action.triggerCondition}; intent ${action.rollbackIntent}`),
  ]);
}

function createTemplateVariables(): VendorNeutralImplementationTemplateVariable[] {
  return [
    {
      id: "template-variable-target-object",
      name: "Target object",
      required: true,
      source: "implementationPlan.steps.targetObjectId",
      exampleValue: "network-interface, route-intent, security-flow, NAT rule, DHCP pool, or report object ID",
      notes: ["Every implementation template must resolve back to a backend-modeled target or explicitly state why the target is cross-cutting."],
    },
    {
      id: "template-variable-readiness",
      name: "Readiness gate",
      required: true,
      source: "implementationPlan.steps.readiness",
      exampleValue: "ready, review, blocked, or deferred",
      notes: ["Blocked or review templates must not be treated as production-ready execution tasks."],
    },
    {
      id: "template-variable-required-evidence",
      name: "Required evidence",
      required: true,
      source: "implementationPlan.steps.requiredEvidence and implementationPlan.verificationChecks.requiredEvidence",
      exampleValue: "backup proof, route-table proof, packet-flow proof, DHCP lease proof, rollback proof",
      notes: ["Evidence is part of the template, not a vague afterthought."],
    },
    {
      id: "template-variable-verification-checks",
      name: "Verification checks",
      required: true,
      source: "implementationPlan.verificationChecks",
      exampleValue: "addressing, routing, policy, NAT, DHCP, operational-safety, rollback, and documentation checks",
      notes: ["A template without verification linkage is only a checklist item and should remain review-level."],
    },
    {
      id: "template-variable-rollback-intent",
      name: "Rollback intent",
      required: true,
      source: "implementationPlan.rollbackActions and implementationPlan.steps.rollbackIntent",
      exampleValue: "restore prior gateway, remove route intent, revert policy/NAT change, restore DHCP state, or stop rollout",
      notes: ["Risky templates need rollback linkage before implementation approval."],
    },
  ];
}

function createTemplate(
  step: ImplementationPlanStep,
  stage: ImplementationPlanStage | undefined,
  verificationChecks: ImplementationPlanVerificationCheck[],
  rollbackActions: ImplementationPlanRollbackAction[],
): VendorNeutralImplementationTemplate {
  const linkedChecks = checksForStep(step, verificationChecks);
  const linkedRollback = rollbackForStep(step, rollbackActions);
  const readiness: TemplateReadiness = step.readiness === "deferred" ? "review" : step.readiness;
  const blockerReasons = unique([
    ...step.blockers,
    ...step.readinessReasons.filter((reason) => step.readiness === "blocked" || step.readiness === "review" ? true : reason.toLowerCase().includes("review")),
    ...(linkedChecks.length === 0 ? ["No direct verification check is linked to this template yet."] : []),
    ...(step.riskLevel === "high" && linkedRollback.length === 0 ? ["High-risk template does not have a direct rollback action linkage."] : []),
  ]);

  return {
    id: createTemplateId(step),
    stepId: step.id,
    stageId: step.stageId,
    stageName: stage?.name ?? step.stageId,
    title: step.title,
    category: step.category,
    sequence: step.sequence,
    targetObjectType: step.targetObjectType,
    targetObjectId: step.targetObjectId,
    readiness,
    riskLevel: step.riskLevel,
    engineerReviewRequired: step.engineerReviewRequired || readiness !== "ready" || step.riskLevel === "high",
    vendorNeutralIntent: step.implementationIntent,
    commandGenerationAllowed: false,
    commandGenerationReason: "V1 intentionally stops at vendor-neutral execution templates. Platform-specific commands belong to a later gated stage after template truth is proven.",
    variableIds: [
      "template-variable-target-object",
      "template-variable-readiness",
      "template-variable-required-evidence",
      "template-variable-verification-checks",
      "template-variable-rollback-intent",
    ],
    preChecks: buildPreChecks(step),
    neutralActions: neutralActionLanguage(step),
    verificationEvidence: buildVerificationEvidence(step, linkedChecks),
    rollbackEvidence: buildRollbackEvidence(step, linkedRollback),
    acceptanceCriteria: unique(step.acceptanceCriteria),
    linkedVerificationCheckIds: linkedChecks.map((check) => check.id),
    linkedRollbackActionIds: linkedRollback.map((action) => action.id),
    dependencyStepIds: step.dependencies.map((dependency) => dependency.stepId),
    dependencyObjectIds: unique(step.dependencyObjectIds),
    graphDependencyEdgeIds: unique(step.graphDependencyEdgeIds),
    blastRadius: unique(step.blastRadius),
    blockerReasons,
    proofBoundary: [
      `Modeled intent: ${step.implementationIntent}`,
      `Source evidence: ${joinList(step.sourceEvidence, "No source evidence recorded")}`,
      `Required evidence: ${joinList(step.requiredEvidence, "No required evidence recorded")}`,
      "Not proven: live device state, platform syntax, production change success, and actual cabling/provider behavior.",
    ],
    notes: unique([
      ...step.notes,
      VENDOR_NEUTRAL_SAFETY_NOTICE,
      readiness === "blocked" ? "This template is blocked and must not be executed as a production change." : "",
      readiness === "review" ? "This template requires engineer review before execution." : "",
    ]),
  };
}

function buildTemplateGroups(stages: ImplementationPlanStage[], templates: VendorNeutralImplementationTemplate[]) {
  const groups: VendorNeutralImplementationTemplateGroup[] = stages.map((stage) => {
    const stageTemplates = templates.filter((template) => template.stageId === stage.id);
    return {
      id: createGroupId(stage),
      stageId: stage.id,
      name: stage.name,
      objective: stage.objective,
      readiness: stageTemplates.length > 0 ? worstReadiness(stageTemplates.map((template) => template.readiness)) : "review",
      templateIds: stageTemplates.map((template) => template.id),
      exitCriteria: [...stage.exitCriteria],
      notes: stageTemplates.length > 0
        ? [`${stageTemplates.length} vendor-neutral template(s) derived from backend implementation steps.`]
        : ["No implementation templates were derived for this stage yet."],
    };
  });

  const orphanTemplates = templates.filter((template) => !stages.some((stage) => stage.id === template.stageId));
  if (orphanTemplates.length > 0) {
    groups.push({
      id: "vendor-neutral-template-group-unassigned",
      stageId: "unassigned",
      name: "Unassigned implementation templates",
      objective: "Hold implementation templates whose source stage is missing from the implementation plan.",
      readiness: worstReadiness(orphanTemplates.map((template) => template.readiness)),
      templateIds: orphanTemplates.map((template) => template.id),
      exitCriteria: ["Review the source implementation plan and restore stage ownership for every template."],
      notes: ["Unassigned templates are not execution-ready until source stage ownership is corrected."],
    });
  }

  return groups;
}

export function buildVendorNeutralImplementationTemplates({
  implementationPlan,
}: BuildVendorNeutralImplementationTemplatesInput): VendorNeutralImplementationTemplateModel {
  const stages = [...implementationPlan.stages].sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
  const templates = sortSteps(implementationPlan.steps).map((step) => {
    const stage = stages.find((candidate) => candidate.id === step.stageId);
    return createTemplate(step, stage, implementationPlan.verificationChecks, implementationPlan.rollbackActions);
  });
  const groups = buildTemplateGroups(stages, templates);
  const variables = createTemplateVariables();
  const blockedTemplates = templates.filter((template) => template.readiness === "blocked");
  const reviewTemplates = templates.filter((template) => template.readiness === "review");
  const readyTemplates = templates.filter((template) => template.readiness === "ready");
  const highRiskTemplates = templates.filter((template) => template.riskLevel === "high");
  const verificationLinkedTemplates = templates.filter((template) => template.linkedVerificationCheckIds.length > 0);
  const rollbackLinkedTemplates = templates.filter((template) => template.linkedRollbackActionIds.length > 0);

  return {
    summary: {
      source: "backend-implementation-plan",
      templateCount: templates.length,
      groupCount: groups.length,
      variableCount: variables.length,
      readyTemplateCount: readyTemplates.length,
      reviewTemplateCount: reviewTemplates.length,
      blockedTemplateCount: blockedTemplates.length,
      highRiskTemplateCount: highRiskTemplates.length,
      verificationLinkedTemplateCount: verificationLinkedTemplates.length,
      rollbackLinkedTemplateCount: rollbackLinkedTemplates.length,
      vendorSpecificCommandCount: 0,
      commandGenerationAllowed: false,
      templateReadiness: blockedTemplates.length > 0 ? "blocked" : reviewTemplates.length > 0 ? "review" : "ready",
      notes: [
        VENDOR_NEUTRAL_SAFETY_NOTICE,
        "Templates are compiled from backend implementationPlan steps, verificationChecks, rollbackActions, dependencies, blast radius, and readiness gates.",
        "No template is allowed to contain platform-specific command syntax in V1.",
      ],
    },
    safetyNotice: VENDOR_NEUTRAL_SAFETY_NOTICE,
    groups,
    variables,
    templates,
    proofBoundary: [
      "Modeled: implementation step intent, category, readiness, target object, dependencies, verification checks, rollback actions, and blast radius from the backend implementation plan.",
      "Inferred: neutral action language and template grouping from backend step category and stage metadata.",
      "Proposed: human-readable execution templates that help an engineer prepare a change without generating vendor CLI syntax.",
      "Not proven: live-device state, vendor command syntax, final platform compatibility, cabling, provider behavior, and production change success.",
      "Engineer review: required for every blocked, review, high-risk, or vendor-specific implementation decision.",
    ],
  };
}
