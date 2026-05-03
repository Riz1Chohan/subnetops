import type {
  Phase20EngineProofRow,
  Phase20FinalProofPassControlSummary,
  Phase20Finding,
  Phase20ProofReadiness,
  Phase20ReleaseGateRow,
  Phase20ReleaseGateState,
  Phase20ScenarioProofRow,
} from "../designCore.types.js";

export const PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT = "PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT" as const;
export const PHASE20_PROOF_ROLE = "FINAL_CROSS_ENGINE_REQUIREMENT_TO_RELEASE_PROOF_GATE" as const;
export const PHASE20_RELEASE_TARGET = "A_MINUS_A_PLANNING_PLATFORM_NOT_A_PLUS" as const;

type PhaseSummary = object | null | undefined;

type Phase20Context = {
  projectName?: string;
  siteCount?: number;
  vlanCount?: number;
  issueCount?: number;
  phase1TraceabilityControl?: PhaseSummary;
  phase2RequirementsMaterialization?: PhaseSummary;
  phase3RequirementsClosure?: PhaseSummary;
  phase4CidrAddressingTruth?: PhaseSummary;
  phase5EnterpriseIpamTruth?: PhaseSummary;
  phase6DesignCoreOrchestrator?: PhaseSummary;
  phase7StandardsRulebookControl?: PhaseSummary;
  phase8ValidationReadiness?: PhaseSummary;
  phase9NetworkObjectModel?: PhaseSummary;
  phase10DesignGraph?: PhaseSummary;
  phase11RoutingSegmentation?: PhaseSummary;
  phase12SecurityPolicyFlow?: PhaseSummary;
  phase13ImplementationPlanning?: PhaseSummary;
  phase14ImplementationTemplates?: PhaseSummary;
  phase15ReportExportTruth?: PhaseSummary;
  phase16DiagramTruth?: PhaseSummary;
  phase17PlatformBomFoundation?: PhaseSummary;
  phase18DiscoveryCurrentState?: PhaseSummary;
  phase19AiDraftHelper?: PhaseSummary;
  requirementsScenarioProof?: PhaseSummary;
  reportTruth?: PhaseSummary;
  diagramTruth?: PhaseSummary;
};

type ExpectedEngine = {
  phase: number;
  engineKey: keyof Phase20Context;
  expectedContract: string;
  proofFocus: string;
};

type ScenarioDefinition = {
  scenarioKey: string;
  scenarioName: string;
  requirementsCovered: string[];
  expectedPhaseNumbers: number[];
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
  { phase: 1, engineKey: "phase1TraceabilityControl", expectedContract: "PHASE1_PLANNING_INPUT_DISCIPLINE_TRACEABILITY", proofFocus: "source/confidence/proof labels on design outputs" },
  { phase: 2, engineKey: "phase2RequirementsMaterialization", expectedContract: "PHASE2_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT", proofFocus: "requirements materialize into source objects, signals, blockers, review items, no-ops, or unsupported states" },
  { phase: 3, engineKey: "phase3RequirementsClosure", expectedContract: "PHASE3_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF", proofFocus: "nothing gets lost between capture, materialization, engines, UI, report, and diagram" },
  { phase: 4, engineKey: "phase4CidrAddressingTruth", expectedContract: "PHASE4_ENGINE1_CIDR_ADDRESSING_TRUTH", proofFocus: "CIDR/addressing math and requirement-driven host demand proof" },
  { phase: 5, engineKey: "phase5EnterpriseIpamTruth", expectedContract: "PHASE5_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW", proofFocus: "Engine 1 planner reconciles with Engine 2 durable IPAM authority" },
  { phase: 6, engineKey: "phase6DesignCoreOrchestrator", expectedContract: "PHASE6_DESIGN_CORE_ORCHESTRATOR_CONTRACT", proofFocus: "design-core coordinates engines without becoming a god-file authority mess" },
  { phase: 7, engineKey: "phase7StandardsRulebookControl", expectedContract: "PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT", proofFocus: "standards activate by requirement/object applicability with severity and remediation" },
  { phase: 8, engineKey: "phase8ValidationReadiness", expectedContract: "PHASE8_VALIDATION_READINESS_AUTHORITY_CONTRACT", proofFocus: "validation aggregates readiness across all truth-bearing engines" },
  { phase: 9, engineKey: "phase9NetworkObjectModel", expectedContract: "PHASE9_NETWORK_OBJECT_MODEL_TRUTH_CONTRACT", proofFocus: "devices/interfaces/links/zones/policies/NAT/DHCP/reservations carry truth labels" },
  { phase: 10, engineKey: "phase10DesignGraph", expectedContract: "PHASE10_DESIGN_GRAPH_DEPENDENCY_INTEGRITY_CONTRACT", proofFocus: "dependency graph connects requirements, objects, relationships, and consumers" },
  { phase: 11, engineKey: "phase11RoutingSegmentation", expectedContract: "PHASE11_ROUTING_SEGMENTATION_PROTOCOL_AWARE_PLANNING_CONTRACT", proofFocus: "routing and segmentation are honest intent/review/blocker outputs, not fake simulation" },
  { phase: 12, engineKey: "phase12SecurityPolicyFlow", expectedContract: "PHASE12_SECURITY_POLICY_FLOW_CONTRACT", proofFocus: "zone/service/NAT/logging policy consequences and review gates" },
  { phase: 13, engineKey: "phase13ImplementationPlanning", expectedContract: "PHASE13_IMPLEMENTATION_PLANNING_CONTRACT", proofFocus: "implementation steps are gated on verified upstream source objects" },
  { phase: 14, engineKey: "phase14ImplementationTemplates", expectedContract: "PHASE14_VENDOR_NEUTRAL_IMPLEMENTATION_TEMPLATES_CONTRACT", proofFocus: "templates stay vendor-neutral and show missing data blockers/evidence/rollback" },
  { phase: 15, engineKey: "phase15ReportExportTruth", expectedContract: "PHASE15_REPORT_EXPORT_TRUTH_CONTRACT", proofFocus: "reports/exports include traceability and do not overclaim backend proof" },
  { phase: 16, engineKey: "phase16DiagramTruth", expectedContract: "PHASE16_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT", proofFocus: "diagrams render backend truth only, with visible inferred/review labels" },
  { phase: 17, engineKey: "phase17PlatformBomFoundation", expectedContract: "PHASE17_PLATFORM_BOM_FOUNDATION_CONTRACT", proofFocus: "BOM is backend-controlled advisory estimate with calculation basis and review notes" },
  { phase: 18, engineKey: "phase18DiscoveryCurrentState", expectedContract: "PHASE18_DISCOVERY_CURRENT_STATE_CONTRACT", proofFocus: "discovery/current-state separates not-provided/manual/imported/validated/conflicting/review states" },
  { phase: 19, engineKey: "phase19AiDraftHelper", expectedContract: "PHASE19_AI_DRAFT_HELPER_CONTRACT", proofFocus: "AI stays draft-only, review-required, and non-authoritative" },
];

const SCENARIOS: ScenarioDefinition[] = [
  { scenarioKey: "small-office", scenarioName: "Small office", requirementsCovered: ["planningFor", "usersPerSite", "siteCount", "basic VLAN/addressing"], expectedPhaseNumbers: [1, 2, 3, 4, 7, 8, 9, 10, 13, 15, 16], notes: ["Baseline scenario must prove the normal path without hiding missing requirements behind defaults."] },
  { scenarioKey: "healthcare-clinic", scenarioName: "Healthcare clinic", requirementsCovered: ["security-sensitive", "guest access", "segmentation", "report evidence"], expectedPhaseNumbers: [1, 2, 3, 4, 7, 8, 9, 10, 12, 13, 15, 16], notes: ["Security-sensitive outputs must be review-labelled where the backend cannot prove policy implementation."] },
  { scenarioKey: "multi-site-enterprise", scenarioName: "Multi-site enterprise", requirementsCovered: ["multiSite", "siteCount", "WAN", "summary routes", "inter-site reachability"], expectedPhaseNumbers: [1, 2, 3, 4, 5, 8, 10, 11, 13, 15, 16, 18], notes: ["Multi-site planning must feed addressing, IPAM, routing review, diagram, and discovery tasks."] },
  { scenarioKey: "ten-site-enterprise", scenarioName: "10-site enterprise", requirementsCovered: ["siteCount", "large topology", "WAN scale", "diagram readability", "BOM scale"], expectedPhaseNumbers: [1, 2, 3, 4, 5, 8, 9, 10, 11, 16, 17, 18], notes: ["Large designs must expose review states instead of collapsing into pretty garbage."] },
  { scenarioKey: "guest-wifi-heavy", scenarioName: "Guest Wi-Fi heavy", requirementsCovered: ["guestAccess", "wireless", "isolation", "DHCP", "security zones"], expectedPhaseNumbers: [1, 2, 3, 4, 7, 8, 9, 11, 12, 13, 16, 17], notes: ["Guest isolation must have routing, security, validation, diagram, and BOM consequences."] },
  { scenarioKey: "voice-wireless", scenarioName: "Voice + wireless", requirementsCovered: ["voice", "wireless", "PoE", "VLANs", "QoS review"], expectedPhaseNumbers: [1, 2, 3, 4, 7, 8, 13, 14, 15, 17], notes: ["Voice/wireless should drive addressing, implementation review, templates, and advisory platform/BOM estimates."] },
  { scenarioKey: "cloud-hybrid", scenarioName: "Cloud/hybrid", requirementsCovered: ["cloudHybrid", "cloud edge", "route tables", "boundary policy", "discovery/import review"], expectedPhaseNumbers: [1, 2, 3, 5, 7, 8, 10, 11, 12, 13, 15, 18], notes: ["Cloud outputs must stay review-required unless actual cloud network objects/imports exist."] },
  { scenarioKey: "dual-isp", scenarioName: "Dual ISP", requirementsCovered: ["dualIsp", "WAN resilience", "failover routing", "implementation blockers"], expectedPhaseNumbers: [1, 2, 3, 5, 7, 8, 11, 13, 15, 16, 18], notes: ["Dual ISP must create routing/failover evidence or a blocker; it must not create fake circuits."] },
  { scenarioKey: "brownfield-migration", scenarioName: "Brownfield migration", requirementsCovered: ["brownfield", "migration", "current-state", "IPAM conflict", "route/firewall comparison"], expectedPhaseNumbers: [1, 2, 3, 5, 8, 9, 10, 12, 13, 15, 18], notes: ["Brownfield mode must create import/reconciliation tasks and distinguish missing current-state evidence."] },
  { scenarioKey: "overlapping-vrf-ipam", scenarioName: "Overlapping VRF/IPAM", requirementsCovered: ["route domains", "VRF overlap", "durable IPAM", "standards/validation"], expectedPhaseNumbers: [1, 3, 4, 5, 7, 8, 10, 11, 15, 18], notes: ["Overlaps are only acceptable with route-domain/IPAM evidence; otherwise they stay blocked/review-required."] },
  { scenarioKey: "security-sensitive-environment", scenarioName: "Security-sensitive environment", requirementsCovered: ["management access", "remote access", "DMZ", "logging", "default deny"], expectedPhaseNumbers: [1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 15, 16], notes: ["Security claims must be policy consequences and review findings, not marketing text."] },
  { scenarioKey: "large-vlan-site-count", scenarioName: "Large VLAN/site count", requirementsCovered: ["large VLAN count", "site reserve", "capacity", "diagram layout", "export scale"], expectedPhaseNumbers: [1, 2, 3, 4, 5, 8, 9, 10, 15, 16, 17], notes: ["Scale pressure must remain deterministic and reportable, with frontend using backend truth only."] },
];

function asRecord(value: PhaseSummary): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readinessText(summary: PhaseSummary): string {
  const record = asRecord(summary);
  return asString(record.overallReadiness)
    || asString(record.sourceOfTruthReadiness)
    || asString(record.designReviewReadiness)
    || asString(record.readiness)
    || asString(record.status)
    || "UNKNOWN";
}

function normalizeReadiness(summary: PhaseSummary): Phase20ProofReadiness {
  if (!summary) return "BLOCKED";
  const text = readinessText(summary).toUpperCase();
  if (text.includes("BLOCK") || text.includes("MISSING") || text.includes("ERROR")) return "BLOCKED";
  if (text.includes("REVIEW") || text.includes("NOT_READY") || text.includes("DRAFT") || text.includes("ADVISORY")) return "REVIEW_REQUIRED";
  return "PROOF_READY";
}

function expectedContractPresent(summary: PhaseSummary, expectedContract: string): boolean {
  const record = asRecord(summary);
  return Object.values(record).some((value) => typeof value === "string" && value.includes(expectedContract));
}

function buildEngineProofRows(context: Phase20Context): Phase20EngineProofRow[] {
  return EXPECTED_ENGINES.map((engine) => {
    const summary = context[engine.engineKey] as PhaseSummary;
    const readinessImpact = normalizeReadiness(summary);
    const contractPresent = expectedContractPresent(summary, engine.expectedContract);
    const findingCount = asNumber(asRecord(summary).findingCount, asNumber(asRecord(summary).blockingFindingCount, 0));
    const blockerCount = asNumber(asRecord(summary).blockingFindingCount, asNumber(asRecord(summary).missingGateCount, 0));
    const status: Phase20EngineProofRow["status"] = !summary ? "MISSING" : !contractPresent ? "CONTRACT_GAP" : readinessImpact === "BLOCKED" ? "BLOCKED" : readinessImpact === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "PROVEN";
    const blockers: string[] = [];
    if (!summary) blockers.push("Engine summary missing from design-core snapshot.");
    if (summary && !contractPresent) blockers.push(`Expected contract marker ${engine.expectedContract} was not visible in the summary.`);
    if (blockerCount > 0) blockers.push(`${blockerCount} blocking/gate finding(s) reported by this engine.`);

    return {
      contract: PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      phase: engine.phase,
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

function engineByPhase(rows: Phase20EngineProofRow[]) {
  return new Map(rows.map((row) => [row.phase, row]));
}

function buildScenarioRows(engineRows: Phase20EngineProofRow[]): Phase20ScenarioProofRow[] {
  const rowsByPhase = engineByPhase(engineRows);
  return SCENARIOS.map((scenario) => {
    const expectedRows = scenario.expectedPhaseNumbers.map((phase) => rowsByPhase.get(phase)).filter(Boolean) as Phase20EngineProofRow[];
    const missingPhases = scenario.expectedPhaseNumbers.filter((phase) => !rowsByPhase.has(phase));
    const blockedEngines = expectedRows.filter((row) => row.readinessImpact === "BLOCKED");
    const reviewEngines = expectedRows.filter((row) => row.readinessImpact === "REVIEW_REQUIRED");
    const readinessImpact: Phase20ProofReadiness = missingPhases.length || blockedEngines.length ? "BLOCKED" : reviewEngines.length ? "REVIEW_REQUIRED" : "PROOF_READY";
    return {
      contract: PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      scenarioKey: scenario.scenarioKey,
      scenarioName: scenario.scenarioName,
      requirementsCovered: scenario.requirementsCovered,
      expectedProofChain: PROPAGATION_CHAIN,
      expectedEnginePhases: scenario.expectedPhaseNumbers,
      actualEvidence: expectedRows.map((row) => `Phase ${row.phase} ${row.engineKey}: ${row.status} (${row.readinessImpact})`),
      missingEvidence: [
        ...missingPhases.map((phase) => `Phase ${phase} engine proof row missing.`),
        ...blockedEngines.map((row) => `Phase ${row.phase} ${row.engineKey} is ${row.status}.`),
      ],
      readinessImpact,
      notes: scenario.notes,
    };
  });
}

function gateStateFromRows(requiredPhases: number[], engineRows: Phase20EngineProofRow[]): Phase20ReleaseGateState {
  const rowsByPhase = engineByPhase(engineRows);
  const rows = requiredPhases.map((phase) => rowsByPhase.get(phase));
  if (rows.some((row) => !row || row.readinessImpact === "BLOCKED")) return "BLOCKED";
  if (rows.some((row) => row?.readinessImpact === "REVIEW_REQUIRED")) return "REVIEW_REQUIRED";
  return "PASSED";
}

function buildReleaseGates(context: Phase20Context, engineRows: Phase20EngineProofRow[], scenarioRows: Phase20ScenarioProofRow[]): Phase20ReleaseGateRow[] {
  const scenarioBlocked = scenarioRows.filter((row) => row.readinessImpact === "BLOCKED").length;
  const scenarioReview = scenarioRows.filter((row) => row.readinessImpact === "REVIEW_REQUIRED").length;
  const reportRecord = asRecord(context.reportTruth);
  const diagramRecord = asRecord(context.diagramTruth);
  const reportBlocked = asNumber(reportRecord.blockedFindingCount, 0) > 0;
  const diagramHasBackendModel = Boolean(diagramRecord.renderModel || diagramRecord.nodes || diagramRecord.overallReadiness);

  const gates: Phase20ReleaseGateRow[] = [
    {
      contract: PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "requirements-propagation-chain",
      gate: "Requirements propagate from input through materialization, closure, validation, UI/report/diagram consumers, and scenario proof",
      required: true,
      state: gateStateFromRows([1, 2, 3, 8, 15, 16], engineRows),
      evidence: ["Phase 1 traceability", "Phase 2 materialization", "Phase 3 closure", "Phase 8 validation", "Phase 15 report/export", "Phase 16 diagram truth"],
      remediation: "Fix the first missing/broken propagation engine before calling the release proof complete.",
    },
    {
      contract: PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "addressing-ipam-foundation",
      gate: "CIDR/addressing planner and durable IPAM reconciliation are both visible",
      required: true,
      state: gateStateFromRows([4, 5], engineRows),
      evidence: ["Phase 4 CIDR/addressing", "Phase 5 enterprise IPAM"],
      remediation: "Do not proceed with implementation/report confidence until Engine 1 and Engine 2 agree or expose a blocker.",
    },
    {
      contract: PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "object-graph-routing-security-chain",
      gate: "Object model, graph, routing/segmentation, and security policy flow are connected",
      required: true,
      state: gateStateFromRows([9, 10, 11, 12], engineRows),
      evidence: ["Phase 9 object model", "Phase 10 graph", "Phase 11 routing/segmentation", "Phase 12 security policy flow"],
      remediation: "Repair graph/object lineage before trusting routing/security outputs.",
    },
    {
      contract: PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "implementation-template-truth",
      gate: "Implementation plan and vendor-neutral templates are gated on verified upstream evidence",
      required: true,
      state: gateStateFromRows([13, 14], engineRows),
      evidence: ["Phase 13 implementation planning", "Phase 14 vendor-neutral templates"],
      remediation: "Remove any implementation step/template that lacks source objects, evidence, preconditions, and rollback.",
    },
    {
      contract: PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "report-diagram-no-overclaim",
      gate: "Reports/exports and diagrams use backend truth and do not overclaim",
      required: true,
      state: reportBlocked || !diagramHasBackendModel ? "BLOCKED" : gateStateFromRows([15, 16], engineRows),
      evidence: [`Report blocked findings: ${asNumber(reportRecord.blockedFindingCount, 0)}`, `Diagram backend model visible: ${diagramHasBackendModel ? "yes" : "no"}`],
      remediation: "Fix blocked report/diagram truth findings before release; no pretty garbage and no report claims without backend proof.",
    },
    {
      contract: PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "advisory-discovery-ai-boundaries",
      gate: "BOM, discovery, and AI are explicitly bounded and cannot become fake authority",
      required: true,
      state: gateStateFromRows([17, 18, 19], engineRows),
      evidence: ["Phase 17 advisory BOM", "Phase 18 manual/imported discovery boundary", "Phase 19 AI draft-only boundary"],
      remediation: "Restore advisory/review boundaries before letting these surfaces influence reports or diagrams.",
    },
    {
      contract: PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "scenario-library-proof",
      gate: "Full cross-engine scenario library produces proof/review/blocker evidence",
      required: true,
      state: scenarioBlocked > 0 ? "BLOCKED" : scenarioReview > 0 ? "REVIEW_REQUIRED" : "PASSED",
      evidence: [`Scenarios: ${scenarioRows.length}`, `Blocked: ${scenarioBlocked}`, `Review-required: ${scenarioReview}`],
      remediation: "Close blocked scenarios first; review-required scenarios are acceptable only when the report clearly labels the limitation.",
    },
    {
      contract: PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
      gateKey: "no-a-plus-overclaim",
      gate: "Release label must stay A-/A planning platform, not A+ authority",
      required: true,
      state: "PASSED",
      evidence: [PHASE20_RELEASE_TARGET, "Routing/security/discovery still need deeper future engines before any A+ claim."],
      remediation: "Do not market this as A+ or live authoritative network discovery/security simulation.",
    },
  ];

  return gates;
}

function buildFindings(engineRows: Phase20EngineProofRow[], scenarioRows: Phase20ScenarioProofRow[], gates: Phase20ReleaseGateRow[]): Phase20Finding[] {
  const findings: Phase20Finding[] = [];
  const missingOrContractGap = engineRows.filter((row) => row.status === "MISSING" || row.status === "CONTRACT_GAP");
  const blockedGates = gates.filter((gate) => gate.state === "BLOCKED");
  const reviewGates = gates.filter((gate) => gate.state === "REVIEW_REQUIRED");
  const blockedScenarios = scenarioRows.filter((row) => row.readinessImpact === "BLOCKED");
  const reviewScenarios = scenarioRows.filter((row) => row.readinessImpact === "REVIEW_REQUIRED");

  if (missingOrContractGap.length) {
    findings.push({
      severity: "BLOCKING",
      code: "PHASE20_ENGINE_CONTRACT_GAP",
      title: "One or more engine contracts are missing from final proof",
      detail: `${missingOrContractGap.length} engine proof row(s) are missing or do not expose the expected contract marker.`,
      affectedItems: missingOrContractGap.map((row) => `phase${row.phase}:${row.engineKey}`),
      readinessImpact: "BLOCKED",
      remediation: "Restore the missing engine control summary before running a final release proof pass.",
    });
  }

  if (blockedGates.length) {
    findings.push({
      severity: "BLOCKING",
      code: "PHASE20_RELEASE_GATE_BLOCKED",
      title: "Final release proof has blocked gates",
      detail: `${blockedGates.length} mandatory release gate(s) are blocked.`,
      affectedItems: blockedGates.map((gate) => gate.gateKey),
      readinessImpact: "BLOCKED",
      remediation: "Fix the blocked gates first. Phase 20 is a proof pass; do not paper over failures.",
    });
  }

  if (blockedScenarios.length) {
    findings.push({
      severity: "BLOCKING",
      code: "PHASE20_SCENARIO_BLOCKED",
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
      code: "PHASE20_REVIEW_REQUIRED_LIMITATIONS",
      title: "Final proof contains review-required limitations",
      detail: `${reviewGates.length} gate(s) and ${reviewScenarios.length} scenario(s) require engineering review. That is acceptable only if reports/exports label the limitations honestly.`,
      affectedItems: [...reviewGates.map((gate) => gate.gateKey), ...reviewScenarios.map((row) => row.scenarioKey)],
      readinessImpact: "REVIEW_REQUIRED",
      remediation: "Keep review-required states visible in validation, report/export, diagrams, and implementation planning.",
    });
  }

  findings.push({
    severity: "INFO",
    code: "PHASE20_RELEASE_TARGET_BOUNDARY",
    title: "Release target is A-/A planning platform, not A+",
    detail: "The final proof pass can prove planning-platform truth discipline, but it must not claim full routing simulation, full security verification, or live discovery authority.",
    affectedItems: [PHASE20_RELEASE_TARGET],
    readinessImpact: blockedGates.length || blockedScenarios.length ? "BLOCKED" : reviewGates.length || reviewScenarios.length ? "REVIEW_REQUIRED" : "PROOF_READY",
    remediation: "Keep the product label honest until routing, security, and discovery become deeper authoritative engines.",
  });

  if (!missingOrContractGap.length && !blockedGates.length && !blockedScenarios.length) {
    findings.push({
      severity: "PASSED",
      code: "PHASE20_FINAL_PROOF_CONTROLLED",
      title: "Final cross-engine proof pass is controlled",
      detail: "All expected engine contracts are visible and the final proof gate can distinguish proven, review-required, and blocked evidence.",
      affectedItems: [],
      readinessImpact: reviewGates.length || reviewScenarios.length ? "REVIEW_REQUIRED" : "PROOF_READY",
      remediation: "Run the filesystem release checks and full backend/frontend builds in the repository environment before production deployment.",
    });
  }

  return findings;
}

export function buildPhase20FinalProofPassControl(context: Phase20Context): Phase20FinalProofPassControlSummary {
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
  const overallReadiness: Phase20ProofReadiness = blockedGateCount || blockedScenarioCount || blockedEngineCount ? "BLOCKED" : reviewGateCount || reviewScenarioCount || reviewEngineCount ? "REVIEW_REQUIRED" : "PROOF_READY";

  return {
    contract: PHASE20_FINAL_CROSS_ENGINE_PROOF_CONTRACT,
    role: PHASE20_PROOF_ROLE,
    releaseTarget: PHASE20_RELEASE_TARGET,
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
      "Phase 20 is a proof pass, not a feature expansion phase.",
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
