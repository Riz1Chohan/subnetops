function uniqueStrings(values) {
    return Array.from(new Set(values.filter((value) => Boolean(value && `${value}`.trim()))));
}
function slug(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}
function boundaryLookupKey(siteName, zoneName) {
    return `${siteName}::${zoneName}`.toLowerCase();
}
function firstMatchingBoundaryId(input) {
    const { siteName, zoneName, boundaries } = input;
    if (!zoneName)
        return undefined;
    const exact = boundaries.find((item) => item.siteName === siteName && item.zoneName === zoneName);
    if (exact)
        return exact.id;
    const zoneMatches = boundaries.filter((item) => item.zoneName === zoneName);
    if (zoneMatches.length === 1)
        return zoneMatches[0]?.id;
    return undefined;
}
function summarizeTopologyRole(input) {
    const { site, topology } = input;
    if (topology.topologyType === "collapsed-core")
        return "Single-site routed domain";
    if (site.id === topology.primarySiteId)
        return topology.cloudConnected ? "Primary site and shared-service/cloud control point" : "Primary site and shared-service control point";
    if (topology.topologyType === "hub-spoke")
        return `Spoke site anchored toward ${topology.primarySiteName || "primary site"}`;
    if (topology.topologyType === "hybrid-cloud")
        return "On-prem site participating in hybrid route domain";
    return "Multi-site routed domain";
}
function inferBoundaryPlacement(input) {
    const { siteName, zoneName, sitePlacements, servicePlacements, placementByName } = input;
    const directServicePlacementName = servicePlacements.find((service) => service.siteName === siteName && service.zoneName === zoneName && service.attachedDevice)?.attachedDevice;
    const directPlacement = directServicePlacementName ? placementByName.get(directServicePlacementName) : undefined;
    if (directPlacement)
        return directPlacement;
    const zonePlacement = sitePlacements.find((placement) => placement.siteName === siteName && placement.connectedZones.includes(zoneName));
    if (zonePlacement)
        return zonePlacement;
    const preferredBoundaryPlacement = sitePlacements.find((placement) => placement.siteName === siteName
        && ["firewall", "router", "core-switch", "distribution-switch", "cloud-edge"].includes(placement.deviceType));
    if (preferredBoundaryPlacement)
        return preferredBoundaryPlacement;
    return sitePlacements.find((placement) => placement.siteName === siteName);
}
function inferUpstreamBoundary(input) {
    const { siteName, topology } = input;
    if (topology.internetBreakout === "distributed")
        return "Local internet / upstream edge";
    if (topology.primarySiteName && topology.primarySiteName !== siteName)
        return `${topology.primarySiteName} upstream boundary`;
    return "Shared edge boundary";
}
function inferInboundPolicy(zoneName) {
    const text = zoneName.toLowerCase();
    if (text.includes("guest"))
        return "Default deny to trusted zones; allow reviewed internet egress and return traffic only.";
    if (text.includes("dmz") || text.includes("public"))
        return "Default deny inbound except explicitly published application paths.";
    if (text.includes("management"))
        return "Allow only reviewed administrative sources with MFA, logging, and jump-host discipline.";
    return "Default deny inbound except approved service, management, or dependency-specific access.";
}
function inferEastWestPolicy(zoneName) {
    const text = zoneName.toLowerCase();
    if (text.includes("management"))
        return "Restrict lateral movement to reviewed administration paths only.";
    if (text.includes("server") || text.includes("service") || text.includes("dmz"))
        return "Permit only dependency-driven service paths; block broad east-west trust by default.";
    return "Block broad east-west trust and allow only reviewed inter-zone business flows.";
}
function inferNatPolicy(zoneName) {
    const text = zoneName.toLowerCase();
    if (text.includes("guest") || text.includes("internet"))
        return "Apply NAT only at the north-south edge for internet-facing egress.";
    if (text.includes("dmz") || text.includes("public"))
        return "Review static or policy NAT only for explicitly published services.";
    return "Avoid hiding internal east-west identity; use NAT only at reviewed edge boundaries.";
}
function normalizeText(value) {
    return (value || "").toLowerCase();
}
function zoneEvidenceTokens(zoneName) {
    const base = normalizeText(zoneName);
    const tokens = new Set([base]);
    if (base.includes("guest")) {
        tokens.add("guest");
        tokens.add("wifi");
        tokens.add("wireless");
    }
    if (base.includes("manage")) {
        tokens.add("management");
        tokens.add("admin");
        tokens.add("monitor");
    }
    if (base.includes("server") || base.includes("service")) {
        tokens.add("server");
        tokens.add("service");
    }
    if (base.includes("dmz") || base.includes("public")) {
        tokens.add("dmz");
        tokens.add("public");
        tokens.add("published");
    }
    if (base.includes("voice")) {
        tokens.add("voice");
        tokens.add("phone");
    }
    if (base.includes("printer"))
        tokens.add("printer");
    if (base.includes("iot") || base.includes("ot")) {
        tokens.add("iot");
        tokens.add("ot");
    }
    if (base.includes("camera"))
        tokens.add("camera");
    if (base.includes("user") || base.includes("staff")) {
        tokens.add("user");
        tokens.add("staff");
    }
    return [...tokens].filter(Boolean);
}
function buildSiteSearchTokens(siteName, siteCode) {
    const tokens = [normalizeText(siteName)];
    if (siteCode)
        tokens.push(normalizeText(siteCode));
    return tokens.filter(Boolean);
}
function hasDiscoverySiteEvidence(input) {
    const { siteName, siteCode, discoveryState, kind, zoneName } = input;
    if (!discoveryState)
        return false;
    const routeCorpus = [discoveryState.topologyText, discoveryState.routingText, discoveryState.notesText].join("\n").toLowerCase();
    const boundaryCorpus = [discoveryState.securityText, discoveryState.addressingText, discoveryState.wirelessText, discoveryState.gapText, discoveryState.notesText].join("\n").toLowerCase();
    const corpus = kind === "route" ? routeCorpus : boundaryCorpus;
    if (!corpus.trim())
        return false;
    const siteTokens = buildSiteSearchTokens(siteName, siteCode);
    const siteMatched = siteTokens.some((token) => token && corpus.includes(token));
    if (!siteMatched && siteTokens.length > 1)
        return false;
    if (kind === "route") {
        const routeTerms = ["ospf", "bgp", "eigrp", "static", "vpn", "sd-wan", "mpls", "wan", "transit", "summary", "default route", "loopback"];
        return routeTerms.some((term) => corpus.includes(term));
    }
    const zoneTokens = zoneName ? zoneEvidenceTokens(zoneName) : [];
    if (zoneTokens.length === 0)
        return siteMatched;
    return zoneTokens.some((token) => corpus.includes(token));
}
function plannerPreviewSupportsBoundary(input) {
    const { zoneName, profile, segmentCount, serviceCount } = input;
    const text = normalizeText(zoneName);
    if (segmentCount > 0 || serviceCount > 0)
        return true;
    if (text.includes("guest"))
        return profile.guestWifi || profile.wireless;
    if (text.includes("manage"))
        return profile.management;
    if (text.includes("voice"))
        return profile.voice;
    if (text.includes("printer"))
        return profile.printers;
    if (text.includes("iot") || text.includes("ot"))
        return profile.iot;
    if (text.includes("camera"))
        return profile.cameras;
    if (text.includes("dmz") || text.includes("public"))
        return profile.cloudConnected || profile.remoteAccess || normalizeText(profile.serverPlacement).includes("dmz");
    return true;
}
export function buildUnifiedDesignTruthModel(input) {
    const { discoveryState, profile, topology, siteHierarchy, addressingPlan, sitePlacements, routingPlan, securityBoundaries, servicePlacements, trafficFlows, wanLinks, } = input;
    const unresolvedReferences = [];
    const siteIdByName = new Map(siteHierarchy.map((site) => [site.name, site.id]));
    const placementByName = new Map(sitePlacements.map((placement) => [placement.deviceName, placement]));
    const segmentIdByRowId = new Map(addressingPlan.map((row) => [row.id, `segment-${row.id}`]));
    const routeDomains = routingPlan.map((route) => {
        const siteId = route.siteId || siteIdByName.get(route.siteName) || route.siteName;
        const localSegmentIds = addressingPlan
            .filter((row) => row.siteId === route.siteId || row.siteName === route.siteName)
            .map((row) => segmentIdByRowId.get(row.id) || `segment-${row.id}`);
        const transitWanAdjacencyIds = wanLinks
            .filter((link) => link.endpointASiteId === route.siteId || link.endpointBSiteId === route.siteId || link.endpointASiteName === route.siteName || link.endpointBSiteName === route.siteName)
            .map((link) => `wan-${link.id}`);
        return {
            id: `route-${siteId}`,
            siteId,
            siteName: route.siteName,
            siteCode: route.siteCode,
            sourceModel: "explicit",
            authoritySource: "saved-design",
            summaryAdvertisement: route.summaryAdvertisement,
            loopbackCidr: route.loopbackCidr,
            localSegmentIds,
            transitWanAdjacencyIds,
            flowIds: [],
            notes: route.notes,
        };
    });
    const explicitRouteDomainSiteIds = new Set(routeDomains.map((route) => route.siteId));
    const inferredRouteDomains = siteHierarchy
        .filter((site) => !explicitRouteDomainSiteIds.has(site.id))
        .map((site) => {
        const localSegmentIds = addressingPlan
            .filter((row) => row.siteId === site.id || row.siteName === site.name)
            .map((row) => segmentIdByRowId.get(row.id) || `segment-${row.id}`);
        const transitWanAdjacencyIds = wanLinks
            .filter((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id || link.endpointASiteName === site.name || link.endpointBSiteName === site.name)
            .map((link) => `wan-${link.id}`);
        const hasDiscoveryRouteEvidence = hasDiscoverySiteEvidence({ siteName: site.name, siteCode: site.siteCode, discoveryState, kind: "route" });
        const hasPlannerPreviewRouteEvidence = localSegmentIds.length > 0 || transitWanAdjacencyIds.length > 0 || topology.topologyType === "collapsed-core";
        const authoritySource = hasDiscoveryRouteEvidence
            ? "discovery-derived"
            : hasPlannerPreviewRouteEvidence
                ? "planner-preview"
                : "inferred";
        return {
            id: `route-${site.id}`,
            siteId: site.id,
            siteName: site.name,
            siteCode: site.siteCode,
            sourceModel: authoritySource === "inferred" ? "inferred" : "explicit",
            authoritySource,
            summaryAdvertisement: site.summarizationTarget || site.siteBlockCidr,
            loopbackCidr: undefined,
            localSegmentIds,
            transitWanAdjacencyIds,
            flowIds: [],
            notes: uniqueStrings([
                site.siteBlockCidr ? `Site block ${site.siteBlockCidr}` : undefined,
                site.summarizationTarget ? `Summarize toward ${site.summarizationTarget}` : undefined,
                authoritySource === "discovery-derived"
                    ? "Route domain promoted from discovery evidence because routing, topology, or migration notes already point to this site as a control-plane anchor."
                    : authoritySource === "planner-preview"
                        ? "Route domain promoted from planner/addressing evidence so the shared model can anchor this site before a saved routing-plan object exists."
                        : "Inferred route domain because no stronger routing-plan, discovery, or planner evidence exists yet.",
            ]),
        };
    });
    routeDomains.push(...inferredRouteDomains);
    const routeDomainBySiteName = new Map(routeDomains.map((route) => [route.siteName, route]));
    const routeDomainBySiteId = new Map(routeDomains.map((route) => [route.siteId, route]));
    const boundaryDomains = securityBoundaries.map((boundary, index) => {
        const siteId = siteIdByName.get(boundary.siteName);
        const attachedPlacement = placementByName.get(boundary.attachedDevice);
        if (!attachedPlacement) {
            unresolvedReferences.push(`${boundary.boundaryName}: attached device ${boundary.attachedDevice} is not present in synthesized site placements.`);
        }
        const segmentIds = addressingPlan
            .filter((row) => row.siteName === boundary.siteName && row.zoneName === boundary.zoneName)
            .map((row) => segmentIdByRowId.get(row.id) || `segment-${row.id}`);
        return {
            id: `boundary-${index}-${slug(boundary.siteName)}-${slug(boundary.zoneName)}`,
            siteId,
            siteName: boundary.siteName,
            zoneName: boundary.zoneName,
            boundaryName: boundary.boundaryName,
            sourceModel: "explicit",
            authoritySource: "saved-design",
            attachedDevice: boundary.attachedDevice,
            attachedPlacementId: attachedPlacement?.id,
            upstreamBoundary: boundary.upstreamBoundary,
            segmentIds,
            serviceIds: [],
            flowIds: [],
            permittedPeers: boundary.permittedPeers,
            controlPoint: boundary.controlPoint,
            inboundPolicy: boundary.inboundPolicy,
            eastWestPolicy: boundary.eastWestPolicy,
            natPolicy: boundary.natPolicy,
            notes: boundary.notes,
        };
    });
    const existingBoundaryKeys = new Set(boundaryDomains.map((boundary) => boundaryLookupKey(boundary.siteName, boundary.zoneName)));
    const inferredBoundarySeeds = uniqueStrings([
        ...addressingPlan
            .filter((row) => row.zoneName)
            .map((row) => `${row.siteName}::${row.zoneName}`),
        ...servicePlacements
            .filter((service) => service.zoneName)
            .map((service) => `${service.siteName}::${service.zoneName}`),
    ]);
    const inferredBoundaryDomains = inferredBoundarySeeds
        .map((seed) => {
        const [siteName, zoneName] = seed.split("::");
        return { siteName, zoneName };
    })
        .filter(({ siteName, zoneName }) => !existingBoundaryKeys.has(boundaryLookupKey(siteName, zoneName)))
        .map(({ siteName, zoneName }, index) => {
        const siteId = siteIdByName.get(siteName);
        const attachedPlacement = inferBoundaryPlacement({ siteName, zoneName, sitePlacements, servicePlacements, placementByName });
        const segmentIds = addressingPlan
            .filter((row) => row.siteName === siteName && row.zoneName === zoneName)
            .map((row) => segmentIdByRowId.get(row.id) || `segment-${row.id}`);
        const boundaryName = `${zoneName} boundary`;
        const serviceCount = servicePlacements.filter((service) => service.siteName === siteName && service.zoneName === zoneName).length;
        const hasDiscoveryBoundaryEvidence = hasDiscoverySiteEvidence({ siteName, siteCode: siteId ? siteHierarchy.find((site) => site.id === siteId)?.siteCode : undefined, discoveryState, kind: "boundary", zoneName });
        const hasPlannerPreviewBoundaryEvidence = plannerPreviewSupportsBoundary({ zoneName, profile, segmentCount: segmentIds.length, serviceCount });
        const authoritySource = hasDiscoveryBoundaryEvidence
            ? "discovery-derived"
            : hasPlannerPreviewBoundaryEvidence
                ? "planner-preview"
                : "inferred";
        return {
            id: `boundary-inferred-${index}-${slug(siteName)}-${slug(zoneName)}`,
            siteId,
            siteName,
            zoneName,
            boundaryName,
            sourceModel: authoritySource === "inferred" ? "inferred" : "explicit",
            authoritySource,
            attachedDevice: attachedPlacement?.deviceName || "Boundary device to confirm",
            attachedPlacementId: attachedPlacement?.id,
            upstreamBoundary: inferUpstreamBoundary({ siteName, topology }),
            segmentIds,
            serviceIds: [],
            flowIds: [],
            permittedPeers: uniqueStrings([
                ...trafficFlows.filter((flow) => flow.sourceZone === zoneName || flow.destinationZone === zoneName).map((flow) => flow.sourceZone === zoneName ? flow.destinationZone : flow.sourceZone),
                ...servicePlacements.filter((service) => service.zoneName === zoneName).flatMap((service) => service.consumers),
            ]),
            controlPoint: attachedPlacement ? `${attachedPlacement.deviceName} enforces ${zoneName}` : `${zoneName} policy boundary still needs a concrete enforcement device`,
            inboundPolicy: inferInboundPolicy(zoneName),
            eastWestPolicy: inferEastWestPolicy(zoneName),
            natPolicy: inferNatPolicy(zoneName),
            notes: uniqueStrings([
                attachedPlacement ? `Attached to ${attachedPlacement.deviceName}` : undefined,
                authoritySource === "discovery-derived"
                    ? "Boundary promoted from discovery evidence because current-state security or addressing notes already reference this site/zone control point."
                    : authoritySource === "planner-preview"
                        ? "Boundary promoted from planner/addressing evidence so the shared model can anchor this zone before a saved boundary object exists."
                        : "Inferred boundary because the current design still needs a stronger explicit site/zone control-point record.",
            ]),
        };
    });
    boundaryDomains.push(...inferredBoundaryDomains);
    const serviceDomains = servicePlacements.map((service) => {
        const siteId = service.siteId || siteIdByName.get(service.siteName);
        const attachedPlacement = service.attachedDevice ? placementByName.get(service.attachedDevice) : undefined;
        if (service.attachedDevice && !attachedPlacement) {
            unresolvedReferences.push(`${service.serviceName}: attached device ${service.attachedDevice} is not present in synthesized site placements.`);
        }
        const boundaryId = firstMatchingBoundaryId({ siteName: service.siteName, zoneName: service.zoneName, boundaries: boundaryDomains });
        if (!boundaryId) {
            unresolvedReferences.push(`${service.serviceName}: no matching boundary domain was found for ${service.siteName} / ${service.zoneName}.`);
        }
        return {
            id: `service-${service.id}`,
            siteId,
            siteName: service.siteName,
            serviceName: service.serviceName,
            serviceType: service.serviceType,
            zoneName: service.zoneName,
            placementType: service.placementType,
            subnetCidr: service.subnetCidr,
            attachedPlacementId: attachedPlacement?.id,
            boundaryId,
            consumerSites: uniqueStrings(service.consumers),
            flowIds: [],
            dependsOn: service.dependsOn,
            notes: service.notes,
        };
    });
    const wanAdjacencies = wanLinks.map((link) => {
        const endpointARouteDomain = routeDomainBySiteId.get(link.endpointASiteId || "") || routeDomainBySiteName.get(link.endpointASiteName);
        const endpointBRouteDomain = routeDomainBySiteId.get(link.endpointBSiteId || "") || routeDomainBySiteName.get(link.endpointBSiteName);
        if (!endpointARouteDomain)
            unresolvedReferences.push(`${link.linkName}: no route domain found for ${link.endpointASiteName}.`);
        if (!endpointBRouteDomain)
            unresolvedReferences.push(`${link.linkName}: no route domain found for ${link.endpointBSiteName}.`);
        return {
            id: `wan-${link.id}`,
            linkName: link.linkName,
            transport: link.transport,
            subnetCidr: link.subnetCidr,
            endpointASiteName: link.endpointASiteName,
            endpointBSiteName: link.endpointBSiteName,
            endpointARouteDomainId: endpointARouteDomain?.id,
            endpointBRouteDomainId: endpointBRouteDomain?.id,
            flowIds: [],
            notes: link.notes,
        };
    });
    const flowContracts = trafficFlows.map((flow) => {
        const sourceRouteDomain = flow.sourceSite ? routeDomainBySiteName.get(flow.sourceSite) : undefined;
        const destinationRouteDomain = flow.destinationSite ? routeDomainBySiteName.get(flow.destinationSite) : undefined;
        const boundaryIds = uniqueStrings([
            firstMatchingBoundaryId({ siteName: flow.sourceSite, zoneName: flow.sourceZone, boundaries: boundaryDomains }),
            firstMatchingBoundaryId({ siteName: flow.destinationSite, zoneName: flow.destinationZone, boundaries: boundaryDomains }),
        ]);
        const serviceIds = serviceDomains
            .filter((service) => service.serviceName === flow.source
            || service.serviceName === flow.destination
            || (service.siteName === flow.destinationSite && service.zoneName === flow.destinationZone)
            || (service.siteName === flow.sourceSite && service.zoneName === flow.sourceZone))
            .map((service) => service.id);
        const wanAdjacencyIds = wanAdjacencies
            .filter((adjacency) => flow.path.some((hop) => hop.includes(adjacency.endpointASiteName) || hop.includes(adjacency.endpointBSiteName))
            || flow.controlPoints.some((hop) => hop.includes(adjacency.endpointASiteName) || hop.includes(adjacency.endpointBSiteName)))
            .map((adjacency) => adjacency.id);
        const localUnresolved = [];
        if (flow.sourceSite && !sourceRouteDomain)
            localUnresolved.push(`Missing route domain for source site ${flow.sourceSite}`);
        if (flow.destinationSite && !destinationRouteDomain)
            localUnresolved.push(`Missing route domain for destination site ${flow.destinationSite}`);
        if (!boundaryIds.length && (flow.sourceZone || flow.destinationZone))
            localUnresolved.push(`No boundary objects linked for ${flow.flowLabel}`);
        unresolvedReferences.push(...localUnresolved.map((detail) => `${flow.flowLabel}: ${detail}.`));
        return {
            id: `flow-${flow.id}`,
            flowName: flow.flowName,
            flowLabel: flow.flowLabel,
            source: flow.source,
            destination: flow.destination,
            sourceSite: flow.sourceSite,
            destinationSite: flow.destinationSite,
            sourceZone: flow.sourceZone,
            destinationZone: flow.destinationZone,
            routeDomainIds: uniqueStrings([sourceRouteDomain?.id, destinationRouteDomain?.id]),
            boundaryIds,
            serviceIds,
            wanAdjacencyIds,
            path: flow.path,
            controlPoints: flow.controlPoints,
            routeModel: flow.routeModel,
            natBehavior: flow.natBehavior,
            enforcementPolicy: flow.enforcementPolicy,
            unresolvedRefs: localUnresolved,
        };
    });
    const segmentNodes = addressingPlan.map((row) => {
        const boundaryIds = boundaryDomains
            .filter((boundary) => boundary.siteName === row.siteName && boundary.zoneName === row.zoneName)
            .map((boundary) => boundary.id);
        const serviceIds = serviceDomains
            .filter((service) => service.siteName === row.siteName && (service.zoneName === row.zoneName || service.subnetCidr === row.subnetCidr))
            .map((service) => service.id);
        return {
            id: segmentIdByRowId.get(row.id) || `segment-${row.id}`,
            siteId: row.siteId,
            siteName: row.siteName,
            name: row.segmentName,
            role: row.role,
            vlanId: row.vlanId,
            subnetCidr: row.subnetCidr,
            gatewayIp: row.gatewayIp,
            zoneName: row.zoneName,
            attachedBoundaryIds: boundaryIds,
            attachedServiceIds: serviceIds,
        };
    });
    const siteNodes = siteHierarchy.map((site) => {
        const placements = sitePlacements.filter((placement) => placement.siteId === site.id);
        const segments = segmentNodes.filter((segment) => segment.siteId === site.id);
        const boundaries = boundaryDomains.filter((boundary) => boundary.siteId === site.id || boundary.siteName === site.name);
        const services = serviceDomains.filter((service) => service.siteId === site.id || service.siteName === site.name);
        const flows = flowContracts.filter((flow) => flow.sourceSite === site.name || flow.destinationSite === site.name);
        const wanAdjacencyIds = wanAdjacencies
            .filter((adjacency) => adjacency.endpointASiteName === site.name || adjacency.endpointBSiteName === site.name)
            .map((adjacency) => adjacency.id);
        const routeDomain = routeDomainBySiteId.get(site.id) || routeDomainBySiteName.get(site.name);
        const explicitBoundaryCount = boundaries.filter((boundary) => boundary.sourceModel === "explicit").length;
        const unresolvedSiteRefs = uniqueStrings(unresolvedReferences.filter((item) => item.includes(site.name)));
        const authorityNotes = uniqueStrings([
            !routeDomain ? "Site still lacks a route-domain anchor." : undefined,
            routeDomain?.sourceModel === "inferred" ? "Route domain is still inferred instead of generated from explicit routing intent." : undefined,
            boundaries.length === 0 ? "No boundary objects are attached to this site yet." : undefined,
            boundaries.length > 0 && explicitBoundaryCount < boundaries.length ? `${boundaries.length - explicitBoundaryCount} boundary object${boundaries.length - explicitBoundaryCount === 1 ? " is" : "s are"} still inferred.` : undefined,
            flows.length === 0 ? "No traffic-flow objects currently reference this site." : undefined,
            unresolvedSiteRefs.length > 0 ? `${unresolvedSiteRefs.length} unresolved cross-object reference${unresolvedSiteRefs.length === 1 ? " still points" : "s still point"} at this site.` : undefined,
            placements.length === 0 ? "No placement devices are synthesized for this site yet." : undefined,
        ]);
        const authorityStatus = !routeDomain || placements.length === 0 || segments.length === 0
            ? "pending"
            : authorityNotes.length === 0
                ? "ready"
                : authorityNotes.length <= 2
                    ? "partial"
                    : "pending";
        return {
            id: `site-${site.id}`,
            siteId: site.id,
            siteName: site.name,
            siteCode: site.siteCode,
            topologyRole: summarizeTopologyRole({ site, topology }),
            routeDomainId: routeDomain?.id,
            placementIds: placements.map((placement) => placement.id),
            segmentIds: segments.map((segment) => segment.id),
            serviceIds: services.map((service) => service.id),
            boundaryIds: boundaries.map((boundary) => boundary.id),
            wanAdjacencyIds,
            flowIds: flows.map((flow) => flow.id),
            authorityStatus,
            authorityNotes,
            notes: uniqueStrings([
                site.summaryPrefix ? `Site summary target ${site.summaryPrefix}` : undefined,
                site.siteBlockCidr ? `Site block ${site.siteBlockCidr}` : undefined,
                routeDomain?.summaryAdvertisement ? `Advertise ${routeDomain.summaryAdvertisement}` : undefined,
                routeDomain?.sourceModel === "inferred" ? "Route domain currently inferred from site hierarchy and addressing plan." : undefined,
            ]),
        };
    });
    const relationshipEdges = [];
    siteNodes.forEach((siteNode) => {
        siteNode.placementIds.forEach((placementId) => {
            relationshipEdges.push({
                id: `edge-${siteNode.id}-${placementId}`,
                edgeType: "site-placement",
                sourceId: siteNode.id,
                targetId: placementId,
                label: "Site owns placement",
            });
        });
        if (siteNode.routeDomainId) {
            relationshipEdges.push({
                id: `edge-${siteNode.id}-${siteNode.routeDomainId}`,
                edgeType: "site-route",
                sourceId: siteNode.id,
                targetId: siteNode.routeDomainId,
                label: "Site route domain",
            });
        }
        siteNode.boundaryIds.forEach((boundaryId) => {
            relationshipEdges.push({
                id: `edge-${siteNode.id}-${boundaryId}`,
                edgeType: "site-boundary",
                sourceId: siteNode.id,
                targetId: boundaryId,
                label: "Site boundary",
            });
        });
    });
    boundaryDomains.forEach((boundary) => {
        boundary.segmentIds = uniqueStrings(boundary.segmentIds);
        boundary.serviceIds = serviceDomains.filter((service) => service.boundaryId === boundary.id).map((service) => service.id);
        boundary.flowIds = flowContracts.filter((flow) => flow.boundaryIds.includes(boundary.id)).map((flow) => flow.id);
        boundary.serviceIds.forEach((serviceId) => {
            relationshipEdges.push({
                id: `edge-${boundary.id}-${serviceId}`,
                edgeType: "boundary-service",
                sourceId: boundary.id,
                targetId: serviceId,
                label: "Boundary protects service",
            });
        });
        boundary.flowIds.forEach((flowId) => {
            relationshipEdges.push({
                id: `edge-${boundary.id}-${flowId}`,
                edgeType: "boundary-flow",
                sourceId: boundary.id,
                targetId: flowId,
                label: "Boundary constrains flow",
            });
        });
    });
    serviceDomains.forEach((service) => {
        service.flowIds = flowContracts.filter((flow) => flow.serviceIds.includes(service.id)).map((flow) => flow.id);
        service.flowIds.forEach((flowId) => {
            relationshipEdges.push({
                id: `edge-${service.id}-${flowId}`,
                edgeType: "service-flow",
                sourceId: service.id,
                targetId: flowId,
                label: "Service participates in flow",
            });
        });
    });
    routeDomains.forEach((routeDomain) => {
        routeDomain.flowIds = flowContracts.filter((flow) => flow.routeDomainIds.includes(routeDomain.id)).map((flow) => flow.id);
        routeDomain.transitWanAdjacencyIds.forEach((wanId) => {
            relationshipEdges.push({
                id: `edge-${routeDomain.id}-${wanId}`,
                edgeType: "route-wan",
                sourceId: routeDomain.id,
                targetId: wanId,
                label: "Route domain uses WAN adjacency",
            });
        });
        routeDomain.flowIds.forEach((flowId) => {
            relationshipEdges.push({
                id: `edge-${routeDomain.id}-${flowId}`,
                edgeType: "route-flow",
                sourceId: routeDomain.id,
                targetId: flowId,
                label: "Route domain carries flow",
            });
        });
    });
    wanAdjacencies.forEach((adjacency) => {
        adjacency.flowIds = flowContracts.filter((flow) => flow.wanAdjacencyIds.includes(adjacency.id)).map((flow) => flow.id);
    });
    const uniqueUnresolvedReferences = uniqueStrings(unresolvedReferences);
    const discoveryDerivedRouteDomains = routeDomains.filter((item) => item.authoritySource === "discovery-derived").length;
    const plannerPreviewRouteDomains = routeDomains.filter((item) => item.authoritySource === "planner-preview").length;
    const discoveryDerivedBoundaryDomains = boundaryDomains.filter((item) => item.authoritySource === "discovery-derived").length;
    const plannerPreviewBoundaryDomains = boundaryDomains.filter((item) => item.authoritySource === "planner-preview").length;
    const generationNotes = uniqueStrings([
        discoveryDerivedRouteDomains > 0 ? `${discoveryDerivedRouteDomains} route domain${discoveryDerivedRouteDomains === 1 ? " was" : "s were"} promoted from discovery evidence instead of being left inferred.` : undefined,
        plannerPreviewRouteDomains > 0 ? `${plannerPreviewRouteDomains} route domain${plannerPreviewRouteDomains === 1 ? " is" : "s are"} currently being held by planner-preview evidence until stronger saved routing records exist.` : undefined,
        inferredRouteDomains.filter((item) => item.authoritySource === "inferred").length > 0 ? `${inferredRouteDomains.filter((item) => item.authoritySource === "inferred").length} route domain${inferredRouteDomains.filter((item) => item.authoritySource === "inferred").length === 1 ? " remains" : "s remain"} truly inferred because stronger routing evidence is still missing.` : undefined,
        discoveryDerivedBoundaryDomains > 0 ? `${discoveryDerivedBoundaryDomains} boundary domain${discoveryDerivedBoundaryDomains === 1 ? " was" : "s were"} promoted from discovery evidence instead of being left inferred.` : undefined,
        plannerPreviewBoundaryDomains > 0 ? `${plannerPreviewBoundaryDomains} boundary domain${plannerPreviewBoundaryDomains === 1 ? " is" : "s are"} currently being held by planner-preview evidence until stronger saved boundary records exist.` : undefined,
        inferredBoundaryDomains.filter((item) => item.authoritySource === "inferred").length > 0 ? `${inferredBoundaryDomains.filter((item) => item.authoritySource === "inferred").length} boundary domain${inferredBoundaryDomains.filter((item) => item.authoritySource === "inferred").length === 1 ? " remains" : "s remain"} truly inferred because stronger site/zone evidence is still missing.` : undefined,
        uniqueUnresolvedReferences.length > 0 ? `${uniqueUnresolvedReferences.length} cross-object reference${uniqueUnresolvedReferences.length === 1 ? " still needs" : "s still need"} deeper explicit design detail.` : "No unresolved cross-object references remain in the current shared model.",
    ]);
    const coverage = [
        {
            label: "Topology to route-domain unification",
            status: siteNodes.every((site) => site.routeDomainId) ? "ready" : routeDomains.length > 0 ? "partial" : "pending",
            detail: siteNodes.every((site) => site.routeDomainId)
                ? `Every site currently resolves to a route domain, so topology and routing intent share one site anchor.`
                : routeDomains.length > 0
                    ? `Some sites still lack explicit route-domain linkage and should be reviewed before this becomes the sole truth layer.`
                    : `Route domains are still too thin for a unified topology/routing model.`,
        },
        {
            label: "Boundary and service linkage",
            status: serviceDomains.every((service) => service.boundaryId) && boundaryDomains.length > 0 ? "ready" : boundaryDomains.length > 0 || serviceDomains.length > 0 ? "partial" : "pending",
            detail: serviceDomains.every((service) => service.boundaryId) && boundaryDomains.length > 0
                ? `Services, zones, and control points are linked through explicit or inferred boundary domains.`
                : boundaryDomains.length > 0 || serviceDomains.length > 0
                    ? `Some services or boundaries still exist without a clean one-to-one relationship.`
                    : `Service placement and security boundaries are not yet resolved strongly enough.`,
        },
        {
            label: "Flow path linkage",
            status: flowContracts.length > 0 && flowContracts.every((flow) => flow.routeDomainIds.length > 0 && flow.boundaryIds.length > 0) ? "ready" : flowContracts.length > 0 ? "partial" : "pending",
            detail: flowContracts.length > 0 && flowContracts.every((flow) => flow.routeDomainIds.length > 0 && flow.boundaryIds.length > 0)
                ? `Critical flows now tie back to route domains and boundary control points instead of standing alone.`
                : flowContracts.length > 0
                    ? `Flow objects exist, but some still need stronger route-domain or boundary linkage.`
                    : `Traffic-flow coverage is still too light for a unified path model.`,
        },
        {
            label: "Authoritative model pressure",
            status: inferredRouteDomains.length === 0 && inferredBoundaryDomains.length === 0 ? "ready" : inferredRouteDomains.length + inferredBoundaryDomains.length <= 6 ? "partial" : "pending",
            detail: inferredRouteDomains.length === 0 && inferredBoundaryDomains.length === 0
                ? `The current shared model is being driven entirely by explicit route and boundary objects.`
                : `The shared model is usable, but ${inferredRouteDomains.length + inferredBoundaryDomains.length} core object${inferredRouteDomains.length + inferredBoundaryDomains.length === 1 ? " is" : "s are"} still inferred and should eventually become explicit design records.`,
        },
        {
            label: "Unresolved reference pressure",
            status: uniqueUnresolvedReferences.length === 0 ? "ready" : uniqueUnresolvedReferences.length <= 6 ? "partial" : "pending",
            detail: uniqueUnresolvedReferences.length === 0
                ? `No unresolved cross-object references were found in this synthesized model.`
                : `${uniqueUnresolvedReferences.length} unresolved reference${uniqueUnresolvedReferences.length === 1 ? " remains" : "s remain"} inside the shared truth model and should be reviewed.`,
        },
        {
            label: "Per-site authority consistency",
            status: siteNodes.every((site) => site.authorityStatus === "ready") ? "ready" : siteNodes.some((site) => site.authorityStatus !== "pending") ? "partial" : "pending",
            detail: siteNodes.every((site) => site.authorityStatus === "ready")
                ? `Every site currently resolves with explicit route, boundary, placement, and flow support strong enough for the shared model.`
                : `${siteNodes.filter((site) => site.authorityStatus !== "ready").length} site authority row${siteNodes.filter((site) => site.authorityStatus !== "ready").length === 1 ? " still needs" : "s still need"} deeper cleanup before the model can be treated as fully authoritative.`,
        },
    ];
    const summary = `${profile.planningFor} design using ${topology.topologyLabel.toLowerCase()} now resolves ${siteNodes.length} site node${siteNodes.length === 1 ? "" : "s"}, ${routeDomains.length} route domain${routeDomains.length === 1 ? "" : "s"}, ${boundaryDomains.length} boundary domain${boundaryDomains.length === 1 ? "" : "s"}, ${serviceDomains.length} service domain${serviceDomains.length === 1 ? "" : "s"}, and ${flowContracts.length} flow contract${flowContracts.length === 1 ? "" : "s"} inside one linked model.`;
    return {
        summary,
        topologyType: topology.topologyType,
        topologyLabel: topology.topologyLabel,
        primarySiteName: topology.primarySiteName,
        servicePlacementModel: topology.servicePlacementModel,
        internetBreakout: topology.internetBreakout,
        siteNodes,
        segments: segmentNodes,
        routeDomains,
        boundaryDomains,
        serviceDomains,
        flowContracts,
        wanAdjacencies,
        relationshipEdges,
        unresolvedReferences: uniqueUnresolvedReferences,
        coverage,
        inferenceSummary: {
            routeDomains: inferredRouteDomains.length,
            boundaryDomains: inferredBoundaryDomains.length,
        },
        generationNotes,
    };
}
