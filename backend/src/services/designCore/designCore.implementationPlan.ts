import type {
  DesignGraph,
  DesignGraphIntegrityFinding,
  DhcpPool,
  ImplementationDependencyGraph,
  ImplementationDependencyGraphEdge,
  ImplementationPlanFinding,
  ImplementationPlanModel,
  ImplementationPlanRollbackAction,
  ImplementationPlanStage,
  ImplementationPlanStep,
  ImplementationPlanVerificationCheck,
  NatRule,
  NetworkDevice,
  NetworkInterface,
  NetworkObjectTruthState,
  PolicyRule,
  RouteIntent,
  RoutingSegmentationModel,
  RoutingSegmentationReachabilityFinding,
  SecurityFlowRequirement,
  SecurityNatReview,
  SecurityZone,
  SecurityPolicyFinding,
  SecurityPolicyFlowModel,
} from "../designCore.types.js";

type ImplementationNetworkObjectModel = {
  devices: NetworkDevice[];
  interfaces: NetworkInterface[];
  securityZones: SecurityZone[];
  policyRules: PolicyRule[];
  natRules: NatRule[];
  dhcpPools: DhcpPool[];
  designGraph: DesignGraph;
  routingSegmentation: RoutingSegmentationModel;
  securityPolicyFlow: SecurityPolicyFlowModel;
};

type StepReadiness = ImplementationPlanStep["readiness"];
type StepRiskLevel = ImplementationPlanStep["riskLevel"];
type UpstreamFindingSource = "design-graph" | "routing" | "security-policy";

type NormalizedUpstreamFinding = {
  id: string;
  source: UpstreamFindingSource;
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  title: string;
  detail: string;
  affectedObjectIds: string[];
  remediation: string;
};

type StepBuildInput = {
  id: string;
  title: string;
  stageId: string;
  category: ImplementationPlanStep["category"];
  sequence: number;
  siteId?: string;
  targetObjectType: ImplementationPlanStep["targetObjectType"];
  targetObjectId?: string;
  action: ImplementationPlanStep["action"];
  baseReadiness: StepReadiness;
  baseBlockers?: string[];
  reviewReasons?: string[];
  riskLevel: StepRiskLevel;
  engineerReviewRequired: boolean;
  dependencies: ImplementationPlanStep["dependencies"];
  dependencyObjectIds?: string[];
  graphDependencyEdgeIds?: string[];
  upstreamFindings: NormalizedUpstreamFinding[];
  blastRadius: string[];
  implementationIntent: string;
  sourceEvidence: string[];
  requiredEvidence: string[];
  expectedOutcome: string;
  acceptanceCriteria: string[];
  rollbackIntent: string;
  notes: string[];
};

const PREP_STEP_ID = "implementation-step-review-authoritative-design-findings";

const IMPLEMENTATION_STAGES: ImplementationPlanStage[] = [
  {
    id: "implementation-stage-preparation",
    name: "Preparation and engineer review",
    stageType: "preparation",
    sequence: 10,
    objective: "Confirm the generated design model, unresolved findings, and implementation prerequisites before changing the network.",
    exitCriteria: [
      "Design graph has no unaccepted blocking relationship findings.",
      "Addressing, routing, security, NAT, and DHCP assumptions are reviewed by an engineer.",
      "Device management access, current-config backup, and rollback access path are confirmed before risky changes.",
      "Rollback and verification approach is approved before change execution.",
    ],
  },
  {
    id: "implementation-stage-addressing-and-vlans",
    name: "Addressing, VLANs, and routed interfaces",
    stageType: "addressing-and-vlans",
    sequence: 20,
    objective: "Create or confirm VLANs, routed gateway interfaces, subnet ownership, and local address services.",
    exitCriteria: [
      "Every planned VLAN has an assigned subnet and gateway owner.",
      "Gateway IP reservations are documented.",
      "DHCP pools are created or intentionally deferred.",
    ],
  },
  {
    id: "implementation-stage-routing",
    name: "Routing and route-domain activation",
    stageType: "routing",
    sequence: 30,
    objective: "Apply connected, default, static, and summary route intent without assuming a vendor syntax.",
    exitCriteria: [
      "Required route intents are present or explicitly deferred.",
      "Branch, HQ, transit, and default route paths have been verified.",
      "Route summaries are reviewed against the site block plan.",
    ],
  },
  {
    id: "implementation-stage-security",
    name: "Security zones, policy, and NAT",
    stageType: "security",
    sequence: 40,
    objective: "Apply inter-zone policy and NAT intent while preserving guest, management, DMZ, and internal boundaries.",
    exitCriteria: [
      "Required allow and deny flows are covered by explicit policy intent.",
      "Internet-bound flows that require NAT have matching NAT intent.",
      "Broad permits into trusted zones are removed or formally accepted as risk.",
    ],
  },
  {
    id: "implementation-stage-verification",
    name: "Verification and acceptance testing",
    stageType: "verification",
    sequence: 50,
    objective: "Prove addressing, routing, security, NAT, DHCP, and documentation expectations after implementation.",
    exitCriteria: [
      "Required reachability tests pass.",
      "Required blocked-flow tests fail closed as expected.",
      "Final report and as-built notes reflect what was actually implemented.",
    ],
  },
  {
    id: "implementation-stage-rollback",
    name: "Rollback and recovery readiness",
    stageType: "rollback",
    sequence: 60,
    objective: "Define neutral rollback actions tied to the implementation steps before vendor-specific commands exist.",
    exitCriteria: [
      "Rollback triggers are documented.",
      "Affected tasks have recovery actions.",
      "Engineer review confirms what must be preserved before reverting changes.",
    ],
  },
];

function normalizeIdentifierSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unnamed";
}

function createStepId(parts: string[]) {
  return `implementation-step-${parts.map(normalizeIdentifierSegment).join("-")}`;
}

function createCheckId(parts: string[]) {
  return `implementation-check-${parts.map(normalizeIdentifierSegment).join("-")}`;
}

function createRollbackId(parts: string[]) {
  return `rollback-action-${parts.map(normalizeIdentifierSegment).join("-")}`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function sortSteps(steps: ImplementationPlanStep[]) {
  return [...steps].sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
}

function readinessFromTruthState(truthState: NetworkObjectTruthState): StepReadiness {
  if (truthState === "configured" || truthState === "inferred") return "ready";
  if (truthState === "proposed") return "review";
  return "review";
}

function riskLevelForInterface(networkInterface: NetworkInterface): StepRiskLevel {
  if (networkInterface.interfaceRole === "wan-transit" || networkInterface.interfaceRole === "routed-uplink") return "high";
  if (networkInterface.interfaceRole === "firewall-boundary" || networkInterface.interfaceRole === "loopback") return "medium";
  return "medium";
}

function riskLevelForRouteIntent(routeIntent: RouteIntent): StepRiskLevel {
  if (routeIntent.routeKind === "default" || routeIntent.routeKind === "static") return "high";
  if (routeIntent.routeKind === "summary") return "medium";
  return "low";
}

function readinessForRouteIntent(routeIntent: RouteIntent): StepReadiness {
  if (routeIntent.administrativeState === "missing") return "blocked";
  if (routeIntent.administrativeState === "review") return "review";
  return "ready";
}

function readinessForSecurityFlow(flowRequirement: SecurityFlowRequirement): StepReadiness {
  if (flowRequirement.state === "conflict") return "blocked";
  if (flowRequirement.state === "missing-policy" || flowRequirement.state === "missing-nat") return "blocked";
  if (flowRequirement.state === "review") return "review";
  return "ready";
}

function riskLevelForSecurityFlow(flowRequirement: SecurityFlowRequirement): StepRiskLevel {
  if (flowRequirement.severityIfMissing === "ERROR") return "high";
  if (flowRequirement.expectedAction === "allow" || flowRequirement.natRequired) return "medium";
  return "low";
}

function normalizedDesignGraphFindings(findings: DesignGraphIntegrityFinding[]) {
  return findings.map((finding, index): NormalizedUpstreamFinding => ({
    id: `design-graph-${normalizeIdentifierSegment(finding.code)}-${index + 1}`,
    source: "design-graph",
    severity: finding.severity,
    code: finding.code,
    title: finding.title,
    detail: finding.detail,
    affectedObjectIds: finding.affectedObjectIds,
    remediation: finding.remediation,
  }));
}

function normalizedRoutingFindings(findings: RoutingSegmentationReachabilityFinding[]) {
  return findings.map((finding, index): NormalizedUpstreamFinding => ({
    id: `routing-${normalizeIdentifierSegment(finding.code)}-${index + 1}`,
    source: "routing",
    severity: finding.severity,
    code: finding.code,
    title: finding.title,
    detail: finding.detail,
    affectedObjectIds: finding.affectedObjectIds,
    remediation: finding.remediation,
  }));
}

function normalizedSecurityFindings(findings: SecurityPolicyFinding[]) {
  return findings.map((finding, index): NormalizedUpstreamFinding => ({
    id: `security-policy-${normalizeIdentifierSegment(finding.code)}-${index + 1}`,
    source: "security-policy",
    severity: finding.severity,
    code: finding.code,
    title: finding.title,
    detail: finding.detail,
    affectedObjectIds: finding.affectedObjectIds,
    remediation: finding.remediation,
  }));
}

function collectUpstreamFindings(params: {
  designGraphFindings: DesignGraphIntegrityFinding[];
  routingFindings: RoutingSegmentationReachabilityFinding[];
  securityPolicyFindings: SecurityPolicyFinding[];
}) {
  return [
    ...normalizedDesignGraphFindings(params.designGraphFindings),
    ...normalizedRoutingFindings(params.routingFindings),
    ...normalizedSecurityFindings(params.securityPolicyFindings),
  ];
}

function findingsForObject(upstreamFindings: NormalizedUpstreamFinding[], objectIds: string[]) {
  const objectIdSet = new Set(objectIds.filter(Boolean));
  if (objectIdSet.size === 0) return [];
  return upstreamFindings.filter((finding) => finding.affectedObjectIds.some((objectId) => objectIdSet.has(objectId)));
}

function dependenciesWithGate(extra: ImplementationPlanStep["dependencies"] = []) {
  return [
    { stepId: PREP_STEP_ID, reason: "Do not implement device-facing changes until authoritative design findings are reviewed." },
    ...extra,
  ].filter((dependency, index, dependencies) => dependencies.findIndex((item) => item.stepId === dependency.stepId) === index);
}

function buildStep(input: StepBuildInput): ImplementationPlanStep {
  const upstreamErrors = input.upstreamFindings.filter((finding) => finding.severity === "ERROR");
  const upstreamWarnings = input.upstreamFindings.filter((finding) => finding.severity === "WARNING");
  const baseBlockers = input.baseBlockers ?? [];
  const blockers = unique([
    ...baseBlockers,
    ...upstreamErrors.map((finding) => `${finding.source} finding ${finding.code}: ${finding.title}`),
    ...(input.baseReadiness === "blocked" && baseBlockers.length === 0 && upstreamErrors.length === 0 ? ["Source engine marked this step blocked; review source evidence before execution."] : []),
  ]);
  const reviewReasons = unique([
    ...(input.reviewReasons ?? []),
    ...upstreamWarnings.map((finding) => `${finding.source} warning ${finding.code}: ${finding.title}`),
    ...(input.baseReadiness === "review" ? ["Source object is proposed, inferred, or requires engineer confirmation before command translation."] : []),
  ]);
  const readiness: StepReadiness = blockers.length > 0 ? "blocked" : reviewReasons.length > 0 ? "review" : input.baseReadiness === "deferred" ? "deferred" : "ready";
  const readinessReasons = readiness === "blocked" ? blockers : readiness === "review" ? reviewReasons : ["Required upstream model evidence is present for this implementation-neutral step."];

  return {
    id: input.id,
    title: input.title,
    stageId: input.stageId,
    category: input.category,
    sequence: input.sequence,
    siteId: input.siteId,
    targetObjectType: input.targetObjectType,
    targetObjectId: input.targetObjectId,
    action: input.action,
    readiness,
    readinessReasons,
    blockers,
    riskLevel: input.riskLevel,
    engineerReviewRequired: input.engineerReviewRequired || readiness !== "ready" || input.riskLevel === "high",
    dependencies: input.dependencies,
    dependencyObjectIds: unique(input.dependencyObjectIds ?? []),
    graphDependencyEdgeIds: unique(input.graphDependencyEdgeIds ?? []),
    upstreamFindingIds: input.upstreamFindings.map((finding) => finding.id),
    blastRadius: unique(input.blastRadius),
    implementationIntent: input.implementationIntent,
    sourceEvidence: unique(input.sourceEvidence),
    requiredEvidence: unique(input.requiredEvidence),
    expectedOutcome: input.expectedOutcome,
    acceptanceCriteria: unique(input.acceptanceCriteria),
    rollbackIntent: input.rollbackIntent,
    notes: unique(input.notes),
  };
}

function stepIdForInterface(interfaceId: string) {
  return createStepId(["interface", interfaceId]);
}

function stepIdForRouteIntent(routeIntentId: string) {
  return createStepId(["route-intent", routeIntentId]);
}

function stepIdForSecurityFlow(flowRequirementId: string) {
  return createStepId(["security-flow", flowRequirementId]);
}

function stepIdForNatRule(natRuleId: string) {
  return createStepId(["nat-rule", natRuleId]);
}

function stepIdForDhcpPool(dhcpPoolId: string) {
  return createStepId(["dhcp-pool", dhcpPoolId]);
}

function stepIdForOperationalSafety(deviceId: string) {
  return createStepId(["operational-safety", deviceId]);
}

function deviceSafetyEvidence(device: NetworkDevice) {
  const normalizedNotes = device.notes.join(" ").toLowerCase();
  const hasManagementAccess = Boolean(device.managementIp);
  const hasManagementAccessProof = /management access verified|mgmt access verified|ssh verified|https verified|snmp verified|admin access verified/.test(normalizedNotes);
  const hasBackupEvidence = /backup|configuration snapshot|config snapshot|known-good|baseline captured/.test(normalizedNotes);
  const hasRollbackAccessEvidence = /rollback path|out-of-band|oob|console|break-glass|break glass|fallback access|recovery access/.test(normalizedNotes);

  return {
    hasManagementAccess,
    hasManagementAccessProof,
    hasBackupEvidence,
    hasRollbackAccessEvidence,
  };
}

function operationalSafetyContextForDevices(params: {
  devices: NetworkDevice[];
  deviceIds: string[];
  changeLabel: string;
  blockWhenNoDevice?: boolean;
}) {
  const deviceIds = unique(params.deviceIds);
  const affectedDevices = deviceIds
    .map((deviceId) => params.devices.find((device) => device.id === deviceId))
    .filter((device): device is NetworkDevice => Boolean(device));
  const dependencies: ImplementationDependencyDraft[] = affectedDevices.map((device) => ({
    stepId: stepIdForOperationalSafety(device.id),
    reason: `Operational safety gate: ${params.changeLabel} must preserve management access, backup state, and rollback path for ${device.name}.`,
    objectIds: [device.id],
    graphEdgeIds: [],
    source: "object-model",
  }));

  const blockers = [
    ...(params.blockWhenNoDevice && affectedDevices.length === 0 ? [`Operational safety blocked: no affected device could be resolved for ${params.changeLabel}.`] : []),
    ...affectedDevices
      .filter((device) => !deviceSafetyEvidence(device).hasManagementAccess)
      .map((device) => `Operational safety blocked: ${device.name} has no modeled management IP, so risky changes cannot be treated as executable.`),
  ];

  const reviewReasons = affectedDevices.flatMap((device) => {
    const evidence = deviceSafetyEvidence(device);
    return [
      ...(evidence.hasManagementAccess && !evidence.hasManagementAccessProof ? [`Operational safety review: management access to ${device.name} (${device.managementIp}) must be tested before change execution.`] : []),
      ...(!evidence.hasBackupEvidence ? [`Operational safety review: current configuration backup/baseline for ${device.name} is not modeled.`] : []),
      ...(!evidence.hasRollbackAccessEvidence ? [`Operational safety review: out-of-band, console, fallback, or rollback access path for ${device.name} is not modeled.`] : []),
    ];
  });

  return {
    affectedDeviceIds: affectedDevices.map((device) => device.id),
    dependencies,
    blockers,
    reviewReasons,
    dependencyObjectIds: affectedDevices.map((device) => device.id),
  };
}

type ImplementationDependencyDraft = {
  stepId: string;
  reason: string;
  objectIds: string[];
  graphEdgeIds: string[];
  source: ImplementationDependencyGraphEdge["source"];
};

type DependencyGraphLookup = {
  incomingByObjectId: Map<string, ImplementationDependencyGraphEdge[]>;
  objectModelEdges: ImplementationDependencyGraphEdge[];
};

function buildGraphLookup(designGraph: DesignGraph): DependencyGraphLookup {
  const nodeById = new Map(designGraph.nodes.map((node) => [node.id, node]));
  const incomingByObjectId = new Map<string, ImplementationDependencyGraphEdge[]>();
  const objectModelEdges: ImplementationDependencyGraphEdge[] = [];

  for (const edge of designGraph.edges) {
    const sourceNode = nodeById.get(edge.sourceNodeId);
    const targetNode = nodeById.get(edge.targetNodeId);
    if (!sourceNode || !targetNode) continue;

    const dependencyEdge: ImplementationDependencyGraphEdge = {
      id: `graph-edge-${edge.id}`,
      source: "design-graph",
      relationship: edge.relationship,
      sourceObjectType: sourceNode.objectType,
      sourceObjectId: sourceNode.objectId,
      targetObjectType: targetNode.objectType,
      targetObjectId: targetNode.objectId,
      required: edge.required,
      reason: `Design graph relationship ${edge.relationship} ties ${sourceNode.label} to ${targetNode.label}.`,
    };

    objectModelEdges.push(dependencyEdge);
    const existing = incomingByObjectId.get(targetNode.objectId) ?? [];
    incomingByObjectId.set(targetNode.objectId, [...existing, dependencyEdge]);
  }

  return { incomingByObjectId, objectModelEdges };
}

function incomingGraphObjectIds(lookup: DependencyGraphLookup, objectId: string) {
  return lookup.incomingByObjectId.get(objectId) ?? [];
}

function uniqueDependencyDrafts(dependencies: ImplementationDependencyDraft[]) {
  const keyed = new Map<string, ImplementationDependencyDraft>();
  for (const dependency of dependencies) {
    const key = `${dependency.stepId}|${dependency.reason}`;
    const existing = keyed.get(key);
    if (!existing) {
      keyed.set(key, {
        ...dependency,
        objectIds: unique(dependency.objectIds),
        graphEdgeIds: unique(dependency.graphEdgeIds),
      });
      continue;
    }
    keyed.set(key, {
      ...existing,
      objectIds: unique([...existing.objectIds, ...dependency.objectIds]),
      graphEdgeIds: unique([...existing.graphEdgeIds, ...dependency.graphEdgeIds]),
    });
  }
  return Array.from(keyed.values());
}

function routeIntentMatchesSecurityFlow(params: {
  routeIntent: RouteIntent;
  sourceZone?: SecurityZone;
  destinationZone?: SecurityZone;
  sourceInterfaces: NetworkInterface[];
  destinationInterfaces: NetworkInterface[];
}) {
  const sourceRouteDomainId = params.sourceZone?.routeDomainId;
  const destinationRouteDomainId = params.destinationZone?.routeDomainId;
  const sourceSubnetCidrs = new Set(params.sourceZone?.subnetCidrs ?? []);
  const destinationSubnetCidrs = new Set(params.destinationZone?.subnetCidrs ?? []);
  const sourceInterfaceIds = new Set(params.sourceInterfaces.map((networkInterface) => networkInterface.id));
  const destinationInterfaceIds = new Set(params.destinationInterfaces.map((networkInterface) => networkInterface.id));
  const sourceSiteIds = new Set(params.sourceZone?.siteIds ?? []);
  const destinationSiteIds = new Set(params.destinationZone?.siteIds ?? []);

  if (params.destinationZone?.zoneRole === "wan" && params.routeIntent.routeKind === "default" && params.routeIntent.routeDomainId === sourceRouteDomainId) return true;
  if (destinationSubnetCidrs.has(params.routeIntent.destinationCidr) && params.routeIntent.routeDomainId === sourceRouteDomainId) return true;
  if (sourceSubnetCidrs.has(params.routeIntent.destinationCidr) && params.routeIntent.routeDomainId === destinationRouteDomainId) return true;
  if (params.routeIntent.nextHopObjectId && (sourceInterfaceIds.has(params.routeIntent.nextHopObjectId) || destinationInterfaceIds.has(params.routeIntent.nextHopObjectId))) return true;
  if (params.routeIntent.siteId && (sourceSiteIds.has(params.routeIntent.siteId) || destinationSiteIds.has(params.routeIntent.siteId)) && params.routeIntent.routeDomainId === sourceRouteDomainId) return true;

  return false;
}

function dependenciesForSecurityFlow(params: {
  flowRequirement: SecurityFlowRequirement;
  interfaces: NetworkInterface[];
  routeIntents: RouteIntent[];
  securityZones: SecurityZone[];
  graphLookup: DependencyGraphLookup;
}) {
  const sourceZone = params.securityZones.find((zone) => zone.id === params.flowRequirement.sourceZoneId);
  const destinationZone = params.securityZones.find((zone) => zone.id === params.flowRequirement.destinationZoneId);
  const sourceInterfaces = params.interfaces.filter((networkInterface) => networkInterface.securityZoneId === params.flowRequirement.sourceZoneId);
  const destinationInterfaces = params.interfaces.filter((networkInterface) => networkInterface.securityZoneId === params.flowRequirement.destinationZoneId);
  const graphEdges = incomingGraphObjectIds(params.graphLookup, params.flowRequirement.id);
  const graphEdgeIds = graphEdges.map((edge) => edge.id);
  const dependencyObjectIds = [
    params.flowRequirement.id,
    params.flowRequirement.sourceZoneId,
    params.flowRequirement.destinationZoneId,
    ...(sourceZone?.subnetCidrs ?? []),
    ...(destinationZone?.subnetCidrs ?? []),
    ...sourceInterfaces.map((networkInterface) => networkInterface.id),
    ...destinationInterfaces.map((networkInterface) => networkInterface.id),
  ];

  const interfaceDependencies: ImplementationDependencyDraft[] = [...sourceInterfaces, ...destinationInterfaces].slice(0, 8).map((networkInterface) => ({
    stepId: stepIdForInterface(networkInterface.id),
    reason: `Graph-derived dependency: ${params.flowRequirement.name} uses zone-bound interface ${networkInterface.name}.`,
    objectIds: [networkInterface.id, networkInterface.securityZoneId ?? "", networkInterface.routeDomainId ?? ""],
    graphEdgeIds,
    source: "object-model",
  }));

  const routeDependencies = params.routeIntents
    .filter((routeIntent) => routeIntentMatchesSecurityFlow({
      routeIntent,
      sourceZone,
      destinationZone,
      sourceInterfaces,
      destinationInterfaces,
    }))
    .slice(0, 8)
    .map((routeIntent): ImplementationDependencyDraft => ({
      stepId: stepIdForRouteIntent(routeIntent.id),
      reason: `Graph-derived dependency: route intent ${routeIntent.name} is needed before validating ${params.flowRequirement.name}.`,
      objectIds: [routeIntent.id, routeIntent.routeDomainId, routeIntent.nextHopObjectId ?? ""],
      graphEdgeIds,
      source: "engine-derived",
    }));

  return {
    dependencies: uniqueDependencyDrafts([...interfaceDependencies, ...routeDependencies]),
    dependencyObjectIds: unique(dependencyObjectIds),
    graphEdgeIds,
    sourceZone,
    destinationZone,
    sourceInterfaces,
    destinationInterfaces,
  };
}

function dependenciesForNatRule(params: {
  natRule: NatRule;
  natReview?: SecurityNatReview;
  flowRequirements: SecurityFlowRequirement[];
  interfaces: NetworkInterface[];
  routeIntents: RouteIntent[];
  securityZones: SecurityZone[];
  graphLookup: DependencyGraphLookup;
}) {
  const sourceZone = params.securityZones.find((zone) => zone.id === params.natRule.sourceZoneId);
  const destinationZone = params.natRule.destinationZoneId ? params.securityZones.find((zone) => zone.id === params.natRule.destinationZoneId) : undefined;
  const sourceInterfaces = params.interfaces.filter((networkInterface) => networkInterface.securityZoneId === params.natRule.sourceZoneId);
  const graphEdges = incomingGraphObjectIds(params.graphLookup, params.natRule.id);
  const graphEdgeIds = graphEdges.map((edge) => edge.id);
  const coveredFlowDependencies = (params.natReview?.coveredFlowRequirementIds ?? []).map((flowRequirementId) => ({
    stepId: stepIdForSecurityFlow(flowRequirementId),
    reason: "Graph-derived dependency: NAT rule is tied to a modeled security flow requiring translation.",
    objectIds: [flowRequirementId, params.natRule.id],
    graphEdgeIds,
    source: "engine-derived" as const,
  }));

  const interfaceDependencies = sourceInterfaces.slice(0, 6).map((networkInterface) => ({
    stepId: stepIdForInterface(networkInterface.id),
    reason: `Graph-derived dependency: NAT source zone uses interface ${networkInterface.name}.`,
    objectIds: [networkInterface.id, params.natRule.sourceZoneId, networkInterface.routeDomainId ?? ""],
    graphEdgeIds,
    source: "object-model" as const,
  }));

  const routeDependencies = params.routeIntents
    .filter((routeIntent) => routeIntentMatchesSecurityFlow({
      routeIntent,
      sourceZone,
      destinationZone,
      sourceInterfaces,
      destinationInterfaces: [],
    }))
    .slice(0, 6)
    .map((routeIntent) => ({
      stepId: stepIdForRouteIntent(routeIntent.id),
      reason: `Graph-derived dependency: NAT egress relies on route intent ${routeIntent.name}.`,
      objectIds: [routeIntent.id, routeIntent.routeDomainId, routeIntent.nextHopObjectId ?? ""],
      graphEdgeIds,
      source: "engine-derived" as const,
    }));

  const dependencyObjectIds = unique([
    params.natRule.id,
    params.natRule.sourceZoneId,
    params.natRule.destinationZoneId ?? "",
    ...(params.natReview?.coveredFlowRequirementIds ?? []),
    ...(params.natReview?.missingFlowRequirementIds ?? []),
    ...sourceInterfaces.map((networkInterface) => networkInterface.id),
    ...routeDependencies.flatMap((dependency) => dependency.objectIds),
  ]);

  return {
    dependencies: uniqueDependencyDrafts([...coveredFlowDependencies, ...interfaceDependencies, ...routeDependencies]),
    dependencyObjectIds,
    graphEdgeIds,
  };
}

function buildImplementationDependencyGraph(params: {
  designGraph: DesignGraph;
  steps: ImplementationPlanStep[];
  lookup: DependencyGraphLookup;
}) {
  const stepDependencyEdges: ImplementationDependencyGraphEdge[] = [];
  let stepDependencyIndex = 0;
  for (const step of params.steps) {
    for (const dependency of step.dependencies) {
      stepDependencyIndex += 1;
      stepDependencyEdges.push({
        id: `step-edge-${stepDependencyIndex}-${normalizeIdentifierSegment(dependency.stepId)}-to-${normalizeIdentifierSegment(step.id)}`,
        source: dependency.reason.toLowerCase().includes("graph-derived") ? "engine-derived" : "object-model",
        relationship: "implementation-step-depends-on",
        sourceStepId: dependency.stepId,
        targetStepId: step.id,
        targetObjectType: step.targetObjectType,
        targetObjectId: step.targetObjectId,
        required: true,
        reason: dependency.reason,
      });
    }
  }

  const preciseSecurityDependencyCount = params.steps
    .filter((step) => step.category === "security-policy" || step.category === "security-policy-and-nat" || step.category === "nat")
    .reduce((total, step) => total + step.dependencies.filter((dependency) => dependency.reason.toLowerCase().includes("graph-derived")).length, 0);

  const edges = [...params.lookup.objectModelEdges, ...stepDependencyEdges];

  return {
    edgeCount: edges.length,
    designGraphEdgeCount: params.lookup.objectModelEdges.filter((edge) => edge.source === "design-graph").length,
    objectModelEdgeCount: stepDependencyEdges.filter((edge) => edge.source === "object-model").length,
    engineDerivedEdgeCount: stepDependencyEdges.filter((edge) => edge.source === "engine-derived").length,
    stepDependencyEdgeCount: stepDependencyEdges.length,
    preciseSecurityDependencyCount,
    edges,
    notes: [
      "V1B promotes implementation planning from broad stage ordering to graph-driven dependency compilation.",
      "V1C adds operational-safety dependencies so risky device-facing changes depend on management access, backup, and rollback readiness.",
      "Security and NAT steps now resolve dependencies from source/destination zones, zone-bound interfaces, route domains, route intents, NAT reviews, device safety gates, and backend design-graph relationships.",
      "The frontend must display this dependency graph; it must not invent browser-side implementation dependencies or safety gates.",
    ],
  } satisfies ImplementationDependencyGraph;
}

function buildPreparationSteps(params: {
  upstreamFindings: NormalizedUpstreamFinding[];
}) {
  const blockingFindingCount = params.upstreamFindings.filter((finding) => finding.severity === "ERROR").length;
  const warningFindingCount = params.upstreamFindings.filter((finding) => finding.severity === "WARNING").length;
  const baseReadiness: StepReadiness = blockingFindingCount > 0 ? "blocked" : warningFindingCount > 0 ? "review" : "ready";

  return [buildStep({
    id: PREP_STEP_ID,
    title: "Review authoritative design findings before implementation",
    stageId: "implementation-stage-preparation",
    category: "preparation",
    sequence: 100,
    targetObjectType: "design-graph",
    action: "review",
    baseReadiness,
    baseBlockers: blockingFindingCount > 0 ? [`${blockingFindingCount} upstream ERROR finding(s) must be fixed or formally deferred before execution.`] : [],
    reviewReasons: warningFindingCount > 0 ? [`${warningFindingCount} upstream WARNING finding(s) require engineer review before change execution.`] : [],
    riskLevel: blockingFindingCount > 0 ? "high" : "medium",
    engineerReviewRequired: true,
    dependencies: [],
    upstreamFindings: params.upstreamFindings,
    blastRadius: ["Whole design package; this gate controls whether any implementation step is safe to execute."],
    implementationIntent: "Review graph, routing, and security findings before converting neutral design intent into device changes.",
    sourceEvidence: [
      `${params.upstreamFindings.filter((finding) => finding.source === "design-graph").length} design graph finding(s).`,
      `${params.upstreamFindings.filter((finding) => finding.source === "routing").length} routing finding(s).`,
      `${params.upstreamFindings.filter((finding) => finding.source === "security-policy").length} security policy finding(s).`,
    ],
    requiredEvidence: [
      "Every ERROR finding is resolved, explicitly accepted, or removed from implementation scope.",
      "Every WARNING finding has an engineer decision before command translation.",
      "The change owner confirms the current design snapshot is the intended source of truth.",
    ],
    expectedOutcome: "The change owner accepts, fixes, or explicitly defers every material finding before implementation begins.",
    acceptanceCriteria: [
      "No hidden upstream ERROR remains unaccounted for.",
      "The implementation plan readiness is not treated as ready when source engines are blocked.",
    ],
    rollbackIntent: "Stop before making device changes; restore the prior approved design snapshot as the implementation source of truth.",
    notes: [
      "This is a gating step. It prevents implementation plans from hiding unresolved authority, graph, routing, or security issues.",
    ],
  })];
}

function buildOperationalSafetySteps(params: {
  devices: NetworkDevice[];
  upstreamFindings: NormalizedUpstreamFinding[];
}) {
  return params.devices.map((device, index) => {
    const evidence = deviceSafetyEvidence(device);
    const objectFindings = findingsForObject(params.upstreamFindings, [device.id, ...(device.interfaceIds ?? []), ...(device.routeDomainIds ?? []), ...(device.securityZoneIds ?? [])]);
    const blockers = [
      ...(!evidence.hasManagementAccess ? ["No management IP is modeled for this device; remote or high-impact changes cannot be treated as executable."] : []),
    ];
    const reviewReasons = [
      ...(device.truthState !== "configured" ? ["Device is not confirmed configured; engineer must validate the live device identity before change execution."] : []),
      ...(evidence.hasManagementAccess && !evidence.hasManagementAccessProof ? ["Management access is modeled but not proven/tested in the device notes."] : []),
      ...(!evidence.hasBackupEvidence ? ["Current configuration backup or baseline capture is not modeled for this device."] : []),
      ...(!evidence.hasRollbackAccessEvidence ? ["Out-of-band, console, fallback, or rollback access path is not modeled for this device."] : []),
    ];

    return buildStep({
      id: stepIdForOperationalSafety(device.id),
      title: `Confirm operational safety for ${device.name}`,
      stageId: "implementation-stage-preparation",
      category: "operational-safety",
      sequence: 120 + index,
      siteId: device.siteId,
      targetObjectType: "network-device",
      targetObjectId: device.id,
      action: "review",
      baseReadiness: blockers.length > 0 ? "blocked" : reviewReasons.length > 0 ? "review" : "ready",
      baseBlockers: blockers,
      reviewReasons,
      riskLevel: blockers.length > 0 ? "high" : "medium",
      engineerReviewRequired: true,
      dependencies: dependenciesWithGate(),
      dependencyObjectIds: [device.id, ...(device.interfaceIds ?? []), ...(device.routeDomainIds ?? []), ...(device.securityZoneIds ?? [])],
      upstreamFindings: objectFindings,
      blastRadius: [
        `Device: ${device.name}.`,
        `Site: ${device.siteName}.`,
        `Role: ${device.deviceRole}.`,
        `${(device.interfaceIds ?? []).length} interface(s), ${(device.routeDomainIds ?? []).length} route domain(s), and ${(device.securityZoneIds ?? []).length} security zone binding(s) depend on this device context.`,
      ],
      implementationIntent: `Prove ${device.name} can be safely changed and recovered before routing, security, NAT, DHCP, or interface changes are executed.`,
      sourceEvidence: [
        device.managementIp ? `Management IP modeled: ${device.managementIp}.` : "No management IP modeled.",
        `Device truth state: ${device.truthState}.`,
        `Managed interfaces: ${(device.interfaceIds ?? []).length}.`,
        `Route domains: ${(device.routeDomainIds ?? []).join(", ") || "none modeled"}.`,
      ],
      requiredEvidence: [
        "Current running/startup configuration backup or platform-equivalent baseline is captured before the change.",
        "Management access is tested using the intended admin path before the change window.",
        "Out-of-band, console, fallback, or rollback access path is identified for recovery.",
        "Change owner confirms this device can be safely touched inside the maintenance window.",
      ],
      expectedOutcome: "Risky implementation steps cannot proceed unless the affected device has a proven management and rollback safety posture.",
      acceptanceCriteria: [
        "Management access to the device is tested before implementation.",
        "Pre-change backup/baseline exists and is recoverable.",
        "Rollback or recovery path is documented before device-facing changes begin.",
      ],
      rollbackIntent: "Stop before device changes if safety evidence is missing; use the captured baseline and fallback access path if later rollback is triggered.",
      notes: [
        ...device.notes,
        "V1C treats operational safety as a hard implementation gate, not a nice-to-have note.",
      ],
    });
  });
}

function buildAddressingAndInterfaceSteps(params: {
  devices: NetworkDevice[];
  interfaces: NetworkInterface[];
  upstreamFindings: NormalizedUpstreamFinding[];
}) {
  return params.interfaces.map((networkInterface, index) => {
    const objectFindings = findingsForObject(params.upstreamFindings, [networkInterface.id, networkInterface.deviceId, networkInterface.securityZoneId ?? "", networkInterface.routeDomainId ?? ""]);
    const safetyContext = operationalSafetyContextForDevices({
      devices: params.devices,
      deviceIds: [networkInterface.deviceId],
      changeLabel: `${networkInterface.name} interface/gateway change`,
      blockWhenNoDevice: true,
    });
    const blockers = [
      ...(!networkInterface.subnetCidr && networkInterface.interfaceRole !== "loopback" ? ["No subnet CIDR is modeled for this routed interface."] : []),
      ...(!networkInterface.ipAddress && networkInterface.interfaceRole !== "loopback" ? ["No gateway/interface IP address is modeled for this routed interface."] : []),
      ...(!networkInterface.routeDomainId ? ["No route-domain membership is modeled for this interface."] : []),
      ...(!networkInterface.securityZoneId && networkInterface.interfaceRole !== "loopback" ? ["No security-zone binding is modeled for this interface."] : []),
      ...safetyContext.blockers,
    ];
    const dependencies = dependenciesWithGate(safetyContext.dependencies);

    return buildStep({
      id: stepIdForInterface(networkInterface.id),
      title: `Configure or confirm ${networkInterface.name}`,
      stageId: "implementation-stage-addressing-and-vlans",
      category: networkInterface.interfaceRole === "vlan-gateway" ? "vlan-and-interface" : "routed-interface",
      sequence: 200 + index,
      siteId: networkInterface.siteId,
      targetObjectType: "network-interface",
      targetObjectId: networkInterface.id,
      action: networkInterface.truthState === "configured" ? "verify" : "create",
      baseReadiness: readinessFromTruthState(networkInterface.truthState),
      baseBlockers: blockers,
      reviewReasons: [
        ...(networkInterface.truthState !== "configured" ? ["Interface is not currently confirmed as configured; implementation must verify before applying changes."] : []),
        ...safetyContext.reviewReasons,
      ],
      riskLevel: riskLevelForInterface(networkInterface),
      engineerReviewRequired: networkInterface.truthState !== "configured" || networkInterface.interfaceRole !== "vlan-gateway",
      dependencies,
      dependencyObjectIds: safetyContext.dependencyObjectIds,
      upstreamFindings: objectFindings,
      blastRadius: [
        `Site: ${networkInterface.siteId}.`,
        networkInterface.vlanId ? `VLAN ${networkInterface.vlanId}.` : "No VLAN-specific blast radius is modeled.",
        networkInterface.subnetCidr ? `Subnet ${networkInterface.subnetCidr}.` : "Subnet blast radius requires engineer confirmation.",
        networkInterface.securityZoneId ? `Security zone ${networkInterface.securityZoneId}.` : "Security-zone impact requires engineer confirmation.",
      ],
      implementationIntent: networkInterface.subnetCidr
        ? `Bind ${networkInterface.name} to ${networkInterface.subnetCidr}${networkInterface.ipAddress ? ` using ${networkInterface.ipAddress}` : " with engineer-confirmed addressing"}.`
        : `Confirm the interface purpose and addressing for ${networkInterface.name}.`,
      sourceEvidence: [
        `Interface role: ${networkInterface.interfaceRole}.`,
        networkInterface.subnetCidr ? `Subnet: ${networkInterface.subnetCidr}.` : "No subnet CIDR is modeled yet.",
        networkInterface.ipAddress ? `Interface/gateway IP: ${networkInterface.ipAddress}.` : "No gateway/interface IP is modeled yet.",
        networkInterface.securityZoneId ? `Security zone: ${networkInterface.securityZoneId}.` : "No security zone binding is modeled yet.",
        networkInterface.routeDomainId ? `Route domain: ${networkInterface.routeDomainId}.` : "No route-domain binding is modeled yet.",
      ],
      requiredEvidence: [
        "Configured interface exists on the intended device or gateway owner.",
        "Gateway IP is inside the subnet and is not a network or broadcast address.",
        "Interface is bound to the intended route domain and security zone.",
        "ARP/L2 adjacency or routed interface status is verified after implementation.",
      ],
      expectedOutcome: "The routed interface, gateway ownership, route-domain membership, and zone membership are explicit in the implementation record.",
      acceptanceCriteria: [
        "The interface has the intended IP/CIDR.",
        "The connected route appears in the expected route domain where applicable.",
        "The zone binding matches the authoritative security model.",
      ],
      rollbackIntent: "Restore or disable the changed interface/VLAN gateway and return gateway ownership to the prior known-good state.",
      notes: [
        ...networkInterface.notes,
        "Vendor syntax is intentionally omitted. This step describes what must exist, not how a specific platform configures it.",
      ],
    });
  });
}

function buildDhcpSteps(params: {
  dhcpPools: DhcpPool[];
  devices: NetworkDevice[];
  interfaces: NetworkInterface[];
  upstreamFindings: NormalizedUpstreamFinding[];
}) {
  return params.dhcpPools.map((dhcpPool, index) => {
    const matchingInterface = params.interfaces.find((networkInterface) => networkInterface.siteId === dhcpPool.siteId && networkInterface.vlanId === dhcpPool.vlanId);
    const safetyContext = operationalSafetyContextForDevices({
      devices: params.devices,
      deviceIds: matchingInterface ? [matchingInterface.deviceId] : [],
      changeLabel: `${dhcpPool.name} DHCP change`,
      blockWhenNoDevice: true,
    });
    const objectFindings = findingsForObject(params.upstreamFindings, [dhcpPool.id, matchingInterface?.id ?? ""]);

    return buildStep({
      id: createStepId(["dhcp-pool", dhcpPool.id]),
      title: `Configure or confirm DHCP pool for VLAN ${dhcpPool.vlanId}`,
      stageId: "implementation-stage-addressing-and-vlans",
      category: "dhcp",
      sequence: 260 + index,
      siteId: dhcpPool.siteId,
      targetObjectType: "dhcp-pool",
      targetObjectId: dhcpPool.id,
      action: dhcpPool.allocationState === "configured" ? "verify" : "create",
      baseReadiness: dhcpPool.gatewayIp ? readinessFromTruthState(dhcpPool.truthState) : "blocked",
      baseBlockers: [
        ...(!dhcpPool.gatewayIp ? ["DHCP pool has no modeled default gateway."] : []),
        ...(!matchingInterface ? ["No matching VLAN gateway interface was found for this DHCP pool."] : []),
        ...safetyContext.blockers,
      ],
      reviewReasons: [
        ...(dhcpPool.allocationState !== "configured" ? ["DHCP scope is not confirmed configured; options and exclusions need engineer confirmation."] : []),
        ...safetyContext.reviewReasons,
      ],
      riskLevel: "medium",
      engineerReviewRequired: true,
      dependencies: dependenciesWithGate([
        ...(matchingInterface ? [{ stepId: stepIdForInterface(matchingInterface.id), reason: "DHCP pool depends on the VLAN gateway/interface existing first." }] : []),
        ...safetyContext.dependencies,
      ]),
      dependencyObjectIds: safetyContext.dependencyObjectIds,
      upstreamFindings: objectFindings,
      blastRadius: [
        `Site: ${dhcpPool.siteId}.`,
        `VLAN ${dhcpPool.vlanId}.`,
        `Subnet ${dhcpPool.subnetCidr}.`,
        "Client onboarding and default-gateway assignment for this access segment.",
      ],
      implementationIntent: `Create or confirm a DHCP scope for ${dhcpPool.subnetCidr} with gateway ${dhcpPool.gatewayIp ?? "engineer-confirmed gateway"}.`,
      sourceEvidence: [
        `Subnet: ${dhcpPool.subnetCidr}.`,
        `Allocation state: ${dhcpPool.allocationState}.`,
        dhcpPool.gatewayIp ? `Gateway: ${dhcpPool.gatewayIp}.` : "No gateway modeled.",
      ],
      requiredEvidence: [
        "Pool network and default gateway match the authoritative subnet model.",
        "Exclusions/reservations protect the gateway and infrastructure addresses.",
        "A controlled client receives the intended address, gateway, and DNS options.",
      ],
      expectedOutcome: "Clients in this VLAN receive addresses from the intended subnet and use the intended gateway.",
      acceptanceCriteria: [
        "DHCP lease comes from the intended pool.",
        "Default gateway and DNS options match implementation requirements.",
        "No lease is handed out for reserved infrastructure addresses.",
      ],
      rollbackIntent: "Disable or remove the new DHCP scope and restore the prior DHCP/relay behavior for the VLAN.",
      notes: [
        ...dhcpPool.notes,
        "DNS, lease duration, exclusion ranges, and DHCP relay targets remain implementation-specific inputs.",
      ],
    });
  });
}

function buildRoutingSteps(params: {
  routeIntents: RouteIntent[];
  devices: NetworkDevice[];
  interfaces: NetworkInterface[];
  routeFindings: NormalizedUpstreamFinding[];
}) {
  return params.routeIntents.map((routeIntent, index) => {
    const nextHopInterface = routeIntent.nextHopObjectId ? params.interfaces.find((networkInterface) => networkInterface.id === routeIntent.nextHopObjectId) : undefined;
    const affectedDeviceIds = nextHopInterface ? [nextHopInterface.deviceId] : params.devices.filter((device) => routeIntent.siteId && device.siteId === routeIntent.siteId).map((device) => device.id);
    const routeRiskLevel = riskLevelForRouteIntent(routeIntent);
    const safetyContext = operationalSafetyContextForDevices({
      devices: params.devices,
      deviceIds: affectedDeviceIds,
      changeLabel: `${routeIntent.name} routing change`,
      blockWhenNoDevice: routeRiskLevel === "high",
    });
    const objectFindings = findingsForObject(params.routeFindings, [routeIntent.id, routeIntent.nextHopObjectId ?? "", routeIntent.routeDomainId, ...safetyContext.dependencyObjectIds]);
    const blockers = [
      ...(routeIntent.administrativeState === "missing" ? ["Routing engine marks this route intent as missing."] : []),
      ...(!routeIntent.nextHopObjectId && routeIntent.nextHopType !== "engineer-review" && routeIntent.routeKind !== "connected" ? ["Route has no concrete next-hop object modeled."] : []),
      ...(routeIntent.nextHopType === "engineer-review" ? ["Route next hop is explicitly marked for engineer review."] : []),
      ...(routeRiskLevel === "high" || routeIntent.administrativeState !== "present" ? safetyContext.blockers : []),
    ];
    const extraDependencies = [
      ...(nextHopInterface ? [{ stepId: stepIdForInterface(nextHopInterface.id), reason: "Route intent depends on the next-hop interface/gateway being implemented or verified first." }] : []),
      ...safetyContext.dependencies,
    ];

    return buildStep({
      id: stepIdForRouteIntent(routeIntent.id),
      title: `Apply or verify ${routeIntent.name}`,
      stageId: "implementation-stage-routing",
      category: "routing",
      sequence: 300 + index,
      siteId: routeIntent.siteId,
      targetObjectType: "route-intent",
      targetObjectId: routeIntent.id,
      action: routeIntent.administrativeState === "present" ? "verify" : routeIntent.administrativeState === "missing" ? "review" : "create",
      baseReadiness: readinessForRouteIntent(routeIntent),
      baseBlockers: blockers,
      reviewReasons: [
        ...(routeIntent.administrativeState === "review" ? ["Routing engine marked this route intent for review."] : []),
        ...safetyContext.reviewReasons,
      ],
      riskLevel: routeRiskLevel,
      engineerReviewRequired: true,
      dependencies: dependenciesWithGate(extraDependencies),
      dependencyObjectIds: safetyContext.dependencyObjectIds,
      upstreamFindings: objectFindings,
      blastRadius: [
        routeIntent.siteId ? `Site: ${routeIntent.siteId}.` : "Project/global route domain scope.",
        `Route domain: ${routeIntent.routeDomainName}.`,
        `Destination CIDR: ${routeIntent.destinationCidr}.`,
        `Path scope: ${routeIntent.routeKind} route via ${routeIntent.nextHopType}.`,
      ],
      implementationIntent: `Route ${routeIntent.destinationCidr} using ${routeIntent.nextHopType}${routeIntent.nextHopObjectId ? ` (${routeIntent.nextHopObjectId})` : " after engineer review"}.`,
      sourceEvidence: [
        ...routeIntent.evidence,
        `Administrative state: ${routeIntent.administrativeState}.`,
        `Route purpose: ${routeIntent.routePurpose}.`,
      ],
      requiredEvidence: [
        "Route exists in the intended route domain/table.",
        "Next hop is reachable or intentionally connected.",
        "Return path exists for traffic that requires bidirectional reachability.",
        "No more-specific or lower-distance route creates an unintended path.",
      ],
      expectedOutcome: "The route-domain model has the intended path without creating unmanaged overlap, blackhole, or unintended default-route behavior.",
      acceptanceCriteria: [
        "Route lookup for the target CIDR resolves to the intended next hop/path.",
        "Forward and return reachability checks pass where expected.",
        "Missing-forward and missing-return findings do not remain for this route scope.",
      ],
      rollbackIntent: "Remove or revert the changed route intent and restore the prior known-good route entry or path preference.",
      notes: routeIntent.notes,
    });
  });
}

function buildSecurityPolicySteps(params: {
  flowRequirements: SecurityFlowRequirement[];
  routeIntents: RouteIntent[];
  devices: NetworkDevice[];
  interfaces: NetworkInterface[];
  securityZones: SecurityZone[];
  securityFindings: NormalizedUpstreamFinding[];
  graphLookup: DependencyGraphLookup;
}) {
  return params.flowRequirements.map((flowRequirement, index) => {
    const objectFindings = findingsForObject(params.securityFindings, [
      flowRequirement.id,
      flowRequirement.sourceZoneId,
      flowRequirement.destinationZoneId,
      flowRequirement.observedPolicyRuleId ?? "",
      ...flowRequirement.matchedPolicyRuleIds,
      ...flowRequirement.matchedNatRuleIds,
    ]);
    const dependencyContext = dependenciesForSecurityFlow({
      flowRequirement,
      interfaces: params.interfaces,
      routeIntents: params.routeIntents,
      securityZones: params.securityZones,
      graphLookup: params.graphLookup,
    });
    const affectedDeviceIds = unique([...dependencyContext.sourceInterfaces, ...dependencyContext.destinationInterfaces].map((networkInterface) => networkInterface.deviceId));
    const safetyContext = operationalSafetyContextForDevices({
      devices: params.devices,
      deviceIds: affectedDeviceIds,
      changeLabel: `${flowRequirement.name} security-policy change`,
      blockWhenNoDevice: riskLevelForSecurityFlow(flowRequirement) !== "low",
    });
    const preciseDependencies = [...dependencyContext.dependencies, ...safetyContext.dependencies];
    const blockers = [
      ...(flowRequirement.state === "conflict" ? ["Security engine detected conflicting policy behavior for this flow."] : []),
      ...(flowRequirement.state === "missing-policy" ? ["Required security policy is missing for this flow."] : []),
      ...(flowRequirement.state === "missing-nat" ? ["Flow requires NAT but no matching NAT rule covers it."] : []),
      ...safetyContext.blockers,
    ];
    const graphDependencyReviewReasons = preciseDependencies.length === 0
      ? ["No exact graph-driven interface/route dependency could be resolved for this security flow; engineer must confirm path prerequisites."]
      : [`Resolved ${preciseDependencies.length} exact graph-driven implementation dependenc${preciseDependencies.length === 1 ? "y" : "ies"} for this security flow.`];

    return buildStep({
      id: stepIdForSecurityFlow(flowRequirement.id),
      title: `Implement or verify ${flowRequirement.name}`,
      stageId: "implementation-stage-security",
      category: flowRequirement.natRequired ? "security-policy-and-nat" : "security-policy",
      sequence: 400 + index,
      targetObjectType: "security-flow",
      targetObjectId: flowRequirement.id,
      action: flowRequirement.state === "satisfied" ? "verify" : "create",
      baseReadiness: readinessForSecurityFlow(flowRequirement),
      baseBlockers: blockers,
      reviewReasons: [
        ...(flowRequirement.state === "review" ? ["Security engine marked this flow for review."] : []),
        ...graphDependencyReviewReasons,
        ...(flowRequirement.ruleOrderSensitive ? ["Flow is rule-order sensitive; verify first-match behavior before and after implementation."] : []),
        ...(flowRequirement.loggingRequired ? ["Logging is required for this flow or boundary."] : []),
        ...safetyContext.reviewReasons,
      ],
      riskLevel: riskLevelForSecurityFlow(flowRequirement),
      engineerReviewRequired: true,
      dependencies: dependenciesWithGate(preciseDependencies.map((dependency) => ({ stepId: dependency.stepId, reason: dependency.reason }))),
      dependencyObjectIds: unique([...dependencyContext.dependencyObjectIds, ...safetyContext.dependencyObjectIds, ...preciseDependencies.flatMap((dependency) => dependency.objectIds)]),
      graphDependencyEdgeIds: unique([...dependencyContext.graphEdgeIds, ...preciseDependencies.flatMap((dependency) => dependency.graphEdgeIds)]),
      upstreamFindings: objectFindings,
      blastRadius: [
        `Source zone: ${flowRequirement.sourceZoneName}.`,
        `Destination zone: ${flowRequirement.destinationZoneName}.`,
        `Services: ${flowRequirement.serviceNames.join(", ")}.`,
        flowRequirement.natRequired ? "NAT/egress translation behavior." : "Security policy action only; no NAT is expected for this flow.",
      ],
      implementationIntent: `${flowRequirement.expectedAction.toUpperCase()} ${flowRequirement.sourceZoneName} to ${flowRequirement.destinationZoneName} for ${flowRequirement.serviceNames.join(", ")}${flowRequirement.natRequired ? " with NAT coverage" : ""}.`,
      sourceEvidence: [
        `Observed action: ${flowRequirement.observedPolicyAction ?? "no modeled policy"}.`,
        `Flow state: ${flowRequirement.state}.`,
        `Matched policy rules: ${flowRequirement.matchedPolicyRuleIds.length}.`,
        `Matched NAT rules: ${flowRequirement.matchedNatRuleIds.length}.`,
        `Graph dependency count: ${preciseDependencies.length}.`,
        dependencyContext.sourceZone ? `Source zone route domain: ${dependencyContext.sourceZone.routeDomainId}.` : "Source zone route domain not resolved.",
        dependencyContext.destinationZone ? `Destination zone route domain: ${dependencyContext.destinationZone.routeDomainId}.` : "Destination zone route domain not resolved.",
        `Rationale: ${flowRequirement.rationale}.`,
      ],
      requiredEvidence: [
        "Policy rule exists with the intended source zone, destination zone, service set, and action.",
        "First-match/order behavior does not shadow a stricter or safer rule.",
        flowRequirement.expectedAction === "deny" ? "Negative test proves the blocked flow fails closed." : "Positive test proves the allowed flow succeeds only for intended services.",
        ...(flowRequirement.natRequired ? ["NAT translation is observed for this flow and tied to the expected rule."] : []),
        ...(flowRequirement.loggingRequired ? ["Log entry proves policy match and action for this flow."] : []),
      ],
      expectedOutcome: "The intended allow, deny, review, and NAT posture is explicit before vendor-specific rule translation.",
      acceptanceCriteria: [
        "Expected policy action is observed from the correct source and destination zones.",
        "Services outside the intended list do not inherit accidental access.",
        "Logging and rule order are verified where the security engine requires them.",
      ],
      rollbackIntent: "Disable or remove the changed policy/NAT intent and restore the previous policy state while preserving explicit deny posture for high-risk zones.",
      notes: flowRequirement.notes,
    });
  });
}

function buildNatRuleSteps(params: {
  natRules: NatRule[];
  natReviews: SecurityNatReview[];
  flowRequirements: SecurityFlowRequirement[];
  devices: NetworkDevice[];
  interfaces: NetworkInterface[];
  routeIntents: RouteIntent[];
  securityZones: SecurityZone[];
  securityFindings: NormalizedUpstreamFinding[];
  graphLookup: DependencyGraphLookup;
}) {
  return params.natRules
    .filter((natRule) => natRule.status !== "not-required")
    .map((natRule, index) => {
      const natReview = params.natReviews.find((review) => review.natRuleId === natRule.id);
      const dependencyContext = dependenciesForNatRule({
        natRule,
        natReview,
        flowRequirements: params.flowRequirements,
        interfaces: params.interfaces,
        routeIntents: params.routeIntents,
        securityZones: params.securityZones,
        graphLookup: params.graphLookup,
      });
      const sourceInterfaces = params.interfaces.filter((networkInterface) => networkInterface.securityZoneId === natRule.sourceZoneId);
      const safetyContext = operationalSafetyContextForDevices({
        devices: params.devices,
        deviceIds: sourceInterfaces.map((networkInterface) => networkInterface.deviceId),
        changeLabel: `${natRule.name} NAT change`,
        blockWhenNoDevice: true,
      });
      const missingFlowNames = (natReview?.missingFlowRequirementIds ?? [])
        .map((flowRequirementId) => params.flowRequirements.find((flow) => flow.id === flowRequirementId)?.name ?? flowRequirementId);
      const objectFindings = findingsForObject(params.securityFindings, [natRule.id, natRule.sourceZoneId, natRule.destinationZoneId ?? "", ...(natReview?.coveredFlowRequirementIds ?? []), ...(natReview?.missingFlowRequirementIds ?? [])]);
      const baseReadiness: StepReadiness = natReview?.state ?? (natRule.translatedAddressMode === "review" ? "review" : readinessFromTruthState(natRule.truthState));
      const blockers = [
        ...(natReview?.state === "blocked" ? ["Security NAT review marked this NAT rule blocked."] : []),
        ...(natReview && natReview.missingFlowRequirementIds.length > 0 ? [`NAT rule does not cover required flow(s): ${missingFlowNames.join(", ")}.`] : []),
        ...(natRule.translatedAddressMode === "review" || natRule.translatedAddressMode === "not-required" ? ["NAT translated-address mode is not concrete for a required/review NAT item."] : []),
        ...safetyContext.blockers,
      ];

      return buildStep({
        id: stepIdForNatRule(natRule.id),
        title: `Configure or confirm ${natRule.name}`,
        stageId: "implementation-stage-security",
        category: "nat",
        sequence: 470 + index,
        targetObjectType: "nat-rule",
        targetObjectId: natRule.id,
        action: natRule.truthState === "configured" ? "verify" : "create",
        baseReadiness,
        baseBlockers: blockers,
        reviewReasons: [
          ...(natReview?.state === "review" ? ["Security NAT review marked this NAT rule for engineer review."] : []),
          ...(natRule.truthState !== "configured" ? ["NAT rule is not currently confirmed configured; verify before applying device changes."] : []),
          ...safetyContext.reviewReasons,
        ],
        riskLevel: "high",
        engineerReviewRequired: true,
        dependencies: dependenciesWithGate([
          ...dependencyContext.dependencies.map((dependency) => ({ stepId: dependency.stepId, reason: dependency.reason })),
          ...safetyContext.dependencies,
        ]),
        dependencyObjectIds: unique([...dependencyContext.dependencyObjectIds, ...safetyContext.dependencyObjectIds, ...dependencyContext.dependencies.flatMap((dependency) => dependency.objectIds)]),
        graphDependencyEdgeIds: unique([...dependencyContext.graphEdgeIds, ...dependencyContext.dependencies.flatMap((dependency) => dependency.graphEdgeIds)]),
        upstreamFindings: objectFindings,
        blastRadius: [
          `Source zone: ${natRule.sourceZoneId}.`,
          natRule.destinationZoneId ? `Destination zone: ${natRule.destinationZoneId}.` : "Destination/egress zone requires engineer confirmation.",
          natRule.sourceSubnetCidrs.length > 0 ? `Source subnet(s): ${natRule.sourceSubnetCidrs.join(", ")}.` : "Source subnet scope requires engineer confirmation.",
          "Internet/egress translation and return traffic behavior.",
        ],
        implementationIntent: `Translate ${natRule.sourceSubnetCidrs.length > 0 ? natRule.sourceSubnetCidrs.join(", ") : "approved source subnets"} using ${natRule.translatedAddressMode}.`,
        sourceEvidence: [
          `NAT status: ${natRule.status}.`,
          `Translated address mode: ${natRule.translatedAddressMode}.`,
          natReview ? `NAT review state: ${natReview.state}.` : "No security NAT review object was generated for this NAT rule.",
          natReview ? `Covered required flows: ${natReview.coveredFlowRequirementIds.length}.` : "Covered required flows unknown.",
          `Graph dependency count: ${dependencyContext.dependencies.length}.`,
        ],
        requiredEvidence: [
          "NAT rule exists with expected source zone/subnet and destination/egress scope.",
          "Translation mode is concrete and matches the design intent.",
          "Each NAT-required flow has an observed translation/hit counter or equivalent proof.",
          "Non-NAT traffic does not accidentally match this translation rule.",
        ],
        expectedOutcome: "Egress flows that require translation have explicit NAT intent and do not rely on implicit platform defaults.",
        acceptanceCriteria: [
          "NAT-required flows translate as intended.",
          "NAT rule does not cover unintended source zones or trusted east-west traffic.",
          "Policy and NAT evidence agree on the same flow boundary.",
        ],
        rollbackIntent: "Disable or remove the NAT rule and restore the prior translation behavior while preserving management access.",
        notes: natRule.notes,
      });
    });
}

function buildVerificationChecks(params: {
  steps: ImplementationPlanStep[];
  routeIntents: RouteIntent[];
  flowRequirements: SecurityFlowRequirement[];
  dhcpPools: DhcpPool[];
}) {
  const checks: ImplementationPlanVerificationCheck[] = [];
  const stepById = new Map(params.steps.map((step) => [step.id, step]));
  const stepsByTargetObjectId = new Map<string, ImplementationPlanStep[]>();

  for (const step of params.steps) {
    if (!step.targetObjectId) continue;
    stepsByTargetObjectId.set(step.targetObjectId, [...(stepsByTargetObjectId.get(step.targetObjectId) ?? []), step]);
  }

  function relatedStepsForObject(objectId: string) {
    return stepsByTargetObjectId.get(objectId) ?? [];
  }

  function readinessForStepIds(stepIds: string[]): ImplementationPlanVerificationCheck["readiness"] {
    const relatedSteps = stepIds.map((stepId) => stepById.get(stepId)).filter((step): step is ImplementationPlanStep => Boolean(step));
    if (relatedSteps.some((step) => step.readiness === "blocked")) return "blocked";
    if (relatedSteps.some((step) => step.readiness === "review" || step.readiness === "deferred")) return "review";
    return "ready";
  }

  function blockingStepIds(stepIds: string[]) {
    return stepIds
      .map((stepId) => stepById.get(stepId))
      .filter((step): step is ImplementationPlanStep => step !== undefined && step.readiness === "blocked")
      .map((step) => step.id);
  }

  function check(input: Omit<ImplementationPlanVerificationCheck, "readiness" | "blockingStepIds">): ImplementationPlanVerificationCheck {
    return {
      ...input,
      relatedStepIds: unique(input.relatedStepIds),
      relatedObjectIds: unique(input.relatedObjectIds),
      requiredEvidence: unique(input.requiredEvidence),
      acceptanceCriteria: unique(input.acceptanceCriteria),
      readiness: readinessForStepIds(input.relatedStepIds),
      blockingStepIds: blockingStepIds(input.relatedStepIds),
      notes: unique(input.notes),
    };
  }

  for (const safetyStep of params.steps.filter((step) => step.category === "operational-safety")) {
    checks.push(check({
      id: createCheckId(["operational-safety", safetyStep.targetObjectId ?? safetyStep.id]),
      name: `Verify operational safety gate for ${safetyStep.title.replace(/^Confirm operational safety for /, "")}`,
      checkType: "operational-safety",
      verificationScope: "safety",
      sourceEngine: "implementation",
      relatedStepIds: [safetyStep.id],
      relatedObjectIds: [safetyStep.targetObjectId ?? "", ...safetyStep.dependencyObjectIds],
      expectedResult: "Management access is tested, current configuration is backed up, and a fallback or rollback access path exists before risky changes begin.",
      requiredEvidence: [
        "Management IP or access path is modeled and tested from the intended admin source.",
        "Current configuration backup, baseline, or known-good snapshot is captured.",
        "Console, out-of-band, fallback, or rollback access path is documented.",
      ],
      acceptanceCriteria: [
        "The safety step is not blocked.",
        "An engineer can explain how to recover if the change breaks remote access.",
        "The device baseline can be restored without relying on the changed path.",
      ],
      failureImpact: "Engineers can lock themselves out, lose rollback access, or perform risky changes without recovery proof.",
      notes: ["V1D verifies operational safety per device instead of only as a broad category."],
    }));
  }

  for (const interfaceStep of params.steps.filter((step) => step.targetObjectType === "network-interface")) {
    checks.push(check({
      id: createCheckId(["interface", interfaceStep.targetObjectId ?? interfaceStep.id]),
      name: `Verify gateway/interface object for ${interfaceStep.title}`,
      checkType: "addressing",
      verificationScope: "object",
      sourceEngine: "object-model",
      relatedStepIds: [interfaceStep.id, ...interfaceStep.dependencies.map((dependency) => dependency.stepId)],
      relatedObjectIds: [interfaceStep.targetObjectId ?? "", ...interfaceStep.dependencyObjectIds],
      expectedResult: "The routed interface/gateway exists on the intended device, owns the intended subnet, and is bound to the intended route domain and security zone.",
      requiredEvidence: [
        "Interface exists on the expected device or gateway owner.",
        "Gateway IP is inside the intended subnet and is not a network or broadcast address.",
        "Interface route-domain and security-zone bindings match the authoritative object model.",
      ],
      acceptanceCriteria: [
        "Connected route or local adjacency appears where expected.",
        "The gateway responds from the intended segment when it is supposed to.",
        "No duplicate gateway ownership is detected.",
      ],
      failureImpact: "Users may land in the wrong subnet, fail DHCP, or route through an unintended gateway.",
      notes: ["This replaces broad gateway validation with per-interface verification."],
    }));
  }

  for (const routeIntent of params.routeIntents) {
    const routeSteps = relatedStepsForObject(routeIntent.id);
    checks.push(check({
      id: createCheckId(["route-intent", routeIntent.id]),
      name: `Verify route intent: ${routeIntent.name}`,
      checkType: "routing",
      verificationScope: "route",
      sourceEngine: "routing",
      relatedStepIds: routeSteps.length > 0 ? routeSteps.flatMap((step) => [step.id, ...step.dependencies.map((dependency) => dependency.stepId)]) : [],
      relatedObjectIds: [routeIntent.id, routeIntent.routeDomainId, routeIntent.nextHopObjectId ?? "", routeIntent.siteId ?? ""],
      expectedResult: `Route lookup for ${routeIntent.destinationCidr} resolves in ${routeIntent.routeDomainName} using the intended ${routeIntent.nextHopType} path.`,
      requiredEvidence: [
        "Route exists in the intended route domain/table or is intentionally connected.",
        "Next hop is reachable when a next-hop object is modeled.",
        "Return path exists for bidirectional traffic where the design requires it.",
        "No more-specific, lower-distance, or conflicting route steals the path.",
      ],
      acceptanceCriteria: [
        "Forward route lookup resolves to the intended next hop or connected path.",
        "Reachability test matches the intended route purpose.",
        "Routing findings for this route object are no longer blocking.",
      ],
      failureImpact: "Branch, HQ, internet, or service reachability may fail or route through unintended paths.",
      notes: [
        `Route kind: ${routeIntent.routeKind}.`,
        `Administrative state: ${routeIntent.administrativeState}.`,
        "V1D verifies each route intent individually instead of using one routing umbrella check.",
      ],
    }));
  }

  for (const flowRequirement of params.flowRequirements) {
    const flowSteps = relatedStepsForObject(flowRequirement.id);
    checks.push(check({
      id: createCheckId(["security-flow", flowRequirement.id]),
      name: `Verify security flow: ${flowRequirement.name}`,
      checkType: "policy",
      verificationScope: "flow",
      sourceEngine: "security-policy",
      relatedStepIds: flowSteps.length > 0 ? flowSteps.flatMap((step) => [step.id, ...step.dependencies.map((dependency) => dependency.stepId)]) : [],
      relatedObjectIds: [
        flowRequirement.id,
        flowRequirement.sourceZoneId,
        flowRequirement.destinationZoneId,
        flowRequirement.observedPolicyRuleId ?? "",
        ...flowRequirement.matchedPolicyRuleIds,
        ...flowRequirement.matchedNatRuleIds,
      ],
      expectedResult: `${flowRequirement.expectedAction.toUpperCase()} posture is proven from ${flowRequirement.sourceZoneName} to ${flowRequirement.destinationZoneName} for ${flowRequirement.serviceNames.join(", ")}.`,
      requiredEvidence: [
        "Source zone, destination zone, service set, and action match the authoritative security flow.",
        flowRequirement.expectedAction === "deny" ? "Negative test proves the blocked flow fails closed." : "Positive test proves only intended services succeed.",
        "Rule order or first-match behavior does not shadow the intended policy.",
        ...(flowRequirement.loggingRequired ? ["Policy log entry proves the expected rule/action was matched."] : []),
        ...(flowRequirement.natRequired ? ["NAT translation evidence exists for this security flow."] : []),
      ],
      acceptanceCriteria: [
        "Expected action is observed from the correct source and destination zones.",
        "Services outside the intended list do not inherit accidental access.",
        "Security findings for this flow are resolved or explicitly accepted.",
      ],
      failureImpact: "The network may expose trusted services or block required business traffic.",
      notes: [
        `Flow state: ${flowRequirement.state}.`,
        `NAT required: ${flowRequirement.natRequired ? "yes" : "no"}.`,
        "V1D verifies each security flow individually instead of hiding it inside one policy check.",
      ],
    }));
  }

  for (const natStep of params.steps.filter((step) => step.targetObjectType === "nat-rule")) {
    checks.push(check({
      id: createCheckId(["nat-rule", natStep.targetObjectId ?? natStep.id]),
      name: `Verify NAT translation object for ${natStep.title}`,
      checkType: "nat",
      verificationScope: "object",
      sourceEngine: "security-policy",
      relatedStepIds: [natStep.id, ...natStep.dependencies.map((dependency) => dependency.stepId)],
      relatedObjectIds: [natStep.targetObjectId ?? "", ...natStep.dependencyObjectIds],
      expectedResult: "NAT-required flows translate through the intended NAT rule without translating unrelated trusted east-west traffic.",
      requiredEvidence: [
        "NAT rule exists with concrete translated-address behavior.",
        "Source zone and destination zone match the authoritative NAT review.",
        "Covered NAT-required flow IDs match the security engine review.",
        "No unrelated trusted east-west flow is accidentally translated.",
      ],
      acceptanceCriteria: [
        "NAT hit/translation evidence maps to the expected flow.",
        "Policy evidence and NAT evidence agree.",
        "NAT review is not blocked.",
      ],
      failureImpact: "Internet egress can fail, return traffic can break, or unintended source networks can be exposed through translation.",
      notes: ["Pair NAT proof with policy proof. A NAT hit alone does not prove the boundary is correct."],
    }));
  }

  for (const dhcpPool of params.dhcpPools) {
    const dhcpSteps = relatedStepsForObject(dhcpPool.id);
    checks.push(check({
      id: createCheckId(["dhcp-pool", dhcpPool.id]),
      name: `Verify DHCP pool: ${dhcpPool.name}`,
      checkType: "dhcp",
      verificationScope: "object",
      sourceEngine: "object-model",
      relatedStepIds: dhcpSteps.length > 0 ? dhcpSteps.flatMap((step) => [step.id, ...step.dependencies.map((dependency) => dependency.stepId)]) : [],
      relatedObjectIds: [dhcpPool.id, dhcpPool.siteId, String(dhcpPool.vlanId), dhcpPool.subnetCidr],
      expectedResult: `Clients in VLAN ${dhcpPool.vlanId} receive addresses from ${dhcpPool.subnetCidr} with gateway ${dhcpPool.gatewayIp ?? "engineer-confirmed gateway"}.`,
      requiredEvidence: [
        "Pool network, default gateway, DNS options, exclusions, and reservations are reviewed.",
        "A controlled client receives a lease from the intended pool.",
        "Gateway and DNS options in the lease match implementation requirements.",
      ],
      acceptanceCriteria: [
        "Lease address belongs to the intended subnet.",
        "No infrastructure or reserved address is handed out.",
        "Client can reach the intended gateway and allowed services.",
      ],
      failureImpact: "Access networks may appear configured but clients will fail onboarding or route incorrectly.",
      notes: ["Confirm exclusions, reservations, relay behavior, and leases after implementation."],
    }));
  }

  const evidenceStepIds = params.steps.map((step) => step.id).slice(0, 40);
  checks.push(check({
    id: "implementation-check-step-level-evidence",
    name: "Verify each implementation step has evidence, blast radius, and rollback proof",
    checkType: "documentation",
    verificationScope: "cross-cutting",
    sourceEngine: "implementation",
    relatedStepIds: evidenceStepIds,
    relatedObjectIds: params.steps.flatMap((step) => [step.targetObjectId ?? "", ...step.dependencyObjectIds]).slice(0, 80),
    expectedResult: "Every executable or review step lists required evidence, blast radius, acceptance criteria, and rollback intent.",
    requiredEvidence: [
      "Every step has non-empty required evidence.",
      "Every step has non-empty blast radius.",
      "Every step has non-empty acceptance criteria.",
      "Every step has a rollback intent.",
    ],
    acceptanceCriteria: [
      "No implementation step is reduced to a generic checklist item.",
      "Every blocked step has a clear reason and remediation path.",
    ],
    failureImpact: "The plan becomes a checklist instead of an engineer-executable change plan.",
    notes: ["This check is the V1D guardrail against shallow implementation planning."],
  }));

  checks.push(check({
    id: "implementation-check-rollback-readiness",
    name: "Verify rollback readiness before execution",
    checkType: "rollback",
    verificationScope: "cross-cutting",
    sourceEngine: "implementation",
    relatedStepIds: params.steps.filter((step) => step.action === "create" || step.action === "update" || step.readiness !== "ready" || step.riskLevel === "high").map((step) => step.id).slice(0, 40),
    relatedObjectIds: params.steps.filter((step) => step.action === "create" || step.action === "update" || step.riskLevel === "high").flatMap((step) => [step.targetObjectId ?? "", ...step.dependencyObjectIds]).slice(0, 80),
    expectedResult: "Risky and mutating steps have a documented rollback trigger, rollback intent, and recovery path before change execution.",
    requiredEvidence: [
      "Rollback trigger is documented for routing, security, NAT, DHCP, and interface changes.",
      "Current baseline or config backup exists for affected devices.",
      "Management/fallback access remains available after rollback.",
    ],
    acceptanceCriteria: [
      "Blocked steps stop the change instead of being carried into execution.",
      "Rollback does not accidentally open guest, WAN, or management-plane access.",
    ],
    failureImpact: "A failed change may be unrecoverable or may recover service by weakening security posture.",
    notes: ["Rollback verification is now part of the verification matrix, not only a separate narrative section."],
  }));

  checks.push(check({
    id: "implementation-check-documentation-and-as-built",
    name: "Verify final documentation and as-built record",
    checkType: "documentation",
    verificationScope: "cross-cutting",
    sourceEngine: "implementation",
    relatedStepIds: params.steps.map((step) => step.id).slice(0, 40),
    relatedObjectIds: params.steps.flatMap((step) => [step.targetObjectId ?? "", ...step.dependencyObjectIds]).slice(0, 80),
    expectedResult: "The final report identifies what was implemented, what was deferred, what was rolled back, and what still requires engineer review.",
    requiredEvidence: [
      "Implemented, deferred, blocked, and rolled-back items are listed.",
      "As-built notes reflect actual object IDs and flow IDs, not generic labels.",
      "Remaining review/blocker findings are visible to future engineers.",
    ],
    acceptanceCriteria: [
      "Documentation does not hide blocked implementation readiness.",
      "Report/diagram stages can consume the verification matrix without inventing truth.",
    ],
    failureImpact: "The design may work temporarily but future engineers cannot tell what changed or what remains unsafe.",
    notes: ["This check prepares V1 report/diagram truth without moving frontend authority into the browser."],
  }));

  return checks;
}

function buildRollbackActions(steps: ImplementationPlanStep[]) {
  const rollbackCandidateSteps = steps.filter((step) => step.action === "create" || step.action === "update" || step.readiness !== "ready");
  const actions: ImplementationPlanRollbackAction[] = [];

  const operationalSafetyStepIds = rollbackCandidateSteps.filter((step) => step.category === "operational-safety").map((step) => step.id);
  if (operationalSafetyStepIds.length > 0) {
    actions.push({
      id: createRollbackId(["operational", "safety", "stop"]),
      name: "Stop or recover when operational safety is not proven",
      relatedStepIds: operationalSafetyStepIds.slice(0, 30),
      triggerCondition: "Management access, configuration backup, or fallback/rollback path is missing or fails validation.",
      rollbackIntent: "Do not proceed with device-facing changes. Restore the approved baseline, keep existing access paths intact, and re-plan after safety evidence is modeled.",
      notes: ["This rollback action exists before vendor commands because the safest rollback is often stopping before touching the device."],
    });
  }

  const addressingStepIds = rollbackCandidateSteps.filter((step) => step.category === "vlan-and-interface" || step.category === "routed-interface" || step.category === "dhcp").map((step) => step.id);
  if (addressingStepIds.length > 0) {
    actions.push({
      id: createRollbackId(["addressing", "interface", "dhcp"]),
      name: "Rollback addressing, VLAN, interface, and DHCP changes",
      relatedStepIds: addressingStepIds.slice(0, 30),
      triggerCondition: "Gateway reachability, DHCP assignment, or local VLAN access fails after implementation.",
      rollbackIntent: "Restore the prior VLAN/interface/DHCP state or disable the new gateway/pool until the design is corrected.",
      notes: ["Capture existing device state before applying changes; vendor commands are intentionally deferred."],
    });
  }

  const routingStepIds = rollbackCandidateSteps.filter((step) => step.category === "routing").map((step) => step.id);
  if (routingStepIds.length > 0) {
    actions.push({
      id: createRollbackId(["routing", "changes"]),
      name: "Rollback routing changes",
      relatedStepIds: routingStepIds.slice(0, 30),
      triggerCondition: "Critical site, branch, default-route, or service reachability fails or routes unexpectedly.",
      rollbackIntent: "Remove or revert the newly introduced route intent and restore the prior known-good route path.",
      notes: ["Rollback must preserve existing management access. Do not remove the only path used to administer remote devices."],
    });
  }

  const securityStepIds = rollbackCandidateSteps.filter((step) => step.category === "security-policy" || step.category === "security-policy-and-nat" || step.category === "nat").map((step) => step.id);
  if (securityStepIds.length > 0) {
    actions.push({
      id: createRollbackId(["security", "nat", "changes"]),
      name: "Rollback security policy and NAT changes",
      relatedStepIds: securityStepIds.slice(0, 30),
      triggerCondition: "Required business traffic is blocked, forbidden traffic is allowed, or NAT breaks egress.",
      rollbackIntent: "Restore the previous policy/NAT rule state while preserving explicit deny behavior for high-risk zones.",
      notes: ["Rollback should not accidentally open guest, WAN, or management-plane access."],
    });
  }

  const blockedStepIds = steps.filter((step) => step.readiness === "blocked").map((step) => step.id);
  if (blockedStepIds.length > 0) {
    actions.push({
      id: createRollbackId(["stop", "blocked", "execution"]),
      name: "Stop execution when blocked steps remain",
      relatedStepIds: blockedStepIds.slice(0, 30),
      triggerCondition: "Any blocked implementation step remains inside the intended change window scope.",
      rollbackIntent: "Do not begin the change. Return to design remediation and regenerate the implementation plan.",
      notes: ["A blocked V1 step is a stop condition, not a suggestion."],
    });
  }

  return actions;
}

function buildImplementationFindings(params: {
  steps: ImplementationPlanStep[];
  verificationChecks: ImplementationPlanVerificationCheck[];
  upstreamFindings: NormalizedUpstreamFinding[];
}) {
  const findings: ImplementationPlanFinding[] = [];
  const blockedSteps = params.steps.filter((step) => step.readiness === "blocked");
  const reviewSteps = params.steps.filter((step) => step.readiness === "review");
  const missingEvidenceSteps = params.steps.filter((step) => step.requiredEvidence.length === 0 || step.blastRadius.length === 0 || !step.rollbackIntent);
  const dependencyLightSteps = params.steps.filter((step) => step.id !== PREP_STEP_ID && step.dependencies.length === 0);
  const blockedOperationalSafetySteps = params.steps.filter((step) => step.category === "operational-safety" && step.readiness === "blocked");
  const highRiskStepsWithoutSafetyDependency = params.steps.filter((step) =>
    step.riskLevel === "high" &&
    step.category !== "preparation" &&
    step.category !== "operational-safety" &&
    !step.dependencies.some((dependency) => dependency.stepId.includes("operational-safety")),
  );
  const objectOrFlowStepCount = params.steps.filter((step) =>
    step.targetObjectType === "network-interface" ||
    step.targetObjectType === "route-intent" ||
    step.targetObjectType === "security-flow" ||
    step.targetObjectType === "nat-rule" ||
    step.targetObjectType === "dhcp-pool",
  ).length;
  const objectOrFlowVerificationCount = params.verificationChecks.filter((check) =>
    check.verificationScope === "object" || check.verificationScope === "route" || check.verificationScope === "flow" || check.verificationScope === "safety",
  ).length;
  const incompleteVerificationChecks = params.verificationChecks.filter((check) =>
    check.relatedStepIds.length === 0 ||
    check.relatedObjectIds.length === 0 ||
    check.requiredEvidence.length === 0 ||
    check.acceptanceCriteria.length === 0,
  );

  if (objectOrFlowStepCount > objectOrFlowVerificationCount || incompleteVerificationChecks.length > 0) {
    findings.push({
      severity: "ERROR",
      code: "IMPLEMENTATION_VERIFICATION_MATRIX_INCOMPLETE",
      title: "Implementation verification matrix is incomplete",
      detail: `${objectOrFlowStepCount} implementation object/flow step(s) require object-level verification; ${objectOrFlowVerificationCount} object, route, flow, or safety check(s) were generated and ${incompleteVerificationChecks.length} check(s) are missing related steps, objects, evidence, or acceptance criteria.`,
      affectedStepIds: incompleteVerificationChecks.flatMap((check) => check.relatedStepIds).slice(0, 30),
      remediation: "Generate route, security-flow, NAT, DHCP, interface, safety, rollback, and documentation verification checks with concrete related objects, required evidence, and acceptance criteria.",
    });
  }

  if (blockedOperationalSafetySteps.length > 0) {
    findings.push({
      severity: "ERROR",
      code: "IMPLEMENTATION_OPERATIONAL_SAFETY_BLOCKED",
      title: "Operational safety gates block risky implementation",
      detail: `${blockedOperationalSafetySteps.length} device safety gate(s) are blocked because management access or recovery prerequisites are missing.`,
      affectedStepIds: blockedOperationalSafetySteps.map((step) => step.id).slice(0, 30),
      remediation: "Model and verify management access, current-config backup, and fallback/rollback access before executing device-facing changes.",
    });
  }

  if (highRiskStepsWithoutSafetyDependency.length > 0) {
    findings.push({
      severity: "ERROR",
      code: "IMPLEMENTATION_HIGH_RISK_STEP_WITHOUT_SAFETY_GATE",
      title: "High-risk implementation steps are missing operational safety dependencies",
      detail: `${highRiskStepsWithoutSafetyDependency.length} high-risk step(s) do not depend on a device operational-safety gate.`,
      affectedStepIds: highRiskStepsWithoutSafetyDependency.map((step) => step.id).slice(0, 30),
      remediation: "Attach high-risk route, security, NAT, and device-facing changes to the affected device safety gate before execution.",
    });
  }

  if (blockedSteps.length > 0) {
    findings.push({
      severity: "ERROR",
      code: "IMPLEMENTATION_BLOCKED_STEPS_PRESENT",
      title: "Implementation plan contains blocked steps",
      detail: `${blockedSteps.length} implementation step(s) are blocked by missing route, graph, policy, NAT, DHCP, or dependency information.`,
      affectedStepIds: blockedSteps.map((step) => step.id).slice(0, 30),
      remediation: "Resolve blocked steps or explicitly remove them from the implementation scope before treating the plan as executable.",
    });
  }

  if (reviewSteps.length > 0) {
    findings.push({
      severity: "WARNING",
      code: "IMPLEMENTATION_ENGINEER_REVIEW_REQUIRED",
      title: "Implementation plan still requires engineer review",
      detail: `${reviewSteps.length} implementation step(s) require engineer review before vendor-specific translation.`,
      affectedStepIds: reviewSteps.map((step) => step.id).slice(0, 30),
      remediation: "Confirm device ownership, next hops, security rule behavior, NAT coverage, DHCP options, evidence, and rollback before implementation.",
    });
  }

  if (missingEvidenceSteps.length > 0) {
    findings.push({
      severity: "ERROR",
      code: "IMPLEMENTATION_STEP_EVIDENCE_INCOMPLETE",
      title: "Implementation steps are missing evidence, blast radius, or rollback detail",
      detail: `${missingEvidenceSteps.length} step(s) do not carry complete V1 engineering metadata.`,
      affectedStepIds: missingEvidenceSteps.map((step) => step.id).slice(0, 30),
      remediation: "Every step must include blast radius, required evidence, acceptance criteria, and rollback intent.",
    });
  }

  if (dependencyLightSteps.length > 0) {
    findings.push({
      severity: "ERROR",
      code: "IMPLEMENTATION_DEPENDENCIES_MISSING",
      title: "Implementation steps are missing dependency gates",
      detail: `${dependencyLightSteps.length} non-preparation step(s) have no dependency model.`,
      affectedStepIds: dependencyLightSteps.map((step) => step.id).slice(0, 30),
      remediation: "Every executable step must depend on at least the authoritative design review gate and more specific upstream steps when available.",
    });
  }

  const sourceBlockingFindingCount = params.upstreamFindings.filter((finding) => finding.severity === "ERROR").length;
  if (sourceBlockingFindingCount > 0) {
    findings.push({
      severity: "ERROR",
      code: "IMPLEMENTATION_SOURCE_FINDINGS_BLOCK_EXECUTION",
      title: "Authoritative design findings block execution",
      detail: `${sourceBlockingFindingCount} upstream design finding(s) are severity ERROR.`,
      affectedStepIds: [PREP_STEP_ID],
      remediation: "Fix or formally defer upstream findings before converting this neutral plan into platform commands.",
    });
  }

  return findings.sort((left, right) => `${left.severity}-${left.code}`.localeCompare(`${right.severity}-${right.code}`));
}

function buildSummary(params: {
  steps: ImplementationPlanStep[];
  verificationChecks: ImplementationPlanVerificationCheck[];
  rollbackActions: ImplementationPlanRollbackAction[];
  findings: ImplementationPlanFinding[];
  dependencyGraph: ImplementationDependencyGraph;
}): ImplementationPlanModel["summary"] {
  const blockedStepCount = params.steps.filter((step) => step.readiness === "blocked").length;
  const reviewStepCount = params.steps.filter((step) => step.readiness === "review").length;
  const blockingFindingCount = params.findings.filter((finding) => finding.severity === "ERROR").length;
  const operationalSafetySteps = params.steps.filter((step) => step.category === "operational-safety");
  const highRiskStepWithSafetyDependencyCount = params.steps.filter((step) =>
    step.riskLevel === "high" && step.dependencies.some((dependency) => dependency.stepId.includes("operational-safety")),
  ).length;

  return {
    stageCount: IMPLEMENTATION_STAGES.length,
    stepCount: params.steps.length,
    readyStepCount: params.steps.filter((step) => step.readiness === "ready").length,
    reviewStepCount,
    blockedStepCount,
    deferredStepCount: params.steps.filter((step) => step.readiness === "deferred").length,
    verificationCheckCount: params.verificationChecks.length,
    objectLevelVerificationCheckCount: params.verificationChecks.filter((check) => check.verificationScope === "object").length,
    routeLevelVerificationCheckCount: params.verificationChecks.filter((check) => check.verificationScope === "route").length,
    flowLevelVerificationCheckCount: params.verificationChecks.filter((check) => check.verificationScope === "flow").length,
    blockedVerificationCheckCount: params.verificationChecks.filter((check) => check.readiness === "blocked").length,
    rollbackVerificationCheckCount: params.verificationChecks.filter((check) => check.checkType === "rollback").length,
    rollbackActionCount: params.rollbackActions.length,
    dependencyCount: params.steps.reduce((total, step) => total + step.dependencies.length, 0),
    graphDependencyEdgeCount: params.dependencyGraph.edgeCount,
    graphBackedStepDependencyCount: params.steps.reduce((total, step) => total + step.graphDependencyEdgeIds.length, 0),
    preciseSecurityDependencyCount: params.dependencyGraph.preciseSecurityDependencyCount,
    operationalSafetyGateCount: operationalSafetySteps.length,
    operationalSafetyBlockedGateCount: operationalSafetySteps.filter((step) => step.readiness === "blocked").length,
    highRiskStepWithSafetyDependencyCount,
    stepWithBlastRadiusCount: params.steps.filter((step) => step.blastRadius.length > 0).length,
    stepWithRequiredEvidenceCount: params.steps.filter((step) => step.requiredEvidence.length > 0).length,
    stepWithRollbackIntentCount: params.steps.filter((step) => step.rollbackIntent.length > 0).length,
    findingCount: params.findings.length,
    blockingFindingCount,
    implementationReadiness: blockingFindingCount > 0 || blockedStepCount > 0 ? "blocked" : reviewStepCount > 0 ? "review" : "ready",
    notes: [
      "V1D expands verification from broad category checks into object-level and flow-level route, policy, NAT, DHCP, safety, rollback, and documentation checks.",
      "V1C adds operational safety gates so device-facing changes require management access, backup, and rollback proof.",
      "Every risky task is tied to backend authority objects such as devices, interfaces, route intents, security flows, NAT rules, DHCP pools, design findings, and dependency graph edges.",
      "Blocked implementation and operational-safety steps are stop conditions, not advisory warnings.",
    ],
  };
}

export function buildImplementationPlanModel(params: {
  networkObjectModel: ImplementationNetworkObjectModel;
}): ImplementationPlanModel {
  const { networkObjectModel } = params;
  const designGraphFindings = networkObjectModel.designGraph.integrityFindings;
  const routingFindings = networkObjectModel.routingSegmentation.reachabilityFindings;
  const securityPolicyFindings = networkObjectModel.securityPolicyFlow.findings;
  const upstreamFindings = collectUpstreamFindings({ designGraphFindings, routingFindings, securityPolicyFindings });
  const routingOnlyFindings = upstreamFindings.filter((finding) => finding.source === "routing");
  const securityOnlyFindings = upstreamFindings.filter((finding) => finding.source === "security-policy");
  const graphLookup = buildGraphLookup(networkObjectModel.designGraph);

  const steps = sortSteps([
    ...buildPreparationSteps({ upstreamFindings }),
    ...buildOperationalSafetySteps({ devices: networkObjectModel.devices, upstreamFindings }),
    ...buildAddressingAndInterfaceSteps({ devices: networkObjectModel.devices, interfaces: networkObjectModel.interfaces, upstreamFindings }),
    ...buildDhcpSteps({ dhcpPools: networkObjectModel.dhcpPools, devices: networkObjectModel.devices, interfaces: networkObjectModel.interfaces, upstreamFindings }),
    ...buildRoutingSteps({ routeIntents: networkObjectModel.routingSegmentation.routeIntents, devices: networkObjectModel.devices, interfaces: networkObjectModel.interfaces, routeFindings: routingOnlyFindings }),
    ...buildSecurityPolicySteps({
      flowRequirements: networkObjectModel.securityPolicyFlow.flowRequirements,
      routeIntents: networkObjectModel.routingSegmentation.routeIntents,
      devices: networkObjectModel.devices,
      interfaces: networkObjectModel.interfaces,
      securityZones: networkObjectModel.securityZones,
      securityFindings: securityOnlyFindings,
      graphLookup,
    }),
    ...buildNatRuleSteps({
      natRules: networkObjectModel.natRules,
      natReviews: networkObjectModel.securityPolicyFlow.natReviews,
      flowRequirements: networkObjectModel.securityPolicyFlow.flowRequirements,
      devices: networkObjectModel.devices,
      interfaces: networkObjectModel.interfaces,
      routeIntents: networkObjectModel.routingSegmentation.routeIntents,
      securityZones: networkObjectModel.securityZones,
      securityFindings: securityOnlyFindings,
      graphLookup,
    }),
  ]);

  const dependencyGraph = buildImplementationDependencyGraph({ designGraph: networkObjectModel.designGraph, steps, lookup: graphLookup });

  const verificationChecks = buildVerificationChecks({
    steps,
    routeIntents: networkObjectModel.routingSegmentation.routeIntents,
    flowRequirements: networkObjectModel.securityPolicyFlow.flowRequirements,
    dhcpPools: networkObjectModel.dhcpPools,
  });
  const rollbackActions = buildRollbackActions(steps);
  const findings = buildImplementationFindings({ steps, verificationChecks, upstreamFindings });

  return {
    summary: buildSummary({ steps, verificationChecks, rollbackActions, findings, dependencyGraph }),
    stages: IMPLEMENTATION_STAGES,
    steps,
    dependencyGraph,
    verificationChecks,
    rollbackActions,
    findings,
  };
}
