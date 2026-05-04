// V1_DISCOVERY_CURRENT_STATE_CONTRACT report wiring
// V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT: professional report exposes diagram mode contracts.
import type { ProfessionalReport } from "./export.types.js";
import { buildReportEvidenceDocument, findOverclaimRisks, reportCanClaimReady } from "../domain/reporting/index.js";
// V1_ENGINE1_CIDR_ADDRESSING_TRUTH
// V1_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW
// V1_DESIGN_CORE_ORCHESTRATOR_CONTRACT

export type ProfessionalReportMode = "professional" | "technical" | "full-proof";

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

function sanitizeProfessionalReportText(value: string) {
  return value
    .replace(/\bStage\s+\d+(?:\s*[–-]\s*\d+)?\s*/gi, "")
    .replace(/\bSTAGE_\d+_[A-Z0-9_]+\b/g, "release marker")
    .replace(/\bbackend-design-core\b/gi, "authoritative design model")
    .replace(/\bbackend design-core\b/gi, "authoritative design model")
    .replace(/\bdesign model design-core\b/gi, "authoritative design model")
    .replace(/\bbackend\b/gi, "design model")
    .replace(/\breportTruth\b/g, "report readiness evidence")
    .replace(/\bdiagramTruth\b/g, "diagram readiness evidence")
    .replace(/\bimplementationPlan\b/g, "implementation plan")
    .replace(/\bvendorNeutralImplementationTemplates\b/g, "implementation templates")
    .replace(/graph-node-[A-Za-z0-9_-]+/g, "modeled object")
    .replace(/device-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:-[A-Za-z0-9-]+)?/gi, "modeled device")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "object reference")
    .replace(/input hash [a-z0-9]+/gi, "current design snapshot recorded")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function isProfessionalInternalTableTitle(title: string) {
  return /(?:Design Graph|Authoritative Design Graph|Gateway and Routing Interfaces|DHCP Pools|Enterprise Address Allocator Readiness|Enterprise Allocator Findings|Enterprise Allocator Review Queue|Allocation Plan|Report Truth|Implementation Review Queue|Verification Coverage|Rollback Truth|Diagram Render|Diagram Overlay|Diagram Hotspots|Security Flow Requirements|Security Service Objects|Security Policy Findings|Implementation-Neutral|Implementation Stages|Implementation Steps|Verification Checks|Rollback Actions|Implementation Findings|Route Intent Table|NAT Intent|Vendor-Neutral|Template|Proof Boundary)/i.test(title);
}

function isProfessionalInternalSectionTitle(title: string) {
  return /(?:Export Truth|Vendor-Neutral Implementation Templates|Full Proof|Runtime Proof Dump|Audit Dump)/i.test(title);
}

function sanitizeProfessionalReportStringArray(values: string[] | undefined) {
  return Array.isArray(values) ? values.map((value) => sanitizeProfessionalReportText(String(value))) : values;
}

function sanitizeProfessionalReportRows(rows: string[][] | undefined) {
  return Array.isArray(rows)
    ? rows.map((row) => row.map((value) => sanitizeProfessionalReportText(String(value))))
    : rows;
}

function professionalizeReportForAudience(report: ProfessionalReport) {
  report.title = sanitizeProfessionalReportText(report.title);
  report.subtitle = sanitizeProfessionalReportText(report.subtitle);
  report.executiveSummary = sanitizeProfessionalReportStringArray(report.executiveSummary) ?? [];
  if (report.metadata) {
    for (const key of Object.keys(report.metadata) as Array<keyof typeof report.metadata>) {
      const value = report.metadata[key];
      if (typeof value === "string") report.metadata[key] = sanitizeProfessionalReportText(value) as any;
    }
  }

  const sanitizeSection = (section: any) => {
    section.title = sanitizeProfessionalReportText(String(section.title ?? ""));
    section.paragraphs = sanitizeProfessionalReportStringArray(section.paragraphs) ?? [];
    section.bullets = sanitizeProfessionalReportStringArray(section.bullets);
    if (Array.isArray(section.tables)) {
      section.tables = section.tables
        .map((table: any) => ({
          ...table,
          title: sanitizeProfessionalReportText(String(table.title ?? "")),
          headers: sanitizeProfessionalReportStringArray(table.headers) ?? [],
          rows: sanitizeProfessionalReportRows(table.rows) ?? [],
        }))
        .filter((table: any) => !isProfessionalInternalTableTitle(String(table.title ?? "")));
    }
  };

  report.sections = report.sections.filter((section: any) => !isProfessionalInternalSectionTitle(String(section.title ?? "")));
  report.sections.forEach(sanitizeSection);
  if (Array.isArray(report.appendices)) {
    report.appendices = report.appendices.filter((section: any) => !isProfessionalInternalSectionTitle(String(section.title ?? "")));
    report.appendices.forEach(sanitizeSection);
  }
  return report;
}

export function applyBackendDesignCoreToReport(report: ProfessionalReport, designCore: any, options?: { reportMode?: ProfessionalReportMode }) {
  const reportMode: ProfessionalReportMode = options?.reportMode ?? "professional";
  const includeTechnicalEvidence = reportMode !== "professional";
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
  const V1ImplementationTemplates = designCore.V1ImplementationTemplates && typeof designCore.V1ImplementationTemplates === "object" ? designCore.V1ImplementationTemplates : null;
  const V1ReportExportTruth = designCore.V1ReportExportTruth && typeof designCore.V1ReportExportTruth === "object" ? designCore.V1ReportExportTruth : null;
  const V1DiagramTruth = designCore.V1DiagramTruth && typeof designCore.V1DiagramTruth === "object" ? designCore.V1DiagramTruth : null;
  const V1PlatformBomFoundation = designCore.V1PlatformBomFoundation && typeof designCore.V1PlatformBomFoundation === "object" ? designCore.V1PlatformBomFoundation : null;
  const V1DiscoveryCurrentState = designCore.V1DiscoveryCurrentState && typeof designCore.V1DiscoveryCurrentState === "object" ? designCore.V1DiscoveryCurrentState : null;
  const V1AiDraftHelper = designCore.V1AiDraftHelper && typeof designCore.V1AiDraftHelper === "object" ? designCore.V1AiDraftHelper : null;
  const V1FinalProofPass = designCore.V1FinalProofPass && typeof designCore.V1FinalProofPass === "object" ? designCore.V1FinalProofPass : null;
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
  const V1RequirementsClosure = designCore.V1RequirementsClosure && typeof designCore.V1RequirementsClosure === "object" ? designCore.V1RequirementsClosure : null;
  const V1CidrAddressingTruth = designCore.V1CidrAddressingTruth && typeof designCore.V1CidrAddressingTruth === "object" ? designCore.V1CidrAddressingTruth : null;
  const V1EnterpriseIpamTruth = designCore.V1EnterpriseIpamTruth && typeof designCore.V1EnterpriseIpamTruth === "object" ? designCore.V1EnterpriseIpamTruth : null;
  const V1DesignCoreOrchestrator = designCore.V1DesignCoreOrchestrator && typeof designCore.V1DesignCoreOrchestrator === "object" ? designCore.V1DesignCoreOrchestrator : null;
  const V1StandardsRulebookControl = designCore.V1StandardsRulebookControl && typeof designCore.V1StandardsRulebookControl === "object" ? designCore.V1StandardsRulebookControl : null;
  const V1ValidationReadiness = designCore.V1ValidationReadiness && typeof designCore.V1ValidationReadiness === "object" ? designCore.V1ValidationReadiness : null;
  const V1NetworkObjectModel = designCore.V1NetworkObjectModel && typeof designCore.V1NetworkObjectModel === "object" ? designCore.V1NetworkObjectModel : null;
  const V1DesignGraph = designCore.V1DesignGraph && typeof designCore.V1DesignGraph === "object" ? designCore.V1DesignGraph : null;
  const V1SecurityPolicyFlow = designCore.V1SecurityPolicyFlow && typeof designCore.V1SecurityPolicyFlow === "object" ? designCore.V1SecurityPolicyFlow : null;
  const V1ImplementationPlanning = designCore.V1ImplementationPlanning && typeof designCore.V1ImplementationPlanning === "object" ? designCore.V1ImplementationPlanning : null;
  const V1RoutingSegmentation = designCore.V1RoutingSegmentation && typeof designCore.V1RoutingSegmentation === "object" ? designCore.V1RoutingSegmentation : null;
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
  const V1TruthBlocked =
    !materializedDesignEvidenceReady && (
      Boolean(diagramEmptyReason)
      || scenarioProofMissingAllEvidence
    );
  const reportEvidenceDocument = V1ReportExportTruth ? buildReportEvidenceDocument(V1ReportExportTruth as any) : null;
  const reportOverclaimRisks = reportEvidenceDocument ? findOverclaimRisks(reportEvidenceDocument) : ["Report/export readiness evidence is not available."];
  const reportExportNotReady = !reportEvidenceDocument || !reportCanClaimReady(reportEvidenceDocument);

  if (V1TruthBlocked || reportExportNotReady) {
    report.metadata = report.metadata ?? {
      organizationName: "To be confirmed",
      environment: "To be confirmed",
      reportVersion: "Version 1 truth-locked",
      revisionStatus: "Blocked - design evidence gaps present",
      documentOwner: "SubnetOps project owner",
      approvalStatus: "Not ready for approval",
      generatedFrom: "Backend design evidence truth lock",
    };
    report.metadata.reportVersion = "Version 1 truth-locked";
    report.metadata.revisionStatus = reportExportNotReady ? "Blocked - report/export evidence review required" : "Blocked - design evidence gaps present";
    report.metadata.approvalStatus = "Not ready for approval";
    report.executiveSummary.unshift(reportExportNotReady
      ? "Report/export readiness evidence is not ready. Do not treat the package as final until blocked or review-required sections are resolved."
      : "Requirement-output evidence is still incomplete. Do not treat the package as design-review ready until materialized sites, addressing rows, and diagram topology evidence agree.");
  }

  report.sections.push({
    title: "Report Export Readiness Gate",
    paragraphs: [
      reportExportNotReady
        ? "The export is not final-ready. Blocked or review-required sections must remain visible in PDF, DOCX, CSV, and the report page."
        : "The export readiness gate is clear based on current report/export evidence.",
      "This gate prevents the report from claiming readiness when routing, security, implementation, validation, diagram, or traceability evidence is missing or review-required.",
    ],
    tables: [
      {
        title: "Report Export Evidence",
        headers: ["Metric", "Status", "Evidence"],
        rows: [
          ["Overall readiness", asString(V1ReportExportTruth?.overallReadiness, "review"), `${V1ReportExportTruth?.readySectionCount ?? 0}/${V1ReportExportTruth?.requiredSectionCount ?? 0} required sections ready`],
          ["Blocked sections", String(V1ReportExportTruth?.blockedSectionCount ?? 0), joinText(asArray(V1ReportExportTruth?.sectionGates).filter((row: any) => row.readinessImpact === "BLOCKED").map((row: any) => row.title).slice(0, 6), "none")],
          ["Review sections", String(V1ReportExportTruth?.reviewSectionCount ?? 0), joinText(asArray(V1ReportExportTruth?.sectionGates).filter((row: any) => row.readinessImpact === "REVIEW_REQUIRED").map((row: any) => row.title).slice(0, 6), "none")],
          ["Overclaim risks", reportOverclaimRisks.length ? "review" : "ready", joinText(reportOverclaimRisks.slice(0, 6), "No overclaim risks recorded")],
        ],
      },
    ],
  });

  report.sections.push({
    title: "Requirement Output Verification",
    paragraphs: [
      V1TruthBlocked
        ? "Requirement-output evidence is still incomplete, so the export must stay blocked until materialized sites, addressing rows, and diagram topology evidence agree."
        : "Requirement-output evidence is present. Remaining blockers belong to implementation execution readiness, not to requirements materialization.",
      "The purpose of this section is to keep report, diagram, requirement proof, and authoritative design model posture aligned.",
    ],
    tables: [
      {
        title: "Requirement Output Truth Gates",
        headers: ["Gate", "Status", "Evidence"],
        rows: [
          ["Requirement-output evidence", V1TruthBlocked ? "blocked" : "ready", "Materialized sites " + siteSummaries.length + "; addressing rows " + requirementOutputAddressRowCount + "; diagram missing inputs " + diagramEmptyInputs.length],
          ["Implementation execution readiness", blockedDesign ? "blocked" : "review", `Overall readiness ${overallReadiness}; implementation readiness ${implementationReadiness}; blocked implementation ${blockedDesign ? "yes" : "no"}`],
          ["Requirement scenario proof", isBlocked(scenarioStatus) || (scenarioExpected > 0 && scenarioPassed === 0) ? "blocked" : "review/ready", `${scenarioPassed}/${scenarioExpected} scenario proof signal(s) passed; status ${scenarioStatus || "unavailable"}`],
          ["Diagram topology evidence", diagramEmptyReason ? "blocked" : "ready", diagramEmptyReason || "Backend diagram has modeled topology evidence."],
          ["Diagram required inputs", diagramEmptyInputs.length > 0 ? "blocked" : "ready", joinText(diagramEmptyInputs, "No missing diagram inputs recorded")],
        ],
      },
    ],
  });

  const V1DefaultDenyPolicies = policyRules.filter((rule: any) => asArray(rule?.notes).some((note: any) => String(note).includes("V1 explicit default-deny guardrail")));
  report.sections.push({
    title: "Design Trust and Policy Reconciliation",
    paragraphs: [
      "This section separates design-review readiness from implementation execution readiness so warnings, missing live inventory, and vendor-specific change gates do not collapse a materialized design into a false zero-trust state.",
      `Design review readiness: ${asString(designCore.summary?.designReviewReadiness, designCore.summary?.readyForBackendAuthority ? "review" : "blocked")}. Implementation execution readiness: ${asString(designCore.summary?.implementationExecutionReadiness, designCore.summary?.implementationPlanBlockingFindingCount ? "blocked" : "review")}.`,
      "The report now surfaces authoritative evidence counts used by the UI instead of relying on shallow zero-prone frontend fields.",
    ],
    tables: [
      {
        title: "Readiness Split",
        headers: ["Readiness Track", "Status", "Evidence"],
        rows: [
          ["Design review", asString(designCore.summary?.designReviewReadiness, designCore.summary?.readyForBackendAuthority ? "review" : "blocked"), `${designCore.summary?.siteCount ?? siteSummaries.length} site(s), ${designCore.summary?.vlanCount ?? requirementOutputAddressRowCount} addressing row(s), ${designCore.summary?.networkObjectCount ?? networkDevices.length + networkInterfaces.length} modeled object(s), ${designCore.summary?.issueCount ?? 0} design issue(s).`],
          ["Implementation execution", asString(designCore.summary?.implementationExecutionReadiness, designCore.summary?.implementationPlanBlockingFindingCount ? "blocked" : "review"), `${designCore.summary?.implementationPlanStepCount ?? implementationSteps.length} step(s), ${designCore.summary?.implementationPlanBlockingFindingCount ?? 0} blocking implementation finding(s), ${designCore.summary?.implementationPlanReviewStepCount ?? 0} review step(s).`],
        ],
      },
      {
        title: "Authoritative Evidence Metrics",
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
        title: "Explicit Default-Deny Guardrails",
        headers: ["Policy", "Source", "Destination", "Action"],
        rows: compactRows(
          V1DefaultDenyPolicies.map((rule: any) => [asString(rule.name, rule.id), asString(rule.sourceZoneId, "—"), asString(rule.destinationZoneId, "—"), asString(rule.action, "deny")]).slice(0, 30),
          [["No default-deny guardrail policies emitted", "—", "—", "review"]],
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


    const V1Rows = asArray(V1RequirementsClosure?.closureMatrix)
      .filter((item: any) => item?.active || item?.consumerCoverage?.captured)
      .slice(0, 35)
      .map((item: any) => [
        asString(item.label, asString(item.key, "Requirement")),
        asString(item.lifecycleStatus, "review"),
        asString(item.readinessImpact, "review"),
        joinText(asArray(item.actualAffectedEngines).slice(0, 5), "—"),
        joinText(asArray(item.missingConsumers).slice(0, 5), "—"),
      ]);

    const V1ScenarioRows = asArray(V1RequirementsClosure?.goldenScenarioClosures)
      .filter((item: any) => item?.relevant)
      .slice(0, 12)
      .map((item: any) => [
        asString(item.label, asString(item.id, "Scenario")),
        asString(item.lifecycleStatus, "review"),
        joinText(asArray(item.requiredRequirementKeys).slice(0, 8), "—"),
        joinText([...asArray(item.blockingRequirementKeys), ...asArray(item.reviewRequirementKeys)].slice(0, 8), "—"),
      ]);

    report.sections.push({
      title: "Requirement Traceability and Scenario Proof",
      paragraphs: [
        `Requirement impact closure status: ${asString(requirementsImpactClosure?.completionStatus, "unavailable")} • captured fields: ${requirementsImpactClosure?.capturedFieldCount ?? 0}/${requirementsImpactClosure?.totalFieldCount ?? 0} • handled/inventoried fields: ${requirementsImpactClosure?.handledFieldCount ?? requirementsImpactClosure?.totalFieldCount ?? 0}/${requirementsImpactClosure?.totalFieldCount ?? 0} • explicitly unused/not captured: ${requirementsImpactClosure?.explicitlyUnusedFieldCount ?? requirementsImpactClosure?.notCapturedFieldCount ?? 0}.`,
        `Scenario proof: ${asString(requirementsScenarioProof?.scenarioName, "unavailable")} • status: ${asString(requirementsScenarioProof?.status, "unavailable")} • passed signals: ${requirementsScenarioProof?.passedSignalCount ?? 0}/${requirementsScenarioProof?.expectedSignalCount ?? 0}.`,
        `V1 closure: ${V1RequirementsClosure?.fullPropagatedCount ?? 0} fully propagated, ${V1RequirementsClosure?.partialPropagatedCount ?? 0} partially propagated, ${V1RequirementsClosure?.reviewRequiredCount ?? 0} review-required, ${V1RequirementsClosure?.blockedCount ?? 0} blocked, ${V1RequirementsClosure?.missingConsumerCount ?? 0} missing consumer link(s).`,
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
        {
          title: "V1 Requirements Closure Matrix",
          headers: ["Requirement", "Lifecycle", "Readiness", "Actual Consumers", "Missing Consumers"],
          rows: compactRows(V1Rows, [["No V1 closure rows", "—", "—", "—", "—"]]),
        },
        {
          title: "V1 Golden Scenario Closure",
          headers: ["Scenario", "Status", "Required Keys", "Blocking / Review Keys"],
          rows: compactRows(V1ScenarioRows, [["No selected V1 scenario rows", "not-applicable", "—", "—"]]),
        },
      ],
    });
  }


  if (V1ReportExportTruth) {
    report.sections.push({
      title: "Report Requirement Traceability Matrix",
      paragraphs: [
        "This matrix is the V1 deliverable gate. It prevents the exported report from claiming design consequences that cannot be traced back to requirements, backend engines, frontend locations, report sections, diagram impact, and readiness status.",
        `Report/export readiness: ${asString(V1ReportExportTruth.overallReadiness, "review")} • ${V1ReportExportTruth.traceabilityRowCount ?? 0} traceability row(s) • ${V1ReportExportTruth.missingTraceabilityConsumerCount ?? 0} missing consumer link(s).`,
      ],
      tables: [
        {
          title: "Requirement Traceability Matrix",
          headers: ["Requirement", "Design Consequence", "Engines Affected", "Frontend Location", "Report Section", "Diagram Impact", "Readiness"],
          rows: compactRows(asArray(V1ReportExportTruth.traceabilityMatrix).slice(0, 40).map((row: any) => [
            asString(row.requirementLabel, asString(row.requirementKey, "Requirement")),
            asString(row.designConsequence, "Captured but not currently design-driving"),
            joinText(asArray(row.enginesAffected).slice(0, 5), "none"),
            asString(row.frontendLocation, "ProjectReportPage"),
            asString(row.reportSection, "Requirement Traceability Matrix"),
            asString(row.diagramImpact, "No visual impact or not applicable"),
            asString(row.readinessStatus, "REVIEW_REQUIRED"),
          ]), [["No traceability rows", "No requirement-output lineage is exportable", "—", "ProjectRequirementsPage", "Requirement Traceability Matrix", "No diagram impact proven", "REVIEW_REQUIRED"]]),
        },
        {
          title: "Report Truth Labels",
          headers: ["Truth Label", "Count", "Report Usage", "Readiness", "Evidence"],
          rows: compactRows(asArray(V1ReportExportTruth.truthLabelRows).map((row: any) => [
            asString(row.truthLabel, "REVIEW_REQUIRED"),
            String(row.count ?? 0),
            asString(row.reportUsage, "Review required"),
            asString(row.readinessImpact, "REVIEW_REQUIRED"),
            joinText(asArray(row.evidence).slice(0, 3), "—"),
          ]), [["REVIEW_REQUIRED", "0", "No truth labels emitted", "REVIEW_REQUIRED", "Add backend truth labels before final export"]]),
        },
      ],
    });
  }

  if (addressingSection) {
    addressingSection.tables = addressingSection.tables ?? [];
    addressingSection.paragraphs = [
      ...addressingSection.paragraphs,
      `Authoritative design snapshot: ${asString(authority?.mode, "authoritative")} • generated: ${generatedAt} • engineer review required.`,
    ];

    if (includeTechnicalEvidence && V1CidrAddressingTruth) {
      const V1RequirementRows = asArray(V1CidrAddressingTruth?.requirementAddressingMatrix)
        .filter((item: any) => item?.active)
        .slice(0, 24)
        .map((item: any) => [
          asString(item.requirementKey, "requirement"),
          asString(item.readinessImpact, "review"),
          joinText(asArray(item.affectedRoles).slice(0, 6), "—"),
          joinText(asArray(item.materializedAddressingEvidence).slice(0, 2), joinText(asArray(item.missingAddressingEvidence).slice(0, 2), "—")),
        ]);

      const V1AddressRows = asArray(V1CidrAddressingTruth?.addressingTruthRows)
        .slice(0, 30)
        .map((row: any) => [
          `${asString(row.siteName, "Site")} VLAN ${row.vlanId ?? "—"}`,
          asString(row.canonicalSubnetCidr, asString(row.sourceSubnetCidr, "—")),
          `${asString(row.capacityState, "unknown")} /${row.recommendedPrefix ?? "—"}`,
          `${asString(row.gatewayState, "review")} / site-block ${String(row.inSiteBlock ?? "unknown")}`,
          joinText(asArray(row.blockers).slice(0, 4), "none"),
        ]);

      addressingSection.tables.push({
        title: "V1 CIDR Addressing Truth",
        headers: ["Gate", "Status", "Evidence"],
        rows: [
          ["CIDR edge cases", `${V1CidrAddressingTruth?.edgeCaseProofs?.length ?? 0} proof rows`, "Canonicalization, invalid CIDR rejection, /0-/32 behavior, overlap detection, and role-aware gateway safety."],
          ["Address rows", `${V1CidrAddressingTruth?.validSubnetCount ?? 0} valid / ${V1CidrAddressingTruth?.invalidSubnetCount ?? 0} invalid`, `${V1CidrAddressingTruth?.undersizedSubnetCount ?? 0} undersized; ${V1CidrAddressingTruth?.gatewayIssueCount ?? 0} gateway issue(s).`],
          ["Requirement addressing", `${V1CidrAddressingTruth?.requirementDrivenAddressingCount ?? 0} driven / ${V1CidrAddressingTruth?.requirementAddressingGapCount ?? 0} gap(s)`, "Requirement-driven addressing evidence is proven from backend addressing rows, not frontend-only calculations."],
        ],
      });
      addressingSection.tables.push({
        title: "V1 Requirement Addressing Matrix",
        headers: ["Requirement", "Readiness", "Affected Roles", "Evidence / Missing Proof"],
        rows: compactRows(V1RequirementRows, [["No active V1 addressing requirement rows", "not-applicable", "—", "—"]]),
      });
      addressingSection.tables.push({
        title: "V1 Addressing Row Truth",
        headers: ["VLAN", "CIDR", "Capacity", "Gateway / Site Block", "Blockers"],
        rows: compactRows(V1AddressRows, [["No V1 addressing rows", "—", "—", "—", "—"]]),
      });
    }

    if (includeTechnicalEvidence && V1EnterpriseIpamTruth) {
      const V1ReconciliationRows = asArray(V1EnterpriseIpamTruth?.reconciliationRows)
        .slice(0, 30)
        .map((row: any) => [
          `${asString(row.siteName, "Site")} VLAN ${row.vlanId ?? "—"}`,
          asString(row.engine1PlannedCidr, "—"),
          asString(row.engine2AllocationCidr, "proposal-only"),
          asString(row.reconciliationState, "review"),
          joinText([...asArray(row.blockers), ...asArray(row.reviewReasons)].slice(0, 3), joinText(asArray(row.evidence).slice(0, 2), "—")),
        ]);

      const V1RequirementRows = asArray(V1EnterpriseIpamTruth?.requirementIpamMatrix)
        .filter((item: any) => item?.active)
        .slice(0, 24)
        .map((item: any) => [
          asString(item.requirementKey, "requirement"),
          asString(item.readinessImpact, "review"),
          `${item.approvedAllocationCount ?? 0} approved / ${item.durableCandidateCount ?? 0} candidate / ${item.engine1ProposalOnlyCount ?? 0} proposal-only`,
          joinText(asArray(item.materializedIpamEvidence).slice(0, 2), joinText(asArray(item.missingIpamEvidence).slice(0, 2), "—")),
        ]);

      addressingSection.tables.push({
        title: "V1 Enterprise IPAM Durable Authority",
        headers: ["Gate", "Status", "Evidence"],
        rows: [
          ["Addressing/IPAM relationship", asString(V1EnterpriseIpamTruth.overallReadiness, "review"), "Addressing plans are reconciled against durable IPAM authority so proposal-only, conflict, and approval states stay visible."],
          ["Durable objects", `${V1EnterpriseIpamTruth.durablePoolCount ?? 0} pools / ${V1EnterpriseIpamTruth.durableAllocationCount ?? 0} allocations`, `${V1EnterpriseIpamTruth.dhcpScopeCount ?? 0} DHCP scopes; ${V1EnterpriseIpamTruth.reservationCount ?? 0} reservations; ${V1EnterpriseIpamTruth.brownfieldNetworkCount ?? 0} brownfield networks.`],
          ["Review gates", `${V1EnterpriseIpamTruth.conflictBlockerCount ?? 0} blockers / ${V1EnterpriseIpamTruth.reviewRequiredCount ?? 0} review`, `${V1EnterpriseIpamTruth.engine1ProposalOnlyCount ?? 0} proposal-only addressing row(s); ${V1EnterpriseIpamTruth.staleAllocationCount ?? 0} stale allocation(s).`],
        ],
      });
      addressingSection.tables.push({
        title: "V1 Addressing / IPAM Reconciliation",
        headers: ["VLAN", "Planned CIDR", "Durable IPAM CIDR", "State", "Proof / Review"],
        rows: compactRows(V1ReconciliationRows, [["No V1 reconciliation rows", "—", "—", "—", "—"]]),
      });
      addressingSection.tables.push({
        title: "V1 Requirement-to-IPAM Matrix",
        headers: ["Requirement", "Readiness", "Approved / Candidate / Proposal-only", "Evidence / Missing Proof"],
        rows: compactRows(V1RequirementRows, [["No active V1 IPAM requirement rows", "not-applicable", "—", "—"]]),
      });
    }



    if (includeTechnicalEvidence && V1DesignCoreOrchestrator) {
      const V1SectionRows = asArray(V1DesignCoreOrchestrator?.sectionRows)
        .slice(0, 30)
        .map((row: any) => [
          asString(row.label, "Section"),
          asString(row.ownerEngine, "backend"),
          `${asString(row.readiness, "review")} | ${row.blockerCount ?? 0} blocker / ${row.reviewCount ?? 0} review`,
          joinText(asArray(row.downstreamConsumers).slice(0, 4), "—"),
          joinText(asArray(row.proofGates).slice(0, 3), "—"),
        ]);

      const V1DependencyRows = asArray(V1DesignCoreOrchestrator?.dependencyEdges)
        .slice(0, 24)
        .map((edge: any) => [
          asString(edge.relationship, "dependency"),
          `${asString(edge.sourceSectionKey, "source")} -> ${asString(edge.targetSectionKey, "target")}`,
          joinText(asArray(edge.evidence).slice(0, 2), "—"),
        ]);

      const V1FindingRows = asArray(V1DesignCoreOrchestrator?.boundaryFindings)
        .slice(0, 24)
        .map((finding: any) => [
          asString(finding.code, "finding"),
          asString(finding.severity, "INFO"),
          asString(finding.readinessImpact, "REVIEW_REQUIRED"),
          asString(finding.affectedSnapshotPath, "snapshot"),
          asString(finding.detail, "—"),
        ]);

      report.sections.push({
        title: "V1 Design-Core Orchestrator Contract",
        paragraphs: ["Design-core is the backend coordinator: it exposes named snapshot sections and dependency edges so frontend, report, and diagram consumers do not invent engineering truth."],
        tables: [
          {
            title: "V1 Orchestrator Summary",
            headers: ["Gate", "Status", "Evidence"],
            rows: [
              ["Contract", asString(V1DesignCoreOrchestrator.contractVersion, "missing"), asString(V1DesignCoreOrchestrator.orchestratorRole, "coordinator")],
              ["Snapshot sections", `${V1DesignCoreOrchestrator.presentSnapshotSectionCount ?? 0}/${V1DesignCoreOrchestrator.requiredSnapshotSectionCount ?? 0} present`, `${V1DesignCoreOrchestrator.missingSnapshotSectionCount ?? 0} missing; ${V1DesignCoreOrchestrator.frontendIndependentTruthRiskCount ?? 0} frontend truth risks.`],
              ["Overall readiness", asString(V1DesignCoreOrchestrator.overallReadiness, "review"), `${V1DesignCoreOrchestrator.boundaryFindings?.length ?? 0} boundary finding(s); ${V1DesignCoreOrchestrator.requirementContextGapCount ?? 0} requirement-context gap(s).`],
            ],
          },
          {
            title: "V1 Snapshot Boundary Sections",
            headers: ["Section", "Owner", "Readiness", "Consumers", "Proof gates"],
            rows: compactRows(V1SectionRows, [["No V1 section rows", "—", "—", "—", "—"]]),
          },
          {
            title: "V1 Orchestrator Dependency Edges",
            headers: ["Dependency", "Path", "Evidence"],
            rows: compactRows(V1DependencyRows, [["No V1 dependency edges", "—", "—"]]),
          },
          {
            title: "V1 Boundary Findings",
            headers: ["Finding", "Severity", "Readiness", "Snapshot Path", "Detail"],
            rows: compactRows(V1FindingRows, [["No V1 boundary findings", "INFO", "READY", "—", "—"]]),
          },
        ],
      });
    }



    if (includeTechnicalEvidence && V1StandardsRulebookControl) {
      const V1RuleRows = asArray(V1StandardsRulebookControl?.ruleRows)
        .slice(0, 30)
        .map((row: any) => [
          asString(row.ruleId, "rule"),
          asString(row.enforcementState, "review"),
          asString(row.severity, "WARNING"),
          joinText(asArray(row.requirementRelationships).slice(0, 5), "—"),
          asString(row.remediationGuidance, "—"),
        ]);

      const V1RequirementRows = asArray(V1StandardsRulebookControl?.requirementActivations)
        .slice(0, 24)
        .map((item: any) => [
          asString(item.requirementKey, "requirement"),
          asString(item.lifecycleStatus, "captured"),
          asString(item.readinessImpact, "review"),
          joinText(asArray(item.activatedRuleIds).slice(0, 5), "—"),
          joinText(asArray(item.evidence).slice(0, 2), "—"),
        ]);

      const V1FindingRows = asArray(V1StandardsRulebookControl?.findings)
        .slice(0, 24)
        .map((finding: any) => [
          asString(finding.ruleId, "rule"),
          asString(finding.severity, "WARNING"),
          asString(finding.affectedEngine, "standards"),
          asString(finding.title, "finding"),
          asString(finding.remediationGuidance, "—"),
        ]);

      report.sections.push({
        title: "V1 Standards Alignment / Rulebook Contract",
        paragraphs: ["Standards are evaluated as active rules with applicability, severity, affected engines/objects, requirement relationships, remediation guidance, and exception policy. They are not decorative credibility text."],
        tables: [
          {
            title: "V1 Rulebook Summary",
            headers: ["Gate", "Status", "Evidence"],
            rows: [
              ["Contract", asString(V1StandardsRulebookControl.contractVersion, "missing"), asString(V1StandardsRulebookControl.rulebookRole, "active rulebook")],
              ["Overall readiness", asString(V1StandardsRulebookControl.overallReadiness, "review"), `${V1StandardsRulebookControl.passRuleCount ?? 0} pass; ${V1StandardsRulebookControl.blockingRuleCount ?? 0} block; ${V1StandardsRulebookControl.reviewRuleCount ?? 0} review; ${V1StandardsRulebookControl.warningRuleCount ?? 0} warning.`],
              ["Requirement activation", `${V1StandardsRulebookControl.requirementActivatedRuleCount ?? 0} rule(s)`, `${V1StandardsRulebookControl.exceptionRequiredRuleCount ?? 0} exception/review item(s); ${V1StandardsRulebookControl.findings?.length ?? 0} finding(s).`],
            ],
          },
          {
            title: "V1 Active Standards Rules",
            headers: ["Rule", "State", "Severity", "Requirement relationship", "Remediation"],
            rows: compactRows(V1RuleRows, [["No V1 rule rows", "—", "—", "—", "—"]]),
          },
          {
            title: "V1 Requirement-to-Standards Activation",
            headers: ["Requirement", "Lifecycle", "Readiness", "Activated rules", "Evidence"],
            rows: compactRows(V1RequirementRows, [["No V1 requirement activation rows", "—", "not-applicable", "—", "—"]]),
          },
          {
            title: "V1 Standards Findings",
            headers: ["Rule", "Severity", "Affected engine", "Finding", "Remediation"],
            rows: compactRows(V1FindingRows, [["No V1 standards findings", "INFO", "—", "—", "—"]]),
          },
        ],
      });
    }


    if (includeTechnicalEvidence && V1ValidationReadiness) {
      const V1CoverageRows = asArray(V1ValidationReadiness?.coverageRows)
        .slice(0, 24)
        .map((row: any) => [
          asString(row.domain, "domain"),
          asString(row.readiness, "review"),
          `${row.blockerCount ?? 0} block / ${row.reviewRequiredCount ?? 0} review / ${row.warningCount ?? 0} warning`,
          asString(row.sourceSnapshotPath, "snapshot"),
          joinText(asArray(row.evidence).slice(0, 3), "—"),
        ]);

      const V1RequirementRows = asArray(V1ValidationReadiness?.requirementGateRows)
        .slice(0, 30)
        .map((row: any) => [
          asString(row.requirementKey, "requirement"),
          asString(row.lifecycleStatus, "captured"),
          asString(row.readinessImpact, "review"),
          joinText(asArray(row.missingConsumers).slice(0, 5), "none"),
          joinText(asArray(row.validationRuleCodes).slice(0, 5), "none"),
        ]);

      const V1FindingRows = asArray(V1ValidationReadiness?.findings)
        .filter((finding: any) => asString(finding.category, "INFO") !== "PASSED")
        .slice(0, 30)
        .map((finding: any) => [
          asString(finding.category, "INFO"),
          asString(finding.ruleCode, "rule"),
          asString(finding.sourceEngine, "engine"),
          asString(finding.title, "finding"),
          asString(finding.remediation, "—"),
        ]);

      report.sections.push({
        title: "V1 Validation / Readiness Authority",
        paragraphs: ["Validation is the strict readiness authority across requirements, addressing, durable IPAM, standards, routing, security, implementation, report truth, and diagram truth. It must block or review-gate unresolved upstream truth instead of letting UI, reports, or diagrams overclaim readiness."],
        tables: [
          {
            title: "V1 Validation Summary",
            headers: ["Gate", "Status", "Evidence"],
            rows: [
              ["Contract", asString(V1ValidationReadiness.contractVersion, "missing"), asString(V1ValidationReadiness.validationRole, "strict validation authority")],
              ["Overall readiness", asString(V1ValidationReadiness.overallReadiness, "review"), `${V1ValidationReadiness.blockingFindingCount ?? 0} block; ${V1ValidationReadiness.reviewRequiredFindingCount ?? 0} review; ${V1ValidationReadiness.warningFindingCount ?? 0} warning.`],
              ["Implementation gate", V1ValidationReadiness.validationGateAllowsImplementation ? "allowed" : "blocked/review-gated", `${V1ValidationReadiness.requirementGateCount ?? 0} requirement gate row(s); ${V1ValidationReadiness.findingCount ?? 0} validation finding(s).`],
            ],
          },
          {
            title: "V1 Coverage Domains",
            headers: ["Domain", "Readiness", "Counts", "Snapshot Path", "Evidence"],
            rows: compactRows(V1CoverageRows, [["No V1 coverage rows", "—", "—", "—", "—"]]),
          },
          {
            title: "V1 Requirement Readiness Gates",
            headers: ["Requirement", "Lifecycle", "Readiness", "Missing consumers", "Validation rules"],
            rows: compactRows(V1RequirementRows, [["No V1 requirement gates", "—", "—", "—", "—"]]),
          },
          {
            title: "V1 Validation Findings",
            headers: ["Category", "Rule", "Source engine", "Finding", "Remediation"],
            rows: compactRows(V1FindingRows, [["PASSED", "VALIDATION_PASSED_STRICT_READINESS_GATE", "Validation/readiness", "No V1 findings", "Continue engineer review."]]),
          },
        ],
      });
    }
    if (includeTechnicalEvidence && V1NetworkObjectModel) {
      report.sections.push({ title: "V1 Network Object Model Truth", paragraphs: ["The network object model is truth-labelled so devices, interfaces, links, zones, policies, NAT intent, DHCP pools, and reservations cannot masquerade as approved topology without source/readiness evidence."], tables: [{ title: "V1 Object Model Summary", headers: ["Gate", "Status", "Evidence"], rows: [["Contract", asString(V1NetworkObjectModel.contract, "missing"), asString(V1NetworkObjectModel.role, "object-model truth")], ["Overall readiness", asString(V1NetworkObjectModel.overallReadiness, "review"), `${V1NetworkObjectModel.objectCount ?? 0} object(s); ${V1NetworkObjectModel.metadataGapObjectCount ?? 0} metadata gap(s); ${V1NetworkObjectModel.requirementLineageGapCount ?? 0} requirement lineage gap(s).`]] }, { title: "V1 Object Lineage Rows", headers: ["Object", "Type", "Truth", "Readiness", "Requirements"], rows: compactRows(asArray(V1NetworkObjectModel.objectLineage).slice(0, 36).map((row: any) => [asString(row.displayName), asString(row.objectType), asString(row.truthState), asString(row.implementationReadiness), joinText(asArray(row.sourceRequirementIds).slice(0, 4), "none")]), [["No V1 object lineage rows", "—", "—", "—", "—"]]) }, { title: "V1 Requirement-to-Object Lineage", headers: ["Requirement", "Lifecycle", "Readiness", "Actual", "Missing"], rows: compactRows(asArray(V1NetworkObjectModel.requirementObjectLineage).slice(0, 30).map((row: any) => [asString(row.sourceKey), asString(row.lifecycleStatus), asString(row.readinessImpact), joinText(asArray(row.actualObjectTypes), "none"), joinText(asArray(row.missingObjectTypes), "none")]), [["No V1 requirement lineage rows", "—", "—", "—", "—"]]) }, { title: "V1 Object Findings", headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"], rows: compactRows(asArray(V1NetworkObjectModel.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [asString(finding.severity), asString(finding.code), asString(finding.readinessImpact), asString(finding.title), asString(finding.remediation)]), [["PASSED", "NETWORK_OBJECT_MODEL_TRUTH_LABELS_COMPLETE", "READY", "No V1 findings", "Continue engineer review."]]) }] });
    }

    if (includeTechnicalEvidence && V1DesignGraph) {
      report.sections.push({ title: "V1 Design Graph Dependency Integrity", paragraphs: ["The design graph is the dependency integrity layer. It proves requirement → object → graph relationship → validation/frontend/report/diagram consumer paths, and blocks diagram-only or orphaned topology authority."], tables: [{ title: "V1 Graph Summary", headers: ["Gate", "Status", "Evidence"], rows: [["Contract", asString(V1DesignGraph.contract, "missing"), asString(V1DesignGraph.role, "dependency graph")], ["Overall readiness", asString(V1DesignGraph.overallReadiness, "review"), `${V1DesignGraph.graphNodeCount ?? 0} node(s); ${V1DesignGraph.graphEdgeCount ?? 0} edge(s); ${V1DesignGraph.objectCoverageGapCount ?? 0} object coverage gap(s).`], ["Requirement paths", `${V1DesignGraph.requirementPathReadyCount ?? 0} ready`, `${V1DesignGraph.requirementPathReviewCount ?? 0} review; ${V1DesignGraph.requirementPathBlockedCount ?? 0} blocked.`]] }, { title: "V1 Requirement Dependency Paths", headers: ["Requirement", "Lifecycle", "Readiness", "Graph nodes", "Missing"], rows: compactRows(asArray(V1DesignGraph.requirementDependencyPaths).slice(0, 30).map((row: any) => [asString(row.sourceKey), asString(row.lifecycleStatus), asString(row.readinessImpact), joinText(asArray(row.actualGraphNodeIds).slice(0, 5), "none"), joinText([...asArray(row.missingGraphNodeIds), ...asArray(row.missingConsumerSurfaces)], "none")]), [["No V1 requirement paths", "—", "—", "—", "—"]]) }, { title: "V1 Object Graph Coverage", headers: ["Object", "Type", "State", "Relationships", "Consumers"], rows: compactRows(asArray(V1DesignGraph.objectCoverage).slice(0, 36).map((row: any) => [asString(row.displayName), asString(row.objectType), asString(row.dependencyState), joinText(asArray(row.relationshipTypes).slice(0, 5), "none"), joinText(asArray(row.consumerSurfaces).slice(0, 5), "none")]), [["No V1 object coverage rows", "—", "—", "—", "—"]]) }, { title: "V1 Graph Findings", headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"], rows: compactRows(asArray(V1DesignGraph.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [asString(finding.severity), asString(finding.code), asString(finding.readinessImpact), asString(finding.title), asString(finding.remediation)]), [["PASSED", "V1_DESIGN_GRAPH_DEPENDENCIES_COMPLETE", "READY", "No V1 findings", "Continue engineer review."]]) }] });
    }

    if (includeTechnicalEvidence && V1RoutingSegmentation) {
      report.sections.push({ title: "V1 Routing Segmentation Protocol-Aware Planning", paragraphs: ["V1 makes routing honest: connected/default/static/summary route rows are planning evidence, while OSPF, BGP, ECMP, redistribution, cloud route tables, route leaking, and asymmetric routing are explicit review or simulation-unavailable controls unless authoritative inputs exist. It is not a packet simulator."], tables: [{ title: "V1 Routing Summary", headers: ["Gate", "Status", "Evidence"], rows: [["Contract", asString(V1RoutingSegmentation.contract, "missing"), asString(V1RoutingSegmentation.role, "routing review control")], ["Overall readiness", asString(V1RoutingSegmentation.overallReadiness, "review"), `${V1RoutingSegmentation.protocolIntentCount ?? 0} protocol row(s); ${V1RoutingSegmentation.simulationUnavailableCount ?? 0} simulation-unavailable; ${V1RoutingSegmentation.activeRequirementRoutingGapCount ?? 0} active requirement gap(s).`], ["Protocol review", `${V1RoutingSegmentation.ospfReviewCount ?? 0} OSPF; ${V1RoutingSegmentation.bgpReviewCount ?? 0} BGP; ${V1RoutingSegmentation.ecmpReviewCount ?? 0} ECMP`, `${V1RoutingSegmentation.cloudRouteTableReviewCount ?? 0} cloud route-table review(s); ${V1RoutingSegmentation.routeLeakingReviewCount ?? 0} route-leaking review(s).`]] }, { title: "V1 Requirement Routing Matrix", headers: ["Requirement", "Active", "Readiness", "Actual", "Missing"], rows: compactRows(asArray(V1RoutingSegmentation.requirementRoutingMatrix).slice(0, 30).map((row: any) => [asString(row.requirementLabel), String(Boolean(row.active)), asString(row.readinessImpact), joinText(asArray(row.actualProtocolIntentIds).slice(0, 5), "none"), joinText(asArray(row.missingProtocolCategories), "none")]), [["No V1 requirement rows", "—", "—", "—", "—"]]) }, { title: "V1 Protocol Intent / Review Rows", headers: ["Name", "Category", "State", "Readiness", "Review reason"], rows: compactRows(asArray(V1RoutingSegmentation.protocolIntents).slice(0, 36).map((row: any) => [asString(row.name), asString(row.category), asString(row.controlState), asString(row.readinessImpact), asString(row.reviewReason, "none")]), [["No V1 protocol rows", "—", "—", "—", "—"]]) }, { title: "V1 Routing Findings", headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"], rows: compactRows(asArray(V1RoutingSegmentation.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [asString(finding.severity), asString(finding.code), asString(finding.readinessImpact), asString(finding.title), asString(finding.remediation)]), [["PASSED", "V1_ROUTING_SEGMENTATION_REVIEW_COMPLETE", "READY", "No V1 findings", "Continue engineer review."]]) }] });
    }

    if (includeTechnicalEvidence && V1SecurityPolicyFlow) {
      report.sections.push({ title: "V1 Security Policy Flow", paragraphs: ["V1 makes security policy review strict without pretending to be vendor firewall configuration. It surfaces zone-to-zone policy posture, business-service flow consequences, NAT review, logging review, broad permit review, shadowing review, and requirement-security propagation evidence from backend design-core truth."], tables: [{ title: "V1 Security Summary", headers: ["Gate", "Status", "Evidence"], rows: [["Contract", asString(V1SecurityPolicyFlow.contract, "missing"), asString(V1SecurityPolicyFlow.role, "security policy flow control")], ["Overall readiness", asString(V1SecurityPolicyFlow.overallReadiness, "review"), `${V1SecurityPolicyFlow.flowConsequenceCount ?? 0} flow consequence(s); ${V1SecurityPolicyFlow.zonePolicyReviewCount ?? 0} zone policy row(s); ${V1SecurityPolicyFlow.activeRequirementSecurityGapCount ?? 0} active requirement gap(s).`], ["NAT/logging review", `${V1SecurityPolicyFlow.natReviewCount ?? 0} NAT review(s); ${V1SecurityPolicyFlow.missingNatCount ?? 0} missing NAT`, `${V1SecurityPolicyFlow.loggingReviewCount ?? 0} logging review(s); ${V1SecurityPolicyFlow.loggingGapCount ?? 0} logging gap(s).`], ["Shadowing / broad permits", `${V1SecurityPolicyFlow.shadowedRuleCount ?? 0} shadowed rule(s)`, `${V1SecurityPolicyFlow.overbroadPolicyCount ?? 0} overbroad policy row(s); ${V1SecurityPolicyFlow.reviewRequiredCount ?? 0} review-required row(s).`]] }, { title: "V1 Requirement Security Matrix", headers: ["Requirement", "Active", "Readiness", "Actual flows", "Missing categories"], rows: compactRows(asArray(V1SecurityPolicyFlow.requirementSecurityMatrix).slice(0, 30).map((row: any) => [asString(row.requirementLabel), String(Boolean(row.active)), asString(row.readinessImpact), joinText(asArray(row.actualFlowRequirementIds).slice(0, 5), "none"), joinText(asArray(row.missingSecurityCategories), "none")]), [["No V1 requirement rows", "—", "—", "—", "—"]]) }, { title: "V1 Flow Consequences", headers: ["Flow", "Source", "Destination", "Action", "State", "Reason"], rows: compactRows(asArray(V1SecurityPolicyFlow.flowConsequences).slice(0, 36).map((row: any) => [asString(row.name), asString(row.sourceZoneName), asString(row.destinationZoneName), asString(row.expectedAction), asString(row.V1PolicyState), asString(row.reviewReason, asString(row.consequenceSummary, "none"))]), [["No V1 flow rows", "—", "—", "—", "—", "—"]]) }, { title: "V1 NAT / Logging / Shadowing Findings", headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"], rows: compactRows(asArray(V1SecurityPolicyFlow.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [asString(finding.severity), asString(finding.code), asString(finding.readinessImpact), asString(finding.title), asString(finding.remediation)]), [["PASSED", "V1_SECURITY_POLICY_FLOW_CONTROLLED", "READY", "No V1 findings", "Continue engineer review."]]) }] });
    }


    if (includeTechnicalEvidence && V1ImplementationPlanning) {
      report.sections.push({ title: "V1 Implementation Planning", paragraphs: ["V1 gates implementation planning on verified backend source objects, requirement lineage, dependencies, preconditions, verification evidence, rollback actions, risk, and readiness state. It is not vendor command generation."], tables: [{ title: "V1 Implementation Summary", headers: ["Gate", "Status", "Evidence"], rows: [["Contract", asString(V1ImplementationPlanning.contract, "missing"), asString(V1ImplementationPlanning.role, "implementation planning control")], ["Overall readiness", asString(V1ImplementationPlanning.overallReadiness, "review"), `${V1ImplementationPlanning.stepGateCount ?? 0} step gate(s); ${V1ImplementationPlanning.blockedStepGateCount ?? 0} blocked; ${V1ImplementationPlanning.reviewStepGateCount ?? 0} review.`], ["Evidence gates", `${V1ImplementationPlanning.verificationEvidenceGateCount ?? 0} verification / ${V1ImplementationPlanning.rollbackGateCount ?? 0} rollback`, `${V1ImplementationPlanning.requirementLineageGapCount ?? 0} requirement lineage gap(s); ${V1ImplementationPlanning.sourceObjectGapCount ?? 0} source object gap(s).`]] }, { title: "V1 Step Gates", headers: ["Step", "Category", "Readiness", "Sources", "Requirements", "Rollback / review"], rows: compactRows(asArray(V1ImplementationPlanning.stepGates).slice(0, 40).map((row: any) => [asString(row.title), asString(row.category), asString(row.readinessImpact), joinText(asArray(row.sourceObjectIds).slice(0, 4), "none"), joinText(asArray(row.sourceRequirementIds).slice(0, 4), "none"), asString(row.reviewReason, asString(row.rollbackStep, "missing rollback"))]), [["No V1 step gates", "—", "—", "—", "—", "—"]]) }, { title: "V1 Findings", headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"], rows: compactRows(asArray(V1ImplementationPlanning.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [asString(finding.severity), asString(finding.code), asString(finding.readinessImpact), asString(finding.title), asString(finding.remediation)]), [["PASSED", "V1_IMPLEMENTATION_PLANNING_CONTROLLED", "READY", "No V1 findings", "Continue to V1 vendor-neutral templates."]]) }] });
    }

    if (includeTechnicalEvidence && V1ImplementationTemplates) {
      report.sections.push({ title: "V1 Vendor-Neutral Implementation Templates", paragraphs: ["V1 compiles vendor-neutral templates from the backend implementation plan and V1 gates. It exposes variables, source objects, source requirements, missing-data blockers, neutral actions, evidence requirements, rollback requirements, and command-generation boundaries without emitting vendor CLI/cloud commands."], tables: [{ title: "V1 Template Summary", headers: ["Gate", "Status", "Evidence"], rows: [["Contract", asString(V1ImplementationTemplates.contract, "missing"), asString(V1ImplementationTemplates.role, "vendor-neutral template control")], ["Overall readiness", asString(V1ImplementationTemplates.overallReadiness, "review"), `${V1ImplementationTemplates.templateCount ?? 0} template gate(s); ${V1ImplementationTemplates.blockedTemplateCount ?? 0} blocked; ${V1ImplementationTemplates.reviewTemplateCount ?? 0} review.`], ["Command generation", V1ImplementationTemplates.commandGenerationAllowed ? "enabled" : "disabled", `${V1ImplementationTemplates.vendorSpecificCommandCount ?? 0} vendor command(s); ${V1ImplementationTemplates.commandLeakCount ?? 0} command leak(s).`]] }, { title: "V1 Template Gates", headers: ["Template", "Domain", "Readiness", "Sources", "Requirements", "Evidence", "Rollback"], rows: compactRows(asArray(V1ImplementationTemplates.templateGates).slice(0, 40).map((row: any) => [asString(row.title), asString(row.domain), asString(row.readinessImpact), joinText(asArray(row.sourceObjectIds).slice(0, 4), "none"), joinText(asArray(row.sourceRequirementIds).slice(0, 4), "none"), joinText(asArray(row.evidenceRequired).slice(0, 3), "missing evidence"), asString(row.rollbackRequirement, "missing rollback")]), [["No V1 template gates", "—", "—", "—", "—", "—", "—"]]) }, { title: "V1 Findings", headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"], rows: compactRows(asArray(V1ImplementationTemplates.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [asString(finding.severity), asString(finding.code), asString(finding.readinessImpact), asString(finding.title), asString(finding.remediation)]), [["PASSED", "V1_VENDOR_NEUTRAL_TEMPLATES_CONTROLLED", "READY", "No V1 findings", "Continue to report/export truth without vendor command generation."]]) }] });
    }


    if (includeTechnicalEvidence && V1ReportExportTruth) {
      report.sections.push({
        title: "V1 Report and Export Truth",
        paragraphs: [
          "V1 makes PDF, DOCX, CSV, and the report page obey backend evidence. It requires the report structure, truth labels, requirement traceability matrix, diagram impact, review-required items, assumptions/limitations, and appendices to stay aligned with backend design-core truth.",
        ],
        tables: [
          {
            title: "V1 Report Section Gates",
            headers: ["Section", "Report Section", "Frontend", "Readiness", "Truth Labels", "Blockers"],
            rows: compactRows(asArray(V1ReportExportTruth.sectionGates).map((row: any) => [
              asString(row.title),
              asString(row.reportSection),
              asString(row.frontendLocation),
              asString(row.readinessImpact, "REVIEW_REQUIRED"),
              joinText(asArray(row.truthLabels), "—"),
              joinText(asArray(row.blockers).slice(0, 3), "none"),
            ]), [["No V1 section gates", "—", "—", "REVIEW_REQUIRED", "—", "Add report section gates"]]),
          },
          {
            title: "V1 Findings",
            headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"],
            rows: compactRows(asArray(V1ReportExportTruth.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [
              asString(finding.severity),
              asString(finding.code),
              asString(finding.readinessImpact),
              asString(finding.title),
              asString(finding.remediation),
            ]), [["PASSED", "V1_REPORT_EXPORT_TRUTH_CONTROLLED", "READY", "No V1 findings", "Continue to V1 diagram truth."]]),
          },
        ],
      });
    }


    if (includeTechnicalEvidence && V1DiagramTruth) {
      report.sections.push({
        title: "V1 Diagram Truth / Renderer / Layout",
        paragraphs: [
          "V1 locks diagrams to backend truth. The canvas may lay out backend renderModel data, but it must not invent topology, hide inferred/review states, or draw relationships that the design graph cannot prove.",
        ],
        tables: [
          {
            title: "V1 Diagram Contract Summary",
            headers: ["Gate", "Status", "Evidence"],
            rows: [
              ["Contract", asString(V1DiagramTruth.contract, "missing"), asString(V1DiagramTruth.role, "diagram truth control")],
              ["Overall readiness", asString(V1DiagramTruth.overallReadiness, "REVIEW_REQUIRED"), `${V1DiagramTruth.renderNodeCount ?? 0} render node(s); ${V1DiagramTruth.renderEdgeCount ?? 0} render edge(s); ${V1DiagramTruth.modeContractCount ?? 0} mode contract(s).`],
              ["Backend identity", V1DiagramTruth.backendAuthored ? "BACKEND_AUTHORED" : "NOT_BACKEND_AUTHORED", `${V1DiagramTruth.nodesWithoutBackendObjectId ?? 0} node identity gap(s); ${V1DiagramTruth.edgesWithoutRelatedObjects ?? 0} edge lineage gap(s).`],
            ],
          },
          {
            title: "V1 Mode Contracts",
            headers: ["Mode", "Status", "Readiness", "Evidence", "Purpose"],
            rows: compactRows(asArray(V1DiagramTruth.modeContracts).map((row: any) => [
              asString(row.mode),
              asString(row.status),
              asString(row.readinessImpact),
              String(row.evidenceCount ?? 0),
              asString(row.purpose, "Review mode purpose."),
            ]), [["No mode contracts", "BLOCKED", "BLOCKED", "0", "Add backend diagram mode contracts"]]),
          },
          {
            title: "V1 Findings",
            headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"],
            rows: compactRows(asArray(V1DiagramTruth.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [
              asString(finding.severity),
              asString(finding.code),
              asString(finding.readinessImpact),
              asString(finding.title),
              asString(finding.remediation),
            ]), [["PASSED", "V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTROLLED", "READY", "No V1 findings", "Continue to V1 BOM without weakening diagram truth."]]),
          },
        ],
      });
    }

    if (includeTechnicalEvidence && V1PlatformBomFoundation) {
      report.sections.push({
        title: "V1 Platform/BOM Foundation",
        paragraphs: ["V1_PLATFORM_BOM_FOUNDATION_CONTRACT moves the Platform/BOM work from frontend-only estimates into backend-controlled advisory evidence. It still does not generate final vendor SKUs, pricing, optics, license tiers, or PoE watt budgets."],
        tables: [
          { title: "V1 BOM Contract Summary", headers: ["Gate", "Status", "Evidence"], rows: [
            ["Contract", asString(V1PlatformBomFoundation.contract, "missing"), asString(V1PlatformBomFoundation.role, "platform/BOM control")],
            ["Procurement authority", asString(V1PlatformBomFoundation.procurementAuthority, "ADVISORY_ONLY_NOT_FINAL_SKU"), asString(V1PlatformBomFoundation.sourceOfTruthLevel, "backend-computed-advisory-estimate")],
            ["Overall readiness", asString(V1PlatformBomFoundation.overallReadiness, "REVIEW_REQUIRED"), `${V1PlatformBomFoundation.rowCount ?? 0} row(s); ${V1PlatformBomFoundation.requirementDriverCount ?? 0} requirement driver(s); ${V1PlatformBomFoundation.placeholderRowCount ?? 0} placeholder row(s).`],
            ["Demand basis", `${V1PlatformBomFoundation.siteCount ?? 0} site(s), ${V1PlatformBomFoundation.usersPerSite ?? 0} users/site`, `${V1PlatformBomFoundation.localPortDemandPerSite ?? 0} local port(s)/site; ${V1PlatformBomFoundation.poeDemandPerSite ?? 0} PoE endpoint(s)/site.`],
          ]},
          { title: "V1 BOM Rows", headers: ["Category", "Item", "Quantity", "Confidence", "Source Requirements", "Manual Review"], rows: compactRows(asArray(V1PlatformBomFoundation.rows).map((row: any) => [asString(row.category), asString(row.item), `${asString(row.quantity)} ${asString(row.unit)}`, `${asString(row.confidence)} / ${asString(row.readinessImpact)}`, joinText(asArray(row.sourceRequirementIds), "none"), asString(row.manualReviewNote, "Engineering review required.")]), [["No BOM rows", "Backend BOM rows missing", "0", "BLOCKED", "none", "Add V1 row evidence."]]) },
          { title: "V1 Requirement Drivers", headers: ["Requirement", "Value", "Readiness", "Affected Rows", "Evidence"], rows: compactRows(asArray(V1PlatformBomFoundation.requirementDrivers).map((driver: any) => [asString(driver.requirementId), asString(driver.value), asString(driver.readinessImpact), joinText(asArray(driver.affectedRows), "none"), asString(driver.evidence)]), [["No drivers", "not captured", "BLOCKED", "none", "Add requirement-to-BOM propagation evidence."]]) },
          { title: "V1 Findings", headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"], rows: compactRows(asArray(V1PlatformBomFoundation.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [asString(finding.severity), asString(finding.code), asString(finding.readinessImpact), asString(finding.title), asString(finding.remediation)]), [["INFO", "V1_ADVISORY_BOM_NOT_VENDOR_CATALOG", "ADVISORY_READY", "BOM is advisory only", "Continue to V1 discovery/current-state without faking procurement precision."]]) },
        ],
      });
    }

    if (includeTechnicalEvidence && V1DiscoveryCurrentState) {
      report.sections.push({
        title: "V1 Discovery/Current-State",
        paragraphs: ["V1_DISCOVERY_CURRENT_STATE_CONTRACT promotes discovery/current-state into backend-controlled evidence while refusing fake live discovery. Manual notes, imported artifacts, validated imports, conflicts, and review-required states stay separated."],
        tables: [
          { title: "V1 Discovery Contract Summary", headers: ["Gate", "Status", "Evidence"], rows: [
            ["Contract", asString(V1DiscoveryCurrentState.contract, "missing"), asString(V1DiscoveryCurrentState.role, "manual discovery boundary")],
            ["Current-state authority", asString(V1DiscoveryCurrentState.currentStateAuthority, "manual/imported evidence only"), asString(V1DiscoveryCurrentState.sourceOfTruthLevel, "manual-discovery-boundary")],
            ["Overall readiness", asString(V1DiscoveryCurrentState.overallReadiness, "REVIEW_REQUIRED"), `${V1DiscoveryCurrentState.areaRowCount ?? 0} area(s); ${V1DiscoveryCurrentState.importTargetCount ?? 0} import target(s); ${V1DiscoveryCurrentState.openTaskCount ?? 0} open task(s).`],
            ["Evidence mix", `manual=${V1DiscoveryCurrentState.manuallyEnteredEvidenceCount ?? 0}; imported=${V1DiscoveryCurrentState.importedEvidenceCount ?? 0}; validated=${V1DiscoveryCurrentState.validatedEvidenceCount ?? 0}`, `conflicting=${V1DiscoveryCurrentState.conflictingEvidenceCount ?? 0}; review=${V1DiscoveryCurrentState.reviewRequiredCount ?? 0}`],
          ]},
          { title: "V1 Discovery Areas", headers: ["Area", "State", "Readiness", "Required For", "Review Reason"], rows: compactRows(asArray(V1DiscoveryCurrentState.areaRows).map((row: any) => [asString(row.area), asString(row.state), asString(row.readinessImpact), joinText(asArray(row.requiredFor), "none"), asString(row.reviewReason)]), [["No discovery areas", "NOT_PROVIDED", "NOT_READY", "none", "Add discovery/current-state area evidence."]]) },
          { title: "V1 Import Targets", headers: ["Target", "State", "Readiness", "Required For", "Reconciliation Need"], rows: compactRows(asArray(V1DiscoveryCurrentState.importTargets).map((target: any) => [asString(target.target), asString(target.state), asString(target.readinessImpact), joinText(asArray(target.requiredFor), "none"), asString(target.reconciliationNeed)]), [["No import targets", "NOT_PROVIDED", "NOT_READY", "none", "Add structured import targets."]]) },
          { title: "V1 Requirement-created Tasks", headers: ["Requirement", "Task", "Priority", "State", "Blockers"], rows: compactRows(asArray(V1DiscoveryCurrentState.tasks).map((task: any) => [asString(task.requirementId), asString(task.title), asString(task.priority), `${asString(task.state)} / ${asString(task.readinessImpact)}`, joinText(asArray(task.blockers), "none")]), [["No tasks", "No requirement-created discovery tasks", "LOW", "NOT_READY", "Add brownfield/migration/current-state requirements."]]) },
          { title: "V1 Findings", headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"], rows: compactRows(asArray(V1DiscoveryCurrentState.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [asString(finding.severity), asString(finding.code), asString(finding.readinessImpact), asString(finding.title), asString(finding.remediation)]), [["INFO", "V1_MANUAL_DISCOVERY_BOUNDARY", "NOT_READY", "Discovery is manual/imported only", "Do not claim live discovery until importers/parsers exist."]]) },
        ],
      });
    }


    if (includeTechnicalEvidence && V1AiDraftHelper) {
      report.sections.push({
        title: "V1 AI Draft/Helper",
        paragraphs: ["V1_AI_DRAFT_HELPER_CONTRACT keeps AI as a draft/review assistant only. AI can suggest requirements, sites, VLANs, and explanations, but deterministic backend engines remain the source of engineering truth."],
        tables: [
          { title: "V1 AI Contract Summary", headers: ["Gate", "Status", "Evidence"], rows: [
            ["Contract", asString(V1AiDraftHelper.contract, "missing"), asString(V1AiDraftHelper.role, "AI draft helper")],
            ["AI authority", asString(V1AiDraftHelper.aiAuthority, "DRAFT_ONLY_NOT_AUTHORITATIVE"), asString(V1AiDraftHelper.sourceOfTruthLevel, "ai-draft-only-review-gated")],
            ["Overall readiness", asString(V1AiDraftHelper.overallReadiness, "SAFE_DRAFT_ONLY"), `${V1AiDraftHelper.aiDerivedObjectCount ?? 0} AI-derived object(s); ${V1AiDraftHelper.reviewRequiredObjectCount ?? 0} review-required object(s).`],
            ["Apply policy", asString(V1AiDraftHelper.draftApplyPolicy, "selective review required"), `Provider mode: ${asString(V1AiDraftHelper.providerMode, "not-used")}`],
          ]},
          { title: "V1 Gates", headers: ["Gate", "State", "Blocks Authority", "Consumer Impact"], rows: compactRows(asArray(V1AiDraftHelper.gateRows).map((row: any) => [asString(row.gate), asString(row.state), row.blocksAuthority ? "yes" : "no", asString(row.consumerImpact)]), [["AI draft-only authority", "ENFORCED", "yes", "AI cannot feed outputs without review."]]) },
          { title: "V1 AI-Derived Objects", headers: ["Object", "Type", "State", "Proof", "Notes"], rows: compactRows(asArray(V1AiDraftHelper.draftObjectRows).map((row: any) => [asString(row.objectLabel), asString(row.objectType), asString(row.state), asString(row.proofStatus), joinText(asArray(row.notes), "review required")]), [["No AI-derived objects", "none", "NO_AI_DRAFT", "DRAFT_ONLY", "No saved AI authority risk detected."]]) },
          { title: "V1 Findings", headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"], rows: compactRows(asArray(V1AiDraftHelper.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [asString(finding.severity), asString(finding.code), asString(finding.readinessImpact), asString(finding.title), asString(finding.remediation)]), [["INFO", "V1_AI_DRAFT_ONLY_BOUNDARY", "SAFE_DRAFT_ONLY", "AI helper is draft-only", "Use deterministic engines as authority."]]) },
        ],
      });
    }

    if (includeTechnicalEvidence && V1FinalProofPass) {
      report.sections.push({
        title: "V1 Final Cross-Engine Proof Pass",
        paragraphs: ["V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT is the final proof gate. It does not add features; it proves the requirement-to-engine-to-validation-to-report/diagram/export chain and keeps the release target honest: A-/A planning platform, not A+ authority."],
        tables: [
          { title: "V1 Final Proof Summary", headers: ["Gate", "Status", "Evidence"], rows: [
            ["Contract", asString(V1FinalProofPass.contract, "missing"), asString(V1FinalProofPass.role, "final proof gate")],
            ["Release target", asString(V1FinalProofPass.releaseTarget, "A_MINUS_A_PLANNING_PLATFORM_NOT_A_PLUS"), asString(V1FinalProofPass.sourceOfTruthLevel, "final-cross-engine-proof-gate")],
            ["Overall readiness", asString(V1FinalProofPass.overallReadiness, "REVIEW_REQUIRED"), `${V1FinalProofPass.scenarioCount ?? 0} scenario(s); ${V1FinalProofPass.engineProofCount ?? 0} engine proof row(s); ${V1FinalProofPass.gateCount ?? 0} release gate(s).`],
            ["Gate mix", `${V1FinalProofPass.passedGateCount ?? 0} passed; ${V1FinalProofPass.reviewGateCount ?? 0} review; ${V1FinalProofPass.blockedGateCount ?? 0} blocked`, `${V1FinalProofPass.scenarioBlockedCount ?? 0} blocked scenario(s); ${V1FinalProofPass.engineProofBlockedCount ?? 0} blocked engine proof row(s).`],
          ]},
          { title: "V1 Release Gates", headers: ["Gate", "State", "Evidence", "Remediation"], rows: compactRows(asArray(V1FinalProofPass.releaseGates).map((gate: any) => [asString(gate.gate), asString(gate.state), joinText(asArray(gate.evidence), "no evidence"), asString(gate.remediation)]), [["No release gates", "BLOCKED", "Final proof gate missing", "Restore V1 release gates."]]) },
          { title: "V1 Cross-Engine Scenarios", headers: ["Scenario", "Readiness", "Requirements Covered", "Missing Evidence"], rows: compactRows(asArray(V1FinalProofPass.scenarioRows).map((row: any) => [asString(row.scenarioName), asString(row.readinessImpact), joinText(asArray(row.requirementsCovered), "none"), joinText(asArray(row.missingEvidence), "none")]), [["No scenarios", "BLOCKED", "none", "Add V1 scenario proof rows."]]) },
          { title: "V1 Engine Proof Rows", headers: ["Stage", "Engine", "Status", "Focus", "Blockers"], rows: compactRows(asArray(V1FinalProofPass.engineProofRows).map((row: any) => [`Stage ${asString(row.stage)}`, asString(row.engineKey), `${asString(row.status)} / ${asString(row.readinessImpact)}`, asString(row.proofFocus), joinText(asArray(row.blockers), "none")]), [["No engine rows", "missing", "BLOCKED", "Final proof missing", "Restore V1 engine proof rows."]]) },
          { title: "V1 Findings", headers: ["Severity", "Code", "Readiness", "Finding", "Remediation"], rows: compactRows(asArray(V1FinalProofPass.findings).filter((finding: any) => asString(finding.severity) !== "PASSED").slice(0, 30).map((finding: any) => [asString(finding.severity), asString(finding.code), asString(finding.readinessImpact), asString(finding.title), asString(finding.remediation)]), [["INFO", "V1_RELEASE_TARGET_BOUNDARY", "REVIEW_REQUIRED", "A-/A planning platform, not A+", "Keep release claims honest."]]) },
        ],
      });
    }

    if (includeTechnicalEvidence && enterpriseAllocatorPosture) {
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
          title: "V1 Dual-Stack Allocation Plan",
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
          title: "V1–53 Enterprise Allocator Findings",
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

    if (!includeTechnicalEvidence && enterpriseAllocatorPosture) {
      addressingSection.tables.push({
        title: "IP Address Management Review Summary",
        headers: ["Review Area", "Status", "Evidence"],
        rows: [
          ["Source-of-truth IPAM", asString(enterpriseAllocatorPosture.sourceOfTruthReadiness, "review"), String(enterpriseAllocatorPosture.durablePoolCount ?? 0) + " pool(s), " + String(enterpriseAllocatorPosture.durableAllocationCount ?? 0) + " durable allocation(s), " + String(enterpriseAllocatorPosture.allocationLedgerEntryCount ?? 0) + " ledger entrie(s)."],
          ["DHCP evidence", asString(enterpriseAllocatorPosture.dhcpReadiness, "review"), String(enterpriseAllocatorPosture.dhcpScopeCount ?? 0) + " DHCP scope(s), " + String(enterpriseAllocatorPosture.dhcpFindingCount ?? 0) + " review finding(s)."],
          ["Brownfield/IPAM import", asString(enterpriseAllocatorPosture.brownfieldReadiness, "review"), asString(enterpriseAllocatorPosture.brownfieldEvidenceState, "import required") + "; " + String(enterpriseAllocatorPosture.durableBrownfieldNetworkCount ?? 0) + " imported network(s), " + String(enterpriseAllocatorPosture.brownfieldConflictCount ?? 0) + " conflict(s)."],
          ["Approval workflow", asString(enterpriseAllocatorPosture.approvalReadiness, "review"), String(enterpriseAllocatorPosture.allocationApprovalCount ?? 0) + " approval(s), " + String(enterpriseAllocatorPosture.staleAllocationCount ?? 0) + " stale allocation(s)."],
        ],
      });
    }
  }

  if (includeTechnicalEvidence && addressingSection && networkObjectModel) {
    addressingSection.tables = addressingSection.tables ?? [];

    if (networkDevices.length > 0) {
      addressingSection.tables.push({
        title: "V1 Network Devices",
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
        title: "V1 Gateway and Routing Interfaces",
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
        title: "V1 DHCP Pools",
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
        title: "V1 Design Graph Summary",
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
        title: "V1 Design Graph Integrity Findings",
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


  if (includeTechnicalEvidence && routingSection) {
    routingSection.tables = routingSection.tables ?? [];

    if (reportTruth) {
      routingSection.tables.push({
        title: "V1 Backend Report Truth Summary",
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
          title: "V1 Backend Implementation Review Queue",
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
          title: "V1 Backend Verification Coverage",
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
          title: "V1 Backend Rollback Truth",
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
        title: "V1 Backend Diagram Render Truth Summary",
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
          title: "V1 Backend Diagram Render Model",
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

      if (designCore.V1DiagramTruth) {
        routingSection.tables.push({
          title: "V1 Diagram Truth / Renderer / Layout Contract",
          headers: ["Readiness", "Backend Authored", "Nodes", "Edges", "Mode Contracts", "Node ID Gaps", "Edge Lineage Gaps", "Visible Weak Truth"],
          rows: [[
            asString(designCore.V1DiagramTruth.overallReadiness, "review"),
            designCore.V1DiagramTruth.backendAuthored ? "Yes" : "No",
            String(designCore.V1DiagramTruth.renderNodeCount ?? 0),
            String(designCore.V1DiagramTruth.renderEdgeCount ?? 0),
            String(designCore.V1DiagramTruth.modeContractCount ?? 0),
            String(designCore.V1DiagramTruth.nodesWithoutBackendObjectId ?? 0),
            String(designCore.V1DiagramTruth.edgesWithoutRelatedObjects ?? 0),
            String(designCore.V1DiagramTruth.inferredOrReviewVisibleCount ?? 0),
          ]],
        });
        routingSection.tables.push({
          title: "V1 Diagram Mode Contracts",
          headers: ["Mode", "Status", "Readiness", "Evidence", "Purpose", "Required Backend Evidence"],
          rows: designCore.V1DiagramTruth.modeContracts.map((item: any) => [
            asString(item.mode, "mode"),
            asString(item.status, "review"),
            asString(item.readinessImpact, "review"),
            String(item.evidenceCount ?? 0),
            asString(item.purpose, "Review mode purpose."),
            joinText(asArray(item.requiredBackendEvidence), "none"),
          ]),
        });
      }

      if (Array.isArray(diagramTruth.overlaySummaries) && diagramTruth.overlaySummaries.length > 0) {
        routingSection.tables.push({
          title: "V1 Backend Diagram Overlay Truth",
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
          title: "V1 Backend Diagram Hotspots",
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
        title: "V1 Route Domains",
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
        title: "V1 Security Zones",
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
        title: "V1 Policy Intent",
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
        title: "V1 NAT Intent",
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
        title: "V1 Authoritative Design Graph Relationships",
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
        title: "V1 Routing and Segmentation Summary",
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
        title: "V1 Route Intent Table",
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
        title: "V1 Segmentation Expectations",
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
        title: "V1 Routing and Segmentation Findings",
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
        title: "V1 Security Policy and Flow Summary",
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
        title: "V1 Security Flow Requirements",
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
        title: "V1 Security Service Objects",
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
        title: "V1 Security Policy Findings",
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
        title: "V1 Implementation-Neutral Plan Summary",
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
        title: "V1 Implementation Stages",
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
        title: "V1 Implementation Steps",
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
        title: "V1 Verification Checks",
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
        title: "V1 Rollback Actions",
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
        title: "V1 Implementation Findings",
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

  const V1ExportTruthSection: any = {
    title: "13. V1 Export Truth / DOCX-PDF Substance Hardening",
    paragraphs: [
      "This export section is backend-authored. It preserves the same reportTruth, diagramTruth, implementationPlan, verificationChecks, rollbackActions, blocking findings, review findings, and limitations that exist inside the backend design-core snapshot.",
      blockedDesign
        ? "This design is not implementation-ready. Export output must not soften a blocked backend implementation posture into fake confidence."
        : "The backend does not currently mark implementation readiness as blocked, but engineer review is still required before production change approval.",
      "The proof boundary below separates what SubnetOps modeled, what it inferred from saved planning inputs, what it proposed, what is not proven, and what still requires engineer review.",
    ],
    tables: [
      {
        title: "V1 Backend Readiness Status",
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
        title: "V1 Blocking Findings",
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
        title: "V1 Review Findings",
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
        title: "V1 Implementation Review Queue",
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
        title: "V1 Verification Matrix",
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
        title: "V1 Rollback Actions",
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
        title: "V1 Diagram Truth and Render Model Summary",
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
        title: "V1 Diagram Render Model Nodes and Edges",
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
        title: "V1 Proof Boundary and Limitations",
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


  const V1VendorNeutralTemplatesSection: any = {
    title: "14. V1 Vendor-Neutral Implementation Templates",
    paragraphs: [
      "This export section is backend-authored from vendorNeutralImplementationTemplates. It converts the implementationPlan into human execution templates without generating vendor-specific commands.",
      "V1 deliberately forbids Cisco, Palo Alto, Fortinet, Juniper, Aruba, Linux, cloud, or other platform command syntax. Vendor-specific command generation remains a later gated stage.",
      "Templates preserve readiness, risk, dependencies, verification evidence, rollback evidence, blocker reasons, blast radius, and proof boundaries from the backend design-core snapshot.",
    ],
    tables: [
      {
        title: "V1 Template Summary",
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
        title: "V1 Template Groups",
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
        title: "V1 Vendor-Neutral Templates",
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
        title: "V1 Evidence and Rollback Linkage",
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
        title: "V1 Template Variables",
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
        title: "V1 Template Proof Boundary",
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
  if (reportMode === "full-proof") report.sections.push(V1ExportTruthSection, V1VendorNeutralTemplatesSection);

  return reportMode === "professional" ? professionalizeReportForAudience(report) : report;
}
