import type {
  BackendDiagramTruthModel,
  BackendReportTruthModel,
  DesignGraph,
  DesignGraphEdge,
  DesignGraphNode,
  NetworkObjectModel,
  Phase10DesignGraphControlSummary,
  Phase10DesignGraphFinding,
  Phase10DesignGraphObjectCoverageRow,
  Phase10DesignGraphReadiness,
  Phase10RequirementDependencyPath,
  Phase3RequirementsClosureControlSummary,
  Phase9NetworkObjectLineageRow,
  Phase9NetworkObjectModelControlSummary,
  RequirementPropagationLifecycleStatus,
} from "../designCore.types.js";

const GRAPH_CONTRACT = "PHASE10_DESIGN_GRAPH_DEPENDENCY_INTEGRITY_CONTRACT" as const;
const GRAPH_ROLE = "REQUIREMENT_TO_OBJECT_TO_CONSUMER_DEPENDENCY_GRAPH" as const;

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())))).sort();
}
function nodeKey(node: DesignGraphNode) { return `${node.objectType}:${node.objectId}`; }
function readinessFromFindings(findings: Phase10DesignGraphFinding[]): Phase10DesignGraphReadiness { if (findings.some((finding) => finding.severity === "BLOCKING")) return "BLOCKED"; if (findings.some((finding) => finding.severity === "REVIEW_REQUIRED" || finding.severity === "WARNING")) return "REVIEW_REQUIRED"; return "READY"; }
function readinessForRequirement(params: { lifecycleStatus: RequirementPropagationLifecycleStatus; missingGraphNodeIds: string[]; missingConsumerSurfaces: string[]; missingRelationshipTypes: string[]; }): Phase10DesignGraphReadiness { if (params.lifecycleStatus === "BLOCKED" || params.missingGraphNodeIds.length > 0) return "BLOCKED"; if (params.lifecycleStatus !== "FULLY_PROPAGATED" || params.missingConsumerSurfaces.length > 0 || params.missingRelationshipTypes.length > 0) return "REVIEW_REQUIRED"; return "READY"; }

function graphLookup(graph: DesignGraph) {
  const nodesByObjectId = new Map<string, DesignGraphNode[]>();
  const nodesByKey = new Map<string, DesignGraphNode>();
  const edgesByNodeId = new Map<string, DesignGraphEdge[]>();
  for (const node of graph.nodes) { const list = nodesByObjectId.get(node.objectId) ?? []; list.push(node); nodesByObjectId.set(node.objectId, list); nodesByKey.set(nodeKey(node), node); }
  for (const edge of graph.edges) { edgesByNodeId.set(edge.sourceNodeId, [...(edgesByNodeId.get(edge.sourceNodeId) ?? []), edge]); edgesByNodeId.set(edge.targetNodeId, [...(edgesByNodeId.get(edge.targetNodeId) ?? []), edge]); }
  return { nodesByObjectId, nodesByKey, edgesByNodeId };
}

function objectCoverageRows(params: { phase9Objects: Phase9NetworkObjectLineageRow[]; graph: DesignGraph; }): Phase10DesignGraphObjectCoverageRow[] {
  const lookup = graphLookup(params.graph);
  return params.phase9Objects.map((object) => {
    const nodes = lookup.nodesByObjectId.get(object.objectId) ?? [];
    const edges = uniqueStrings(nodes.flatMap((node) => (lookup.edgesByNodeId.get(node.id) ?? []).map((edge) => edge.id)));
    const relationships = uniqueStrings(nodes.flatMap((node) => (lookup.edgesByNodeId.get(node.id) ?? []).map((edge) => edge.relationship)));
    const missingConsumerSurfaces = [object.validationImpact ? undefined : "validation", object.frontendDisplayImpact.length > 0 ? undefined : "frontend", object.reportExportImpact.length > 0 ? undefined : "report/export", object.diagramImpact.length > 0 ? undefined : "diagram"].filter((value): value is string => Boolean(value));
    const dependencyState = nodes.length === 0 ? "MISSING_GRAPH_NODE" : edges.length === 0 ? "ORPHANED" : missingConsumerSurfaces.length > 0 ? "MISSING_CONSUMER" : "CONNECTED";
    return { objectId: object.objectId, displayName: object.displayName, objectType: object.objectType, truthState: object.truthState, sourceRequirementIds: object.sourceRequirementIds, graphNodeIds: nodes.map((node) => node.id), relationshipIds: edges, relationshipTypes: relationships, dependencyState, consumerSurfaces: uniqueStrings([object.validationImpact ? "validation/readiness" : undefined, ...object.frontendDisplayImpact, ...object.reportExportImpact, ...object.diagramImpact]), missingConsumerSurfaces, notes: dependencyState === "CONNECTED" ? ["Object has a backend graph node, dependency edges, and validation/frontend/report/diagram consumer surfaces."] : ["Object needs graph or consumer repair before the dependency path can be treated as complete."] };
  });
}

function relationshipTypesForObjects(graph: DesignGraph, objectIds: string[]) { const lookup = graphLookup(graph); const nodeIds = uniqueStrings(objectIds.flatMap((objectId) => (lookup.nodesByObjectId.get(objectId) ?? []).map((node) => node.id))); const edges = uniqueStrings(nodeIds.flatMap((nodeId) => (lookup.edgesByNodeId.get(nodeId) ?? []).map((edge) => edge.id))); const relationships = uniqueStrings(nodeIds.flatMap((nodeId) => (lookup.edgesByNodeId.get(nodeId) ?? []).map((edge) => edge.relationship))); return { nodeIds, edges, relationships }; }

function requirementPaths(params: { phase9: Phase9NetworkObjectModelControlSummary; phase3RequirementsClosure?: Phase3RequirementsClosureControlSummary; objectCoverage: Phase10DesignGraphObjectCoverageRow[]; graph: DesignGraph; }): Phase10RequirementDependencyPath[] {
  const coverageByObjectId = new Map(params.objectCoverage.map((row) => [row.objectId, row]));
  const closureByRequirementId = new Map((params.phase3RequirementsClosure?.closureMatrix ?? []).map((row) => [row.requirementId, row]));
  return params.phase9.requirementObjectLineage.map((row) => {
    const closure = closureByRequirementId.get(row.requirementId);
    const objectRows = row.actualObjectIds.map((objectId) => coverageByObjectId.get(objectId)).filter((item): item is Phase10DesignGraphObjectCoverageRow => Boolean(item));
    const missingGraphNodeIds = row.actualObjectIds.filter((objectId) => !coverageByObjectId.get(objectId)?.graphNodeIds.length);
    const relationInfo = relationshipTypesForObjects(params.graph, row.actualObjectIds);
    const missingConsumerSurfaces = uniqueStrings(objectRows.flatMap((object) => object.missingConsumerSurfaces));
    const expectedRelationships = row.actualObjectIds.length > 0 ? ["requirement-to-object", "object-to-object", "object-to-consumer"] : ["requirement-to-object"];
    const missingRelationshipTypes = uniqueStrings([row.actualObjectIds.length === 0 ? "requirement-to-object" : undefined, relationInfo.relationships.length === 0 && row.actualObjectIds.length > 0 ? "object-to-object" : undefined, missingConsumerSurfaces.length > 0 ? "object-to-consumer" : undefined]);
    const lifecycleStatus = closure?.lifecycleStatus ?? row.lifecycleStatus;
    return { requirementId: row.requirementId, sourceKey: row.sourceKey, lifecycleStatus, expectedObjectTypes: row.expectedObjectTypes, actualObjectIds: row.actualObjectIds, actualGraphNodeIds: relationInfo.nodeIds, actualRelationshipIds: relationInfo.edges, actualRelationshipTypes: relationInfo.relationships, expectedRelationshipTypes: expectedRelationships, missingGraphNodeIds, missingRelationshipTypes, frontendConsumers: uniqueStrings(objectRows.flatMap((object) => object.consumerSurfaces.filter((consumer) => consumer.includes("Page") || consumer.includes("frontend") || consumer.includes("Project")))), reportExportConsumers: uniqueStrings(objectRows.flatMap((object) => object.consumerSurfaces.filter((consumer) => consumer.toLowerCase().includes("report") || consumer.toLowerCase().includes("export")))), diagramConsumers: uniqueStrings(objectRows.flatMap((object) => object.consumerSurfaces.filter((consumer) => consumer.toLowerCase().includes("diagram")))), validationConsumers: uniqueStrings(objectRows.flatMap((object) => object.consumerSurfaces.filter((consumer) => consumer.toLowerCase().includes("validation")))), missingConsumerSurfaces, readinessImpact: readinessForRequirement({ lifecycleStatus, missingGraphNodeIds, missingConsumerSurfaces, missingRelationshipTypes }), notes: [`Phase 10 path built from Phase 9 object lineage and the backend design graph for requirement ${row.sourceKey}.`, closure?.reviewReason ? `Phase 3 review reason: ${closure.reviewReason}` : "Phase 3 closure data linked where available."] };
  });
}

function addFinding(findings: Phase10DesignGraphFinding[], finding: Phase10DesignGraphFinding) { if (findings.some((item) => item.code === finding.code && item.detail === finding.detail)) return; findings.push(finding); }

function buildFindings(params: { graph: DesignGraph; networkObjectModel: NetworkObjectModel; objectCoverage: Phase10DesignGraphObjectCoverageRow[]; requirementPaths: Phase10RequirementDependencyPath[]; reportTruth?: BackendReportTruthModel; diagramTruth?: BackendDiagramTruthModel; }): Phase10DesignGraphFinding[] {
  const findings: Phase10DesignGraphFinding[] = [];
  const degree = new Map<string, number>();
  for (const edge of params.graph.edges) { degree.set(edge.sourceNodeId, (degree.get(edge.sourceNodeId) ?? 0) + 1); degree.set(edge.targetNodeId, (degree.get(edge.targetNodeId) ?? 0) + 1); }
  for (const finding of params.graph.integrityFindings) addFinding(findings, { severity: finding.severity === "ERROR" ? "BLOCKING" : finding.severity === "WARNING" ? "REVIEW_REQUIRED" : "INFO", code: `PHASE10_${finding.code}`, title: finding.title, detail: finding.detail, affectedObjectIds: finding.affectedObjectIds, readinessImpact: finding.severity === "ERROR" ? "BLOCKED" : finding.severity === "WARNING" ? "REVIEW_REQUIRED" : "READY", remediation: finding.remediation });
  const orphanNodes = params.graph.nodes.filter((node) => (degree.get(node.id) ?? 0) === 0);
  if (orphanNodes.length > 0) addFinding(findings, { severity: "BLOCKING", code: "PHASE10_ORPHANED_GRAPH_NODE", title: "Design graph has orphaned backend nodes", detail: `${orphanNodes.length} graph node(s) have no dependency edge. A loose object table is not a dependency graph.`, affectedObjectIds: orphanNodes.slice(0, 30).map((node) => node.objectId), readinessImpact: "BLOCKED", remediation: "Attach every graph node to a source site/VLAN/subnet/device/zone/route/security/implementation relationship or remove the unsupported object." });
  const missingGraphObjects = params.objectCoverage.filter((row) => row.dependencyState === "MISSING_GRAPH_NODE");
  if (missingGraphObjects.length > 0) addFinding(findings, { severity: "BLOCKING", code: "PHASE10_OBJECT_WITHOUT_GRAPH_NODE", title: "Truth-labelled network objects are missing graph nodes", detail: `${missingGraphObjects.length} Phase 9 object(s) have no DesignGraph node, so downstream consumers cannot traverse their dependency path.`, affectedObjectIds: missingGraphObjects.slice(0, 30).map((row) => row.objectId), readinessImpact: "BLOCKED", remediation: "Create backend graph nodes for every device, interface, link, route domain, zone, policy, NAT rule, DHCP pool, and reservation before exposing them to diagrams or implementation plans." });
  const missingConsumers = params.objectCoverage.filter((row) => row.missingConsumerSurfaces.length > 0);
  if (missingConsumers.length > 0) addFinding(findings, { severity: "REVIEW_REQUIRED", code: "PHASE10_OBJECT_CONSUMER_GAP", title: "Graph objects are missing consumer impact surfaces", detail: `${missingConsumers.length} object(s) do not declare validation/frontend/report/diagram consumer coverage. That is how ghost objects creep back in.`, affectedObjectIds: missingConsumers.slice(0, 30).map((row) => row.objectId), readinessImpact: "REVIEW_REQUIRED", remediation: "Carry the Phase 9 consumer impact fields through Phase 10 so each object proves where it appears and what readiness gate it affects." });
  for (const zone of params.networkObjectModel.securityZones.filter((item) => item.subnetCidrs.length === 0 && item.zoneRole !== "wan")) addFinding(findings, { severity: "REVIEW_REQUIRED", code: "PHASE10_ZONE_WITHOUT_SEGMENTS", title: "Security zone has no protected segment", detail: `${zone.name} exists in the object model but has no subnet/segment membership. A zone without segments is only an intent, not deployable topology.`, affectedObjectIds: [zone.id], readinessImpact: "REVIEW_REQUIRED", remediation: "Attach the zone to a materialized subnet/VLAN or mark the requirement as review-only/no-op." });
  const policyIdsCoveredByFlows = new Set(params.graph.edges.filter((edge) => edge.relationship === "security-flow-covered-by-policy").map((edge) => params.graph.nodes.find((node) => node.id === edge.targetNodeId)?.objectId).filter(Boolean));
  for (const policy of params.networkObjectModel.policyRules.filter((rule) => !policyIdsCoveredByFlows.has(rule.id))) addFinding(findings, { severity: "WARNING", code: "PHASE10_POLICY_WITHOUT_FLOW_COVERAGE", title: "Policy rule is not linked to a security flow requirement", detail: `${policy.name} is connected to zones, but no security-flow coverage edge proves which business/security flow it satisfies.`, affectedObjectIds: [policy.id], readinessImpact: "REVIEW_REQUIRED", remediation: "Link each policy rule to a security flow requirement or mark the policy as review-only intent." });
  for (const routeIntent of params.networkObjectModel.routingSegmentation.routeIntents.filter((route) => route.nextHopType !== "engineer-review" && !route.nextHopObjectId && route.routeKind !== "default")) addFinding(findings, { severity: "REVIEW_REQUIRED", code: "PHASE10_ROUTE_WITHOUT_NEXT_HOP_OBJECT", title: "Route intent is missing next-hop object evidence", detail: `${routeIntent.name} has next-hop type ${routeIntent.nextHopType} but no next-hop object id.`, affectedObjectIds: [routeIntent.id], readinessImpact: "REVIEW_REQUIRED", remediation: "Attach the route intent to an interface, link, gateway, or explicit engineer-review blocker." });
  const implementationStepEdges = new Set(params.graph.edges.filter((edge) => edge.relationship.startsWith("implementation-step-")).map((edge) => edge.sourceNodeId));
  const implementationStepNodes = params.graph.nodes.filter((node) => node.objectType === "implementation-step");
  const implementationStepsWithoutTargets = implementationStepNodes.filter((node) => !implementationStepEdges.has(node.id));
  if (implementationStepsWithoutTargets.length > 0) addFinding(findings, { severity: "BLOCKING", code: "PHASE10_IMPLEMENTATION_STEP_WITHOUT_SOURCE_OBJECT", title: "Implementation steps are not tied to source graph objects", detail: `${implementationStepsWithoutTargets.length} implementation step node(s) have no stage/object/route/flow dependency edge. Implementation plans cannot invent work items.`, affectedObjectIds: implementationStepsWithoutTargets.slice(0, 30).map((node) => node.objectId), readinessImpact: "BLOCKED", remediation: "Attach every implementation step to a source object, route intent, security flow, verification target, or block it as review-required." });
  const diagramObjectIds = new Set((params.diagramTruth?.renderModel?.nodes ?? []).map((node) => node.objectId));
  const graphObjectIds = new Set(params.graph.nodes.map((node) => node.objectId));
  const diagramOnlyObjects = Array.from(diagramObjectIds).filter((objectId) => !graphObjectIds.has(objectId));
  if (diagramOnlyObjects.length > 0) addFinding(findings, { severity: "BLOCKING", code: "PHASE10_DIAGRAM_NODE_WITHOUT_BACKEND_GRAPH_OBJECT", title: "Diagram render model contains nodes without backend graph objects", detail: `${diagramOnlyObjects.length} diagram node(s) cannot be resolved to the DesignGraph. Pretty garbage is still garbage.`, affectedObjectIds: diagramOnlyObjects.slice(0, 30), readinessImpact: "BLOCKED", remediation: "Remove frontend-invented diagram nodes or materialize the missing backend graph objects first." });
  const requirementGaps = params.requirementPaths.filter((path) => path.readinessImpact !== "READY");
  if (requirementGaps.length > 0) addFinding(findings, { severity: requirementGaps.some((path) => path.readinessImpact === "BLOCKED") ? "BLOCKING" : "REVIEW_REQUIRED", code: "PHASE10_REQUIREMENT_DEPENDENCY_PATH_GAP", title: "Requirement dependency paths are incomplete", detail: `${requirementGaps.length} requirement path(s) are missing graph nodes, dependency edges, or consumer surfaces.`, affectedObjectIds: requirementGaps.slice(0, 30).map((path) => path.requirementId), readinessImpact: requirementGaps.some((path) => path.readinessImpact === "BLOCKED") ? "BLOCKED" : "REVIEW_REQUIRED", remediation: "For each captured requirement, prove the path from requirement signal to object, object dependency, validation impact, frontend display, report/export section, and diagram impact." });
  if (findings.length === 0) findings.push({ severity: "PASSED", code: "PHASE10_DESIGN_GRAPH_DEPENDENCIES_COMPLETE", title: "Design graph dependency integrity passed", detail: "Every Phase 9 object has graph coverage, dependency edges, and consumer impact evidence; no orphan or diagram-only objects were detected.", affectedObjectIds: [], readinessImpact: "READY", remediation: "Continue engineer review and keep graph checks in release gates." });
  return findings;
}

export function buildPhase10DesignGraphControl(params: { networkObjectModel: NetworkObjectModel; phase9NetworkObjectModel: Phase9NetworkObjectModelControlSummary; phase3RequirementsClosure?: Phase3RequirementsClosureControlSummary; reportTruth?: BackendReportTruthModel; diagramTruth?: BackendDiagramTruthModel; }): Phase10DesignGraphControlSummary {
  const graph = params.networkObjectModel.designGraph;
  const objectCoverage = objectCoverageRows({ phase9Objects: params.phase9NetworkObjectModel.objectLineage, graph });
  const paths = requirementPaths({ phase9: params.phase9NetworkObjectModel, phase3RequirementsClosure: params.phase3RequirementsClosure, objectCoverage, graph });
  const findings = buildFindings({ graph, networkObjectModel: params.networkObjectModel, objectCoverage, requirementPaths: paths, reportTruth: params.reportTruth, diagramTruth: params.diagramTruth });
  return { contract: GRAPH_CONTRACT, role: GRAPH_ROLE, overallReadiness: readinessFromFindings(findings), graphNodeCount: graph.summary.nodeCount, graphEdgeCount: graph.summary.edgeCount, requiredEdgeCount: graph.summary.requiredEdgeCount, connectedObjectCount: graph.summary.connectedObjectCount, orphanObjectCount: graph.summary.orphanObjectCount, integrityFindingCount: graph.summary.integrityFindingCount, blockingFindingCount: findings.filter((finding) => finding.severity === "BLOCKING").length, requirementPathCount: paths.length, requirementPathReadyCount: paths.filter((path) => path.readinessImpact === "READY").length, requirementPathReviewCount: paths.filter((path) => path.readinessImpact === "REVIEW_REQUIRED").length, requirementPathBlockedCount: paths.filter((path) => path.readinessImpact === "BLOCKED").length, objectCoverageCount: objectCoverage.length, objectCoverageReadyCount: objectCoverage.filter((row) => row.dependencyState === "CONNECTED").length, objectCoverageGapCount: objectCoverage.filter((row) => row.dependencyState !== "CONNECTED").length, diagramOnlyObjectCount: findings.find((finding) => finding.code === "PHASE10_DIAGRAM_NODE_WITHOUT_BACKEND_GRAPH_OBJECT")?.affectedObjectIds.length ?? 0, unreferencedPolicyCount: findings.filter((finding) => finding.code === "PHASE10_POLICY_WITHOUT_FLOW_COVERAGE").length, routeWithoutNextHopCount: findings.filter((finding) => finding.code === "PHASE10_ROUTE_WITHOUT_NEXT_HOP_OBJECT").length, implementationStepWithoutSourceCount: findings.find((finding) => finding.code === "PHASE10_IMPLEMENTATION_STEP_WITHOUT_SOURCE_OBJECT")?.affectedObjectIds.length ?? 0, requirementDependencyPaths: paths, objectCoverage, findings, notes: ["Phase 10 makes the design graph a dependency integrity control surface, not a decorative graph table.", "Every requirement path must prove requirement → network object → graph dependency → validation/frontend/report/diagram consumer impact.", "Diagram nodes are checked against backend graph object IDs to prevent frontend-invented topology authority."] };
}
