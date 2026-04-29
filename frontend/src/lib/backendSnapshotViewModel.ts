import type {
  AddressingPlanRow,
  DesignEngineFoundation,
  HighLevelDesignSummary,
  LogicalDomainIntent,
  LowLevelSiteDesign,
  PlannedSiteSummary,
  SegmentModelItem,
  SecurityBoundaryDetail,
  SiteHierarchyItem,
  SitePlacementDevice,
  SynthesizedLogicalDesign,
  TopologyBlueprint,
} from "./designSynthesis.types";
import type { DesignCoreSnapshot, NetworkDevice, SecurityZone } from "./designCoreSnapshot";
import type { UnifiedDesignTruthModel } from "./designTruthModel";

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function siteRows(siteId: string, rows: AddressingPlanRow[]) {
  return rows.filter((row) => row.siteId === siteId);
}

function deviceTypeFor(device: NetworkDevice): SitePlacementDevice["deviceType"] {
  if (device.deviceRole === "security-firewall") return "firewall";
  if (device.deviceRole === "branch-edge-router" || device.deviceRole === "routing-identity") return "router";
  if (device.deviceRole === "core-layer3-switch") return "core-switch";
  return "access-switch";
}

function tierForDevice(): SitePlacementDevice["siteTier"] {
  // Backend does not yet expose explicit site tier on device objects.
  // Do not infer primary/branch in the frontend.
  return "single-site";
}

export function backendSiteSummaries(snapshot: DesignCoreSnapshot, addressingRows: AddressingPlanRow[]): PlannedSiteSummary[] {
  const blockSummaries = snapshot.siteBlocks.map((site) => {
    const rows = siteRows(site.siteId, addressingRows);
    return {
      id: site.siteId,
      name: site.siteName,
      siteCode: site.siteCode || "",
      source: site.truthState === "configured" ? "configured" as const : "proposed" as const,
      siteBlockCidr: site.canonicalCidr || site.proposedCidr || undefined,
      summaryPrefix: site.prefix,
      siteBlockTotalAddresses: site.totalAddresses,
      siteBlockUsableAddresses: site.usableAddresses,
      siteBlockNetworkAddress: site.networkAddress,
      siteBlockBroadcastAddress: site.broadcastAddress,
      plannedDemandAddresses: rows.reduce((sum, row) => sum + (row.totalAddresses ?? row.usableHosts), 0),
      plannedDemandHosts: rows.reduce((sum, row) => sum + row.estimatedHosts, 0),
      note: site.notes.join(" ") || "Backend design-core site block.",
    };
  });

  if (blockSummaries.length > 0) return blockSummaries;

  const seen = new Map<string, PlannedSiteSummary>();
  for (const row of addressingRows) {
    const current = seen.get(row.siteId);
    const nextDemandAddresses = (current?.plannedDemandAddresses ?? 0) + (row.totalAddresses ?? row.usableHosts);
    const nextDemandHosts = (current?.plannedDemandHosts ?? 0) + row.estimatedHosts;
    seen.set(row.siteId, {
      id: row.siteId,
      name: row.siteName,
      siteCode: row.siteCode || "",
      source: row.source,
      siteBlockCidr: row.siteBlockCidr,
      plannedDemandAddresses: nextDemandAddresses,
      plannedDemandHosts: nextDemandHosts,
      note: "Backend design-core addressing row source.",
    });
  }
  return Array.from(seen.values());
}

export function backendSiteHierarchy(sites: PlannedSiteSummary[], addressingRows: AddressingPlanRow[]): SiteHierarchyItem[] {
  return sites.map((site) => {
    const rows = siteRows(site.id, addressingRows);
    const blockCapacity = site.siteBlockTotalAddresses ?? 0;
    const allocatedSegmentAddresses = rows.reduce((sum, row) => sum + (row.totalAddresses ?? row.usableHosts), 0);
    return {
      ...site,
      blockCapacity,
      allocatedSegmentAddresses,
      blockHeadroomAddresses: Math.max(0, blockCapacity - allocatedSegmentAddresses),
      blockUtilization: blockCapacity > 0 ? Math.min(1, allocatedSegmentAddresses / blockCapacity) : 0,
      configuredSegmentCount: rows.filter((row) => row.source === "configured").length,
      proposedSegmentCount: rows.filter((row) => row.source === "proposed").length,
      summarizationTarget: site.siteBlockCidr,
    };
  });
}

export function backendSegmentModel(addressingRows: AddressingPlanRow[]): SegmentModelItem[] {
  const grouped = new Map<string, AddressingPlanRow[]>();
  for (const row of addressingRows) grouped.set(row.role, [...(grouped.get(row.role) ?? []), row]);
  return Array.from(grouped.entries()).map(([role, rows]) => ({
    role: role as SegmentModelItem["role"],
    label: rows[0]?.roleLabel || role.replace(/_/g, " "),
    vlanId: rows.find((row) => row.vlanId)?.vlanId,
    purpose: uniqueStrings(rows.map((row) => row.purpose)).join(", ") || rows[0]?.segmentName || role,
    dhcpEnabled: rows.some((row) => row.dhcpEnabled),
    siteCount: new Set(rows.map((row) => row.siteId)).size,
    configuredCount: rows.filter((row) => row.source === "configured").length,
    proposedCount: rows.filter((row) => row.source === "proposed").length,
    totalEstimatedHosts: rows.reduce((sum, row) => sum + row.estimatedHosts, 0),
    recommendedPrefix: rows
      .map((row) => row.recommendedPrefix)
      .filter((prefix): prefix is number => typeof prefix === "number" && prefix > 0)
      .sort((left, right) => left - right)[0] ?? 0,
  }));
}

export function backendTopology(snapshot: DesignCoreSnapshot, sites: PlannedSiteSummary[]): TopologyBlueprint {
  const routeDomainCount = snapshot.summary.modeledRouteDomainCount || snapshot.networkObjectModel?.routeDomains.length || 0;
  return {
    topologyType: "backend-unclassified",
    topologyLabel: "Backend design-core object topology",
    primarySiteId: undefined,
    primarySiteName: undefined,
    internetBreakout: "unknown",
    cloudConnected: false,
    redundancyModel: snapshot.networkObjectModel?.summary.linkCount ? "Backend-modeled links present; redundancy requires engineer review." : "No backend redundancy links modeled yet.",
    servicePlacementModel: `${snapshot.networkObjectModel?.summary.securityServiceObjectCount ?? 0} backend service object(s) modeled.`,
    notes: [
      `${sites.length} backend site object(s), ${routeDomainCount} route domain(s), ${snapshot.summary.modeledSecurityZoneCount} security zone(s).`,
      "Topology classification, primary-site selection, internet-breakout mode, and cloud posture must come from backend design-core; these fields are not frontend-inferred.",
    ],
  };
}

export function backendSitePlacements(snapshot: DesignCoreSnapshot, zones: SecurityZone[] = []): SitePlacementDevice[] {
  const zoneNameById = new Map(zones.map((zone) => [zone.id, zone.name]));
  return (snapshot.networkObjectModel?.devices ?? []).map((device) => ({
    id: device.id,
    siteId: device.siteId,
    siteName: device.siteName,
    deviceName: device.name,
    siteTier: tierForDevice(),
    deviceType: deviceTypeFor(device),
    role: device.deviceRole.replace(/-/g, " "),
    quantity: 1,
    placement: device.siteName,
    connectedZones: device.securityZoneIds.map((id) => zoneNameById.get(id) || id),
    connectedSubnets: [],
    interfaceLabels: device.interfaceIds,
    notes: device.notes,
  }));
}

export function backendSecurityBoundaries(zones: SecurityZone[]): SecurityBoundaryDetail[] {
  return zones.map((zone) => ({
    zoneName: zone.name,
    siteName: zone.siteIds.join(", ") || "Project",
    boundaryName: zone.name,
    subnetCidrs: zone.subnetCidrs,
    attachedDevice: zone.routeDomainId,
    upstreamBoundary: zone.zoneRole === "wan" ? "Internet/WAN edge" : "Backend route domain",
    downstreamAssets: zone.vlanIds.map((id) => `VLAN ${id}`),
    permittedPeers: [],
    controlPoint: zone.routeDomainId,
    inboundPolicy: zone.isolationExpectation,
    eastWestPolicy: zone.isolationExpectation,
    managementSource: "Engineer review required",
    natPolicy: "Backend NAT model displayed separately where present.",
    routeDomain: zone.routeDomainId,
    insideRelationships: zone.subnetCidrs,
    outsideRelationships: [],
    publishedServices: [],
    notes: zone.notes,
  }));
}

export function backendLogicalDomains(snapshot: DesignCoreSnapshot): LogicalDomainIntent[] {
  const routes = snapshot.networkObjectModel?.routeDomains ?? [];
  const zones = snapshot.networkObjectModel?.securityZones ?? [];
  return [
    ...routes.map((route) => ({
      name: route.name,
      segments: route.subnetCidrs,
      purpose: route.scope === "site" ? "Site route domain" : "Project route domain",
      placement: route.siteIds.join(", ") || "Project",
      policy: route.defaultRouteState,
    })),
    ...zones.map((zone) => ({
      name: zone.name,
      segments: zone.subnetCidrs.length ? zone.subnetCidrs : zone.vlanIds.map((id) => `VLAN ${id}`),
      purpose: `${zone.zoneRole} security zone`,
      placement: zone.siteIds.join(", ") || "Project",
      policy: zone.isolationExpectation,
    })),
  ];
}

export function backendLowLevelDesign(sites: PlannedSiteSummary[], addressingRows: AddressingPlanRow[], zones: SecurityZone[]): LowLevelSiteDesign[] {
  return sites.map((site) => {
    const rows = siteRows(site.id, addressingRows);
    const siteZones = zones.filter((zone) => zone.siteIds.includes(site.id));
    return {
      siteId: site.id,
      siteName: site.name,
      siteCode: site.siteCode,
      siteRole: site.source === "configured" ? "Backend configured site" : "Backend proposed site",
      layerModel: "Backend object model",
      routingRole: "Backend route-domain model",
      switchingProfile: "Backend VLAN/interface model",
      securityBoundary: siteZones.map((zone) => zone.name).join(", ") || "No backend security zone mapped",
      localServiceModel: "Backend service placement required for detail.",
      wirelessModel: "Not modeled by backend design-core in this phase.",
      physicalAssumption: "Physical placement must come from backend device/link model or discovery evidence.",
      summaryRoute: site.siteBlockCidr,
      transitAdjacencyCount: 0,
      localSegmentCount: rows.length,
      localSegments: rows.map((row) => `${row.segmentName} ${row.subnetCidr}`),
      authorityStatus: rows.length > 0 ? "partial" : "pending",
      authorityLabel: "Backend design-core view model",
      strongestAuthoritySourceLabel: "backend-design-core",
      boundaryNames: siteZones.map((zone) => zone.name),
      serviceNames: [],
      flowNames: [],
      trustDebt: [],
      implementationFocus: rows.map((row) => row.segmentName).slice(0, 5),
      notes: ["Frontend rendered from backend snapshot only."],
    };
  });
}

export function backendHighLevelDesign(snapshot: DesignCoreSnapshot, topology: TopologyBlueprint): HighLevelDesignSummary {
  const objectCount = snapshot.summary.networkObjectCount || 0;
  return {
    architecturePattern: topology.topologyLabel,
    layerModel: `${objectCount} backend-modeled network object(s).`,
    wanArchitecture: `${snapshot.summary.transitPlanCount} transit plan(s), ${snapshot.summary.modeledRouteDomainCount} route domain(s).`,
    cloudArchitecture: topology.cloudConnected ? "Cloud/WAN security-zone evidence present in backend snapshot." : "No cloud-specific backend evidence modeled yet.",
    dataCenterArchitecture: `${snapshot.networkObjectModel?.summary.securityServiceObjectCount ?? 0} security service object(s) modeled by backend.`,
    redundancyModel: topology.redundancyModel,
    routingStrategy: `${snapshot.summary.routeIntentCount} backend route intent(s); readiness ${snapshot.networkObjectModel?.routingSegmentation.summary.routingReadiness ?? "review"}.`,
    switchingStrategy: `${snapshot.summary.vlanCount} backend addressing/VLAN row(s).`,
    segmentationStrategy: `${snapshot.summary.segmentationExpectationCount} segmentation expectation(s); ${snapshot.summary.segmentationConflictCount} conflict(s).`,
    securityArchitecture: `${snapshot.summary.securityFlowRequirementCount} backend security-flow requirement(s); ${snapshot.summary.securityPolicyMissingNatCount} missing NAT item(s).`,
    wirelessArchitecture: "Wireless architecture is not generated in the frontend.",
    operationsArchitecture: "Operations evidence must be provided by backend object model, discovery, or engineer review.",
    rationale: [
      "All facts on this page are backend snapshot data transformed into UI view models.",
      "The frontend does not allocate, infer, or synthesize a substitute network design; display facts are not frontend-inferred.",
    ],
  };
}

export function backendDesignEngineFoundation(snapshot: DesignCoreSnapshot): DesignEngineFoundation {
  return {
    stageLabel: "Backend design-core authority",
    summary: `${snapshot.summary.networkObjectCount || snapshot.summary.vlanCount} backend-modeled object(s), ${snapshot.summary.issueCount} issue(s), ${snapshot.summary.implementationPlanStepCount} implementation step(s).`,
    objectCounts: {
      siteHierarchy: snapshot.siteBlocks.length,
      addressingRows: snapshot.addressingRows.length,
      topologyPlacements: snapshot.networkObjectModel?.devices.length ?? 0,
      servicePlacements: snapshot.networkObjectModel?.summary.securityServiceObjectCount ?? 0,
      securityBoundaries: snapshot.networkObjectModel?.securityZones.length ?? 0,
      trafficFlows: snapshot.networkObjectModel?.securityPolicyFlow.flowRequirements.length ?? 0,
      routingIdentities: snapshot.networkObjectModel?.routeDomains.length ?? 0,
      wanLinks: snapshot.networkObjectModel?.links.length ?? 0,
      traceabilityItems: snapshot.summary.traceabilityCount,
      openIssues: snapshot.summary.issueCount,
    },
    strongestLayer: "backend-design-core",
    nextPriority: snapshot.summary.readyForBackendAuthority ? "Engineer review and engine-hardening tests" : "Resolve backend design-core blockers",
    coverage: [
      {
        label: "Backend authority",
        status: snapshot.summary.readyForBackendAuthority ? "ready" : "partial",
        detail: snapshot.summary.readyForBackendAuthority ? "Backend snapshot is available for UI rendering." : "Backend snapshot exists but requires review/blocker cleanup.",
      },
      {
        label: "Frontend planning",
        status: "ready",
        detail: "Disabled. UI is display/explain/filter/visualize only.",
      },
    ],
  };
}

export function backendTruthModel(snapshot: DesignCoreSnapshot, topology: TopologyBlueprint, addressingRows: AddressingPlanRow[]): UnifiedDesignTruthModel {
  const routeDomains = snapshot.networkObjectModel?.routeDomains ?? [];
  const zones = snapshot.networkObjectModel?.securityZones ?? [];
  const flows = snapshot.networkObjectModel?.securityPolicyFlow.flowRequirements ?? [];
  const links = snapshot.networkObjectModel?.links ?? [];
  return {
    summary: `${snapshot.projectName} backend design-core truth model with ${snapshot.summary.networkObjectCount || snapshot.summary.vlanCount} modeled object(s).`,
    topologyType: topology.topologyType,
    topologyLabel: topology.topologyLabel,
    primarySiteName: topology.primarySiteName,
    servicePlacementModel: topology.servicePlacementModel,
    internetBreakout: topology.internetBreakout,
    siteNodes: backendSiteSummaries(snapshot, addressingRows).map((site) => ({
      id: `site-${site.id}`,
      siteId: site.id,
      siteName: site.name,
      siteCode: site.siteCode,
      topologyRole: site.id === topology.primarySiteId ? "Primary backend site" : "Backend site",
      routeDomainId: routeDomains.find((route) => route.siteIds.includes(site.id))?.id,
      placementIds: (snapshot.networkObjectModel?.devices ?? []).filter((device) => device.siteId === site.id).map((device) => device.id),
      segmentIds: addressingRows.filter((row) => row.siteId === site.id).map((row) => row.id),
      serviceIds: [],
      boundaryIds: zones.filter((zone) => zone.siteIds.includes(site.id)).map((zone) => zone.id),
      wanAdjacencyIds: links.filter((link) => link.siteIds.includes(site.id)).map((link) => link.id),
      flowIds: flows.filter((flow) => zoneIdsForSite(zones, site.id).has(flow.sourceZoneId) || zoneIdsForSite(zones, site.id).has(flow.destinationZoneId)).map((flow) => flow.id),
      authorityStatus: "partial",
      authorityNotes: ["Backend design-core snapshot source."],
      notes: [site.note || "Backend site node."],
    })),
    segments: addressingRows.map((row) => ({
      id: row.id,
      siteId: row.siteId,
      siteName: row.siteName,
      name: row.segmentName,
      role: row.role,
      vlanId: row.vlanId,
      subnetCidr: row.subnetCidr,
      gatewayIp: row.gatewayIp,
      zoneName: row.zoneName,
      attachedBoundaryIds: zones.filter((zone) => zone.vlanIds.includes(row.vlanId || -1) || zone.subnetCidrs.includes(row.subnetCidr)).map((zone) => zone.id),
      attachedServiceIds: [],
    })),
    routeDomains: routeDomains.map((route) => ({
      id: route.id,
      siteId: route.siteIds[0] || "project",
      siteName: route.siteIds.join(", ") || "Project",
      sourceModel: route.truthState === "inferred" ? "inferred" : "explicit",
      authoritySource: route.truthState === "discovered" ? "discovery-derived" : "saved-design",
      summaryAdvertisement: route.subnetCidrs.join(", "),
      localSegmentIds: addressingRows.filter((row) => route.subnetCidrs.includes(row.subnetCidr)).map((row) => row.id),
      transitWanAdjacencyIds: route.linkIds,
      flowIds: [],
      notes: route.notes,
    })),
    boundaryDomains: zones.map((zone) => ({
      id: zone.id,
      siteId: zone.siteIds[0],
      siteName: zone.siteIds.join(", ") || "Project",
      zoneName: zone.name,
      boundaryName: zone.name,
      sourceModel: zone.truthState === "inferred" ? "inferred" : "explicit",
      authoritySource: zone.truthState === "discovered" ? "discovery-derived" : "saved-design",
      attachedDevice: zone.routeDomainId,
      upstreamBoundary: zone.zoneRole === "wan" ? "WAN/Internet" : "Backend route domain",
      segmentIds: addressingRows.filter((row) => zone.vlanIds.includes(row.vlanId || -1) || zone.subnetCidrs.includes(row.subnetCidr)).map((row) => row.id),
      serviceIds: [],
      flowIds: flows.filter((flow) => flow.sourceZoneId === zone.id || flow.destinationZoneId === zone.id).map((flow) => flow.id),
      permittedPeers: [],
      controlPoint: zone.routeDomainId,
      inboundPolicy: zone.isolationExpectation,
      eastWestPolicy: zone.isolationExpectation,
      natPolicy: "Backend NAT model display only.",
      notes: zone.notes,
    })),
    serviceDomains: [],
    flowContracts: flows.map((flow) => ({
      id: flow.id,
      flowName: flow.name,
      flowLabel: flow.name,
      source: flow.sourceZoneName,
      destination: flow.destinationZoneName,
      sourceZone: flow.sourceZoneName,
      destinationZone: flow.destinationZoneName,
      routeDomainIds: [],
      boundaryIds: [flow.sourceZoneId, flow.destinationZoneId],
      serviceIds: flow.serviceNames,
      wanAdjacencyIds: [],
      path: [flow.sourceZoneName, ...flow.matchedPolicyRuleIds, flow.destinationZoneName],
      controlPoints: flow.matchedPolicyRuleIds,
      routeModel: "Backend security-flow requirement.",
      natBehavior: flow.natRequired ? "NAT required" : "NAT not required",
      enforcementPolicy: flow.expectedAction,
      unresolvedRefs: [],
    })),
    wanAdjacencies: links.map((link) => ({
      id: link.id,
      linkName: link.name,
      transport: link.linkRole,
      subnetCidr: link.subnetCidr || "",
      endpointASiteName: link.endpointA?.label || link.siteIds[0] || "Endpoint A",
      endpointBSiteName: link.endpointB?.label || link.siteIds[1] || "Endpoint B",
      notes: link.notes,
    })),
    relationshipEdges: snapshot.networkObjectModel?.designGraph.edges.map((edge) => ({
      id: edge.id,
      edgeType: "site-route" as const,
      sourceId: edge.sourceNodeId,
      targetId: edge.targetNodeId,
      label: edge.relationship,
    })) ?? [],
    unresolvedReferences: [],
    coverage: [
      {
        label: "Backend design-core",
        status: snapshot.summary.readyForBackendAuthority ? "ready" : "partial",
        detail: `${snapshot.summary.issueCount} issue(s), ${snapshot.summary.designGraphBlockingFindingCount} graph blocker(s).`,
      },
    ],
    inferenceSummary: {
      routeDomains: routeDomains.filter((route) => route.truthState === "inferred").length,
      boundaryDomains: zones.filter((zone) => zone.truthState === "inferred").length,
    },
    generationNotes: ["Built from backend design-core snapshot only."],
  };
}

function zoneIdsForSite(zones: SecurityZone[], siteId: string) {
  return new Set(zones.filter((zone) => zone.siteIds.includes(siteId)).map((zone) => zone.id));
}

export function buildBackendSnapshotViewModel(snapshot: DesignCoreSnapshot, addressingRows: AddressingPlanRow[]): Partial<SynthesizedLogicalDesign> {
  const sites = backendSiteSummaries(snapshot, addressingRows);
  const siteHierarchy = backendSiteHierarchy(sites, addressingRows);
  const zones = snapshot.networkObjectModel?.securityZones ?? [];
  const topology = backendTopology(snapshot, sites);
  return {
    organizationHierarchy: {
      organizationCapacity: snapshot.organizationBlock?.totalAddresses ?? 0,
      allocatedSiteAddresses: siteHierarchy.reduce((sum, site) => sum + site.allocatedSegmentAddresses, 0),
      plannedSiteDemandAddresses: siteHierarchy.reduce((sum, site) => sum + site.plannedDemandHosts, 0),
      organizationHeadroom: 0,
      organizationUtilization: 0,
    },
    siteSummaries: sites,
    siteHierarchy,
    recommendedSegments: backendSegmentModel(addressingRows).map((item) => ({ role: item.role, label: item.label, vlanId: item.vlanId, purpose: item.purpose })),
    segmentModel: backendSegmentModel(addressingRows),
    topology,
    topologyModel: topology,
    sitePlacements: backendSitePlacements(snapshot, zones),
    securityBoundaries: backendSecurityBoundaries(zones),
    securityBoundaryModel: backendSecurityBoundaries(zones),
    logicalDomains: backendLogicalDomains(snapshot),
    lowLevelDesign: backendLowLevelDesign(sites, addressingRows, zones),
    highLevelDesign: backendHighLevelDesign(snapshot, topology),
    designTruthModel: backendTruthModel(snapshot, topology, addressingRows),
    designEngineFoundation: backendDesignEngineFoundation(snapshot),
    designSummary: [
      `${snapshot.projectName} backend design-core snapshot contains ${snapshot.summary.networkObjectCount || snapshot.summary.vlanCount} modeled object(s).`,
      `Frontend planning authority is disabled; this is a backend snapshot view model.`,
    ],
  };
}
