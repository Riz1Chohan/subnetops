import type {
  DesignCoreAddressRow,
  DesignGraph,
  DesignGraphEdge,
  DesignGraphIntegrityFinding,
  DesignGraphNode,
  DesignGraphNodeObjectType,
  DesignGraphRelationship,
  NetworkObjectModel,
  NetworkObjectTruthState,
  ImplementationPlanModel,
  RoutingSegmentationModel,
  SecurityPolicyFlowModel,
} from "../designCore.types.js";

type NetworkGraphProject = {
  sites: Array<{
    id: string;
    name: string;
    siteCode?: string | null;
  }>;
};

type NetworkObjectModelWithoutGraph = Omit<NetworkObjectModel, "summary" | "designGraph" | "routingSegmentation" | "securityPolicyFlow" | "implementationPlan">;

function normalizeIdentifierSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unnamed";
}

function siteNodeId(siteId: string) {
  return `graph-node-site-${siteId}`;
}

function vlanNodeId(siteId: string, vlanId: number) {
  return `graph-node-site-${siteId}-vlan-${vlanId}`;
}

function subnetNodeId(subnetCidr: string) {
  return `graph-node-subnet-${normalizeIdentifierSegment(subnetCidr)}`;
}

function objectNodeId(objectType: DesignGraphNodeObjectType, objectId: string) {
  return `graph-node-${objectType}-${normalizeIdentifierSegment(objectId)}`;
}

function graphEdgeId(relationship: DesignGraphRelationship, sourceNodeId: string, targetNodeId: string) {
  return `graph-edge-${relationship}-${normalizeIdentifierSegment(sourceNodeId)}-to-${normalizeIdentifierSegment(targetNodeId)}`;
}

function addNode(nodesById: Map<string, DesignGraphNode>, node: DesignGraphNode) {
  const existingNode = nodesById.get(node.id);
  if (!existingNode) {
    nodesById.set(node.id, node);
    return node;
  }

  for (const note of node.notes) {
    if (!existingNode.notes.includes(note)) existingNode.notes.push(note);
  }

  return existingNode;
}

function addEdge(edgesById: Map<string, DesignGraphEdge>, edge: Omit<DesignGraphEdge, "id">) {
  const edgeId = graphEdgeId(edge.relationship, edge.sourceNodeId, edge.targetNodeId);
  const existingEdge = edgesById.get(edgeId);
  if (!existingEdge) {
    const createdEdge: DesignGraphEdge = { id: edgeId, ...edge };
    edgesById.set(edgeId, createdEdge);
    return createdEdge;
  }

  for (const note of edge.notes) {
    if (!existingEdge.notes.includes(note)) existingEdge.notes.push(note);
  }

  return existingEdge;
}

function addFinding(
  findings: DesignGraphIntegrityFinding[],
  finding: DesignGraphIntegrityFinding,
) {
  if (findings.some((item) => item.code === finding.code && item.detail === finding.detail)) return;
  findings.push(finding);
}

function addRequiredRelationship(params: {
  edgesById: Map<string, DesignGraphEdge>;
  findings: DesignGraphIntegrityFinding[];
  relationship: DesignGraphRelationship;
  sourceNodeId?: string;
  targetNodeId?: string;
  truthState: NetworkObjectTruthState;
  notes: string[];
  missingRelationshipCode: string;
  missingRelationshipTitle: string;
  missingRelationshipDetail: string;
  affectedObjectIds: string[];
  remediation: string;
}) {
  if (!params.sourceNodeId || !params.targetNodeId) {
    addFinding(params.findings, {
      severity: "ERROR",
      code: params.missingRelationshipCode,
      title: params.missingRelationshipTitle,
      detail: params.missingRelationshipDetail,
      affectedObjectIds: params.affectedObjectIds,
      remediation: params.remediation,
    });
    return;
  }

  addEdge(params.edgesById, {
    relationship: params.relationship,
    sourceNodeId: params.sourceNodeId,
    targetNodeId: params.targetNodeId,
    truthState: params.truthState,
    required: true,
    notes: params.notes,
  });
}

function nodeExists(nodesById: Map<string, DesignGraphNode>, nodeId?: string) {
  return Boolean(nodeId && nodesById.has(nodeId));
}

function buildSummary(params: {
  nodes: DesignGraphNode[];
  edges: DesignGraphEdge[];
  findings: DesignGraphIntegrityFinding[];
}) {
  const connectedNodeIds = new Set<string>();
  for (const edge of params.edges) {
    connectedNodeIds.add(edge.sourceNodeId);
    connectedNodeIds.add(edge.targetNodeId);
  }

  const orphanObjectCount = params.nodes.filter((node) => !connectedNodeIds.has(node.id)).length;
  const blockingFindingCount = params.findings.filter((finding) => finding.severity === "ERROR").length;
  const relationshipCoveragePercent = params.nodes.length === 0
    ? 100
    : Math.round(((params.nodes.length - orphanObjectCount) / params.nodes.length) * 100);

  return {
    nodeCount: params.nodes.length,
    edgeCount: params.edges.length,
    requiredEdgeCount: params.edges.filter((edge) => edge.required).length,
    connectedObjectCount: connectedNodeIds.size,
    orphanObjectCount,
    integrityFindingCount: params.findings.length,
    blockingFindingCount,
    relationshipCoveragePercent,
    notes: [
      "V1 converts the backend object model into a connected design graph so devices, interfaces, links, zones, route domains, route intents, segmentation expectations, policies, NAT, DHCP, reservations, VLANs, and subnets can be inspected as relationships instead of loose tables.",
      "A design graph finding is intentionally separate from normal subnet validation; it reports missing ownership, missing membership, broken references, and graph orphaning.",
    ],
  };
}

export function buildBackendDesignGraph(params: {
  project: NetworkGraphProject;
  addressingRows: DesignCoreAddressRow[];
  networkObjectModel: NetworkObjectModelWithoutGraph;
  routingSegmentation?: RoutingSegmentationModel;
  securityPolicyFlow?: SecurityPolicyFlowModel;
  implementationPlan?: ImplementationPlanModel;
}): DesignGraph {
  const { project, addressingRows, networkObjectModel } = params;
  const nodesById = new Map<string, DesignGraphNode>();
  const edgesById = new Map<string, DesignGraphEdge>();
  const findings: DesignGraphIntegrityFinding[] = [];

  const deviceNodeByDeviceId = new Map<string, string>();
  const interfaceNodeByInterfaceId = new Map<string, string>();
  const linkNodeByLinkId = new Map<string, string>();
  const routeDomainNodeByRouteDomainId = new Map<string, string>();
  const securityZoneNodeByZoneId = new Map<string, string>();

  for (const site of project.sites) {
    addNode(nodesById, {
      id: siteNodeId(site.id),
      objectType: "site",
      objectId: site.id,
      label: site.siteCode ? `${site.name} (${site.siteCode})` : site.name,
      siteId: site.id,
      truthState: "configured",
      notes: ["Project site from the saved planning record."],
    });
  }

  for (const addressRow of addressingRows) {
    const vlanNode = addNode(nodesById, {
      id: vlanNodeId(addressRow.siteId, addressRow.vlanId),
      objectType: "vlan",
      objectId: `${addressRow.siteId}:vlan:${addressRow.vlanId}`,
      label: `${addressRow.siteName} VLAN ${addressRow.vlanId} ${addressRow.vlanName}`,
      siteId: addressRow.siteId,
      truthState: addressRow.truthState,
      notes: [`VLAN row from the authoritative backend addressing plan. Role: ${addressRow.role}.`],
    });

    const siteNode = nodesById.get(siteNodeId(addressRow.siteId));
    addRequiredRelationship({
      edgesById,
      findings,
      relationship: "site-contains-vlan",
      sourceNodeId: siteNode?.id,
      targetNodeId: vlanNode.id,
      truthState: addressRow.truthState,
      notes: ["Site owns this VLAN planning row."],
      missingRelationshipCode: "DESIGN_GRAPH_VLAN_WITHOUT_SITE",
      missingRelationshipTitle: "VLAN is missing a site relationship",
      missingRelationshipDetail: `${addressRow.siteName} VLAN ${addressRow.vlanId} could not be connected back to a saved site node.`,
      affectedObjectIds: [addressRow.id, addressRow.siteId],
      remediation: "Confirm that the VLAN belongs to a saved site before treating the design graph as implementation-ready.",
    });

    const subnetCidr = addressRow.canonicalSubnetCidr ?? addressRow.proposedSubnetCidr;
    if (!subnetCidr) {
      addFinding(findings, {
        severity: "ERROR",
        code: "DESIGN_GRAPH_VLAN_WITHOUT_SUBNET",
        title: "VLAN is missing a usable subnet node",
        detail: `${addressRow.siteName} VLAN ${addressRow.vlanId} has no canonical or proposed subnet in the backend snapshot.`,
        affectedObjectIds: [addressRow.id],
        remediation: "Fix the subnet input or accept a backend proposal so the VLAN can be connected into routing, security, DHCP, and IP reservation relationships.",
      });
      continue;
    }

    const subnetNode = addNode(nodesById, {
      id: subnetNodeId(subnetCidr),
      objectType: "subnet",
      objectId: subnetCidr,
      label: subnetCidr,
      siteId: addressRow.siteId,
      truthState: addressRow.canonicalSubnetCidr ? "configured" : "proposed",
      notes: [`Subnet used by ${addressRow.siteName} VLAN ${addressRow.vlanId}.`],
    });

    addEdge(edgesById, {
      relationship: "vlan-uses-subnet",
      sourceNodeId: vlanNode.id,
      targetNodeId: subnetNode.id,
      truthState: subnetNode.truthState,
      required: true,
      notes: ["VLAN/subnet binding from the authoritative addressing row."],
    });
  }




  for (const zone of networkObjectModel.securityZones) {
    if (!securityZoneNodeByZoneId.has(zone.id)) {
      const node = addNode(nodesById, {
        id: objectNodeId("security-zone", zone.id),
        objectType: "security-zone",
        objectId: zone.id,
        label: zone.name,
        truthState: zone.truthState,
        notes: zone.notes,
      });
      securityZoneNodeByZoneId.set(zone.id, node.id);
    }
  }

  if (params.securityPolicyFlow) {
    const policyRuleNodeByRuleId = new Map<string, string>();
    const natRuleNodeByRuleId = new Map<string, string>();

    for (const policyRule of networkObjectModel.policyRules) {
      policyRuleNodeByRuleId.set(policyRule.id, objectNodeId("policy-rule", policyRule.id));
    }

    for (const natRule of networkObjectModel.natRules) {
      natRuleNodeByRuleId.set(natRule.id, objectNodeId("nat-rule", natRule.id));
    }

    for (const serviceObject of params.securityPolicyFlow.serviceObjects) {
      addNode(nodesById, {
        id: objectNodeId("security-service", serviceObject.id),
        objectType: "security-service",
        objectId: serviceObject.id,
        label: serviceObject.name,
        truthState: "proposed",
        notes: serviceObject.notes,
      });
    }

    for (const flowRequirement of params.securityPolicyFlow.flowRequirements) {
      const flowNode = addNode(nodesById, {
        id: objectNodeId("security-flow", flowRequirement.id),
        objectType: "security-flow",
        objectId: flowRequirement.id,
        label: flowRequirement.name,
        truthState: flowRequirement.truthState,
        notes: [flowRequirement.rationale, ...flowRequirement.notes],
      });

      addRequiredRelationship({
        edgesById,
        findings,
        relationship: "security-zone-initiates-security-flow",
        sourceNodeId: securityZoneNodeByZoneId.get(flowRequirement.sourceZoneId),
        targetNodeId: flowNode.id,
        truthState: flowRequirement.truthState,
        notes: [`Security flow originates from ${flowRequirement.sourceZoneName}.`],
        missingRelationshipCode: "DESIGN_GRAPH_SECURITY_FLOW_SOURCE_ZONE_MISSING",
        missingRelationshipTitle: "Security flow references a missing source zone",
        missingRelationshipDetail: `${flowRequirement.name} references source zone ${flowRequirement.sourceZoneId}, but that zone is not present.`,
        affectedObjectIds: [flowRequirement.id, flowRequirement.sourceZoneId],
        remediation: "Attach every security flow requirement to a valid source zone.",
      });

      addRequiredRelationship({
        edgesById,
        findings,
        relationship: "security-flow-targets-security-zone",
        sourceNodeId: flowNode.id,
        targetNodeId: securityZoneNodeByZoneId.get(flowRequirement.destinationZoneId),
        truthState: flowRequirement.truthState,
        notes: [`Security flow targets ${flowRequirement.destinationZoneName}.`],
        missingRelationshipCode: "DESIGN_GRAPH_SECURITY_FLOW_DESTINATION_ZONE_MISSING",
        missingRelationshipTitle: "Security flow references a missing destination zone",
        missingRelationshipDetail: `${flowRequirement.name} references destination zone ${flowRequirement.destinationZoneId}, but that zone is not present.`,
        affectedObjectIds: [flowRequirement.id, flowRequirement.destinationZoneId],
        remediation: "Attach every security flow requirement to a valid destination zone.",
      });

      for (const policyRuleId of flowRequirement.matchedPolicyRuleIds) {
        addRequiredRelationship({
          edgesById,
          findings,
          relationship: "security-flow-covered-by-policy",
          sourceNodeId: flowNode.id,
          targetNodeId: policyRuleNodeByRuleId.get(policyRuleId),
          truthState: flowRequirement.truthState,
          notes: ["Security flow is covered by this modeled policy rule."],
          missingRelationshipCode: "DESIGN_GRAPH_SECURITY_FLOW_POLICY_RULE_MISSING",
          missingRelationshipTitle: "Security flow references a missing policy rule",
          missingRelationshipDetail: `${flowRequirement.name} references policy rule ${policyRuleId}, but that rule is not present.`,
          affectedObjectIds: [flowRequirement.id, policyRuleId],
          remediation: "Keep policy coverage references synchronized with the policy rule object model.",
        });
      }

      for (const natRuleId of flowRequirement.matchedNatRuleIds) {
        addRequiredRelationship({
          edgesById,
          findings,
          relationship: "security-flow-uses-nat-rule",
          sourceNodeId: flowNode.id,
          targetNodeId: natRuleNodeByRuleId.get(natRuleId),
          truthState: flowRequirement.truthState,
          notes: ["Security flow uses this NAT intent for egress translation coverage."],
          missingRelationshipCode: "DESIGN_GRAPH_SECURITY_FLOW_NAT_RULE_MISSING",
          missingRelationshipTitle: "Security flow references a missing NAT rule",
          missingRelationshipDetail: `${flowRequirement.name} references NAT rule ${natRuleId}, but that rule is not present.`,
          affectedObjectIds: [flowRequirement.id, natRuleId],
          remediation: "Keep NAT coverage references synchronized with the NAT object model.",
        });
      }
    }
  }

  for (const routeDomain of networkObjectModel.routeDomains) {
    const node = addNode(nodesById, {
      id: objectNodeId("route-domain", routeDomain.id),
      objectType: "route-domain",
      objectId: routeDomain.id,
      label: routeDomain.name,
      truthState: routeDomain.truthState,
      notes: routeDomain.notes,
    });
    routeDomainNodeByRouteDomainId.set(routeDomain.id, node.id);

    for (const subnetCidr of routeDomain.subnetCidrs) {
      const subnetNode = addNode(nodesById, {
        id: subnetNodeId(subnetCidr),
        objectType: "subnet",
        objectId: subnetCidr,
        label: subnetCidr,
        truthState: routeDomain.truthState,
        notes: [`Subnet carried by route domain ${routeDomain.name}.`],
      });
      addEdge(edgesById, {
        relationship: "route-domain-carries-subnet",
        sourceNodeId: node.id,
        targetNodeId: subnetNode.id,
        truthState: routeDomain.truthState,
        required: true,
        notes: ["Route domain explicitly carries this subnet."],
      });
    }
  }

  for (const zone of networkObjectModel.securityZones) {
    const node = addNode(nodesById, {
      id: objectNodeId("security-zone", zone.id),
      objectType: "security-zone",
      objectId: zone.id,
      label: zone.name,
      truthState: zone.truthState,
      notes: zone.notes,
    });
    securityZoneNodeByZoneId.set(zone.id, node.id);

    for (const subnetCidr of zone.subnetCidrs) {
      const subnetNode = addNode(nodesById, {
        id: subnetNodeId(subnetCidr),
        objectType: "subnet",
        objectId: subnetCidr,
        label: subnetCidr,
        truthState: zone.truthState,
        notes: [`Subnet protected by security zone ${zone.name}.`],
      });
      addEdge(edgesById, {
        relationship: "security-zone-protects-subnet",
        sourceNodeId: node.id,
        targetNodeId: subnetNode.id,
        truthState: zone.truthState,
        required: true,
        notes: ["Security zone explicitly protects this subnet."],
      });
    }

    const routeDomainNodeId = routeDomainNodeByRouteDomainId.get(zone.routeDomainId);
    if (!routeDomainNodeId) {
      addFinding(findings, {
        severity: "ERROR",
        code: "DESIGN_GRAPH_ZONE_WITHOUT_ROUTE_DOMAIN",
        title: "Security zone references a missing route domain",
        detail: `${zone.name} references route domain ${zone.routeDomainId}, but that route domain is not present in the object model.`,
        affectedObjectIds: [zone.id, zone.routeDomainId],
        remediation: "Attach every security zone to a valid route domain before using the design graph for implementation planning.",
      });
    }
  }

  for (const device of networkObjectModel.devices) {
    const node = addNode(nodesById, {
      id: objectNodeId("network-device", device.id),
      objectType: "network-device",
      objectId: device.id,
      label: device.name,
      siteId: device.siteId,
      truthState: device.truthState,
      notes: device.notes,
    });
    deviceNodeByDeviceId.set(device.id, node.id);

    const siteNodeIdForDevice = siteNodeId(device.siteId);
    addRequiredRelationship({
      edgesById,
      findings,
      relationship: "site-contains-device",
      sourceNodeId: nodeExists(nodesById, siteNodeIdForDevice) ? siteNodeIdForDevice : undefined,
      targetNodeId: node.id,
      truthState: device.truthState,
      notes: ["Site contains this modeled network device."],
      missingRelationshipCode: "DESIGN_GRAPH_DEVICE_WITHOUT_SITE",
      missingRelationshipTitle: "Device is missing a site relationship",
      missingRelationshipDetail: `${device.name} references site ${device.siteId}, but the site node is missing.`,
      affectedObjectIds: [device.id, device.siteId],
      remediation: "Confirm the device site assignment before treating the object graph as authoritative.",
    });
  }

  for (const networkInterface of networkObjectModel.interfaces) {
    const node = addNode(nodesById, {
      id: objectNodeId("network-interface", networkInterface.id),
      objectType: "network-interface",
      objectId: networkInterface.id,
      label: networkInterface.name,
      siteId: networkInterface.siteId,
      truthState: networkInterface.truthState,
      notes: networkInterface.notes,
    });
    interfaceNodeByInterfaceId.set(networkInterface.id, node.id);

    addRequiredRelationship({
      edgesById,
      findings,
      relationship: "device-owns-interface",
      sourceNodeId: deviceNodeByDeviceId.get(networkInterface.deviceId),
      targetNodeId: node.id,
      truthState: networkInterface.truthState,
      notes: ["Device owns this interface."],
      missingRelationshipCode: "DESIGN_GRAPH_INTERFACE_WITHOUT_DEVICE",
      missingRelationshipTitle: "Interface is missing device ownership",
      missingRelationshipDetail: `${networkInterface.name} references device ${networkInterface.deviceId}, but that device is not present in the object model.`,
      affectedObjectIds: [networkInterface.id, networkInterface.deviceId],
      remediation: "Attach every interface to a modeled device before implementation planning.",
    });

    if (networkInterface.subnetCidr) {
      const subnetNode = addNode(nodesById, {
        id: subnetNodeId(networkInterface.subnetCidr),
        objectType: "subnet",
        objectId: networkInterface.subnetCidr,
        label: networkInterface.subnetCidr,
        siteId: networkInterface.siteId,
        truthState: networkInterface.truthState,
        notes: [`Subnet used by interface ${networkInterface.name}.`],
      });
      addEdge(edgesById, {
        relationship: "interface-uses-subnet",
        sourceNodeId: node.id,
        targetNodeId: subnetNode.id,
        truthState: networkInterface.truthState,
        required: true,
        notes: ["Interface carries or terminates this subnet."],
      });
    }

    if (networkInterface.routeDomainId) {
      addRequiredRelationship({
        edgesById,
        findings,
        relationship: "interface-belongs-to-route-domain",
        sourceNodeId: node.id,
        targetNodeId: routeDomainNodeByRouteDomainId.get(networkInterface.routeDomainId),
        truthState: networkInterface.truthState,
        notes: ["Interface participates in this route domain."],
        missingRelationshipCode: "DESIGN_GRAPH_INTERFACE_WITHOUT_ROUTE_DOMAIN",
        missingRelationshipTitle: "Interface references a missing route domain",
        missingRelationshipDetail: `${networkInterface.name} references route domain ${networkInterface.routeDomainId}, but that route domain is not present.`,
        affectedObjectIds: [networkInterface.id, networkInterface.routeDomainId],
        remediation: "Attach every routed interface to a valid route domain.",
      });
    }

    if (networkInterface.securityZoneId) {
      addRequiredRelationship({
        edgesById,
        findings,
        relationship: "interface-belongs-to-security-zone",
        sourceNodeId: node.id,
        targetNodeId: securityZoneNodeByZoneId.get(networkInterface.securityZoneId),
        truthState: networkInterface.truthState,
        notes: ["Interface participates in this security zone."],
        missingRelationshipCode: "DESIGN_GRAPH_INTERFACE_WITHOUT_SECURITY_ZONE",
        missingRelationshipTitle: "Interface references a missing security zone",
        missingRelationshipDetail: `${networkInterface.name} references security zone ${networkInterface.securityZoneId}, but that zone is not present.`,
        affectedObjectIds: [networkInterface.id, networkInterface.securityZoneId],
        remediation: "Attach every interface to a valid security zone or explicitly mark it as unclassified.",
      });
    }
  }

  for (const link of networkObjectModel.links) {
    const node = addNode(nodesById, {
      id: objectNodeId("network-link", link.id),
      objectType: "network-link",
      objectId: link.id,
      label: link.name,
      siteId: link.siteIds[0],
      truthState: link.truthState,
      notes: link.notes,
    });
    linkNodeByLinkId.set(link.id, node.id);

    const endpointInterfaces = [link.endpointA, link.endpointB].filter(Boolean);
    if (endpointInterfaces.length === 0) {
      addFinding(findings, {
        severity: "WARNING",
        code: "DESIGN_GRAPH_LINK_WITHOUT_ENDPOINTS",
        title: "Network link has no modeled endpoint",
        detail: `${link.name} has no endpoint device or endpoint interface modeled yet.`,
        affectedObjectIds: [link.id],
        remediation: "Add at least one device/interface endpoint before relying on this link for physical or routing implementation planning.",
      });
    }

    for (const endpoint of endpointInterfaces) {
      if (!endpoint) continue;
      const deviceNodeId = deviceNodeByDeviceId.get(endpoint.deviceId);
      addRequiredRelationship({
        edgesById,
        findings,
        relationship: "network-link-terminates-on-device",
        sourceNodeId: node.id,
        targetNodeId: deviceNodeId,
        truthState: link.truthState,
        notes: [`Link endpoint ${endpoint.label} terminates on this device.`],
        missingRelationshipCode: "DESIGN_GRAPH_LINK_ENDPOINT_DEVICE_MISSING",
        missingRelationshipTitle: "Network link endpoint references a missing device",
        missingRelationshipDetail: `${link.name} endpoint ${endpoint.label} references device ${endpoint.deviceId}, but that device is not present.`,
        affectedObjectIds: [link.id, endpoint.deviceId],
        remediation: "Attach every link endpoint to a modeled device.",
      });

      if (endpoint.interfaceId) {
        addRequiredRelationship({
          edgesById,
          findings,
          relationship: "network-link-terminates-on-interface",
          sourceNodeId: node.id,
          targetNodeId: interfaceNodeByInterfaceId.get(endpoint.interfaceId),
          truthState: link.truthState,
          notes: [`Link endpoint ${endpoint.label} terminates on this interface.`],
          missingRelationshipCode: "DESIGN_GRAPH_LINK_ENDPOINT_INTERFACE_MISSING",
          missingRelationshipTitle: "Network link endpoint references a missing interface",
          missingRelationshipDetail: `${link.name} endpoint ${endpoint.label} references interface ${endpoint.interfaceId}, but that interface is not present.`,
          affectedObjectIds: [link.id, endpoint.interfaceId],
          remediation: "Attach every link endpoint to a modeled interface.",
        });
      }
    }

    if (link.subnetCidr) {
      const subnetNode = addNode(nodesById, {
        id: subnetNodeId(link.subnetCidr),
        objectType: "subnet",
        objectId: link.subnetCidr,
        label: link.subnetCidr,
        truthState: link.truthState,
        notes: [`Subnet carried by link ${link.name}.`],
      });
      addEdge(edgesById, {
        relationship: "interface-uses-subnet",
        sourceNodeId: node.id,
        targetNodeId: subnetNode.id,
        truthState: link.truthState,
        required: false,
        notes: ["Link is associated with this subnet."],
      });
    }
  }

  for (const networkInterface of networkObjectModel.interfaces) {
    if (!networkInterface.linkId) continue;

    addRequiredRelationship({
      edgesById,
      findings,
      relationship: "interface-binds-link",
      sourceNodeId: interfaceNodeByInterfaceId.get(networkInterface.id),
      targetNodeId: linkNodeByLinkId.get(networkInterface.linkId),
      truthState: networkInterface.truthState,
      notes: ["Interface is bound to this modeled link."],
      missingRelationshipCode: "DESIGN_GRAPH_INTERFACE_LINK_REFERENCE_MISSING",
      missingRelationshipTitle: "Interface references a missing network link",
      missingRelationshipDetail: `${networkInterface.name} references link ${networkInterface.linkId}, but that link is not present.`,
      affectedObjectIds: [networkInterface.id, networkInterface.linkId],
      remediation: "Create the referenced link object or remove the invalid interface link reference.",
    });
  }

  for (const rule of networkObjectModel.policyRules) {
    const node = addNode(nodesById, {
      id: objectNodeId("policy-rule", rule.id),
      objectType: "policy-rule",
      objectId: rule.id,
      label: rule.name,
      truthState: rule.truthState,
      notes: rule.notes,
    });
    addRequiredRelationship({
      edgesById,
      findings,
      relationship: "security-zone-applies-policy",
      sourceNodeId: securityZoneNodeByZoneId.get(rule.sourceZoneId),
      targetNodeId: node.id,
      truthState: rule.truthState,
      notes: ["Policy rule has this source zone."],
      missingRelationshipCode: "DESIGN_GRAPH_POLICY_SOURCE_ZONE_MISSING",
      missingRelationshipTitle: "Policy rule references a missing source zone",
      missingRelationshipDetail: `${rule.name} references source zone ${rule.sourceZoneId}, but that zone is not present.`,
      affectedObjectIds: [rule.id, rule.sourceZoneId],
      remediation: "Attach every policy rule to valid source and destination zones before generating firewall implementation plans.",
    });

    addRequiredRelationship({
      edgesById,
      findings,
      relationship: "security-zone-applies-policy",
      sourceNodeId: node.id,
      targetNodeId: securityZoneNodeByZoneId.get(rule.destinationZoneId),
      truthState: rule.truthState,
      notes: ["Policy rule has this destination zone."],
      missingRelationshipCode: "DESIGN_GRAPH_POLICY_DESTINATION_ZONE_MISSING",
      missingRelationshipTitle: "Policy rule references a missing destination zone",
      missingRelationshipDetail: `${rule.name} references destination zone ${rule.destinationZoneId}, but that zone is not present.`,
      affectedObjectIds: [rule.id, rule.destinationZoneId],
      remediation: "Attach every policy rule to valid source and destination zones before generating firewall implementation plans.",
    });
  }

  for (const natRule of networkObjectModel.natRules) {
    const node = addNode(nodesById, {
      id: objectNodeId("nat-rule", natRule.id),
      objectType: "nat-rule",
      objectId: natRule.id,
      label: natRule.name,
      truthState: natRule.truthState,
      notes: natRule.notes,
    });
    addRequiredRelationship({
      edgesById,
      findings,
      relationship: "nat-rule-translates-zone",
      sourceNodeId: securityZoneNodeByZoneId.get(natRule.sourceZoneId),
      targetNodeId: node.id,
      truthState: natRule.truthState,
      notes: ["NAT rule translates traffic from this source zone."],
      missingRelationshipCode: "DESIGN_GRAPH_NAT_SOURCE_ZONE_MISSING",
      missingRelationshipTitle: "NAT rule references a missing source zone",
      missingRelationshipDetail: `${natRule.name} references source zone ${natRule.sourceZoneId}, but that zone is not present.`,
      affectedObjectIds: [natRule.id, natRule.sourceZoneId],
      remediation: "Attach every NAT rule to a valid source zone before implementation planning.",
    });

    if (natRule.destinationZoneId) {
      addRequiredRelationship({
        edgesById,
        findings,
        relationship: "nat-rule-translates-zone",
        sourceNodeId: node.id,
        targetNodeId: securityZoneNodeByZoneId.get(natRule.destinationZoneId),
        truthState: natRule.truthState,
        notes: ["NAT rule translates traffic toward this destination zone."],
        missingRelationshipCode: "DESIGN_GRAPH_NAT_DESTINATION_ZONE_MISSING",
        missingRelationshipTitle: "NAT rule references a missing destination zone",
        missingRelationshipDetail: `${natRule.name} references destination zone ${natRule.destinationZoneId}, but that zone is not present.`,
        affectedObjectIds: [natRule.id, natRule.destinationZoneId],
        remediation: "Attach every NAT destination to a valid zone or leave it explicitly unset for a review-only NAT posture.",
      });
    }
  }

  for (const pool of networkObjectModel.dhcpPools) {
    const node = addNode(nodesById, {
      id: objectNodeId("dhcp-pool", pool.id),
      objectType: "dhcp-pool",
      objectId: pool.id,
      label: pool.name,
      siteId: pool.siteId,
      truthState: pool.truthState,
      notes: pool.notes,
    });
    if (pool.subnetCidr) {
      addNode(nodesById, {
        id: subnetNodeId(pool.subnetCidr),
        objectType: "subnet",
        objectId: pool.subnetCidr,
        label: pool.subnetCidr,
        siteId: pool.siteId,
        truthState: pool.truthState,
        notes: [`Subnet served by DHCP pool ${pool.name}.`],
      });
    }

    addRequiredRelationship({
      edgesById,
      findings,
      relationship: "dhcp-pool-serves-subnet",
      sourceNodeId: node.id,
      targetNodeId: pool.subnetCidr ? subnetNodeId(pool.subnetCidr) : undefined,
      truthState: pool.truthState,
      notes: ["DHCP pool serves this subnet."],
      missingRelationshipCode: "DESIGN_GRAPH_DHCP_POOL_WITHOUT_SUBNET",
      missingRelationshipTitle: "DHCP pool is missing its served subnet",
      missingRelationshipDetail: `${pool.name} does not connect to a modeled subnet.`,
      affectedObjectIds: [pool.id, pool.subnetCidr ?? "missing-subnet"],
      remediation: "Ensure DHCP pools are tied to a canonical or proposed subnet before implementation planning.",
    });
  }

  for (const reservation of networkObjectModel.ipReservations) {
    const node = addNode(nodesById, {
      id: objectNodeId("ip-reservation", reservation.id),
      objectType: "ip-reservation",
      objectId: reservation.id,
      label: `${reservation.ipAddress} ${reservation.reservationRole}`,
      truthState: reservation.truthState,
      notes: reservation.notes,
    });
    if (reservation.subnetCidr) {
      addNode(nodesById, {
        id: subnetNodeId(reservation.subnetCidr),
        objectType: "subnet",
        objectId: reservation.subnetCidr,
        label: reservation.subnetCidr,
        truthState: reservation.truthState,
        notes: [`Subnet containing reserved IP address ${reservation.ipAddress}.`],
      });
    }

    addRequiredRelationship({
      edgesById,
      findings,
      relationship: "ip-reservation-belongs-to-subnet",
      sourceNodeId: node.id,
      targetNodeId: reservation.subnetCidr ? subnetNodeId(reservation.subnetCidr) : undefined,
      truthState: reservation.truthState,
      notes: ["IP reservation belongs to this subnet."],
      missingRelationshipCode: "DESIGN_GRAPH_IP_RESERVATION_WITHOUT_SUBNET",
      missingRelationshipTitle: "IP reservation is missing subnet ownership",
      missingRelationshipDetail: `${reservation.ipAddress} does not connect to a modeled subnet.`,
      affectedObjectIds: [reservation.id, reservation.subnetCidr ?? "missing-subnet"],
      remediation: "Attach every reserved IP address to a canonical or proposed subnet.",
    });

    if (reservation.ownerType === "interface" && reservation.ownerId) {
      addRequiredRelationship({
        edgesById,
        findings,
        relationship: "ip-reservation-owned-by-interface",
        sourceNodeId: node.id,
        targetNodeId: interfaceNodeByInterfaceId.get(reservation.ownerId),
        truthState: reservation.truthState,
        notes: ["IP reservation is owned by this interface."],
        missingRelationshipCode: "DESIGN_GRAPH_IP_RESERVATION_OWNER_MISSING",
        missingRelationshipTitle: "IP reservation references a missing interface owner",
        missingRelationshipDetail: `${reservation.ipAddress} references interface owner ${reservation.ownerId}, but that interface is not present.`,
        affectedObjectIds: [reservation.id, reservation.ownerId],
        remediation: "Attach gateway, loopback, and transit endpoint reservations to existing interface objects.",
      });
    }
  }


  if (params.routingSegmentation) {
    for (const routeIntent of params.routingSegmentation.routeIntents) {
      const routeIntentNode = addNode(nodesById, {
        id: objectNodeId("route-intent", routeIntent.id),
        objectType: "route-intent",
        objectId: routeIntent.id,
        label: routeIntent.name,
        siteId: routeIntent.siteId,
        truthState: routeIntent.truthState,
        notes: [routeIntent.routePurpose, ...routeIntent.notes],
      });

      addRequiredRelationship({
        edgesById,
        findings,
        relationship: "route-domain-owns-route",
        sourceNodeId: routeDomainNodeByRouteDomainId.get(routeIntent.routeDomainId),
        targetNodeId: routeIntentNode.id,
        truthState: routeIntent.truthState,
        notes: [`${routeIntent.routeDomainName} owns ${routeIntent.routeKind} route intent ${routeIntent.destinationCidr}.`],
        missingRelationshipCode: "DESIGN_GRAPH_ROUTE_INTENT_WITHOUT_ROUTE_DOMAIN",
        missingRelationshipTitle: "Route intent references a missing route domain",
        missingRelationshipDetail: `${routeIntent.name} references route domain ${routeIntent.routeDomainId}, but that route domain is not present.`,
        affectedObjectIds: [routeIntent.id, routeIntent.routeDomainId],
        remediation: "Attach every route intent to a modeled route domain before implementation planning.",
      });

      const destinationSubnetNode = addNode(nodesById, {
        id: subnetNodeId(routeIntent.destinationCidr),
        objectType: "subnet",
        objectId: routeIntent.destinationCidr,
        label: routeIntent.destinationCidr,
        siteId: routeIntent.siteId,
        truthState: routeIntent.truthState,
        notes: [`Destination prefix for route intent ${routeIntent.name}.`],
      });
      addEdge(edgesById, {
        relationship: "route-intent-targets-subnet",
        sourceNodeId: routeIntentNode.id,
        targetNodeId: destinationSubnetNode.id,
        truthState: routeIntent.truthState,
        required: true,
        notes: ["Route intent targets this destination prefix."],
      });

      if (routeIntent.nextHopType === "connected-interface" && routeIntent.nextHopObjectId) {
        addRequiredRelationship({
          edgesById,
          findings,
          relationship: "route-intent-exits-interface",
          sourceNodeId: routeIntentNode.id,
          targetNodeId: interfaceNodeByInterfaceId.get(routeIntent.nextHopObjectId),
          truthState: routeIntent.truthState,
          notes: ["Connected route exits through this modeled interface."],
          missingRelationshipCode: "DESIGN_GRAPH_ROUTE_INTENT_INTERFACE_MISSING",
          missingRelationshipTitle: "Route intent references a missing interface",
          missingRelationshipDetail: `${routeIntent.name} references interface ${routeIntent.nextHopObjectId}, but that interface is not present.`,
          affectedObjectIds: [routeIntent.id, routeIntent.nextHopObjectId],
          remediation: "Attach connected route intents to existing routed interfaces.",
        });
      }
    }

    for (const flowExpectation of params.routingSegmentation.segmentationExpectations) {
      const flowNode = addNode(nodesById, {
        id: objectNodeId("segmentation-flow", flowExpectation.id),
        objectType: "segmentation-flow",
        objectId: flowExpectation.id,
        label: flowExpectation.name,
        truthState: "proposed",
        notes: [flowExpectation.rationale, ...flowExpectation.notes],
      });

      addRequiredRelationship({
        edgesById,
        findings,
        relationship: "security-zone-expects-flow",
        sourceNodeId: securityZoneNodeByZoneId.get(flowExpectation.sourceZoneId),
        targetNodeId: flowNode.id,
        truthState: "proposed",
        notes: [`Expected ${flowExpectation.expectedAction} flow originates from ${flowExpectation.sourceZoneName}.`],
        missingRelationshipCode: "DESIGN_GRAPH_FLOW_SOURCE_ZONE_MISSING",
        missingRelationshipTitle: "Segmentation expectation references a missing source zone",
        missingRelationshipDetail: `${flowExpectation.name} references source zone ${flowExpectation.sourceZoneId}, but that zone is not present.`,
        affectedObjectIds: [flowExpectation.id, flowExpectation.sourceZoneId],
        remediation: "Attach every segmentation expectation to valid source and destination zones.",
      });

      addRequiredRelationship({
        edgesById,
        findings,
        relationship: "security-zone-expects-flow",
        sourceNodeId: flowNode.id,
        targetNodeId: securityZoneNodeByZoneId.get(flowExpectation.destinationZoneId),
        truthState: "proposed",
        notes: [`Expected ${flowExpectation.expectedAction} flow targets ${flowExpectation.destinationZoneName}.`],
        missingRelationshipCode: "DESIGN_GRAPH_FLOW_DESTINATION_ZONE_MISSING",
        missingRelationshipTitle: "Segmentation expectation references a missing destination zone",
        missingRelationshipDetail: `${flowExpectation.name} references destination zone ${flowExpectation.destinationZoneId}, but that zone is not present.`,
        affectedObjectIds: [flowExpectation.id, flowExpectation.destinationZoneId],
        remediation: "Attach every segmentation expectation to valid source and destination zones.",
      });
    }
  }


  if (params.implementationPlan) {
    const implementationStageNodeByStageId = new Map<string, string>();

    for (const stage of params.implementationPlan.stages) {
      const stageNode = addNode(nodesById, {
        id: objectNodeId("implementation-stage", stage.id),
        objectType: "implementation-stage",
        objectId: stage.id,
        label: stage.name,
        truthState: "proposed",
        notes: [stage.objective, ...stage.exitCriteria],
      });
      implementationStageNodeByStageId.set(stage.id, stageNode.id);
    }

    for (const step of params.implementationPlan.steps) {
      const stepNode = addNode(nodesById, {
        id: objectNodeId("implementation-step", step.id),
        objectType: "implementation-step",
        objectId: step.id,
        label: step.title,
        siteId: step.siteId,
        truthState: step.action === "verify" ? "inferred" : "proposed",
        notes: [step.implementationIntent, step.expectedOutcome, ...step.notes],
      });

      addRequiredRelationship({
        edgesById,
        findings,
        relationship: "implementation-stage-contains-step",
        sourceNodeId: implementationStageNodeByStageId.get(step.stageId),
        targetNodeId: stepNode.id,
        truthState: step.action === "verify" ? "inferred" : "proposed",
        notes: [`${step.title} belongs to implementation stage ${step.stageId}.`],
        missingRelationshipCode: "DESIGN_GRAPH_IMPLEMENTATION_STEP_WITHOUT_STAGE",
        missingRelationshipTitle: "Implementation step references a missing stage",
        missingRelationshipDetail: `${step.title} references stage ${step.stageId}, but that stage is not present.`,
        affectedObjectIds: [step.id, step.stageId],
        remediation: "Keep implementation steps attached to valid implementation stages before producing implementation packages.",
      });

      if (step.targetObjectId) {
        let targetNodeId: string | undefined;
        if (step.targetObjectType === "network-interface") targetNodeId = interfaceNodeByInterfaceId.get(step.targetObjectId);
        if (step.targetObjectType === "network-device") targetNodeId = deviceNodeByDeviceId.get(step.targetObjectId);
        if (step.targetObjectType === "nat-rule") targetNodeId = objectNodeId("nat-rule", step.targetObjectId);
        if (step.targetObjectType === "policy-rule") targetNodeId = objectNodeId("policy-rule", step.targetObjectId);
        if (step.targetObjectType === "dhcp-pool") targetNodeId = objectNodeId("dhcp-pool", step.targetObjectId);
        if (step.targetObjectType === "route-intent") targetNodeId = objectNodeId("route-intent", step.targetObjectId);
        if (step.targetObjectType === "security-flow") targetNodeId = objectNodeId("security-flow", step.targetObjectId);

        if (targetNodeId && nodeExists(nodesById, targetNodeId)) {
          addEdge(edgesById, {
            relationship: step.targetObjectType === "route-intent"
              ? "implementation-step-implements-route"
              : step.targetObjectType === "security-flow"
                ? "implementation-step-verifies-flow"
                : "implementation-step-targets-object",
            sourceNodeId: stepNode.id,
            targetNodeId,
            truthState: step.action === "verify" ? "inferred" : "proposed",
            required: true,
            notes: [`Implementation step targets ${step.targetObjectType} ${step.targetObjectId}.`],
          });
        }
      }
    }
  }

  for (const routeDomain of networkObjectModel.routeDomains) {
    for (const interfaceId of routeDomain.interfaceIds) {
      if (!interfaceNodeByInterfaceId.has(interfaceId)) {
        addFinding(findings, {
          severity: "ERROR",
          code: "DESIGN_GRAPH_ROUTE_DOMAIN_INTERFACE_MISSING",
          title: "Route domain references a missing interface",
          detail: `${routeDomain.name} includes interface ${interfaceId}, but that interface is not present.`,
          affectedObjectIds: [routeDomain.id, interfaceId],
          remediation: "Remove stale route-domain interface references or create the missing interface object.",
        });
      }
    }
  }

  for (const device of networkObjectModel.devices) {
    if (device.interfaceIds.length === 0 && device.deviceRole !== "security-firewall") {
      addFinding(findings, {
        severity: "WARNING",
        code: "DESIGN_GRAPH_DEVICE_WITHOUT_INTERFACES",
        title: "Device has no modeled interfaces",
        detail: `${device.name} is present in the object model but has no owned interfaces.`,
        affectedObjectIds: [device.id],
        remediation: "Add interfaces or confirm that this is only a proposed placeholder device.",
      });
    }
  }

  const nodes = Array.from(nodesById.values()).sort((left, right) => left.id.localeCompare(right.id));
  const edges = Array.from(edgesById.values()).sort((left, right) => left.id.localeCompare(right.id));
  const sortedFindings = findings.sort((left, right) => `${left.severity}-${left.code}`.localeCompare(`${right.severity}-${right.code}`));

  return {
    summary: buildSummary({ nodes, edges, findings: sortedFindings }),
    nodes,
    edges,
    integrityFindings: sortedFindings,
  };
}
