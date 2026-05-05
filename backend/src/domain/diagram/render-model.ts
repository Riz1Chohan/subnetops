import { buildOmittedEvidenceSummary, mergeOmittedEvidenceSummaries } from '../evidence/index.js';
import { enforceTruthStateReadiness, normalizeDiagramReadiness, readinessFromFindingSeverity, rollupDiagramReadiness } from './readiness.js';
import type {
  BuildDiagramRenderModelInput,
  DiagramFindingInput,
  DiagramNetworkObjectModelInput,
  DiagramObjectType,
  DiagramOverlayKey,
  DiagramRenderEdge,
  DiagramRenderGroup,
  DiagramRenderModel,
  DiagramRenderNode,
  DiagramSecurityZoneInput,
  DiagramTruthState,
} from './types.js';

type FindingRef = { id: string; severity: 'ERROR' | 'WARNING' | 'INFO'; affectedObjectIds: string[] };
type SiteSummary = { siteId: string; siteName: string; siteCode?: string | null; deviceIds: string[] };
type Point = { x: number; y: number };

type DiagramRenderNodeDraft = Omit<DiagramRenderNode, 'truthStateV1' | 'readinessImpact' | 'sourceRefs' | 'validationRefs' | 'warningBadges'> & Partial<Pick<DiagramRenderNode, 'truthStateV1' | 'readinessImpact' | 'sourceRefs' | 'validationRefs' | 'warningBadges'>>;
type DiagramRenderEdgeDraft = Omit<DiagramRenderEdge, 'truthState' | 'truthStateV1' | 'readinessImpact' | 'sourceRefs' | 'validationRefs' | 'warningBadges'> & Partial<Pick<DiagramRenderEdge, 'truthState' | 'truthStateV1' | 'readinessImpact' | 'sourceRefs' | 'validationRefs' | 'warningBadges'>>;

function readinessImpactFromDiagramReadiness(readiness: 'ready' | 'review' | 'blocked' | 'unknown') {
  if (readiness === 'blocked') return 'BLOCKING' as const;
  if (readiness === 'review' || readiness === 'unknown') return 'REVIEW' as const;
  return 'NONE' as const;
}

function v1TruthStateFromDiagramTruthState(truthState: DiagramTruthState | undefined | null) {
  switch (truthState) {
    case 'configured':
    case 'approved':
    case 'durable':
      return 'USER_PROVIDED' as const;
    case 'materialized':
    case 'discovered':
      return 'DERIVED' as const;
    case 'imported':
      return 'IMPORTED' as const;
    case 'review-required':
      return 'REVIEW_REQUIRED' as const;
    case 'blocked':
      return 'BLOCKED' as const;
    case 'inferred':
    case 'proposed':
    case 'planned':
    default:
      return 'ASSUMED' as const;
  }
}

function warningBadgesForDiagramEvidence(params: { readiness: 'ready' | 'review' | 'blocked' | 'unknown'; truthState: DiagramTruthState; truthStateV1: ReturnType<typeof v1TruthStateFromDiagramTruthState>; notes?: string[] }) {
  const badges: string[] = [];
  if (params.readiness === 'blocked') badges.push('BLOCKED');
  if (params.readiness === 'review' || params.readiness === 'unknown') badges.push('REVIEW_REQUIRED');
  if (params.truthStateV1 === 'ASSUMED') badges.push('ASSUMED_OR_INFERRED');
  if (params.truthStateV1 === 'IMPORTED') badges.push('IMPORTED_NOT_PROVEN');
  if (params.truthState === 'review-required') badges.push('SOURCE_REVIEW_REQUIRED');
  if (params.notes?.some((note) => /omitted|hidden|windowed/i.test(note))) badges.push('OMITTED_EVIDENCE_WARNING');
  return Array.from(new Set(badges));
}

function decorateRenderNode(node: DiagramRenderNodeDraft): DiagramRenderNode {
  const readiness = enforceTruthStateReadiness(node.readiness, node.truthState);
  const truthStateV1 = node.truthStateV1 ?? v1TruthStateFromDiagramTruthState(node.truthState);
  const sourceRefs = node.sourceRefs?.length ? node.sourceRefs : [`${node.sourceEngine}:${node.objectId}`];
  const validationRefs = node.validationRefs?.length ? node.validationRefs : (node.relatedFindingIds.length ? node.relatedFindingIds : [`diagram-readiness:${readiness}`]);
  return {
    ...node,
    readiness,
    truthStateV1,
    readinessImpact: node.readinessImpact ?? readinessImpactFromDiagramReadiness(readiness),
    sourceRefs,
    validationRefs,
    warningBadges: node.warningBadges?.length ? node.warningBadges : warningBadgesForDiagramEvidence({ readiness, truthState: node.truthState, truthStateV1, notes: node.notes }),
  };
}

function decorateRenderEdge(edge: DiagramRenderEdgeDraft): DiagramRenderEdge {
  const truthState = edge.truthState ?? (edge.readiness === 'blocked' ? 'blocked' : edge.readiness === 'review' || edge.readiness === 'unknown' ? 'review-required' : 'materialized');
  const readiness = enforceTruthStateReadiness(edge.readiness, truthState);
  const truthStateV1 = edge.truthStateV1 ?? v1TruthStateFromDiagramTruthState(truthState);
  const sourceRefs = edge.sourceRefs?.length ? edge.sourceRefs : (edge.relatedObjectIds.length ? edge.relatedObjectIds.map((id) => `${edge.relationship}:${id}`) : [`diagram-edge:${edge.id}`]);
  const validationRefs = edge.validationRefs?.length ? edge.validationRefs : [`diagram-edge-readiness:${readiness}`, `diagram-edge-truth:${truthState}`];
  return {
    ...edge,
    readiness,
    truthState,
    truthStateV1,
    readinessImpact: edge.readinessImpact ?? readinessImpactFromDiagramReadiness(readiness),
    sourceRefs,
    validationRefs,
    warningBadges: edge.warningBadges?.length ? edge.warningBadges : warningBadgesForDiagramEvidence({ readiness, truthState, truthStateV1, notes: edge.notes }),
  };
}


function safeId(value: string) {
  return value.replace(/[^a-z0-9_-]/gi, '-');
}

function cleanDiagramLabel(value: string) {
  return value
    .replace(/\bStage\s+\d+\s+models\b/gi, 'The current planning model uses')
    .replace(/\bFuture stages\b/gi, 'Future versions')
    .replace(/\bbackend\b/gi, 'design model')
    .replace(/\bdesign-core\b/gi, 'design model')
    .replace(/device-[0-9a-f-]+/gi, 'modeled device')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function siteDiagramCode(site: { siteCode?: string | null; siteName: string }) {
  if (site.siteCode && site.siteCode.trim()) return site.siteCode.trim();
  if (/hq/i.test(site.siteName)) return 'HQ';
  const numberMatch = site.siteName.match(/\b(\d{1,2})\b/);
  return numberMatch ? `S${numberMatch[1]}` : site.siteName.slice(0, 6).toUpperCase();
}

function siteDiagramRank(site: { siteCode?: string | null; siteName: string }) {
  const label = `${site.siteCode ?? ''} ${site.siteName}`.toLowerCase();
  if (label.includes('hq') || label.includes('head') || label.includes('primary')) return -1;
  const numberMatch = label.match(/\b(?:site|s)\s*(\d{1,2})\b/);
  return numberMatch ? Number(numberMatch[1]) : 999;
}

function deviceDiagramLabel(device: DiagramNetworkObjectModelInput['devices'][number]) {
  const siteCode = device.siteCode || (device.siteName || '').replace(/^Site\s+/i, 'S').replace(/\s.*$/, '');
  if (device.deviceRole === 'security-firewall') return `${siteCode} Security Firewall`;
  if (device.deviceRole === 'core-layer3-switch') return `${siteCode} Core Gateway`;
  if (device.deviceRole === 'branch-edge-router') return `${siteCode} Branch Gateway`;
  if (device.deviceRole === 'routing-identity') return `${siteCode} Routing Identity`;
  return `${siteCode} Network Device`;
}

function addNode(nodes: DiagramRenderNode[], node: DiagramRenderNodeDraft) {
  if (!nodes.some((existing) => existing.id === node.id)) nodes.push(decorateRenderNode(node));
}

function addEdge(edges: DiagramRenderEdge[], edge: DiagramRenderEdgeDraft) {
  if (!edges.some((existing) => existing.id === edge.id)) edges.push(decorateRenderEdge(edge));
}

function collectFindingRefs(networkObjectModel: DiagramNetworkObjectModelInput): FindingRef[] {
  const fromFinding = (prefix: string, findings: DiagramFindingInput[]) => findings.map((finding, index) => ({
    id: `${prefix}-${index}-${finding.code}`,
    severity: finding.severity,
    affectedObjectIds: finding.affectedObjectIds,
  }));
  return [
    ...fromFinding('graph', networkObjectModel.designGraph.integrityFindings),
    ...fromFinding('routing', networkObjectModel.routingSegmentation.reachabilityFindings),
    ...fromFinding('security', networkObjectModel.securityPolicyFlow.findings),
    ...networkObjectModel.implementationPlan.findings.map((finding, index) => ({
      id: `implementation-${index}-${finding.code}`,
      severity: finding.severity,
      affectedObjectIds: finding.affectedStepIds,
    })),
  ];
}

function renderReadiness(readiness: 'ready' | 'review' | 'blocked' | 'unknown', truthState?: DiagramTruthState) {
  return enforceTruthStateReadiness(readiness, truthState);
}

function readinessForObject(objectId: string, networkObjectModel: DiagramNetworkObjectModelInput, findingRefs: FindingRef[], truthState?: DiagramTruthState) {
  const findingMatches = findingRefs.filter((finding) => finding.affectedObjectIds.includes(objectId));
  const implementationMatches = networkObjectModel.implementationPlan.steps.filter((step) => step.targetObjectId === objectId || step.dependencyObjectIds.includes(objectId));
  const verificationMatches = networkObjectModel.implementationPlan.verificationChecks.filter((check) => check.relatedObjectIds.includes(objectId));
  const readiness = rollupDiagramReadiness([
    ...findingMatches.map((finding) => readinessFromFindingSeverity(finding.severity)),
    ...implementationMatches.map((step) => normalizeDiagramReadiness(step.readiness)),
    ...verificationMatches.map((check) => normalizeDiagramReadiness(check.readiness)),
  ]);
  return {
    readiness: enforceTruthStateReadiness(readiness === 'unknown' ? 'ready' as const : readiness, truthState),
    relatedFindingIds: findingMatches.map((finding) => finding.id),
  };
}

function sitesForDiagram(networkObjectModel: DiagramNetworkObjectModelInput): SiteSummary[] {
  const siteMap = new Map<string, SiteSummary>();
  for (const device of networkObjectModel.devices) {
    const existing = siteMap.get(device.siteId);
    if (existing) {
      existing.deviceIds.push(device.id);
      if (!existing.siteCode && device.siteCode) existing.siteCode = device.siteCode;
    } else {
      siteMap.set(device.siteId, {
        siteId: device.siteId,
        siteName: device.siteName,
        siteCode: device.siteCode,
        deviceIds: [device.id],
      });
    }
  }
  for (const graphNode of networkObjectModel.designGraph.nodes.filter((node) => node.objectType === 'site')) {
    if (!siteMap.has(graphNode.objectId)) {
      siteMap.set(graphNode.objectId, {
        siteId: graphNode.objectId,
        siteName: graphNode.label,
        deviceIds: [],
      });
    }
  }
  return Array.from(siteMap.values()).sort((left, right) => {
    const rankDiff = siteDiagramRank(left) - siteDiagramRank(right);
    return rankDiff !== 0 ? rankDiff : siteDiagramCode(left).localeCompare(siteDiagramCode(right), undefined, { numeric: true });
  });
}

function sitePointsForDiagram(sites: SiteSummary[]) {
  const sitePoints = new Map<string, Point>();
  const primarySite = sites.find((site) => /hq|head|primary/i.test(`${site.siteCode ?? ''} ${site.siteName}`)) ?? sites[0];
  const branchSites = sites.filter((site) => site.siteId !== primarySite?.siteId);
  if (primarySite) sitePoints.set(primarySite.siteId, { x: 760, y: 190 });
  const branchColumnCount = branchSites.length <= 4 ? Math.max(1, branchSites.length) : 5;
  branchSites.forEach((site, index) => {
    const column = index % branchColumnCount;
    const row = Math.floor(index / branchColumnCount);
    sitePoints.set(site.siteId, { x: 180 + column * 300, y: 500 + row * 230 });
  });
  return { primarySite, branchSites, sitePoints };
}

function wanZoneForDiagram(securityZones: DiagramSecurityZoneInput[]) {
  return securityZones.find((zone) => zone.zoneRole === 'wan') ?? securityZones.find((zone) => /wan|internet|wide area/i.test(zone.name));
}

function addRouteDomainNode(params: { nodes: DiagramRenderNode[]; routeDomain?: DiagramNetworkObjectModelInput['routeDomains'][number]; networkObjectModel: DiagramNetworkObjectModelInput; findingRefs: FindingRef[] }) {
  const { nodes, routeDomain, networkObjectModel, findingRefs } = params;
  if (!routeDomain) return;
  const readiness = readinessForObject(routeDomain.id, networkObjectModel, findingRefs, routeDomain.truthState);
  addNode(nodes, {
    id: `render-route-domain-${routeDomain.id}`,
    objectId: routeDomain.id,
    objectType: 'route-domain',
    label: cleanDiagramLabel(routeDomain.name || 'Corporate Routing Domain'),
    layer: 'routing',
    readiness: readiness.readiness,
    truthState: routeDomain.truthState,
    x: 760,
    y: 70,
    sourceEngine: 'routing',
    relatedFindingIds: readiness.relatedFindingIds,
    notes: routeDomain.notes.map(cleanDiagramLabel).slice(0, 4),
  });
}

function addWanNode(params: { nodes: DiagramRenderNode[]; wanZone?: DiagramSecurityZoneInput; networkObjectModel: DiagramNetworkObjectModelInput; findingRefs: FindingRef[] }) {
  const { nodes, wanZone, networkObjectModel, findingRefs } = params;
  const readiness = wanZone ? readinessForObject(wanZone.id, networkObjectModel, findingRefs, wanZone.truthState) : { readiness: 'review' as const, relatedFindingIds: [] };
  addNode(nodes, {
    id: 'render-wan-internet-edge',
    objectId: wanZone?.id ?? 'wan-internet-edge-review-boundary',
    objectType: 'security-zone',
    label: 'WAN / Internet Edge',
    layer: 'security',
    readiness: readiness.readiness,
    truthState: wanZone?.truthState ?? 'review-required',
    x: 760,
    y: 340,
    sourceEngine: 'security',
    relatedFindingIds: readiness.relatedFindingIds,
    notes: wanZone?.notes.map(cleanDiagramLabel).slice(0, 4) ?? ['WAN or internet boundary needs backend security-zone evidence before it is implementation-ready.'],
  });
}

function addSiteNodes(params: { nodes: DiagramRenderNode[]; edges: DiagramRenderEdge[]; sites: SiteSummary[]; sitePoints: Map<string, Point>; networkObjectModel: DiagramNetworkObjectModelInput }) {
  const { nodes, edges, sites, sitePoints, networkObjectModel } = params;
  for (const site of sites) {
    const point = sitePoints.get(site.siteId) ?? { x: 160 + nodes.length * 180, y: 500 };
    const siteNodeId = `render-site-${site.siteId}`;
    addNode(nodes, {
      id: siteNodeId,
      objectId: site.siteId,
      objectType: 'site',
      label: `${siteDiagramCode(site)} — ${site.siteName}`,
      groupId: `site:${site.siteId}`,
      siteId: site.siteId,
      layer: 'site',
      readiness: renderReadiness('ready', 'configured'),
      truthState: 'configured',
      x: point.x,
      y: point.y,
      sourceEngine: 'object-model',
      relatedFindingIds: [],
      notes: [`Site group from backend topology evidence for ${site.siteName}.`],
    });

    const siteDhcpPools = networkObjectModel.dhcpPools.filter((pool) => pool.siteId === site.siteId);
    if (siteDhcpPools.length > 0) {
      const dhcpNodeId = `render-dhcp-summary-${site.siteId}`;
      addNode(nodes, {
        id: dhcpNodeId,
        objectId: `dhcp-summary-${site.siteId}`,
        objectType: 'dhcp-pool',
        label: `${siteDiagramCode(site)} DHCP (${siteDhcpPools.length})`,
        groupId: `site:${site.siteId}`,
        siteId: site.siteId,
        layer: 'interface',
        readiness: renderReadiness('review', 'inferred'),
        truthState: 'inferred',
        x: point.x + 88,
        y: point.y + 95,
        sourceEngine: 'object-model',
        relatedFindingIds: [],
        notes: [`Collapsed ${siteDhcpPools.length} backend DHCP scope record(s) for this site.`],
      });
      addEdge(edges, {
        id: `render-edge-site-dhcp-${site.siteId}`,
        relationship: 'dhcp-pool-serves-subnet',
        sourceNodeId: siteNodeId,
        targetNodeId: dhcpNodeId,
        label: 'DHCP scope summary',
        readiness: 'review',
        overlayKeys: ['addressing'],
        relatedObjectIds: siteDhcpPools.map((pool) => pool.id).slice(0, 12),
        notes: ['Collapsed DHCP evidence edge. The frontend may display it, not invent scope details.'],
      });
    }
  }
}

function addVlanSubnetNodes(params: { nodes: DiagramRenderNode[]; edges: DiagramRenderEdge[]; sites: SiteSummary[]; sitePoints: Map<string, Point>; networkObjectModel: DiagramNetworkObjectModelInput }) {
  const { nodes, edges, sites, sitePoints, networkObjectModel } = params;
  const subnetByVlanGraphNodeId = new Map<string, DiagramNetworkObjectModelInput['designGraph']['nodes'][number]>();
  for (const graphEdge of networkObjectModel.designGraph.edges.filter((edge) => edge.relationship === 'vlan-uses-subnet')) {
    const targetNode = networkObjectModel.designGraph.nodes.find((node) => node.id === graphEdge.targetNodeId && node.objectType === 'subnet');
    if (targetNode) subnetByVlanGraphNodeId.set(graphEdge.sourceNodeId, targetNode);
  }

  const rowCountBySite = new Map<string, number>();
  for (const graphNode of networkObjectModel.designGraph.nodes.filter((node) => node.objectType === 'vlan' && node.siteId)) {
    const site = sites.find((candidate) => candidate.siteId === graphNode.siteId);
    if (!site || !graphNode.siteId) continue;
    const rowIndex = rowCountBySite.get(site.siteId) ?? 0;
    if (rowIndex >= 14) continue;
    rowCountBySite.set(site.siteId, rowIndex + 1);
    const point = sitePoints.get(site.siteId) ?? { x: 160 + nodes.length * 180, y: 500 };
    const safeVlanId = safeId(graphNode.objectId);
    const vlanNodeId = `render-vlan-${safeVlanId}`;
    addNode(nodes, {
      id: vlanNodeId,
      objectId: graphNode.objectId,
      objectType: 'vlan',
      label: cleanDiagramLabel(graphNode.label.replace(/^.*?\bVLAN\s+/i, 'VLAN ')),
      groupId: `site:${site.siteId}`,
      siteId: site.siteId,
      layer: 'site',
      readiness: renderReadiness('ready', graphNode.truthState),
      truthState: graphNode.truthState,
      x: point.x - 170 + (rowIndex % 2) * 340,
      y: point.y + 190 + Math.floor(rowIndex / 2) * 82,
      sourceEngine: 'object-model',
      relatedFindingIds: [],
      notes: graphNode.notes.map(cleanDiagramLabel).slice(0, 3),
    });
    addEdge(edges, {
      id: `render-edge-site-vlan-${safeVlanId}`,
      relationship: 'site-contains-vlan',
      sourceNodeId: `render-site-${site.siteId}`,
      targetNodeId: vlanNodeId,
      label: 'VLAN membership',
      readiness: renderReadiness('ready', graphNode.truthState),
      overlayKeys: ['addressing'],
      relatedObjectIds: [site.siteId, graphNode.objectId],
      notes: ['Site/VLAN membership from backend design graph.'],
    });

    const subnet = subnetByVlanGraphNodeId.get(graphNode.id);
    if (subnet) {
      const subnetNodeId = `render-subnet-${safeId(subnet.objectId)}`;
      addNode(nodes, {
        id: subnetNodeId,
        objectId: subnet.objectId,
        objectType: 'subnet',
        label: cleanDiagramLabel(subnet.label),
        groupId: `site:${site.siteId}`,
        siteId: site.siteId,
        layer: 'interface',
        readiness: renderReadiness('ready', subnet.truthState),
        truthState: subnet.truthState,
        x: point.x - 170 + (rowIndex % 2) * 340,
        y: point.y + 225 + Math.floor(rowIndex / 2) * 82,
        sourceEngine: 'object-model',
        relatedFindingIds: [],
        notes: subnet.notes.map(cleanDiagramLabel).slice(0, 3),
      });
      addEdge(edges, {
        id: `render-edge-vlan-subnet-${safeVlanId}`,
        relationship: 'vlan-uses-subnet',
        sourceNodeId: vlanNodeId,
        targetNodeId: subnetNodeId,
        label: 'subnet',
        readiness: renderReadiness('ready', subnet.truthState),
        overlayKeys: ['addressing'],
        relatedObjectIds: [graphNode.objectId, subnet.objectId],
        notes: ['VLAN-to-subnet binding from backend addressing/design graph evidence.'],
      });
    }
  }
}

function addDeviceNodes(params: { nodes: DiagramRenderNode[]; edges: DiagramRenderEdge[]; sites: SiteSummary[]; branchSites: SiteSummary[]; primarySite?: SiteSummary; sitePoints: Map<string, Point>; routeDomain?: DiagramNetworkObjectModelInput['routeDomains'][number]; wanZone?: DiagramSecurityZoneInput; networkObjectModel: DiagramNetworkObjectModelInput; findingRefs: FindingRef[] }) {
  const { nodes, edges, sites, branchSites, primarySite, sitePoints, routeDomain, wanZone, networkObjectModel, findingRefs } = params;
  const devicesBySite = new Map<string, DiagramNetworkObjectModelInput['devices']>();
  for (const device of networkObjectModel.devices) {
    const current = devicesBySite.get(device.siteId) ?? [];
    current.push(device);
    devicesBySite.set(device.siteId, current);
  }

  for (const site of sites) {
    const point = sitePoints.get(site.siteId);
    if (!point) continue;
    const devices = (devicesBySite.get(site.siteId) ?? []).sort((left, right) => {
      const roleRank: Record<DiagramNetworkObjectModelInput['devices'][number]['deviceRole'], number> = {
        'security-firewall': 0,
        'core-layer3-switch': 1,
        'branch-edge-router': 1,
        'routing-identity': 2,
        unknown: 3,
      };
      return roleRank[left.deviceRole] - roleRank[right.deviceRole] || left.name.localeCompare(right.name);
    });

    devices.forEach((device, index) => {
      const readiness = readinessForObject(device.id, networkObjectModel, findingRefs, device.truthState);
      const deviceNodeId = `render-device-${device.id}`;
      const xOffset = devices.length === 1 ? 0 : (index - (devices.length - 1) / 2) * 120;
      addNode(nodes, {
        id: deviceNodeId,
        objectId: device.id,
        objectType: 'network-device',
        label: cleanDiagramLabel(deviceDiagramLabel(device)),
        groupId: `site:${site.siteId}`,
        siteId: site.siteId,
        layer: 'device',
        readiness: readiness.readiness,
        truthState: device.truthState,
        x: point.x + xOffset,
        y: point.y + 100,
        sourceEngine: 'object-model',
        relatedFindingIds: readiness.relatedFindingIds,
        notes: device.notes.map(cleanDiagramLabel).slice(0, 4),
      });
      addEdge(edges, {
        id: `render-edge-site-device-${device.id}`,
        relationship: 'site-contains-device',
        sourceNodeId: `render-site-${site.siteId}`,
        targetNodeId: deviceNodeId,
        label: 'site device',
        readiness: readiness.readiness === 'blocked' ? 'blocked' : 'ready',
        overlayKeys: ['addressing'],
        relatedObjectIds: [site.siteId, device.id],
        notes: ['Site-to-device ownership edge from backend object model.'],
      });
      if (routeDomain) {
        addEdge(edges, {
          id: `render-edge-device-route-domain-${device.id}`,
          relationship: 'interface-belongs-to-route-domain',
          sourceNodeId: deviceNodeId,
          targetNodeId: `render-route-domain-${routeDomain.id}`,
          label: 'routing domain',
          readiness: 'review',
          overlayKeys: ['routing'],
          relatedObjectIds: [device.id, routeDomain.id],
          notes: ['Device route-domain participation from backend route-domain evidence or review requirement.'],
        });
      }
      addEdge(edges, {
        id: `render-edge-device-wan-${device.id}`,
        relationship: 'network-link-terminates-on-device',
        sourceNodeId: deviceNodeId,
        targetNodeId: 'render-wan-internet-edge',
        label: device.deviceRole === 'security-firewall' ? 'internet/security edge' : 'WAN edge path',
        readiness: 'review',
        overlayKeys: ['routing', 'nat'],
        relatedObjectIds: [device.id, wanZone?.id ?? 'wan-internet-edge-review-boundary'],
        notes: ['WAN/internet boundary path from backend object model; it is review-gated unless explicit link evidence exists.'],
      });
    });
  }

  const primaryDevices = primarySite ? devicesBySite.get(primarySite.siteId) ?? [] : [];
  const primaryGateway = primaryDevices.find((device) => device.deviceRole === 'core-layer3-switch') ?? primaryDevices.find((device) => device.deviceRole !== 'security-firewall');
  if (!primaryGateway) return;
  for (const site of branchSites) {
    const branchGateway = (devicesBySite.get(site.siteId) ?? []).find((device) => device.deviceRole === 'branch-edge-router') ?? (devicesBySite.get(site.siteId) ?? [])[0];
    if (!branchGateway) continue;
    addEdge(edges, {
      id: `render-edge-hub-spoke-${primaryGateway.id}-${branchGateway.id}`,
      relationship: 'network-link-terminates-on-device',
      sourceNodeId: `render-device-${primaryGateway.id}`,
      targetNodeId: `render-device-${branchGateway.id}`,
      label: 'site-to-site summary path',
      readiness: 'review',
      overlayKeys: ['routing'],
      relatedObjectIds: [primaryGateway.id, branchGateway.id],
      notes: ['Hub-and-spoke relationship derived from backend multi-site routing intent.'],
    });
  }
}

function addSecurityNodes(params: { nodes: DiagramRenderNode[]; edges: DiagramRenderEdge[]; routeDomain?: DiagramNetworkObjectModelInput['routeDomains'][number]; networkObjectModel: DiagramNetworkObjectModelInput; findingRefs: FindingRef[] }) {
  const { nodes, edges, routeDomain, networkObjectModel, findingRefs } = params;
  const zoneBaseX = 1580;
  const zoneBaseY = 120;
  const visibleZones = networkObjectModel.securityZones
    .filter((zone) => zone.zoneRole !== 'wan')
    .filter((zone) => !/voice/i.test(zone.name) || zone.subnetCidrs.length > 0 || zone.vlanIds.length > 0)
    .sort((left, right) => left.zoneRole.localeCompare(right.zoneRole) || left.name.localeCompare(right.name))
    .slice(0, 8);

  visibleZones.forEach((zone, index) => {
    const readiness = readinessForObject(zone.id, networkObjectModel, findingRefs, zone.truthState);
    const zoneNodeId = `render-zone-${zone.id}`;
    addNode(nodes, {
      id: zoneNodeId,
      objectId: zone.id,
      objectType: 'security-zone',
      label: cleanDiagramLabel(zone.name),
      layer: 'security',
      readiness: readiness.readiness,
      truthState: zone.truthState,
      x: zoneBaseX,
      y: zoneBaseY + index * 92,
      sourceEngine: 'security',
      relatedFindingIds: readiness.relatedFindingIds,
      notes: zone.notes.map(cleanDiagramLabel).slice(0, 4),
    });
    if (routeDomain) {
      addEdge(edges, {
        id: `render-edge-route-domain-zone-${zone.id}`,
        relationship: 'security-zone-protects-subnet',
        sourceNodeId: `render-route-domain-${routeDomain.id}`,
        targetNodeId: zoneNodeId,
        label: 'zone boundary',
        readiness: zone.isolationExpectation === 'isolated' || zone.isolationExpectation === 'restricted' ? 'review' : readiness.readiness,
        overlayKeys: ['security'],
        relatedObjectIds: [routeDomain.id, zone.id],
        notes: [`${zone.name} carries ${zone.subnetCidrs.length} subnet(s) and ${zone.vlanIds.length} VLAN id(s).`],
      });
    }
  });

  networkObjectModel.policyRules
    .filter((policy) => policy.action === 'deny' || /guest|management|dmz|wan/i.test(policy.name))
    .slice(0, 10)
    .forEach((policy, index) => {
      const policyNodeId = `render-policy-${policy.id}`;
      addNode(nodes, {
        id: policyNodeId,
        objectId: policy.id,
        objectType: 'policy-rule',
        label: cleanDiagramLabel(policy.name.replace(/^Deny\s+/i, 'Deny ')),
        layer: 'security',
        readiness: renderReadiness(policy.action === 'review' ? 'review' : 'ready', policy.truthState),
        truthState: policy.truthState,
        x: zoneBaseX + 280,
        y: zoneBaseY + index * 86,
        sourceEngine: 'security',
        relatedFindingIds: [],
        notes: [policy.rationale, ...policy.notes].filter(Boolean).map(cleanDiagramLabel).slice(0, 4),
      });
      const sourceZoneNodeId = `render-zone-${policy.sourceZoneId}`;
      const targetZoneNodeId = `render-zone-${policy.destinationZoneId}`;
      const sourceExists = nodes.some((node) => node.id === sourceZoneNodeId);
      const targetExists = nodes.some((node) => node.id === targetZoneNodeId);
      addEdge(edges, {
        id: `render-edge-policy-source-${policy.id}`,
        relationship: 'security-zone-applies-policy',
        sourceNodeId: sourceExists ? sourceZoneNodeId : 'render-wan-internet-edge',
        targetNodeId: policyNodeId,
        label: `${policy.action} policy`,
        readiness: renderReadiness(policy.action === 'review' ? 'review' : 'ready', policy.truthState),
        overlayKeys: ['security'],
        relatedObjectIds: [policy.id, policy.sourceZoneId],
        notes: ['Policy source relationship from backend security-policy model.'],
      });
      if (targetExists) {
        addEdge(edges, {
          id: `render-edge-policy-target-${policy.id}`,
          relationship: 'security-flow-covered-by-policy',
          sourceNodeId: policyNodeId,
          targetNodeId: targetZoneNodeId,
          label: 'protected destination',
          readiness: renderReadiness(policy.action === 'review' ? 'review' : 'ready', policy.truthState),
          overlayKeys: ['security'],
          relatedObjectIds: [policy.id, policy.destinationZoneId],
          notes: ['Policy destination relationship from backend security-policy model.'],
        });
      }
    });
}

function buildGroups(params: { nodes: DiagramRenderNode[]; sites: SiteSummary[]; routeDomain?: DiagramNetworkObjectModelInput['routeDomains'][number]; visibleZones: DiagramSecurityZoneInput[]; networkObjectModel: DiagramNetworkObjectModelInput; findingRefs: FindingRef[] }): DiagramRenderGroup[] {
  const { nodes, sites, routeDomain, visibleZones, networkObjectModel, findingRefs } = params;
  return [
    ...sites.map((site) => ({
      id: `site:${site.siteId}`,
      groupType: 'site' as const,
      label: `${siteDiagramCode(site)} — ${site.siteName}`,
      readiness: rollupDiagramReadiness(nodes.filter((node) => node.siteId === site.siteId).map((node) => node.readiness)),
      nodeIds: nodes.filter((node) => node.siteId === site.siteId).map((node) => node.id),
      notes: [`Backend diagram grouping for ${site.siteName}.`],
    })),
    ...(routeDomain ? [{
      id: `route-domain:${routeDomain.id}`,
      groupType: 'route-domain' as const,
      label: routeDomain.name,
      readiness: readinessForObject(routeDomain.id, networkObjectModel, findingRefs, routeDomain.truthState).readiness,
      nodeIds: nodes.filter((node) => node.objectId === routeDomain.id || node.layer === 'routing').map((node) => node.id),
      notes: routeDomain.notes,
    }] : []),
    ...visibleZones.map((zone) => ({
      id: `security-zone:${zone.id}`,
      groupType: 'security-zone' as const,
      label: zone.name,
      readiness: readinessForObject(zone.id, networkObjectModel, findingRefs, zone.truthState).readiness,
      nodeIds: nodes.filter((node) => node.objectId === zone.id).map((node) => node.id),
      notes: zone.notes,
    })),
  ];
}

function buildOverlays(params: { nodes: DiagramRenderNode[]; edges: DiagramRenderEdge[]; overlaySummaries: BuildDiagramRenderModelInput['overlaySummaries']; hotspots: BuildDiagramRenderModelInput['hotspots'] }) {
  const overlayKeyToLayer: Record<DiagramOverlayKey, DiagramRenderNode['layer'][]> = {
    addressing: ['site', 'device', 'interface'],
    routing: ['site', 'device', 'routing'],
    security: ['site', 'device', 'security'],
    nat: ['device', 'security', 'routing'],
    implementation: ['implementation'],
    verification: ['verification', 'implementation'],
    'operational-safety': ['device', 'implementation'],
  };
  return params.overlaySummaries.map((summary) => {
    const layers = overlayKeyToLayer[summary.key];
    return {
      key: summary.key,
      label: summary.label,
      readiness: summary.readiness,
      nodeIds: params.nodes.filter((node) => layers.includes(node.layer)).map((node) => node.id),
      edgeIds: params.edges.filter((edge) => edge.overlayKeys.includes(summary.key)).map((edge) => edge.id),
      hotspotIndexes: params.hotspots.map((_, hotspotIndex) => hotspotIndex).slice(0, 6),
      detail: summary.detail,
    };
  });
}

function validateRenderGraph(nodes: DiagramRenderNode[], edges: DiagramRenderEdge[]) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const danglingEdges = edges.filter((edge) => !nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId));
  if (danglingEdges.length > 0) {
    return {
      reason: `${danglingEdges.length} backend diagram edge(s) reference missing render nodes.`,
      requiredInputs: danglingEdges.map((edge) => `Fix source/target for ${edge.id}`).slice(0, 8),
    };
  }
  return undefined;
}

export function buildDiagramRenderModel(input: BuildDiagramRenderModelInput): DiagramRenderModel {
  const { networkObjectModel, overlaySummaries, hotspots } = input;
  const findingRefs = collectFindingRefs(networkObjectModel);
  const nodes: DiagramRenderNode[] = [];
  const edges: DiagramRenderEdge[] = [];
  const sites = sitesForDiagram(networkObjectModel);
  const { primarySite, branchSites, sitePoints } = sitePointsForDiagram(sites);
  const routeDomain = networkObjectModel.routeDomains[0];
  const wanZone = wanZoneForDiagram(networkObjectModel.securityZones);

  addRouteDomainNode({ nodes, routeDomain, networkObjectModel, findingRefs });
  addWanNode({ nodes, wanZone, networkObjectModel, findingRefs });
  addSiteNodes({ nodes, edges, sites, sitePoints, networkObjectModel });
  addVlanSubnetNodes({ nodes, edges, sites, sitePoints, networkObjectModel });
  addDeviceNodes({ nodes, edges, sites, branchSites, primarySite, sitePoints, routeDomain, wanZone, networkObjectModel, findingRefs });
  addSecurityNodes({ nodes, edges, routeDomain, networkObjectModel, findingRefs });

  const visibleZones = networkObjectModel.securityZones
    .filter((zone) => zone.zoneRole !== 'wan')
    .filter((zone) => !/voice/i.test(zone.name) || zone.subnetCidrs.length > 0 || zone.vlanIds.length > 0)
    .sort((left, right) => left.zoneRole.localeCompare(right.zoneRole) || left.name.localeCompare(right.name))
    .slice(0, 8);
  const groups = buildGroups({ nodes, sites, routeDomain, visibleZones, networkObjectModel, findingRefs });
  const overlays = buildOverlays({ nodes, edges, overlaySummaries, hotspots });
  const omittedEvidenceSummaries = [
    buildOmittedEvidenceSummary({ collection: 'diagram security zones', surface: 'DiagramRenderModel.securityZones', items: networkObjectModel.securityZones.filter((zone) => zone.zoneRole !== 'wan'), shownCount: visibleZones.length, exportImpact: 'Diagram hides extra zones only with an omitted counter; hidden blocked/review zones keep the diagram review-gated.' }),
    buildOmittedEvidenceSummary({ collection: 'diagram policy rules', surface: 'DiagramRenderModel.policyRules', items: networkObjectModel.policyRules.filter((policy) => policy.action === 'deny' || /guest|management|dmz|wan/i.test(policy.name)), shownCount: Math.min(10, networkObjectModel.policyRules.filter((policy) => policy.action === 'deny' || /guest|management|dmz|wan/i.test(policy.name)).length), exportImpact: 'Policy nodes are windowed visually; hidden policy blockers/review states must remain visible in summary/report evidence.' }),
    buildOmittedEvidenceSummary({ collection: 'diagram hotspots', surface: 'DiagramRenderModel.overlays.hotspotIndexes', items: hotspots, shownCount: Math.min(6, hotspots.length), exportImpact: 'Overlay hotspots are windowed visually; hidden hotspots require counters so warnings do not disappear.' }),
    buildOmittedEvidenceSummary({ collection: 'dangling diagram edges', surface: 'DiagramRenderModel.emptyState.requiredInputs', items: validateRenderGraph(nodes, edges)?.requiredInputs ?? [], shownCount: Math.min(8, validateRenderGraph(nodes, edges)?.requiredInputs?.length ?? 0), exportImpact: 'Dangling-edge repair prompts are windowed but any omitted repair prompt keeps diagram output review-gated.' }),
  ];
  const omittedEvidenceRollup = mergeOmittedEvidenceSummaries(omittedEvidenceSummaries);

  const routeLinkCount = edges.filter((edge) => edge.overlayKeys.includes('routing')).length;
  const missingRenderInputs = [
    sites.length <= 0 ? 'materialized site topology groups' : null,
    networkObjectModel.devices.length <= 0 ? 'modeled network devices' : null,
    routeLinkCount <= 0 ? 'WAN or routing relationships' : null,
  ].filter(Boolean) as string[];
  const danglingState = validateRenderGraph(nodes, edges);
  const emptyState = danglingState ?? (missingRenderInputs.length > 0
    ? {
        reason: `Authoritative topology canvas is blocked because these inputs are missing: ${missingRenderInputs.join(', ')}.`,
        requiredInputs: missingRenderInputs.map((item) => `Generate ${item}`),
      }
    : undefined);

  return {
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      groupCount: groups.length,
      overlayCount: overlays.length,
      backendAuthored: true,
      layoutMode: 'V1-backend-truth-layout-contract',
      contractId: 'V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT',
      truthContract: 'backend-only-render-model',
      modeCount: 6,
      evidenceWindowCount: omittedEvidenceRollup.surfaceCount,
      omittedEvidenceTotalCount: omittedEvidenceRollup.totalOmittedCount,
      omittedEvidenceHasBlockers: omittedEvidenceRollup.omittedHasBlockers,
      omittedEvidenceHasReviewRequired: omittedEvidenceRollup.omittedHasReviewRequired,
    },
    nodes,
    edges,
    groups,
    overlays,
    emptyState,
    omittedEvidenceSummaries,
  };
}

export function assertBackendDiagramRenderModel(model: DiagramRenderModel) {
  const nodeIds = new Set(model.nodes.map((node) => node.id));
  const nodesWithoutObjectIds = model.nodes.filter((node) => !node.objectId);
  const edgesWithoutRelatedObjects = model.edges.filter((edge) => edge.relatedObjectIds.length === 0 && !edge.relationship);
  const danglingEdges = model.edges.filter((edge) => !nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId));
  return {
    backendAuthored: model.summary.backendAuthored === true && model.summary.truthContract === 'backend-only-render-model',
    nodesWithoutObjectIds,
    edgesWithoutRelatedObjects,
    danglingEdges,
    ready: model.summary.backendAuthored === true && nodesWithoutObjectIds.length === 0 && edgesWithoutRelatedObjects.length === 0 && danglingEdges.length === 0,
  };
}

export function diagramObjectStatusFromTruthState(truthState: DiagramTruthState): 'verified' | 'requires_review' | 'incomplete' {
  if (truthState === 'blocked') return 'incomplete';
  if (truthState === 'review-required' || truthState === 'inferred' || truthState === 'proposed' || truthState === 'planned') return 'requires_review';
  return 'verified';
}

export function layerForDiagramObjectType(objectType: DiagramObjectType): DiagramRenderNode['layer'] {
  if (objectType === 'site' || objectType === 'vlan' || objectType === 'subnet') return 'site';
  if (objectType === 'network-device') return 'device';
  if (objectType === 'network-interface' || objectType === 'network-link' || objectType === 'dhcp-pool' || objectType === 'ip-reservation') return 'interface';
  if (objectType === 'route-domain' || objectType === 'route-intent') return 'routing';
  if (objectType === 'security-zone' || objectType === 'policy-rule' || objectType === 'security-flow' || objectType === 'nat-rule' || objectType === 'segmentation-flow') return 'security';
  if (objectType === 'implementation-stage' || objectType === 'implementation-step') return 'implementation';
  return 'interface';
}
