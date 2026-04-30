import type {
  BackendDiagramRenderEdge,
  BackendDiagramRenderGroup,
  BackendDiagramRenderModel,
  BackendDiagramRenderNode,
  BackendDiagramRenderOverlay,
  BackendDiagramTruthHotspot,
  BackendDiagramTruthModel,
  BackendDiagramTruthOverlaySummary,
  BackendReportTruthModel,
  BackendReportTruthVerificationSummary,
  BackendTruthFinding,
  DesignCoreIssue,
  DesignGraphNodeObjectType,
  DesignGraphRelationship,
  DesignTruthReadiness,
  ImplementationPlanStep,
  ImplementationPlanVerificationCheck,
  NetworkObjectModel,
  NetworkObjectTruthState,
} from "../designCore.types.js";

type SnapshotSummaryForTruth = {
  siteCount: number;
  validSubnetCount: number;
  readyForBackendAuthority: boolean;
};

type FindingRef = {
  id: string;
  severity: "ERROR" | "WARNING" | "INFO";
  affectedObjectIds: string[];
};

function normalizeReadiness(value: string | undefined | null): DesignTruthReadiness {
  return value === "ready" || value === "review" || value === "blocked" ? value : "unknown";
}

function rollupReadiness(values: DesignTruthReadiness[]): DesignTruthReadiness {
  if (values.includes("blocked")) return "blocked";
  if (values.includes("review")) return "review";
  if (values.includes("ready")) return "ready";
  return "unknown";
}

function readinessLabel(readiness: DesignTruthReadiness) {
  return readiness === "blocked" ? "Blocked" : readiness === "review" ? "Review required" : readiness === "ready" ? "Ready" : "Unknown";
}

function addFinding(target: BackendTruthFinding[], finding: BackendTruthFinding, limit = 12) {
  if (target.length < limit) target.push(finding);
}

function buildDiagramEmptyStateReason(summary: SnapshotSummaryForTruth, networkObjectModel: NetworkObjectModel) {
  const missing: string[] = [];

  if (summary.siteCount <= 0) missing.push("materialized Site rows");
  if (summary.validSubnetCount <= 0) missing.push("VLAN/addressing rows from the allocator");
  if (networkObjectModel.devices.length <= 0) missing.push("modeled network devices");
  if (networkObjectModel.interfaces.length <= 0) missing.push("modeled network interfaces");
  if (networkObjectModel.links.length <= 0) missing.push("modeled network links or WAN/site relationships");
  if (networkObjectModel.designGraph.edges.length <= 0) missing.push("backend design graph relationships");

  return {
    reason: `Diagram blocked because backend authoritative topology is missing: ${missing.join(", ")}. Fix requirement materialization and design-core topology generation before treating the diagram as usable.`,
    requiredInputs: missing.map((item) => `Generate ${item}`),
  };
}

function compareStepPriority(left: ImplementationPlanStep, right: ImplementationPlanStep) {
  const readinessRank: Record<ImplementationPlanStep["readiness"], number> = { blocked: 0, review: 1, deferred: 2, ready: 3 };
  const riskRank: Record<ImplementationPlanStep["riskLevel"], number> = { high: 0, medium: 1, low: 2 };
  return readinessRank[left.readiness] - readinessRank[right.readiness] || riskRank[left.riskLevel] - riskRank[right.riskLevel] || left.sequence - right.sequence;
}

function compareVerificationPriority(left: ImplementationPlanVerificationCheck, right: ImplementationPlanVerificationCheck) {
  const readinessRank: Record<ImplementationPlanVerificationCheck["readiness"], number> = { blocked: 0, review: 1, ready: 2 };
  return readinessRank[left.readiness] - readinessRank[right.readiness] || left.name.localeCompare(right.name);
}

function summarizeVerificationByType(checks: ImplementationPlanVerificationCheck[]): BackendReportTruthVerificationSummary[] {
  const grouped = new Map<string, BackendReportTruthVerificationSummary>();
  for (const check of checks) {
    const current = grouped.get(check.checkType) ?? { checkType: check.checkType, totalCount: 0, blockedCount: 0, reviewCount: 0, readyCount: 0 };
    current.totalCount += 1;
    if (check.readiness === "blocked") current.blockedCount += 1;
    else if (check.readiness === "review") current.reviewCount += 1;
    else current.readyCount += 1;
    grouped.set(check.checkType, current);
  }
  return Array.from(grouped.values()).sort((left, right) => right.blockedCount - left.blockedCount || right.reviewCount - left.reviewCount || left.checkType.localeCompare(right.checkType));
}

function collectFindingBuckets(networkObjectModel: NetworkObjectModel) {
  const blockedFindings: BackendTruthFinding[] = [];
  const reviewFindings: BackendTruthFinding[] = [];

  for (const finding of networkObjectModel.designGraph.integrityFindings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) addFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "design-graph" });
  }

  for (const finding of networkObjectModel.routingSegmentation.reachabilityFindings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) addFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "routing" });
  }

  for (const finding of networkObjectModel.securityPolicyFlow.findings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) addFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "security" });
  }

  for (const finding of networkObjectModel.implementationPlan.findings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) addFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "implementation" });
  }

  return { blockedFindings, reviewFindings };
}

function collectImplementationHotspots(networkObjectModel: NetworkObjectModel): BackendDiagramTruthHotspot[] {
  return networkObjectModel.implementationPlan.steps
    .filter((step) => step.readiness === "blocked" || step.readiness === "review")
    .sort(compareStepPriority)
    .slice(0, 6)
    .map((step) => ({
      title: step.title,
      detail: step.blockers[0] ?? step.readinessReasons[0] ?? step.expectedOutcome,
      readiness: step.readiness === "blocked" ? "blocked" : "review",
      scopeLabel: step.targetObjectType,
    }));
}

function collectRoutingHotspots(networkObjectModel: NetworkObjectModel): BackendDiagramTruthHotspot[] {
  return networkObjectModel.routingSegmentation.reachabilityFindings.slice(0, 6).map((finding) => ({
    title: finding.title,
    detail: finding.detail,
    readiness: finding.severity === "ERROR" ? "blocked" : finding.severity === "WARNING" ? "review" : "ready",
    scopeLabel: finding.routeDomainId ? `Route domain ${finding.routeDomainId}` : "Routing",
  }));
}

function collectSecurityHotspots(networkObjectModel: NetworkObjectModel): BackendDiagramTruthHotspot[] {
  return networkObjectModel.securityPolicyFlow.flowRequirements
    .filter((flow) => flow.state !== "satisfied")
    .slice(0, 6)
    .map((flow) => ({
      title: flow.name,
      detail: `${flow.sourceZoneName} → ${flow.destinationZoneName} is ${flow.state.replace(/-/g, " ")}${flow.natRequired ? " and NAT is required" : ""}.`,
      readiness: flow.state === "conflict" || flow.state === "missing-policy" || flow.state === "missing-nat" ? "blocked" : "review",
      scopeLabel: "Security flow",
    }));
}

function collectFindingRefs(networkObjectModel: NetworkObjectModel): FindingRef[] {
  return [
    ...networkObjectModel.designGraph.integrityFindings.map((finding, index) => ({ id: `graph-${index}-${finding.code}`, severity: finding.severity, affectedObjectIds: finding.affectedObjectIds })),
    ...networkObjectModel.routingSegmentation.reachabilityFindings.map((finding, index) => ({ id: `routing-${index}-${finding.code}`, severity: finding.severity, affectedObjectIds: finding.affectedObjectIds })),
    ...networkObjectModel.securityPolicyFlow.findings.map((finding, index) => ({ id: `security-${index}-${finding.code}`, severity: finding.severity, affectedObjectIds: finding.affectedObjectIds })),
    ...networkObjectModel.implementationPlan.findings.map((finding, index) => ({ id: `implementation-${index}-${finding.code}`, severity: finding.severity, affectedObjectIds: finding.affectedStepIds })),
  ];
}

function readinessForObject(objectId: string, networkObjectModel: NetworkObjectModel, findingRefs: FindingRef[]): { readiness: DesignTruthReadiness; relatedFindingIds: string[] } {
  const findingMatches = findingRefs.filter((finding) => finding.affectedObjectIds.includes(objectId));
  const implementationMatches = networkObjectModel.implementationPlan.steps.filter((step) => step.targetObjectId === objectId || step.dependencyObjectIds.includes(objectId));
  const verificationMatches = networkObjectModel.implementationPlan.verificationChecks.filter((check) => check.relatedObjectIds.includes(objectId));

  const readiness = rollupReadiness([
    ...findingMatches.map((finding) => finding.severity === "ERROR" ? "blocked" as const : finding.severity === "WARNING" ? "review" as const : "ready" as const),
    ...implementationMatches.map((step) => normalizeReadiness(step.readiness)),
    ...verificationMatches.map((check) => normalizeReadiness(check.readiness)),
  ]);

  return {
    readiness: readiness === "unknown" ? "ready" : readiness,
    relatedFindingIds: findingMatches.map((finding) => finding.id),
  };
}

function layerForObjectType(objectType: DesignGraphNodeObjectType): BackendDiagramRenderNode["layer"] {
  if (objectType === "site" || objectType === "vlan" || objectType === "subnet") return "site";
  if (objectType === "network-device") return "device";
  if (objectType === "network-interface" || objectType === "network-link") return "interface";
  if (objectType === "route-domain" || objectType === "route-intent" || objectType === "segmentation-flow") return "routing";
  if (objectType === "security-zone" || objectType === "policy-rule" || objectType === "nat-rule" || objectType === "security-service" || objectType === "security-flow") return "security";
  if (objectType === "implementation-stage" || objectType === "implementation-step") return "implementation";
  return "verification";
}

function overlayKeysForRelationship(relationship: DesignGraphRelationship): BackendDiagramRenderEdge["overlayKeys"] {
  if (relationship.includes("route") || relationship.includes("segmentation")) return ["routing"];
  if (relationship.includes("security") || relationship.includes("policy")) return ["security"];
  if (relationship.includes("nat")) return ["nat"];
  if (relationship.includes("implementation")) return ["implementation"];
  if (relationship.includes("dhcp") || relationship.includes("subnet") || relationship.includes("vlan")) return ["addressing"];
  return ["addressing"];
}

function buildBackendDiagramRenderModel(networkObjectModel: NetworkObjectModel, overlaySummaries: BackendDiagramTruthOverlaySummary[], hotspots: BackendDiagramTruthHotspot[]): BackendDiagramRenderModel {
  const findingRefs = collectFindingRefs(networkObjectModel);
  const graphNodes = networkObjectModel.designGraph.nodes.slice(0, 260);
  const graphNodeIds = new Set(graphNodes.map((node) => node.id));
  const siteNodes = graphNodes.filter((node) => node.objectType === "site");
  const routeDomainNodes = graphNodes.filter((node) => node.objectType === "route-domain");
  const securityZoneNodes = graphNodes.filter((node) => node.objectType === "security-zone");
  const implementationStageNodes = graphNodes.filter((node) => node.objectType === "implementation-stage");

  const layerOrder: BackendDiagramRenderNode["layer"][] = ["site", "device", "interface", "routing", "security", "implementation", "verification"];
  const layerCounts = new Map<BackendDiagramRenderNode["layer"], number>();

  const renderNodes: BackendDiagramRenderNode[] = graphNodes.map((node) => {
    const layer = layerForObjectType(node.objectType);
    const indexInLayer = layerCounts.get(layer) ?? 0;
    layerCounts.set(layer, indexInLayer + 1);
    const readiness = readinessForObject(node.objectId, networkObjectModel, findingRefs);
    const layerIndex = layerOrder.indexOf(layer);
    const row = indexInLayer % 8;
    const columnBand = Math.floor(indexInLayer / 8);

    return {
      id: node.id,
      objectId: node.objectId,
      objectType: node.objectType,
      label: node.label,
      groupId: node.siteId ? `site:${node.siteId}` : undefined,
      siteId: node.siteId,
      layer,
      readiness: readiness.readiness,
      truthState: node.truthState,
      x: 120 + layerIndex * 260 + columnBand * 90,
      y: 120 + row * 110,
      sourceEngine: node.objectType === "route-intent" || node.objectType === "route-domain" || node.objectType === "segmentation-flow"
        ? "routing"
        : node.objectType === "security-flow" || node.objectType === "security-zone" || node.objectType === "policy-rule" || node.objectType === "nat-rule"
          ? "security"
          : node.objectType === "implementation-stage" || node.objectType === "implementation-step"
            ? "implementation"
            : "design-graph",
      relatedFindingIds: readiness.relatedFindingIds,
      notes: node.notes,
    };
  });

  const renderEdges: BackendDiagramRenderEdge[] = networkObjectModel.designGraph.edges
    .filter((edge) => graphNodeIds.has(edge.sourceNodeId) && graphNodeIds.has(edge.targetNodeId))
    .slice(0, 360)
    .map((edge) => ({
      id: edge.id,
      relationship: edge.relationship,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      label: edge.relationship.replace(/-/g, " "),
      readiness: edge.required ? "review" : "unknown",
      overlayKeys: overlayKeysForRelationship(edge.relationship),
      relatedObjectIds: [edge.sourceNodeId, edge.targetNodeId],
      notes: edge.notes,
    }));

  const groupFromNodes = (groupType: BackendDiagramRenderGroup["groupType"], prefix: string, nodes: typeof graphNodes): BackendDiagramRenderGroup[] => nodes.map((node) => ({
    id: `${prefix}:${node.objectId}`,
    groupType,
    label: node.label,
    readiness: readinessForObject(node.objectId, networkObjectModel, findingRefs).readiness,
    nodeIds: renderNodes.filter((renderNode) => renderNode.objectId === node.objectId || renderNode.siteId === node.objectId).map((renderNode) => renderNode.id),
    notes: node.notes,
  }));

  const groups = [
    ...groupFromNodes("site", "site", siteNodes),
    ...groupFromNodes("route-domain", "route-domain", routeDomainNodes),
    ...groupFromNodes("security-zone", "security-zone", securityZoneNodes),
    ...groupFromNodes("implementation-stage", "implementation-stage", implementationStageNodes),
  ];

  const overlayKeyToLayer: Record<BackendDiagramRenderOverlay["key"], BackendDiagramRenderNode["layer"][]> = {
    addressing: ["site", "interface"],
    routing: ["routing", "interface"],
    security: ["security"],
    nat: ["security"],
    implementation: ["implementation"],
    verification: ["verification", "implementation"],
    "operational-safety": ["device", "implementation"],
  };

  const overlays: BackendDiagramRenderOverlay[] = overlaySummaries.map((summary, index) => {
    const layers = overlayKeyToLayer[summary.key];
    const nodeIds = renderNodes.filter((node) => layers.includes(node.layer)).map((node) => node.id);
    const edgeIds = renderEdges.filter((edge) => edge.overlayKeys.includes(summary.key)).map((edge) => edge.id);
    return {
      key: summary.key,
      label: summary.label,
      readiness: summary.readiness,
      nodeIds,
      edgeIds,
      hotspotIndexes: hotspots.map((_, hotspotIndex) => hotspotIndex).filter((hotspotIndex) => hotspotIndex % overlaySummaries.length === index % overlaySummaries.length).slice(0, 4),
      detail: summary.detail,
    };
  });

  const missingRenderInputs = [
    networkObjectModel.devices.length <= 0 ? "modeled network devices" : null,
    networkObjectModel.interfaces.length <= 0 ? "modeled network interfaces" : null,
    networkObjectModel.links.length <= 0 ? "modeled network links or WAN/site relationships" : null,
    networkObjectModel.designGraph.edges.length <= 0 ? "backend design graph relationships" : null,
    renderNodes.length === 0 ? "backend render nodes" : null,
  ].filter(Boolean) as string[];

  const emptyState = missingRenderInputs.length > 0
    ? {
        reason: `Backend diagram render model is blocked because these inputs are missing: ${missingRenderInputs.join(", ")}.`,
        requiredInputs: missingRenderInputs.map((item) => `Generate ${item}`),
      }
    : undefined;

  return {
    summary: {
      nodeCount: renderNodes.length,
      edgeCount: renderEdges.length,
      groupCount: groups.length,
      overlayCount: overlays.length,
      backendAuthored: true,
      layoutMode: "backend-deterministic-grid",
    },
    nodes: renderNodes,
    edges: renderEdges,
    groups,
    overlays,
    emptyState,
  };
}

export function buildBackendReportTruthModel(params: { summary: SnapshotSummaryForTruth; networkObjectModel: NetworkObjectModel; issues: DesignCoreIssue[] }): BackendReportTruthModel {
  const { summary, networkObjectModel, issues } = params;
  const routingReadiness = rollupReadiness([normalizeReadiness(networkObjectModel.routingSegmentation.summary.routingReadiness), normalizeReadiness(networkObjectModel.routingSegmentation.summary.segmentationReadiness)]);
  const securityReadiness = normalizeReadiness(networkObjectModel.securityPolicyFlow.summary.policyReadiness);
  const natReadiness = normalizeReadiness(networkObjectModel.securityPolicyFlow.summary.natReadiness);
  const implementationReadiness = normalizeReadiness(networkObjectModel.implementationPlan.summary.implementationReadiness);
  const overallReadiness = rollupReadiness([routingReadiness, securityReadiness, natReadiness, implementationReadiness]);
  const { blockedFindings, reviewFindings } = collectFindingBuckets(networkObjectModel);
  const limitations = [
    ...networkObjectModel.integrityNotes,
    ...issues.filter((issue) => issue.severity !== "INFO").slice(0, 6).map((issue) => `${issue.title}: ${issue.detail}`),
  ];

  if (!summary.readyForBackendAuthority) {
    limitations.unshift("The backend design core has unresolved blockers or review findings; do not treat this design as implementation-ready until they are resolved.");
  }

  return {
    overallReadiness,
    overallReadinessLabel: readinessLabel(overallReadiness),
    summary: {
      deviceCount: networkObjectModel.devices.length,
      linkCount: networkObjectModel.links.length,
      routeDomainCount: networkObjectModel.routeDomains.length,
      securityZoneCount: networkObjectModel.securityZones.length,
      routeIntentCount: networkObjectModel.routingSegmentation.routeIntents.length,
      securityFlowCount: networkObjectModel.securityPolicyFlow.flowRequirements.length,
      implementationStepCount: networkObjectModel.implementationPlan.steps.length,
      blockedImplementationStepCount: networkObjectModel.implementationPlan.summary.blockedStepCount,
      blockedVerificationCheckCount: networkObjectModel.implementationPlan.summary.blockedVerificationCheckCount,
    },
    readiness: { routing: routingReadiness, security: securityReadiness, nat: natReadiness, implementation: implementationReadiness },
    blockedFindings,
    reviewFindings,
    implementationReviewQueue: [...networkObjectModel.implementationPlan.steps].sort(compareStepPriority).slice(0, 12),
    verificationChecks: [...networkObjectModel.implementationPlan.verificationChecks].sort(compareVerificationPriority).slice(0, 16),
    verificationCoverage: summarizeVerificationByType(networkObjectModel.implementationPlan.verificationChecks),
    rollbackActions: networkObjectModel.implementationPlan.rollbackActions.slice(0, 12),
    limitations: limitations.length > 0 ? limitations.slice(0, 12) : ["No backend truth limitations were recorded."],
  };
}

export function buildBackendDiagramTruthModel(params: { summary: SnapshotSummaryForTruth; networkObjectModel: NetworkObjectModel }): BackendDiagramTruthModel {
  const { summary, networkObjectModel } = params;
  const routingReadiness = rollupReadiness([normalizeReadiness(networkObjectModel.routingSegmentation.summary.routingReadiness), normalizeReadiness(networkObjectModel.routingSegmentation.summary.segmentationReadiness)]);
  const securityReadiness = normalizeReadiness(networkObjectModel.securityPolicyFlow.summary.policyReadiness);
  const natReadiness = normalizeReadiness(networkObjectModel.securityPolicyFlow.summary.natReadiness);
  const implementationReadiness = normalizeReadiness(networkObjectModel.implementationPlan.summary.implementationReadiness);
  const hasModeledTopology = networkObjectModel.devices.length > 0 || networkObjectModel.interfaces.length > 0 || networkObjectModel.links.length > 0;

  const overlaySummaries: BackendDiagramTruthOverlaySummary[] = [
    {
      key: "addressing",
      label: "Addressing",
      readiness: networkObjectModel.summary.orphanedAddressRowCount > 0 ? "review" : "ready",
      detail: networkObjectModel.summary.orphanedAddressRowCount > 0 ? `${networkObjectModel.summary.orphanedAddressRowCount} addressing row(s) are not fully anchored to modeled objects.` : "Addressing rows are anchored to modeled network objects.",
      count: summary.validSubnetCount,
    },
    {
      key: "routing",
      label: "Routing",
      readiness: routingReadiness,
      detail: `${networkObjectModel.routingSegmentation.summary.routeIntentCount} route intents, ${networkObjectModel.routingSegmentation.summary.reachabilityFindingCount} reachability finding(s), ${networkObjectModel.routingSegmentation.summary.nextHopReviewCount} next-hop review item(s).`,
      count: networkObjectModel.routingSegmentation.summary.routeIntentCount,
    },
    {
      key: "security",
      label: "Security",
      readiness: securityReadiness,
      detail: `${networkObjectModel.securityPolicyFlow.summary.flowRequirementCount} required flows, ${networkObjectModel.securityPolicyFlow.summary.missingPolicyCount} missing-policy finding(s), ${networkObjectModel.securityPolicyFlow.summary.conflictingPolicyCount} conflict(s).`,
      count: networkObjectModel.securityPolicyFlow.summary.flowRequirementCount,
    },
    {
      key: "nat",
      label: "NAT",
      readiness: natReadiness,
      detail: `${networkObjectModel.securityPolicyFlow.summary.natReviewCount} NAT review row(s), ${networkObjectModel.securityPolicyFlow.summary.missingNatCount} missing NAT coverage finding(s).`,
      count: networkObjectModel.securityPolicyFlow.summary.natReviewCount,
    },
    {
      key: "implementation",
      label: "Implementation",
      readiness: implementationReadiness,
      detail: `${networkObjectModel.implementationPlan.summary.stepCount} implementation step(s), ${networkObjectModel.implementationPlan.summary.blockedStepCount} blocked, ${networkObjectModel.implementationPlan.summary.reviewStepCount} review-required.`,
      count: networkObjectModel.implementationPlan.summary.stepCount,
    },
    {
      key: "verification",
      label: "Verification",
      readiness: networkObjectModel.implementationPlan.summary.blockedVerificationCheckCount > 0 ? "blocked" : networkObjectModel.implementationPlan.summary.verificationCheckCount > 0 ? "review" : "unknown",
      detail: `${networkObjectModel.implementationPlan.summary.verificationCheckCount} verification check(s), ${networkObjectModel.implementationPlan.summary.blockedVerificationCheckCount} blocked.`,
      count: networkObjectModel.implementationPlan.summary.verificationCheckCount,
    },
    {
      key: "operational-safety",
      label: "Operational safety",
      readiness: networkObjectModel.implementationPlan.summary.operationalSafetyBlockedGateCount > 0 ? "blocked" : networkObjectModel.implementationPlan.summary.operationalSafetyGateCount > 0 ? "review" : "unknown",
      detail: `${networkObjectModel.implementationPlan.summary.operationalSafetyGateCount} safety gate(s), ${networkObjectModel.implementationPlan.summary.operationalSafetyBlockedGateCount} blocked gate(s).`,
      count: networkObjectModel.implementationPlan.summary.operationalSafetyGateCount,
    },
  ];

  const nodes = [
    ...networkObjectModel.devices.map((device) => ({ id: device.id, objectType: "network-device" as const, label: device.name, readiness: device.managementIp ? "review" as const : "blocked" as const, notes: device.notes })),
    ...networkObjectModel.interfaces.map((networkInterface) => ({ id: networkInterface.id, objectType: "network-interface" as const, label: networkInterface.name, readiness: networkInterface.ipAddress || networkInterface.subnetCidr ? "review" as const : "blocked" as const, notes: networkInterface.notes })),
    ...networkObjectModel.links.map((link) => ({ id: link.id, objectType: "network-link" as const, label: link.name, readiness: link.status === "modeled" ? "review" as const : "unknown" as const, notes: link.notes })),
    ...networkObjectModel.routeDomains.map((domain) => ({ id: domain.id, objectType: "route-domain" as const, label: domain.name, readiness: normalizeReadiness(domain.summarizationState), notes: domain.notes })),
    ...networkObjectModel.securityZones.map((zone) => ({ id: zone.id, objectType: "security-zone" as const, label: zone.name, readiness: zone.isolationExpectation === "review" ? "review" as const : "ready" as const, notes: zone.notes })),
  ].slice(0, 200);

  const edges = networkObjectModel.designGraph.edges.slice(0, 250).map((edge) => ({
    id: edge.id,
    relationship: edge.relationship,
    sourceId: edge.sourceNodeId,
    targetId: edge.targetNodeId,
    readiness: edge.required ? "review" as const : "unknown" as const,
    notes: edge.notes,
  }));

  const hotspots = [...collectImplementationHotspots(networkObjectModel), ...collectRoutingHotspots(networkObjectModel), ...collectSecurityHotspots(networkObjectModel)].slice(0, 12);
  const overallReadiness = rollupReadiness(overlaySummaries.map((item) => item.readiness));
  const renderModel = buildBackendDiagramRenderModel(networkObjectModel, overlaySummaries, hotspots);
  const diagramEmptyState = hasModeledTopology ? undefined : buildDiagramEmptyStateReason(summary, networkObjectModel);

  return {
    overallReadiness,
    hasModeledTopology,
    emptyStateReason: diagramEmptyState?.reason,
    topologySummary: {
      siteCount: summary.siteCount,
      deviceCount: networkObjectModel.devices.length,
      interfaceCount: networkObjectModel.interfaces.length,
      linkCount: networkObjectModel.links.length,
      routeDomainCount: networkObjectModel.routeDomains.length,
      securityZoneCount: networkObjectModel.securityZones.length,
    },
    nodes,
    edges,
    overlaySummaries,
    hotspots,
    renderModel,
  };
}
