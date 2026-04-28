import type { SynthesizedLogicalDesign } from "./designSynthesis.types";

export type RecoveryPhaseStatus = "ready" | "partial" | "pending";

export interface RecoveryPhaseReview {
  key: string;
  label: string;
  status: RecoveryPhaseStatus;
  detail: string;
  blockers: string[];
}

export interface RecoveryRoadmapReview {
  overallStatus: RecoveryPhaseStatus;
  completedCount: number;
  partialCount: number;
  pendingCount: number;
  phases: RecoveryPhaseReview[];
  topBlockers: string[];
  nextMoves: string[];
}

function scoreToStatus(score: number): RecoveryPhaseStatus {
  if (score >= 0.85) return "ready";
  if (score >= 0.45) return "partial";
  return "pending";
}

function ratio(part: number, whole: number) {
  if (whole <= 0) return 0;
  return part / whole;
}

function unique(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && `${value}`.trim()))));
}

export function buildRecoveryRoadmapStatus(design: SynthesizedLogicalDesign): RecoveryRoadmapReview {
  const truth = design.designTruthModel;
  const requiredFlows = design.flowCoverage.filter((item) => item.required);
  const readyRequiredFlows = requiredFlows.filter((item) => item.status === "ready");
  const readyCoverageItems = truth.coverage.filter((item) => item.status === "ready");
  const routeDomainsExplicit = truth.routeDomains.filter((item) => item.sourceModel === "explicit").length;
  const boundaryDomainsExplicit = truth.boundaryDomains.filter((item) => item.sourceModel === "explicit").length;
  const routeDomainsInferred = truth.routeDomains.filter((item) => item.sourceModel === "inferred").length;
  const boundaryDomainsInferred = truth.boundaryDomains.filter((item) => item.sourceModel === "inferred").length;
  const unresolvedCount = truth.unresolvedReferences.length;
  const serviceBoundaryLinked = design.servicePlacements.filter((service) =>
    truth.serviceDomains.some((domain) => domain.serviceName === service.serviceName && Boolean(domain.boundaryId)),
  ).length;
  const routeLinkedFlows = truth.flowContracts.filter((flow) => flow.routeDomainIds.length > 0).length;
  const boundaryLinkedFlows = truth.flowContracts.filter((flow) => flow.boundaryIds.length > 0).length;
  const wanVisible = design.wanLinks.length + truth.wanAdjacencies.length;
  const dmzVisible = design.securityBoundaries.filter((item) => item.zoneName.toLowerCase().includes("dmz") || item.zoneName.toLowerCase().includes("public")).length
    + design.servicePlacements.filter((item) => item.placementType === "dmz").length;

  const phaseBScore = (
    ratio(routeDomainsExplicit, Math.max(1, truth.routeDomains.length)) * 0.3
    + ratio(boundaryDomainsExplicit, Math.max(1, truth.boundaryDomains.length)) * 0.3
    + ratio(serviceBoundaryLinked, Math.max(1, design.servicePlacements.length || 1)) * 0.2
    + ratio(Math.max(0, 8 - Math.min(unresolvedCount, 8)), 8) * 0.2
  );
  const phaseBBlockers = unique([
    routeDomainsInferred > 0 ? `${routeDomainsInferred} route domain${routeDomainsInferred === 1 ? " is" : "s are"} still inferred.` : undefined,
    boundaryDomainsInferred > 0 ? `${boundaryDomainsInferred} boundary domain${boundaryDomainsInferred === 1 ? " is" : "s are"} still inferred.` : undefined,
    unresolvedCount > 0 ? `${unresolvedCount} unresolved cross-object reference${unresolvedCount === 1 ? " remains" : "s remain"}.` : undefined,
  ]);

  const phaseCScore = (
    (design.topology.topologyType ? 0.25 : 0)
    + (design.sitePlacements.length > 0 ? 0.2 : 0)
    + (design.highLevelDesign.rationale.length > 0 ? 0.2 : 0)
    + (wanVisible > 0 || design.topology.topologyType === "collapsed-core" ? 0.2 : 0)
    + (design.trafficFlows.some((flow) => flow.path.length > 1) ? 0.15 : 0)
  );
  const phaseCBlockers = unique([
    design.topology.topologyType === "hub-spoke" && !design.trafficFlows.some((flow) => flow.path.some((hop) => hop.includes(design.topology.primarySiteName || "")))
      ? "Hub-and-spoke selections still need more hub-visible path evidence."
      : undefined,
    design.topology.cloudConnected && !design.servicePlacements.some((service) => service.placementType === "cloud" || service.serviceType === "cloud-service")
      ? "Hybrid/cloud topology is selected, but cloud-hosted services are still thin."
      : undefined,
  ]);

  const phaseDScore = (
    (design.addressingPlan.length > 0 ? 0.25 : 0)
    + ratio(design.addressingPlan.filter((row) => Boolean(row.zoneName)).length, Math.max(1, design.addressingPlan.length)) * 0.2
    + ratio(design.addressingPlan.filter((row) => Boolean(row.siteBlockCidr)).length, Math.max(1, design.addressingPlan.length)) * 0.2
    + (design.wanLinks.length > 0 || design.topology.topologyType === "collapsed-core" ? 0.15 : 0)
    + (design.routingPlan.some((item) => Boolean(item.loopbackCidr)) ? 0.1 : 0)
    + (design.addressingPlan.some((row) => (row.zoneName || "").toLowerCase().includes("management")) ? 0.1 : 0)
  );
  const phaseDBlockers = unique([
    design.stats.rowsOutsideSiteBlocks > 0 ? `${design.stats.rowsOutsideSiteBlocks} subnet row${design.stats.rowsOutsideSiteBlocks === 1 ? " sits" : "s sit"} outside the assigned site block.` : undefined,
    design.stats.missingSiteBlocks > 0 ? `${design.stats.missingSiteBlocks} site summary block${design.stats.missingSiteBlocks === 1 ? " is" : "s are"} still missing.` : undefined,
    !design.addressingPlan.some((row) => (row.zoneName || "").toLowerCase().includes("management")) ? "Management addressing is not explicit yet." : undefined,
  ]);

  const phaseEScore = (
    ratio(readyRequiredFlows.length, Math.max(1, requiredFlows.length)) * 0.45
    + ratio(routeLinkedFlows, Math.max(1, truth.flowContracts.length || 1)) * 0.2
    + ratio(boundaryLinkedFlows, Math.max(1, truth.flowContracts.length || 1)) * 0.2
    + (design.trafficFlows.some((flow) => flow.controlPoints.length > 0) ? 0.15 : 0)
  );
  const phaseEBlockers = unique([
    requiredFlows.filter((item) => item.status !== "ready").length > 0
      ? `${requiredFlows.filter((item) => item.status !== "ready").length} required flow categor${requiredFlows.filter((item) => item.status !== "ready").length === 1 ? "y is" : "ies are"} still not fully covered.`
      : undefined,
    truth.flowContracts.filter((flow) => flow.routeDomainIds.length === 0 || flow.boundaryIds.length === 0).length > 0
      ? `${truth.flowContracts.filter((flow) => flow.routeDomainIds.length === 0 || flow.boundaryIds.length === 0).length} flow contract${truth.flowContracts.filter((flow) => flow.routeDomainIds.length === 0 || flow.boundaryIds.length === 0).length === 1 ? " still lacks" : "s still lack"} full route or boundary linkage.`
      : undefined,
  ]);

  const phaseFScore = (
    (design.securityBoundaries.length > 0 ? 0.25 : 0)
    + ratio(boundaryDomainsExplicit, Math.max(1, truth.boundaryDomains.length)) * 0.2
    + ratio(design.securityBoundaries.filter((item) => item.permittedPeers.length > 0).length, Math.max(1, design.securityBoundaries.length || 1)) * 0.2
    + ratio(design.securityBoundaries.filter((item) => Boolean(item.controlPoint)).length, Math.max(1, design.securityBoundaries.length || 1)) * 0.2
    + (dmzVisible > 0 || !design.servicePlacements.some((item) => item.placementType === "dmz") ? 0.15 : 0)
  );
  const phaseFBlockers = unique([
    boundaryDomainsInferred > 0 ? `${boundaryDomainsInferred} security boundary object${boundaryDomainsInferred === 1 ? " is" : "s are"} still inferred.` : undefined,
    design.securityBoundaries.filter((item) => item.permittedPeers.length === 0).length > 0
      ? `${design.securityBoundaries.filter((item) => item.permittedPeers.length === 0).length} boundary definition${design.securityBoundaries.filter((item) => item.permittedPeers.length === 0).length === 1 ? " still needs" : "s still need"} clearer peer restrictions.`
      : undefined,
  ]);

  const phaseGScore = (
    (design.designSummary.length > 0 ? 0.15 : 0)
    + (design.lowLevelDesign.length > 0 ? 0.2 : 0)
    + (design.traceability.length > 0 ? 0.15 : 0)
    + (design.implementationPhases.length > 0 ? 0.1 : 0)
    + (design.openIssues.length > 0 ? 0.1 : 0)
    + ratio(readyCoverageItems.length, Math.max(1, truth.coverage.length)) * 0.15
    + (truth.flowContracts.length > 0 && truth.boundaryDomains.length > 0 ? 0.15 : 0)
  );
  const phaseGBlockers = unique([
    design.traceability.length === 0 ? "Traceability is still missing from the synthesized report package." : undefined,
    design.lowLevelDesign.length === 0 ? "Per-site low-level design rows are still missing." : undefined,
    truth.unresolvedReferences.length > 0 ? "The report package still inherits unresolved truth-model references." : undefined,
  ]);

  const phaseHScore = (
    (design.designEngineFoundation.coverage.length > 0 ? 0.2 : 0)
    + (design.implementationNextSteps.length > 0 ? 0.2 : 0)
    + (design.validationPlan.length > 0 ? 0.15 : 0)
    + (design.highLevelDesign.rationale.length > 0 ? 0.15 : 0)
    + (requiredFlows.length > 0 ? 0.15 : 0)
    + 0.15
  );
  const phaseHBlockers = unique([
    "Some workspaces still carry too many equal-weight panels and need another focused density pass.",
    "Recovery UX should keep surfacing critical outputs first and deeper detail second.",
  ]);

  const phaseIScore = (
    (design.validationPlan.length > 0 ? 0.2 : 0)
    + (design.cutoverChecklist.length > 0 ? 0.15 : 0)
    + (design.implementationRisks.length > 0 ? 0.15 : 0)
    + (design.configurationTemplates.length > 0 ? 0.15 : 0)
    + 0.2
    + (unresolvedCount === 0 ? 0.15 : unresolvedCount <= 6 ? 0.08 : 0)
  );
  const phaseIBlockers = unique([
    unresolvedCount > 0 ? "Some interactions still depend on thin or unresolved model references." : undefined,
    "Low-value or future-only controls still need another product-wide audit pass.",
  ]);

  const phaseJScore = (
    (design.sitePlacements.length > 0 ? 0.2 : 0)
    + (truth.siteNodes.length > 0 ? 0.15 : 0)
    + (truth.wanAdjacencies.length > 0 || design.topology.topologyType === "collapsed-core" ? 0.15 : 0)
    + (truth.boundaryDomains.length > 0 ? 0.15 : 0)
    + (truth.flowContracts.length > 0 ? 0.15 : 0)
    + (truth.serviceDomains.length > 0 ? 0.1 : 0)
    + (routeDomainsExplicit + boundaryDomainsExplicit > 0 ? 0.1 : 0)
  );
  const phaseJBlockers = unique([
    routeDomainsInferred + boundaryDomainsInferred > 0 ? "Diagram rendering still depends partly on inferred route or boundary objects." : undefined,
    design.sitePlacements.length === 0 ? "No device-aware placements exist yet for topology rendering." : undefined,
    truth.flowContracts.length === 0 ? "Traffic-path overlays are still too thin for a true topology view." : undefined,
  ]);

  const phases: RecoveryPhaseReview[] = [
    {
      key: "phase-b",
      label: "Phase B — Real design data model",
      status: scoreToStatus(phaseBScore),
      detail: `The shared model currently resolves ${truth.siteNodes.length} site nodes, ${truth.routeDomains.length} route domains, ${truth.boundaryDomains.length} boundary domains, ${truth.serviceDomains.length} service domains, and ${truth.flowContracts.length} flow contracts.`,
      blockers: phaseBBlockers,
    },
    {
      key: "phase-c",
      label: "Phase C — Topology-specific synthesis",
      status: scoreToStatus(phaseCScore),
      detail: `Topology-specific behavior is being synthesized for ${design.topology.topologyLabel.toLowerCase()} with ${design.sitePlacements.length} placement object${design.sitePlacements.length === 1 ? "" : "s"} and ${design.trafficFlows.length} explicit traffic path${design.trafficFlows.length === 1 ? "" : "s"}.`,
      blockers: phaseCBlockers,
    },
    {
      key: "phase-d",
      label: "Phase D — Addressing drives everything",
      status: scoreToStatus(phaseDScore),
      detail: `The design currently carries ${design.addressingPlan.length} addressing row${design.addressingPlan.length === 1 ? "" : "s"}, ${design.wanLinks.length} WAN transit row${design.wanLinks.length === 1 ? "" : "s"}, and ${design.siteHierarchy.length} site hierarchy row${design.siteHierarchy.length === 1 ? "" : "s"}.`,
      blockers: phaseDBlockers,
    },
    {
      key: "phase-e",
      label: "Phase E — Real flow engine",
      status: scoreToStatus(phaseEScore),
      detail: `${readyRequiredFlows.length} of ${requiredFlows.length} required flow categor${requiredFlows.length === 1 ? "y is" : "ies are"} fully covered, and ${truth.flowContracts.length} flow contract${truth.flowContracts.length === 1 ? " is" : "s are"} linked into the shared model.`,
      blockers: phaseEBlockers,
    },
    {
      key: "phase-f",
      label: "Phase F — Concrete boundary design",
      status: scoreToStatus(phaseFScore),
      detail: `The security model currently exposes ${design.securityBoundaries.length} concrete boundary row${design.securityBoundaries.length === 1 ? "" : "s"} and ${truth.boundaryDomains.length} boundary domain${truth.boundaryDomains.length === 1 ? "" : "s"}.`,
      blockers: phaseFBlockers,
    },
    {
      key: "phase-g",
      label: "Phase G — Report built around facts",
      status: scoreToStatus(phaseGScore),
      detail: `The report-side design package currently includes ${design.lowLevelDesign.length} site design row${design.lowLevelDesign.length === 1 ? "" : "s"}, ${design.traceability.length} traceability item${design.traceability.length === 1 ? "" : "s"}, and ${design.implementationPhases.length} implementation phase${design.implementationPhases.length === 1 ? "" : "s"}.`,
      blockers: phaseGBlockers,
    },
    {
      key: "phase-h",
      label: "Phase H — UX rescue roadmap",
      status: scoreToStatus(phaseHScore),
      detail: `The design package now has stronger staged outputs and next-step guidance, but the UX rescue pass still needs another deliberate cleanup on density and hierarchy.`,
      blockers: phaseHBlockers,
    },
    {
      key: "phase-i",
      label: "Phase I — Interaction reliability pass",
      status: scoreToStatus(phaseIScore),
      detail: `Validation, implementation planning, and risk outputs now exist, but the broader control audit should still keep removing low-confidence or low-value actions.`,
      blockers: phaseIBlockers,
    },
    {
      key: "phase-j",
      label: "Phase J — Real topology diagram engine",
      status: scoreToStatus(phaseJScore),
      detail: `Diagram truth now has ${design.sitePlacements.length} device placement${design.sitePlacements.length === 1 ? "" : "s"}, ${truth.wanAdjacencies.length} WAN adjacency${truth.wanAdjacencies.length === 1 ? "" : "ies"}, ${truth.boundaryDomains.length} boundary domain${truth.boundaryDomains.length === 1 ? "" : "s"}, and ${truth.flowContracts.length} flow contract${truth.flowContracts.length === 1 ? "" : "s"}.`,
      blockers: phaseJBlockers,
    },
  ];

  const completedCount = phases.filter((phase) => phase.status === "ready").length;
  const partialCount = phases.filter((phase) => phase.status === "partial").length;
  const pendingCount = phases.filter((phase) => phase.status === "pending").length;
  const overallScore = phases.reduce((sum, phase) => sum + (phase.status === "ready" ? 1 : phase.status === "partial" ? 0.55 : 0.15), 0) / phases.length;
  const overallStatus = scoreToStatus(overallScore);
  const topBlockers = unique(phases.flatMap((phase) => phase.blockers.map((blocker) => `${phase.label}: ${blocker}`))).slice(0, 8);
  const nextMoves = unique([
    phaseBBlockers[0] ? "Keep converting inferred route and boundary objects into stronger explicit records earlier in the planner." : undefined,
    phaseEBlockers[0] ? "Keep expanding required traffic-path coverage until all required flow categories are ready." : undefined,
    phaseJBlockers[0] ? "Continue converging the diagram engine so every major overlay reads from the same core truth layer." : undefined,
    "Finish the later UX and interaction cleanup only after the core design truth is stable enough to support it cleanly.",
  ]).slice(0, 5);

  return {
    overallStatus,
    completedCount,
    partialCount,
    pendingCount,
    phases,
    topBlockers,
    nextMoves,
  };
}


export interface RecoveryMasterRoadmapGate {
  status: "stay-on-recovery" | "near-transition" | "ready-for-master";
  summary: string;
  blockers: string[];
  readyPhases: string[];
}

export function buildRecoveryMasterRoadmapGate(review: RecoveryRoadmapReview): RecoveryMasterRoadmapGate {
  const missingCore = review.phases.filter((phase) => ["phase-b", "phase-c", "phase-d", "phase-e", "phase-f", "phase-g", "phase-j"].includes(phase.key) && phase.status !== "ready");
  const weakLate = review.phases.filter((phase) => ["phase-h", "phase-i"].includes(phase.key) && phase.status === "pending");
  const blockers = unique([
    ...missingCore.flatMap((phase) => phase.blockers.slice(0, 2).map((blocker) => `${phase.label}: ${blocker}`)),
    ...weakLate.flatMap((phase) => phase.blockers.slice(0, 1).map((blocker) => `${phase.label}: ${blocker}`)),
  ]).slice(0, 6);
  const readyPhases = review.phases.filter((phase) => phase.status === "ready").map((phase) => phase.label);

  if (missingCore.length === 0 && weakLate.length === 0 && review.pendingCount === 0) {
    return {
      status: "ready-for-master",
      summary: "Recovery work is strong enough to move back onto the master roadmap. Core design truth, report fidelity, diagram realism, and later UX/reliability phases are all at least review-ready.",
      blockers,
      readyPhases,
    };
  }

  if (missingCore.length <= 2 && review.pendingCount <= 2) {
    return {
      status: "near-transition",
      summary: "Recovery is close to handoff, but a few remaining core gaps should be closed before switching back to the master roadmap.",
      blockers,
      readyPhases,
    };
  }

  return {
    status: "stay-on-recovery",
    summary: "Stay on the recovery roadmap. The app still has unresolved core design-engine or recovery-UX gaps that should be tightened before resuming the broader master roadmap.",
    blockers,
    readyPhases,
  };
}
