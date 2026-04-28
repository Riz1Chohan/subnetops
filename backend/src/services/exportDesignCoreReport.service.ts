import type { ProfessionalReport } from "./export.types.js";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function applyBackendDesignCoreToReport(report: ProfessionalReport, designCore: any) {
  if (!designCore || typeof designCore !== "object") return report;

  const addressingSection = report.sections.find((section) => section.title.toLowerCase().includes("addressing"));
  const routingSection = report.sections.find((section) => section.title.toLowerCase().includes("routing"));

  const proposedRows = Array.isArray(designCore.proposedRows) ? designCore.proposedRows : [];
  const siteSummaries = Array.isArray(designCore.siteSummaries) ? designCore.siteSummaries : [];
  const transitPlan = Array.isArray(designCore.transitPlan) ? designCore.transitPlan : [];
  const loopbackPlan = Array.isArray(designCore.loopbackPlan) ? designCore.loopbackPlan : [];
  const networkObjectModel = designCore.networkObjectModel && typeof designCore.networkObjectModel === "object" ? designCore.networkObjectModel : null;
  const networkDevices = Array.isArray(networkObjectModel?.devices) ? networkObjectModel.devices : [];
  const networkInterfaces = Array.isArray(networkObjectModel?.interfaces) ? networkObjectModel.interfaces : [];
  const securityZones = Array.isArray(networkObjectModel?.securityZones) ? networkObjectModel.securityZones : [];
  const routeDomains = Array.isArray(networkObjectModel?.routeDomains) ? networkObjectModel.routeDomains : [];
  const policyRules = Array.isArray(networkObjectModel?.policyRules) ? networkObjectModel.policyRules : [];
  const natRules = Array.isArray(networkObjectModel?.natRules) ? networkObjectModel.natRules : [];
  const dhcpPools = Array.isArray(networkObjectModel?.dhcpPools) ? networkObjectModel.dhcpPools : [];
  const designGraph = networkObjectModel?.designGraph && typeof networkObjectModel.designGraph === "object" ? networkObjectModel.designGraph : null;
  const routingSegmentation = networkObjectModel?.routingSegmentation && typeof networkObjectModel.routingSegmentation === "object" ? networkObjectModel.routingSegmentation : null;
  const securityPolicyFlow = networkObjectModel?.securityPolicyFlow && typeof networkObjectModel.securityPolicyFlow === "object" ? networkObjectModel.securityPolicyFlow : null;
  const implementationPlan = networkObjectModel?.implementationPlan && typeof networkObjectModel.implementationPlan === "object" ? networkObjectModel.implementationPlan : null;
  const implementationStages = Array.isArray(implementationPlan?.stages) ? implementationPlan.stages : [];
  const implementationSteps = Array.isArray(implementationPlan?.steps) ? implementationPlan.steps : [];
  const implementationVerificationChecks = Array.isArray(implementationPlan?.verificationChecks) ? implementationPlan.verificationChecks : [];
  const implementationRollbackActions = Array.isArray(implementationPlan?.rollbackActions) ? implementationPlan.rollbackActions : [];
  const implementationFindings = Array.isArray(implementationPlan?.findings) ? implementationPlan.findings : [];
  const securityServiceObjects = Array.isArray(securityPolicyFlow?.serviceObjects) ? securityPolicyFlow.serviceObjects : [];
  const securityFlowRequirements = Array.isArray(securityPolicyFlow?.flowRequirements) ? securityPolicyFlow.flowRequirements : [];
  const securityPolicyFindings = Array.isArray(securityPolicyFlow?.findings) ? securityPolicyFlow.findings : [];
  const routeIntents = Array.isArray(routingSegmentation?.routeIntents) ? routingSegmentation.routeIntents : [];
  const routeTables = Array.isArray(routingSegmentation?.routeTables) ? routingSegmentation.routeTables : [];
  const segmentationExpectations = Array.isArray(routingSegmentation?.segmentationExpectations) ? routingSegmentation.segmentationExpectations : [];
  const routingSegmentationFindings = Array.isArray(routingSegmentation?.reachabilityFindings) ? routingSegmentation.reachabilityFindings : [];
  const designGraphNodes = Array.isArray(designGraph?.nodes) ? designGraph.nodes : [];
  const designGraphEdges = Array.isArray(designGraph?.edges) ? designGraph.edges : [];
  const designGraphFindings = Array.isArray(designGraph?.integrityFindings) ? designGraph.integrityFindings : [];
  const authority = designCore.authority && typeof designCore.authority === "object" ? designCore.authority : null;
  const generatedAt = authority?.generatedAt ? new Date(authority.generatedAt).toLocaleString() : asString(designCore.generatedAt, "unknown time");

  if (addressingSection) {
    addressingSection.tables = addressingSection.tables ?? [];
    addressingSection.paragraphs = [
      ...addressingSection.paragraphs,
      `Backend design-core snapshot source: ${asString(authority?.source, "backend-design-core")} • mode: ${asString(authority?.mode, "authoritative")} • generated: ${generatedAt} • engineer review required.`,
    ];

    if (proposedRows.length > 0) {
      addressingSection.tables.push({
        title: "Addressing Recommendations",
        headers: ["Site", "VLAN", "Segment", "Recommended Subnet", "Recommended Gateway", "Reason"],
        rows: proposedRows.slice(0, 20).map((row: any) => [
          asString(row.siteName, "—"),
          String(row.vlanId ?? "—"),
          asString(row.vlanName, "—"),
          asString(row.proposedSubnetCidr, row.recommendedPrefix ? `/${row.recommendedPrefix}` : "Pending"),
          asString(row.proposedGatewayIp, "Pending"),
          asString(row.reason, "Review before implementation"),
        ]),
      });
    }

    if (siteSummaries.length > 0) {
      addressingSection.tables.push({
        title: "Site Block Review",
        headers: ["Site", "Current Block", "Minimum Summary", "Status", "Notes"],
        rows: siteSummaries.slice(0, 20).map((row: any) => [
          asString(row.siteName, "—"),
          asString(row.currentSiteBlock, "Pending"),
          asString(row.minimumRequiredSummary, "Pending"),
          asString(row.status, "review"),
          Array.isArray(row.notes) ? row.notes.join(" ") : asString(row.notes, "Review before implementation"),
        ]),
      });
    }
  }

  if (addressingSection && networkObjectModel) {
    addressingSection.tables = addressingSection.tables ?? [];

    if (networkDevices.length > 0) {
      addressingSection.tables.push({
        title: "Phase 27 Network Devices",
        headers: ["Device", "Site", "Role", "Truth State", "Notes"],
        rows: networkDevices.slice(0, 25).map((device: any) => [
          asString(device.name, "—"),
          asString(device.siteName, "—"),
          asString(device.deviceRole, "review"),
          asString(device.truthState, "review"),
          Array.isArray(device.notes) ? device.notes.join(" ") : asString(device.notes, "Review before implementation"),
        ]),
      });
    }

    if (networkInterfaces.length > 0) {
      addressingSection.tables.push({
        title: "Phase 27 Gateway and Routing Interfaces",
        headers: ["Interface", "Device", "Role", "Subnet", "IP", "Truth State"],
        rows: networkInterfaces.slice(0, 30).map((networkInterface: any) => [
          asString(networkInterface.name, "—"),
          asString(networkInterface.deviceId, "—"),
          asString(networkInterface.interfaceRole, "review"),
          asString(networkInterface.subnetCidr, "Pending"),
          asString(networkInterface.ipAddress, "Pending"),
          asString(networkInterface.truthState, "review"),
        ]),
      });
    }

    if (dhcpPools.length > 0) {
      addressingSection.tables.push({
        title: "Phase 27 DHCP Pools",
        headers: ["Pool", "VLAN", "Subnet", "Gateway", "State"],
        rows: dhcpPools.slice(0, 25).map((pool: any) => [
          asString(pool.name, "—"),
          String(pool.vlanId ?? "—"),
          asString(pool.subnetCidr, "Pending"),
          asString(pool.gatewayIp, "Pending"),
          asString(pool.allocationState, "review"),
        ]),
      });
    }


    if (designGraph) {
      addressingSection.tables.push({
        title: "Phase 27 Design Graph Summary",
        headers: ["Nodes", "Edges", "Connected Objects", "Orphans", "Graph Findings", "Blocking Findings"],
        rows: [[
          String(designGraph.summary?.nodeCount ?? designGraphNodes.length),
          String(designGraph.summary?.edgeCount ?? designGraphEdges.length),
          String(designGraph.summary?.connectedObjectCount ?? "—"),
          String(designGraph.summary?.orphanObjectCount ?? "—"),
          String(designGraph.summary?.integrityFindingCount ?? designGraphFindings.length),
          String(designGraph.summary?.blockingFindingCount ?? "—"),
        ]],
      });
    }

    if (designGraphFindings.length > 0) {
      addressingSection.tables.push({
        title: "Phase 27 Design Graph Integrity Findings",
        headers: ["Severity", "Finding", "Detail", "Remediation"],
        rows: designGraphFindings.slice(0, 20).map((finding: any) => [
          asString(finding.severity, "review"),
          asString(finding.title, "Graph integrity finding"),
          asString(finding.detail, "Review the design graph relationship."),
          asString(finding.remediation, "Correct the object relationship before implementation planning."),
        ]),
      });
    }
  }


  if (routingSection) {
    routingSection.tables = routingSection.tables ?? [];

    if (routeDomains.length > 0) {
      routingSection.tables.push({
        title: "Phase 27 Route Domains",
        headers: ["Route Domain", "Scope", "Subnets", "Default Route", "Summarization", "Notes"],
        rows: routeDomains.slice(0, 10).map((domain: any) => [
          asString(domain.name, "—"),
          asString(domain.scope, "project"),
          String(Array.isArray(domain.subnetCidrs) ? domain.subnetCidrs.length : 0),
          asString(domain.defaultRouteState, "review"),
          asString(domain.summarizationState, "review"),
          Array.isArray(domain.notes) ? domain.notes.join(" ") : asString(domain.notes, "Review before implementation"),
        ]),
      });
    }

    if (securityZones.length > 0) {
      routingSection.tables.push({
        title: "Phase 27 Security Zones",
        headers: ["Zone", "Role", "Subnets", "Isolation", "Truth State"],
        rows: securityZones.slice(0, 15).map((zone: any) => [
          asString(zone.name, "—"),
          asString(zone.zoneRole, "review"),
          String(Array.isArray(zone.subnetCidrs) ? zone.subnetCidrs.length : 0),
          asString(zone.isolationExpectation, "review"),
          asString(zone.truthState, "review"),
        ]),
      });
    }

    if (policyRules.length > 0) {
      routingSection.tables.push({
        title: "Phase 27 Policy Intent",
        headers: ["Policy", "Action", "Services", "Rationale"],
        rows: policyRules.slice(0, 20).map((rule: any) => [
          asString(rule.name, "—"),
          asString(rule.action, "review"),
          Array.isArray(rule.services) ? rule.services.join(", ") : asString(rule.services, "application-specific"),
          asString(rule.rationale, "Review before implementation"),
        ]),
      });
    }

    if (natRules.length > 0) {
      routingSection.tables.push({
        title: "Phase 27 NAT Intent",
        headers: ["NAT Rule", "Source Subnets", "Mode", "Status"],
        rows: natRules.slice(0, 20).map((rule: any) => [
          asString(rule.name, "—"),
          Array.isArray(rule.sourceSubnetCidrs) ? rule.sourceSubnetCidrs.join(", ") : "Pending",
          asString(rule.translatedAddressMode, "review"),
          asString(rule.status, "review"),
        ]),
      });
    }

    if (designGraphEdges.length > 0) {
      routingSection.tables.push({
        title: "Phase 27 Authoritative Design Graph Relationships",
        headers: ["Relationship", "Source Node", "Target Node", "Required"],
        rows: designGraphEdges.slice(0, 30).map((edge: any) => [
          asString(edge.relationship, "relationship"),
          asString(edge.sourceNodeId, "source"),
          asString(edge.targetNodeId, "target"),
          edge.required ? "Yes" : "No",
        ]),
      });
    }


    if (routingSegmentation) {
      routingSection.tables.push({
        title: "Phase 28 Routing and Segmentation Summary",
        headers: ["Route Intents", "Route Tables", "Missing Routes", "Segmentation Checks", "Policy Gaps", "Blocking Findings"],
        rows: [[
          String(routingSegmentation.summary?.routeIntentCount ?? routeIntents.length),
          String(routingSegmentation.summary?.routeTableCount ?? routeTables.length),
          String(routingSegmentation.summary?.missingRouteCount ?? "0"),
          String(routingSegmentation.summary?.segmentationExpectationCount ?? segmentationExpectations.length),
          String(routingSegmentation.summary?.missingPolicyCount ?? "0"),
          String(routingSegmentation.summary?.blockingFindingCount ?? "0"),
        ]],
      });
    }

    if (routeIntents.length > 0) {
      routingSection.tables.push({
        title: "Phase 28 Route Intent Table",
        headers: ["Route", "Kind", "Destination", "Next Hop", "State", "Purpose"],
        rows: routeIntents.slice(0, 30).map((routeIntent: any) => [
          asString(routeIntent.name, "—"),
          asString(routeIntent.routeKind, "review"),
          asString(routeIntent.destinationCidr, "Pending"),
          asString(routeIntent.nextHopType, "review"),
          asString(routeIntent.administrativeState, "review"),
          asString(routeIntent.routePurpose, "Review before implementation"),
        ]),
      });
    }

    if (segmentationExpectations.length > 0) {
      routingSection.tables.push({
        title: "Phase 28 Segmentation Expectations",
        headers: ["Flow", "Source Zone", "Destination Zone", "Expected", "Observed", "State"],
        rows: segmentationExpectations.slice(0, 25).map((expectation: any) => [
          asString(expectation.name, "—"),
          asString(expectation.sourceZoneName, "—"),
          asString(expectation.destinationZoneName, "—"),
          asString(expectation.expectedAction, "review"),
          asString(expectation.observedPolicyAction, "no rule"),
          asString(expectation.state, "review"),
        ]),
      });
    }

    if (routingSegmentationFindings.length > 0) {
      routingSection.tables.push({
        title: "Phase 28 Routing and Segmentation Findings",
        headers: ["Severity", "Finding", "Detail", "Remediation"],
        rows: routingSegmentationFindings.slice(0, 25).map((finding: any) => [
          asString(finding.severity, "review"),
          asString(finding.title, "Routing or segmentation finding"),
          asString(finding.detail, "Review the route or segmentation model."),
          asString(finding.remediation, "Correct this before implementation planning."),
        ]),
      });
    }

    if (securityPolicyFlow) {
      routingSection.tables.push({
        title: "Phase 29 Security Policy and Flow Summary",
        headers: ["Flows", "Satisfied", "Missing Policy", "Conflicts", "Missing NAT", "Blocking Findings"],
        rows: [[
          String(securityPolicyFlow.summary?.flowRequirementCount ?? securityFlowRequirements.length),
          String(securityPolicyFlow.summary?.satisfiedFlowCount ?? "0"),
          String(securityPolicyFlow.summary?.missingPolicyCount ?? "0"),
          String(securityPolicyFlow.summary?.conflictingPolicyCount ?? "0"),
          String(securityPolicyFlow.summary?.missingNatCount ?? "0"),
          String(securityPolicyFlow.summary?.blockingFindingCount ?? "0"),
        ]],
      });
    }

    if (securityFlowRequirements.length > 0) {
      routingSection.tables.push({
        title: "Phase 29 Security Flow Requirements",
        headers: ["Flow", "Source Zone", "Destination Zone", "Expected", "Observed", "NAT", "State"],
        rows: securityFlowRequirements.slice(0, 30).map((flow: any) => [
          asString(flow.name, "—"),
          asString(flow.sourceZoneName, "—"),
          asString(flow.destinationZoneName, "—"),
          asString(flow.expectedAction, "review"),
          asString(flow.observedPolicyAction, "no rule"),
          flow.natRequired ? (Array.isArray(flow.matchedNatRuleIds) && flow.matchedNatRuleIds.length > 0 ? "covered" : "required") : "not required",
          asString(flow.state, "review"),
        ]),
      });
    }

    if (securityServiceObjects.length > 0) {
      routingSection.tables.push({
        title: "Phase 29 Security Service Objects",
        headers: ["Service", "Protocol Hint", "Port Hint", "Notes"],
        rows: securityServiceObjects.slice(0, 20).map((serviceObject: any) => [
          asString(serviceObject.name, "—"),
          asString(serviceObject.protocolHint, "application"),
          asString(serviceObject.portHint, "—"),
          Array.isArray(serviceObject.notes) ? serviceObject.notes.join(" ") : asString(serviceObject.notes, "Review before implementation"),
        ]),
      });
    }

    if (securityPolicyFindings.length > 0) {
      routingSection.tables.push({
        title: "Phase 29 Security Policy Findings",
        headers: ["Severity", "Finding", "Detail", "Remediation"],
        rows: securityPolicyFindings.slice(0, 25).map((finding: any) => [
          asString(finding.severity, "review"),
          asString(finding.title, "Security policy finding"),
          asString(finding.detail, "Review the security flow model."),
          asString(finding.remediation, "Correct this before implementation planning."),
        ]),
      });
    }

    if (implementationPlan) {
      routingSection.tables.push({
        title: "Phase 30 Implementation-Neutral Plan Summary",
        headers: ["Stages", "Steps", "Ready", "Review", "Blocked", "Verification Checks", "Rollback Actions", "Readiness"],
        rows: [[
          String(implementationPlan.summary?.stageCount ?? implementationStages.length),
          String(implementationPlan.summary?.stepCount ?? implementationSteps.length),
          String(implementationPlan.summary?.readyStepCount ?? "0"),
          String(implementationPlan.summary?.reviewStepCount ?? "0"),
          String(implementationPlan.summary?.blockedStepCount ?? "0"),
          String(implementationPlan.summary?.verificationCheckCount ?? implementationVerificationChecks.length),
          String(implementationPlan.summary?.rollbackActionCount ?? implementationRollbackActions.length),
          asString(implementationPlan.summary?.implementationReadiness, "review"),
        ]],
      });
    }

    if (implementationStages.length > 0) {
      routingSection.tables.push({
        title: "Phase 30 Implementation Stages",
        headers: ["Stage", "Type", "Objective", "Exit Criteria"],
        rows: implementationStages.slice(0, 10).map((stage: any) => [
          asString(stage.name, "—"),
          asString(stage.stageType, "review"),
          asString(stage.objective, "Review stage objective."),
          Array.isArray(stage.exitCriteria) ? stage.exitCriteria.join(" ") : "Confirm stage exit criteria.",
        ]),
      });
    }

    if (implementationSteps.length > 0) {
      routingSection.tables.push({
        title: "Phase 30 Implementation Steps",
        headers: ["Step", "Category", "Action", "Readiness", "Risk", "Intent"],
        rows: implementationSteps.slice(0, 35).map((step: any) => [
          asString(step.title, "—"),
          asString(step.category, "review"),
          asString(step.action, "review"),
          asString(step.readiness, "review"),
          asString(step.riskLevel, "medium"),
          asString(step.implementationIntent, "Review implementation intent."),
        ]),
      });
    }

    if (implementationVerificationChecks.length > 0) {
      routingSection.tables.push({
        title: "Phase 30 Verification Checks",
        headers: ["Check", "Type", "Expected Result", "Failure Impact"],
        rows: implementationVerificationChecks.slice(0, 20).map((check: any) => [
          asString(check.name, "—"),
          asString(check.checkType, "review"),
          asString(check.expectedResult, "Review expected result."),
          asString(check.failureImpact, "Review failure impact."),
        ]),
      });
    }

    if (implementationRollbackActions.length > 0) {
      routingSection.tables.push({
        title: "Phase 30 Rollback Actions",
        headers: ["Rollback", "Trigger", "Intent"],
        rows: implementationRollbackActions.slice(0, 20).map((action: any) => [
          asString(action.name, "—"),
          asString(action.triggerCondition, "Review rollback trigger."),
          asString(action.rollbackIntent, "Review rollback intent."),
        ]),
      });
    }

    if (implementationFindings.length > 0) {
      routingSection.tables.push({
        title: "Phase 30 Implementation Findings",
        headers: ["Severity", "Finding", "Detail", "Remediation"],
        rows: implementationFindings.slice(0, 20).map((finding: any) => [
          asString(finding.severity, "review"),
          asString(finding.title, "Implementation finding"),
          asString(finding.detail, "Review implementation plan."),
          asString(finding.remediation, "Correct before platform-specific implementation."),
        ]),
      });
    }

    if (transitPlan.length > 0) {
      routingSection.tables.push({
        title: "Transit Plan",
        headers: ["Site", "Type", "Subnet", "Endpoint", "Notes"],
        rows: transitPlan.slice(0, 20).map((row: any) => [
          asString(row.siteName, "—"),
          asString(row.kind, "review"),
          asString(row.subnetCidr, "Pending"),
          asString(row.gatewayOrEndpoint, "Pending"),
          Array.isArray(row.notes) ? row.notes.join(" ") : asString(row.notes, "Review before implementation"),
        ]),
      });
    }

    if (loopbackPlan.length > 0) {
      routingSection.tables.push({
        title: "Loopback Plan",
        headers: ["Site", "Type", "Subnet / Endpoint", "Notes"],
        rows: loopbackPlan.slice(0, 20).map((row: any) => [
          asString(row.siteName, "—"),
          asString(row.kind, "review"),
          asString(row.subnetCidr, asString(row.endpointIp, "Pending")),
          Array.isArray(row.notes) ? row.notes.join(" ") : asString(row.notes, "Review before implementation"),
        ]),
      });
    }
  }

  return report;
}
