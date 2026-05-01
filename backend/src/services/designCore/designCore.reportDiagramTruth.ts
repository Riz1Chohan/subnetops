import type {
  BackendDiagramRenderEdge,
  BackendDiagramRenderGroup,
  BackendDiagramRenderModel,
  BackendDiagramRenderNode,
  BackendDiagramRenderOverlay,
  BackendDiagramTruthHotspot,
  BackendDiagramTruthModel,
  BackendDiagramTruthOverlaySummary,
  BackendReportTruthModel,
  BackendReportTruthVerificationSummary,
  BackendTruthFinding,
  DesignCoreIssue,
  DesignGraphNodeObjectType,
  DesignGraphRelationship,
  DesignTruthReadiness,
  ImplementationPlanStep,
  ImplementationPlanVerificationCheck,
  NetworkObjectModel,
  NetworkObjectTruthState,
} from "../designCore.types.js";

type SnapshotSummaryForTruth = {
  siteCount: number;
  validSubnetCount: number;
  readyForBackendAuthority: boolean;
};

type FindingRef = {
  id: string;
  severity: "ERROR" | "WARNING" | "INFO";
  affectedObjectIds: string[];
};

function normalizeReadiness(value: string | undefined | null): DesignTruthReadiness {
  return value === "ready" || value === "review" || value === "blocked" ? value : "unknown";
}

function rollupReadiness(values: DesignTruthReadiness[]): DesignTruthReadiness {
  if (values.includes("blocked")) return "blocked";
  if (values.includes("review")) return "review";
  if (values.includes("ready")) return "ready";
  return "unknown";
}

function readinessLabel(readiness: DesignTruthReadiness) {
  return readiness === "blocked" ? "Blocked" : readiness === "review" ? "Review required" : readiness === "ready" ? "Ready" : "Unknown";
}

function addFinding(target: BackendTruthFinding[], finding: BackendTruthFinding, limit = 12) {
  if (target.length < limit) target.push(finding);
}

function buildDiagramEmptyStateReason(summary: SnapshotSummaryForTruth, networkObjectModel: NetworkObjectModel) {
  const missing: string[] = [];

  if (summary.siteCount <= 0) missing.push("materialized Site rows");
  if (summary.validSubnetCount <= 0) missing.push("VLAN/addressing rows from the allocator");
  if (networkObjectModel.devices.length <= 0) missing.push("modeled network devices");
  if (networkObjectModel.interfaces.length <= 0) missing.push("modeled network interfaces");
  if (networkObjectModel.links.length <= 0) missing.push("modeled network links or WAN/site relationships");
  if (networkObjectModel.designGraph.edges.length <= 0) missing.push("backend design graph relationships");

  return {
    reason: `Diagram blocked because backend authoritative topology is missing: ${missing.join(", ")}. Fix requirement materialization and design-core topology generation before treating the diagram as usable.`,
    requiredInputs: missing.map((item) => `Generate ${item}`),
  };
}

function compareStepPriority(left: ImplementationPlanStep, right: ImplementationPlanStep) {
  const readinessRank: Record<ImplementationPlanStep["readiness"], number> = { blocked: 0, review: 1, deferred: 2, ready: 3 };
  const riskRank: Record<ImplementationPlanStep["riskLevel"], number> = { high: 0, medium: 1, low: 2 };
  return readinessRank[left.readiness] - readinessRank[right.readiness] || riskRank[left.riskLevel] - riskRank[right.riskLevel] || left.sequence - right.sequence;
}

function compareVerificationPriority(left: ImplementationPlanVerificationCheck, right: ImplementationPlanVerificationCheck) {
  const readinessRank: Record<ImplementationPlanVerificationCheck["readiness"], number> = { blocked: 0, review: 1, ready: 2 };
  return readinessRank[left.readiness] - readinessRank[right.readiness] || left.name.localeCompare(right.name);
}

function summarizeVerificationByType(checks: ImplementationPlanVerificationCheck[]): BackendReportTruthVerificationSummary[] {
  const grouped = new Map<string, BackendReportTruthVerificationSummary>();
  for (const check of checks) {
    const current = grouped.get(check.checkType) ?? { checkType: check.checkType, totalCount: 0, blockedCount: 0, reviewCount: 0, readyCount: 0 };
    current.totalCount += 1;
    if (check.readiness === "blocked") current.blockedCount += 1;
    else if (check.readiness === "review") current.reviewCount += 1;
    else current.readyCount += 1;
    grouped.set(check.checkType, current);
  }
  return Array.from(grouped.values()).sort((left, right) => right.blockedCount - left.blockedCount || right.reviewCount - left.reviewCount || left.checkType.localeCompare(right.checkType));
}

function collectFindingBuckets(networkObjectModel: NetworkObjectModel) {
  const blockedFindings: BackendTruthFinding[] = [];
  const reviewFindings: BackendTruthFinding[] = [];

  for (const finding of networkObjectModel.designGraph.integrityFindings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) addFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "design-graph" });
  }

  for (const finding of networkObjectModel.routingSegmentation.reachabilityFindings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) addFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "routing" });
  }

  for (const finding of networkObjectModel.securityPolicyFlow.findings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) addFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "security" });
  }

  for (const finding of networkObjectModel.implementationPlan.findings) {
    const bucket = finding.severity === "ERROR" ? blockedFindings : finding.severity === "WARNING" ? reviewFindings : null;
    if (bucket) addFinding(bucket, { title: finding.title, detail: finding.detail, severity: finding.severity, source: "implementation" });
  }

  return { blockedFindings, reviewFindings };
}

function collectImplementationHotspots(networkObjectModel: NetworkObjectModel): BackendDiagramTruthHotspot[] {
  return networkObjectModel.implementationPlan.steps
    .filter((step) => step.readiness === "blocked" || step.readiness === "review")
    .sort(compareStepPriority)
    .slice(0, 6)
    .map((step) => ({
      title: step.title,
      detail: step.blockers[0] ?? step.readinessReasons[0] ?? step.expectedOutcome,
      readiness: step.readiness === "blocked" ? "blocked" : "review",
      scopeLabel: step.targetObjectType,
    }));
}

function collectRoutingHotspots(networkObjectModel: NetworkObjectModel): BackendDiagramTruthHotspot[] {
  return networkObjectModel.routingSegmentation.reachabilityFindings.slice(0, 6).map((finding) => ({
    title: finding.title,
    detail: finding.detail,
    readiness: finding.severity === "ERROR" ? "blocked" : finding.severity === "WARNING" ? "review" : "ready",
    scopeLabel: finding.routeDomainId ? `Route domain ${finding.routeDomainId}` : "Routing",
  }));
}

function collectSecurityHotspots(networkObjectModel: NetworkObjectModel): BackendDiagramTruthHotspot[] {
  return networkObjectModel.securityPolicyFlow.flowRequirements
    .filter((flow) => flow.state !== "satisfied")
    .slice(0, 6)
    .map((flow) => ({
      title: flow.name,
      detail: `${flow.sourceZoneName} → ${flow.destinationZoneName} is ${flow.state.replace(/-/g, " ")}${flow.natRequired ? " and NAT is required" : ""}.`,
      readiness: flow.state === "conflict" || flow.state === "missing-policy" || flow.state === "missing-nat" ? "blocked" : "review",
      scopeLabel: "Security flow",
    }));
}

function collectFindingRefs(networkObjectModel: NetworkObjectModel): FindingRef[] {
  return [
    ...networkObjectModel.designGraph.integrityFindings.map((finding, index) => ({ id: `graph-${index}-${finding.code}`, severity: finding.severity, affectedObjectIds: finding.affectedObjectIds })),
    ...networkObjectModel.routingSegmentation.reachabilityFindings.map((finding, index) => ({ id: `routing-${index}-${finding.code}`, severity: finding.severity, affectedObjectIds: finding.affectedObjectIds })),
    ...networkObjectModel.securityPolicyFlow.findings.map((finding, index) => ({ id: `security-${index}-${finding.code}`, severity: finding.severity, affectedObjectIds: finding.affectedObjectIds })),
    ...networkObjectModel.implementationPlan.findings.map((finding, index) => ({ id: `implementation-${index}-${finding.code}`, severity: finding.severity, affectedObjectIds: finding.affectedStepIds })),
  ];
}

function readinessForObject(objectId: string, networkObjectModel: NetworkObjectModel, findingRefs: FindingRef[]): { readiness: DesignTruthReadiness; relatedFindingIds: string[] } {
  const findingMatches = findingRefs.filter((finding) => finding.affectedObjectIds.includes(objectId));
  const implementationMatches = networkObjectModel.implementationPlan.steps.filter((step) => step.targetObjectId === objectId || step.dependencyObjectIds.includes(objectId));
  const verificationMatches = networkObjectModel.implementationPlan.verificationChecks.filter((check) => check.relatedObjectIds.includes(objectId));

  const readiness = rollupReadiness([
    ...findingMatches.map((finding) => finding.severity === "ERROR" ? "blocked" as const : finding.severity === "WARNING" ? "review" as const : "ready" as const),
    ...implementationMatches.map((step) => normalizeReadiness(step.readiness)),
    ...verificationMatches.map((check) => normalizeReadiness(check.readiness)),
  ]);

  return {
    readiness: readiness === "unknown" ? "ready" : readiness,
    relatedFindingIds: findingMatches.map((finding) => finding.id),
  };
}

function layerForObjectType(objectType: DesignGraphNodeObjectType): BackendDiagramRenderNode["layer"] {
  if (objectType === "site" || objectType === "vlan" || objectType === "subnet") return "site";
  if (objectType === "network-device") return "device";
  if (objectType === "network-interface" || objectType === "network-link") return "interface";
  if (objectType === "route-domain" || objectType === "route-intent" || objectType === "segmentation-flow") return "routing";
  if (objectType === "security-zone" || objectType === "policy-rule" || objectType === "nat-rule" || objectType === "security-service" || objectType === "security-flow") return "security";
  if (objectType === "implementation-stage" || objectType === "implementation-step") return "implementation";
  return "verification";
}

function overlayKeysForRelationship(relationship: DesignGraphRelationship): BackendDiagramRenderEdge["overlayKeys"] {
  if (relationship.includes("route") || relationship.includes("segmentation")) return ["routing"];
  if (relationship.includes("security") || relationship.includes("policy")) return ["security"];
  if (relationship.includes("nat")) return ["nat"];
  if (relationship.includes("implementation")) return ["implementation"];
  if (relationship.includes("dhcp") || relationship.includes("subnet") || relationship.includes("vlan")) return ["addressing"];
  return ["addressing"];
}


function cleanTopologyLabel(value: string) {
  return value
    .replace(/\bPhase\s+\d+\s+models\b/gi, "The current planning model uses")
    .replace(/\bFuture phases\b/gi, "Future versions")
    .replace(/\bbackend\b/gi, "design model")
    .replace(/\bdesign-core\b/gi, "design model")
    .replace(/device-[0-9a-f-]+/gi, "modeled device")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function deviceDiagramLabel(device: NetworkObjectModel["devices"][number]) {
  const siteCode = device.siteCode || (device.siteName || "").replace(/^Site\s+/i, "S").replace(/\s.*$/, "");
  if (device.deviceRole === "security-firewall") return `${siteCode} Security Firewall`;
  if (device.deviceRole === "core-layer3-switch") return `${siteCode} Core Gateway`;
  if (device.deviceRole === "branch-edge-router") return `${siteCode} Branch Gateway`;
  if (device.deviceRole === "routing-identity") return `${siteCode} Routing Identity`;
  return `${siteCode} Network Device`;
}

function siteDiagramCode(site: { siteCode?: string | null; siteName: string }) {
  if (site.siteCode && site.siteCode.trim()) return site.siteCode.trim();
  if (/hq/i.test(site.siteName)) return "HQ";
  const numberMatch = site.siteName.match(/\b(\d{1,2})\b/);
  return numberMatch ? `S${numberMatch[1]}` : site.siteName.slice(0, 6).toUpperCase();
}

function siteDiagramRank(site: { siteCode?: string | null; siteName: string }) {
  const label = `${site.siteCode ?? ""} ${site.siteName}`.toLowerCase();
  if (label.includes("hq") || label.includes("head") || label.includes("primary")) return -1;
  const numberMatch = label.match(/\b(?:site|s)\s*(\d{1,2})\b/);
  return numberMatch ? Number(numberMatch[1]) : 999;
}

function buildProfessionalTopologyRenderModel(networkObjectModel: NetworkObjectModel, overlaySummaries: BackendDiagramTruthOverlaySummary[], hotspots: BackendDiagramTruthHotspot[]): BackendDiagramRenderModel {
  const findingRefs = collectFindingRefs(networkObjectModel);
  const renderNodes: BackendDiagramRenderNode[] = [];
  const renderEdges: BackendDiagramRenderEdge[] = [];

  const siteMap = new Map<string, { siteId: string; siteName: string; siteCode?: string | null; deviceIds: string[] }>();
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

  for (const graphNode of networkObjectModel.designGraph.nodes.filter((node) => node.objectType === "site")) {
    if (!siteMap.has(graphNode.objectId)) {
      siteMap.set(graphNode.objectId, {
        siteId: graphNode.objectId,
        siteName: graphNode.label,
        deviceIds: [],
      });
    }
  }

  const sites = Array.from(siteMap.values()).sort((left, right) => {
    const rankDiff = siteDiagramRank(left) - siteDiagramRank(right);
    if (rankDiff !== 0) return rankDiff;
    return siteDiagramCode(left).localeCompare(siteDiagramCode(right), undefined, { numeric: true });
  });

  const primarySite = sites.find((site) => /hq|head|primary/i.test(`${site.siteCode ?? ""} ${site.siteName}`)) ?? sites[0];
  const branchSites = sites.filter((site) => site.siteId !== primarySite?.siteId);
  const sitePoints = new Map<string, { x: number; y: number }>();

  if (primarySite) {
    sitePoints.set(primarySite.siteId, { x: 760, y: 190 });
  }

  const branchColumnCount = branchSites.length <= 4 ? Math.max(1, branchSites.length) : 5;
  const branchStartX = 180;
  const branchStartY = 500;
  const branchGapX = 300;
  const branchGapY = 230;
  branchSites.forEach((site, index) => {
    const column = index % branchColumnCount;
    const row = Math.floor(index / branchColumnCount);
    sitePoints.set(site.siteId, { x: branchStartX + column * branchGapX, y: branchStartY + row * branchGapY });
  });

  const addNode = (node: BackendDiagramRenderNode) => {
    if (!renderNodes.some((existing) => existing.id === node.id)) renderNodes.push(node);
  };
  const addEdge = (edge: BackendDiagramRenderEdge) => {
    if (!renderEdges.some((existing) => existing.id === edge.id)) renderEdges.push(edge);
  };

  const routeDomain = networkObjectModel.routeDomains[0];
  if (routeDomain) {
    const readiness = readinessForObject(routeDomain.id, networkObjectModel, findingRefs);
    addNode({
      id: `render-route-domain-${routeDomain.id}`,
      objectId: routeDomain.id,
      objectType: "route-domain",
      label: cleanTopologyLabel(routeDomain.name || "Corporate Routing Domain"),
      layer: "routing",
      readiness: readiness.readiness,
      truthState: routeDomain.truthState,
      x: 760,
      y: 70,
      sourceEngine: "routing",
      relatedFindingIds: readiness.relatedFindingIds,
      notes: routeDomain.notes.map(cleanTopologyLabel).slice(0, 4),
    });
  }

  const wanZone = networkObjectModel.securityZones.find((zone) => zone.zoneRole === "wan") ?? networkObjectModel.securityZones.find((zone) => /wan|internet|wide area/i.test(zone.name));
  const wanNodeId = "render-wan-internet-edge";
  addNode({
    id: wanNodeId,
    objectId: wanZone?.id ?? "wan-internet-edge",
    objectType: "security-zone",
    label: "WAN / Internet Edge",
    layer: "security",
    readiness: wanZone ? readinessForObject(wanZone.id, networkObjectModel, findingRefs).readiness : "review",
    truthState: wanZone?.truthState ?? "proposed",
    x: 760,
    y: 340,
    sourceEngine: "security",
    relatedFindingIds: wanZone ? readinessForObject(wanZone.id, networkObjectModel, findingRefs).relatedFindingIds : [],
    notes: wanZone?.notes.map(cleanTopologyLabel).slice(0, 4) ?? ["Represents internet, WAN, cloud, and remote-access edge review boundary."],
  });

  for (const site of sites) {
    const point = sitePoints.get(site.siteId) ?? { x: 160 + renderNodes.length * 180, y: 500 };
    const siteNodeId = `render-site-${site.siteId}`;
    addNode({
      id: siteNodeId,
      objectId: site.siteId,
      objectType: "site",
      label: `${siteDiagramCode(site)} — ${site.siteName}`,
      groupId: `site:${site.siteId}`,
      siteId: site.siteId,
      layer: "site",
      readiness: "ready",
      truthState: "inferred",
      x: point.x,
      y: point.y,
      sourceEngine: "object-model",
      relatedFindingIds: [],
      notes: [`Professional topology group for ${site.siteName}.`],
    });

    const siteDhcpPools = networkObjectModel.dhcpPools.filter((pool) => pool.siteId === site.siteId);
    if (siteDhcpPools.length > 0) {
      const dhcpNodeId = `render-dhcp-summary-${site.siteId}`;
      addNode({
        id: dhcpNodeId,
        objectId: `dhcp-summary-${site.siteId}`,
        objectType: "dhcp-pool",
        label: `${siteDiagramCode(site)} DHCP (${siteDhcpPools.length})`,
        groupId: `site:${site.siteId}`,
        siteId: site.siteId,
        layer: "interface",
        readiness: "review",
        truthState: "inferred",
        x: point.x + 88,
        y: point.y + 95,
        sourceEngine: "object-model",
        relatedFindingIds: [],
        notes: [`Summarizes ${siteDhcpPools.length} DHCP scope record(s) for this site without flooding the canvas.`],
      });
      addEdge({
        id: `render-edge-site-dhcp-${site.siteId}`,
        relationship: "dhcp-pool-serves-subnet",
        sourceNodeId: siteNodeId,
        targetNodeId: dhcpNodeId,
        label: "DHCP scope summary",
        readiness: "review",
        overlayKeys: ["addressing"],
        relatedObjectIds: siteDhcpPools.map((pool) => pool.id).slice(0, 12),
        notes: ["Collapsed DHCP evidence edge for professional readability."],
      });
    }
  }

  const devicesBySite = new Map<string, NetworkObjectModel["devices"]>();
  for (const device of networkObjectModel.devices) {
    const current = devicesBySite.get(device.siteId) ?? [];
    current.push(device);
    devicesBySite.set(device.siteId, current);
  }

  for (const site of sites) {
    const point = sitePoints.get(site.siteId);
    if (!point) continue;
    const siteNodeId = `render-site-${site.siteId}`;
    const devices = (devicesBySite.get(site.siteId) ?? []).sort((left, right) => {
      const roleRank: Record<NetworkObjectModel["devices"][number]["deviceRole"], number> = {
        "security-firewall": 0,
        "core-layer3-switch": 1,
        "branch-edge-router": 1,
        "routing-identity": 2,
        unknown: 3,
      };
      return roleRank[left.deviceRole] - roleRank[right.deviceRole] || left.name.localeCompare(right.name);
    });

    devices.forEach((device, index) => {
      const readiness = readinessForObject(device.id, networkObjectModel, findingRefs);
      const deviceNodeId = `render-device-${device.id}`;
      const xOffset = devices.length === 1 ? 0 : (index - (devices.length - 1) / 2) * 120;
      addNode({
        id: deviceNodeId,
        objectId: device.id,
        objectType: "network-device",
        label: cleanTopologyLabel(deviceDiagramLabel(device)),
        groupId: `site:${site.siteId}`,
        siteId: site.siteId,
        layer: "device",
        readiness: readiness.readiness,
        truthState: device.truthState,
        x: point.x + xOffset,
        y: point.y + 100,
        sourceEngine: "object-model",
        relatedFindingIds: readiness.relatedFindingIds,
        notes: device.notes.map(cleanTopologyLabel).slice(0, 4),
      });
      addEdge({
        id: `render-edge-site-device-${device.id}`,
        relationship: "site-contains-device",
        sourceNodeId: siteNodeId,
        targetNodeId: deviceNodeId,
        label: "site device",
        readiness: readiness.readiness === "blocked" ? "blocked" : "ready",
        overlayKeys: ["addressing"],
        relatedObjectIds: [site.siteId, device.id],
        notes: ["Site-to-device ownership edge."],
      });

      if (routeDomain) {
        addEdge({
          id: `render-edge-device-route-domain-${device.id}`,
          relationship: "interface-belongs-to-route-domain",
          sourceNodeId: deviceNodeId,
          targetNodeId: `render-route-domain-${routeDomain.id}`,
          label: "routing domain",
          readiness: "review",
          overlayKeys: ["routing"],
          relatedObjectIds: [device.id, routeDomain.id],
          notes: ["Device participates in the corporate routing domain or needs route-domain confirmation."],
        });
      }

      addEdge({
        id: `render-edge-device-wan-${device.id}`,
        relationship: "network-link-terminates-on-device",
        sourceNodeId: deviceNodeId,
        targetNodeId: wanNodeId,
        label: device.deviceRole === "security-firewall" ? "internet/security edge" : "WAN edge path",
        readiness: "review",
        overlayKeys: ["routing", "nat"],
        relatedObjectIds: [device.id, wanZone?.id ?? "wan-internet-edge"],
        notes: ["Professional topology edge for WAN, internet, cloud, or remote-access boundary review."],
      });
    });
  }

  const primaryDevices = primarySite ? devicesBySite.get(primarySite.siteId) ?? [] : [];
  const primaryGateway = primaryDevices.find((device) => device.deviceRole === "core-layer3-switch") ?? primaryDevices.find((device) => device.deviceRole !== "security-firewall");
  if (primaryGateway) {
    for (const site of branchSites) {
      const branchGateway = (devicesBySite.get(site.siteId) ?? []).find((device) => device.deviceRole === "branch-edge-router") ?? (devicesBySite.get(site.siteId) ?? [])[0];
      if (!branchGateway) continue;
      addEdge({
        id: `render-edge-hub-spoke-${primaryGateway.id}-${branchGateway.id}`,
        relationship: "network-link-terminates-on-device",
        sourceNodeId: `render-device-${primaryGateway.id}`,
        targetNodeId: `render-device-${branchGateway.id}`,
        label: "site-to-site summary path",
        readiness: "review",
        overlayKeys: ["routing"],
        relatedObjectIds: [primaryGateway.id, branchGateway.id],
        notes: ["Hub-and-spoke relationship derived from multi-site routing intent and site summarization."],
      });
    }
  }

  const zoneBaseX = 1580;
  const zoneBaseY = 120;
  const visibleZones = networkObjectModel.securityZones
    .filter((zone) => zone.zoneRole !== "wan")
    .filter((zone) => !/voice/i.test(zone.name) || zone.subnetCidrs.length > 0 || zone.vlanIds.length > 0)
    .sort((left, right) => left.zoneRole.localeCompare(right.zoneRole) || left.name.localeCompare(right.name))
    .slice(0, 8);

  visibleZones.forEach((zone, index) => {
    const readiness = readinessForObject(zone.id, networkObjectModel, findingRefs);
    const zoneNodeId = `render-zone-${zone.id}`;
    addNode({
      id: zoneNodeId,
      objectId: zone.id,
      objectType: "security-zone",
      label: cleanTopologyLabel(zone.name),
      layer: "security",
      readiness: readiness.readiness,
      truthState: zone.truthState,
      x: zoneBaseX,
      y: zoneBaseY + index * 92,
      sourceEngine: "security",
      relatedFindingIds: readiness.relatedFindingIds,
      notes: zone.notes.map(cleanTopologyLabel).slice(0, 4),
    });
    if (routeDomain) {
      addEdge({
        id: `render-edge-route-domain-zone-${zone.id}`,
        relationship: "security-zone-protects-subnet",
        sourceNodeId: `render-route-domain-${routeDomain.id}`,
        targetNodeId: zoneNodeId,
        label: "zone boundary",
        readiness: zone.isolationExpectation === "isolated" || zone.isolationExpectation === "restricted" ? "review" : readiness.readiness,
        overlayKeys: ["security"],
        relatedObjectIds: [routeDomain.id, zone.id],
        notes: [`${zone.name} carries ${zone.subnetCidrs.length} subnet(s) and ${zone.vlanIds.length} VLAN id(s).`],
      });
    }
  });

  const policyNodes = networkObjectModel.policyRules
    .filter((policy) => policy.action === "deny" || /guest|management|dmz|wan/i.test(policy.name))
    .slice(0, 10);

  policyNodes.forEach((policy, index) => {
    const policyNodeId = `render-policy-${policy.id}`;
    addNode({
      id: policyNodeId,
      objectId: policy.id,
      objectType: "policy-rule",
      label: cleanTopologyLabel(policy.name.replace(/^Deny\s+/i, "Deny ")),
      layer: "security",
      readiness: policy.action === "review" ? "review" : "ready",
      truthState: policy.truthState,
      x: zoneBaseX + 280,
      y: zoneBaseY + index * 86,
      sourceEngine: "security",
      relatedFindingIds: [],
      notes: [policy.rationale, ...policy.notes].filter(Boolean).map(cleanTopologyLabel).slice(0, 4),
    });
    const sourceZoneNodeId = `render-zone-${policy.sourceZoneId}`;
    const targetZoneNodeId = `render-zone-${policy.destinationZoneId}`;
    const sourceExists = renderNodes.some((node) => node.id === sourceZoneNodeId);
    const targetExists = renderNodes.some((node) => node.id === targetZoneNodeId);
    addEdge({
      id: `render-edge-policy-source-${policy.id}`,
      relationship: "security-zone-applies-policy",
      sourceNodeId: sourceExists ? sourceZoneNodeId : wanNodeId,
      targetNodeId: policyNodeId,
      label: `${policy.action} policy`,
      readiness: policy.action === "review" ? "review" : "ready",
      overlayKeys: ["security"],
      relatedObjectIds: [policy.id, policy.sourceZoneId],
      notes: ["Policy source relationship."],
    });
    if (targetExists) {
      addEdge({
        id: `render-edge-policy-target-${policy.id}`,
        relationship: "security-flow-covered-by-policy",
        sourceNodeId: policyNodeId,
        targetNodeId: targetZoneNodeId,
        label: "protected destination",
        readiness: policy.action === "review" ? "review" : "ready",
        overlayKeys: ["security"],
        relatedObjectIds: [policy.id, policy.destinationZoneId],
        notes: ["Policy destination relationship."],
      });
    }
  });

  const routeLinkCount = renderEdges.filter((edge) => edge.overlayKeys.includes("routing")).length;
  const missingRenderInputs = [
    sites.length <= 0 ? "materialized site topology groups" : null,
    networkObjectModel.devices.length <= 0 ? "modeled network devices" : null,
    routeLinkCount <= 0 ? "WAN or routing relationships" : null,
  ].filter(Boolean) as string[];

  const emptyState = missingRenderInputs.length > 0
    ? {
        reason: `Authoritative topology canvas is blocked because these inputs are missing: ${missingRenderInputs.join(", ")}.`,
        requiredInputs: missingRenderInputs.map((item) => `Generate ${item}`),
      }
    : undefined;

  const groupFromSite = (site: { siteId: string; siteName: string; siteCode?: string | null }): BackendDiagramRenderGroup => ({
    id: `site:${site.siteId}`,
    groupType: "site",
    label: `${siteDiagramCode(site)} — ${site.siteName}`,
    readiness: "ready",
    nodeIds: renderNodes.filter((node) => node.siteId === site.siteId).map((node) => node.id),
    notes: [`Professional diagram grouping for ${site.siteName}.`],
  });

  const groups: BackendDiagramRenderGroup[] = [
    ...sites.map(groupFromSite),
    ...(routeDomain ? [{
      id: `route-domain:${routeDomain.id}`,
      groupType: "route-domain" as const,
      label: routeDomain.name,
      readiness: readinessForObject(routeDomain.id, networkObjectModel, findingRefs).readiness,
      nodeIds: renderNodes.filter((node) => node.objectId === routeDomain.id || node.layer === "routing").map((node) => node.id),
      notes: routeDomain.notes,
    }] : []),
    ...visibleZones.map((zone) => ({
      id: `security-zone:${zone.id}`,
      groupType: "security-zone" as const,
      label: zone.name,
      readiness: readinessForObject(zone.id, networkObjectModel, findingRefs).readiness,
      nodeIds: renderNodes.filter((node) => node.objectId === zone.id).map((node) => node.id),
      notes: zone.notes,
    })),
  ];

  const overlayKeyToLayer: Record<BackendDiagramRenderOverlay["key"], BackendDiagramRenderNode["layer"][]> = {
    addressing: ["site", "device", "interface"],
    routing: ["site", "device", "routing"],
    security: ["site", "device", "security"],
    nat: ["device", "security", "routing"],
    implementation: ["implementation"],
    verification: ["verification", "implementation"],
    "operational-safety": ["device", "implementation"],
  };

  const overlays: BackendDiagramRenderOverlay[] = overlaySummaries.map((summary) => {
    const layers = overlayKeyToLayer[summary.key];
    const nodeIds = renderNodes.filter((node) => layers.includes(node.layer)).map((node) => node.id);
    const edgeIds = renderEdges.filter((edge) => edge.overlayKeys.includes(summary.key)).map((edge) => edge.id);
    return {
      key: summary.key,
      label: summary.label,
      readiness: summary.readiness,
      nodeIds,
      edgeIds,
      hotspotIndexes: hotspots.map((_, hotspotIndex) => hotspotIndex).slice(0, 6),
      detail: summary.detail,
    };
  });

  return {
    summary: {
      nodeCount: renderNodes.length,
      edgeCount: renderEdges.length,
      groupCount: groups.length,
      overlayCount: overlays.length,
      backendAuthored: true,
      layoutMode: "professional-view-separated-layout",
    },
    nodes: renderNodes,
    edges: renderEdges,
    groups,
    overlays,
    emptyState,
  };
}

function buildBackendDiagramRenderModel(networkObjectModel: NetworkObjectModel, overlaySummaries: BackendDiagramTruthOverlaySummary[], hotspots: BackendDiagramTruthHotspot[]): BackendDiagramRenderModel {
  return buildProfessionalTopologyRenderModel(networkObjectModel, overlaySummaries, hotspots);
}

export function buildBackendReportTruthModel(params: { summary: SnapshotSummaryForTruth; networkObjectModel: NetworkObjectModel; issues: DesignCoreIssue[] }): BackendReportTruthModel {
  const { summary, networkObjectModel, issues } = params;
  const routingReadiness = rollupReadiness([normalizeReadiness(networkObjectModel.routingSegmentation.summary.routingReadiness), normalizeReadiness(networkObjectModel.routingSegmentation.summary.segmentationReadiness)]);
  const securityReadiness = normalizeReadiness(networkObjectModel.securityPolicyFlow.summary.policyReadiness);
  const natReadiness = normalizeReadiness(networkObjectModel.securityPolicyFlow.summary.natReadiness);
  const implementationReadiness = normalizeReadiness(networkObjectModel.implementationPlan.summary.implementationReadiness);
  const overallReadiness = rollupReadiness([routingReadiness, securityReadiness, natReadiness, implementationReadiness]);
  const { blockedFindings, reviewFindings } = collectFindingBuckets(networkObjectModel);
  const limitations = [
    ...networkObjectModel.integrityNotes,
    ...issues.filter((issue) => issue.severity !== "INFO").slice(0, 6).map((issue) => `${issue.title}: ${issue.detail}`),
  ];

  if (!summary.readyForBackendAuthority) {
    limitations.unshift("The backend design core has unresolved blockers or review findings; do not treat this design as implementation-ready until they are resolved.");
  }

  return {
    overallReadiness,
    overallReadinessLabel: readinessLabel(overallReadiness),
    summary: {
      deviceCount: networkObjectModel.devices.length,
      linkCount: networkObjectModel.links.length,
      routeDomainCount: networkObjectModel.routeDomains.length,
      securityZoneCount: networkObjectModel.securityZones.length,
      routeIntentCount: networkObjectModel.routingSegmentation.routeIntents.length,
      securityFlowCount: networkObjectModel.securityPolicyFlow.flowRequirements.length,
      implementationStepCount: networkObjectModel.implementationPlan.steps.length,
      blockedImplementationStepCount: networkObjectModel.implementationPlan.summary.blockedStepCount,
      blockedVerificationCheckCount: networkObjectModel.implementationPlan.summary.blockedVerificationCheckCount,
    },
    readiness: { routing: routingReadiness, security: securityReadiness, nat: natReadiness, implementation: implementationReadiness },
    blockedFindings,
    reviewFindings,
    implementationReviewQueue: [...networkObjectModel.implementationPlan.steps].sort(compareStepPriority).slice(0, 12),
    verificationChecks: [...networkObjectModel.implementationPlan.verificationChecks].sort(compareVerificationPriority).slice(0, 16),
    verificationCoverage: summarizeVerificationByType(networkObjectModel.implementationPlan.verificationChecks),
    rollbackActions: networkObjectModel.implementationPlan.rollbackActions.slice(0, 12),
    limitations: limitations.length > 0 ? limitations.slice(0, 12) : ["No backend truth limitations were recorded."],
  };
}

export function buildBackendDiagramTruthModel(params: { summary: SnapshotSummaryForTruth; networkObjectModel: NetworkObjectModel }): BackendDiagramTruthModel {
  const { summary, networkObjectModel } = params;
  const routingReadiness = rollupReadiness([normalizeReadiness(networkObjectModel.routingSegmentation.summary.routingReadiness), normalizeReadiness(networkObjectModel.routingSegmentation.summary.segmentationReadiness)]);
  const securityReadiness = normalizeReadiness(networkObjectModel.securityPolicyFlow.summary.policyReadiness);
  const natReadiness = normalizeReadiness(networkObjectModel.securityPolicyFlow.summary.natReadiness);
  const implementationReadiness = normalizeReadiness(networkObjectModel.implementationPlan.summary.implementationReadiness);
  const hasModeledTopology = networkObjectModel.devices.length > 0 || networkObjectModel.interfaces.length > 0 || networkObjectModel.links.length > 0;

  const overlaySummaries: BackendDiagramTruthOverlaySummary[] = [
    {
      key: "addressing",
      label: "Addressing",
      readiness: networkObjectModel.summary.orphanedAddressRowCount > 0 ? "review" : "ready",
      detail: networkObjectModel.summary.orphanedAddressRowCount > 0 ? `${networkObjectModel.summary.orphanedAddressRowCount} addressing row(s) are not fully anchored to modeled objects.` : "Addressing rows are anchored to modeled network objects.",
      count: summary.validSubnetCount,
    },
    {
      key: "routing",
      label: "Routing",
      readiness: routingReadiness,
      detail: `${networkObjectModel.routingSegmentation.summary.routeIntentCount} route intents, ${networkObjectModel.routingSegmentation.summary.reachabilityFindingCount} reachability finding(s), ${networkObjectModel.routingSegmentation.summary.nextHopReviewCount} next-hop review item(s).`,
      count: networkObjectModel.routingSegmentation.summary.routeIntentCount,
    },
    {
      key: "security",
      label: "Security",
      readiness: securityReadiness,
      detail: `${networkObjectModel.securityPolicyFlow.summary.flowRequirementCount} required flows, ${networkObjectModel.securityPolicyFlow.summary.missingPolicyCount} missing-policy finding(s), ${networkObjectModel.securityPolicyFlow.summary.conflictingPolicyCount} conflict(s).`,
      count: networkObjectModel.securityPolicyFlow.summary.flowRequirementCount,
    },
    {
      key: "nat",
      label: "NAT",
      readiness: natReadiness,
      detail: `${networkObjectModel.securityPolicyFlow.summary.natReviewCount} NAT review row(s), ${networkObjectModel.securityPolicyFlow.summary.missingNatCount} missing NAT coverage finding(s).`,
      count: networkObjectModel.securityPolicyFlow.summary.natReviewCount,
    },
    {
      key: "implementation",
      label: "Implementation",
      readiness: implementationReadiness,
      detail: `${networkObjectModel.implementationPlan.summary.stepCount} implementation step(s), ${networkObjectModel.implementationPlan.summary.blockedStepCount} blocked, ${networkObjectModel.implementationPlan.summary.reviewStepCount} review-required.`,
      count: networkObjectModel.implementationPlan.summary.stepCount,
    },
    {
      key: "verification",
      label: "Verification",
      readiness: networkObjectModel.implementationPlan.summary.blockedVerificationCheckCount > 0 ? "blocked" : networkObjectModel.implementationPlan.summary.verificationCheckCount > 0 ? "review" : "unknown",
      detail: `${networkObjectModel.implementationPlan.summary.verificationCheckCount} verification check(s), ${networkObjectModel.implementationPlan.summary.blockedVerificationCheckCount} blocked.`,
      count: networkObjectModel.implementationPlan.summary.verificationCheckCount,
    },
    {
      key: "operational-safety",
      label: "Operational safety",
      readiness: networkObjectModel.implementationPlan.summary.operationalSafetyBlockedGateCount > 0 ? "blocked" : networkObjectModel.implementationPlan.summary.operationalSafetyGateCount > 0 ? "review" : "unknown",
      detail: `${networkObjectModel.implementationPlan.summary.operationalSafetyGateCount} safety gate(s), ${networkObjectModel.implementationPlan.summary.operationalSafetyBlockedGateCount} blocked gate(s).`,
      count: networkObjectModel.implementationPlan.summary.operationalSafetyGateCount,
    },
  ];

  const nodes = [
    ...networkObjectModel.devices.map((device) => ({ id: device.id, objectType: "network-device" as const, label: device.name, readiness: device.managementIp ? "review" as const : "blocked" as const, notes: device.notes })),
    ...networkObjectModel.interfaces.map((networkInterface) => ({ id: networkInterface.id, objectType: "network-interface" as const, label: networkInterface.name, readiness: networkInterface.ipAddress || networkInterface.subnetCidr ? "review" as const : "blocked" as const, notes: networkInterface.notes })),
    ...networkObjectModel.links.map((link) => ({ id: link.id, objectType: "network-link" as const, label: link.name, readiness: link.status === "modeled" ? "review" as const : "unknown" as const, notes: link.notes })),
    ...networkObjectModel.routeDomains.map((domain) => ({ id: domain.id, objectType: "route-domain" as const, label: domain.name, readiness: normalizeReadiness(domain.summarizationState), notes: domain.notes })),
    ...networkObjectModel.securityZones.map((zone) => ({ id: zone.id, objectType: "security-zone" as const, label: zone.name, readiness: zone.isolationExpectation === "review" ? "review" as const : "ready" as const, notes: zone.notes })),
  ].slice(0, 200);

  const edges = networkObjectModel.designGraph.edges.slice(0, 250).map((edge) => ({
    id: edge.id,
    relationship: edge.relationship,
    sourceId: edge.sourceNodeId,
    targetId: edge.targetNodeId,
    readiness: edge.required ? "review" as const : "unknown" as const,
    notes: edge.notes,
  }));

  const hotspots = [...collectImplementationHotspots(networkObjectModel), ...collectRoutingHotspots(networkObjectModel), ...collectSecurityHotspots(networkObjectModel)].slice(0, 12);
  const overallReadiness = rollupReadiness(overlaySummaries.map((item) => item.readiness));
  const renderModel = buildBackendDiagramRenderModel(networkObjectModel, overlaySummaries, hotspots);
  const diagramEmptyState = hasModeledTopology ? undefined : buildDiagramEmptyStateReason(summary, networkObjectModel);

  return {
    overallReadiness,
    hasModeledTopology,
    emptyStateReason: diagramEmptyState?.reason,
    topologySummary: {
      siteCount: summary.siteCount,
      deviceCount: networkObjectModel.devices.length,
      interfaceCount: networkObjectModel.interfaces.length,
      linkCount: networkObjectModel.links.length,
      routeDomainCount: networkObjectModel.routeDomains.length,
      securityZoneCount: networkObjectModel.securityZones.length,
    },
    nodes,
    edges,
    overlaySummaries,
    hotspots,
    renderModel,
  };
}
