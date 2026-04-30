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
  WanLinkPlanRow,
  RoutePolicyPlan,
  ServicePlacementItem,
  ConfigurationTemplateArtifact,
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

function tierForDevice(device?: NetworkDevice): SitePlacementDevice["siteTier"] {
  const text = `${device?.name ?? ""} ${device?.siteName ?? ""}`.toLowerCase();
  if (text.includes("hq") || text.includes("headquarter") || text.includes("site 1")) return "primary";
  return "single-site";
}

function normalizedText(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function looksLikePrimarySite(site: PlannedSiteSummary) {
  const text = normalizedText(`${site.name} ${site.siteCode ?? ""}`);
  return text.includes("hq") || text.includes("headquarter") || text.startsWith("site 1") || text.includes("site 1 -");
}

function snapshotEvidenceText(snapshot: DesignCoreSnapshot) {
  return [
    snapshot.projectName,
    ...(snapshot.traceability ?? []).flatMap((item) => [item.sourceKey, item.sourceLabel, item.sourceValue, item.designConsequence, ...(item.impacts ?? []), ...(item.outputAreas ?? [])]),
    ...(snapshot.transitPlan ?? []).flatMap((item) => [item.siteName, item.subnetCidr, item.gatewayOrEndpoint, ...item.notes]),
    ...(snapshot.networkObjectModel?.securityZones ?? []).flatMap((zone) => [zone.name, zone.zoneRole, ...zone.notes]),
    ...(snapshot.networkObjectModel?.links ?? []).flatMap((link) => [link.name, link.linkRole, link.subnetCidr, ...link.notes]),
  ].filter(Boolean).join(" ").toLowerCase();
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
  const primarySite = sites.find(looksLikePrimarySite) ?? sites[0];
  const linkCount = snapshot.networkObjectModel?.summary.linkCount ?? snapshot.networkObjectModel?.links.length ?? 0;
  const wanEvidenceCount = Math.max(snapshot.summary.transitPlanCount ?? 0, snapshot.transitPlan?.length ?? 0, (snapshot.networkObjectModel?.links ?? []).filter((link) => link.linkRole.includes("wan") || link.linkRole.includes("transit")).length);
  const text = snapshotEvidenceText(snapshot);
  const cloudConnected = /cloud|azure|hybrid|site-to-cloud|vpn/.test(text);
  const internetAtEachSite = text.includes("internet at each site") || (sites.length > 1 && wanEvidenceCount >= sites.length);
  return {
    topologyType: cloudConnected ? "hybrid-cloud" : sites.length > 1 ? "multi-site" : "collapsed-core",
    topologyLabel: cloudConnected ? "Hybrid cloud / multi-site backend topology" : sites.length > 1 ? "Multi-site backend topology" : "Backend design-core object topology",
    primarySiteId: primarySite?.id,
    primarySiteName: primarySite?.name,
    internetBreakout: internetAtEachSite ? "distributed" : wanEvidenceCount > 0 ? "centralized" : "unknown",
    cloudConnected,
    redundancyModel: linkCount ? "Backend-modeled links present; redundancy still requires engineer review." : "No backend redundancy links modeled yet.",
    servicePlacementModel: `${backendServicePlacements(snapshot, snapshot.networkObjectModel?.securityZones ?? []).length} backend service/cloud/management placement evidence row(s).`,
    notes: [
      `${sites.length} backend site object(s), ${routeDomainCount} route domain(s), ${snapshot.summary.modeledSecurityZoneCount} security zone(s), ${wanEvidenceCount} WAN/transit evidence row(s).`,
      primarySite ? `Primary site resolved from backend evidence as ${primarySite.name}.` : "Primary site not available because no backend site evidence exists.",
      internetAtEachSite ? "Breakout evidence resolves to internet at each site / distributed internet edge." : "Internet breakout still needs engineer confirmation.",
      cloudConnected ? "Cloud posture resolved from cloud/hybrid/VPN evidence in backend traceability and transit objects." : "Cloud posture not selected in backend evidence.",
    ],
    cloudPattern: cloudConnected ? "cloud-edge / site-to-cloud review" : undefined,
    wanPattern: internetAtEachSite ? "internet at each site" : undefined,
    topologyNarrative: primarySite ? `${primarySite.name} anchors the backend topology while each materialized site keeps its own design evidence.` : undefined,
  };
}

export function backendSitePlacements(snapshot: DesignCoreSnapshot, zones: SecurityZone[] = []): SitePlacementDevice[] {
  const zoneNameById = new Map(zones.map((zone) => [zone.id, zone.name]));
  return (snapshot.networkObjectModel?.devices ?? []).map((device) => ({
    id: device.id,
    siteId: device.siteId,
    siteName: device.siteName,
    deviceName: device.name,
    siteTier: tierForDevice(device),
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

export function backendLowLevelDesign(sites: PlannedSiteSummary[], addressingRows: AddressingPlanRow[], zones: SecurityZone[], snapshot?: DesignCoreSnapshot): LowLevelSiteDesign[] {
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
      transitAdjacencyCount: (snapshot?.networkObjectModel?.links ?? []).filter((link) => link.siteIds.includes(site.id) && (link.linkRole.includes("wan") || link.linkRole.includes("transit"))).length + (snapshot?.transitPlan ?? []).filter((row) => row.siteId === site.id).length,
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
      servicePlacements: backendServicePlacements(snapshot, snapshot.networkObjectModel?.securityZones ?? []).length,
      securityBoundaries: snapshot.networkObjectModel?.securityZones.length ?? 0,
      trafficFlows: snapshot.networkObjectModel?.securityPolicyFlow.flowRequirements.length ?? 0,
      routingIdentities: Math.max(snapshot.summary.routeIntentCount ?? 0, snapshot.networkObjectModel?.routeDomains.length ?? 0),
      wanLinks: Math.max(snapshot.summary.transitPlanCount ?? 0, snapshot.transitPlan?.length ?? 0, (snapshot.networkObjectModel?.links ?? []).filter((link) => link.linkRole.includes("wan") || link.linkRole.includes("transit")).length),
      traceabilityItems: snapshot.traceability?.length ?? snapshot.summary.traceabilityCount,
      openIssues: snapshot.summary.issueCount,
    },
    strongestLayer: "backend-design-core",
    nextPriority: snapshot.summary.readyForBackendAuthority ? "Engineer design review; implementation execution blockers are tracked separately" : "Resolve backend design-review blockers",
    coverage: [
      {
        label: "Backend authority",
        status: snapshot.summary.readyForBackendAuthority ? "ready" : "partial",
        detail: snapshot.summary.readyForBackendAuthority ? "Backend snapshot is available for UI rendering; implementation execution readiness is separate." : "Backend snapshot exists but design-review blocker cleanup is required.",
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

function backendTraceabilityRows(snapshot: DesignCoreSnapshot) {
  return (snapshot.traceability ?? []).map((item) => ({
    title: item.sourceLabel,
    requirement: `${item.sourceKey}: ${item.sourceValue}`,
    designOutcome: item.designConsequence || item.outputAreas?.join(", ") || item.impacts.join(", "),
  }));
}

function backendWanLinks(snapshot: DesignCoreSnapshot): WanLinkPlanRow[] {
  const transitRows = (snapshot.transitPlan ?? []).map((row, index) => ({
    id: `backend-transit-${row.siteId}-${index}`,
    linkName: `${row.siteName} WAN / transit evidence`,
    source: row.kind === "existing" ? "configured" as const : "proposed" as const,
    transport: "WAN transit",
    parentBlockCidr: row.subnetCidr,
    subnetCidr: row.subnetCidr ?? "engineer-review",
    endpointASiteId: row.siteId,
    endpointASiteName: row.siteName,
    endpointAIp: row.gatewayOrEndpoint ?? "engineer-review",
    endpointBSiteName: "Internet/WAN edge",
    endpointBIp: "engineer-review",
    notes: row.notes.length ? row.notes : ["Backend transit plan evidence."],
  }));
  const linkRows = (snapshot.networkObjectModel?.links ?? [])
    .filter((link) => link.linkRole.includes("wan") || link.linkRole.includes("transit"))
    .map((link) => ({
      id: link.id,
      linkName: link.name,
      source: link.truthState === "configured" || link.truthState === "discovered" ? "configured" as const : "proposed" as const,
      transport: link.linkRole,
      subnetCidr: link.subnetCidr ?? "engineer-review",
      endpointASiteId: link.siteIds[0],
      endpointASiteName: link.endpointA?.label || link.siteIds[0] || "Endpoint A",
      endpointAIp: "engineer-review",
      endpointBSiteId: link.siteIds[1],
      endpointBSiteName: link.endpointB?.label || link.siteIds[1] || "Endpoint B",
      endpointBIp: "engineer-review",
      notes: link.notes,
    }));
  const byId = new Map<string, WanLinkPlanRow>();
  [...transitRows, ...linkRows].forEach((row) => byId.set(row.id, row));
  return Array.from(byId.values());
}

function backendRoutePolicies(snapshot: DesignCoreSnapshot): RoutePolicyPlan[] {
  const intents = snapshot.networkObjectModel?.routingSegmentation.routeIntents ?? [];
  if (intents.length > 0) {
    return intents.slice(0, 250).map((route) => ({
      policyName: route.name,
      scope: route.routeDomainName,
      intent: `${route.routeKind} route to ${route.destinationCidr}`,
      recommendation: `${route.administrativeState} via ${route.nextHopType}.`,
      riskIfSkipped: route.notes.concat(route.evidence).join(" ") || "Route intent evidence would be hidden from the frontend summary.",
    }));
  }
  return (snapshot.networkObjectModel?.routeDomains ?? []).map((route) => ({
    policyName: route.name,
    scope: route.scope,
    intent: `Route domain with ${route.subnetCidrs.length} subnet CIDR(s).`,
    recommendation: `Default route state: ${route.defaultRouteState}; summarization: ${route.summarizationState}.`,
    riskIfSkipped: route.notes.join(" ") || "Route-domain evidence would be invisible.",
  }));
}

function backendServicePlacements(snapshot: DesignCoreSnapshot, zones: SecurityZone[]): ServicePlacementItem[] {
  const services = snapshot.networkObjectModel?.securityPolicyFlow.serviceObjects ?? [];
  const serviceRows = services.map((service) => ({
    id: service.id,
    serviceName: service.name,
    serviceType: "shared-service" as const,
    placementType: "centralized" as const,
    siteName: "Project",
    zoneName: "Backend service catalog",
    dependsOn: service.serviceGroupIds,
    consumers: [],
    publishedExternally: false,
    notes: service.notes,
  }));
  const zoneRows = zones
    .filter((zone) => ["management", "dmz", "transit", "wan"].includes(zone.zoneRole))
    .map((zone) => ({
      id: `zone-placement-${zone.id}`,
      serviceName: zone.name,
      serviceType: zone.zoneRole === "management" ? "management-service" as const : zone.zoneRole === "dmz" ? "dmz-service" as const : "cloud-service" as const,
      placementType: zone.zoneRole === "dmz" ? "dmz" as const : zone.zoneRole === "management" ? "centralized" as const : "cloud" as const,
      siteName: zone.siteIds.join(", ") || "Project",
      zoneName: zone.name,
      subnetCidr: zone.subnetCidrs[0],
      dependsOn: zone.routeDomainId ? [zone.routeDomainId] : [],
      consumers: zone.vlanIds.map((id) => `VLAN ${id}`),
      publishedExternally: zone.zoneRole === "dmz" || zone.zoneRole === "wan",
      notes: zone.notes,
    }));
  const byId = new Map<string, ServicePlacementItem>();
  [...serviceRows, ...zoneRows].forEach((row) => byId.set(row.id, row));
  return Array.from(byId.values());
}

function backendConfigurationTemplates(snapshot: DesignCoreSnapshot): ConfigurationTemplateArtifact[] {
  return (snapshot.vendorNeutralImplementationTemplates?.templates ?? []).map((template) => ({
    name: template.title,
    scope: `${template.stageName} / ${template.targetObjectType}`,
    intent: template.vendorNeutralIntent,
    includes: template.neutralActions.slice(0, 8),
    sampleLines: [],
    notes: [
      `Readiness: ${template.readiness}.`,
      template.commandGenerationReason,
      ...(template.notes ?? []),
    ].filter(Boolean),
  }));
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
    servicePlacements: backendServicePlacements(snapshot, zones),
    servicePlacementModel: backendServicePlacements(snapshot, zones),
    securityBoundaries: backendSecurityBoundaries(zones),
    securityBoundaryModel: backendSecurityBoundaries(zones),
    logicalDomains: backendLogicalDomains(snapshot),
    wanLinks: backendWanLinks(snapshot),
    routePolicies: backendRoutePolicies(snapshot),
    lowLevelDesign: backendLowLevelDesign(sites, addressingRows, zones, snapshot),
    highLevelDesign: backendHighLevelDesign(snapshot, topology),
    designTruthModel: backendTruthModel(snapshot, topology, addressingRows),
    designEngineFoundation: backendDesignEngineFoundation(snapshot),
    configurationTemplates: backendConfigurationTemplates(snapshot),
    traceability: backendTraceabilityRows(snapshot),
    designSummary: [
      `${snapshot.projectName} backend design-core snapshot contains ${snapshot.summary.networkObjectCount || snapshot.summary.vlanCount} modeled object(s).`,
      `Requirement impact traceability covers ${(snapshot.traceability ?? []).filter((item) => item.sourceArea === "requirements").length} requirement field(s).`,
      snapshot.requirementsImpactClosure ? `Requirement impact closure status: ${snapshot.requirementsImpactClosure.completionStatus} with ${snapshot.requirementsImpactClosure.concreteFieldCount} concrete field(s) and ${snapshot.requirementsImpactClosure.policyFieldCount} policy-driven field(s).` : "Requirement impact closure is not available in this snapshot.",
      `Readiness split: design review ${snapshot.summary.designReviewReadiness ?? (snapshot.summary.readyForBackendAuthority ? "review" : "blocked")}; implementation execution ${snapshot.summary.implementationExecutionReadiness ?? (snapshot.summary.implementationPlanBlockingFindingCount ? "blocked" : "review")}.`,
      `Frontend planning authority is disabled; this is a backend snapshot view model.`,
    ],
  };
}
