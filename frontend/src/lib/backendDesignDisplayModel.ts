import type { Project } from "./types";
import type { SynthesizedLogicalDesign, TopologyBlueprint } from "./designSynthesis.types";
import type { UnifiedDesignTruthModel } from "./designTruthModel";

const EMPTY_TOPOLOGY: TopologyBlueprint = {
  topologyType: "backend-unclassified",
  topologyLabel: "No authoritative backend topology loaded",
  internetBreakout: "unknown",
  cloudConnected: false,
  redundancyModel: "Unavailable until backend design-core returns topology data.",
  servicePlacementModel: "Unavailable until backend design-core returns service-placement data.",
  notes: [
    "This is an empty display shell. The frontend does not infer topology, routing, addressing, security zones, or implementation steps.",
  ],
};

function emptyTruthModel(projectName: string): UnifiedDesignTruthModel {
  return {
    summary: `${projectName} has no authoritative backend design snapshot loaded in this view.`,
    topologyType: EMPTY_TOPOLOGY.topologyType,
    topologyLabel: EMPTY_TOPOLOGY.topologyLabel,
    servicePlacementModel: EMPTY_TOPOLOGY.servicePlacementModel,
    internetBreakout: EMPTY_TOPOLOGY.internetBreakout,
    siteNodes: [],
    segments: [],
    routeDomains: [],
    boundaryDomains: [],
    serviceDomains: [],
    flowContracts: [],
    wanAdjacencies: [],
    relationshipEdges: [],
    unresolvedReferences: [],
    coverage: [
      {
        label: "Backend design-core snapshot",
        status: "pending",
        detail: "No backend snapshot is available, so the frontend is intentionally not generating design facts.",
      },
    ],
    inferenceSummary: {
      routeDomains: 0,
      boundaryDomains: 0,
    },
    generationNotes: [
      "Frontend display shell only. No browser-side design synthesis was executed.",
    ],
  };
}

/**
 * Build the neutral view model used while backend design-core data is absent.
 *
 * This function is deliberately not a planner. It does not infer subnets,
 * gateways, routes, security zones, topology, implementation steps, or report
 * findings from project/site/VLAN inputs. It only gives React components a safe
 * empty shape so they can display honest backend-unavailable states.
 */
export function buildBackendOnlyDisplayDesign(project?: Project | null): SynthesizedLogicalDesign {
  const projectName = project?.name?.trim() || "This project";
  return {
    organizationBlock: "",
    organizationBlockAssumed: false,
    organizationHierarchy: {
      organizationCapacity: 0,
      allocatedSiteAddresses: 0,
      plannedSiteDemandAddresses: 0,
      organizationHeadroom: 0,
      organizationUtilization: 0,
    },
    wanReserveBlock: undefined,
    siteSummaries: [],
    siteHierarchy: [],
    addressingPlan: [],
    recommendedSegments: [],
    segmentModel: [],
    wanLinks: [],
    topology: EMPTY_TOPOLOGY,
    sitePlacements: [],
    servicePlacements: [],
    securityBoundaries: [],
    trafficFlows: [],
    flowCoverage: [],
    routingPlan: [],
    routePlan: [],
    topologyModel: EMPTY_TOPOLOGY,
    servicePlacementModel: [],
    securityBoundaryModel: [],
    trafficFlowModel: [],
    routingIntentModel: { siteRouting: [] },
    designTruthModel: emptyTruthModel(projectName),
    logicalDomains: [],
    securityZones: [],
    securityControls: [],
    securityPolicyMatrix: [],
    segmentationReview: [],
    routingProtocols: [],
    routePolicies: [],
    switchingDesign: [],
    qosPlan: [],
    routingSwitchingReview: [],
    implementationPlan: {
      rolloutStrategy: "No backend implementation plan loaded.",
      migrationStrategy: "The frontend does not generate implementation strategy.",
      downtimePosture: "Unavailable until backend design-core returns implementation data.",
      validationApproach: "Unavailable until backend design-core returns verification checks.",
      rollbackPosture: "Unavailable until backend design-core returns rollback actions.",
      teamExecutionModel: "Backend design-core must provide execution guidance before this view is usable.",
      timelineGuidance: "No timeline guidance generated in the frontend.",
      handoffPackage: "No authoritative backend handoff package loaded.",
    },
    implementationPhases: [],
    cutoverChecklist: [],
    rollbackPlan: [],
    validationPlan: [],
    implementationRisks: [],
    configurationStandards: [],
    configurationTemplates: [],
    operationsArtifacts: [],
    highLevelDesign: {
      architecturePattern: "Unavailable until backend design-core returns HLD data.",
      layerModel: "Unavailable until backend design-core returns layer model data.",
      wanArchitecture: "Unavailable until backend design-core returns WAN data.",
      cloudArchitecture: "Unavailable until backend design-core returns cloud data.",
      dataCenterArchitecture: "Unavailable until backend design-core returns service-placement data.",
      redundancyModel: "Unavailable until backend design-core returns redundancy data.",
      routingStrategy: "Unavailable until backend design-core returns routing intent.",
      switchingStrategy: "Unavailable until backend design-core returns switching guidance.",
      segmentationStrategy: "Unavailable until backend design-core returns security-zone data.",
      securityArchitecture: "Unavailable until backend design-core returns security-flow data.",
      wirelessArchitecture: "Unavailable until backend design-core returns wireless data.",
      operationsArchitecture: "Unavailable until backend design-core returns operations data.",
      rationale: ["Frontend display shell only; no local design facts generated."],
    },
    lowLevelDesign: [],
    traceability: [],
    designSummary: [
      "No authoritative backend design snapshot is available. The frontend is not generating a replacement plan.",
    ],
    designReview: [
      {
        kind: "risk",
        title: "Backend design-core snapshot unavailable",
        detail: "This view is intentionally empty rather than generated by browser-side planning logic.",
      },
    ],
    openIssues: ["Backend design-core snapshot unavailable."],
    implementationNextSteps: ["Restore or load the backend design-core snapshot before reviewing implementation output."],
    designEngineFoundation: {
      stageLabel: "Backend authority required",
      summary: "Frontend is operating as a display layer only. No browser-side design synthesis has run.",
      objectCounts: {
        siteHierarchy: 0,
        addressingRows: 0,
        topologyPlacements: 0,
        servicePlacements: 0,
        securityBoundaries: 0,
        trafficFlows: 0,
        routingIdentities: 0,
        wanLinks: 0,
        traceabilityItems: 0,
        openIssues: 1,
      },
      strongestLayer: "Backend design-core required",
      nextPriority: "Load backend design-core snapshot",
      coverage: [
        {
          label: "Frontend planning authority",
          status: "pending",
          detail: "Disabled. The frontend may display, explain, filter, and visualize backend facts only.",
        },
      ],
    },
    stats: {
      configuredSites: 0,
      proposedSites: 0,
      configuredSegments: 0,
      proposedSegments: 0,
      missingSiteBlocks: 0,
      rowsOutsideSiteBlocks: 0,
    },
  };
}
