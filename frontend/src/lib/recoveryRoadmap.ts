import type { SynthesizedLogicalDesign } from "./designSynthesis.types";

export type RecoveryStageStatus = "ready" | "partial" | "pending";

export interface RecoveryStageReview {
  key: string;
  label: string;
  status: RecoveryStageStatus;
  detail: string;
  blockers: string[];
}

export interface RecoveryRoadmapReview {
  overallStatus: RecoveryStageStatus;
  completedCount: number;
  partialCount: number;
  pendingCount: number;
  stages: RecoveryStageReview[];
  topBlockers: string[];
  nextMoves: string[];
}

function scoreToStatus(score: number): RecoveryStageStatus {
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

  const stageBScore = (
    ratio(routeDomainsExplicit, Math.max(1, truth.routeDomains.length)) * 0.3
    + ratio(boundaryDomainsExplicit, Math.max(1, truth.boundaryDomains.length)) * 0.3
    + ratio(serviceBoundaryLinked, Math.max(1, design.servicePlacements.length || 1)) * 0.2
    + ratio(Math.max(0, 8 - Math.min(unresolvedCount, 8)), 8) * 0.2
  );
  const stageBBlockers = unique([
    routeDomainsInferred > 0 ? `${routeDomainsInferred} route domain${routeDomainsInferred === 1 ? " is" : "s are"} still inferred.` : undefined,
    boundaryDomainsInferred > 0 ? `${boundaryDomainsInferred} boundary domain${boundaryDomainsInferred === 1 ? " is" : "s are"} still inferred.` : undefined,
    unresolvedCount > 0 ? `${unresolvedCount} unresolved cross-object reference${unresolvedCount === 1 ? " remains" : "s remain"}.` : undefined,
  ]);

  const stageCScore = (
    (design.topology.topologyType ? 0.25 : 0)
    + (design.sitePlacements.length > 0 ? 0.2 : 0)
    + (design.highLevelDesign.rationale.length > 0 ? 0.2 : 0)
    + (wanVisible > 0 || design.topology.topologyType === "collapsed-core" ? 0.2 : 0)
    + (design.trafficFlows.some((flow) => flow.path.length > 1) ? 0.15 : 0)
  );
  const stageCBlockers = unique([
    design.topology.topologyType === "hub-spoke" && !design.trafficFlows.some((flow) => flow.path.some((hop) => hop.includes(design.topology.primarySiteName || "")))
      ? "Hub-and-spoke selections still need more hub-visible path evidence."
      : undefined,
    design.topology.cloudConnected && !design.servicePlacements.some((service) => service.placementType === "cloud" || service.serviceType === "cloud-service")
      ? "Hybrid/cloud topology is selected, but cloud-hosted services are still thin."
      : undefined,
  ]);

  const stageDScore = (
    (design.addressingPlan.length > 0 ? 0.25 : 0)
    + ratio(design.addressingPlan.filter((row) => Boolean(row.zoneName)).length, Math.max(1, design.addressingPlan.length)) * 0.2
    + ratio(design.addressingPlan.filter((row) => Boolean(row.siteBlockCidr)).length, Math.max(1, design.addressingPlan.length)) * 0.2
    + (design.wanLinks.length > 0 || design.topology.topologyType === "collapsed-core" ? 0.15 : 0)
    + (design.routingPlan.some((item) => Boolean(item.loopbackCidr)) ? 0.1 : 0)
    + (design.addressingPlan.some((row) => (row.zoneName || "").toLowerCase().includes("management")) ? 0.1 : 0)
  );
  const stageDBlockers = unique([
    design.stats.rowsOutsideSiteBlocks > 0 ? `${design.stats.rowsOutsideSiteBlocks} subnet row${design.stats.rowsOutsideSiteBlocks === 1 ? " sits" : "s sit"} outside the assigned site block.` : undefined,
    design.stats.missingSiteBlocks > 0 ? `${design.stats.missingSiteBlocks} site summary block${design.stats.missingSiteBlocks === 1 ? " is" : "s are"} still missing.` : undefined,
    !design.addressingPlan.some((row) => (row.zoneName || "").toLowerCase().includes("management")) ? "Management addressing is not explicit yet." : undefined,
  ]);

  const stageEScore = (
    ratio(readyRequiredFlows.length, Math.max(1, requiredFlows.length)) * 0.45
    + ratio(routeLinkedFlows, Math.max(1, truth.flowContracts.length || 1)) * 0.2
    + ratio(boundaryLinkedFlows, Math.max(1, truth.flowContracts.length || 1)) * 0.2
    + (design.trafficFlows.some((flow) => flow.controlPoints.length > 0) ? 0.15 : 0)
  );
  const stageEBlockers = unique([
    requiredFlows.filter((item) => item.status !== "ready").length > 0
      ? `${requiredFlows.filter((item) => item.status !== "ready").length} required flow categor${requiredFlows.filter((item) => item.status !== "ready").length === 1 ? "y is" : "ies are"} still not fully covered.`
      : undefined,
    truth.flowContracts.filter((flow) => flow.routeDomainIds.length === 0 || flow.boundaryIds.length === 0).length > 0
      ? `${truth.flowContracts.filter((flow) => flow.routeDomainIds.length === 0 || flow.boundaryIds.length === 0).length} flow contract${truth.flowContracts.filter((flow) => flow.routeDomainIds.length === 0 || flow.boundaryIds.length === 0).length === 1 ? " still lacks" : "s still lack"} full route or boundary linkage.`
      : undefined,
  ]);

  const stageFScore = (
    (design.securityBoundaries.length > 0 ? 0.25 : 0)
    + ratio(boundaryDomainsExplicit, Math.max(1, truth.boundaryDomains.length)) * 0.2
    + ratio(design.securityBoundaries.filter((item) => item.permittedPeers.length > 0).length, Math.max(1, design.securityBoundaries.length || 1)) * 0.2
    + ratio(design.securityBoundaries.filter((item) => Boolean(item.controlPoint)).length, Math.max(1, design.securityBoundaries.length || 1)) * 0.2
    + (dmzVisible > 0 || !design.servicePlacements.some((item) => item.placementType === "dmz") ? 0.15 : 0)
  );
  const stageFBlockers = unique([
    boundaryDomainsInferred > 0 ? `${boundaryDomainsInferred} security boundary object${boundaryDomainsInferred === 1 ? " is" : "s are"} still inferred.` : undefined,
    design.securityBoundaries.filter((item) => item.permittedPeers.length === 0).length > 0
      ? `${design.securityBoundaries.filter((item) => item.permittedPeers.length === 0).length} boundary definition${design.securityBoundaries.filter((item) => item.permittedPeers.length === 0).length === 1 ? " still needs" : "s still need"} clearer peer restrictions.`
      : undefined,
  ]);

  const stageGScore = (
    (design.designSummary.length > 0 ? 0.15 : 0)
    + (design.lowLevelDesign.length > 0 ? 0.2 : 0)
    + (design.traceability.length > 0 ? 0.15 : 0)
    + (design.implementationStages.length > 0 ? 0.1 : 0)
    + (design.openIssues.length > 0 ? 0.1 : 0)
    + ratio(readyCoverageItems.length, Math.max(1, truth.coverage.length)) * 0.15
    + (truth.flowContracts.length > 0 && truth.boundaryDomains.length > 0 ? 0.15 : 0)
  );
  const stageGBlockers = unique([
    design.traceability.length === 0 ? "Traceability is still missing from the synthesized report package." : undefined,
    design.lowLevelDesign.length === 0 ? "Per-site low-level design rows are still missing." : undefined,
    truth.unresolvedReferences.length > 0 ? "The report package still inherits unresolved truth-model references." : undefined,
  ]);

  const stageHScore = (
    (design.designEngineFoundation.coverage.length > 0 ? 0.2 : 0)
    + (design.implementationNextSteps.length > 0 ? 0.2 : 0)
    + (design.validationPlan.length > 0 ? 0.15 : 0)
    + (design.highLevelDesign.rationale.length > 0 ? 0.15 : 0)
    + (requiredFlows.length > 0 ? 0.15 : 0)
    + 0.15
  );
  const stageHBlockers = unique([
    "Some workspaces still carry too many equal-weight panels and need another focused density pass.",
    "Recovery UX should keep surfacing critical outputs first and deeper detail second.",
  ]);

  const stageIScore = (
    (design.validationPlan.length > 0 ? 0.2 : 0)
    + (design.cutoverChecklist.length > 0 ? 0.15 : 0)
    + (design.implementationRisks.length > 0 ? 0.15 : 0)
    + (design.configurationTemplates.length > 0 ? 0.15 : 0)
    + 0.2
    + (unresolvedCount === 0 ? 0.15 : unresolvedCount <= 6 ? 0.08 : 0)
  );
  const stageIBlockers = unique([
    unresolvedCount > 0 ? "Some interactions still depend on thin or unresolved model references." : undefined,
    "Low-value or future-only controls still need another product-wide audit pass.",
  ]);

  const stageJScore = (
    (design.sitePlacements.length > 0 ? 0.2 : 0)
    + (truth.siteNodes.length > 0 ? 0.15 : 0)
    + (truth.wanAdjacencies.length > 0 || design.topology.topologyType === "collapsed-core" ? 0.15 : 0)
    + (truth.boundaryDomains.length > 0 ? 0.15 : 0)
    + (truth.flowContracts.length > 0 ? 0.15 : 0)
    + (truth.serviceDomains.length > 0 ? 0.1 : 0)
    + (routeDomainsExplicit + boundaryDomainsExplicit > 0 ? 0.1 : 0)
  );
  const stageJBlockers = unique([
    routeDomainsInferred + boundaryDomainsInferred > 0 ? "Diagram rendering still depends partly on inferred route or boundary objects." : undefined,
    design.sitePlacements.length === 0 ? "No device-aware placements exist yet for topology rendering." : undefined,
    truth.flowContracts.length === 0 ? "Traffic-path overlays are still too thin for a true topology view." : undefined,
  ]);

  const stages: RecoveryStageReview[] = [
    {
      key: "stage-b",
      label: "Stage B — Real design data model",
      status: scoreToStatus(stageBScore),
      detail: `The shared model currently resolves ${truth.siteNodes.length} site nodes, ${truth.routeDomains.length} route domains, ${truth.boundaryDomains.length} boundary domains, ${truth.serviceDomains.length} service domains, and ${truth.flowContracts.length} flow contracts.`,
      blockers: stageBBlockers,
    },
    {
      key: "stage-c",
      label: "Stage C — Topology-specific synthesis",
      status: scoreToStatus(stageCScore),
      detail: `Topology-specific behavior is being synthesized for ${design.topology.topologyLabel.toLowerCase()} with ${design.sitePlacements.length} placement object${design.sitePlacements.length === 1 ? "" : "s"} and ${design.trafficFlows.length} explicit traffic path${design.trafficFlows.length === 1 ? "" : "s"}.`,
      blockers: stageCBlockers,
    },
    {
      key: "stage-d",
      label: "Stage D — Addressing drives everything",
      status: scoreToStatus(stageDScore),
      detail: `The design currently carries ${design.addressingPlan.length} addressing row${design.addressingPlan.length === 1 ? "" : "s"}, ${design.wanLinks.length} WAN transit row${design.wanLinks.length === 1 ? "" : "s"}, and ${design.siteHierarchy.length} site hierarchy row${design.siteHierarchy.length === 1 ? "" : "s"}.`,
      blockers: stageDBlockers,
    },
    {
      key: "stage-e",
      label: "Stage E — Real flow engine",
      status: scoreToStatus(stageEScore),
      detail: `${readyRequiredFlows.length} of ${requiredFlows.length} required flow categor${requiredFlows.length === 1 ? "y is" : "ies are"} fully covered, and ${truth.flowContracts.length} flow contract${truth.flowContracts.length === 1 ? " is" : "s are"} linked into the shared model.`,
      blockers: stageEBlockers,
    },
    {
      key: "stage-f",
      label: "Stage F — Concrete boundary design",
      status: scoreToStatus(stageFScore),
      detail: `The security model currently exposes ${design.securityBoundaries.length} concrete boundary row${design.securityBoundaries.length === 1 ? "" : "s"} and ${truth.boundaryDomains.length} boundary domain${truth.boundaryDomains.length === 1 ? "" : "s"}.`,
      blockers: stageFBlockers,
    },
    {
      key: "stage-g",
      label: "Stage G — Report built around facts",
      status: scoreToStatus(stageGScore),
      detail: `The report-side design package currently includes ${design.lowLevelDesign.length} site design row${design.lowLevelDesign.length === 1 ? "" : "s"}, ${design.traceability.length} traceability item${design.traceability.length === 1 ? "" : "s"}, and ${design.implementationStages.length} implementation stage${design.implementationStages.length === 1 ? "" : "s"}.`,
      blockers: stageGBlockers,
    },
    {
      key: "stage-h",
      label: "Stage H — UX rescue roadmap",
      status: scoreToStatus(stageHScore),
      detail: `The design package now has stronger staged outputs and next-step guidance, but the UX rescue pass still needs another deliberate cleanup on density and hierarchy.`,
      blockers: stageHBlockers,
    },
    {
      key: "stage-i",
      label: "Stage I — Interaction reliability pass",
      status: scoreToStatus(stageIScore),
      detail: `Validation, implementation planning, and risk outputs now exist, but the broader control audit should still keep removing low-confidence or low-value actions.`,
      blockers: stageIBlockers,
    },
    {
      key: "stage-j",
      label: "Stage J — Real topology diagram engine",
      status: scoreToStatus(stageJScore),
      detail: `Diagram truth now has ${design.sitePlacements.length} device placement${design.sitePlacements.length === 1 ? "" : "s"}, ${truth.wanAdjacencies.length} WAN adjacency${truth.wanAdjacencies.length === 1 ? "" : "ies"}, ${truth.boundaryDomains.length} boundary domain${truth.boundaryDomains.length === 1 ? "" : "s"}, and ${truth.flowContracts.length} flow contract${truth.flowContracts.length === 1 ? "" : "s"}.`,
      blockers: stageJBlockers,
    },
  ];

  const completedCount = stages.filter((stage) => stage.status === "ready").length;
  const partialCount = stages.filter((stage) => stage.status === "partial").length;
  const pendingCount = stages.filter((stage) => stage.status === "pending").length;
  const overallScore = stages.reduce((sum, stage) => sum + (stage.status === "ready" ? 1 : stage.status === "partial" ? 0.55 : 0.15), 0) / stages.length;
  const overallStatus = scoreToStatus(overallScore);
  const topBlockers = unique(stages.flatMap((stage) => stage.blockers.map((blocker) => `${stage.label}: ${blocker}`))).slice(0, 8);
  const nextMoves = unique([
    stageBBlockers[0] ? "Keep converting inferred route and boundary objects into stronger explicit records earlier in the planner." : undefined,
    stageEBlockers[0] ? "Keep expanding required traffic-path coverage until all required flow categories are ready." : undefined,
    stageJBlockers[0] ? "Continue converging the diagram engine so every major overlay reads from the same core truth layer." : undefined,
    "Finish the later UX and interaction cleanup only after the core design truth is stable enough to support it cleanly.",
  ]).slice(0, 5);

  return {
    overallStatus,
    completedCount,
    partialCount,
    pendingCount,
    stages,
    topBlockers,
    nextMoves,
  };
}


export interface RecoveryMasterRoadmapGate {
  status: "stay-on-recovery" | "near-transition" | "ready-for-master";
  summary: string;
  blockers: string[];
  readyStages: string[];
}

export function buildRecoveryMasterRoadmapGate(review: RecoveryRoadmapReview): RecoveryMasterRoadmapGate {
  const missingCore = review.stages.filter((stage) => ["stage-b", "stage-c", "stage-d", "stage-e", "stage-f", "stage-g", "stage-j"].includes(stage.key) && stage.status !== "ready");
  const weakLate = review.stages.filter((stage) => ["stage-h", "stage-i"].includes(stage.key) && stage.status === "pending");
  const blockers = unique([
    ...missingCore.flatMap((stage) => stage.blockers.slice(0, 2).map((blocker) => `${stage.label}: ${blocker}`)),
    ...weakLate.flatMap((stage) => stage.blockers.slice(0, 1).map((blocker) => `${stage.label}: ${blocker}`)),
  ]).slice(0, 6);
  const readyStages = review.stages.filter((stage) => stage.status === "ready").map((stage) => stage.label);

  if (missingCore.length === 0 && weakLate.length === 0 && review.pendingCount === 0) {
    return {
      status: "ready-for-master",
      summary: "Recovery work is strong enough to move back onto the master roadmap. Core design truth, report fidelity, diagram realism, and later UX/reliability stages are all at least review-ready.",
      blockers,
      readyStages,
    };
  }

  if (missingCore.length <= 2 && review.pendingCount <= 2) {
    return {
      status: "near-transition",
      summary: "Recovery is close to handoff, but a few remaining core gaps should be closed before switching back to the master roadmap.",
      blockers,
      readyStages,
    };
  }

  return {
    status: "stay-on-recovery",
    summary: "Stay on the recovery roadmap. The app still has unresolved core design-engine or recovery-UX gaps that should be tightened before resuming the broader master roadmap.",
    blockers,
    readyStages,
  };
}
