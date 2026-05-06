import type {
  BackendDiagramTruthModel,
  BackendReportTruthModel,
  DesignCoreAddressRow,
  DesignTraceabilityItem,
  NetworkObjectModel,
  V1RequirementsMaterializationControlSummary,
  RequirementMaterializationOutcome,
  RequirementPropagationLifecycleStatus,
  RequirementsImpactClosureItem,
  RequirementsImpactClosureSummary,
  RequirementsScenarioProofSignal,
  RequirementsScenarioProofSummary,
} from "../designCore.types.js";
<<<<<<< HEAD
import { evaluateRequirementClosureBlockerProof } from "../../domain/requirements/closure-proof.js";
=======
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
import { requirementConsumerRegistryFor, V1_REQUIREMENT_CONSUMER_REGISTRY_VERSION } from "./designCore.requirementConsumerRegistry.js";

export const V1_REQUIREMENTS_CLOSURE_CONTRACT_VERSION = "V1_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF" as const;

export type V1ReadinessImpact = "PASSED" | "WARNING" | "REVIEW_REQUIRED" | "BLOCKING" | "UNSUPPORTED";
export type V1ScenarioClosureStatus = "passed" | "review-required" | "blocked" | "not-applicable";

export interface V1RequirementConsumerCoverage {
  captured: boolean;
  normalized: boolean;
  materialized: boolean;
  backendConsumed: boolean;
  addressingConsumed: boolean;
  routingConsumed: boolean;
  securityConsumed: boolean;
  implementationConsumed: boolean;
  validationConsumed: boolean;
  frontendVisible: boolean;
  reportVisible: boolean;
  diagramVisible: boolean;
  scenarioProven: boolean;
}

export interface V1RequirementClosureMatrixRow {
  requirementId: string;
  key: string;
  label: string;
  category: string;
  sourceValue: string;
  active: boolean;
  lifecycleStatus: RequirementPropagationLifecycleStatus;
  readinessImpact: V1ReadinessImpact;
  expectedAffectedEngines: string[];
  actualAffectedEngines: string[];
  missingConsumers: string[];
  reviewOnlyConsumers: string[];
  explicitNoOpConsumers: string[];
  consumerCoverage: V1RequirementConsumerCoverage;
  evidence: string[];
  reviewReason?: string;
<<<<<<< HEAD
  blockedReason?: string;
  lifecycleProofStatus: "PROVEN" | "REVIEW_REQUIRED" | "EXPLICIT_NO_OP" | "NOT_ACTIVE";
=======
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
}

export interface V1GoldenScenarioClosure {
  id: string;
  label: string;
  relevant: boolean;
  requiredRequirementKeys: string[];
  lifecycleStatus: V1ScenarioClosureStatus;
  missingRequirementKeys: string[];
  blockingRequirementKeys: string[];
  reviewRequirementKeys: string[];
  evidence: string[];
}

export interface V1RequirementsClosureControlSummary {
  contractVersion: typeof V1_REQUIREMENTS_CLOSURE_CONTRACT_VERSION;
  totalRequirementCount: number;
  capturedRequirementCount: number;
  activeRequirementCount: number;
  fullPropagatedCount: number;
  partialPropagatedCount: number;
  materializedOnlyCount: number;
  capturedOnlyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  unsupportedCount: number;
  notCapturedCount: number;
  missingConsumerCount: number;
  scenarioPassedCount: number;
  scenarioReviewCount: number;
  scenarioBlockedCount: number;
  closureMatrix: V1RequirementClosureMatrixRow[];
  goldenScenarioClosures: V1GoldenScenarioClosure[];
  notes: string[];
}

type V1Input = {
  V1RequirementsMaterialization: V1RequirementsMaterializationControlSummary;
  requirementsImpactClosure: RequirementsImpactClosureSummary;
  requirementsScenarioProof: RequirementsScenarioProofSummary;
  traceability: DesignTraceabilityItem[];
  addressingRows: DesignCoreAddressRow[];
  networkObjectModel: NetworkObjectModel;
  enterpriseIpamCandidateCount?: number;
  reportTruth?: BackendReportTruthModel;
  diagramTruth?: BackendDiagramTruthModel;
};

const REVIEW_ONLY_MATERIALIZATION_STATUSES = new Set(["review-required", "validation-blocker"]);
<<<<<<< HEAD
=======
const WIZARD_REVIEW_CONSUMER_GAPS = new Set(["ProjectOverviewPage.V1Closure", "report/export.requirementEvidence", "diagramTruth.requirementImpact", "designCore.requirementsScenarioProof"]);
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
const NON_ACTIVE_MATERIALIZATION_STATUSES = new Set(["explicit-no-op", "unsupported", "policy-missing"]);

function includesText(values: string[], fragments: string[]) {
  const haystack = values.join(" ").toLowerCase();
  return fragments.some((fragment) => haystack.includes(fragment.toLowerCase()));
}

function normalizedSourceValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function valueLooksActive(value: string) {
  const normalized = normalizedSourceValue(value);
  return Boolean(normalized)
    && normalized !== "not captured"
    && normalized !== "false"
    && normalized !== "0"
    && normalized !== "none"
    && normalized !== "not applicable"
    && normalized !== "n/a";
}

function stringsForOutcome(outcome: RequirementMaterializationOutcome) {
  return [
    outcome.key,
    outcome.label,
    outcome.category,
    outcome.normalizedSignal,
    outcome.validationImpact,
    outcome.reportImpact,
    outcome.diagramImpact,
    ...outcome.backendDesignCoreInputs,
    ...outcome.affectedEngines,
    ...outcome.frontendImpact,
    ...outcome.createdObjectTypes,
    ...outcome.updatedObjectTypes,
  ];
}

function expectedConsumersFor(outcome: RequirementMaterializationOutcome) {
  return requirementConsumerRegistryFor(outcome).requiredConsumers;
}

function reviewOnlyConsumersFor(outcome: RequirementMaterializationOutcome) {
  return requirementConsumerRegistryFor(outcome).reviewOnlyConsumers;
}

function explicitNoOpConsumersFor(outcome: RequirementMaterializationOutcome) {
  return requirementConsumerRegistryFor(outcome).explicitNoOpConsumers;
}

function actualConsumersFor(args: {
  outcome: RequirementMaterializationOutcome;
  closure?: RequirementsImpactClosureItem;
  scenarioSignals: RequirementsScenarioProofSignal[];
  traceabilityItems: DesignTraceabilityItem[];
  coverage: V1RequirementConsumerCoverage;
  enterpriseIpamCandidateCount?: number;
}) {
  const { outcome, closure, scenarioSignals, traceabilityItems, coverage } = args;
  const actual = new Set<string>();

  if (coverage.captured) actual.add("requirements.capture");
  if (coverage.normalized) actual.add("requirements.normalization");
  if (!NON_ACTIVE_MATERIALIZATION_STATUSES.has(outcome.materializationStatus) || outcome.materializationStatus === "explicit-no-op") actual.add("requirementsMaterialization.policy");
  if (traceabilityItems.length > 0) actual.add("designCore.traceability");
  if (closure?.captured) actual.add("designCore.requirementsImpactClosure");
  if (scenarioSignals.length > 0) actual.add("designCore.requirementsScenarioProof");
  if (coverage.materialized) actual.add("materialized.sourceObject");
  if (coverage.addressingConsumed) actual.add("Engine1.addressing");
  if ((args.enterpriseIpamCandidateCount ?? 0) > 0 && includesText(stringsForOutcome(outcome), ["ipam", "pool", "allocation", "dhcp", "reservation", "Engine2", "address", "subnet", "vlan", "segment", "host demand"])) actual.add("Engine2.enterpriseIpamReview");
  if (coverage.routingConsumed) actual.add("designCore.routingSegmentation");
  if (coverage.securityConsumed) actual.add("designCore.securityPolicyFlow");
  if (coverage.implementationConsumed) actual.add("designCore.implementationPlan");
  if (coverage.validationConsumed) actual.add("validation/readiness");
  if (coverage.frontendVisible) actual.add("ProjectOverviewPage.V1Closure");
  if (coverage.reportVisible) actual.add("report/export.requirementEvidence");
  if (coverage.diagramVisible) actual.add("diagramTruth.requirementImpact");

  return Array.from(actual).sort();
}

function matchingTraceability(traceability: DesignTraceabilityItem[], outcome: RequirementMaterializationOutcome) {
  return traceability.filter((item) => item.sourceKey === outcome.key || item.sourceRequirementIds?.includes(outcome.key));
}

function matchingScenarioSignals(signals: RequirementsScenarioProofSignal[], key: string) {
  return signals.filter((signal) => signal.requirementKeys.includes(key));
}

function hasAddressingEvidence(outcome: RequirementMaterializationOutcome, closure?: RequirementsImpactClosureItem) {
  if (outcome.actualEvidence.some((item) => /segment|vlan|subnet|cidr|gateway/i.test(item))) return true;
  if (closure?.concreteOutputs.some((item) => /segment|vlan|address|subnet|host|site record/i.test(item))) return true;
  return false;
}

function hasRoutingEvidence(outcome: RequirementMaterializationOutcome, closure: RequirementsImpactClosureItem | undefined, model: NetworkObjectModel) {
  if (!includesText(stringsForOutcome(outcome), ["route", "wan", "cloud", "isp", "transit", "failover", "reachability"])) return false;
  if ((model.routingSegmentation?.summary?.routeIntentCount ?? 0) > 0) return true;
  return Boolean(closure?.concreteOutputs.some((item) => /route|wan|transit|cloud/i.test(item)));
}

function hasSecurityEvidence(outcome: RequirementMaterializationOutcome, closure: RequirementsImpactClosureItem | undefined, model: NetworkObjectModel) {
  if (!includesText(stringsForOutcome(outcome), ["security", "zone", "policy", "guest", "management", "remote", "trust", "firewall"])) return false;
  if ((model.securityPolicyFlow?.summary?.flowRequirementCount ?? 0) > 0) return true;
  if ((model.summary?.securityZoneCount ?? 0) > 0 && includesText(stringsForOutcome(outcome), ["zone", "guest", "management", "remote", "security"])) return true;
  return Boolean(closure?.concreteOutputs.some((item) => /security|flow|policy|zone/i.test(item)));
}

function hasImplementationEvidence(outcome: RequirementMaterializationOutcome, closure: RequirementsImpactClosureItem | undefined, model: NetworkObjectModel) {
  const expectedImplementation = includesText(stringsForOutcome(outcome), ["implementation", "handoff", "rollout", "review item", "downtime", "team"])
    || REVIEW_ONLY_MATERIALIZATION_STATUSES.has(outcome.materializationStatus);
  if (!expectedImplementation) return false;
  if ((model.implementationPlan?.summary?.stepCount ?? 0) > 0) return true;
  return Boolean(closure?.visibleIn.some((item) => /implementation|handoff|review/i.test(item)));
}

<<<<<<< HEAD
function requirementClosureText(outcome: RequirementMaterializationOutcome) {
  return [
    outcome.key,
    outcome.label,
    outcome.validationImpact,
    outcome.reviewReason ?? "",
    ...outcome.actualEvidence,
    ...outcome.reviewRequiredWhen,
  ].join(" ").toLowerCase();
}

function hasRequiredSourceObjectGap(outcome: RequirementMaterializationOutcome, coverage: V1RequirementConsumerCoverage, active: boolean) {
  return active
    && outcome.expectedDisposition === "MATERIALIZED_OBJECT"
    && !coverage.materialized
    && outcome.materializationStatus !== "explicit-no-op"
    && outcome.materializationStatus !== "unsupported";
}

function hasEngineOutputContradiction(outcome: RequirementMaterializationOutcome) {
  const text = requirementClosureText(outcome);
  return outcome.materializationStatus === "validation-blocker"
    && /invalid|overlap|conflict|contradict|rejected|missing required source object|missing mandatory consumer|root blocker/.test(text);
}

function blockingProofFor(args: {
  outcome: RequirementMaterializationOutcome;
  coverage: V1RequirementConsumerCoverage;
  missingConsumers: string[];
  active: boolean;
}) {
  const { outcome, coverage, missingConsumers, active } = args;
  const proof = evaluateRequirementClosureBlockerProof({
    active,
    missingMandatoryConsumers: missingConsumers,
    requiredSourceObjectMissing: hasRequiredSourceObjectGap(outcome, coverage, active),
    engineOutputContradiction: hasEngineOutputContradiction(outcome),
  });
  return proof.blockedReason;
}

function lifecycleProofStatusFor(args: {
  outcome: RequirementMaterializationOutcome;
  active: boolean;
  blockingProof?: string;
}) {
  const { outcome, active, blockingProof } = args;
  if (!active) return "NOT_ACTIVE" as const;
  if (outcome.materializationStatus === "explicit-no-op") return "EXPLICIT_NO_OP" as const;
  if (blockingProof) return "PROVEN" as const;
  return "REVIEW_REQUIRED" as const;
}

=======
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
function lifecycleFor(args: {
  outcome: RequirementMaterializationOutcome;
  coverage: V1RequirementConsumerCoverage;
  missingConsumers: string[];
<<<<<<< HEAD
  active: boolean;
  blockingProof?: string;
}) {
  const { outcome, coverage, missingConsumers, active, blockingProof } = args;
  if (!coverage.captured) return "NOT_CAPTURED" as const;
  if (outcome.materializationStatus === "unsupported") return "UNSUPPORTED" as const;
  if (outcome.materializationStatus === "explicit-no-op") return "EXPLICIT_NO_OP" as const;
  if (blockingProof) return "BLOCKED" as const;
  if (outcome.materializationStatus === "validation-blocker") return "REVIEW_REQUIRED" as const;
  if (outcome.materializationStatus === "review-required") return "REVIEW_REQUIRED" as const;
  if (!active) return coverage.materialized ? "EXPLICIT_NO_OP" as const : "NOT_CAPTURED" as const;
=======
}) {
  const { outcome, coverage, missingConsumers } = args;
  if (!coverage.captured) return "NOT_CAPTURED" as const;
  if (outcome.materializationStatus === "unsupported") return "UNSUPPORTED" as const;
  if (outcome.materializationStatus === "validation-blocker") {
    return missingConsumers.some((consumer) => !WIZARD_REVIEW_CONSUMER_GAPS.has(consumer)) ? "BLOCKED" as const : "REVIEW_REQUIRED" as const;
  }
  if (outcome.materializationStatus === "review-required") return "REVIEW_REQUIRED" as const;
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
  if (!coverage.normalized && !coverage.materialized && !coverage.backendConsumed) return "CAPTURED_ONLY" as const;
  if (coverage.materialized && missingConsumers.length > 0 && missingConsumers.every((item) => item.includes("report") || item.includes("diagram") || item.includes("ProjectOverview"))) return "PARTIALLY_PROPAGATED" as const;
  if (coverage.materialized && missingConsumers.length > 0) return "PARTIALLY_PROPAGATED" as const;
  if (coverage.materialized && missingConsumers.length === 0) return "FULLY_PROPAGATED" as const;
  if (coverage.backendConsumed && missingConsumers.length > 0) return "PARTIALLY_PROPAGATED" as const;
  if (coverage.backendConsumed) return "MATERIALIZED" as const;
  return "CAPTURED_ONLY" as const;
}

<<<<<<< HEAD
function readinessFor(lifecycleStatus: RequirementPropagationLifecycleStatus, active: boolean) {
  if (!active && lifecycleStatus !== "UNSUPPORTED") return "PASSED" as const;
  if (lifecycleStatus === "FULLY_PROPAGATED") return "PASSED" as const;
  if (lifecycleStatus === "EXPLICIT_NO_OP") return "PASSED" as const;
  if (lifecycleStatus === "UNSUPPORTED") return "UNSUPPORTED" as const;
  if (lifecycleStatus === "BLOCKED") return "BLOCKING" as const;
  if (lifecycleStatus === "REVIEW_REQUIRED") return "REVIEW_REQUIRED" as const;
  if (lifecycleStatus === "PARTIALLY_PROPAGATED" || lifecycleStatus === "MATERIALIZED") return "WARNING" as const;
  return "BLOCKING" as const;
=======
function readinessFor(lifecycleStatus: RequirementPropagationLifecycleStatus, active: boolean, missingConsumers: string[] = []) {
  if (!active && lifecycleStatus !== "UNSUPPORTED") return "PASSED" as const;
  if (lifecycleStatus === "FULLY_PROPAGATED") return "PASSED" as const;
  if (lifecycleStatus === "UNSUPPORTED") return "UNSUPPORTED" as const;
  if (lifecycleStatus === "BLOCKED") return missingConsumers.length > 0 && missingConsumers.every((consumer) => WIZARD_REVIEW_CONSUMER_GAPS.has(consumer)) ? "REVIEW_REQUIRED" as const : "BLOCKING" as const;
  if (lifecycleStatus === "REVIEW_REQUIRED") return "REVIEW_REQUIRED" as const;
  if (lifecycleStatus === "PARTIALLY_PROPAGATED" || lifecycleStatus === "MATERIALIZED") return "WARNING" as const;
  return "REVIEW_REQUIRED" as const;
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
}

function buildCoverage(args: {
  outcome: RequirementMaterializationOutcome;
  closure?: RequirementsImpactClosureItem;
  traceabilityItems: DesignTraceabilityItem[];
  scenarioSignals: RequirementsScenarioProofSignal[];
  addressingRows: DesignCoreAddressRow[];
  networkObjectModel: NetworkObjectModel;
  enterpriseIpamCandidateCount?: number;
  reportTruth?: BackendReportTruthModel;
  diagramTruth?: BackendDiagramTruthModel;
}): V1RequirementConsumerCoverage {
  const { outcome, closure, traceabilityItems, scenarioSignals, addressingRows, networkObjectModel, reportTruth, diagramTruth } = args;
  const active = outcome.active || valueLooksActive(outcome.sourceValue);
  const captured = outcome.captured;
  const normalized = captured && Boolean(outcome.normalizedSignal && outcome.normalizedSignal.includes(outcome.key));
  const materialized = outcome.materializationStatus === "materialized"
    || outcome.actualEvidence.length > 0
    || closure?.reflectionStatus === "concrete-output"
    || closure?.reflectionStatus === "policy-consequence";
  const backendConsumed = traceabilityItems.length > 0 || Boolean(closure?.captured) || scenarioSignals.length > 0;
  const addressingConsumed = active && (hasAddressingEvidence(outcome, closure) || (addressingRows.length > 0 && includesText(stringsForOutcome(outcome), ["address", "subnet", "vlan", "segment", "host demand"])));
  const routingConsumed = active && hasRoutingEvidence(outcome, closure, networkObjectModel);
  const securityConsumed = active && hasSecurityEvidence(outcome, closure, networkObjectModel);
  const implementationConsumed = active && hasImplementationEvidence(outcome, closure, networkObjectModel);
  const validationConsumed = active && (Boolean(outcome.validationImpact) || (closure?.missingEvidence.length ?? 0) > 0 || outcome.materializationStatus === "validation-blocker");
  const frontendVisible = captured;
  const reportVisible = captured && Boolean(reportTruth) && Boolean(outcome.reportImpact || closure?.visibleIn.some((item) => /report|export/i.test(item)));
  const diagramVisible = active && Boolean(diagramTruth) && Boolean(diagramTruth?.hasModeledTopology) && Boolean(outcome.diagramImpact && !outcome.diagramImpact.toLowerCase().includes("not applicable"));
  const scenarioProven = scenarioSignals.some((signal) => signal.passed);

  return {
    captured,
    normalized,
    materialized,
    backendConsumed,
    addressingConsumed,
    routingConsumed,
    securityConsumed,
    implementationConsumed,
    validationConsumed,
    frontendVisible,
    reportVisible,
    diagramVisible,
    scenarioProven,
  };
}

function evidenceFor(args: {
  outcome: RequirementMaterializationOutcome;
  closure?: RequirementsImpactClosureItem;
  traceabilityItems: DesignTraceabilityItem[];
  scenarioSignals: RequirementsScenarioProofSignal[];
  coverage: V1RequirementConsumerCoverage;
}) {
  const { outcome, closure, traceabilityItems, scenarioSignals, coverage } = args;
  const evidence = new Set<string>();
  if (outcome.normalizedSignal) evidence.add(`Normalized signal: ${outcome.normalizedSignal}`);
  for (const item of outcome.actualEvidence) evidence.add(item);
  for (const item of closure?.concreteOutputs ?? []) evidence.add(item);
  for (const item of closure?.visibleIn ?? []) evidence.add(`Visible in ${item}`);
  for (const item of traceabilityItems.flatMap((trace) => trace.impacts ?? [])) evidence.add(item);
  for (const signal of scenarioSignals) {
    evidence.add(`${signal.passed ? "Passed" : "Checked"} scenario signal: ${signal.label}`);
  }
  if (coverage.reportVisible) evidence.add("Existing backend report/export consumes requirement closure and scenario proof evidence.");
  if (coverage.diagramVisible) evidence.add("Backend diagram truth model has topology evidence for requirement-impact rendering.");
  return Array.from(evidence).slice(0, 14);
}

function buildClosureRow(input: V1Input, outcome: RequirementMaterializationOutcome): V1RequirementClosureMatrixRow {
  const closure = input.requirementsImpactClosure.fieldOutcomes.find((item) => item.key === outcome.key);
  const traceabilityItems = matchingTraceability(input.traceability, outcome);
  const scenarioSignals = matchingScenarioSignals(input.requirementsScenarioProof.signals, outcome.key);
  const coverage = buildCoverage({
    outcome,
    closure,
    traceabilityItems,
    scenarioSignals,
    addressingRows: input.addressingRows,
    networkObjectModel: input.networkObjectModel,
    enterpriseIpamCandidateCount: input.enterpriseIpamCandidateCount,
    reportTruth: input.reportTruth,
    diagramTruth: input.diagramTruth,
  });
  const expectedAffectedEngines = expectedConsumersFor(outcome);
  const reviewOnlyConsumers = reviewOnlyConsumersFor(outcome);
  const explicitNoOpConsumers = explicitNoOpConsumersFor(outcome);
  const actualAffectedEngines = actualConsumersFor({ outcome, closure, scenarioSignals, traceabilityItems, coverage, enterpriseIpamCandidateCount: input.enterpriseIpamCandidateCount });
  const active = outcome.active || valueLooksActive(outcome.sourceValue);
  const missingConsumers = active
    ? expectedAffectedEngines.filter((expected) => !actualAffectedEngines.includes(expected))
    : [];
<<<<<<< HEAD
  const blockedReason = blockingProofFor({ outcome, coverage, missingConsumers, active });
  const lifecycleStatus = lifecycleFor({ outcome, coverage, missingConsumers, active, blockingProof: blockedReason });
  const lifecycleProofStatus = lifecycleProofStatusFor({ outcome, active, blockingProof: blockedReason });
  const readinessImpact = readinessFor(lifecycleStatus, active);
  const reviewReason = outcome.reviewReason
    ?? (closure?.missingEvidence.length ? closure.missingEvidence.join(" ") : undefined)
    ?? blockedReason
    ?? (missingConsumers.length ? `Missing consumer proof: ${missingConsumers.join(", ")}` : undefined)
    ?? (outcome.materializationStatus === "validation-blocker" ? "Validation-blocker materialization state is review-required until a mandatory missing consumer, missing source object, or engine contradiction is proven." : undefined);
=======
  const lifecycleStatus = lifecycleFor({ outcome, coverage, missingConsumers });
  const readinessImpact = readinessFor(lifecycleStatus, active, missingConsumers);
  const reviewReason = outcome.reviewReason
    ?? (closure?.missingEvidence.length ? closure.missingEvidence.join(" ") : undefined)
    ?? (missingConsumers.length ? `Missing consumer proof: ${missingConsumers.join(", ")}` : undefined);
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8

  return {
    requirementId: `req:${outcome.key}`,
    key: outcome.key,
    label: outcome.label,
    category: outcome.category,
    sourceValue: outcome.sourceValue,
    active,
    lifecycleStatus,
    readinessImpact,
    expectedAffectedEngines,
    actualAffectedEngines,
    missingConsumers,
    reviewOnlyConsumers,
    explicitNoOpConsumers,
    consumerCoverage: coverage,
    evidence: evidenceFor({ outcome, closure, traceabilityItems, scenarioSignals, coverage }),
    reviewReason,
<<<<<<< HEAD
    blockedReason,
    lifecycleProofStatus,
=======
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
  };
}

function rowIsBlocking(row: V1RequirementClosureMatrixRow) {
<<<<<<< HEAD
  return row.lifecycleStatus === "BLOCKED" && Boolean(row.blockedReason);
}

function rowNeedsReview(row: V1RequirementClosureMatrixRow) {
  return row.readinessImpact === "REVIEW_REQUIRED" || row.lifecycleStatus === "PARTIALLY_PROPAGATED" || row.lifecycleStatus === "MATERIALIZED" || row.lifecycleProofStatus === "REVIEW_REQUIRED";
=======
  return row.readinessImpact === "BLOCKING" || row.lifecycleStatus === "BLOCKED";
}

function rowNeedsReview(row: V1RequirementClosureMatrixRow) {
  return row.readinessImpact === "REVIEW_REQUIRED" || row.lifecycleStatus === "PARTIALLY_PROPAGATED" || row.lifecycleStatus === "MATERIALIZED";
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
}

function scenarioRelevant(matrixByKey: Map<string, V1RequirementClosureMatrixRow>, keys: string[]) {
  return keys.some((key) => matrixByKey.get(key)?.active);
}

function buildScenarioClosures(matrix: V1RequirementClosureMatrixRow[]): V1GoldenScenarioClosure[] {
  const byKey = new Map(matrix.map((row) => [row.key, row]));
  const definitions: Array<{ id: string; label: string; keys: string[]; forceRelevant?: (rows: Map<string, V1RequirementClosureMatrixRow>) => boolean }> = [
    { id: "small-office", label: "Small office baseline", keys: ["siteCount", "usersPerSite", "internetModel", "management", "wireless"] },
    { id: "multi-site", label: "Multi-site enterprise", keys: ["siteCount", "interSiteTrafficModel", "internetModel", "siteRoleModel"] },
    { id: "guest-wifi", label: "Guest Wi-Fi isolation", keys: ["guestWifi", "guestPolicy", "trustBoundaryModel", "securityPosture"] },
    { id: "voice", label: "Voice and QoS", keys: ["voice", "phoneCount", "voiceQos", "qosModel", "latencySensitivity"] },
    { id: "cloud-hybrid", label: "Cloud / hybrid edge", keys: ["cloudConnected", "environmentType", "cloudConnectivity", "cloudNetworkModel", "cloudRoutingModel", "cloudTrafficBoundary"] },
    { id: "remote-access", label: "Remote access", keys: ["remoteAccess", "remoteAccessMethod", "identityModel", "securityPosture"] },
    { id: "dual-isp", label: "Dual ISP / WAN resilience", keys: ["dualIsp", "resilienceTarget", "outageTolerance", "internetModel"] },
    { id: "healthcare-security-sensitive", label: "Healthcare / security-sensitive posture", keys: ["complianceProfile", "securityPosture", "trustBoundaryModel", "loggingModel", "management", "guestWifi"] },
    { id: "brownfield-migration", label: "Brownfield migration", keys: ["projectStage", "planningFor", "customRequirementsNotes", "rolloutModel", "downtimeConstraint"] },
  ];

  return definitions.map((definition) => {
    const scenarioRows = definition.keys.map((key) => byKey.get(key)).filter(Boolean) as V1RequirementClosureMatrixRow[];
    const relevant = scenarioRelevant(byKey, definition.keys) || Boolean(definition.forceRelevant?.(byKey));
    if (!relevant) {
      return {
        id: definition.id,
        label: definition.label,
        relevant: false,
        requiredRequirementKeys: definition.keys,
        lifecycleStatus: "not-applicable" as const,
        missingRequirementKeys: [],
        blockingRequirementKeys: [],
        reviewRequirementKeys: [],
        evidence: ["Scenario is not selected by the saved requirements."],
      };
    }

    const missingRequirementKeys = definition.keys.filter((key) => !byKey.get(key)?.consumerCoverage.captured && byKey.has(key));
    const blockingRequirementKeys = scenarioRows.filter(rowIsBlocking).map((row) => row.key);
    const reviewRequirementKeys = scenarioRows.filter(rowNeedsReview).map((row) => row.key);
    const lifecycleStatus: V1ScenarioClosureStatus = blockingRequirementKeys.length > 0
      ? "blocked"
      : reviewRequirementKeys.length > 0 || missingRequirementKeys.length > 0
        ? "review-required"
        : "passed";

    return {
      id: definition.id,
      label: definition.label,
      relevant: true,
      requiredRequirementKeys: definition.keys,
      lifecycleStatus,
      missingRequirementKeys,
      blockingRequirementKeys,
      reviewRequirementKeys,
      evidence: scenarioRows.flatMap((row) => row.evidence.slice(0, 2)).slice(0, 12),
    };
  });
}

export function buildV1RequirementsClosureControl(input: V1Input): V1RequirementsClosureControlSummary {
  const closureMatrix = input.V1RequirementsMaterialization.fieldOutcomes.map((outcome) => buildClosureRow(input, outcome));
  const goldenScenarioClosures = buildScenarioClosures(closureMatrix);
  const relevantScenarios = goldenScenarioClosures.filter((scenario) => scenario.relevant);
  const missingConsumerCount = closureMatrix.reduce((sum, row) => sum + row.missingConsumers.length, 0);

  return {
    contractVersion: V1_REQUIREMENTS_CLOSURE_CONTRACT_VERSION,
    totalRequirementCount: closureMatrix.length,
    capturedRequirementCount: closureMatrix.filter((row) => row.consumerCoverage.captured).length,
    activeRequirementCount: closureMatrix.filter((row) => row.active).length,
    fullPropagatedCount: closureMatrix.filter((row) => row.lifecycleStatus === "FULLY_PROPAGATED").length,
    partialPropagatedCount: closureMatrix.filter((row) => row.lifecycleStatus === "PARTIALLY_PROPAGATED").length,
    materializedOnlyCount: closureMatrix.filter((row) => row.lifecycleStatus === "MATERIALIZED").length,
    capturedOnlyCount: closureMatrix.filter((row) => row.lifecycleStatus === "CAPTURED_ONLY").length,
    reviewRequiredCount: closureMatrix.filter((row) => row.lifecycleStatus === "REVIEW_REQUIRED").length,
<<<<<<< HEAD
    blockedCount: closureMatrix.filter((row) => row.lifecycleStatus === "BLOCKED" && Boolean(row.blockedReason)).length,
=======
    blockedCount: closureMatrix.filter((row) => row.lifecycleStatus === "BLOCKED").length,
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
    unsupportedCount: closureMatrix.filter((row) => row.lifecycleStatus === "UNSUPPORTED").length,
    notCapturedCount: closureMatrix.filter((row) => row.lifecycleStatus === "NOT_CAPTURED").length,
    missingConsumerCount,
    scenarioPassedCount: relevantScenarios.filter((scenario) => scenario.lifecycleStatus === "passed").length,
    scenarioReviewCount: relevantScenarios.filter((scenario) => scenario.lifecycleStatus === "review-required").length,
    scenarioBlockedCount: relevantScenarios.filter((scenario) => scenario.lifecycleStatus === "blocked").length,
    closureMatrix,
    goldenScenarioClosures,
    notes: [
      `Consumer registry: ${V1_REQUIREMENT_CONSUMER_REGISTRY_VERSION}.`,
      "V1 is the nothing-got-lost checker: captured requirements must prove normalization, materialization/review state, backend consumption, readiness impact, frontend visibility, report/export evidence, diagram impact when relevant, and scenario proof only when the registry says the requirement is a scenario driver.",
      "The closure matrix does not invent missing downstream facts. It separates mandatory consumers, review-only consumers, and explicit no-op consumers so wizard-generated internal keys do not create fake root blockers.",
<<<<<<< HEAD
      "A requirement may be BLOCKED only when a mandatory consumer gap, missing required source object, or explicit engine contradiction is recorded in blockedReason. Validation-blocker without root proof is review-required, not a root blocker.",
=======
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
      "Golden scenario closures are derived from the same backend evidence and keep small office, multi-site, guest Wi-Fi, voice, cloud/hybrid, remote access, dual ISP, security-sensitive, and brownfield cases visible.",
    ],
  };
}
