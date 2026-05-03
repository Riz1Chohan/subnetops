import type {
  BackendDiagramTruthModel,
  BackendReportTruthModel,
  DesignTruthReadiness,
  NetworkObjectModel,
  Phase11RoutingSegmentationControlSummary,
  Phase12SecurityPolicyFlowControlSummary,
  Phase13ImplementationPlanningControlSummary,
  Phase14ImplementationTemplateControlSummary,
  Phase15ReportExportTruthControlSummary,
  Phase15ReportExportTruthFinding,
  Phase15ReportSectionGateRow,
  Phase15ReportTraceabilityMatrixRow,
  Phase15ReportTruthLabelRow,
  Phase3RequirementsClosureControlSummary,
  Phase4CidrAddressingTruthControlSummary,
  Phase5EnterpriseIpamTruthControlSummary,
  Phase8ValidationReadinessControlSummary,
  Phase9NetworkObjectModelControlSummary,
} from "../designCore.types.js";

type Phase15Readiness = Phase15ReportExportTruthControlSummary["overallReadiness"];

const REQUIRED_REPORT_SECTIONS = [
  { key: "executive-summary", title: "Executive summary", reportSection: "Executive Summary", frontendLocation: "ProjectReportPage summary/export toolbar" },
  { key: "readiness-status", title: "Readiness status", reportSection: "Readiness Status", frontendLocation: "ProjectReportPage implementation/readiness panels" },
  { key: "requirement-traceability", title: "Requirement traceability", reportSection: "Requirement Traceability Matrix", frontendLocation: "ProjectReportPage requirements/design evidence" },
  { key: "addressing-plan", title: "Addressing plan", reportSection: "Logical Design and Addressing Plan", frontendLocation: "ProjectReportPage addressing/export tables" },
  { key: "enterprise-ipam-status", title: "Enterprise IPAM status", reportSection: "Enterprise IPAM Status", frontendLocation: "ProjectReportPage addressing/IPAM evidence" },
  { key: "network-object-model", title: "Network object model", reportSection: "Network Object Model", frontendLocation: "ProjectReportPage topology/design evidence" },
  { key: "routing-review", title: "Routing review", reportSection: "Routing and WAN Plan", frontendLocation: "ProjectReportPage routing evidence" },
  { key: "security-policy-review", title: "Security policy review", reportSection: "Security Architecture and Segmentation Model", frontendLocation: "ProjectReportPage security evidence" },
  { key: "implementation-plan", title: "Implementation plan", reportSection: "Implementation and Cutover", frontendLocation: "ProjectImplementationPage + ProjectReportPage" },
  { key: "validation-findings", title: "Validation findings", reportSection: "Validation Findings", frontendLocation: "ProjectReportPage validation list" },
  { key: "diagram-truth", title: "Diagram truth", reportSection: "Diagram Truth", frontendLocation: "BackendDiagramCanvas / ProjectDiagramPage" },
  { key: "assumptions-limitations", title: "Assumptions and limitations", reportSection: "Assumptions and Limitations", frontendLocation: "ProjectReportPage proof boundary" },
  { key: "review-required-items", title: "Review-required items", reportSection: "Review-Required Items", frontendLocation: "ProjectReportPage open issues" },
  { key: "appendices", title: "Appendices", reportSection: "Appendices", frontendLocation: "PDF/DOCX/CSV export appendices" },
] as const;

function uniq(values: string[]) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0)));
}

function readinessFromBackend(value: DesignTruthReadiness | string | undefined | null): Phase15Readiness {
  if (value === "blocked" || value === "BLOCKED" || value === "BLOCKING" || value === "ERROR") return "BLOCKED";
  if (value === "review" || value === "REVIEW_REQUIRED" || value === "WARNING" || value === "WARN") return "REVIEW_REQUIRED";
  if (value === "ready" || value === "READY" || value === "PASSED" || value === "PASS" || value === "NOT_APPLICABLE") return "READY";
  return "REVIEW_REQUIRED";
}

function worse(left: Phase15Readiness, right: Phase15Readiness): Phase15Readiness {
  const rank: Record<Phase15Readiness, number> = { READY: 1, REVIEW_REQUIRED: 2, BLOCKED: 3 };
  return rank[right] > rank[left] ? right : left;
}

function boolReadiness(ok: boolean, review = false): Phase15Readiness {
  if (ok) return "READY";
  return review ? "REVIEW_REQUIRED" : "BLOCKED";
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function compact(value: unknown, fallback = "—") {
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean).join("; ") || fallback;
  const text = String(value ?? "").trim();
  return text || fallback;
}

function makeTraceabilityRows(params: {
  phase3RequirementsClosure: Phase3RequirementsClosureControlSummary;
  networkObjectModel: NetworkObjectModel;
}): Phase15ReportTraceabilityMatrixRow[] {
  const rows = asArray<any>(params.phase3RequirementsClosure.closureMatrix)
    .filter((item) => item?.active || item?.consumerCoverage?.captured)
    .slice(0, 60)
    .map((item): Phase15ReportTraceabilityMatrixRow => {
      const affectedEngines = uniq(asArray<string>(item.actualAffectedEngines));
      const missingConsumers = uniq(asArray<string>(item.missingConsumers));
      const sourceObjectIds = uniq([
        ...asArray<string>(item.materializedObjectIds),
        ...asArray<string>(item.sourceObjectIds),
        ...asArray<string>(item.objectIds),
      ]);
      const readinessStatus = missingConsumers.length > 0 || item.lifecycleStatus === "BLOCKED"
        ? "BLOCKED"
        : item.lifecycleStatus === "REVIEW_REQUIRED" || item.lifecycleStatus === "PARTIALLY_PROPAGATED"
          ? "REVIEW_REQUIRED"
          : "READY";
      const diagramImpact = missingConsumers.some((consumer) => /diagram/i.test(consumer))
        ? "Diagram consumer missing"
        : affectedEngines.some((engine) => /diagram/i.test(engine)) || sourceObjectIds.length > 0
          ? "Diagram impact reviewed from backend object/consumer evidence"
          : "No visual impact or not applicable";
      return {
        requirementKey: compact(item.key, "requirement"),
        requirementLabel: compact(item.label, compact(item.key, "Requirement")),
        designConsequence: compact([
          ...asArray<string>(item.expectedAffectedEngines).slice(0, 4),
          ...asArray<string>(item.concreteOutputs).slice(0, 4),
        ], compact(sourceObjectIds.slice(0, 4), "Captured but no materialized design consequence recorded")),
        enginesAffected: affectedEngines.length ? affectedEngines : uniq(asArray<string>(item.expectedAffectedEngines)),
        frontendLocation: missingConsumers.some((consumer) => /frontend|ui/i.test(consumer)) ? "Missing frontend consumer" : "ProjectRequirementsPage / ProjectReportPage",
        reportSection: missingConsumers.some((consumer) => /report/i.test(consumer)) ? "Missing report section" : "Requirement Traceability Matrix",
        diagramImpact,
        readinessStatus,
        missingConsumers,
        sourceObjectIds,
      };
    });

  return rows.length ? rows : [{
    requirementKey: "no-active-requirements",
    requirementLabel: "No active requirement closure rows",
    designConsequence: "No requirement-output lineage is currently available to export.",
    enginesAffected: [],
    frontendLocation: "ProjectRequirementsPage",
    reportSection: "Requirement Traceability Matrix",
    diagramImpact: "No diagram impact can be proven without closure rows.",
    readinessStatus: "REVIEW_REQUIRED",
    missingConsumers: ["requirements closure matrix"],
    sourceObjectIds: [],
  }];
}

function buildSectionGates(params: {
  reportTruth: BackendReportTruthModel;
  diagramTruth: BackendDiagramTruthModel;
  phase3RequirementsClosure: Phase3RequirementsClosureControlSummary;
  phase4CidrAddressingTruth: Phase4CidrAddressingTruthControlSummary;
  phase5EnterpriseIpamTruth: Phase5EnterpriseIpamTruthControlSummary;
  phase8ValidationReadiness: Phase8ValidationReadinessControlSummary;
  phase9NetworkObjectModel: Phase9NetworkObjectModelControlSummary;
  phase11RoutingSegmentation: Phase11RoutingSegmentationControlSummary;
  phase12SecurityPolicyFlow: Phase12SecurityPolicyFlowControlSummary;
  phase13ImplementationPlanning: Phase13ImplementationPlanningControlSummary;
  phase14ImplementationTemplates: Phase14ImplementationTemplateControlSummary;
  networkObjectModel: NetworkObjectModel;
}): Phase15ReportSectionGateRow[] {
  const checks: Record<string, { readiness: Phase15Readiness; evidence: string[]; blockers: string[]; truthLabels: Phase15ReportSectionGateRow["truthLabels"] }> = {
    "executive-summary": { readiness: readinessFromBackend(params.reportTruth.overallReadiness), evidence: [`Backend reportTruth overall readiness: ${params.reportTruth.overallReadinessLabel}`], blockers: [], truthLabels: ["BACKEND_COMPUTED", "REVIEW_REQUIRED"] },
    "readiness-status": { readiness: readinessFromBackend(params.reportTruth.overallReadiness), evidence: [`Blocked findings ${params.reportTruth.blockedFindings.length}; review findings ${params.reportTruth.reviewFindings.length}`], blockers: params.reportTruth.blockedFindings.map((f) => f.title), truthLabels: ["BACKEND_COMPUTED", "BLOCKED", "REVIEW_REQUIRED"] },
    "requirement-traceability": { readiness: params.phase3RequirementsClosure.missingConsumerCount > 0 || params.phase3RequirementsClosure.blockedCount > 0 ? "BLOCKED" : params.phase3RequirementsClosure.reviewRequiredCount > 0 || params.phase3RequirementsClosure.partialPropagatedCount > 0 ? "REVIEW_REQUIRED" : "READY", evidence: [`${params.phase3RequirementsClosure.closureMatrix.length} closure row(s); ${params.phase3RequirementsClosure.fullPropagatedCount} fully propagated.`], blockers: [`${params.phase3RequirementsClosure.missingConsumerCount} missing consumer link(s)`].filter((x) => !x.startsWith("0 ")), truthLabels: ["USER_PROVIDED", "REQUIREMENT_MATERIALIZED", "BACKEND_COMPUTED"] },
    "addressing-plan": { readiness: params.phase4CidrAddressingTruth.invalidSubnetCount || params.phase4CidrAddressingTruth.overlapIssueCount || params.phase4CidrAddressingTruth.blockedProposalCount ? "BLOCKED" : params.phase4CidrAddressingTruth.undersizedSubnetCount || params.phase4CidrAddressingTruth.gatewayIssueCount || params.phase4CidrAddressingTruth.requirementAddressingGapCount ? "REVIEW_REQUIRED" : "READY", evidence: [`${params.phase4CidrAddressingTruth.validSubnetCount} valid subnet row(s); ${params.phase4CidrAddressingTruth.invalidSubnetCount} invalid row(s).`], blockers: [params.phase4CidrAddressingTruth.invalidSubnetCount ? `${params.phase4CidrAddressingTruth.invalidSubnetCount} invalid subnet row(s)` : "", params.phase4CidrAddressingTruth.overlapIssueCount ? `${params.phase4CidrAddressingTruth.overlapIssueCount} overlap issue(s)` : ""].filter(Boolean), truthLabels: ["BACKEND_COMPUTED", "REQUIREMENT_MATERIALIZED", "REVIEW_REQUIRED"] },
    "enterprise-ipam-status": { readiness: readinessFromBackend(params.phase5EnterpriseIpamTruth.overallReadiness), evidence: [`Engine 2 IPAM readiness ${params.phase5EnterpriseIpamTruth.overallReadiness}; durable allocation rows ${params.phase5EnterpriseIpamTruth.durableAllocationCount}.`], blockers: [params.phase5EnterpriseIpamTruth.conflictBlockerCount ? `${params.phase5EnterpriseIpamTruth.conflictBlockerCount} conflict blocker(s)` : "", params.phase5EnterpriseIpamTruth.activeRequirementIpamGapCount ? `${params.phase5EnterpriseIpamTruth.activeRequirementIpamGapCount} active requirement/IPAM gap(s)` : ""].filter(Boolean), truthLabels: ["ENGINE2_DURABLE", "BACKEND_COMPUTED", "REVIEW_REQUIRED"] },
    "network-object-model": { readiness: params.phase9NetworkObjectModel.overallReadiness, evidence: [`${params.networkObjectModel.summary.deviceCount} device(s), ${params.networkObjectModel.summary.interfaceCount} interface(s), ${params.networkObjectModel.summary.linkCount} link(s).`], blockers: params.phase9NetworkObjectModel.findings?.filter((f: any) => f.severity === "BLOCKING").map((f: any) => f.title) ?? [], truthLabels: ["BACKEND_COMPUTED", "INFERRED", "REVIEW_REQUIRED"] },
    "routing-review": { readiness: params.phase11RoutingSegmentation.overallReadiness, evidence: [`${params.phase11RoutingSegmentation.routeIntentCount} route intent(s); ${params.phase11RoutingSegmentation.protocolIntentCount} protocol intent/review row(s).`], blockers: params.phase11RoutingSegmentation.findings?.filter((f: any) => f.severity === "BLOCKING").map((f: any) => f.title) ?? [], truthLabels: ["BACKEND_COMPUTED", "INFERRED", "REVIEW_REQUIRED"] },
    "security-policy-review": { readiness: params.phase12SecurityPolicyFlow.overallReadiness, evidence: [`${params.phase12SecurityPolicyFlow.flowConsequenceCount} flow consequence(s); ${params.phase12SecurityPolicyFlow.zonePolicyReviewCount} zone policy row(s).`], blockers: params.phase12SecurityPolicyFlow.findings?.filter((f: any) => f.severity === "BLOCKING").map((f: any) => f.title) ?? [], truthLabels: ["BACKEND_COMPUTED", "INFERRED", "REVIEW_REQUIRED"] },
    "implementation-plan": { readiness: params.phase13ImplementationPlanning.overallReadiness, evidence: [`${params.phase13ImplementationPlanning.stepGateCount} step gate(s); ${params.phase13ImplementationPlanning.blockedStepGateCount} blocked.`], blockers: params.phase13ImplementationPlanning.findings?.filter((f: any) => f.severity === "BLOCKING").map((f: any) => f.title) ?? [], truthLabels: ["BACKEND_COMPUTED", "REVIEW_REQUIRED", "BLOCKED"] },
    "validation-findings": { readiness: readinessFromBackend(params.phase8ValidationReadiness.overallReadiness), evidence: [`Validation authority readiness ${params.phase8ValidationReadiness.overallReadiness}; ${params.phase8ValidationReadiness.blockingFindingCount} blocking finding(s).`], blockers: params.phase8ValidationReadiness.findings?.filter((f: any) => f.severity === "BLOCKING").map((f: any) => f.title) ?? [], truthLabels: ["BACKEND_COMPUTED", "BLOCKED", "REVIEW_REQUIRED"] },
    "diagram-truth": { readiness: readinessFromBackend(params.diagramTruth.overallReadiness), evidence: [`Diagram render model nodes ${params.diagramTruth.renderModel?.summary?.nodeCount ?? 0}; edges ${params.diagramTruth.renderModel?.summary?.edgeCount ?? 0}.`], blockers: params.diagramTruth.emptyStateReason ? [params.diagramTruth.emptyStateReason] : [], truthLabels: ["BACKEND_COMPUTED", "INFERRED", "REVIEW_REQUIRED"] },
    "assumptions-limitations": { readiness: params.reportTruth.limitations.length > 0 ? "READY" : "REVIEW_REQUIRED", evidence: [`${params.reportTruth.limitations.length} proof-boundary limitation(s) emitted.`], blockers: params.reportTruth.limitations.length ? [] : ["No explicit report limitations are available."], truthLabels: ["REVIEW_REQUIRED", "UNSUPPORTED"] },
    "review-required-items": { readiness: params.reportTruth.reviewFindings.length || params.reportTruth.implementationReviewQueue.length ? "READY" : "REVIEW_REQUIRED", evidence: [`${params.reportTruth.reviewFindings.length} review finding(s); ${params.reportTruth.implementationReviewQueue.length} implementation review item(s).`], blockers: [], truthLabels: ["REVIEW_REQUIRED", "BACKEND_COMPUTED"] },
    "appendices": { readiness: params.phase14ImplementationTemplates.templateCount > 0 ? "READY" : "REVIEW_REQUIRED", evidence: [`CSV/PDF/DOCX appendix source includes ${params.phase14ImplementationTemplates.templateCount} Phase 14 template gate(s).`], blockers: [], truthLabels: ["BACKEND_COMPUTED", "REVIEW_REQUIRED"] },
  };

  return REQUIRED_REPORT_SECTIONS.map((section) => {
    const check = checks[section.key];
    return {
      sectionKey: section.key,
      title: section.title,
      required: true,
      readinessImpact: check.readiness,
      reportSection: section.reportSection,
      frontendLocation: section.frontendLocation,
      truthLabels: check.truthLabels,
      evidence: uniq(check.evidence),
      blockers: uniq(check.blockers),
    };
  });
}

function buildTruthLabelRows(params: {
  reportTruth: BackendReportTruthModel;
  networkObjectModel: NetworkObjectModel;
  traceabilityRows: Phase15ReportTraceabilityMatrixRow[];
  sectionGates: Phase15ReportSectionGateRow[];
}): Phase15ReportTruthLabelRow[] {
  const durable = params.networkObjectModel.dhcpPools.length + params.networkObjectModel.ipReservations.length;
  const inferred = [
    ...params.networkObjectModel.devices,
    ...params.networkObjectModel.interfaces,
    ...params.networkObjectModel.links,
    ...params.networkObjectModel.securityZones,
    ...params.networkObjectModel.routeDomains,
  ].filter((item: any) => item.truthState === "INFERRED").length;
  const blocked = params.sectionGates.filter((section) => section.readinessImpact === "BLOCKED").length + params.reportTruth.blockedFindings.length;
  const review = params.sectionGates.filter((section) => section.readinessImpact === "REVIEW_REQUIRED").length + params.reportTruth.reviewFindings.length;
  const sourceObjectIds = uniq(params.traceabilityRows.flatMap((row) => row.sourceObjectIds));
  return [
    { truthLabel: "USER_PROVIDED", count: params.traceabilityRows.length, reportUsage: "Requirement traceability rows retain requirement labels/keys before any generated conclusion.", readinessImpact: params.traceabilityRows.length ? "READY" : "REVIEW_REQUIRED", evidence: [`${params.traceabilityRows.length} requirement matrix row(s).`] },
    { truthLabel: "REQUIREMENT_MATERIALIZED", count: sourceObjectIds.length, reportUsage: "Report matrix must name design consequences or review/no-op reasons created from requirements.", readinessImpact: sourceObjectIds.length ? "READY" : "REVIEW_REQUIRED", evidence: [`${sourceObjectIds.length} source object id(s) referenced in report traceability.`] },
    { truthLabel: "BACKEND_COMPUTED", count: params.sectionGates.length, reportUsage: "Readiness, routing, security, implementation, validation, diagram, and export gates come from backend design-core only.", readinessImpact: "READY", evidence: [`${params.sectionGates.length} required report section gate(s).`] },
    { truthLabel: "ENGINE2_DURABLE", count: durable, reportUsage: "Enterprise IPAM rows must not be contradicted by pretty addressing tables.", readinessImpact: durable ? "READY" : "REVIEW_REQUIRED", evidence: [`${durable} durable DHCP/reservation row(s) modeled.`] },
    { truthLabel: "INFERRED", count: inferred, reportUsage: "Inferred topology/security/routing facts remain labelled and review-gated instead of being sold as live truth.", readinessImpact: inferred ? "REVIEW_REQUIRED" : "READY", evidence: [`${inferred} inferred network object(s).`] },
    { truthLabel: "ESTIMATED", count: 0, reportUsage: "BOM/platform estimates are not Phase 15 authority and must stay out of final proof claims until Phase 17.", readinessImpact: "READY", evidence: ["No Phase 15 export section treats estimates as authoritative production facts."] },
    { truthLabel: "REVIEW_REQUIRED", count: review, reportUsage: "Review findings and review section gates remain visible in report/PDF/DOCX/CSV instead of hidden in UI only.", readinessImpact: review ? "REVIEW_REQUIRED" : "READY", evidence: [`${review} review item(s) visible across report gates/findings.`] },
    { truthLabel: "BLOCKED", count: blocked, reportUsage: "Blocked findings must keep readiness blocked across frontend and exports.", readinessImpact: blocked ? "BLOCKED" : "READY", evidence: [`${blocked} blocked item(s) visible across report gates/findings.`] },
    { truthLabel: "UNSUPPORTED", count: params.reportTruth.limitations.length, reportUsage: "Limitations state what the report does not prove: live device state, cabling, vendor syntax, provider behavior, and change success.", readinessImpact: params.reportTruth.limitations.length ? "READY" : "REVIEW_REQUIRED", evidence: [`${params.reportTruth.limitations.length} limitation row(s).`] },
  ];
}

function buildFindings(params: {
  sectionGates: Phase15ReportSectionGateRow[];
  traceabilityRows: Phase15ReportTraceabilityMatrixRow[];
  truthLabelRows: Phase15ReportTruthLabelRow[];
  reportTruth: BackendReportTruthModel;
  phase14ImplementationTemplates: Phase14ImplementationTemplateControlSummary;
}): Phase15ReportExportTruthFinding[] {
  const findings: Phase15ReportExportTruthFinding[] = [];
  const blockedSections = params.sectionGates.filter((section) => section.readinessImpact === "BLOCKED");
  const reviewSections = params.sectionGates.filter((section) => section.readinessImpact === "REVIEW_REQUIRED");
  const missingTraceability = params.traceabilityRows.filter((row) => row.readinessStatus !== "READY" || row.missingConsumers.length > 0);
  const blockedTruthLabels = params.truthLabelRows.filter((row) => row.readinessImpact === "BLOCKED");

  if (blockedSections.length) findings.push({ severity: "BLOCKING", code: "PHASE15_REQUIRED_REPORT_SECTION_BLOCKED", title: "Required report sections are blocked", detail: `${blockedSections.length} required report/export section(s) have blocking evidence.`, affectedSectionKeys: blockedSections.map((section) => section.sectionKey), readinessImpact: "BLOCKED", remediation: "Fix upstream design-core blockers before treating PDF/DOCX/CSV outputs as review-ready." });
  if (missingTraceability.length) findings.push({ severity: missingTraceability.some((row) => row.readinessStatus === "BLOCKED") ? "BLOCKING" : "REVIEW_REQUIRED", code: "PHASE15_REQUIREMENT_TRACEABILITY_GAP", title: "Requirement traceability matrix is incomplete", detail: `${missingTraceability.length} requirement traceability row(s) are blocked or review-required.`, affectedSectionKeys: ["requirement-traceability"], readinessImpact: missingTraceability.some((row) => row.readinessStatus === "BLOCKED") ? "BLOCKED" : "REVIEW_REQUIRED", remediation: "Complete requirement → object → engine → UI/report/diagram consumer closure before exporting final deliverables." });
  if (blockedTruthLabels.length) findings.push({ severity: "BLOCKING", code: "PHASE15_BLOCKED_TRUTH_LABEL_VISIBLE", title: "Blocked truth labels are visible in report/export gates", detail: `${blockedTruthLabels.length} truth-label bucket(s) are blocked.`, affectedSectionKeys: blockedTruthLabels.map((row) => row.truthLabel), readinessImpact: "BLOCKED", remediation: "Keep report readiness blocked and correct upstream blockers; do not sanitize away blocked labels." });
  if (!params.reportTruth.limitations.length) findings.push({ severity: "REVIEW_REQUIRED", code: "PHASE15_LIMITATIONS_MISSING", title: "Report limitations are missing", detail: "The export lacks explicit assumptions/limitations, which risks overclaiming production truth.", affectedSectionKeys: ["assumptions-limitations"], readinessImpact: "REVIEW_REQUIRED", remediation: "Add proof-boundary limitations to reportTruth before export approval." });
  if (!params.phase14ImplementationTemplates.templateCount) findings.push({ severity: "REVIEW_REQUIRED", code: "PHASE15_APPENDIX_TEMPLATE_EVIDENCE_THIN", title: "Implementation template appendix evidence is thin", detail: "No Phase 14 vendor-neutral templates are available for report appendices.", affectedSectionKeys: ["appendices", "implementation-plan"], readinessImpact: "REVIEW_REQUIRED", remediation: "Generate source-object-gated vendor-neutral templates or explicit no-op/review reasons." });
  if (reviewSections.length && !findings.some((finding) => finding.code === "PHASE15_REQUIRED_REPORT_SECTION_BLOCKED")) findings.push({ severity: "REVIEW_REQUIRED", code: "PHASE15_REQUIRED_REPORT_SECTION_REVIEW", title: "Required report sections need review", detail: `${reviewSections.length} required report/export section(s) are review-gated.`, affectedSectionKeys: reviewSections.map((section) => section.sectionKey), readinessImpact: "REVIEW_REQUIRED", remediation: "Keep deliverable marked review-required until upstream evidence is complete." });
  if (!findings.length) findings.push({ severity: "PASSED", code: "PHASE15_REPORT_EXPORT_TRUTH_CONTROLLED", title: "Report/export truth is controlled", detail: "Required report structure, truth labels, requirement traceability, diagram impact, readiness, assumptions, and export proof boundaries are represented.", affectedSectionKeys: [], readinessImpact: "READY", remediation: "Continue to Phase 16 diagram truth without letting diagrams invent facts." });
  return findings;
}

export function buildPhase15ReportExportTruthControl(params: {
  reportTruth: BackendReportTruthModel;
  diagramTruth: BackendDiagramTruthModel;
  phase3RequirementsClosure: Phase3RequirementsClosureControlSummary;
  phase4CidrAddressingTruth: Phase4CidrAddressingTruthControlSummary;
  phase5EnterpriseIpamTruth: Phase5EnterpriseIpamTruthControlSummary;
  phase8ValidationReadiness: Phase8ValidationReadinessControlSummary;
  phase9NetworkObjectModel: Phase9NetworkObjectModelControlSummary;
  phase11RoutingSegmentation: Phase11RoutingSegmentationControlSummary;
  phase12SecurityPolicyFlow: Phase12SecurityPolicyFlowControlSummary;
  phase13ImplementationPlanning: Phase13ImplementationPlanningControlSummary;
  phase14ImplementationTemplates: Phase14ImplementationTemplateControlSummary;
  networkObjectModel: NetworkObjectModel;
}): Phase15ReportExportTruthControlSummary {
  const traceabilityMatrix = makeTraceabilityRows({ phase3RequirementsClosure: params.phase3RequirementsClosure, networkObjectModel: params.networkObjectModel });
  const sectionGates = buildSectionGates(params);
  const truthLabelRows = buildTruthLabelRows({ reportTruth: params.reportTruth, networkObjectModel: params.networkObjectModel, traceabilityRows: traceabilityMatrix, sectionGates });
  const findings = buildFindings({ sectionGates, traceabilityRows: traceabilityMatrix, truthLabelRows, reportTruth: params.reportTruth, phase14ImplementationTemplates: params.phase14ImplementationTemplates });
  const blockedSectionCount = sectionGates.filter((section) => section.readinessImpact === "BLOCKED").length;
  const reviewSectionCount = sectionGates.filter((section) => section.readinessImpact === "REVIEW_REQUIRED").length;
  const missingTraceabilityConsumerCount = traceabilityMatrix.reduce((sum, row) => sum + row.missingConsumers.length, 0);
  const blockedFindingCount = findings.filter((finding) => finding.severity === "BLOCKING").length;
  const reviewFindingCount = findings.filter((finding) => finding.severity === "REVIEW_REQUIRED").length;
  const pdfDocxCsvCovered = sectionGates.every((section) => section.evidence.length > 0);
  let overallReadiness: Phase15Readiness = "READY";
  for (const section of sectionGates) overallReadiness = worse(overallReadiness, section.readinessImpact);
  for (const row of traceabilityMatrix) overallReadiness = worse(overallReadiness, row.readinessStatus);
  for (const row of truthLabelRows) overallReadiness = worse(overallReadiness, row.readinessImpact);
  if (blockedFindingCount) overallReadiness = "BLOCKED";
  else if (reviewFindingCount && overallReadiness === "READY") overallReadiness = "REVIEW_REQUIRED";

  return {
    contract: "PHASE15_REPORT_EXPORT_TRUTH_CONTRACT",
    role: "REPORT_EXPORT_BACKEND_TRUTH_REQUIREMENT_TRACEABILITY_DELIVERABLE_GATE",
    overallReadiness,
    requiredSectionCount: REQUIRED_REPORT_SECTIONS.length,
    readySectionCount: sectionGates.filter((section) => section.readinessImpact === "READY").length,
    reviewSectionCount,
    blockedSectionCount,
    traceabilityRowCount: traceabilityMatrix.length,
    missingTraceabilityConsumerCount,
    truthLabelRowCount: truthLabelRows.length,
    blockedTruthLabelCount: truthLabelRows.filter((row) => row.readinessImpact === "BLOCKED").length,
    pdfDocxCsvCovered,
    findingCount: findings.length,
    blockedFindingCount,
    reviewFindingCount,
    sectionGates,
    traceabilityMatrix,
    truthLabelRows,
    findings,
    proofBoundary: [
      "Modeled: executive summary, readiness, requirements traceability, addressing, enterprise IPAM, object model, routing, security, implementation, validation, diagram truth, assumptions, review items, and appendices.",
      "Allowed: PDF/DOCX/CSV exports may summarize backend-computed evidence and review blockers.",
      "Blocked: reports must not claim live device state, vendor syntax correctness, cabling truth, production firewall rulebase truth, or change-window success.",
      "Required: every requirement row must show design consequence, affected engine, frontend location, report section, diagram impact, and readiness status.",
    ],
    notes: [
      "Phase 15 is a deliverable truth gate, not a cosmetic report rewrite.",
      "Reports remain blocked/review-required when upstream requirement, IPAM, routing, security, implementation, diagram, or validation evidence is blocked/review-required.",
    ],
  };
}
