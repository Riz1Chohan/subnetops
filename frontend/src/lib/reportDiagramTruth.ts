import type {
  DesignCoreSnapshot,
  DesignCoreIssue,
  ImplementationPlanModel,
  ImplementationPlanRollbackAction,
  ImplementationPlanStep,
  ImplementationPlanVerificationCheck,
  RoutingSegmentationReachabilityFinding,
  SecurityFlowRequirement,
  BackendDiagramRenderModel,
} from "./designCoreSnapshot";

export type TruthReadiness = "ready" | "review" | "blocked" | "unknown";

export interface TruthFinding {
  title: string;
  detail: string;
  severity: "ERROR" | "WARNING" | "INFO";
  source: "design-graph" | "routing" | "security" | "implementation" | "validation";
}

export interface ReportTruthModel {
  overallReadiness: TruthReadiness;
  overallReadinessLabel: string;
  summary: {
    deviceCount: number;
    linkCount: number;
    routeDomainCount: number;
    securityZoneCount: number;
    routeIntentCount: number;
    securityFlowCount: number;
    implementationStepCount: number;
    blockedImplementationStepCount: number;
    blockedVerificationCheckCount: number;
  };
  readiness: {
    routing: TruthReadiness;
    security: TruthReadiness;
    nat: TruthReadiness;
    implementation: TruthReadiness;
  };
  blockedFindings: TruthFinding[];
  reviewFindings: TruthFinding[];
  topImplementationSteps: ImplementationPlanStep[];
  verificationChecks: ImplementationPlanVerificationCheck[];
  verificationChecksByType: {
    checkType: string;
    totalCount: number;
    blockedCount: number;
    reviewCount: number;
    readyCount: number;
  }[];
  rollbackActions: ImplementationPlanRollbackAction[];
  limitations: string[];
}

export interface DiagramTruthHotspot {
  title: string;
  detail: string;
  readiness: TruthReadiness;
  scopeLabel: string;
}

export interface DiagramTruthOverlaySummary {
  key: "addressing" | "routing" | "security" | "nat" | "implementation" | "verification" | "operational-safety";
  label: string;
  readiness: TruthReadiness;
  detail: string;
  count: number;
}

export interface DiagramTruthModel {
  overallReadiness: TruthReadiness;
  hasModeledTopology: boolean;
  emptyStateReason?: string;
  topologySummary: {
    siteCount: number;
    deviceCount: number;
    interfaceCount: number;
    linkCount: number;
    routeDomainCount: number;
    securityZoneCount: number;
  };
  overlaySummaries: DiagramTruthOverlaySummary[];
  hotspots: DiagramTruthHotspot[];
  renderModel?: BackendDiagramRenderModel;
}

function normalizeReadiness(value: string | undefined | null): TruthReadiness {
  if (value === "ready" || value === "review" || value === "blocked") return value;
  return "unknown";
}

function rollupReadiness(values: TruthReadiness[]): TruthReadiness {
  if (values.includes("blocked")) return "blocked";
  if (values.includes("review")) return "review";
  if (values.includes("ready")) return "ready";
  return "unknown";
}

function readinessLabel(readiness: TruthReadiness) {
  if (readiness === "blocked") return "Blocked";
  if (readiness === "review") return "Review required";
  if (readiness === "ready") return "Ready";
  return "Unknown";
}

function pushFinding(target: TruthFinding[], finding: TruthFinding, limit = 10) {
  if (target.length < limit) target.push(finding);
}

function compareStepPriority(left: ImplementationPlanStep, right: ImplementationPlanStep) {
  const readinessRank: Record<ImplementationPlanStep["readiness"], number> = {
    blocked: 0,
    review: 1,
    deferred: 2,
    ready: 3,
  };
  const riskRank: Record<ImplementationPlanStep["riskLevel"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  const readinessDelta = readinessRank[left.readiness] - readinessRank[right.readiness];
  if (readinessDelta !== 0) return readinessDelta;
  const riskDelta = riskRank[left.riskLevel] - riskRank[right.riskLevel];
  if (riskDelta !== 0) return riskDelta;
  return left.sequence - right.sequence;
}

function compareVerificationPriority(left: ImplementationPlanVerificationCheck, right: ImplementationPlanVerificationCheck) {
  const readinessRank: Record<ImplementationPlanVerificationCheck["readiness"], number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };
  const delta = readinessRank[left.readiness] - readinessRank[right.readiness];
  if (delta !== 0) return delta;
  return left.name.localeCompare(right.name);
}

function summarizeVerificationByType(checks: ImplementationPlanVerificationCheck[]) {
  const grouped = new Map<string, { checkType: string; totalCount: number; blockedCount: number; reviewCount: number; readyCount: number }>();
  for (const check of checks) {
    const current = grouped.get(check.checkType) ?? {
      checkType: check.checkType,
      totalCount: 0,
      blockedCount: 0,
      reviewCount: 0,
      readyCount: 0,
    };
    current.totalCount += 1;
    if (check.readiness === "blocked") current.blockedCount += 1;
    else if (check.readiness === "review") current.reviewCount += 1;
    else current.readyCount += 1;
    grouped.set(check.checkType, current);
  }
  return Array.from(grouped.values()).sort((left, right) => {
    if (left.blockedCount !== right.blockedCount) return right.blockedCount - left.blockedCount;
    if (left.reviewCount !== right.reviewCount) return right.reviewCount - left.reviewCount;
    return left.checkType.localeCompare(right.checkType);
  });
}

function collectSecurityHotspots(flowRequirements: SecurityFlowRequirement[]) {
  return flowRequirements
    .filter((flow) => flow.state !== "satisfied")
    .slice(0, 6)
    .map<DiagramTruthHotspot>((flow) => ({
      title: flow.name,
      detail: `${flow.sourceZoneName} → ${flow.destinationZoneName} is ${flow.state.replace(/-/g, " ")}${flow.natRequired ? " and NAT is required" : ""}.`,
      readiness: flow.state === "conflict" || flow.state === "missing-policy" || flow.state === "missing-nat" ? "blocked" : "review",
      scopeLabel: "Security flow",
    }));
}

function collectRoutingHotspots(findings: RoutingSegmentationReachabilityFinding[]) {
  return findings.slice(0, 6).map<DiagramTruthHotspot>((finding) => ({
    title: finding.title,
    detail: finding.detail,
    readiness: finding.severity === "ERROR" ? "blocked" : finding.severity === "WARNING" ? "review" : "ready",
    scopeLabel: finding.routeDomainId ? `Route domain ${finding.routeDomainId}` : "Routing",
  }));
}

function collectImplementationHotspots(plan: ImplementationPlanModel) {
  return plan.steps
    .filter((step) => step.readiness === "blocked" || step.readiness === "review")
    .sort(compareStepPriority)
    .slice(0, 6)
    .map<DiagramTruthHotspot>((step) => ({
      title: step.title,
      detail: step.blockers[0] ?? step.readinessReasons[0] ?? step.expectedOutcome,
      readiness: step.readiness === "blocked" ? "blocked" : "review",
      scopeLabel: step.targetObjectType,
    }));
}

export function buildReportTruthModel(designCore: DesignCoreSnapshot | undefined): ReportTruthModel {
  if (designCore?.reportTruth) {
    return {
      overallReadiness: designCore.reportTruth.overallReadiness,
      overallReadinessLabel: designCore.reportTruth.overallReadinessLabel,
      summary: designCore.reportTruth.summary,
      readiness: designCore.reportTruth.readiness,
      blockedFindings: designCore.reportTruth.blockedFindings,
      reviewFindings: designCore.reportTruth.reviewFindings,
      topImplementationSteps: designCore.reportTruth.implementationReviewQueue,
      verificationChecks: designCore.reportTruth.verificationChecks,
      verificationChecksByType: designCore.reportTruth.verificationCoverage,
      rollbackActions: designCore.reportTruth.rollbackActions,
      limitations: designCore.reportTruth.limitations,
    };
  }

  const nom = designCore?.networkObjectModel;
  if (!designCore || !nom) {
    return {
      overallReadiness: "unknown",
      overallReadinessLabel: readinessLabel("unknown"),
      summary: { deviceCount: 0, linkCount: 0, routeDomainCount: 0, securityZoneCount: 0, routeIntentCount: 0, securityFlowCount: 0, implementationStepCount: 0, blockedImplementationStepCount: 0, blockedVerificationCheckCount: 0 },
      readiness: { routing: "unknown", security: "unknown", nat: "unknown", implementation: "unknown" },
      blockedFindings: [],
      reviewFindings: [],
      topImplementationSteps: [],
      verificationChecks: [],
      verificationChecksByType: [],
      rollbackActions: [],
      limitations: ["Backend authoritative design truth is not available for this project yet."],
    };
  }

  const routingReadiness = rollupReadiness([normalizeReadiness(nom.routingSegmentation.summary.routingReadiness), normalizeReadiness(nom.routingSegmentation.summary.segmentationReadiness)]);
  const securityReadiness = normalizeReadiness(nom.securityPolicyFlow.summary.policyReadiness);
  const natReadiness = normalizeReadiness(nom.securityPolicyFlow.summary.natReadiness);
  const implementationReadiness = normalizeReadiness(nom.implementationPlan.summary.implementationReadiness);
  const overallReadiness = rollupReadiness([routingReadiness, securityReadiness, natReadiness, implementationReadiness]);
  const blockedFindings: TruthFinding[] = [];
  const reviewFindings: TruthFinding[] = [];

  for (const finding of nom.designGraph.integrityFindings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) pushFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "design-graph" });
  }
  for (const finding of nom.routingSegmentation.reachabilityFindings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) pushFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "routing" });
  }
  for (const finding of nom.securityPolicyFlow.findings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) pushFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "security" });
  }
  for (const finding of nom.implementationPlan.findings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) pushFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "implementation" });
  }

  const limitations = [
    ...nom.integrityNotes,
    ...designCore.issues.filter((issue: DesignCoreIssue) => issue.severity !== "INFO").slice(0, 6).map((issue) => `${issue.title}: ${issue.detail}`),
  ];
  if (!designCore.summary.readyForBackendAuthority) limitations.unshift("The design core summary is not yet fully ready for backend-authoritative trust. Review blockers before implementation.");

  return {
    overallReadiness,
    overallReadinessLabel: readinessLabel(overallReadiness),
    summary: { deviceCount: nom.devices.length, linkCount: nom.links.length, routeDomainCount: nom.routeDomains.length, securityZoneCount: nom.securityZones.length, routeIntentCount: nom.routingSegmentation.routeIntents.length, securityFlowCount: nom.securityPolicyFlow.flowRequirements.length, implementationStepCount: nom.implementationPlan.steps.length, blockedImplementationStepCount: nom.implementationPlan.summary.blockedStepCount, blockedVerificationCheckCount: nom.implementationPlan.summary.blockedVerificationCheckCount },
    readiness: { routing: routingReadiness, security: securityReadiness, nat: natReadiness, implementation: implementationReadiness },
    blockedFindings,
    reviewFindings,
    topImplementationSteps: [...nom.implementationPlan.steps].sort(compareStepPriority).slice(0, 12),
    verificationChecks: [...nom.implementationPlan.verificationChecks].sort(compareVerificationPriority).slice(0, 16),
    verificationChecksByType: summarizeVerificationByType(nom.implementationPlan.verificationChecks),
    rollbackActions: nom.implementationPlan.rollbackActions.slice(0, 12),
    limitations: limitations.length > 0 ? limitations.slice(0, 12) : ["No additional limitations were recorded by the backend truth model."],
  };
}

export function buildDiagramTruthModel(designCore: DesignCoreSnapshot | undefined): DiagramTruthModel {
  if (designCore?.diagramTruth) {
    return {
      overallReadiness: designCore.diagramTruth.overallReadiness,
      hasModeledTopology: designCore.diagramTruth.hasModeledTopology,
      emptyStateReason: designCore.diagramTruth.emptyStateReason,
      topologySummary: designCore.diagramTruth.topologySummary,
      overlaySummaries: designCore.diagramTruth.overlaySummaries,
      hotspots: designCore.diagramTruth.hotspots,
      renderModel: designCore.diagramTruth.renderModel,
    };
  }

  const nom = designCore?.networkObjectModel;
  if (!designCore || !nom) {
    return { overallReadiness: "unknown", hasModeledTopology: false, emptyStateReason: "Diagram truth is unavailable because backend authoritative design data has not been loaded.", topologySummary: { siteCount: 0, deviceCount: 0, interfaceCount: 0, linkCount: 0, routeDomainCount: 0, securityZoneCount: 0 }, overlaySummaries: [], hotspots: [] };
  }

  const routingReadiness = rollupReadiness([normalizeReadiness(nom.routingSegmentation.summary.routingReadiness), normalizeReadiness(nom.routingSegmentation.summary.segmentationReadiness)]);
  const securityReadiness = normalizeReadiness(nom.securityPolicyFlow.summary.policyReadiness);
  const natReadiness = normalizeReadiness(nom.securityPolicyFlow.summary.natReadiness);
  const implementationReadiness = normalizeReadiness(nom.implementationPlan.summary.implementationReadiness);
  const hasModeledTopology = nom.devices.length > 0 || nom.interfaces.length > 0 || nom.links.length > 0;
  const missingTopologyInputs = [
    designCore.summary.siteCount <= 0 ? "materialized Site rows" : null,
    designCore.summary.validSubnetCount <= 0 ? "VLAN/addressing rows from the allocator" : null,
    nom.devices.length <= 0 ? "modeled network devices" : null,
    nom.interfaces.length <= 0 ? "modeled network interfaces" : null,
    nom.links.length <= 0 ? "modeled network links or WAN/site relationships" : null,
  ].filter(Boolean);
  const emptyStateReason = hasModeledTopology
    ? undefined
    : `Diagram blocked because backend authoritative topology is missing: ${missingTopologyInputs.join(", ")}. Fix requirement materialization and design-core topology generation before treating the diagram as usable.`;
  const overlaySummaries: DiagramTruthOverlaySummary[] = [
    { key: "addressing", label: "Addressing", readiness: nom.summary.orphanedAddressRowCount > 0 ? "review" : "ready", detail: nom.summary.orphanedAddressRowCount > 0 ? `${nom.summary.orphanedAddressRowCount} addressing row(s) are not fully anchored to modeled objects.` : "Addressing rows are anchored to modeled network objects.", count: designCore.summary.validSubnetCount },
    { key: "routing", label: "Routing", readiness: routingReadiness, detail: `${nom.routingSegmentation.summary.routeIntentCount} route intents, ${nom.routingSegmentation.summary.reachabilityFindingCount} reachability finding(s), ${nom.routingSegmentation.summary.nextHopReviewCount} next-hop review item(s).`, count: nom.routingSegmentation.summary.routeIntentCount },
    { key: "security", label: "Security", readiness: securityReadiness, detail: `${nom.securityPolicyFlow.summary.flowRequirementCount} required flows, ${nom.securityPolicyFlow.summary.missingPolicyCount} missing-policy finding(s), ${nom.securityPolicyFlow.summary.conflictingPolicyCount} conflict(s).`, count: nom.securityPolicyFlow.summary.flowRequirementCount },
    { key: "nat", label: "NAT", readiness: natReadiness, detail: `${nom.securityPolicyFlow.summary.natReviewCount} NAT review row(s), ${nom.securityPolicyFlow.summary.missingNatCount} missing NAT coverage finding(s).`, count: nom.securityPolicyFlow.summary.natReviewCount },
    { key: "implementation", label: "Implementation", readiness: implementationReadiness, detail: `${nom.implementationPlan.summary.stepCount} implementation step(s), ${nom.implementationPlan.summary.blockedStepCount} blocked, ${nom.implementationPlan.summary.reviewStepCount} review-required.`, count: nom.implementationPlan.summary.stepCount },
    { key: "verification", label: "Verification", readiness: nom.implementationPlan.summary.blockedVerificationCheckCount > 0 ? "blocked" : nom.implementationPlan.summary.verificationCheckCount > 0 ? "review" : "unknown", detail: `${nom.implementationPlan.summary.verificationCheckCount} verification check(s), ${nom.implementationPlan.summary.blockedVerificationCheckCount} blocked.`, count: nom.implementationPlan.summary.verificationCheckCount },
    { key: "operational-safety", label: "Operational safety", readiness: nom.implementationPlan.summary.operationalSafetyBlockedGateCount > 0 ? "blocked" : nom.implementationPlan.summary.operationalSafetyGateCount > 0 ? "review" : "unknown", detail: `${nom.implementationPlan.summary.operationalSafetyGateCount} safety gate(s), ${nom.implementationPlan.summary.operationalSafetyBlockedGateCount} blocked gate(s).`, count: nom.implementationPlan.summary.operationalSafetyGateCount },
  ];
  const hotspots = [...collectImplementationHotspots(nom.implementationPlan), ...collectRoutingHotspots(nom.routingSegmentation.reachabilityFindings), ...collectSecurityHotspots(nom.securityPolicyFlow.flowRequirements)].slice(0, 12);
  const overallReadiness = rollupReadiness(overlaySummaries.map((item) => item.readiness));
  return { overallReadiness, hasModeledTopology, emptyStateReason, topologySummary: { siteCount: designCore.summary.siteCount, deviceCount: nom.devices.length, interfaceCount: nom.interfaces.length, linkCount: nom.links.length, routeDomainCount: nom.routeDomains.length, securityZoneCount: nom.securityZones.length }, overlaySummaries, hotspots };
}

export function truthBadgeClass(readiness: TruthReadiness | "deferred" | string) {
  const normalized = String(readiness ?? "").toLowerCase();
  if (normalized === "blocked") return "badge badge-error";
  if (normalized === "review" || normalized === "review_required") return "badge badge-warning";
  if (normalized === "ready") return "badge badge-info";
  return "badge badge-soft";
}
