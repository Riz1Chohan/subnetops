import type {
  V1EngineProofRow,
  V1FinalProofPassControlSummary,
  V1Finding,
  V1ProofReadiness,
  V1ReleaseGateRow,
  V1ReleaseGateState,
  V1ScenarioProofRow,
} from "../designCore.types.js";

export const V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT = "V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT" as const;
export const V1_PROOF_ROLE = "FINAL_CROSS_ENGINE_REQUIREMENT_TO_RELEASE_PROOF_GATE" as const;
export const V1_RELEASE_TARGET = "A_MINUS_A_PLANNING_PLATFORM_NOT_A_PLUS" as const;

type StageSummary = object | null | undefined;

type V1Context = {
  projectName?: string;
  siteCount?: number;
  vlanCount?: number;
  issueCount?: number;
  V1TraceabilityControl?: StageSummary;
  V1RequirementsMaterialization?: StageSummary;
  V1RequirementsClosure?: StageSummary;
  V1CidrAddressingTruth?: StageSummary;
  V1EnterpriseIpamTruth?: StageSummary;
  V1DesignCoreOrchestrator?: StageSummary;
  V1StandardsRulebookControl?: StageSummary;
  V1ValidationReadiness?: StageSummary;
  V1NetworkObjectModel?: StageSummary;
  V1DesignGraph?: StageSummary;
  V1RoutingSegmentation?: StageSummary;
  V1SecurityPolicyFlow?: StageSummary;
  V1ImplementationPlanning?: StageSummary;
  V1ImplementationTemplates?: StageSummary;
  V1ReportExportTruth?: StageSummary;
  V1DiagramTruth?: StageSummary;
  V1PlatformBomFoundation?: StageSummary;
  V1DiscoveryCurrentState?: StageSummary;
  V1AiDraftHelper?: StageSummary;
  requirementsScenarioProof?: StageSummary;
  reportTruth?: StageSummary;
  diagramTruth?: StageSummary;
};

type ExpectedEngine = {
  stage: number;
  engineKey: keyof V1Context;
  expectedContract: string;
  proofFocus: string;
};

type ScenarioDefinition = {
  scenarioKey: string;
  scenarioName: string;
  requirementsCovered: string[];
  expectedStageNumbers: number[];
  notes: string[];
};

const PROPAGATION_CHAIN = [
  "requirement input",
  "normalized requirement signal",
  "materialized source object or explicit no-op/review reason",
  "backend design-core input",
  "engine-specific computation",
  "traceability evidence",
  "validation/readiness impact",
  "frontend display",
  "report/export impact",
  "diagram impact where relevant",
  "test/golden scenario proof",
];

const EXPECTED_ENGINES: ExpectedEngine[] = [
  { stage: 1, engineKey: "V1TraceabilityControl", expectedContract: "V1_PLANNING_INPUT_DISCIPLINE_TRACEABILITY", proofFocus: "source/confidence/proof labels on design outputs" },
  { stage: 2, engineKey: "V1RequirementsMaterialization", expectedContract: "V1_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT", proofFocus: "requirements materialize into source objects, signals, blockers, review items, no-ops, or unsupported states" },
  { stage: 3, engineKey: "V1RequirementsClosure", expectedContract: "V1_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF", proofFocus: "nothing gets lost between capture, materialization, engines, UI, report, and diagram" },
  { stage: 4, engineKey: "V1CidrAddressingTruth", expectedContract: "V1_ENGINE1_CIDR_ADDRESSING_TRUTH", proofFocus: "CIDR/addressing math and requirement-driven host demand proof" },
  { stage: 5, engineKey: "V1EnterpriseIpamTruth", expectedContract: "V1_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW", proofFocus: "Engine 1 planner reconciles with Engine 2 durable IPAM authority" },
  { stage: 6, engineKey: "V1DesignCoreOrchestrator", expectedContract: "V1_DESIGN_CORE_ORCHESTRATOR_CONTRACT", proofFocus: "design-core coordinates engines without becoming a god-file authority mess" },
  { stage: 7, engineKey: "V1StandardsRulebookControl", expectedContract: "V1_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT", proofFocus: "standards activate by requirement/object applicability with severity and remediation" },
  { stage: 8, engineKey: "V1ValidationReadiness", expectedContract: "V1_VALIDATION_READINESS_AUTHORITY_CONTRACT", proofFocus: "validation aggregates readiness across all truth-bearing engines" },
  { stage: 9, engineKey: "V1NetworkObjectModel", expectedContract: "V1_NETWORK_OBJECT_MODEL_TRUTH_CONTRACT", proofFocus: "devices/interfaces/links/zones/policies/NAT/DHCP/reservations carry truth labels" },
  { stage: 10, engineKey: "V1DesignGraph", expectedContract: "V1_DESIGN_GRAPH_DEPENDENCY_INTEGRITY_CONTRACT", proofFocus: "dependency graph connects requirements, objects, relationships, and consumers" },
  { stage: 11, engineKey: "V1RoutingSegmentation", expectedContract: "V1_ROUTING_SEGMENTATION_PROTOCOL_AWARE_PLANNING_CONTRACT", proofFocus: "routing and segmentation are honest intent/review/blocker outputs, not fake simulation" },
  { stage: 12, engineKey: "V1SecurityPolicyFlow", expectedContract: "V1_SECURITY_POLICY_FLOW_CONTRACT", proofFocus: "zone/service/NAT/logging policy consequences and review gates" },
  { stage: 13, engineKey: "V1ImplementationPlanning", expectedContract: "V1_IMPLEMENTATION_PLANNING_CONTRACT", proofFocus: "implementation steps are gated on verified upstream source objects" },
  { stage: 14, engineKey: "V1ImplementationTemplates", expectedContract: "V1_VENDOR_NEUTRAL_IMPLEMENTATION_TEMPLATES_CONTRACT", proofFocus: "templates stay vendor-neutral and show missing data blockers/evidence/rollback" },
  { stage: 15, engineKey: "V1ReportExportTruth", expectedContract: "V1_REPORT_EXPORT_TRUTH_CONTRACT", proofFocus: "reports/exports include traceability and do not overclaim backend proof" },
  { stage: 16, engineKey: "V1DiagramTruth", expectedContract: "V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT", proofFocus: "diagrams render backend truth only, with visible inferred/review labels" },
  { stage: 17, engineKey: "V1PlatformBomFoundation", expectedContract: "V1_PLATFORM_BOM_FOUNDATION_CONTRACT", proofFocus: "BOM is backend-controlled advisory estimate with calculation basis and review notes" },
  { stage: 18, engineKey: "V1DiscoveryCurrentState", expectedContract: "V1_DISCOVERY_CURRENT_STATE_CONTRACT", proofFocus: "discovery/current-state separates not-provided/manual/imported/validated/conflicting/review states" },
  { stage: 19, engineKey: "V1AiDraftHelper", expectedContract: "V1_AI_DRAFT_HELPER_CONTRACT", proofFocus: "AI stays draft-only, review-required, and non-authoritative" },
];

const SCENARIOS: ScenarioDefinition[] = [
  { scenarioKey: "small-office", scenarioName: "Small office", requirementsCovered: ["planningFor", "usersPerSite", "siteCount", "basic VLAN/addressing"], expectedStageNumbers: [1, 2, 3, 4, 7, 8, 9, 10, 13, 15, 16], notes: ["Baseline scenario must prove the normal path without hiding missing requirements behind defaults."] },
  { scenarioKey: "healthcare-clinic", scenarioName: "Healthcare clinic", requirementsCovered: ["security-sensitive", "guest access", "segmentation", "report evidence"], expectedStageNumbers: [1, 2, 3, 4, 7, 8, 9, 10, 12, 13, 15, 16], notes: ["Security-sensitive outputs must be review-labelled where the backend cannot prove policy implementation."] },
  { scenarioKey: "multi-site-enterprise", scenarioName: "Multi-site enterprise", requirementsCovered: ["multiSite", "siteCount", "WAN", "summary routes", "inter-site reachability"], expectedStageNumbers: [1, 2, 3, 4, 5, 8, 10, 11, 13, 15, 16, 18], notes: ["Multi-site planning must feed addressing, IPAM, routing review, diagram, and discovery tasks."] },
  { scenarioKey: "ten-site-enterprise", scenarioName: "10-site enterprise", requirementsCovered: ["siteCount", "large topology", "WAN scale", "diagram readability", "BOM scale"], expectedStageNumbers: [1, 2, 3, 4, 5, 8, 9, 10, 11, 16, 17, 18], notes: ["Large designs must expose review states instead of collapsing into pretty garbage."] },
  { scenarioKey: "guest-wifi-heavy", scenarioName: "Guest Wi-Fi heavy", requirementsCovered: ["guestAccess", "wireless", "isolation", "DHCP", "security zones"], expectedStageNumbers: [1, 2, 3, 4, 7, 8, 9, 11, 12, 13, 16, 17], notes: ["Guest isolation must have routing, security, validation, diagram, and BOM consequences."] },
  { scenarioKey: "voice-wireless", scenarioName: "Voice + wireless", requirementsCovered: ["voice", "wireless", "PoE", "VLANs", "QoS review"], expectedStageNumbers: [1, 2, 3, 4, 7, 8, 13, 14, 15, 17], notes: ["Voice/wireless should drive addressing, implementation review, templates, and advisory platform/BOM estimates."] },
  { scenarioKey: "cloud-hybrid", scenarioName: "Cloud/hybrid", requirementsCovered: ["cloudHybrid", "cloud edge", "route tables", "boundary policy", "discovery/import review"], expectedStageNumbers: [1, 2, 3, 5, 7, 8, 10, 11, 12, 13, 15, 18], notes: ["Cloud outputs must stay review-required unless actual cloud network objects/imports exist."] },
  { scenarioKey: "dual-isp", scenarioName: "Dual ISP", requirementsCovered: ["dualIsp", "WAN resilience", "failover routing", "implementation blockers"], expectedStageNumbers: [1, 2, 3, 5, 7, 8, 11, 13, 15, 16, 18], notes: ["Dual ISP must create routing/failover evidence or a blocker; it must not create fake circuits."] },
  { scenarioKey: "brownfield-migration", scenarioName: "Brownfield migration", requirementsCovered: ["brownfield", "migration", "current-state", "IPAM conflict", "route/firewall comparison"], expectedStageNumbers: [1, 2, 3, 5, 8, 9, 10, 12, 13, 15, 18], notes: ["Brownfield mode must create import/reconciliation tasks and distinguish missing current-state evidence."] },
  { scenarioKey: "overlapping-vrf-ipam", scenarioName: "Overlapping VRF/IPAM", requirementsCovered: ["route domains", "VRF overlap", "durable IPAM", "standards/validation"], expectedStageNumbers: [1, 3, 4, 5, 7, 8, 10, 11, 15, 18], notes: ["Overlaps are only acceptable with route-domain/IPAM evidence; otherwise they stay blocked/review-required."] },
  { scenarioKey: "security-sensitive-environment", scenarioName: "Security-sensitive environment", requirementsCovered: ["management access", "remote access", "DMZ", "logging", "default deny"], expectedStageNumbers: [1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 15, 16], notes: ["Security claims must be policy consequences and review findings, not marketing text."] },
  { scenarioKey: "large-vlan-site-count", scenarioName: "Large VLAN/site count", requirementsCovered: ["large VLAN count", "site reserve", "capacity", "diagram layout", "export scale"], expectedStageNumbers: [1, 2, 3, 4, 5, 8, 9, 10, 15, 16, 17], notes: ["Scale pressure must remain deterministic and reportable, with frontend using backend truth only."] },
];

function asRecord(value: StageSummary): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readinessText(summary: StageSummary): string {
  const record = asRecord(summary);
  return asString(record.overallReadiness)
    || asString(record.sourceOfTruthReadiness)
    || asString(record.designReviewReadiness)
    || asString(record.readiness)
    || asString(record.status)
    || "UNKNOWN";
}

function normalizeReadiness(summary: StageSummary): V1ProofReadiness {
  if (!summary) return "BLOCKED";
  const text = readinessText(summary).toUpperCase();
  if (text.includes("BLOCK") || text.includes("MISSING") || text.includes("ERROR")) return "BLOCKED";
  if (text.includes("REVIEW") || text.includes("NOT_READY") || text.includes("DRAFT") || text.includes("ADVISORY")) return "REVIEW_REQUIRED";
  return "PROOF_READY";
}

function expectedContractPresent(summary: StageSummary, expectedContract: string): boolean {
  const record = asRecord(summary);
  return Object.values(record).some((value) => typeof value === "string" && value.includes(expectedContract));
}

function buildEngineProofRows(context: V1Context): V1EngineProofRow[] {
  return EXPECTED_ENGINES.map((engine) => {
    const summary = context[engine.engineKey] as StageSummary;
    const readinessImpact = normalizeReadiness(summary);
    const contractPresent = expectedContractPresent(summary, engine.expectedContract);
    const findingCount = asNumber(asRecord(summary).findingCount, asNumber(asRecord(summary).blockingFindingCount, 0));
    const blockerCount = asNumber(asRecord(summary).blockingFindingCount, asNumber(asRecord(summary).missingGateCount, 0));
    const status: V1EngineProofRow["status"] = !summary ? "MISSING" : !contractPresent ? "CONTRACT_GAP" : readinessImpact === "BLOCKED" ? "BLOCKED" : readinessImpact === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "PROVEN";
    const blockers: string[] = [];
    if (!summary) blockers.push("Engine summary missing from design-core snapshot.");
    if (summary && !contractPresent) blockers.push(`Expected contract marker ${engine.expectedContract} was not visible in the summary.`);
    if (blockerCount > 0) blockers.push(`${blockerCount} blocking/gate finding(s) reported by this engine.`);

    return {
      contract: V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      stage: engine.stage,
      engineKey: String(engine.engineKey),
      expectedContract: engine.expectedContract,
      status,
      readinessImpact: status === "MISSING" || status === "CONTRACT_GAP" ? "BLOCKED" : readinessImpact,
      proofFocus: engine.proofFocus,
      evidence: summary ? [`Readiness: ${readinessText(summary)}`, `Contract visible: ${contractPresent ? "yes" : "no"}`, `Finding count signal: ${findingCount}`] : ["No summary in snapshot"],
      blockers,
    };
  });
}

function engineByStage(rows: V1EngineProofRow[]) {
  return new Map(rows.map((row) => [row.stage, row]));
}

function buildScenarioRows(engineRows: V1EngineProofRow[]): V1ScenarioProofRow[] {
  const rowsByStage = engineByStage(engineRows);
  return SCENARIOS.map((scenario) => {
    const expectedRows = scenario.expectedStageNumbers.map((stage) => rowsByStage.get(stage)).filter(Boolean) as V1EngineProofRow[];
    const missingStages = scenario.expectedStageNumbers.filter((stage) => !rowsByStage.has(stage));
    const blockedEngines = expectedRows.filter((row) => row.readinessImpact === "BLOCKED");
    const reviewEngines = expectedRows.filter((row) => row.readinessImpact === "REVIEW_REQUIRED");
    const readinessImpact: V1ProofReadiness = missingStages.length || blockedEngines.length ? "BLOCKED" : reviewEngines.length ? "REVIEW_REQUIRED" : "PROOF_READY";
    return {
      contract: V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      scenarioKey: scenario.scenarioKey,
      scenarioName: scenario.scenarioName,
      requirementsCovered: scenario.requirementsCovered,
      expectedProofChain: PROPAGATION_CHAIN,
      expectedEngineStages: scenario.expectedStageNumbers,
      actualEvidence: expectedRows.map((row) => `Stage ${row.stage} ${row.engineKey}: ${row.status} (${row.readinessImpact})`),
      missingEvidence: [
        ...missingStages.map((stage) => `Stage ${stage} engine proof row missing.`),
        ...blockedEngines.map((row) => `Stage ${row.stage} ${row.engineKey} is ${row.status}.`),
      ],
      readinessImpact,
      notes: scenario.notes,
    };
  });
}

function gateStateFromRows(requiredStages: number[], engineRows: V1EngineProofRow[]): V1ReleaseGateState {
  const rowsByStage = engineByStage(engineRows);
  const rows = requiredStages.map((stage) => rowsByStage.get(stage));
  if (rows.some((row) => !row || row.readinessImpact === "BLOCKED")) return "BLOCKED";
  if (rows.some((row) => row?.readinessImpact === "REVIEW_REQUIRED")) return "REVIEW_REQUIRED";
  return "PASSED";
}

function buildReleaseGates(context: V1Context, engineRows: V1EngineProofRow[], scenarioRows: V1ScenarioProofRow[]): V1ReleaseGateRow[] {
  const scenarioBlocked = scenarioRows.filter((row) => row.readinessImpact === "BLOCKED").length;
  const scenarioReview = scenarioRows.filter((row) => row.readinessImpact === "REVIEW_REQUIRED").length;
  const reportRecord = asRecord(context.reportTruth);
  const diagramRecord = asRecord(context.diagramTruth);
  const reportBlocked = asNumber(reportRecord.blockedFindingCount, 0) > 0;
  const diagramHasBackendModel = Boolean(diagramRecord.renderModel || diagramRecord.nodes || diagramRecord.overallReadiness);

  const gates: V1ReleaseGateRow[] = [
    {
      contract: V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "requirements-propagation-chain",
      gate: "Requirements propagate from input through materialization, closure, validation, UI/report/diagram consumers, and scenario proof",
      required: true,
      state: gateStateFromRows([1, 2, 3, 8, 15, 16], engineRows),
      evidence: ["V1 traceability", "V1 materialization", "V1 closure", "V1 validation", "V1 report/export", "V1 diagram truth"],
      remediation: "Fix the first missing/broken propagation engine before calling the release proof complete.",
    },
    {
      contract: V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "addressing-ipam-foundation",
      gate: "CIDR/addressing planner and durable IPAM reconciliation are both visible",
      required: true,
      state: gateStateFromRows([4, 5], engineRows),
      evidence: ["V1 CIDR/addressing", "V1 enterprise IPAM"],
      remediation: "Do not proceed with implementation/report confidence until Engine 1 and Engine 2 agree or expose a blocker.",
    },
    {
      contract: V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "object-graph-routing-security-chain",
      gate: "Object model, graph, routing/segmentation, and security policy flow are connected",
      required: true,
      state: gateStateFromRows([9, 10, 11, 12], engineRows),
      evidence: ["V1 object model", "V1 graph", "V1 routing/segmentation", "V1 security policy flow"],
      remediation: "Repair graph/object lineage before trusting routing/security outputs.",
    },
    {
      contract: V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "implementation-template-truth",
      gate: "Implementation plan and vendor-neutral templates are gated on verified upstream evidence",
      required: true,
      state: gateStateFromRows([13, 14], engineRows),
      evidence: ["V1 implementation planning", "V1 vendor-neutral templates"],
      remediation: "Remove any implementation step/template that lacks source objects, evidence, preconditions, and rollback.",
    },
    {
      contract: V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "report-diagram-no-overclaim",
      gate: "Reports/exports and diagrams use backend truth and do not overclaim",
      required: true,
      state: reportBlocked || !diagramHasBackendModel ? "BLOCKED" : gateStateFromRows([15, 16], engineRows),
      evidence: [`Report blocked findings: ${asNumber(reportRecord.blockedFindingCount, 0)}`, `Diagram backend model visible: ${diagramHasBackendModel ? "yes" : "no"}`],
      remediation: "Fix blocked report/diagram truth findings before release; no pretty garbage and no report claims without backend proof.",
    },
    {
      contract: V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "advisory-discovery-ai-boundaries",
      gate: "BOM, discovery, and AI are explicitly bounded and cannot become fake authority",
      required: true,
      state: gateStateFromRows([17, 18, 19], engineRows),
      evidence: ["V1 advisory BOM", "V1 manual/imported discovery boundary", "V1 AI draft-only boundary"],
      remediation: "Restore advisory/review boundaries before letting these surfaces influence reports or diagrams.",
    },
    {
      contract: V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "scenario-library-proof",
      gate: "Full cross-engine scenario library produces proof/review/blocker evidence",
      required: true,
      state: scenarioBlocked > 0 ? "BLOCKED" : scenarioReview > 0 ? "REVIEW_REQUIRED" : "PASSED",
      evidence: [`Scenarios: ${scenarioRows.length}`, `Blocked: ${scenarioBlocked}`, `Review-required: ${scenarioReview}`],
      remediation: "Close blocked scenarios first; review-required scenarios are acceptable only when the report clearly labels the limitation.",
    },
    {
      contract: V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "no-a-plus-overclaim",
      gate: "Release label must stay A-/A planning platform, not A+ authority",
      required: true,
      state: "PASSED",
      evidence: [V1_RELEASE_TARGET, "Routing/security/discovery still need deeper future engines before any A+ claim."],
      remediation: "Do not market this as A+ or live authoritative network discovery/security simulation.",
    },
  ];

  return gates;
}

function buildFindings(engineRows: V1EngineProofRow[], scenarioRows: V1ScenarioProofRow[], gates: V1ReleaseGateRow[]): V1Finding[] {
  const findings: V1Finding[] = [];
  const missingOrContractGap = engineRows.filter((row) => row.status === "MISSING" || row.status === "CONTRACT_GAP");
  const blockedGates = gates.filter((gate) => gate.state === "BLOCKED");
  const reviewGates = gates.filter((gate) => gate.state === "REVIEW_REQUIRED");
  const blockedScenarios = scenarioRows.filter((row) => row.readinessImpact === "BLOCKED");
  const reviewScenarios = scenarioRows.filter((row) => row.readinessImpact === "REVIEW_REQUIRED");

  if (missingOrContractGap.length) {
    findings.push({
      severity: "BLOCKING",
      code: "V1_ENGINE_CONTRACT_GAP",
      title: "One or more engine contracts are missing from final proof",
      detail: `${missingOrContractGap.length} engine proof row(s) are missing or do not expose the expected contract marker.`,
      affectedItems: missingOrContractGap.map((row) => `stage${row.stage}:${row.engineKey}`),
      readinessImpact: "BLOCKED",
      remediation: "Restore the missing engine control summary before running a final release proof pass.",
    });
  }

  if (blockedGates.length) {
    findings.push({
      severity: "BLOCKING",
      code: "V1_RELEASE_GATE_BLOCKED",
      title: "Final release proof has blocked gates",
      detail: `${blockedGates.length} mandatory release gate(s) are blocked.`,
      affectedItems: blockedGates.map((gate) => gate.gateKey),
      readinessImpact: "BLOCKED",
      remediation: "Fix the blocked gates first. V1 is a proof pass; do not paper over failures.",
    });
  }

  if (blockedScenarios.length) {
    findings.push({
      severity: "BLOCKING",
      code: "V1_SCENARIO_BLOCKED",
      title: "One or more cross-engine scenarios are blocked",
      detail: `${blockedScenarios.length} scenario(s) are blocked because expected engine proof is missing or blocked.`,
      affectedItems: blockedScenarios.map((row) => row.scenarioKey),
      readinessImpact: "BLOCKED",
      remediation: "Use the missingEvidence rows to repair the earliest broken engine in the propagation chain.",
    });
  }

  if (reviewGates.length || reviewScenarios.length) {
    findings.push({
      severity: "REVIEW_REQUIRED",
      code: "V1_REVIEW_REQUIRED_LIMITATIONS",
      title: "Final proof contains review-required limitations",
      detail: `${reviewGates.length} gate(s) and ${reviewScenarios.length} scenario(s) require engineering review. That is acceptable only if reports/exports label the limitations honestly.`,
      affectedItems: [...reviewGates.map((gate) => gate.gateKey), ...reviewScenarios.map((row) => row.scenarioKey)],
      readinessImpact: "REVIEW_REQUIRED",
      remediation: "Keep review-required states visible in validation, report/export, diagrams, and implementation planning.",
    });
  }

  findings.push({
    severity: "INFO",
    code: "V1_RELEASE_TARGET_BOUNDARY",
    title: "Release target is A-/A planning platform, not A+",
    detail: "The final proof pass can prove planning-platform truth discipline, but it must not claim full routing simulation, full security verification, or live discovery authority.",
    affectedItems: [V1_RELEASE_TARGET],
    readinessImpact: blockedGates.length || blockedScenarios.length ? "BLOCKED" : reviewGates.length || reviewScenarios.length ? "REVIEW_REQUIRED" : "PROOF_READY",
    remediation: "Keep the product label honest until routing, security, and discovery become deeper authoritative engines.",
  });

  if (!missingOrContractGap.length && !blockedGates.length && !blockedScenarios.length) {
    findings.push({
      severity: "PASSED",
      code: "V1_FINAL_PROOF_CONTROLLED",
      title: "Final cross-engine proof pass is controlled",
      detail: "All expected engine contracts are visible and the final proof gate can distinguish proven, review-required, and blocked evidence.",
      affectedItems: [],
      readinessImpact: reviewGates.length || reviewScenarios.length ? "REVIEW_REQUIRED" : "PROOF_READY",
      remediation: "Run the filesystem release checks and full backend/frontend builds in the repository environment before production deployment.",
    });
  }

  return findings;
}

export function buildV1FinalProofPassControl(context: V1Context): V1FinalProofPassControlSummary {
  const engineRows = buildEngineProofRows(context);
  const scenarioRows = buildScenarioRows(engineRows);
  const releaseGates = buildReleaseGates(context, engineRows, scenarioRows);
  const findings = buildFindings(engineRows, scenarioRows, releaseGates);

  const blockedGateCount = releaseGates.filter((gate) => gate.state === "BLOCKED").length;
  const reviewGateCount = releaseGates.filter((gate) => gate.state === "REVIEW_REQUIRED").length;
  const blockedScenarioCount = scenarioRows.filter((row) => row.readinessImpact === "BLOCKED").length;
  const reviewScenarioCount = scenarioRows.filter((row) => row.readinessImpact === "REVIEW_REQUIRED").length;
  const blockedEngineCount = engineRows.filter((row) => row.readinessImpact === "BLOCKED").length;
  const reviewEngineCount = engineRows.filter((row) => row.readinessImpact === "REVIEW_REQUIRED").length;
  const overallReadiness: V1ProofReadiness = blockedGateCount || blockedScenarioCount || blockedEngineCount ? "BLOCKED" : reviewGateCount || reviewScenarioCount || reviewEngineCount ? "REVIEW_REQUIRED" : "PROOF_READY";

  return {
    contract: V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
    role: V1_PROOF_ROLE,
    releaseTarget: V1_RELEASE_TARGET,
    sourceOfTruthLevel: "final-cross-engine-proof-gate",
    overallReadiness,
    scenarioCount: scenarioRows.length,
    scenarioProofReadyCount: scenarioRows.filter((row) => row.readinessImpact === "PROOF_READY").length,
    scenarioReviewCount: reviewScenarioCount,
    scenarioBlockedCount: blockedScenarioCount,
    engineProofCount: engineRows.length,
    engineProofReadyCount: engineRows.filter((row) => row.readinessImpact === "PROOF_READY").length,
    engineProofReviewCount: reviewEngineCount,
    engineProofBlockedCount: blockedEngineCount,
    gateCount: releaseGates.length,
    passedGateCount: releaseGates.filter((gate) => gate.state === "PASSED").length,
    reviewGateCount,
    blockedGateCount,
    scenarioRows,
    engineProofRows: engineRows,
    releaseGates,
    findings,
    proofBoundary: [
      "V1 is a proof pass, not a feature expansion stage.",
      "The final proof must preserve the full Requirements Propagation Contract from requirement input through scenario proof.",
      "Review-required evidence is allowed only when validation, report/export, diagrams, and implementation planning label it honestly.",
      "Blocked evidence is not acceptable for a release claim and must not be hidden by frontend copy.",
      "The platform may be called A-/A planning-grade only after proof gates pass; it is not A+ until routing, security, and discovery become deeper authoritative engines.",
    ],
    notes: [
      `Project: ${context.projectName || "unknown"}; sites=${context.siteCount ?? 0}; VLANs=${context.vlanCount ?? 0}; design issues=${context.issueCount ?? 0}.`,
      "This control layer intentionally grades proof quality instead of creating new design objects.",
      overallReadiness === "BLOCKED" ? "Final proof is blocked. Do not ship as complete." : overallReadiness === "REVIEW_REQUIRED" ? "Final proof is controlled but review-required limitations remain." : "Final proof is controlled and proof-ready.",
    ],
  };
}
