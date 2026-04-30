import type { ProfessionalReport } from "./export.types.js";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function joinText(value: unknown, fallback = "—") {
  if (Array.isArray(value)) {
    const joined = value.map((item) => String(item ?? "").trim()).filter(Boolean).join("; ");
    return joined || fallback;
  }
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function isBlocked(value: unknown) {
  return asString(value).toLowerCase() === "blocked";
}

function compactRows(rows: string[][], fallback: string[][]) {
  return rows.length > 0 ? rows : fallback;
}

export function applyBackendDesignCoreToReport(report: ProfessionalReport, designCore: any) {
  if (!designCore || typeof designCore !== "object") return report;

  const addressingSection = report.sections.find((section) => section.title.toLowerCase().includes("addressing"));
  const routingSection = report.sections.find((section) => section.title.toLowerCase().includes("routing"));

  const proposedRows = Array.isArray(designCore.proposedRows) ? designCore.proposedRows : [];
  const authoritativeAddressingRows = Array.isArray(designCore.addressingRows) ? designCore.addressingRows : [];
  const requirementOutputAddressRowCount = Math.max(authoritativeAddressingRows.length, proposedRows.length);
  const siteSummaries = Array.isArray(designCore.siteSummaries) ? designCore.siteSummaries : [];
  const transitPlan = Array.isArray(designCore.transitPlan) ? designCore.transitPlan : [];
  const loopbackPlan = Array.isArray(designCore.loopbackPlan) ? designCore.loopbackPlan : [];
  const networkObjectModel = designCore.networkObjectModel && typeof designCore.networkObjectModel === "object" ? designCore.networkObjectModel : null;
  const reportTruth = designCore.reportTruth && typeof designCore.reportTruth === "object" ? designCore.reportTruth : null;
  const diagramTruth = designCore.diagramTruth && typeof designCore.diagramTruth === "object" ? designCore.diagramTruth : null;
  const vendorNeutralTemplates = designCore.vendorNeutralImplementationTemplates && typeof designCore.vendorNeutralImplementationTemplates === "object" ? designCore.vendorNeutralImplementationTemplates : null;
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
  const enterpriseAllocatorPosture = designCore.enterpriseAllocatorPosture && typeof designCore.enterpriseAllocatorPosture === "object" ? designCore.enterpriseAllocatorPosture : null;
  const requirementsImpactClosure = designCore.requirementsImpactClosure && typeof designCore.requirementsImpactClosure === "object" ? designCore.requirementsImpactClosure : null;
  const requirementsScenarioProof = designCore.requirementsScenarioProof && typeof designCore.requirementsScenarioProof === "object" ? designCore.requirementsScenarioProof : null;
  const generatedAt = authority?.generatedAt ? new Date(authority.generatedAt).toLocaleString() : asString(designCore.generatedAt, "unknown time");
  const backendBlockedFindings = asArray(reportTruth?.blockedFindings);
  const backendReviewFindings = asArray(reportTruth?.reviewFindings);
  const implementationReviewQueue = asArray(reportTruth?.implementationReviewQueue).length > 0 ? asArray(reportTruth?.implementationReviewQueue) : implementationSteps.filter((step: any) => step.readiness !== "ready" || step.riskLevel === "high");
  const verificationChecks = asArray(reportTruth?.verificationChecks).length > 0 ? asArray(reportTruth?.verificationChecks) : implementationVerificationChecks;
  const rollbackActions = asArray(reportTruth?.rollbackActions).length > 0 ? asArray(reportTruth?.rollbackActions) : implementationRollbackActions;
  const reportTruthLimitations = asArray(reportTruth?.limitations);
  const implementationReadiness = asString(reportTruth?.readiness?.implementation, asString(implementationPlan?.summary?.implementationReadiness, "review"));
  const overallReadiness = asString(reportTruth?.overallReadiness, asString(reportTruth?.overallReadinessLabel, "review"));
  const blockedDesign = isBlocked(implementationReadiness) || isBlocked(overallReadiness);
  const diagramEmptyInputs = asArray(diagramTruth?.renderModel?.emptyState?.requiredInputs);
  const diagramEmptyReason = asString(diagramTruth?.emptyStateReason, asString(diagramTruth?.renderModel?.emptyState?.reason, ""));
  const scenarioStatus = asString(requirementsScenarioProof?.status, "");
  const scenarioPassed = Number(requirementsScenarioProof?.passedSignalCount ?? 0);
  const scenarioExpected = Number(requirementsScenarioProof?.expectedSignalCount ?? 0);
  const materializedDesignEvidenceReady = siteSummaries.length > 0 && (requirementOutputAddressRowCount > 0 || networkInterfaces.length > 0) && !Boolean(diagramEmptyReason) && diagramEmptyInputs.length === 0;
  const scenarioProofMissingAllEvidence = scenarioExpected > 0 && scenarioPassed === 0;
  const phase74TruthBlocked =
    !materializedDesignEvidenceReady && (
      Boolean(diagramEmptyReason)
      || scenarioProofMissingAllEvidence
    );

  if (phase74TruthBlocked) {
    report.metadata = report.metadata ?? {
      organizationName: "To be confirmed",
      environment: "To be confirmed",
      reportVersion: "Version 0.94 Phase 74 truth-locked",
      revisionStatus: "Blocked - backend truth gaps present",
      documentOwner: "SubnetOps project owner",
      approvalStatus: "Not ready for approval",
      generatedFrom: "Backend design-core truth lock",
    };
    report.metadata.reportVersion = "Version 0.94 Phase 74 truth-locked";
    report.metadata.revisionStatus = "Blocked - backend truth gaps present";
    report.metadata.approvalStatus = "Not ready for approval";
    report.executiveSummary.unshift("Requirement-output evidence is still incomplete. Do not treat the package as design-review ready until materialized sites, addressing rows, and diagram topology evidence agree.");
  }

  report.sections.push({
    title: "Phase 83 Requirement Propagation Completion Audit",
    paragraphs: [
      phase74TruthBlocked
        ? "Requirement-output evidence is still incomplete, so the export must stay blocked until materialized sites, addressing rows, and diagram topology evidence agree."
        : "Requirement-output evidence is present. Remaining blockers belong to implementation execution readiness, not to requirements materialization.",
      "The purpose of this section is to keep report, diagram, requirement proof, and backend design-core posture aligned.",
    ],
    tables: [
      {
        title: "Phase 83 Truth Gates",
        headers: ["Gate", "Status", "Evidence"],
        rows: [
          ["Requirement-output evidence", phase74TruthBlocked ? "blocked" : "ready", "Materialized sites " + siteSummaries.length + "; addressing rows " + requirementOutputAddressRowCount + "; diagram missing inputs " + diagramEmptyInputs.length],
          ["Implementation execution readiness", blockedDesign ? "blocked" : "review", `Overall readiness ${overallReadiness}; implementation readiness ${implementationReadiness}; blocked implementation ${blockedDesign ? "yes" : "no"}`],
          ["Requirement scenario proof", isBlocked(scenarioStatus) || (scenarioExpected > 0 && scenarioPassed === 0) ? "blocked" : "review/ready", `${scenarioPassed}/${scenarioExpected} scenario proof signal(s) passed; status ${scenarioStatus || "unavailable"}`],
          ["Diagram topology evidence", diagramEmptyReason ? "blocked" : "ready", diagramEmptyReason || "Backend diagram has modeled topology evidence."],
          ["Diagram required inputs", diagramEmptyInputs.length > 0 ? "blocked" : "ready", joinText(diagramEmptyInputs, "No missing diagram inputs recorded")],
        ],
      },
    ],
  });

  const phase84DefaultDenyPolicies = policyRules.filter((rule: any) => asArray(rule?.notes).some((note: any) => String(note).includes("Phase 84 explicit default-deny guardrail")));
  report.sections.push({
    title: "Phase 84 Design Trust and Policy Reconciliation",
    paragraphs: [
      "Phase 84 separates design-review readiness from implementation execution readiness so warnings, missing live inventory, and vendor-specific change gates do not collapse a materialized design into a false zero-trust state.",
      `Design review readiness: ${asString(designCore.summary?.designReviewReadiness, designCore.summary?.readyForBackendAuthority ? "review" : "blocked")}. Implementation execution readiness: ${asString(designCore.summary?.implementationExecutionReadiness, designCore.summary?.implementationPlanBlockingFindingCount ? "blocked" : "review")}.`,
      "The report now surfaces authoritative evidence counts used by the UI instead of relying on shallow zero-prone frontend fields.",
    ],
    tables: [
      {
        title: "Phase 84 Readiness Split",
        headers: ["Readiness Track", "Status", "Evidence"],
        rows: [
          ["Design review", asString(designCore.summary?.designReviewReadiness, designCore.summary?.readyForBackendAuthority ? "review" : "blocked"), `${designCore.summary?.siteCount ?? siteSummaries.length} site(s), ${designCore.summary?.vlanCount ?? requirementOutputAddressRowCount} addressing row(s), ${designCore.summary?.networkObjectCount ?? networkDevices.length + networkInterfaces.length} modeled object(s), ${designCore.summary?.issueCount ?? 0} design issue(s).`],
          ["Implementation execution", asString(designCore.summary?.implementationExecutionReadiness, designCore.summary?.implementationPlanBlockingFindingCount ? "blocked" : "review"), `${designCore.summary?.implementationPlanStepCount ?? implementationSteps.length} step(s), ${designCore.summary?.implementationPlanBlockingFindingCount ?? 0} blocking implementation finding(s), ${designCore.summary?.implementationPlanReviewStepCount ?? 0} review step(s).`],
        ],
      },
      {
        title: "Phase 84 Authoritative Evidence Metrics",
        headers: ["Metric", "Count"],
        rows: [
          ["Materialized sites", String(designCore.summary?.siteCount ?? siteSummaries.length)],
          ["Addressing rows", String(designCore.summary?.vlanCount ?? requirementOutputAddressRowCount)],
          ["WAN/transit plan rows", String(designCore.summary?.transitPlanCount ?? transitPlan.length)],
          ["Route intents", String(designCore.summary?.routeIntentCount ?? routeIntents.length)],
          ["Durable DHCP scope evidence", String(dhcpPools.length)],
          ["Vendor-neutral templates", String(vendorNeutralTemplates?.summary?.templateCount ?? asArray(vendorNeutralTemplates?.templates).length)],
        ],
      },
      {
        title: "Phase 84 Explicit Default-Deny Guardrails",
        headers: ["Policy", "Source", "Destination", "Action"],
        rows: compactRows(
          phase84DefaultDenyPolicies.map((rule: any) => [asString(rule.name, rule.id), asString(rule.sourceZoneId, "—"), asString(rule.destinationZoneId, "—"), asString(rule.action, "deny")]).slice(0, 30),
          [["No Phase 84 guardrail policies emitted", "—", "—", "review"]],
        ),
      },
    ],
  });


  if (requirementsImpactClosure || requirementsScenarioProof) {
    const closureRows = asArray(requirementsImpactClosure?.fieldOutcomes)
      .filter((item: any) => item?.captured)
      .slice(0, 35)
      .map((item: any) => [
        asString(item.label, asString(item.key, "Requirement")),
        asString(item.key, "—"),
        asString(item.reflectionStatus, "review"),
        joinText(asArray(item.concreteOutputs).slice(0, 4), "—"),
        joinText(asArray(item.visibleIn).slice(0, 4), "—"),
      ]);

    const scenarioRows = asArray(requirementsScenarioProof?.signals)
      .slice(0, 20)
      .map((signal: any) => [
        asString(signal.label, "Scenario signal"),
        signal.passed ? "pass" : asString(signal.severity, "review"),
        joinText(asArray(signal.requirementKeys), "—"),
        joinText(asArray(signal.evidence).slice(0, 5), "—"),
        joinText(asArray(signal.missingEvidence), "—"),
      ]);

    report.sections.push({
      title: "Requirement Traceability and Scenario Proof",
      paragraphs: [
        `Requirement impact closure status: ${asString(requirementsImpactClosure?.completionStatus, "unavailable")} • captured fields: ${requirementsImpactClosure?.capturedFieldCount ?? 0}/${requirementsImpactClosure?.totalFieldCount ?? 0} • handled/inventoried fields: ${requirementsImpactClosure?.handledFieldCount ?? requirementsImpactClosure?.totalFieldCount ?? 0}/${requirementsImpactClosure?.totalFieldCount ?? 0} • explicitly unused/not captured: ${requirementsImpactClosure?.explicitlyUnusedFieldCount ?? requirementsImpactClosure?.notCapturedFieldCount ?? 0}.`,
        `Scenario proof: ${asString(requirementsScenarioProof?.scenarioName, "unavailable")} • status: ${asString(requirementsScenarioProof?.status, "unavailable")} • passed signals: ${requirementsScenarioProof?.passedSignalCount ?? 0}/${requirementsScenarioProof?.expectedSignalCount ?? 0}.`,
        "This section is included so exported reports show where selected requirements changed the actual plan evidence instead of hiding requirement selections as unverified form data.",
      ],
      tables: [
        {
          title: "Requirement Impact Closure",
          headers: ["Requirement", "Key", "Status", "Concrete Evidence", "Visible In"],
          rows: compactRows(closureRows, [["No captured requirement closure rows", "—", "review", "—", "—"]]),
        },
        {
          title: "Requirement Scenario Proof",
          headers: ["Signal", "Result", "Requirement Keys", "Evidence", "Missing Evidence"],
          rows: compactRows(scenarioRows, [["No scenario proof rows", "—", "—", "—", "—"]]),
        },
      ],
    });
  }

  if (addressingSection) {
    addressingSection.tables = addressingSection.tables ?? [];
    addressingSection.paragraphs = [
      ...addressingSection.paragraphs,
      `Backend design-core snapshot source: ${asString(authority?.source, "backend-design-core")} • mode: ${asString(authority?.mode, "authoritative")} • generated: ${generatedAt} • engineer review required.`,
    ];

    if (enterpriseAllocatorPosture) {
      addressingSection.tables.push({
        title: "Enterprise Address Allocator Readiness",
        headers: ["Gate", "Status", "Evidence"],
        rows: [
          ["Source-of-truth model", asString(enterpriseAllocatorPosture.sourceOfTruthReadiness, "review"), `${enterpriseAllocatorPosture.durablePoolCount ?? 0} pool(s); ${enterpriseAllocatorPosture.durableAllocationCount ?? 0} durable allocation(s); ${enterpriseAllocatorPosture.allocationLedgerEntryCount ?? 0} ledger entrie(s)`],
          ["Dual-stack IPv6", asString(enterpriseAllocatorPosture.dualStackReadiness, "review"), `${enterpriseAllocatorPosture.ipv6ConfiguredPrefixCount ?? 0} IPv6 prefix(es); ${enterpriseAllocatorPosture.ipv6AllocationCount ?? 0} IPv6 allocation/proposal(s); ${enterpriseAllocatorPosture.ipv6ReviewFindingCount ?? 0} IPv6 finding(s)`],
          ["VRF / route-domain allocation", asString(enterpriseAllocatorPosture.vrfReadiness, "review"), `${enterpriseAllocatorPosture.vrfDomainCount ?? 0} route domain(s); ${enterpriseAllocatorPosture.vrfOverlapFindingCount ?? 0} overlap finding(s)`],
          ["Brownfield/IPAM import", asString(enterpriseAllocatorPosture.brownfieldReadiness, "review"), `${asString(enterpriseAllocatorPosture.brownfieldEvidenceState, "import-required")}; ${enterpriseAllocatorPosture.durableBrownfieldNetworkCount ?? 0} imported network(s); ${enterpriseAllocatorPosture.brownfieldConflictCount ?? 0} conflict(s)`],
          ["DHCP scopes/reservations", asString(enterpriseAllocatorPosture.dhcpReadiness, "review"), `${enterpriseAllocatorPosture.dhcpScopeCount ?? 0} DHCP scope(s); ${enterpriseAllocatorPosture.reservationPolicyCount ?? 0} reservation object(s); ${enterpriseAllocatorPosture.dhcpFindingCount ?? 0} finding(s)`],
          ["Growth reserve policy", asString(enterpriseAllocatorPosture.reservePolicyReadiness, "review"), `${enterpriseAllocatorPosture.reservePolicyFindingCount ?? 0} reserve policy finding(s); reserve is explicit and not silently assumed`],
          ["Approval workflow", asString(enterpriseAllocatorPosture.approvalReadiness, "review"), `${enterpriseAllocatorPosture.allocationApprovalCount ?? 0} approval(s); ${enterpriseAllocatorPosture.staleAllocationCount ?? 0} stale allocation(s); input hash ${asString(enterpriseAllocatorPosture.currentInputHash, "unknown")}`],
        ],
      });
      if (Array.isArray(enterpriseAllocatorPosture.allocationPlanRows) && enterpriseAllocatorPosture.allocationPlanRows.length > 0) {
        addressingSection.tables.push({
          title: "Phase 50 Dual-Stack Allocation Plan",
          headers: ["Family", "Pool", "Route Domain", "Target", "Requested", "Proposed", "Status", "Proof"],
          rows: enterpriseAllocatorPosture.allocationPlanRows.slice(0, 20).map((row: any) => [
            asString(row.family, "—"),
            asString(row.poolName, "—"),
            asString(row.routeDomainKey, "default"),
            asString(row.target, "—"),
            row.requestedPrefix ? `/${row.requestedPrefix}` : "—",
            asString(row.proposedCidr, "—"),
            asString(row.status, "review"),
            asString(row.explanation, "—"),
          ]),
        });
      }
      if (Array.isArray(enterpriseAllocatorPosture.reviewFindings) && enterpriseAllocatorPosture.reviewFindings.length > 0) {
        addressingSection.tables.push({
          title: "Phase 51–53 Enterprise Allocator Findings",
          headers: ["Severity", "Code", "Finding", "Detail"],
          rows: enterpriseAllocatorPosture.reviewFindings.slice(0, 30).map((finding: any) => [asString(finding.severity, "review"), asString(finding.code, "—"), asString(finding.title, "—"), asString(finding.detail, "—")]),
        });
      }
      if (Array.isArray(enterpriseAllocatorPosture.reviewQueue) && enterpriseAllocatorPosture.reviewQueue.length > 0) {
        addressingSection.tables.push({
          title: "Enterprise Allocator Review Queue",
          headers: ["Review Item"],
          rows: enterpriseAllocatorPosture.reviewQueue.slice(0, 20).map((item: any) => [joinText(item, "Review allocator evidence")]),
        });
      }
    }

    if (proposedRows.length > 0) {
      addressingSection.tables.push({
        title: "Addressing Recommendations",
        headers: ["Site", "VLAN", "Role Truth", "Recommended Subnet", "Gateway", "Proposed Range", "Headroom", "Reason", "Allocator Explanation", "Allocator Proof"],
        rows: proposedRows.slice(0, 20).map((row: any) => [
          asString(row.siteName, "—"),
          String(row.vlanId ?? "—"),
          `${asString(row.role, "UNKNOWN")} / ${asString(row.roleSource, "unknown")} / ${asString(row.roleConfidence, "low")}`,
          asString(row.proposedSubnetCidr, row.recommendedPrefix ? `/${row.recommendedPrefix}` : "Pending"),
          asString(row.proposedGatewayIp, "Pending"),
          row.proposedNetworkAddress && row.proposedBroadcastAddress ? `${row.proposedNetworkAddress} → ${row.proposedBroadcastAddress}` : "Pending",
          String(row.proposedCapacityHeadroom ?? "—"),
          asString(row.reason, "Review before implementation"),
          asString(row.allocatorExplanation, "—"),
          row.allocatorParentCidr ? `${row.allocatorParentCidr}; used ${row.allocatorUsedRangeCount ?? "—"}; free ${row.allocatorFreeRangeCount ?? "—"}; largest ${row.allocatorLargestFreeRange ?? "—"}; util ${row.allocatorUtilizationPercent ?? "—"}%` : "—",
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

    if (reportTruth) {
      routingSection.tables.push({
        title: "Phase 38 Backend Report Truth Summary",
        headers: ["Overall", "Routing", "Security", "NAT", "Implementation", "Blocked Findings", "Review Findings"],
        rows: [[
          asString(reportTruth.overallReadinessLabel, asString(reportTruth.overallReadiness, "review")),
          asString(reportTruth.readiness?.routing, "review"),
          asString(reportTruth.readiness?.security, "review"),
          asString(reportTruth.readiness?.nat, "review"),
          asString(reportTruth.readiness?.implementation, "review"),
          String(Array.isArray(reportTruth.blockedFindings) ? reportTruth.blockedFindings.length : 0),
          String(Array.isArray(reportTruth.reviewFindings) ? reportTruth.reviewFindings.length : 0),
        ]],
      });

      if (Array.isArray(reportTruth.implementationReviewQueue) && reportTruth.implementationReviewQueue.length > 0) {
        routingSection.tables.push({
          title: "Phase 38 Backend Implementation Review Queue",
          headers: ["Step", "Category", "Readiness", "Risk", "Rollback"],
          rows: reportTruth.implementationReviewQueue.slice(0, 20).map((step: any) => [
            asString(step.title, "—"),
            asString(step.category, "review"),
            asString(step.readiness, "review"),
            asString(step.riskLevel, "medium"),
            asString(step.rollbackIntent, "Review rollback before change."),
          ]),
        });
      }

      if (Array.isArray(reportTruth.verificationCoverage) && reportTruth.verificationCoverage.length > 0) {
        routingSection.tables.push({
          title: "Phase 38 Backend Verification Coverage",
          headers: ["Check Type", "Total", "Blocked", "Review", "Ready"],
          rows: reportTruth.verificationCoverage.map((item: any) => [
            asString(item.checkType, "review"),
            String(item.totalCount ?? 0),
            String(item.blockedCount ?? 0),
            String(item.reviewCount ?? 0),
            String(item.readyCount ?? 0),
          ]),
        });
      }

      if (Array.isArray(reportTruth.rollbackActions) && reportTruth.rollbackActions.length > 0) {
        routingSection.tables.push({
          title: "Phase 38 Backend Rollback Truth",
          headers: ["Rollback", "Trigger", "Intent"],
          rows: reportTruth.rollbackActions.slice(0, 20).map((item: any) => [
            asString(item.name, "—"),
            asString(item.triggerCondition, "Review rollback trigger."),
            asString(item.rollbackIntent, "Review rollback intent."),
          ]),
        });
      }
    }

    if (diagramTruth) {
      routingSection.tables.push({
        title: "Phase 39 Backend Diagram Render Truth Summary",
        headers: ["Overall", "Modeled Topology", "Devices", "Interfaces", "Links", "Route Domains", "Security Zones"],
        rows: [[
          asString(diagramTruth.overallReadiness, "review"),
          diagramTruth.hasModeledTopology ? "Yes" : "No",
          String(diagramTruth.topologySummary?.deviceCount ?? 0),
          String(diagramTruth.topologySummary?.interfaceCount ?? 0),
          String(diagramTruth.topologySummary?.linkCount ?? 0),
          String(diagramTruth.topologySummary?.routeDomainCount ?? 0),
          String(diagramTruth.topologySummary?.securityZoneCount ?? 0),
        ]],
      });


      if (diagramTruth.renderModel && typeof diagramTruth.renderModel === "object") {
        routingSection.tables.push({
          title: "Phase 39 Backend Diagram Render Model",
          headers: ["Nodes", "Edges", "Groups", "Overlays", "Backend Authored", "Layout"],
          rows: [[
            String(diagramTruth.renderModel.summary?.nodeCount ?? 0),
            String(diagramTruth.renderModel.summary?.edgeCount ?? 0),
            String(diagramTruth.renderModel.summary?.groupCount ?? 0),
            String(diagramTruth.renderModel.summary?.overlayCount ?? 0),
            diagramTruth.renderModel.summary?.backendAuthored ? "Yes" : "No",
            asString(diagramTruth.renderModel.summary?.layoutMode, "backend-deterministic-grid"),
          ]],
        });
      }

      if (Array.isArray(diagramTruth.overlaySummaries) && diagramTruth.overlaySummaries.length > 0) {
        routingSection.tables.push({
          title: "Phase 39 Backend Diagram Overlay Truth",
          headers: ["Overlay", "Readiness", "Count", "Detail"],
          rows: diagramTruth.overlaySummaries.map((item: any) => [
            asString(item.label, asString(item.key, "overlay")),
            asString(item.readiness, "review"),
            String(item.count ?? 0),
            asString(item.detail, "Review overlay truth."),
          ]),
        });
      }

      if (Array.isArray(diagramTruth.hotspots) && diagramTruth.hotspots.length > 0) {
        routingSection.tables.push({
          title: "Phase 39 Backend Diagram Hotspots",
          headers: ["Scope", "Hotspot", "Readiness", "Detail"],
          rows: diagramTruth.hotspots.slice(0, 20).map((item: any) => [
            asString(item.scopeLabel, "diagram"),
            asString(item.title, "—"),
            asString(item.readiness, "review"),
            asString(item.detail, "Review diagram hotspot."),
          ]),
        });
      }
    }

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

  const phase40Section: any = {
    title: "13. Phase 40 Export Truth / DOCX-PDF Substance Hardening",
    paragraphs: [
      "This export section is backend-authored. It preserves the same reportTruth, diagramTruth, implementationPlan, verificationChecks, rollbackActions, blocking findings, review findings, and limitations that exist inside the backend design-core snapshot.",
      blockedDesign
        ? "This design is not implementation-ready. Export output must not soften a blocked backend implementation posture into fake confidence."
        : "The backend does not currently mark implementation readiness as blocked, but engineer review is still required before production change approval.",
      "The proof boundary below separates what SubnetOps modeled, what it inferred from saved planning inputs, what it proposed, what is not proven, and what still requires engineer review.",
    ],
    tables: [
      {
        title: "Phase 40 Backend Readiness Status",
        headers: ["Truth Source", "Overall", "Routing", "Security", "NAT", "Implementation", "Blocked Findings", "Review Findings"],
        rows: [[
          "backend design-core snapshot",
          asString(reportTruth?.overallReadinessLabel, overallReadiness),
          asString(reportTruth?.readiness?.routing, "review"),
          asString(reportTruth?.readiness?.security, "review"),
          asString(reportTruth?.readiness?.nat, "review"),
          implementationReadiness,
          String(backendBlockedFindings.length),
          String(backendReviewFindings.length),
        ]],
      },
      {
        title: "Phase 40 Blocking Findings",
        headers: ["Source", "Severity", "Finding", "Detail"],
        rows: compactRows(
          [
            ...backendBlockedFindings.map((finding: any) => [
              asString(finding.source, "backend"),
              asString(finding.severity, "ERROR"),
              asString(finding.title, "Blocking backend finding"),
              asString(finding.detail, "Resolve before implementation approval."),
            ]),
            ...implementationFindings.filter((finding: any) => finding.severity === "ERROR").map((finding: any) => [
              "implementation",
              asString(finding.severity, "ERROR"),
              asString(finding.title, "Implementation blocker"),
              asString(finding.detail, asString(finding.remediation, "Resolve before implementation approval.")),
            ]),
          ].slice(0, 30),
          [["backend", "INFO", "No blocking findings exported", "No backend blocking finding is currently present in reportTruth or implementation findings."]],
        ),
      },
      {
        title: "Phase 40 Review Findings",
        headers: ["Source", "Severity", "Finding", "Detail"],
        rows: compactRows(
          backendReviewFindings.slice(0, 30).map((finding: any) => [
            asString(finding.source, "backend"),
            asString(finding.severity, "WARNING"),
            asString(finding.title, "Backend review finding"),
            asString(finding.detail, "Engineer review required."),
          ]),
          [["backend", "INFO", "No review findings exported", "No backend review finding is currently present in reportTruth."]],
        ),
      },
      {
        title: "Phase 40 Implementation Review Queue",
        headers: ["Step", "Category", "Readiness", "Risk", "Blockers", "Required evidence", "Acceptance criteria", "Rollback intent"],
        rows: compactRows(
          implementationReviewQueue.slice(0, 30).map((step: any) => [
            asString(step.title, "—"),
            asString(step.category, "review"),
            asString(step.readiness, "review"),
            asString(step.riskLevel, "medium"),
            joinText(step.blockers, "No explicit blockers recorded"),
            joinText(step.requiredEvidence, "Evidence requirement not modeled"),
            joinText(step.acceptanceCriteria, "Acceptance criteria not modeled"),
            asString(step.rollbackIntent, "Rollback intent not modeled"),
          ]),
          [["No implementation review queue", "implementation", "review", "medium", "No step queue exported", "Evidence still requires engineer review", "Acceptance criteria still require engineer review", "Rollback must be reviewed before implementation"]],
        ),
      },
      {
        title: "Phase 40 Verification Matrix",
        headers: ["Check type", "Scope", "Source engine", "Readiness", "Expected result", "Required evidence", "Acceptance criteria", "Blocking steps", "Failure impact"],
        rows: compactRows(
          verificationChecks.slice(0, 40).map((check: any) => [
            asString(check.checkType, "review"),
            asString(check.verificationScope, "cross-cutting"),
            asString(check.sourceEngine, "implementation"),
            asString(check.readiness, "review"),
            asString(check.expectedResult, asString(check.name, "Expected result requires review")),
            joinText(check.requiredEvidence, "Evidence requirement not modeled"),
            joinText(check.acceptanceCriteria, "Acceptance criteria not modeled"),
            joinText(check.blockingStepIds, "No blocking steps recorded"),
            asString(check.failureImpact, "Failure impact requires engineer review"),
          ]),
          [["documentation", "cross-cutting", "implementation", "review", "No verification checks exported", "Engineer evidence required", "Engineer acceptance required", "—", "Missing verification weakens implementation confidence"]],
        ),
      },
      {
        title: "Phase 40 Rollback Actions",
        headers: ["Rollback action", "Trigger condition", "Related steps", "Rollback intent", "Notes"],
        rows: compactRows(
          rollbackActions.slice(0, 30).map((action: any) => [
            asString(action.name, "—"),
            asString(action.triggerCondition, "Review rollback trigger."),
            joinText(action.relatedStepIds, "No related steps recorded"),
            asString(action.rollbackIntent, "Rollback intent requires review."),
            joinText(action.notes, "Review before change window."),
          ]),
          [["No rollback action exported", "Rollback trigger not modeled", "—", "Engineer must define rollback before implementation", "Do not approve risky changes without rollback proof"]],
        ),
      },
      {
        title: "Phase 40 Diagram Truth and Render Model Summary",
        headers: ["Modeled devices", "Modeled interfaces", "Modeled links", "Route domains", "Security zones", "Render nodes", "Render edges", "Overlay readiness", "Hotspots", "Empty-state reason"],
        rows: [[
          String(diagramTruth?.topologySummary?.deviceCount ?? networkDevices.length),
          String(diagramTruth?.topologySummary?.interfaceCount ?? networkInterfaces.length),
          String(diagramTruth?.topologySummary?.linkCount ?? (Array.isArray(networkObjectModel?.links) ? networkObjectModel.links.length : 0)),
          String(diagramTruth?.topologySummary?.routeDomainCount ?? routeDomains.length),
          String(diagramTruth?.topologySummary?.securityZoneCount ?? securityZones.length),
          String(diagramTruth?.renderModel?.summary?.nodeCount ?? 0),
          String(diagramTruth?.renderModel?.summary?.edgeCount ?? 0),
          joinText(asArray(diagramTruth?.overlaySummaries).map((overlay: any) => `${asString(overlay.label, asString(overlay.key, "overlay"))}: ${asString(overlay.readiness, "review")}`), "No overlay readiness exported"),
          String(asArray(diagramTruth?.hotspots).length),
          asString(diagramTruth?.emptyStateReason, asString(diagramTruth?.renderModel?.emptyState?.reason, "Topology render model present or no empty-state reason recorded")),
        ]],
      },
      {
        title: "Phase 40 Diagram Render Model Nodes and Edges",
        headers: ["Type", "Label", "Readiness", "Layer / Relationship", "Notes"],
        rows: compactRows(
          [
            ...asArray(diagramTruth?.renderModel?.nodes).slice(0, 20).map((node: any) => [
              asString(node.objectType, "node"),
              asString(node.label, asString(node.id, "—")),
              asString(node.readiness, "review"),
              asString(node.layer, "diagram"),
              joinText(node.notes, asString(node.sourceEngine, "backend render node")),
            ]),
            ...asArray(diagramTruth?.renderModel?.edges).slice(0, 20).map((edge: any) => [
              "edge",
              asString(edge.label, asString(edge.id, "—")),
              asString(edge.readiness, "review"),
              asString(edge.relationship, "relationship"),
              joinText(edge.notes, joinText(edge.overlayKeys, "backend render edge")),
            ]),
          ].slice(0, 40),
          [["empty-state", "No backend render nodes or edges exported", "review", "backend-deterministic-grid", "Diagram render model requires modeled topology inputs"]],
        ),
      },
      {
        title: "Phase 40 Proof Boundary and Limitations",
        headers: ["Boundary", "Exported truth"],
        rows: [
          ["Modeled", `Backend object counts: ${networkDevices.length} devices, ${networkInterfaces.length} interfaces, ${Array.isArray(networkObjectModel?.links) ? networkObjectModel.links.length : 0} links, ${routeDomains.length} route domains, ${securityZones.length} security zones.`],
          ["Inferred", "Routing, security, NAT, implementation readiness, and diagram overlays are inferred from saved requirements, modeled objects, graph edges, and backend engine findings."],
          ["Proposed", `Addressing proposals: ${proposedRows.length}; transit rows: ${transitPlan.length}; loopback rows: ${loopbackPlan.length}; implementation steps: ${implementationSteps.length}.`],
          ["Not proven", "Live device state, cabling, vendor CLI syntax, production firewall rulebase, provider WAN behavior, and change-window operational success are not proven by this export."],
          ["Engineer review", "A qualified engineer must review blockers, review findings, verification evidence, rollback proof, and vendor-specific implementation details before production deployment."],
          ...reportTruthLimitations.slice(0, 12).map((limitation: any) => ["Limitation", joinText(limitation, "Review limitation")]),
        ],
      },
    ],
  };


  const phase42Section: any = {
    title: "14. Phase 42 Vendor-Neutral Implementation Templates",
    paragraphs: [
      "This export section is backend-authored from vendorNeutralImplementationTemplates. It converts the implementationPlan into human execution templates without generating vendor-specific commands.",
      "Phase 42 deliberately forbids Cisco, Palo Alto, Fortinet, Juniper, Aruba, Linux, cloud, or other platform command syntax. Vendor-specific command generation remains a later gated phase.",
      "Templates preserve readiness, risk, dependencies, verification evidence, rollback evidence, blocker reasons, blast radius, and proof boundaries from the backend design-core snapshot.",
    ],
    tables: [
      {
        title: "Phase 42 Template Summary",
        headers: ["Source", "Templates", "Groups", "Ready", "Review", "Blocked", "High Risk", "Verification Linked", "Rollback Linked", "Vendor Commands"],
        rows: [[
          asString(vendorNeutralTemplates?.summary?.source, "backend-implementation-plan"),
          String(vendorNeutralTemplates?.summary?.templateCount ?? 0),
          String(vendorNeutralTemplates?.summary?.groupCount ?? 0),
          String(vendorNeutralTemplates?.summary?.readyTemplateCount ?? 0),
          String(vendorNeutralTemplates?.summary?.reviewTemplateCount ?? 0),
          String(vendorNeutralTemplates?.summary?.blockedTemplateCount ?? 0),
          String(vendorNeutralTemplates?.summary?.highRiskTemplateCount ?? 0),
          String(vendorNeutralTemplates?.summary?.verificationLinkedTemplateCount ?? 0),
          String(vendorNeutralTemplates?.summary?.rollbackLinkedTemplateCount ?? 0),
          String(vendorNeutralTemplates?.summary?.vendorSpecificCommandCount ?? 0),
        ]],
      },
      {
        title: "Phase 42 Template Groups",
        headers: ["Group", "Readiness", "Templates", "Objective", "Exit Criteria"],
        rows: compactRows(
          asArray(vendorNeutralTemplates?.groups).slice(0, 12).map((group: any) => [
            asString(group.name, "—"),
            asString(group.readiness, "review"),
            String(asArray(group.templateIds).length),
            asString(group.objective, "Review group objective."),
            joinText(group.exitCriteria, "Exit criteria require review"),
          ]),
          [["No template groups", "review", "0", "Vendor-neutral template groups were not generated.", "Review implementation plan generation."]],
        ),
      },
      {
        title: "Phase 42 Vendor-Neutral Templates",
        headers: ["Template", "Category", "Readiness", "Risk", "Target", "Intent", "Pre-checks", "Neutral actions"],
        rows: compactRows(
          asArray(vendorNeutralTemplates?.templates).slice(0, 35).map((template: any) => [
            asString(template.title, "—"),
            asString(template.category, "review"),
            asString(template.readiness, "review"),
            asString(template.riskLevel, "medium"),
            `${asString(template.targetObjectType, "object")}${template.targetObjectId ? `:${template.targetObjectId}` : ""}`,
            asString(template.vendorNeutralIntent, "Review template intent."),
            joinText(template.preChecks, "Pre-checks require review"),
            joinText(template.neutralActions, "Neutral actions require review"),
          ]),
          [["No vendor-neutral templates", "implementation", "review", "medium", "—", "Templates were not generated.", "Review implementation plan.", "Do not generate vendor commands yet."]],
        ),
      },
      {
        title: "Phase 42 Evidence and Rollback Linkage",
        headers: ["Template", "Verification evidence", "Rollback evidence", "Blocker reasons", "Blast radius"],
        rows: compactRows(
          asArray(vendorNeutralTemplates?.templates).slice(0, 35).map((template: any) => [
            asString(template.title, "—"),
            joinText(template.verificationEvidence, "No verification evidence linked"),
            joinText(template.rollbackEvidence, "No rollback evidence linked"),
            joinText(template.blockerReasons, "No blockers recorded"),
            joinText(template.blastRadius, "Blast radius not modeled"),
          ]),
          [["No vendor-neutral templates", "No verification evidence linked", "No rollback evidence linked", "Review required", "Blast radius not modeled"]],
        ),
      },
      {
        title: "Phase 42 Template Variables",
        headers: ["Variable", "Required", "Source", "Example", "Notes"],
        rows: compactRows(
          asArray(vendorNeutralTemplates?.variables).map((variable: any) => [
            asString(variable.name, "—"),
            variable.required ? "yes" : "no",
            asString(variable.source, "backend design-core"),
            asString(variable.exampleValue, "—"),
            joinText(variable.notes, "Review variable before implementation"),
          ]),
          [["No variables", "yes", "backend design-core", "—", "Template variables were not generated."]],
        ),
      },
      {
        title: "Phase 42 Template Proof Boundary",
        headers: ["Boundary", "Truth"],
        rows: compactRows(
          asArray(vendorNeutralTemplates?.proofBoundary).map((boundary: any, index: number) => [
            `Boundary ${index + 1}`,
            joinText(boundary, "Review proof boundary"),
          ]),
          [["Not proven", "Live device state, platform syntax, production behavior, cabling, provider behavior, and actual change-window success are not proven by vendor-neutral templates."]],
        ),
      },
    ],
  };
  report.sections.push(phase40Section, phase42Section);

  return report;
}
