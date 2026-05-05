import { buildOmittedEvidenceSummary, evidenceWindow } from "../evidence/index.js";
import type {
  BackendDiagramTruthModel,
  BackendReportTruthModel,
  DesignTruthReadiness,
  NetworkObjectModel,
  V1RoutingSegmentationControlSummary,
  V1SecurityPolicyFlowControlSummary,
  V1ImplementationPlanningControlSummary,
  V1ImplementationTemplateControlSummary,
  V1ReportExportTruthControlSummary,
  V1ReportExportTruthFinding,
  V1ReportSectionGateRow,
  V1ReportTraceabilityMatrixRow,
  V1ReportTruthLabelRow,
  V1RequirementsClosureControlSummary,
  V1CidrAddressingTruthControlSummary,
  V1EnterpriseIpamTruthControlSummary,
  V1ValidationReadinessControlSummary,
  V1NetworkObjectModelControlSummary,
} from "./types.js";

type V1Readiness = V1ReportExportTruthControlSummary["overallReadiness"];

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

function readinessFromBackend(value: DesignTruthReadiness | string | undefined | null): V1Readiness {
  if (value === "blocked" || value === "BLOCKED" || value === "BLOCKING" || value === "ERROR") return "BLOCKED";
  if (value === "review" || value === "REVIEW_REQUIRED" || value === "WARNING" || value === "WARN") return "REVIEW_REQUIRED";
  if (value === "ready" || value === "READY" || value === "PASSED" || value === "PASS" || value === "NOT_APPLICABLE") return "READY";
  return "REVIEW_REQUIRED";
}

function worse(left: V1Readiness, right: V1Readiness): V1Readiness {
  const rank: Record<V1Readiness, number> = { READY: 1, REVIEW_REQUIRED: 2, BLOCKED: 3 };
  return rank[right] > rank[left] ? right : left;
}

function boolReadiness(ok: boolean, review = false): V1Readiness {
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
  closureRows: any[];
  networkObjectModel: NetworkObjectModel;
}): V1ReportTraceabilityMatrixRow[] {
  const rows = params.closureRows
    .map((item): V1ReportTraceabilityMatrixRow => {
      const affectedAreas = uniq(asArray<string>(item.actualAffectedEngines));
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
        : affectedAreas.some((engine) => /diagram/i.test(engine)) || sourceObjectIds.length > 0
          ? "Diagram impact reviewed from backend object/consumer evidence"
          : "No visual impact or not applicable";
      return {
        requirementKey: compact(item.key, "requirement"),
        requirementLabel: compact(item.label, compact(item.key, "Requirement")),
        designConsequence: compact([
          ...asArray<string>(item.expectedAffectedEngines).slice(0, 4),
          ...asArray<string>(item.concreteOutputs).slice(0, 4),
        ], compact(sourceObjectIds.slice(0, 4), "Captured but no materialized design consequence recorded")),
        enginesAffected: affectedAreas.length ? affectedAreas : uniq(asArray<string>(item.expectedAffectedEngines)),
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
  V1RequirementsClosure: V1RequirementsClosureControlSummary;
  V1CidrAddressingTruth: V1CidrAddressingTruthControlSummary;
  V1EnterpriseIpamTruth: V1EnterpriseIpamTruthControlSummary;
  V1ValidationReadiness: V1ValidationReadinessControlSummary;
  V1NetworkObjectModel: V1NetworkObjectModelControlSummary;
  V1RoutingSegmentation: V1RoutingSegmentationControlSummary;
  V1SecurityPolicyFlow: V1SecurityPolicyFlowControlSummary;
  V1ImplementationPlanning: V1ImplementationPlanningControlSummary;
  V1ImplementationTemplates: V1ImplementationTemplateControlSummary;
  networkObjectModel: NetworkObjectModel;
}): V1ReportSectionGateRow[] {
  const checks: Record<string, { readiness: V1Readiness; evidence: string[]; blockers: string[]; truthLabels: V1ReportSectionGateRow["truthLabels"] }> = {
    "executive-summary": { readiness: readinessFromBackend(params.reportTruth.overallReadiness), evidence: [`Backend reportTruth overall readiness: ${params.reportTruth.overallReadinessLabel}`], blockers: [], truthLabels: ["BACKEND_COMPUTED", "REVIEW_REQUIRED"] },
    "readiness-status": { readiness: readinessFromBackend(params.reportTruth.overallReadiness), evidence: [`Blocked findings ${params.reportTruth.blockedFindings.length}; review findings ${params.reportTruth.reviewFindings.length}`], blockers: params.reportTruth.blockedFindings.map((f: any) => f.title), truthLabels: ["BACKEND_COMPUTED", "BLOCKED", "REVIEW_REQUIRED"] },
    "requirement-traceability": { readiness: params.V1RequirementsClosure.missingConsumerCount > 0 || params.V1RequirementsClosure.blockedCount > 0 ? "BLOCKED" : params.V1RequirementsClosure.reviewRequiredCount > 0 || params.V1RequirementsClosure.partialPropagatedCount > 0 ? "REVIEW_REQUIRED" : "READY", evidence: [`${params.V1RequirementsClosure.closureMatrix.length} closure row(s); ${params.V1RequirementsClosure.fullPropagatedCount} fully propagated.`], blockers: [`${params.V1RequirementsClosure.missingConsumerCount} missing consumer link(s)`].filter((x) => !x.startsWith("0 ")), truthLabels: ["USER_PROVIDED", "REQUIREMENT_MATERIALIZED", "BACKEND_COMPUTED"] },
    "addressing-plan": { readiness: params.V1CidrAddressingTruth.invalidSubnetCount || params.V1CidrAddressingTruth.overlapIssueCount || params.V1CidrAddressingTruth.blockedProposalCount ? "BLOCKED" : params.V1CidrAddressingTruth.undersizedSubnetCount || params.V1CidrAddressingTruth.gatewayIssueCount || params.V1CidrAddressingTruth.requirementAddressingGapCount ? "REVIEW_REQUIRED" : "READY", evidence: [`${params.V1CidrAddressingTruth.validSubnetCount} valid subnet row(s); ${params.V1CidrAddressingTruth.invalidSubnetCount} invalid row(s).`], blockers: [params.V1CidrAddressingTruth.invalidSubnetCount ? `${params.V1CidrAddressingTruth.invalidSubnetCount} invalid subnet row(s)` : "", params.V1CidrAddressingTruth.overlapIssueCount ? `${params.V1CidrAddressingTruth.overlapIssueCount} overlap issue(s)` : ""].filter(Boolean), truthLabels: ["BACKEND_COMPUTED", "REQUIREMENT_MATERIALIZED", "REVIEW_REQUIRED"] },
    "enterprise-ipam-status": { readiness: readinessFromBackend(params.V1EnterpriseIpamTruth.overallReadiness), evidence: [`Enterprise IPAM readiness ${params.V1EnterpriseIpamTruth.overallReadiness}; durable allocation rows ${params.V1EnterpriseIpamTruth.durableAllocationCount}.`], blockers: [params.V1EnterpriseIpamTruth.conflictBlockerCount ? `${params.V1EnterpriseIpamTruth.conflictBlockerCount} conflict blocker(s)` : "", params.V1EnterpriseIpamTruth.activeRequirementIpamGapCount ? `${params.V1EnterpriseIpamTruth.activeRequirementIpamGapCount} active requirement/IPAM gap(s)` : ""].filter(Boolean), truthLabels: ["DURABLE_IPAM", "BACKEND_COMPUTED", "REVIEW_REQUIRED"] },
    "network-object-model": { readiness: params.V1NetworkObjectModel.overallReadiness, evidence: [`${params.networkObjectModel.summary.deviceCount} device(s), ${params.networkObjectModel.summary.interfaceCount} interface(s), ${params.networkObjectModel.summary.linkCount} link(s).`], blockers: params.V1NetworkObjectModel.findings?.filter((f: any) => f.severity === "BLOCKING").map((f: any) => f.title) ?? [], truthLabels: ["BACKEND_COMPUTED", "INFERRED", "REVIEW_REQUIRED"] },
    "routing-review": { readiness: params.V1RoutingSegmentation.overallReadiness, evidence: [`${params.V1RoutingSegmentation.routeIntentCount} route intent(s); ${params.V1RoutingSegmentation.protocolIntentCount} protocol intent/review row(s).`], blockers: params.V1RoutingSegmentation.findings?.filter((f: any) => f.severity === "BLOCKING").map((f: any) => f.title) ?? [], truthLabels: ["BACKEND_COMPUTED", "INFERRED", "REVIEW_REQUIRED"] },
    "security-policy-review": { readiness: params.V1SecurityPolicyFlow.overallReadiness, evidence: [`${params.V1SecurityPolicyFlow.flowConsequenceCount} flow consequence(s); ${params.V1SecurityPolicyFlow.zonePolicyReviewCount} zone policy row(s).`], blockers: params.V1SecurityPolicyFlow.findings?.filter((f: any) => f.severity === "BLOCKING").map((f: any) => f.title) ?? [], truthLabels: ["BACKEND_COMPUTED", "INFERRED", "REVIEW_REQUIRED"] },
    "implementation-plan": { readiness: params.V1ImplementationPlanning.overallReadiness, evidence: [`${params.V1ImplementationPlanning.stepGateCount} step gate(s); ${params.V1ImplementationPlanning.blockedStepGateCount} blocked.`], blockers: params.V1ImplementationPlanning.findings?.filter((f: any) => f.severity === "BLOCKING").map((f: any) => f.title) ?? [], truthLabels: ["BACKEND_COMPUTED", "REVIEW_REQUIRED", "BLOCKED"] },
    "validation-findings": { readiness: readinessFromBackend(params.V1ValidationReadiness.overallReadiness), evidence: [`Validation authority readiness ${params.V1ValidationReadiness.overallReadiness}; ${params.V1ValidationReadiness.blockingFindingCount} blocking finding(s).`], blockers: params.V1ValidationReadiness.findings?.filter((f: any) => f.severity === "BLOCKING").map((f: any) => f.title) ?? [], truthLabels: ["BACKEND_COMPUTED", "BLOCKED", "REVIEW_REQUIRED"] },
    "diagram-truth": { readiness: readinessFromBackend(params.diagramTruth.overallReadiness), evidence: [`Diagram render model nodes ${params.diagramTruth.renderModel?.summary?.nodeCount ?? 0}; edges ${params.diagramTruth.renderModel?.summary?.edgeCount ?? 0}.`], blockers: params.diagramTruth.emptyStateReason ? [params.diagramTruth.emptyStateReason] : [], truthLabels: ["BACKEND_COMPUTED", "INFERRED", "REVIEW_REQUIRED"] },
    "assumptions-limitations": { readiness: params.reportTruth.limitations.length > 0 ? "READY" : "REVIEW_REQUIRED", evidence: [`${params.reportTruth.limitations.length} proof-boundary limitation(s) emitted.`], blockers: params.reportTruth.limitations.length ? [] : ["No explicit report limitations are available."], truthLabels: ["REVIEW_REQUIRED", "UNSUPPORTED"] },
    "review-required-items": { readiness: params.reportTruth.reviewFindings.length || params.reportTruth.implementationReviewQueue.length ? "READY" : "REVIEW_REQUIRED", evidence: [`${params.reportTruth.reviewFindings.length} review finding(s); ${params.reportTruth.implementationReviewQueue.length} implementation review item(s).`], blockers: [], truthLabels: ["REVIEW_REQUIRED", "BACKEND_COMPUTED"] },
    "appendices": { readiness: params.V1ImplementationTemplates.templateCount > 0 ? "READY" : "REVIEW_REQUIRED", evidence: [`CSV/PDF/DOCX appendix source includes ${params.V1ImplementationTemplates.templateCount} V1 template gate(s).`], blockers: [], truthLabels: ["BACKEND_COMPUTED", "REVIEW_REQUIRED"] },
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
  traceabilityRows: V1ReportTraceabilityMatrixRow[];
  sectionGates: V1ReportSectionGateRow[];
}): V1ReportTruthLabelRow[] {
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
    { truthLabel: "DURABLE_IPAM", count: durable, reportUsage: "Durable IPAM rows must not be contradicted by addressing tables.", readinessImpact: durable ? "READY" : "REVIEW_REQUIRED", evidence: [`${durable} durable DHCP/reservation row(s) modeled.`] },
    { truthLabel: "INFERRED", count: inferred, reportUsage: "Inferred topology/security/routing facts remain labelled and review-gated instead of being sold as live truth.", readinessImpact: inferred ? "REVIEW_REQUIRED" : "READY", evidence: [`${inferred} inferred network object(s).`] },
    { truthLabel: "ESTIMATED", count: 0, reportUsage: "BOM/platform estimates are not V1 authority and must stay out of final proof claims until V1.", readinessImpact: "READY", evidence: ["No V1 export section treats estimates as authoritative production facts."] },
    { truthLabel: "REVIEW_REQUIRED", count: review, reportUsage: "Review findings and review section gates remain visible in report/PDF/DOCX/CSV instead of hidden in UI only.", readinessImpact: review ? "REVIEW_REQUIRED" : "READY", evidence: [`${review} review item(s) visible across report gates/findings.`] },
    { truthLabel: "BLOCKED", count: blocked, reportUsage: "Blocked findings must keep readiness blocked across frontend and exports.", readinessImpact: blocked ? "BLOCKED" : "READY", evidence: [`${blocked} blocked item(s) visible across report gates/findings.`] },
    { truthLabel: "UNSUPPORTED", count: params.reportTruth.limitations.length, reportUsage: "Limitations state what the report does not prove: live device state, cabling, vendor syntax, provider behavior, and change success.", readinessImpact: params.reportTruth.limitations.length ? "READY" : "REVIEW_REQUIRED", evidence: [`${params.reportTruth.limitations.length} limitation row(s).`] },
  ];
}

function buildFindings(params: {
  sectionGates: V1ReportSectionGateRow[];
  traceabilityRows: V1ReportTraceabilityMatrixRow[];
  truthLabelRows: V1ReportTruthLabelRow[];
  reportTruth: BackendReportTruthModel;
  V1ImplementationTemplates: V1ImplementationTemplateControlSummary;
}): V1ReportExportTruthFinding[] {
  const findings: V1ReportExportTruthFinding[] = [];
  const blockedSections = params.sectionGates.filter((section) => section.readinessImpact === "BLOCKED");
  const reviewSections = params.sectionGates.filter((section) => section.readinessImpact === "REVIEW_REQUIRED");
  const missingTraceability = params.traceabilityRows.filter((row) => row.readinessStatus !== "READY" || row.missingConsumers.length > 0);
  const blockedTruthLabels = params.truthLabelRows.filter((row) => row.readinessImpact === "BLOCKED");

  if (blockedSections.length) findings.push({ severity: "BLOCKING", code: "V1_REQUIRED_REPORT_SECTION_BLOCKED", title: "Required report sections are blocked", detail: `${blockedSections.length} required report/export section(s) have blocking evidence.`, affectedSectionKeys: blockedSections.map((section) => section.sectionKey), readinessImpact: "BLOCKED", remediation: "Fix upstream design-core blockers before treating PDF/DOCX/CSV outputs as review-ready." });
  if (missingTraceability.length) findings.push({ severity: missingTraceability.some((row) => row.readinessStatus === "BLOCKED") ? "BLOCKING" : "REVIEW_REQUIRED", code: "V1_REQUIREMENT_TRACEABILITY_GAP", title: "Requirement traceability matrix is incomplete", detail: `${missingTraceability.length} requirement traceability row(s) are blocked or review-required.`, affectedSectionKeys: ["requirement-traceability"], readinessImpact: missingTraceability.some((row) => row.readinessStatus === "BLOCKED") ? "BLOCKED" : "REVIEW_REQUIRED", remediation: "Complete requirement → object → engine → UI/report/diagram consumer closure before exporting final deliverables." });
  if (blockedTruthLabels.length) findings.push({ severity: "BLOCKING", code: "V1_BLOCKED_TRUTH_LABEL_VISIBLE", title: "Blocked truth labels are visible in report/export gates", detail: `${blockedTruthLabels.length} truth-label bucket(s) are blocked.`, affectedSectionKeys: blockedTruthLabels.map((row) => row.truthLabel), readinessImpact: "BLOCKED", remediation: "Keep report readiness blocked and correct upstream blockers; do not sanitize away blocked labels." });
  if (!params.reportTruth.limitations.length) findings.push({ severity: "REVIEW_REQUIRED", code: "V1_LIMITATIONS_MISSING", title: "Report limitations are missing", detail: "The export lacks explicit assumptions/limitations, which risks overclaiming production truth.", affectedSectionKeys: ["assumptions-limitations"], readinessImpact: "REVIEW_REQUIRED", remediation: "Add proof-boundary limitations to reportTruth before export approval." });
  if (!params.V1ImplementationTemplates.templateCount) findings.push({ severity: "REVIEW_REQUIRED", code: "V1_APPENDIX_TEMPLATE_EVIDENCE_THIN", title: "Implementation template appendix evidence is thin", detail: "No V1 vendor-neutral templates are available for report appendices.", affectedSectionKeys: ["appendices", "implementation-plan"], readinessImpact: "REVIEW_REQUIRED", remediation: "Generate source-object-gated vendor-neutral templates or explicit no-op/review reasons." });
  if (reviewSections.length && !findings.some((finding) => finding.code === "V1_REQUIRED_REPORT_SECTION_BLOCKED")) findings.push({ severity: "REVIEW_REQUIRED", code: "V1_REQUIRED_REPORT_SECTION_REVIEW", title: "Required report sections need review", detail: `${reviewSections.length} required report/export section(s) are review-gated.`, affectedSectionKeys: reviewSections.map((section) => section.sectionKey), readinessImpact: "REVIEW_REQUIRED", remediation: "Keep deliverable marked review-required until upstream evidence is complete." });
  if (!findings.length) findings.push({ severity: "PASSED", code: "V1_REPORT_EXPORT_TRUTH_CONTROLLED", title: "Report/export truth is controlled", detail: "Required report structure, truth labels, requirement traceability, diagram impact, readiness, assumptions, and export proof boundaries are represented.", affectedSectionKeys: [], readinessImpact: "READY", remediation: "Continue to V1 diagram truth without letting diagrams invent facts." });
  return findings;
}

function buildAntiOverclaimRules(params: { overallReadiness: V1Readiness; blockedFindingCount: number; reviewFindingCount: number; omittedHasBlockers: boolean; omittedHasReviewRequired: boolean; pdfDocxCsvCovered: boolean }) {
  const claimAllowed = params.overallReadiness === "READY"
    && params.blockedFindingCount === 0
    && params.reviewFindingCount === 0
    && !params.omittedHasBlockers
    && !params.omittedHasReviewRequired
    && params.pdfDocxCsvCovered;
  const evidence = [
    `Report/export readiness: ${params.overallReadiness}`,
    `Blocked findings: ${params.blockedFindingCount}`,
    `Review findings: ${params.reviewFindingCount}`,
    `Omitted blockers: ${params.omittedHasBlockers ? "yes" : "no"}`,
    `Omitted review-required: ${params.omittedHasReviewRequired ? "yes" : "no"}`,
    `PDF/DOCX/CSV coverage: ${params.pdfDocxCsvCovered ? "yes" : "no"}`,
  ];
  return [
    { phrase: "ready for deployment", allowedOnlyWhen: "IMPLEMENTATION_READY" as const, claimAllowed, replacement: "planning package with explicit review/implementation gates", evidence },
    { phrase: "validated", allowedOnlyWhen: "BACKEND_PROOF_SUPPORTS" as const, claimAllowed, replacement: "validated only for the listed backend evidence, with unresolved sections shown", evidence },
    { phrase: "complete", allowedOnlyWhen: "BACKEND_PROOF_SUPPORTS" as const, claimAllowed, replacement: "complete only for proven sections; unresolved items remain visible", evidence },
    { phrase: "best practice compliant", allowedOnlyWhen: "BACKEND_PROOF_SUPPORTS" as const, claimAllowed, replacement: "aligned to modeled standards evidence, pending engineer review", evidence },
    { phrase: "production-ready", allowedOnlyWhen: "IMPLEMENTATION_READY" as const, claimAllowed, replacement: "not production-ready until backend proof reaches implementation-ready", evidence },
    { phrase: "implementation-ready", allowedOnlyWhen: "IMPLEMENTATION_READY" as const, claimAllowed, replacement: "implementation gated until blockers/review items are resolved", evidence },
  ];
}

export function buildV1ReportExportTruthControl(params: {
  reportTruth: BackendReportTruthModel;
  diagramTruth: BackendDiagramTruthModel;
  V1RequirementsClosure: V1RequirementsClosureControlSummary;
  V1CidrAddressingTruth: V1CidrAddressingTruthControlSummary;
  V1EnterpriseIpamTruth: V1EnterpriseIpamTruthControlSummary;
  V1ValidationReadiness: V1ValidationReadinessControlSummary;
  V1NetworkObjectModel: V1NetworkObjectModelControlSummary;
  V1RoutingSegmentation: V1RoutingSegmentationControlSummary;
  V1SecurityPolicyFlow: V1SecurityPolicyFlowControlSummary;
  V1ImplementationPlanning: V1ImplementationPlanningControlSummary;
  V1ImplementationTemplates: V1ImplementationTemplateControlSummary;
  networkObjectModel: NetworkObjectModel;
}): V1ReportExportTruthControlSummary {
  const closureSourceRows = asArray<any>(params.V1RequirementsClosure.closureMatrix)
    .filter((item) => item?.active || item?.consumerCoverage?.captured);
  const traceabilityWindow = evidenceWindow({
    collection: "requirement traceability matrix",
    surface: "V1ReportExportTruth.traceabilityMatrix",
    items: closureSourceRows,
    limit: 60,
    exportImpact: "Traceability summary is windowed for readability; the omitted counter must expose hidden blockers/review items and the full closure matrix remains machine-readable in design-core evidence.",
  });
  const traceabilityMatrix = makeTraceabilityRows({ closureRows: traceabilityWindow.shown, networkObjectModel: params.networkObjectModel });
  const sectionGates = buildSectionGates(params);
  const truthLabelRows = buildTruthLabelRows({ reportTruth: params.reportTruth, networkObjectModel: params.networkObjectModel, traceabilityRows: traceabilityMatrix, sectionGates });
  const findings = buildFindings({ sectionGates, traceabilityRows: traceabilityMatrix, truthLabelRows, reportTruth: params.reportTruth, V1ImplementationTemplates: params.V1ImplementationTemplates });
  const blockedSectionCount = sectionGates.filter((section) => section.readinessImpact === "BLOCKED").length;
  const reviewSectionCount = sectionGates.filter((section) => section.readinessImpact === "REVIEW_REQUIRED").length;
  const missingTraceabilityConsumerCount = traceabilityMatrix.reduce((sum, row) => sum + row.missingConsumers.length, 0);
  const blockedFindingCount = findings.filter((finding) => finding.severity === "BLOCKING").length;
  const reviewFindingCount = findings.filter((finding) => finding.severity === "REVIEW_REQUIRED").length;
  const pdfDocxCsvCovered = sectionGates.every((section) => section.evidence.length > 0);
  let overallReadiness: V1Readiness = "READY";
  for (const section of sectionGates) overallReadiness = worse(overallReadiness, section.readinessImpact);
  for (const row of traceabilityMatrix) overallReadiness = worse(overallReadiness, row.readinessStatus);
  for (const row of truthLabelRows) overallReadiness = worse(overallReadiness, row.readinessImpact);
  if (blockedFindingCount) overallReadiness = "BLOCKED";
  else if (reviewFindingCount && overallReadiness === "READY") overallReadiness = "REVIEW_REQUIRED";

  const omittedEvidenceSummaries = [
    traceabilityWindow.summary,
    buildOmittedEvidenceSummary({ collection: "report section gates", surface: "V1ReportExportTruth.sectionGates", items: sectionGates, shownCount: sectionGates.length }),
    buildOmittedEvidenceSummary({ collection: "report truth labels", surface: "V1ReportExportTruth.truthLabelRows", items: truthLabelRows, shownCount: truthLabelRows.length }),
    buildOmittedEvidenceSummary({ collection: "report findings", surface: "V1ReportExportTruth.findings", items: findings, shownCount: findings.length }),
  ];
  if (omittedEvidenceSummaries.some((summary) => summary.omittedHasBlockers)) overallReadiness = "BLOCKED";
  else if (overallReadiness === "READY" && omittedEvidenceSummaries.some((summary) => summary.omittedHasReviewRequired)) overallReadiness = "REVIEW_REQUIRED";
  const fullEvidenceInventory = omittedEvidenceSummaries.map((summary) => ({
    collection: summary.collection,
    totalCount: summary.totalCount,
    surfacedCount: summary.shownCount,
    omittedCount: summary.omittedCount,
    readinessImpact: summary.readinessImpact,
  }));
  const antiOverclaimRules = buildAntiOverclaimRules({
    overallReadiness,
    blockedFindingCount,
    reviewFindingCount,
    omittedHasBlockers: omittedEvidenceSummaries.some((summary) => summary.omittedHasBlockers),
    omittedHasReviewRequired: omittedEvidenceSummaries.some((summary) => summary.omittedHasReviewRequired),
    pdfDocxCsvCovered,
  });
  const implementationReadyClaimAllowed = overallReadiness === "READY" && antiOverclaimRules.every((rule) => rule.claimAllowed);
  const productionReadyClaimAllowed = implementationReadyClaimAllowed;
  const fullMachineReadableAppendix = {
    machineReadable: true as const,
    generatedFrom: "V1ReportExportTruth" as const,
    includesRequirementTraceability: traceabilityMatrix.length > 0,
    includesSectionGates: sectionGates.length > 0,
    includesTruthLabels: truthLabelRows.length > 0,
    includesFindings: findings.length > 0,
    includesOmittedEvidenceSummaries: omittedEvidenceSummaries.length > 0,
    includesFullEvidenceInventory: fullEvidenceInventory.length > 0,
    exportFormats: ["PDF", "DOCX", "CSV", "JSON"] as Array<"PDF" | "DOCX" | "CSV" | "JSON">,
  };

  return {
    contract: "V1_REPORT_EXPORT_TRUTH_CONTRACT",
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
    fullMachineReadableAppendix,
    implementationReadyClaimAllowed,
    productionReadyClaimAllowed,
    findingCount: findings.length,
    blockedFindingCount,
    reviewFindingCount,
    sectionGates,
    traceabilityMatrix,
    truthLabelRows,
    findings,
    proofBoundary: [
      "Modeled: executive summary, readiness, requirements traceability, addressing, enterprise IPAM, object model, routing, security, implementation, validation, diagram truth, assumptions, review items, omitted evidence summaries, and appendices.",
      "Allowed: PDF/DOCX/CSV exports may summarize backend-computed evidence and review blockers.",
      "Blocked: reports must not claim live device state, vendor syntax correctness, cabling truth, production firewall rulebase truth, or change-window success.",
      "Required: every requirement row must show design consequence, affected planning area, frontend location, report section, diagram impact, and readiness status.",
    ],
    omittedEvidenceSummaries,
    fullEvidenceInventory,
    antiOverclaimRules,
    notes: [
      "V1 is a deliverable truth gate, not a cosmetic report rewrite.",
      "Reports remain blocked/review-required when upstream requirement, IPAM, routing, security, implementation, diagram, or validation evidence is blocked/review-required.",
    ],
  };
}
