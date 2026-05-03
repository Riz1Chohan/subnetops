import type {
  BackendDiagramRenderEdge,
  BackendDiagramRenderLayer,
  BackendDiagramRenderNode,
  BackendDiagramTruthModel,
  NetworkObjectModel,
  V1ReportExportTruthControlSummary,
  V1DiagramModeContractRow,
  V1DiagramModeKey,
  V1DiagramRenderCoverageRow,
  V1DiagramTruthControlSummary,
  V1DiagramTruthFinding,
  V1DiagramTruthReadiness,
} from "../designCore.types.js";

export const V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT = "V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT" as const;
export const V1_BACKEND_ONLY_DIAGRAM_ROLE = "BACKEND_ONLY_DIAGRAM_RENDERER_NO_PRETTY_GARBAGE" as const;

type FindingSeverity = V1DiagramTruthFinding["severity"];

function readinessFromSeverity(severity: FindingSeverity): V1DiagramTruthReadiness {
  if (severity === "BLOCKING") return "BLOCKED";
  if (severity === "REVIEW_REQUIRED" || severity === "WARNING") return "REVIEW_REQUIRED";
  return "READY";
}

function rollupReadiness(values: V1DiagramTruthReadiness[]): V1DiagramTruthReadiness {
  if (values.includes("BLOCKED")) return "BLOCKED";
  if (values.includes("REVIEW_REQUIRED")) return "REVIEW_REQUIRED";
  return "READY";
}

function addFinding(findings: V1DiagramTruthFinding[], finding: V1DiagramTruthFinding) {
  if (!findings.some((existing) => existing.code === finding.code && existing.detail === finding.detail)) findings.push(finding);
}

function layersForMode(mode: V1DiagramModeKey): BackendDiagramRenderLayer[] {
  if (mode === "physical") return ["site", "device", "interface"];
  if (mode === "logical") return ["site", "interface", "routing", "security"];
  if (mode === "wan-cloud") return ["site", "device", "routing", "security"];
  if (mode === "security") return ["site", "device", "security"];
  if (mode === "per-site") return ["site", "device", "interface", "security"];
  return ["implementation", "verification", "device"];
}

function modeImpactsForNode(node: BackendDiagramRenderNode): V1DiagramModeKey[] {
  return (["physical", "logical", "wan-cloud", "security", "per-site", "implementation"] as V1DiagramModeKey[]).filter((mode) => layersForMode(mode).includes(node.layer));
}

function modeImpactsForEdge(edge: BackendDiagramRenderEdge): V1DiagramModeKey[] {
  const keys = new Set<V1DiagramModeKey>();
  if (edge.overlayKeys.includes("addressing")) { keys.add("logical"); keys.add("per-site"); }
  if (edge.overlayKeys.includes("routing")) { keys.add("wan-cloud"); keys.add("logical"); }
  if (edge.overlayKeys.includes("security") || edge.overlayKeys.includes("nat")) keys.add("security");
  if (edge.overlayKeys.includes("implementation") || edge.overlayKeys.includes("verification") || edge.overlayKeys.includes("operational-safety")) keys.add("implementation");
  if (edge.relationship.includes("device") || edge.relationship.includes("interface") || edge.relationship.includes("link")) keys.add("physical");
  return Array.from(keys);
}

function coverageForNode(node: BackendDiagramRenderNode): V1DiagramRenderCoverageRow {
  return {
    rowType: "node",
    renderId: node.id,
    backendObjectId: node.objectId,
    objectType: node.objectType,
    truthState: node.truthState,
    readiness: node.readiness,
    hasBackendIdentity: Boolean(node.objectId),
    hasTruthState: Boolean(node.truthState),
    hasReadiness: Boolean(node.readiness),
    sourceEngine: node.sourceEngine,
    relatedFindingIds: node.relatedFindingIds,
    modeImpacts: modeImpactsForNode(node),
  };
}

function coverageForEdge(edge: BackendDiagramRenderEdge): V1DiagramRenderCoverageRow {
  return {
    rowType: "edge",
    renderId: edge.id,
    backendObjectId: edge.relatedObjectIds[0] ?? edge.relationship,
    relationship: edge.relationship,
    readiness: edge.readiness,
    hasBackendIdentity: edge.relatedObjectIds.length > 0 || Boolean(edge.relationship),
    hasTruthState: true,
    hasReadiness: Boolean(edge.readiness),
    sourceEngine: "design-graph",
    relatedFindingIds: [],
    modeImpacts: modeImpactsForEdge(edge),
  };
}

function buildModeContracts(params: { diagramTruth: BackendDiagramTruthModel; networkObjectModel: NetworkObjectModel }): V1DiagramModeContractRow[] {
  const { diagramTruth, networkObjectModel } = params;
  const renderNodes = diagramTruth.renderModel.nodes ?? [];
  const renderEdges = diagramTruth.renderModel.edges ?? [];
  const hasSite = renderNodes.some((node) => node.objectType === "site");
  const hasDevice = renderNodes.some((node) => node.objectType === "network-device");
  const hasInterface = renderNodes.some((node) => node.objectType === "network-interface") || networkObjectModel.interfaces.length > 0;
  const hasRouting = renderNodes.some((node) => node.layer === "routing") || renderEdges.some((edge) => edge.overlayKeys.includes("routing"));
  const hasSecurity = renderNodes.some((node) => node.layer === "security") || renderEdges.some((edge) => edge.overlayKeys.includes("security"));
  const hasImplementation = renderNodes.some((node) => node.layer === "implementation" || node.layer === "verification") || networkObjectModel.implementationPlan.steps.length > 0;

  const make = (row: Omit<V1DiagramModeContractRow, "contract" | "forbiddenFrontendBehavior"> & { forbiddenFrontendBehavior?: string[] }): V1DiagramModeContractRow => {
    const forbiddenFrontendBehavior = row.forbiddenFrontendBehavior ?? [
      "Do not invent topology nodes in the frontend.",
      "Do not hide inferred or review-required truth states.",
      "Do not draw permission from visual adjacency; security flows come from backend policy evidence.",
    ];
    const { forbiddenFrontendBehavior: _ignored, ...rest } = row;
    return {
      contract: V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT,
      ...rest,
      forbiddenFrontendBehavior,
    };
  };

  return [
    make({
      mode: "physical",
      purpose: "Show backend-modeled sites, devices, interfaces, and links without manufacturing equipment.",
      allowedRenderLayers: layersForMode("physical"),
      requiredBackendEvidence: ["site groups", "network devices", "interfaces or modeled links"],
      status: hasSite && hasDevice ? "AVAILABLE" : "BLOCKED",
      readinessImpact: hasSite && hasDevice ? "READY" : "BLOCKED",
      evidenceCount: renderNodes.filter((node) => layersForMode("physical").includes(node.layer)).length,
      notes: ["Physical mode is backend-authored; visual layout is only a projection of renderModel nodes/edges."],
    }),
    make({
      mode: "logical",
      purpose: "Show VLAN/subnet/route-domain segmentation relationships from the design graph.",
      allowedRenderLayers: layersForMode("logical"),
      requiredBackendEvidence: ["VLAN nodes", "subnet nodes", "route-domain relationships"],
      status: hasSite && (hasInterface || hasRouting) ? "AVAILABLE" : "REVIEW_REQUIRED",
      readinessImpact: hasSite && (hasInterface || hasRouting) ? "READY" : "REVIEW_REQUIRED",
      evidenceCount: renderNodes.filter((node) => layersForMode("logical").includes(node.layer)).length,
      notes: ["Logical mode must use backend VLAN/subnet bindings; no frontend-only engineering facts."],
    }),
    make({
      mode: "wan-cloud",
      purpose: "Show WAN, internet, cloud, route-domain, and site-to-site review paths without pretending full routing simulation exists.",
      allowedRenderLayers: layersForMode("wan-cloud"),
      requiredBackendEvidence: ["route intents", "WAN/security edge", "site-to-site relationships"],
      status: hasRouting ? "AVAILABLE" : "REVIEW_REQUIRED",
      readinessImpact: hasRouting ? "READY" : "REVIEW_REQUIRED",
      evidenceCount: renderEdges.filter((edge) => edge.overlayKeys.includes("routing")).length,
      notes: ["WAN/cloud mode is routing intent/review evidence; it is not live route-table simulation."],
    }),
    make({
      mode: "security",
      purpose: "Show zones, policy relationships, NAT review, and flow consequences from backend security policy flow.",
      allowedRenderLayers: layersForMode("security"),
      requiredBackendEvidence: ["security zones", "policy rules", "flow requirements", "NAT review rows where applicable"],
      status: hasSecurity ? "AVAILABLE" : "REVIEW_REQUIRED",
      readinessImpact: hasSecurity ? "READY" : "REVIEW_REQUIRED",
      evidenceCount: renderEdges.filter((edge) => edge.overlayKeys.includes("security") || edge.overlayKeys.includes("nat")).length,
      notes: ["Security mode must show review/block states; adjacency is not permission."],
    }),
    make({
      mode: "per-site",
      purpose: "Show one site detail view with backend site, gateway, VLAN, DHCP, zone, and subnet evidence.",
      allowedRenderLayers: layersForMode("per-site"),
      requiredBackendEvidence: ["site group", "site-scoped render nodes", "site-scoped addressing/security evidence"],
      status: hasSite ? "AVAILABLE" : "BLOCKED",
      readinessImpact: hasSite ? "READY" : "BLOCKED",
      evidenceCount: diagramTruth.renderModel.groups.filter((group) => group.groupType === "site" && group.nodeIds.length > 0).length,
      notes: ["Per-site detail must suppress unrelated topology noise and preserve backend object IDs."],
    }),
    make({
      mode: "implementation",
      purpose: "Show only implementation/verification consequences that are backed by source objects and readiness gates.",
      allowedRenderLayers: layersForMode("implementation"),
      requiredBackendEvidence: ["implementation steps", "verification checks", "source object IDs", "rollback/evidence gates"],
      status: hasImplementation ? "AVAILABLE" : "REVIEW_REQUIRED",
      readinessImpact: hasImplementation ? "READY" : "REVIEW_REQUIRED",
      evidenceCount: networkObjectModel.implementationPlan.steps.length + networkObjectModel.implementationPlan.verificationChecks.length,
      notes: ["Implementation view cannot make a diagram look deployment-ready when V1/14 gates are blocked or review-required."],
    }),
  ];
}

export function buildV1DiagramTruthControl(params: {
  diagramTruth: BackendDiagramTruthModel;
  networkObjectModel: NetworkObjectModel;
  V1ReportExportTruth: V1ReportExportTruthControlSummary;
}): V1DiagramTruthControlSummary {
  const { diagramTruth, networkObjectModel, V1ReportExportTruth } = params;
  const findings: V1DiagramTruthFinding[] = [];
  const renderModel = diagramTruth.renderModel;
  const nodeCoverage = (renderModel.nodes ?? []).map(coverageForNode);
  const edgeCoverage = (renderModel.edges ?? []).map(coverageForEdge);
  const renderCoverage = [...nodeCoverage, ...edgeCoverage];
  const modeContracts = buildModeContracts({ diagramTruth, networkObjectModel });

  const nodesWithoutBackendObjectId = nodeCoverage.filter((row) => !row.hasBackendIdentity).length;
  const edgesWithoutRelatedObjects = edgeCoverage.filter((row) => !row.hasBackendIdentity).length;
  const inferredOrReviewVisibleCount = nodeCoverage.filter((row) => row.truthState === "inferred" || row.truthState === "review-required" || row.readiness === "review" || row.readiness === "blocked").length;
  const blockedModeCount = modeContracts.filter((row) => row.status === "BLOCKED" || row.readinessImpact === "BLOCKED").length;
  const reviewModeCount = modeContracts.filter((row) => row.status === "REVIEW_REQUIRED" || row.readinessImpact === "REVIEW_REQUIRED").length;

  if (!renderModel.summary.backendAuthored) {
    addFinding(findings, {
      severity: "BLOCKING",
      code: "V1_RENDER_MODEL_NOT_BACKEND_AUTHORED",
      title: "Diagram render model is not backend-authored",
      detail: "V1 requires the canvas to render backend diagramTruth.renderModel only.",
      affectedRenderIds: [],
      readinessImpact: "BLOCKED",
      remediation: "Use backend diagramTruth.renderModel as the only render source and remove frontend-invented topology.",
    });
  }

  if (nodesWithoutBackendObjectId > 0) {
    addFinding(findings, {
      severity: "BLOCKING",
      code: "V1_RENDER_NODE_WITHOUT_BACKEND_OBJECT_ID",
      title: "Rendered node lacks backend object identity",
      detail: `${nodesWithoutBackendObjectId} rendered node(s) do not carry objectId lineage. Pretty nodes without backend identity are not allowed.`,
      affectedRenderIds: nodeCoverage.filter((row) => !row.hasBackendIdentity).map((row) => row.renderId),
      readinessImpact: "BLOCKED",
      remediation: "Attach objectId/sourceEngine/truthState to every render node or suppress it with an explicit empty/review reason.",
    });
  }

  if (edgesWithoutRelatedObjects > 0) {
    addFinding(findings, {
      severity: "BLOCKING",
      code: "V1_RENDER_EDGE_WITHOUT_BACKEND_RELATIONSHIP",
      title: "Rendered edge lacks backend relationship identity",
      detail: `${edgesWithoutRelatedObjects} rendered edge(s) lack both relatedObjectIds and relationship lineage. Edges must represent backend relationships, not decoration.`,
      affectedRenderIds: edgeCoverage.filter((row) => !row.hasBackendIdentity).map((row) => row.renderId),
      readinessImpact: "BLOCKED",
      remediation: "Attach relatedObjectIds or a design graph relationship to each edge before rendering it.",
    });
  }

  if (renderModel.nodes.length === 0 || renderModel.edges.length === 0) {
    addFinding(findings, {
      severity: "BLOCKING",
      code: "V1_EMPTY_RENDER_MODEL",
      title: "Diagram render model has no usable topology",
      detail: diagramTruth.emptyStateReason ?? renderModel.emptyState?.reason ?? "No render nodes or edges were produced.",
      affectedRenderIds: [],
      readinessImpact: "BLOCKED",
      remediation: "Fix requirement materialization, object model, design graph, addressing, routing, and security inputs before rendering a topology.",
    });
  }

  for (const mode of modeContracts.filter((row) => row.status === "BLOCKED")) {
    addFinding(findings, {
      severity: "BLOCKING",
      code: `V1_${mode.mode.toUpperCase().replace(/-/g, "_")}_MODE_BLOCKED`,
      title: `${mode.mode} diagram mode is blocked`,
      detail: `${mode.purpose} Missing evidence: ${mode.requiredBackendEvidence.join(", ")}.`,
      affectedRenderIds: [],
      readinessImpact: "BLOCKED",
      remediation: "Do not render a confident canvas for this mode until backend evidence exists.",
    });
  }

  if (V1ReportExportTruth.overallReadiness === "BLOCKED") {
    addFinding(findings, {
      severity: "REVIEW_REQUIRED",
      code: "V1_REPORT_TRUTH_BLOCKS_DIAGRAM_CONFIDENCE",
      title: "Report/export truth still has blockers",
      detail: "V1 must not make diagrams look cleaner than V1 report/export truth can prove.",
      affectedRenderIds: [],
      readinessImpact: "REVIEW_REQUIRED",
      remediation: "Resolve V1 blockers or keep diagram/report output explicitly review-gated.",
    });
  }

  if (!findings.length) {
    findings.push({
      severity: "PASSED",
      code: "V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTROLLED",
      title: "Diagram truth/render/layout contract is controlled",
      detail: "Render nodes have backend object identity, edges have backend relationship evidence, modes have declared purposes, inferred/review states remain visible, and the frontend is barred from inventing topology.",
      affectedRenderIds: [],
      readinessImpact: "READY",
      remediation: "Continue to V1 BOM without weakening backend-only diagram authority.",
    });
  }

  const findingReadiness = rollupReadiness(findings.map((finding) => readinessFromSeverity(finding.severity)));
  const modeReadiness = rollupReadiness(modeContracts.map((mode) => mode.readinessImpact));
  const overallReadiness = rollupReadiness([findingReadiness, modeReadiness]);

  return {
    contract: V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT,
    role: V1_BACKEND_ONLY_DIAGRAM_ROLE,
    overallReadiness,
    backendAuthored: renderModel.summary.backendAuthored === true,
    renderNodeCount: renderModel.nodes.length,
    renderEdgeCount: renderModel.edges.length,
    modeContractCount: modeContracts.length,
    blockedModeCount,
    reviewModeCount,
    nodesWithoutBackendObjectId,
    edgesWithoutRelatedObjects,
    inferredOrReviewVisibleCount,
    findingCount: findings.length,
    blockedFindingCount: findings.filter((finding) => finding.severity === "BLOCKING").length,
    reviewFindingCount: findings.filter((finding) => finding.severity === "REVIEW_REQUIRED").length,
    modeContracts,
    renderCoverage,
    findings,
    proofBoundary: [
      "Requirement-driven visual elements must originate from backend requirement/object/graph/routing/security/implementation truth.",
      "Every render node must carry backend objectId, sourceEngine, readiness, and truthState.",
      "Every render edge must carry relatedObjectIds or a design graph relationship; decoration-only links are blocked.",
      "Physical, logical, WAN/cloud, security, per-site, and implementation modes have separate declared purposes and allowed layers.",
      "Frontend canvas may lay out backend renderModel data, but it may not create engineering facts.",
    ],
    notes: [
      "V1 is about diagram truth, not prettier trash.",
      "This control intentionally keeps review-required and inferred evidence visible instead of hiding weak proof behind polished layout.",
    ],
  };
}
