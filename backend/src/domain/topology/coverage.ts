import type { TopologyBaseObject, TopologyCoverageSummary, TopologyFinding, TopologyModel } from './types.js';

function allTopologyObjects(model: Omit<TopologyModel, 'summary'>): TopologyBaseObject[] {
  return [
    ...model.sites,
    ...model.vlans,
    ...model.devices,
    ...model.interfaces,
    ...model.links,
    ...model.zones,
    ...model.subnetAttachments,
    ...model.routeDomainMemberships,
  ];
}

export function buildTopologyCoverageSummary(model: Omit<TopologyModel, 'summary'>): TopologyCoverageSummary {
  const objects = allTopologyObjects(model);
  return {
    siteCount: model.sites.length,
    vlanCount: model.vlans.length,
    deviceCount: model.devices.length,
    interfaceCount: model.interfaces.length,
    linkCount: model.links.length,
    zoneCount: model.zones.length,
    subnetAttachmentCount: model.subnetAttachments.length,
    routeDomainMembershipCount: model.routeDomainMemberships.length,
    verifiedObjectCount: objects.filter((object) => object.status === 'verified').length,
    reviewRequiredObjectCount: objects.filter((object) => object.status === 'requires_review').length,
    incompleteObjectCount: objects.filter((object) => object.status === 'incomplete').length,
    findingCount: model.findings.length,
    blockingFindingCount: model.findings.filter((finding) => finding.severity === 'critical' || finding.severity === 'high').length,
    notes: [
      'Topology summary counts backend-owned topology objects only.',
      'Review-required and incomplete objects remain visible instead of being replaced by frontend-invented topology.',
    ],
  };
}

export function topologyFinding(params: { id: string; severity: TopologyFinding['severity']; title: string; detail: string; affectedObjectIds?: string[]; recommendedAction?: string }): TopologyFinding {
  return {
    id: params.id,
    severity: params.severity,
    title: params.title,
    detail: params.detail,
    affectedObjectIds: params.affectedObjectIds ?? [],
    recommendedAction: params.recommendedAction,
  };
}
