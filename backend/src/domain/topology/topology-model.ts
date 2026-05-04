import type {
  BuildTopologyModelInput,
  TopologyDevice,
  TopologyFinding,
  TopologyLink,
  TopologyModel,
  TopologyRouteDomainMembership,
  TopologySubnetAttachment,
  TopologyVlan,
  TopologyZone,
  TopologyZoneRole,
} from './types.js';
import { buildTopologyCoverageSummary, topologyFinding } from './coverage.js';
import { DEFAULT_ROUTE_DOMAIN_ID, WIDE_AREA_NETWORK_ZONE_ID, createSecurityBoundaryDevice, createSiteGatewayDevice, siteGatewayDeviceId } from './devices.js';
import { createLoopbackInterface, createTransitInterface, createVlanGatewayInterface, gatewayInterfaceId, loopbackInterfaceId, transitInterfaceId } from './interfaces.js';
import { createTransitLink, createVlanGatewayLink, transitLinkId, vlanGatewayLinkId } from './links.js';
import { buildTopologySites } from './sites.js';
import { createSubnetAttachment, createTopologyVlan, subnetAttachmentId, topologyVlanObjectId } from './vlans.js';
import { createTopologyZone, securityZoneIdForRole, zoneRoleFromSegmentContext } from './zones.js';

function addUnique<T>(values: T[], value: T) {
  if (!values.includes(value)) values.push(value);
}

function ensureZone(zonesById: Map<string, TopologyZone>, zoneRole: TopologyZoneRole, routeDomainId: string, initialNote?: string) {
  const zoneId = securityZoneIdForRole(zoneRole);
  const existing = zonesById.get(zoneId);
  if (existing) return existing;
  const created = createTopologyZone(zoneRole, routeDomainId, initialNote);
  zonesById.set(created.id, created);
  return created;
}

function routeMembershipId(routeDomainId: string, memberObjectType: TopologyRouteDomainMembership['memberObjectType'], memberObjectId: string) {
  return `route-domain-membership-${routeDomainId}-${memberObjectType}-${memberObjectId}`;
}

function createMembership(params: {
  routeDomainId: string;
  memberObjectId: string;
  memberObjectType: TopologyRouteDomainMembership['memberObjectType'];
  relationshipReason: string;
  sourceObjectIds: string[];
}): TopologyRouteDomainMembership {
  return {
    id: routeMembershipId(params.routeDomainId, params.memberObjectType, params.memberObjectId),
    name: `${params.memberObjectType} ${params.memberObjectId} route-domain membership`,
    routeDomainId: params.routeDomainId,
    memberObjectId: params.memberObjectId,
    memberObjectType: params.memberObjectType,
    relationshipSource: 'system_calculated',
    relationshipReason: params.relationshipReason,
    truthState: 'inferred',
    status: 'requires_review',
    sourceObjectIds: params.sourceObjectIds,
    evidence: [
      {
        source: 'topology.route-domain-membership',
        sourceObjectId: params.memberObjectId,
        sourceObjectType: params.memberObjectType,
        detail: params.relationshipReason,
      },
    ],
    reviewReason: 'Confirm VRF/route-domain ownership before implementation.',
    notes: ['Route-domain membership is explicit so diagrams/reports do not invent containment relationships.'],
  };
}

function uniqueMemberships(rows: TopologyRouteDomainMembership[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function uniqueVlans(rows: TopologyVlan[]) {
  const byId = new Map<string, TopologyVlan>();
  for (const row of rows) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      continue;
    }
    for (const attachmentId of row.subnetAttachmentIds) addUnique(existing.subnetAttachmentIds, attachmentId);
    for (const sourceObjectId of row.sourceObjectIds) addUnique(existing.sourceObjectIds, sourceObjectId);
    existing.evidence.push(...row.evidence);
    existing.notes.push(...row.notes);
    if (existing.status !== 'verified' && row.status === 'verified') existing.status = 'verified';
    if (existing.truthState !== 'configured' && row.truthState === 'configured') existing.truthState = 'configured';
  }
  return Array.from(byId.values()).sort((left, right) => left.id.localeCompare(right.id));
}

export function buildTopologyModel(input: BuildTopologyModelInput): TopologyModel {
  const routeDomainId = input.routeDomainId ?? DEFAULT_ROUTE_DOMAIN_ID;
  const sites = buildTopologySites(input.project);
  const devicesById = new Map<string, TopologyDevice>();
  const interfaces = [] as TopologyModel['interfaces'];
  const links: TopologyLink[] = [];
  const vlans: TopologyVlan[] = [];
  const zonesById = new Map<string, TopologyZone>();
  const subnetAttachments: TopologySubnetAttachment[] = [];
  const routeDomainMemberships: TopologyRouteDomainMembership[] = [];
  const findings: TopologyFinding[] = [];

  for (const site of input.project.sites) {
    const gateway = createSiteGatewayDevice(site, input.project.sites.length, routeDomainId);
    devicesById.set(gateway.id, gateway);
    routeDomainMemberships.push(createMembership({
      routeDomainId,
      memberObjectId: site.id,
      memberObjectType: 'site',
      relationshipReason: 'Project site participates in the default corporate route domain until explicit VRF input exists.',
      sourceObjectIds: [site.id],
    }));
    routeDomainMemberships.push(createMembership({
      routeDomainId,
      memberObjectId: gateway.id,
      memberObjectType: 'device',
      relationshipReason: 'Site gateway participates in the route domain because it owns modeled gateway interfaces.',
      sourceObjectIds: [site.id, gateway.id],
    }));
  }

  const wanZone = ensureZone(
    zonesById,
    'wan',
    routeDomainId,
    'Proposed external/WAN zone used for internet policy and NAT intent. Confirm the carrier, firewall, or edge device before implementation.',
  );

  for (const addressRow of input.addressingRows) {
    const gateway = devicesById.get(siteGatewayDeviceId(addressRow.siteId));
    const subnetCidr = addressRow.canonicalSubnetCidr ?? addressRow.proposedSubnetCidr ?? addressRow.sourceSubnetCidr;
    const zoneRole = zoneRoleFromSegmentContext(addressRow);
    const zone = ensureZone(zonesById, zoneRole, routeDomainId);
    const vlanObjectId = topologyVlanObjectId(addressRow.siteId, addressRow.vlanId);
    const attachmentId = subnetCidr ? subnetAttachmentId(addressRow.id) : undefined;
    const linkId = vlanGatewayLinkId(addressRow.id, addressRow.vlanId);
    const interfaceId = gatewayInterfaceId(addressRow.id, addressRow.vlanId);

    addUnique(zone.siteIds, addressRow.siteId);
    addUnique(zone.vlanIds, addressRow.vlanId);
    if (subnetCidr) addUnique(zone.subnetCidrs, subnetCidr);
    addUnique(zone.sourceObjectIds, addressRow.id);
    zone.evidence.push({
      source: 'addressing.rows',
      sourceObjectId: addressRow.id,
      sourceObjectType: 'address-row',
      detail: `Address row classified this segment as ${zone.zoneRole}.`,
    });

    const vlan = createTopologyVlan(addressRow, attachmentId ? [attachmentId] : []);
    vlans.push(vlan);

    if (!gateway) {
      findings.push(topologyFinding({
        id: `missing-gateway-${addressRow.siteId}-${addressRow.vlanId}`,
        severity: 'high',
        title: 'Address row has no site gateway device',
        detail: `${addressRow.siteName} VLAN ${addressRow.vlanId} cannot be attached to topology because the site gateway object is missing.`,
        affectedObjectIds: [addressRow.id, addressRow.siteId],
        recommendedAction: 'Create or repair the site gateway object before generating diagrams or implementation steps.',
      }));
      continue;
    }

    const networkInterface = createVlanGatewayInterface({
      addressRow,
      deviceId: gateway.id,
      routeDomainId,
      securityZoneId: zone.id,
      linkId,
    });
    interfaces.push(networkInterface);
    addUnique(gateway.interfaceIds, interfaceId);
    addUnique(gateway.securityZoneIds, zone.id);

    const attachment = createSubnetAttachment({
      addressRow,
      vlanObjectId,
      gatewayInterfaceId: interfaceId,
      securityZoneId: zone.id,
      routeDomainId,
    });
    if (attachment) subnetAttachments.push(attachment);

    links.push(createVlanGatewayLink({
      addressRow,
      deviceId: gateway.id,
      interfaceId,
      subnetCidr,
    }));

    routeDomainMemberships.push(createMembership({
      routeDomainId,
      memberObjectId: interfaceId,
      memberObjectType: 'interface',
      relationshipReason: 'Gateway interface is attached to the route domain through the address row.',
      sourceObjectIds: [addressRow.id, interfaceId],
    }));
    if (subnetCidr) {
      routeDomainMemberships.push(createMembership({
        routeDomainId,
        memberObjectId: attachment?.id ?? subnetCidr,
        memberObjectType: 'subnet',
        relationshipReason: 'Subnet participates in the route domain because it is attached to a modeled gateway interface.',
        sourceObjectIds: [addressRow.id, subnetCidr],
      }));
    }
    routeDomainMemberships.push(createMembership({
      routeDomainId,
      memberObjectId: zone.id,
      memberObjectType: 'zone',
      relationshipReason: 'Security zone is connected to the route domain by its subnet/interface memberships.',
      sourceObjectIds: [addressRow.id, zone.id],
    }));
  }

  for (const transitRow of input.transitPlan ?? []) {
    const gateway = devicesById.get(siteGatewayDeviceId(transitRow.siteId));
    const transitZone = ensureZone(zonesById, 'transit', routeDomainId);
    addUnique(transitZone.siteIds, transitRow.siteId);
    if (transitRow.vlanId) addUnique(transitZone.vlanIds, transitRow.vlanId);
    if (transitRow.subnetCidr) addUnique(transitZone.subnetCidrs, transitRow.subnetCidr);

    if (!gateway) {
      findings.push(topologyFinding({
        id: `missing-transit-gateway-${transitRow.siteId}`,
        severity: 'high',
        title: 'Transit plan has no site gateway device',
        detail: `${transitRow.siteName} transit cannot be attached because the site gateway object is missing.`,
        affectedObjectIds: [transitRow.siteId],
        recommendedAction: 'Create or repair the site gateway before topology rendering.',
      }));
      continue;
    }

    const linkId = transitLinkId(transitRow.siteId, transitRow.subnetCidr);
    const interfaceId = transitInterfaceId(transitRow.siteId, transitRow.subnetCidr);
    interfaces.push(createTransitInterface({ transitRow, routeDomainId, securityZoneId: transitZone.id, linkId }));
    links.push(createTransitLink({ transitRow, deviceId: gateway.id, interfaceId }));
    addUnique(gateway.interfaceIds, interfaceId);
    addUnique(gateway.securityZoneIds, transitZone.id);
    routeDomainMemberships.push(createMembership({
      routeDomainId,
      memberObjectId: interfaceId,
      memberObjectType: 'interface',
      relationshipReason: 'Transit interface participates in the corporate route domain.',
      sourceObjectIds: [transitRow.siteId, interfaceId],
    }));
  }

  for (const loopbackRow of input.loopbackPlan ?? []) {
    const loopback = createLoopbackInterface({
      loopbackRow,
      routeDomainId,
      securityZoneId: securityZoneIdForRole('transit'),
    });
    if (!loopback) continue;
    interfaces.push(loopback);
    const gateway = devicesById.get(siteGatewayDeviceId(loopbackRow.siteId));
    if (gateway) addUnique(gateway.interfaceIds, loopbackInterfaceId(loopbackRow.siteId, loopbackRow.endpointIp ?? 'pending'));
    routeDomainMemberships.push(createMembership({
      routeDomainId,
      memberObjectId: loopback.id,
      memberObjectType: 'interface',
      relationshipReason: 'Loopback participates as a routing identity in the route domain.',
      sourceObjectIds: [loopbackRow.siteId, loopback.id],
    }));
  }

  const securityBoundary = createSecurityBoundaryDevice(input.project, routeDomainId);
  if (securityBoundary) devicesById.set(securityBoundary.id, securityBoundary);
  for (const device of devicesById.values()) {
    if (device.id !== securityBoundary?.id) addUnique(device.securityZoneIds, wanZone.id);
  }

  if (input.project.sites.length === 0) {
    findings.push(topologyFinding({
      id: 'missing-sites',
      severity: 'critical',
      title: 'No sites available for topology',
      detail: 'Topology cannot be built without at least one site object.',
      recommendedAction: 'Add at least one project site before generating topology, diagrams, reports, or implementation steps.',
    }));
  }

  for (const site of input.project.sites) {
    const hasAnyGatewayInterface = interfaces.some((item) => item.siteId === site.id && item.interfaceRole === 'vlan-gateway');
    if (!hasAnyGatewayInterface) {
      findings.push(topologyFinding({
        id: `site-no-gateway-interface-${site.id}`,
        severity: 'medium',
        title: 'Site has no gateway interfaces',
        detail: `${site.name} exists, but no VLAN gateway interface has been modeled from authoritative addressing data.`,
        affectedObjectIds: [site.id],
        recommendedAction: 'Add VLAN/subnet rows or mark this site as discovery-only/incomplete.',
      }));
    }
  }

  const devices = Array.from(devicesById.values()).sort((left, right) => left.id.localeCompare(right.id));
  const zones = Array.from(zonesById.values()).sort((left, right) => left.id.localeCompare(right.id));
  const modelWithoutSummary: Omit<TopologyModel, 'summary'> = {
    sites: sites.sort((left, right) => left.id.localeCompare(right.id)),
    vlans: uniqueVlans(vlans),
    devices,
    interfaces: interfaces.sort((left, right) => left.id.localeCompare(right.id)),
    links: links.sort((left, right) => left.id.localeCompare(right.id)),
    zones,
    subnetAttachments: subnetAttachments.sort((left, right) => left.id.localeCompare(right.id)),
    routeDomainMemberships: uniqueMemberships(routeDomainMemberships).sort((left, right) => left.id.localeCompare(right.id)),
    findings,
  };

  return {
    summary: buildTopologyCoverageSummary(modelWithoutSummary),
    ...modelWithoutSummary,
  };
}
