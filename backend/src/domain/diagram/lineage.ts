import type {
  DiagramLineageStatus,
  DiagramNetworkObjectModelInput,
  DiagramRenderEdge,
  DiagramRenderNode,
} from './types.js';

type DiagramGraph = DiagramNetworkObjectModelInput['designGraph'];
type DiagramGraphNode = DiagramGraph['nodes'][number];
type DiagramGraphEdge = DiagramGraph['edges'][number];

type GraphIndex = {
  nodeByObjectId: Map<string, DiagramGraphNode>;
  edgeByRelationship: Map<string, DiagramGraphEdge[]>;
  edgeById: Map<string, DiagramGraphEdge>;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value && value.trim().length > 0)));
}

function buildGraphIndex(designGraph: DiagramGraph): GraphIndex {
  const nodeByObjectId = new Map<string, DiagramGraphNode>();
  const edgeByRelationship = new Map<string, DiagramGraphEdge[]>();
  const edgeById = new Map<string, DiagramGraphEdge>();

  for (const node of designGraph.nodes ?? []) nodeByObjectId.set(node.objectId, node);
  for (const edge of designGraph.edges ?? []) {
    edgeById.set(edge.id, edge);
    const existing = edgeByRelationship.get(edge.relationship) ?? [];
    existing.push(edge);
    edgeByRelationship.set(edge.relationship, existing);
  }

  return { nodeByObjectId, edgeByRelationship, edgeById };
}

function graphEdgesForRenderEdge(edge: DiagramRenderEdge, index: GraphIndex): DiagramGraphEdge[] {
  const candidates = index.edgeByRelationship.get(edge.relationship) ?? [];
  if (candidates.length === 0) return [];

  const relatedObjectIds = new Set(edge.relatedObjectIds);
  if (relatedObjectIds.size === 0) return candidates;

  return candidates.filter((candidate) => {
    const sourceObjectId = Array.from(index.nodeByObjectId.values()).find((node) => node.id === candidate.sourceNodeId)?.objectId;
    const targetObjectId = Array.from(index.nodeByObjectId.values()).find((node) => node.id === candidate.targetNodeId)?.objectId;
    return Boolean(sourceObjectId && relatedObjectIds.has(sourceObjectId)) || Boolean(targetObjectId && relatedObjectIds.has(targetObjectId));
  });
}

function lineageWarning(status: DiagramLineageStatus) {
  if (status === 'BLOCKED_LINEAGE') return 'BLOCKED_LINEAGE';
  if (status === 'VISUAL_ONLY_NON_EVIDENCE') return 'VISUAL_ONLY_NON_EVIDENCE';
  if (status === 'AGGREGATED_BACKEND_EVIDENCE') return 'AGGREGATED_BACKEND_EVIDENCE';
  return undefined;
}

function implementationEvidenceForNode(node: DiagramRenderNode, status: DiagramLineageStatus) {
  return status === 'GRAPH_BACKED' && node.readiness === 'ready' && node.truthStateV1 !== 'ASSUMED' && node.truthStateV1 !== 'REVIEW_REQUIRED' && node.truthStateV1 !== 'BLOCKED';
}

function implementationEvidenceForEdge(edge: DiagramRenderEdge, status: DiagramLineageStatus) {
  return status === 'GRAPH_RELATIONSHIP_BACKED' && edge.readiness === 'ready' && edge.truthStateV1 !== 'ASSUMED' && edge.truthStateV1 !== 'REVIEW_REQUIRED' && edge.truthStateV1 !== 'BLOCKED';
}

export function applyDiagramGraphLineage(params: {
  nodes: DiagramRenderNode[];
  edges: DiagramRenderEdge[];
  designGraph: DiagramGraph;
}): { nodes: DiagramRenderNode[]; edges: DiagramRenderEdge[]; blockedNodeIds: string[]; blockedEdgeIds: string[] } {
  const index = buildGraphIndex(params.designGraph);

  const nodes = params.nodes.map((node) => {
    const graphNode = index.nodeByObjectId.get(node.objectId);
    const explicitVisualOnly = node.warningBadges.includes('PRESENTATION_ONLY') || node.sourceRefs.some((ref) => ref.startsWith('frontend-presentation:'));
    const aggregated = node.sourceRefs.length > 1 || node.objectId.includes('summary');
    const lineageStatus: DiagramLineageStatus = graphNode
      ? 'GRAPH_BACKED'
      : explicitVisualOnly
        ? 'VISUAL_ONLY_NON_EVIDENCE'
        : aggregated
          ? 'AGGREGATED_BACKEND_EVIDENCE'
          : 'BLOCKED_LINEAGE';
    const warning = lineageWarning(lineageStatus);
    const blocked = lineageStatus === 'BLOCKED_LINEAGE';
    return {
      ...node,
      readiness: blocked ? 'blocked' as const : node.readiness,
      truthState: blocked ? 'blocked' as const : node.truthState,
      truthStateV1: blocked ? 'BLOCKED' as const : node.truthStateV1,
      readinessImpact: blocked ? 'BLOCKING' as const : node.readinessImpact,
      lineageStatus,
      graphNodeId: graphNode?.id,
      graphEdgeIds: node.graphEdgeIds ?? [],
      implementationEvidence: lineageStatus === 'VISUAL_ONLY_NON_EVIDENCE' ? false : implementationEvidenceForNode(node, lineageStatus),
      lineageRefs: unique([
        ...(node.lineageRefs ?? []),
        graphNode ? `design-graph-node:${graphNode.id}` : '',
        lineageStatus === 'AGGREGATED_BACKEND_EVIDENCE' ? `aggregated-backend-evidence:${node.objectId}` : '',
        lineageStatus === 'VISUAL_ONLY_NON_EVIDENCE' ? `visual-only-non-evidence:${node.id}` : '',
        lineageStatus === 'BLOCKED_LINEAGE' ? `missing-design-graph-node:${node.objectId}` : '',
      ]),
      validationRefs: blocked ? unique([...node.validationRefs, 'diagram-lineage:missing-graph-node']) : node.validationRefs,
      warningBadges: warning ? unique([...node.warningBadges, warning]) : node.warningBadges,
      notes: blocked
        ? unique([...node.notes, 'Diagram object is blocked as implementation evidence until a design graph node is materialized.'])
        : node.notes,
    } satisfies DiagramRenderNode;
  });

  const edges = params.edges.map((edge) => {
    const graphEdges = graphEdgesForRenderEdge(edge, index);
    const explicitVisualOnly = edge.warningBadges.includes('PRESENTATION_ONLY') || edge.sourceRefs.some((ref) => ref.startsWith('presentation-edge:'));
    const aggregated = edge.relatedObjectIds.length > 2;
    const lineageStatus: DiagramLineageStatus = graphEdges.length > 0
      ? 'GRAPH_RELATIONSHIP_BACKED'
      : explicitVisualOnly
        ? 'VISUAL_ONLY_NON_EVIDENCE'
        : aggregated
          ? 'AGGREGATED_BACKEND_EVIDENCE'
          : 'BLOCKED_LINEAGE';
    const warning = lineageWarning(lineageStatus);
    const blocked = lineageStatus === 'BLOCKED_LINEAGE';
    return {
      ...edge,
      readiness: blocked ? 'blocked' as const : edge.readiness,
      truthState: blocked ? 'blocked' as const : edge.truthState,
      truthStateV1: blocked ? 'BLOCKED' as const : edge.truthStateV1,
      readinessImpact: blocked ? 'BLOCKING' as const : edge.readinessImpact,
      lineageStatus,
      graphEdgeIds: graphEdges.map((graphEdge) => graphEdge.id),
      implementationEvidence: lineageStatus === 'VISUAL_ONLY_NON_EVIDENCE' ? false : implementationEvidenceForEdge(edge, lineageStatus),
      lineageRefs: unique([
        ...(edge.lineageRefs ?? []),
        ...graphEdges.map((graphEdge) => `design-graph-edge:${graphEdge.id}`),
        lineageStatus === 'AGGREGATED_BACKEND_EVIDENCE' ? `aggregated-backend-relationship:${edge.relationship}` : '',
        lineageStatus === 'VISUAL_ONLY_NON_EVIDENCE' ? `visual-only-non-evidence:${edge.id}` : '',
        lineageStatus === 'BLOCKED_LINEAGE' ? `missing-design-graph-edge:${edge.relationship}` : '',
      ]),
      validationRefs: blocked ? unique([...edge.validationRefs, 'diagram-lineage:missing-graph-edge']) : edge.validationRefs,
      warningBadges: warning ? unique([...edge.warningBadges, warning]) : edge.warningBadges,
      notes: blocked
        ? unique([...edge.notes, 'Diagram relationship is blocked as implementation evidence until a design graph edge is materialized.'])
        : edge.notes,
    } satisfies DiagramRenderEdge;
  });

  return {
    nodes,
    edges,
    blockedNodeIds: nodes.filter((node) => node.lineageStatus === 'BLOCKED_LINEAGE').map((node) => node.id),
    blockedEdgeIds: edges.filter((edge) => edge.lineageStatus === 'BLOCKED_LINEAGE').map((edge) => edge.id),
  };
}
