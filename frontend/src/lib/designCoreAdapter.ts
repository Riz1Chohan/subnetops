import type {
  AddressingPlanRow,
  CutoverChecklistItem,
  ImplementationStagePlan,
  ImplementationPlanSummary,
  ImplementationRiskItem,
  RollbackPlanItem,
  RoutePlanItem,
  SecurityPolicyMatrixRow,
  SecurityZonePlan,
  SegmentationReviewItem,
  SynthesizedLogicalDesign,
  TrafficFlowPath,
  ValidationTestPlanItem,
} from "./designSynthesis.types";
import type {
  DesignCoreAddressRow,
  DesignCoreSnapshot,
  ImplementationPlanModel,
  ImplementationPlanStep,
  RouteDomainRoutingTable,
  SecurityFlowRequirement,
  SecurityPolicyFinding,
  SecurityZone,
} from "./designCoreSnapshot";
import { buildBackendSnapshotViewModel } from "./backendSnapshotViewModel";

function effectiveSubnet(row: DesignCoreAddressRow) {
  return row.canonicalSubnetCidr || row.proposedSubnetCidr || row.sourceSubnetCidr;
}

function effectiveGateway(row: DesignCoreAddressRow) {
  return row.effectiveGatewayIp || row.proposedGatewayIp || row.sourceGatewayIp || "";
}

function toAddressingPlanRow(row: DesignCoreAddressRow): AddressingPlanRow {
  const subnetCidr = effectiveSubnet(row);
  const usableHosts = row.usableHosts ?? 0;
  const estimatedHosts = row.estimatedHosts ?? 0;
  const requiredUsableHosts = row.requiredUsableHosts ?? estimatedHosts;
  const utilizationDenominator = requiredUsableHosts > 0 ? requiredUsableHosts : usableHosts;
  const utilization = utilizationDenominator > 0 ? Math.min(1, estimatedHosts / utilizationDenominator) : 0;
  const headroom = typeof row.capacityHeadroom === "number"
    ? row.capacityHeadroom
    : requiredUsableHosts > 0
      ? usableHosts - requiredUsableHosts
      : Math.max(0, usableHosts - estimatedHosts);

  return {
    id: row.id,
    siteId: row.siteId,
    siteName: row.siteName,
    siteCode: row.siteCode || undefined,
    siteBlockCidr: row.siteBlockCidr || undefined,
    source: row.truthState === "configured" ? "configured" : "proposed",
    vlanId: row.vlanId,
    segmentName: row.vlanName,
    purpose: row.vlanName,
    role: row.role,
    roleLabel: row.role.replace(/_/g, " "),
    subnetCidr,
    configuredSubnetCidr: row.canonicalSubnetCidr || row.sourceSubnetCidr,
    proposedSubnetCidr: row.proposedSubnetCidr,
    mask: row.dottedMask || "",
    wildcardMask: row.wildcardMask,
    networkAddress: row.networkAddress,
    broadcastAddress: row.broadcastAddress,
    firstUsableIp: row.firstUsableIp,
    lastUsableIp: row.lastUsableIp,
    gatewayIp: effectiveGateway(row),
    sourceGatewayIp: row.sourceGatewayIp,
    proposedGatewayIp: row.proposedGatewayIp,
    gatewayState: row.gatewayState,
    gatewayConvention: row.gatewayConvention,
    dhcpEnabled: row.dhcpEnabled,
    totalAddresses: row.totalAddresses,
    usableHosts,
    estimatedHosts,
    requiredUsableHosts: row.requiredUsableHosts,
    recommendedUsableHosts: row.recommendedUsableHosts,
    recommendedPrefix: row.recommendedPrefix,
    bufferMultiplier: row.bufferMultiplier,
    capacityState: row.capacityState,
    capacityBasis: row.capacityBasis,
    roleSource: row.roleSource,
    roleConfidence: row.roleConfidence,
    roleEvidence: row.roleEvidence,
    capacityExplanation: row.capacityExplanation,
    allocatorExplanation: row.allocatorExplanation,
    allocatorParentCidr: row.allocatorParentCidr,
    allocatorUsedRangeCount: row.allocatorUsedRangeCount,
    allocatorFreeRangeCount: row.allocatorFreeRangeCount,
    allocatorLargestFreeRange: row.allocatorLargestFreeRange,
    allocatorUtilizationPercent: row.allocatorUtilizationPercent,
    allocatorCanFitRequestedPrefix: row.allocatorCanFitRequestedPrefix,
    addressFamily: (row.canonicalSubnetCidr ?? row.sourceSubnetCidr ?? row.proposedSubnetCidr ?? "").includes(":") ? "ipv6" : "ipv4",
    vrfName: "default",
    brownfieldEvidenceState: "import-required",
    dhcpScopeReview: row.dhcpEnabled ? "DHCP enabled; options, exclusions, and reservations require explicit review before implementation." : "No DHCP scope enabled for this row.",
    reservePolicyReview: "No durable reservation policy model is attached to this row yet.",
    approvalState: "review-required",
    allocationReason: row.allocationReason,
    engine1Explanation: row.engine1Explanation,
    headroom,
    utilization,
    insideSiteBlock: row.inSiteBlock,
    notes: [
      ...row.notes,
      row.capacityBasis ? `Capacity basis: ${row.capacityBasis}` : "",
      row.proposedSubnetCidr ? `Backend recommended subnet correction: ${row.proposedSubnetCidr}${row.proposedGatewayIp ? ` via ${row.proposedGatewayIp}` : ""}.` : "",
      row.allocatorParentCidr ? `Allocator proof: parent ${row.allocatorParentCidr}; used ranges ${row.allocatorUsedRangeCount ?? "—"}; free ranges ${row.allocatorFreeRangeCount ?? "—"}; largest free range ${row.allocatorLargestFreeRange ?? "—"}; utilization ${row.allocatorUtilizationPercent ?? "—"}%.` : "",
      "CIDR canonicalization, masks, usable ranges, capacity, gateway, and containment facts are backend design-core outputs; this adapter does not run browser-side subnet math.",
      row.truthState !== "configured" ? "Backend design-core proposal; engineer review required before implementation." : "Backend design-core checked configured input.",
    ].filter((note): note is string => Boolean(note)),
  };
}

function stepOwner(step: ImplementationPlanStep) {
  if (step.category === "operational-safety") return "Network operations / change owner";
  if (step.category.includes("security") || step.category === "nat") return "Security engineering";
  if (step.category === "routing" || step.category === "routed-interface") return "Network engineering";
  if (step.category === "dhcp") return "Network/services engineering";
  if (step.category === "documentation") return "Project owner";
  return "Network engineering";
}

function stepStage(step: ImplementationPlanStep): CutoverChecklistItem["stage"] {
  if (step.category === "preparation" || step.category === "operational-safety" || step.action === "review") return "pre-check";
  if (step.category === "verification" || step.action === "verify" || step.action === "document") return "post-check";
  return "cutover";
}

function backendImplementationPlanSummary(plan: ImplementationPlanModel, local: ImplementationPlanSummary): ImplementationPlanSummary {
  const orderedStages = [...plan.stages].sort((a, b) => a.sequence - b.sequence).map((stage) => stage.name).join(" → ");
  const readiness = plan.summary.implementationReadiness;
  return {
    ...local,
    rolloutStrategy: orderedStages ? `Backend design-core staged rollout: ${orderedStages}.` : local.rolloutStrategy,
    migrationStrategy: `Backend design-core has ${plan.summary.stepCount} implementation step${plan.summary.stepCount === 1 ? "" : "s"}: ${plan.summary.readyStepCount} ready, ${plan.summary.reviewStepCount} review, ${plan.summary.blockedStepCount} blocked, ${plan.summary.deferredStepCount} deferred, ${plan.summary.dependencyCount} dependency edge${plan.summary.dependencyCount === 1 ? "" : "s"}, ${plan.summary.graphDependencyEdgeCount ?? plan.dependencyGraph?.edgeCount ?? 0} graph dependency edge${(plan.summary.graphDependencyEdgeCount ?? plan.dependencyGraph?.edgeCount ?? 0) === 1 ? "" : "s"}, ${plan.summary.operationalSafetyGateCount ?? 0} operational safety gate${(plan.summary.operationalSafetyGateCount ?? 0) === 1 ? "" : "s"}, and ${plan.summary.preciseSecurityDependencyCount ?? plan.dependencyGraph?.preciseSecurityDependencyCount ?? 0} precise security/NAT dependenc${(plan.summary.preciseSecurityDependencyCount ?? plan.dependencyGraph?.preciseSecurityDependencyCount ?? 0) === 1 ? "y" : "ies"}.`,
    downtimePosture: readiness === "blocked" ? `Blocked until backend design-core findings and operational safety gates are resolved; ${plan.summary.operationalSafetyBlockedGateCount ?? 0} safety gate${(plan.summary.operationalSafetyBlockedGateCount ?? 0) === 1 ? " is" : "s are"} blocked.` : readiness === "review" ? "Review required before scheduling production change windows, including device management/backup/rollback readiness." : "Ready for engineer-reviewed scheduling based on backend design-core steps and operational safety gates.",
    validationApproach: `${plan.summary.verificationCheckCount} backend verification matrix check${plan.summary.verificationCheckCount === 1 ? "" : "s"} must produce evidence before handoff; ${plan.summary.objectLevelVerificationCheckCount} object-level, ${plan.summary.routeLevelVerificationCheckCount} route-level, ${plan.summary.flowLevelVerificationCheckCount} flow-level, and ${plan.summary.rollbackVerificationCheckCount} rollback check${plan.summary.rollbackVerificationCheckCount === 1 ? "" : "s"} are generated by the backend.`,
    rollbackPosture: `${plan.summary.rollbackActionCount} backend rollback action${plan.summary.rollbackActionCount === 1 ? "" : "s"} defined from the implementation model; ${plan.summary.stepWithRollbackIntentCount} step${plan.summary.stepWithRollbackIntentCount === 1 ? "" : "s"} include step-level rollback intent.`,
    teamExecutionModel: "Frontend displays the backend design-core plan; engineering owners execute and validate the change.",
    timelineGuidance: "Sequence is controlled by backend stage and step order. Exact maintenance windows remain an implementation decision.",
    handoffPackage: "Backend design-core implementation steps, operational safety gates, graph-driven dependencies, dependency object IDs, blast radius, required evidence, acceptance criteria, rollback actions, findings, and report export.",
  };
}

function backendImplementationStages(plan: ImplementationPlanModel, local: ImplementationStagePlan[]): ImplementationStagePlan[] {
  if (plan.stages.length === 0) return local;
  const stepsByStage = new Map<string, ImplementationPlanStep[]>();
  for (const step of plan.steps) {
    stepsByStage.set(step.stageId, [...(stepsByStage.get(step.stageId) ?? []), step]);
  }
  return [...plan.stages]
    .sort((a, b) => a.sequence - b.sequence)
    .map((stage) => {
      const steps = (stepsByStage.get(stage.id) ?? []).sort((a, b) => a.sequence - b.sequence);
      const blockers = steps.filter((step) => step.readiness === "blocked").length;
      const reviews = steps.filter((step) => step.readiness === "review" || step.engineerReviewRequired).length;
      return {
        stage: `${stage.sequence}. ${stage.name}`,
        objective: stage.objective,
        scope: steps.length > 0 ? `${steps.length} backend-modeled step${steps.length === 1 ? "" : "s"}; ${blockers} blocked; ${reviews} review-required.` : "No backend implementation steps attached to this stage yet.",
        dependencies: steps.flatMap((step) => step.dependencies.map((dependency) => dependency.reason)).slice(0, 6),
        successCriteria: stage.exitCriteria.length > 0 ? stage.exitCriteria : steps.map((step) => step.expectedOutcome).slice(0, 5),
      };
    });
}

function backendCutoverChecklist(plan: ImplementationPlanModel, local: CutoverChecklistItem[]): CutoverChecklistItem[] {
  if (plan.steps.length === 0) return local;
  return [...plan.steps]
    .sort((a, b) => a.sequence - b.sequence)
    .map((step) => ({
      stage: stepStage(step),
      item: step.title,
      owner: stepOwner(step),
      rationale: `${step.implementationIntent} Evidence: ${(step.requiredEvidence ?? []).slice(0, 2).join(" ") || step.expectedOutcome} Blast radius: ${(step.blastRadius ?? []).slice(0, 2).join(" ") || "Not modeled."} Dependency objects: ${(step.dependencyObjectIds ?? []).slice(0, 4).join(", ") || "backend graph gate only."}`,
    }));
}

function backendRollbackPlan(plan: ImplementationPlanModel, local: RollbackPlanItem[]): RollbackPlanItem[] {
  if (plan.rollbackActions.length === 0) return local;
  return plan.rollbackActions.map((rollback) => ({
    trigger: rollback.triggerCondition,
    action: rollback.rollbackIntent,
    scope: rollback.name,
  }));
}

function backendValidationPlan(plan: ImplementationPlanModel, local: ValidationTestPlanItem[]): ValidationTestPlanItem[] {
  if (plan.verificationChecks.length === 0) return local;
  return plan.verificationChecks.map((check) => ({
    stage: `${check.checkType} / ${check.verificationScope}`,
    test: check.name,
    expectedOutcome: check.expectedResult,
    evidence: [
      `Readiness: ${check.readiness}.`,
      check.blockingStepIds.length ? `Blocking steps: ${check.blockingStepIds.join(", ")}.` : "No blocking verification step dependency.",
      check.requiredEvidence.length ? `Required evidence: ${check.requiredEvidence.join(" | ")}.` : "Required evidence not supplied by backend.",
      check.acceptanceCriteria.length ? `Acceptance: ${check.acceptanceCriteria.join(" | ")}.` : "Acceptance criteria not supplied by backend.",
      `Failure impact: ${check.failureImpact}`,
      check.notes.length ? `Notes: ${check.notes.join(" ")}` : "",
    ].filter(Boolean).join(" "),
  }));
}

function backendImplementationRisks(plan: ImplementationPlanModel, local: ImplementationRiskItem[]): ImplementationRiskItem[] {
  const findingRisks = plan.findings.map((finding) => ({
    severity: finding.severity === "ERROR" ? "critical" as const : finding.severity === "WARNING" ? "warning" as const : "info" as const,
    title: finding.title,
    mitigation: finding.remediation || finding.detail,
    owner: "Engineering owner",
  }));
  const blockedSteps = plan.steps
    .filter((step) => step.readiness === "blocked" || step.riskLevel === "high")
    .slice(0, 8)
    .map((step) => ({
      severity: step.readiness === "blocked" ? "critical" as const : "warning" as const,
      title: step.title,
      mitigation: (step.blockers ?? []).join(" ") || (step.readinessReasons ?? []).join(" ") || step.rollbackIntent || step.expectedOutcome,
      owner: stepOwner(step),
    }));
  return findingRisks.length || blockedSteps.length ? [...findingRisks, ...blockedSteps] : local;
}

function backendRoutingPlan(routeTables: RouteDomainRoutingTable[], local: RoutePlanItem[]): RoutePlanItem[] {
  if (routeTables.length === 0) return local;
  return routeTables.map((table) => {
    const connected = table.routeIntents.filter((route) => route.routeKind === "connected");
    const summaries = table.routeIntents.filter((route) => route.routeKind === "summary").map((route) => route.destinationCidr);
    const siteNames = Array.from(new Set(table.routeIntents.map((route) => route.siteId ? route.siteId : "project")));
    return {
      siteId: table.routeDomainId,
      siteName: table.routeDomainName,
      siteBlockCidr: connected[0]?.destinationCidr,
      summaryAdvertisement: summaries.join(", ") || undefined,
      localSegmentCount: connected.length,
      localAddressCount: connected.length,
      transitAdjacencyCount: table.staticRouteCount + table.defaultRouteCount,
      notes: [
        ...table.notes,
        `${table.connectedRouteCount} connected, ${table.defaultRouteCount} default, ${table.staticRouteCount} static, ${table.summaryRouteCount} summary, ${table.missingRouteCount} missing route intent(s).`,
        `Backend route-domain scope: ${siteNames.join(", ")}.`,
      ],
    };
  });
}

function backendSecurityZones(zones: SecurityZone[], local: SecurityZonePlan[]): SecurityZonePlan[] {
  if (zones.length === 0) return local;
  return zones.map((zone) => ({
    zoneName: zone.name,
    zoneType: zone.zoneRole === "management" ? "management" : zone.zoneRole === "dmz" ? "service" : zone.zoneRole === "guest" || zone.zoneRole === "wan" ? "untrusted" : zone.zoneRole === "transit" ? "transit" : "restricted",
    segments: zone.subnetCidrs.length ? zone.subnetCidrs : zone.vlanIds.map((vlanId) => `VLAN ${vlanId}`),
    trustLevel: zone.isolationExpectation,
    enforcement: `Backend security-zone object ${zone.id} in route domain ${zone.routeDomainId}.`,
    northSouthPolicy: zone.isolationExpectation === "open" ? "Allow only reviewed north/south services." : "Default review/deny posture unless policy permits.",
    eastWestPolicy: zone.isolationExpectation === "isolated" || zone.isolationExpectation === "restricted" ? "Restrict east-west access by policy." : "Review east-west access before implementation.",
    identityControl: "Engineer review required before production enforcement.",
    monitoringExpectation: "Log policy decisions and validate after cutover.",
    notes: zone.notes,
  }));
}

function backendSecurityMatrix(flows: SecurityFlowRequirement[], local: SecurityPolicyMatrixRow[]): SecurityPolicyMatrixRow[] {
  if (flows.length === 0) return local;
  return flows.map((flow) => ({
    sourceZone: flow.sourceZoneName,
    targetZone: flow.destinationZoneName,
    defaultAction: flow.expectedAction,
    allowedFlows: flow.serviceNames.join(", ") || "review required",
    controlPoint: flow.matchedPolicyRuleIds.length ? `Policy ${flow.matchedPolicyRuleIds.join(", ")}` : "Policy missing or pending review",
    notes: [
      flow.rationale,
      `Backend state: ${flow.state}. NAT ${flow.natRequired ? "required" : "not required"}; matched NAT rules: ${flow.matchedNatRuleIds.join(", ") || "none"}.`,
      ...flow.notes,
    ],
  }));
}

function backendTrafficFlows(flows: SecurityFlowRequirement[], local: TrafficFlowPath[]): TrafficFlowPath[] {
  if (flows.length === 0) return local;
  return flows.map((flow) => ({
    id: flow.id,
    flowName: flow.name,
    flowLabel: flow.name,
    flowCategory: flow.destinationZoneName.toLowerCase().includes("dmz") ? "internet-dmz" : flow.sourceZoneName.toLowerCase().includes("guest") ? "guest-internet" : "user-local-service",
    source: flow.sourceZoneName,
    destination: flow.destinationZoneName,
    sourceZone: flow.sourceZoneName,
    destinationZone: flow.destinationZoneName,
    path: [flow.sourceZoneName, flow.matchedPolicyRuleIds.length ? `policy ${flow.matchedPolicyRuleIds.join(",")}` : "policy review", flow.destinationZoneName],
    controlPoints: flow.matchedPolicyRuleIds.length ? flow.matchedPolicyRuleIds : ["policy review"],
    routeModel: "Backend design-core security-flow requirement; route path must be verified by routing model.",
    natBehavior: flow.natRequired ? (flow.matchedNatRuleIds.length ? `NAT matched: ${flow.matchedNatRuleIds.join(", ")}` : "NAT required but not matched") : "NAT not required",
    enforcementPolicy: `${flow.expectedAction}; backend state ${flow.state}`,
    policyNotes: [flow.rationale, ...flow.notes],
  }));
}

function backendSegmentationReview(findings: SecurityPolicyFinding[], local: SegmentationReviewItem[]): SegmentationReviewItem[] {
  if (findings.length === 0) return local;
  return findings.map((finding) => ({
    severity: finding.severity === "ERROR" ? "critical" : finding.severity === "WARNING" ? "warning" : "info",
    title: finding.title,
    detail: `${finding.detail} ${finding.remediation}`,
    affected: finding.affectedObjectIds,
  }));
}

export function applyDesignCoreSnapshotToDisplayDesign(
  localDesign: SynthesizedLogicalDesign,
  snapshot?: DesignCoreSnapshot | null,
): SynthesizedLogicalDesign {
  if (!snapshot) return localDesign;

  const backendCheckedAddressingPlan = snapshot.addressingRows
    .map(toAddressingPlanRow)
    .filter((row) => row.subnetCidr);

  const implementationPlan = snapshot.networkObjectModel?.implementationPlan;
  const routingSegmentation = snapshot.networkObjectModel?.routingSegmentation;
  const securityPolicyFlow = snapshot.networkObjectModel?.securityPolicyFlow;
  const securityZones = snapshot.networkObjectModel?.securityZones;

  const backendRoutingPlanRows = routingSegmentation ? backendRoutingPlan(routingSegmentation.routeTables, localDesign.routingPlan) : localDesign.routingPlan;
  const backendSecurityZoneRows = securityZones ? backendSecurityZones(securityZones, localDesign.securityZones) : localDesign.securityZones;
  const backendPolicyMatrixRows = securityPolicyFlow ? backendSecurityMatrix(securityPolicyFlow.flowRequirements, localDesign.securityPolicyMatrix) : localDesign.securityPolicyMatrix;
  const backendTrafficFlowRows = securityPolicyFlow ? backendTrafficFlows(securityPolicyFlow.flowRequirements, localDesign.trafficFlows) : localDesign.trafficFlows;
  const backendSecurityFindings = securityPolicyFlow ? backendSegmentationReview(securityPolicyFlow.findings, localDesign.segmentationReview) : localDesign.segmentationReview;
  const backendViewModel = buildBackendSnapshotViewModel(snapshot, backendCheckedAddressingPlan);

  const organizationCapacity = snapshot.organizationBlock?.totalAddresses ?? localDesign.organizationHierarchy.organizationCapacity;
  const allocatedSiteAddresses = snapshot.siteBlocks.reduce((sum, site) => sum + (site.totalAddresses ?? 0), 0);
  const plannedSiteDemandAddresses = backendCheckedAddressingPlan.reduce((sum, row) => sum + (row.totalAddresses ?? row.usableHosts), 0);
  const organizationHeadroom = organizationCapacity > 0 ? Math.max(0, organizationCapacity - allocatedSiteAddresses) : 0;

  return {
    ...localDesign,
    ...backendViewModel,
    organizationBlock: snapshot.organizationBlock?.canonicalCidr || localDesign.organizationBlock,
    organizationBlockAssumed: snapshot.organizationBlock?.validationState === "missing" || localDesign.organizationBlockAssumed,
    organizationHierarchy: {
      organizationCapacity,
      allocatedSiteAddresses,
      plannedSiteDemandAddresses,
      organizationHeadroom,
      organizationUtilization: organizationCapacity > 0 ? Math.min(1, allocatedSiteAddresses / organizationCapacity) : 0,
    },
    addressingPlan: backendCheckedAddressingPlan.length > 0 ? backendCheckedAddressingPlan : localDesign.addressingPlan,
    routingPlan: backendRoutingPlanRows,
    routePlan: backendRoutingPlanRows,
    securityZones: backendSecurityZoneRows,
    securityPolicyMatrix: backendPolicyMatrixRows,
    trafficFlows: backendTrafficFlowRows,
    trafficFlowModel: backendTrafficFlowRows,
    segmentationReview: backendSecurityFindings,
    implementationPlan: implementationPlan ? backendImplementationPlanSummary(implementationPlan, localDesign.implementationPlan) : localDesign.implementationPlan,
    implementationStages: implementationPlan ? backendImplementationStages(implementationPlan, localDesign.implementationStages) : localDesign.implementationStages,
    cutoverChecklist: implementationPlan ? backendCutoverChecklist(implementationPlan, localDesign.cutoverChecklist) : localDesign.cutoverChecklist,
    rollbackPlan: implementationPlan ? backendRollbackPlan(implementationPlan, localDesign.rollbackPlan) : localDesign.rollbackPlan,
    validationPlan: implementationPlan ? backendValidationPlan(implementationPlan, localDesign.validationPlan) : localDesign.validationPlan,
    implementationRisks: implementationPlan ? backendImplementationRisks(implementationPlan, localDesign.implementationRisks) : localDesign.implementationRisks,
    stats: {
      ...localDesign.stats,
      configuredSegments: snapshot.summary.validSubnetCount,
      proposedSegments: snapshot.summary.proposalCount,
      missingSiteBlocks: snapshot.siteBlocks.filter((item) => !item.canonicalCidr && !item.proposedCidr).length,
      rowsOutsideSiteBlocks: snapshot.addressingRows.filter((item) => item.inSiteBlock === false).length,
    },
    openIssues: snapshot.issues
      .filter((issue) => issue.severity !== "INFO")
      .map((issue) => `${issue.title}: ${issue.detail}`),
    designReview: [
      ...localDesign.designReview,
      {
        kind: snapshot.summary.readyForBackendAuthority ? "decision" : "risk",
        title: snapshot.summary.readyForBackendAuthority ? "Backend design-core snapshot is review-ready" : "Backend design-core snapshot has blockers",
        detail: `${snapshot.summary.validSubnetCount}/${snapshot.summary.vlanCount} subnet rows are valid in the backend design-core snapshot. Frontend is rendering backend authority only; no browser-side design synthesis or subnet math is used to fill missing fields.`,
      },
    ],
  };
}
