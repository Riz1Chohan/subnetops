import type {
  BackendDiagramTruthModel,
  BackendReportTruthModel,
  DesignCoreIssue,
  NetworkObjectModel,
  V1RequirementsClosureControlSummary,
  V1CidrAddressingTruthControlSummary,
  V1EnterpriseIpamTruthControlSummary,
  V1DesignCoreOrchestratorControlSummary,
  V1StandardsAlignmentRulebookControlSummary,
  V1ValidationCoverageRow,
  V1ValidationFinding,
  V1ValidationReadinessCategory,
  V1ValidationReadinessControlSummary,
  V1ValidationRequirementGateRow,
} from "../designCore.types.js";

export const V1_VALIDATION_READINESS_AUTHORITY_CONTRACT = "V1_VALIDATION_READINESS_AUTHORITY_CONTRACT" as const;
// V1ValidationReadiness snapshot field is the strict validation/readiness gate surface.

const VALIDATION_CATEGORIES: V1ValidationReadinessCategory[] = ["BLOCKING", "REVIEW_REQUIRED", "WARNING", "INFO", "PASSED"];

type V1Input = {
  projectId: string;
  V1RequirementsClosure: V1RequirementsClosureControlSummary;
  V1CidrAddressingTruth: V1CidrAddressingTruthControlSummary;
  V1EnterpriseIpamTruth: V1EnterpriseIpamTruthControlSummary;
  V1DesignCoreOrchestrator: V1DesignCoreOrchestratorControlSummary;
  V1StandardsRulebookControl: V1StandardsAlignmentRulebookControlSummary;
  networkObjectModel: NetworkObjectModel;
  reportTruth: BackendReportTruthModel;
  diagramTruth: BackendDiagramTruthModel;
  issues: DesignCoreIssue[];
};

function toCategory(value: unknown): V1ValidationReadinessCategory {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (["BLOCKING", "BLOCKED", "ERROR", "BLOCKER"].includes(normalized)) return "BLOCKING";
  if (["REVIEW_REQUIRED", "REVIEW", "PARTIAL", "PARTIALLY_PROPAGATED", "MATERIALIZED", "CAPTURED_ONLY"].includes(normalized)) return "REVIEW_REQUIRED";
  if (["WARNING", "WARN"].includes(normalized)) return "WARNING";
  if (["INFO", "INFORMATIONAL", "NOT_APPLICABLE", "UNSUPPORTED"].includes(normalized)) return "INFO";
  if (["PASSED", "PASS", "READY", "FULLY_PROPAGATED"].includes(normalized)) return "PASSED";
  return "INFO";
}

function readinessFromCounts(blockingCount: number, reviewRequiredCount: number, warningCount: number): V1ValidationReadinessCategory {
  if (blockingCount > 0) return "BLOCKING";
  if (reviewRequiredCount > 0) return "REVIEW_REQUIRED";
  if (warningCount > 0) return "WARNING";
  return "PASSED";
}

function countByCategory(findings: V1ValidationFinding[]) {
  return {
    blockingCount: findings.filter((item) => item.category === "BLOCKING").length,
    reviewRequiredCount: findings.filter((item) => item.category === "REVIEW_REQUIRED").length,
    warningCount: findings.filter((item) => item.category === "WARNING").length,
    infoCount: findings.filter((item) => item.category === "INFO").length,
    passedCount: findings.filter((item) => item.category === "PASSED").length,
  };
}

function makeFinding(input: Omit<V1ValidationFinding, "id">): V1ValidationFinding {
  const safeCode = input.ruleCode.replace(/[^A-Z0-9_]+/gi, "_").toUpperCase();
  const scope = input.sourceSnapshotPath.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "snapshot";
  return {
    id: `V1-${safeCode.toLowerCase()}-${scope}-${input.category.toLowerCase()}`,
    ...input,
  };
}

function pushFinding(findings: V1ValidationFinding[], input: Omit<V1ValidationFinding, "id">) {
  const finding = makeFinding(input);
  findings.push({ ...finding, id: `${finding.id}-${findings.length + 1}` });
}

function summarizeCoverage(domain: string, sourceSnapshotPath: string, findingFilter: (finding: V1ValidationFinding) => boolean, findings: V1ValidationFinding[], evidence: string[]): V1ValidationCoverageRow {
  const domainFindings = findings.filter(findingFilter);
  const counts = countByCategory(domainFindings);
  const readiness = readinessFromCounts(counts.blockingCount, counts.reviewRequiredCount, counts.warningCount);
  return {
    domain,
    sourceSnapshotPath,
    blockerCount: counts.blockingCount,
    reviewRequiredCount: counts.reviewRequiredCount,
    warningCount: counts.warningCount,
    infoCount: counts.infoCount,
    passedCount: counts.passedCount,
    readiness,
    evidence,
  };
}

function buildRequirementGateRows(input: V1Input, findings: V1ValidationFinding[]): V1ValidationRequirementGateRow[] {
  return input.V1RequirementsClosure.closureMatrix
    .filter((row) => row.active)
    .map((row) => {
      const missingConsumers = Array.isArray(row.missingConsumers) ? row.missingConsumers : [];
      const validationRuleCodes = findings
        .filter((finding) => finding.affectedRequirementIds.includes(row.requirementId) || finding.affectedRequirementKeys.includes(row.key))
        .map((finding) => finding.ruleCode);
      const category = toCategory(row.readinessImpact);
      return {
        requirementId: row.requirementId,
        requirementKey: row.key,
        lifecycleStatus: row.lifecycleStatus,
        expectedAffectedEngines: row.expectedAffectedEngines,
        missingConsumers,
        validationRuleCodes: Array.from(new Set(validationRuleCodes)),
        readinessImpact: category,
        evidence: row.evidence.length > 0 ? row.evidence : [`Lifecycle status: ${row.lifecycleStatus}`],
      };
    });
}

function addV1Findings(input: V1Input, findings: V1ValidationFinding[]) {
  for (const row of input.V1RequirementsClosure.closureMatrix) {
    if (!row.active) continue;
    const category = toCategory(row.readinessImpact);
    if (category === "PASSED" || category === "INFO") continue;
    pushFinding(findings, {
      category,
      ruleCode: "VALIDATION_REQUIREMENT_PROPAGATION_GAP",
      title: `Requirement propagation is incomplete for ${row.label}`,
      detail: `${row.key} is ${row.lifecycleStatus}; missing consumers: ${row.missingConsumers.join(", ") || "none recorded"}.`,
      sourceEngine: "V1 requirements closure",
      sourceSnapshotPath: "V1RequirementsClosure.closureMatrix",
      affectedRequirementIds: [row.requirementId],
      affectedRequirementKeys: [row.key],
      affectedObjectIds: [],
      frontendImpact: row.consumerCoverage.frontendVisible ? "Frontend visible" : "Frontend evidence missing or weak",
      reportImpact: row.consumerCoverage.reportVisible ? "Report visible" : "Report evidence missing or weak",
      diagramImpact: row.consumerCoverage.diagramVisible ? "Diagram visible when relevant" : "Diagram evidence missing or not applicable",
      remediation: "Complete the requirement chain from captured input to materialized object, engine output, validation, frontend, report, and diagram evidence where relevant.",
      evidence: row.evidence,
    });
  }

  for (const scenario of input.V1RequirementsClosure.goldenScenarioClosures) {
    if (!scenario.relevant || scenario.lifecycleStatus === "passed" || scenario.lifecycleStatus === "not-applicable") continue;
    pushFinding(findings, {
      category: scenario.lifecycleStatus === "blocked" ? "BLOCKING" : "REVIEW_REQUIRED",
      ruleCode: "VALIDATION_GOLDEN_SCENARIO_CLOSURE_GAP",
      title: `Golden scenario requires ${scenario.lifecycleStatus} review: ${scenario.label}`,
      detail: `Missing requirements: ${scenario.missingRequirementKeys.join(", ") || "none"}; blocking requirements: ${scenario.blockingRequirementKeys.join(", ") || "none"}; review requirements: ${scenario.reviewRequirementKeys.join(", ") || "none"}.`,
      sourceEngine: "V1 requirements scenario proof",
      sourceSnapshotPath: "V1RequirementsClosure.goldenScenarioClosures",
      affectedRequirementIds: [],
      affectedRequirementKeys: [...scenario.requiredRequirementKeys],
      affectedObjectIds: [],
      frontendImpact: "Project Overview and Validation must show scenario closure status.",
      reportImpact: "Report must not claim scenario completeness while blockers/review items remain.",
      diagramImpact: "Diagram must not claim visual completeness for missing scenario elements.",
      remediation: "Clear the golden-scenario blockers or mark the scenario explicitly not applicable with evidence.",
      evidence: scenario.evidence,
    });
  }
}

function addV1Findings(input: V1Input, findings: V1ValidationFinding[]) {
  for (const proof of input.V1CidrAddressingTruth.edgeCaseProofs) {
    if (proof.status === "passed") continue;
    pushFinding(findings, {
      category: proof.status === "blocked" ? "BLOCKING" : "WARNING",
      ruleCode: proof.status === "blocked" ? "VALIDATION_CIDR_EDGE_CASE_BLOCKER" : "VALIDATION_CIDR_EDGE_CASE_WARNING",
      title: `CIDR edge-case proof ${proof.label} is ${proof.status}`,
      detail: proof.evidence.join(" ") || "CIDR edge-case evidence is incomplete.",
      sourceEngine: "Engine 1 CIDR/addressing",
      sourceSnapshotPath: "V1CidrAddressingTruth.edgeCaseProofs",
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: [proof.id],
      frontendImpact: "Addressing and Validation views must show CIDR proof state.",
      reportImpact: "Report addressing section must preserve CIDR proof warnings/blockers.",
      diagramImpact: "Diagram labels must not hide invalid or review-gated address objects.",
      remediation: "Fix the CIDR edge case or keep the affected addressing object review-gated.",
      evidence: proof.evidence,
    });
  }

  for (const row of input.V1CidrAddressingTruth.addressingTruthRows) {
    const category = toCategory(row.readinessImpact);
    if (category === "PASSED" || category === "INFO") continue;
    pushFinding(findings, {
      category,
      ruleCode: "VALIDATION_CIDR_ADDRESSING_READINESS_GAP",
      title: `Addressing readiness gap on ${row.siteName} VLAN ${row.vlanId}`,
      detail: `${row.vlanName} is ${row.readinessImpact}: ${row.blockers.join(" ") || row.evidence.join(" ")}`,
      sourceEngine: "Engine 1 CIDR/addressing",
      sourceSnapshotPath: "V1CidrAddressingTruth.addressingTruthRows",
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: [row.rowId],
      frontendImpact: "Addressing and Validation views must show this as not clean.",
      reportImpact: "Report addressing table must not present this row as implementation-ready.",
      diagramImpact: "Diagram subnet labels must preserve invalid/review state.",
      remediation: "Resolve invalid CIDR, capacity, gateway, site-block, or overlap evidence before implementation handoff.",
      evidence: row.evidence,
    });
  }

  for (const row of input.V1CidrAddressingTruth.requirementAddressingMatrix) {
    const category = toCategory(row.readinessImpact);
    if (!row.active || category === "PASSED" || category === "INFO") continue;
    pushFinding(findings, {
      category,
      ruleCode: "VALIDATION_REQUIREMENT_ADDRESSING_GAP",
      title: `Requirement ${row.requirementKey} has unresolved addressing impact`,
      detail: `${row.expectedAddressingImpact}. Missing: ${row.missingAddressingEvidence.join(" ") || "none recorded"}.`,
      sourceEngine: "Engine 1 CIDR/addressing",
      sourceSnapshotPath: "V1CidrAddressingTruth.requirementAddressingMatrix",
      affectedRequirementIds: [],
      affectedRequirementKeys: [row.requirementKey],
      affectedObjectIds: [],
      frontendImpact: "Overview and Addressing pages must show requirement-to-addressing gap.",
      reportImpact: "Report requirement traceability and addressing sections must show the gap.",
      diagramImpact: "Diagram must not invent a segment/address label for an unmaterialized requirement.",
      remediation: "Materialize the segment/addressing object or record explicit review/no-op evidence.",
      evidence: row.materializedAddressingEvidence,
    });
  }
}

function addV1Findings(input: V1Input, findings: V1ValidationFinding[]) {
  for (const row of input.V1EnterpriseIpamTruth.reconciliationRows) {
    const category = toCategory(row.readinessImpact);
    if (category === "PASSED" || category === "INFO") continue;
    pushFinding(findings, {
      category,
      ruleCode: "VALIDATION_IPAM_DURABLE_AUTHORITY_GAP",
      title: `Engine 2 IPAM authority is unresolved for ${row.siteName} VLAN ${row.vlanId}`,
      detail: `${row.reconciliationState}. ${[...row.blockers, ...row.reviewReasons].join(" ") || "Durable authority is not clean."}`,
      sourceEngine: "Engine 2 enterprise IPAM",
      sourceSnapshotPath: "V1EnterpriseIpamTruth.reconciliationRows",
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: [row.rowId, row.engine2AllocationId, row.engine2PoolId].filter((item): item is string => Boolean(item)),
      frontendImpact: "Enterprise IPAM and Validation pages must show durable authority state.",
      reportImpact: "Report must separate Engine 1 proposal from Engine 2 approval/conflict.",
      diagramImpact: "Diagram address labels must not imply approval when IPAM is blocked or review-gated.",
      remediation: "Resolve allocation approval, stale hash, pool conflict, DHCP/reservation conflict, or brownfield overlap before readiness is allowed.",
      evidence: row.evidence,
    });
  }

  for (const row of input.V1EnterpriseIpamTruth.requirementIpamMatrix) {
    const category = toCategory(row.readinessImpact);
    if (!row.active || category === "PASSED" || category === "INFO") continue;
    pushFinding(findings, {
      category,
      ruleCode: "VALIDATION_REQUIREMENT_IPAM_GAP",
      title: `Requirement ${row.requirementKey} has unresolved durable IPAM impact`,
      detail: `${row.expectedIpamImpact}. Missing: ${row.missingIpamEvidence.join(" ") || "none recorded"}.`,
      sourceEngine: "Engine 2 enterprise IPAM",
      sourceSnapshotPath: "V1EnterpriseIpamTruth.requirementIpamMatrix",
      affectedRequirementIds: [],
      affectedRequirementKeys: [row.requirementKey],
      affectedObjectIds: [],
      frontendImpact: "Enterprise IPAM and Overview pages must show requirement-to-IPAM state.",
      reportImpact: "Report must show whether the requirement is only planned or durable/approved.",
      diagramImpact: "Diagram must not turn proposal-only addressing into approved durable truth.",
      remediation: "Create, approve, or review the durable IPAM object tied to this requirement.",
      evidence: row.materializedIpamEvidence,
    });
  }
}

function addV1And7Findings(input: V1Input, findings: V1ValidationFinding[]) {
  for (const finding of input.V1DesignCoreOrchestrator.boundaryFindings) {
    pushFinding(findings, {
      category: toCategory(finding.readinessImpact),
      ruleCode: "VALIDATION_ORCHESTRATOR_BOUNDARY_GAP",
      title: finding.title,
      detail: finding.detail,
      sourceEngine: "Design-core orchestrator",
      sourceSnapshotPath: finding.affectedSnapshotPath,
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: [],
      frontendImpact: "Frontend consumers must preserve design-core boundary state instead of recomputing truth.",
      reportImpact: "Report sections must cite backend snapshot sections and not invent facts.",
      diagramImpact: "Diagram must render backend-truth objects only.",
      remediation: "Restore the missing/review-gated snapshot section or keep the downstream consumer blocked/review-gated.",
      evidence: [finding.code, finding.affectedSnapshotPath],
    });
  }

  for (const finding of input.V1StandardsRulebookControl.findings) {
    pushFinding(findings, {
      category: toCategory(finding.severity),
      ruleCode: "VALIDATION_STANDARDS_RULE_GAP",
      title: finding.title,
      detail: finding.detail,
      sourceEngine: "Standards alignment / rulebook",
      sourceSnapshotPath: "V1StandardsRulebookControl.findings",
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: finding.affectedObjectIds,
      frontendImpact: "Standards and Validation pages must expose active rule state.",
      reportImpact: "Report must include standards blockers/review items and remediation.",
      diagramImpact: "Diagram warnings may be shown where the affected object is visual.",
      remediation: finding.remediationGuidance,
      evidence: [finding.affectedEngine, finding.ruleId],
    });
  }
}

function addDesignReadinessFindings(input: V1Input, findings: V1ValidationFinding[]) {
  const routing = input.networkObjectModel.routingSegmentation.summary;
  if (routing.routingReadiness !== "ready" || routing.segmentationReadiness !== "ready") {
    pushFinding(findings, {
      category: routing.routingReadiness === "blocked" || routing.segmentationReadiness === "blocked" ? "BLOCKING" : "REVIEW_REQUIRED",
      ruleCode: "VALIDATION_ROUTING_SEGMENTATION_READINESS_GAP",
      title: "Routing/segmentation readiness is not clean",
      detail: `Routing ${routing.routingReadiness}; segmentation ${routing.segmentationReadiness}; ${routing.blockingFindingCount} blocking finding(s), ${routing.reachabilityFindingCount} reachability finding(s).`,
      sourceEngine: "Routing/segmentation",
      sourceSnapshotPath: "networkObjectModel.routingSegmentation.summary",
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: [],
      frontendImpact: "Routing and Validation pages must keep routing readiness review-gated.",
      reportImpact: "Report routing review must not claim protocol-ready implementation.",
      diagramImpact: "WAN/routing diagram overlays must preserve missing/review path state.",
      remediation: "Resolve missing routes, route-domain gaps, reachability blockers, or segmentation conflicts before implementation readiness.",
      evidence: routing.notes,
    });
  }

  const security = input.networkObjectModel.securityPolicyFlow.summary;
  if (security.policyReadiness !== "ready" || security.natReadiness !== "ready") {
    pushFinding(findings, {
      category: security.policyReadiness === "blocked" || security.natReadiness === "blocked" ? "BLOCKING" : "REVIEW_REQUIRED",
      ruleCode: "VALIDATION_SECURITY_POLICY_READINESS_GAP",
      title: "Security policy / NAT readiness is not clean",
      detail: `Policy ${security.policyReadiness}; NAT ${security.natReadiness}; ${security.blockingFindingCount} blocking finding(s), ${security.missingPolicyCount} missing policy item(s), ${security.missingNatCount} missing NAT item(s).`,
      sourceEngine: "Security policy flow",
      sourceSnapshotPath: "networkObjectModel.securityPolicyFlow.summary",
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: [],
      frontendImpact: "Security and Validation pages must show unresolved flow/NAT state.",
      reportImpact: "Report security section must show missing, overbroad, NAT, and logging review items.",
      diagramImpact: "Security-zone/flow diagrams must not hide missing or conflicted flows.",
      remediation: "Resolve required flow, NAT, broad-permit, shadowing, and logging findings before readiness is allowed.",
      evidence: security.notes,
    });
  }

  const implementation = input.networkObjectModel.implementationPlan.summary;
  if (implementation.implementationReadiness !== "ready") {
    pushFinding(findings, {
      category: implementation.implementationReadiness === "blocked" ? "BLOCKING" : "REVIEW_REQUIRED",
      ruleCode: "VALIDATION_IMPLEMENTATION_READINESS_GAP",
      title: "Implementation plan is not execution-ready",
      detail: `${implementation.blockedStepCount} blocked step(s), ${implementation.reviewStepCount} review step(s), ${implementation.blockingFindingCount} blocking finding(s).`,
      sourceEngine: "Implementation planning",
      sourceSnapshotPath: "networkObjectModel.implementationPlan.summary",
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: [],
      frontendImpact: "Implementation and Validation pages must show gated steps.",
      reportImpact: "Report implementation plan must keep blocked/review states visible.",
      diagramImpact: "Implementation-view diagram must only show verified upstream objects or review gates.",
      remediation: "Resolve upstream object, policy, routing, verification, and rollback blockers before execution readiness.",
      evidence: implementation.notes,
    });
  }

  if (input.reportTruth.overallReadiness !== "ready") {
    pushFinding(findings, {
      category: input.reportTruth.overallReadiness === "blocked" ? "BLOCKING" : "WARNING",
      ruleCode: "VALIDATION_REPORT_TRUTH_WARNING",
      title: "Report truth is not fully clean",
      detail: `${input.reportTruth.overallReadinessLabel}; blocked findings ${input.reportTruth.blockedFindings.length}, review findings ${input.reportTruth.reviewFindings.length}.`,
      sourceEngine: "Report/export truth",
      sourceSnapshotPath: "reportTruth",
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: [],
      frontendImpact: "Project Report page must preserve report-truth readiness.",
      reportImpact: "Export must not overclaim authoritative readiness.",
      diagramImpact: "Diagram evidence referenced by report must remain backend-truth labeled.",
      remediation: "Clear backend report-truth blockers/review items or label them explicitly in the export.",
      evidence: input.reportTruth.limitations,
    });
  }

  if (input.diagramTruth.overallReadiness !== "ready") {
    pushFinding(findings, {
      category: input.diagramTruth.overallReadiness === "blocked" ? "BLOCKING" : "WARNING",
      ruleCode: "VALIDATION_DIAGRAM_TRUTH_WARNING",
      title: "Diagram truth is not fully clean",
      detail: `${input.diagramTruth.overallReadiness}; ${input.diagramTruth.hotspots.length} hotspot(s), modeled topology: ${input.diagramTruth.hasModeledTopology ? "yes" : "no"}.`,
      sourceEngine: "Diagram truth",
      sourceSnapshotPath: "diagramTruth",
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: [],
      frontendImpact: "Diagram page must show backend-truth readiness and empty-state reason.",
      reportImpact: "Report diagram section must not use pretty topology as proof if backend truth is weak.",
      diagramImpact: "Diagram itself must show backend object and readiness labels.",
      remediation: "Resolve missing backend objects/edges or keep diagram in review/empty-state.",
      evidence: input.diagramTruth.hotspots.map((item) => item.detail),
    });
  }
}

function addDesignCoreIssueFindings(input: V1Input, findings: V1ValidationFinding[]) {
  const hiddenCodes = new Set(["STANDARDS_REQUIRED_RULE_BLOCKER"]);
  for (const issue of input.issues) {
    if (hiddenCodes.has(issue.code)) continue;
    if (issue.severity === "INFO") continue;
    pushFinding(findings, {
      category: issue.severity === "ERROR" ? "BLOCKING" : "WARNING",
      ruleCode: "VALIDATION_DESIGN_CORE_ISSUE",
      title: issue.title,
      detail: issue.detail,
      sourceEngine: "Design-core validation issue",
      sourceSnapshotPath: "issues",
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: [issue.entityId].filter((item): item is string => Boolean(item)),
      frontendImpact: "Validation and affected design pages must show the issue.",
      reportImpact: "Report validation findings must show the issue without burying it.",
      diagramImpact: issue.entityType === "VLAN" || issue.entityType === "SITE" ? "Diagram labels/empty states must not hide the issue." : "No direct diagram impact unless tied to a visual object.",
      remediation: "Resolve the upstream design-core issue or keep the affected output review-gated.",
      evidence: [issue.code, issue.entityType],
    });
  }
}

export function buildV1ValidationReadinessControl(input: V1Input): V1ValidationReadinessControlSummary {
  const findings: V1ValidationFinding[] = [];

  addV1Findings(input, findings);
  addV1Findings(input, findings);
  addV1Findings(input, findings);
  addV1And7Findings(input, findings);
  addDesignReadinessFindings(input, findings);
  addDesignCoreIssueFindings(input, findings);

  if (findings.length === 0) {
    pushFinding(findings, {
      category: "PASSED",
      ruleCode: "VALIDATION_PASSED_STRICT_READINESS_GATE",
      title: "Strict validation readiness gate passed",
      detail: "No V1 blocking, review-required, or warning findings were produced by the current backend control surfaces.",
      sourceEngine: "Validation/readiness",
      sourceSnapshotPath: "V1ValidationReadiness",
      affectedRequirementIds: [],
      affectedRequirementKeys: [],
      affectedObjectIds: [],
      frontendImpact: "Validation pages may show passed state.",
      reportImpact: "Report may show passed validation state while preserving limitations.",
      diagramImpact: "Diagram may render backend truth without V1 warnings.",
      remediation: "Continue engineer review against live inventory and vendor implementation specifics.",
      evidence: ["No generated V1 findings."],
    });
  }

  const counts = countByCategory(findings);
  const overallReadiness = readinessFromCounts(counts.blockingCount, counts.reviewRequiredCount, counts.warningCount);
  const validationGateAllowsImplementation = counts.blockingCount === 0 && counts.reviewRequiredCount === 0;
  const requirementGateRows = buildRequirementGateRows(input, findings);

  const coverageRows: V1ValidationCoverageRow[] = [
    summarizeCoverage("Requirements propagation", "V1RequirementsClosure", (finding) => finding.sourceSnapshotPath.startsWith("V1"), findings, [
      `${input.V1RequirementsClosure.fullPropagatedCount}/${input.V1RequirementsClosure.activeRequirementCount} active requirement(s) fully propagated.`,
      `${input.V1RequirementsClosure.missingConsumerCount} missing consumer gap(s).`,
    ]),
    summarizeCoverage("CIDR/addressing", "V1CidrAddressingTruth", (finding) => finding.sourceSnapshotPath.startsWith("V1"), findings, [
      `${input.V1CidrAddressingTruth.validSubnetCount}/${input.V1CidrAddressingTruth.totalAddressRowCount} valid subnet row(s).`,
      `${input.V1CidrAddressingTruth.requirementAddressingGapCount} requirement-to-addressing gap(s).`,
    ]),
    summarizeCoverage("Enterprise IPAM", "V1EnterpriseIpamTruth", (finding) => finding.sourceSnapshotPath.startsWith("V1"), findings, [
      `${input.V1EnterpriseIpamTruth.approvedAllocationCount} approved allocation(s); ${input.V1EnterpriseIpamTruth.conflictBlockerCount} conflict blocker(s).`,
      `Overall Engine 2 readiness: ${input.V1EnterpriseIpamTruth.overallReadiness}.`,
    ]),
    summarizeCoverage("Design-core orchestrator", "V1DesignCoreOrchestrator", (finding) => finding.sourceEngine === "Design-core orchestrator", findings, [
      `${input.V1DesignCoreOrchestrator.presentSnapshotSectionCount}/${input.V1DesignCoreOrchestrator.requiredSnapshotSectionCount} snapshot section(s) present.`,
      `${input.V1DesignCoreOrchestrator.boundaryFindings.length} boundary finding(s).`,
    ]),
    summarizeCoverage("Standards rulebook", "V1StandardsRulebookControl", (finding) => finding.sourceEngine === "Standards alignment / rulebook", findings, [
      `${input.V1StandardsRulebookControl.passRuleCount} pass; ${input.V1StandardsRulebookControl.blockingRuleCount} block; ${input.V1StandardsRulebookControl.reviewRuleCount} review.`,
    ]),
    summarizeCoverage("Routing and segmentation", "networkObjectModel.routingSegmentation", (finding) => finding.sourceEngine === "Routing/segmentation", findings, [
      `Routing ${input.networkObjectModel.routingSegmentation.summary.routingReadiness}; segmentation ${input.networkObjectModel.routingSegmentation.summary.segmentationReadiness}.`,
    ]),
    summarizeCoverage("Security policy flow", "networkObjectModel.securityPolicyFlow", (finding) => finding.sourceEngine === "Security policy flow", findings, [
      `Policy ${input.networkObjectModel.securityPolicyFlow.summary.policyReadiness}; NAT ${input.networkObjectModel.securityPolicyFlow.summary.natReadiness}.`,
    ]),
    summarizeCoverage("Implementation planning", "networkObjectModel.implementationPlan", (finding) => finding.sourceEngine === "Implementation planning", findings, [
      `Implementation readiness ${input.networkObjectModel.implementationPlan.summary.implementationReadiness}.`,
    ]),
    summarizeCoverage("Report/export truth", "reportTruth", (finding) => finding.sourceEngine === "Report/export truth", findings, [
      `Report truth ${input.reportTruth.overallReadiness}.`,
    ]),
    summarizeCoverage("Diagram truth", "diagramTruth", (finding) => finding.sourceEngine === "Diagram truth", findings, [
      `Diagram truth ${input.diagramTruth.overallReadiness}.`,
    ]),
  ];

  return {
    contractVersion: V1_VALIDATION_READINESS_AUTHORITY_CONTRACT,
    validationRole: "STRICT_READINESS_AUTHORITY_NOT_ADVISORY_SUMMARY",
    validationCategories: VALIDATION_CATEGORIES,
    overallReadiness,
    validationGateAllowsImplementation,
    findingCount: findings.length,
    blockingFindingCount: counts.blockingCount,
    reviewRequiredFindingCount: counts.reviewRequiredCount,
    warningFindingCount: counts.warningCount,
    infoFindingCount: counts.infoCount,
    passedFindingCount: counts.passedCount,
    requirementGateCount: requirementGateRows.length,
    blockedRequirementGateCount: requirementGateRows.filter((row) => row.readinessImpact === "BLOCKING").length,
    reviewRequirementGateCount: requirementGateRows.filter((row) => row.readinessImpact === "REVIEW_REQUIRED").length,
    coverageRows,
    requirementGateRows,
    findings,
    notes: [
      "V1 is a readiness gate, not a feature engine.",
      "A design is not implementation-ready while blocking or review-required validation findings remain.",
      "Report and diagram warnings are surfaced as validation evidence so exports and visuals cannot overclaim backend truth.",
    ],
  };
}
