import type { DiagramCoverageRow, DiagramOverlayKey, DiagramRenderEdge, DiagramRenderLayer, DiagramRenderNode } from './types.js';

export type DiagramModeKey = 'physical' | 'logical' | 'wan-cloud' | 'security' | 'per-site' | 'implementation';

export function layersForDiagramMode(mode: DiagramModeKey): DiagramRenderLayer[] {
  if (mode === 'physical') return ['site', 'device', 'interface'];
  if (mode === 'logical') return ['site', 'interface', 'routing', 'security'];
  if (mode === 'wan-cloud') return ['site', 'device', 'routing', 'security'];
  if (mode === 'security') return ['site', 'device', 'security'];
  if (mode === 'per-site') return ['site', 'device', 'interface', 'security'];
  return ['implementation', 'verification', 'device'];
}

export function diagramModeImpactsForNode(node: DiagramRenderNode): DiagramModeKey[] {
  return (['physical', 'logical', 'wan-cloud', 'security', 'per-site', 'implementation'] as DiagramModeKey[]).filter((mode) => layersForDiagramMode(mode).includes(node.layer));
}

export function diagramModeImpactsForEdge(edge: DiagramRenderEdge): DiagramModeKey[] {
  const keys = new Set<DiagramModeKey>();
  const hasOverlay = (key: DiagramOverlayKey) => edge.overlayKeys.includes(key);
  if (hasOverlay('addressing')) { keys.add('logical'); keys.add('per-site'); }
  if (hasOverlay('routing')) { keys.add('wan-cloud'); keys.add('logical'); }
  if (hasOverlay('security') || hasOverlay('nat')) keys.add('security');
  if (hasOverlay('implementation') || hasOverlay('verification') || hasOverlay('operational-safety')) keys.add('implementation');
  if (edge.relationship.includes('device') || edge.relationship.includes('interface') || edge.relationship.includes('link')) keys.add('physical');
  return Array.from(keys);
}

export function coverageForDiagramNode(node: DiagramRenderNode): DiagramCoverageRow {
  return {
    rowType: 'node',
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
    lineageStatus: node.lineageStatus,
    graphNodeId: node.graphNodeId,
    graphEdgeIds: node.graphEdgeIds,
    implementationEvidence: node.implementationEvidence,
    hasGraphLineage: node.lineageStatus === 'GRAPH_BACKED' || node.lineageStatus === 'AGGREGATED_BACKEND_EVIDENCE' || node.lineageStatus === 'VISUAL_ONLY_NON_EVIDENCE',
    modeImpacts: diagramModeImpactsForNode(node),
  };
}

export function coverageForDiagramEdge(edge: DiagramRenderEdge): DiagramCoverageRow {
  return {
    rowType: 'edge',
    renderId: edge.id,
    backendObjectId: edge.relatedObjectIds[0] ?? edge.relationship,
    relationship: edge.relationship,
    truthState: edge.truthState,
    readiness: edge.readiness,
    hasBackendIdentity: edge.relatedObjectIds.length > 0 || Boolean(edge.relationship),
    hasTruthState: Boolean(edge.truthState),
    hasReadiness: Boolean(edge.readiness),
    sourceEngine: 'design-graph',
    relatedFindingIds: [],
    lineageStatus: edge.lineageStatus,
    graphEdgeIds: edge.graphEdgeIds,
    implementationEvidence: edge.implementationEvidence,
    hasGraphLineage: edge.lineageStatus === 'GRAPH_RELATIONSHIP_BACKED' || edge.lineageStatus === 'AGGREGATED_BACKEND_EVIDENCE' || edge.lineageStatus === 'VISUAL_ONLY_NON_EVIDENCE',
    modeImpacts: diagramModeImpactsForEdge(edge),
  };
}
