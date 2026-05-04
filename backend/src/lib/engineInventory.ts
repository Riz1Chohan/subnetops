// V1_DISCOVERY_CURRENT_STATE_CONTRACT inventory wiring
// V1_PLATFORM_BOM_FOUNDATION_CONTRACT inventory controlled surface
// V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT: V1 inventory row is controlled.
export type V1SourceOfTruthLevel =
  | "backend-authoritative"
  | "backend-control-ledger"
  | "durable-ipam-authority"
  | "backend-computed-review-gated"
  | "frontend-advisory-estimate"
  | "manual-discovery-boundary"
  | "ai-draft-only"
  | "ai-draft-only-review-gated"
  | "final-cross-engine-proof-gate";

export type V1ProofGate =
  | "root-static-check"
  | "backend-engine-selftest"
  | "frontend-build"
  | "backend-build"
  | "release-artifact-check"
  | "release-discipline-check"
  | "diagram-truth-check"
  | "requirements-golden-scenario"
  | "export-truth-check";

export type V1EngineInventoryRow = {
  stage: number;
  engineName: string;
  primarySourceFiles: string[];
  inputs: string[];
  outputs: string[];
  consumers: string[];
  sourceOfTruthLevel: V1SourceOfTruthLevel;
  requirementFieldsConsumed: string[];
  frontendPagesUsingIt: string[];
  reportExportSectionsUsingIt: string[];
  diagramSectionsUsingIt: string[];
  validationReadinessImpact: string;
  testsSelftestsProvingIt: string[];
  propagationContract: string[];
  currentV1Verdict: "CONTROLLED" | "NEEDS_STAGE_REPAIR" | "ADVISORY_ONLY" | "DRAFT_ONLY";
};

export const V1_PROPAGATION_CONTRACT = [
  "Requirement input",
  "normalized requirement signal",
  "materialized source object OR explicit no-op/review reason",
  "backend design-core input",
  "engine-specific computation",
  "traceability evidence",
  "validation/readiness impact",
  "frontend display",
  "report/export impact",
  "diagram impact where relevant",
  "test/golden scenario proof",
] as const;

export const V1_REQUIREMENT_FIELD_GROUPS = {
  core: [
    "planningFor",
    "projectStage",
    "environmentType",
    "complianceProfile",
    "siteCount",
    "usersPerSite",
    "internetModel",
    "serverPlacement",
    "primaryGoal",
  ],
  securityAndSegments: [
    "guestWifi",
    "voice",
    "management",
    "printers",
    "iot",
    "cameras",
    "wireless",
    "remoteAccess",
    "guestPolicy",
    "voiceQos",
    "managementAccess",
    "wirelessModel",
    "remoteAccessMethod",
    "securityPosture",
    "trustBoundaryModel",
    "adminBoundary",
    "identityModel",
  ],
  wanCloudAndResilience: [
    "dualIsp",
    "cloudConnected",
    "cloudProvider",
    "cloudConnectivity",
    "resilienceTarget",
    "cloudIdentityBoundary",
    "cloudTrafficBoundary",
    "cloudHostingModel",
    "cloudNetworkModel",
    "cloudRoutingModel",
    "interSiteTrafficModel",
    "bandwidthProfile",
    "latencySensitivity",
    "qosModel",
    "outageTolerance",
  ],
  addressingAndNaming: [
    "addressHierarchyModel",
    "siteBlockStrategy",
    "gatewayConvention",
    "growthBufferModel",
    "reservedRangePolicy",
    "managementIpPolicy",
    "siteIdentityCapture",
    "namingStandard",
    "deviceNamingConvention",
    "namingTokenPreference",
    "namingHierarchy",
    "customNamingPattern",
  ],
  operationsAndDiscovery: [
    "monitoringModel",
    "loggingModel",
    "backupPolicy",
    "operationsOwnerModel",
  ],
  physicalAndBom: [
    "siteLayoutModel",
    "physicalScope",
    "printerCount",
    "phoneCount",
    "apCount",
    "cameraCount",
    "serverCount",
    "iotDeviceCount",
    "wiredWirelessMix",
    "siteRoleModel",
    "buildingCount",
    "floorCount",
    "closetModel",
    "edgeFootprint",
  ],
  delivery: [
    "applicationProfile",
    "criticalServicesModel",
    "growthHorizon",
    "budgetModel",
    "vendorPreference",
    "implementationTimeline",
    "rolloutModel",
    "downtimeConstraint",
    "teamCapability",
    "outputPackage",
    "primaryAudience",
    "customRequirementsNotes",
  ],
} as const;

const ALL_REQUIREMENT_FIELDS = [
  ...V1_REQUIREMENT_FIELD_GROUPS.core,
  ...V1_REQUIREMENT_FIELD_GROUPS.securityAndSegments,
  ...V1_REQUIREMENT_FIELD_GROUPS.wanCloudAndResilience,
  ...V1_REQUIREMENT_FIELD_GROUPS.addressingAndNaming,
  ...V1_REQUIREMENT_FIELD_GROUPS.operationsAndDiscovery,
  ...V1_REQUIREMENT_FIELD_GROUPS.physicalAndBom,
  ...V1_REQUIREMENT_FIELD_GROUPS.delivery,
];

const REQUIRED_CONTRACT = [...V1_PROPAGATION_CONTRACT];

export const V1_ENGINE_INVENTORY: V1EngineInventoryRow[] = [
  {
    stage: 1,
    engineName: "Planning input discipline / traceability",
    primarySourceFiles: [
      "backend/src/lib/planningInputAudit.ts",
      "backend/src/services/designCore/designCore.planningInputDiscipline.ts",
      "backend/src/services/designCore/designCore.traceability.ts",
      "backend/src/services/designCore.service.ts",
    ],
    inputs: ["Project requirementsJson", "Project/Site/VLAN records", "design-core summary outputs"],
    outputs: ["planningInputCoverage", "planningInputDiscipline", "traceability", "truth/source/confidence labels"],
    consumers: ["design-core snapshot", "validation/readiness", "report/export", "frontend trust/readiness views"],
    sourceOfTruthLevel: "backend-control-ledger",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectOverviewPage", "ProjectCoreModelPage", "ProjectRequirementsPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["Requirement traceability", "Assumptions and limitations", "Readiness status"],
    diagramSectionsUsingIt: ["Diagram truth labels", "Requirement-driven overlays when relevant"],
    validationReadinessImpact: "Controls whether captured inputs are reflected, review-only, or unsupported before any downstream output is trusted.",
    testsSelftestsProvingIt: ["backend/src/lib/designCore.selftest.ts", "backend/src/lib/behavioralMatrix.selftest.ts", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "NEEDS_STAGE_REPAIR",
  },
  {
    stage: 2,
    engineName: "Requirements materialization",
    primarySourceFiles: [
      "backend/src/services/requirementsMaterialization.service.ts",
      "backend/src/services/requirementsImpactRegistry.ts",
      "frontend/src/pages/ProjectRequirementsPage.tsx",
    ],
    inputs: ["requirementsJson", "requirements impact registry", "existing project/site/VLAN/DHCP records"],
    outputs: ["materialized Site rows", "materialized VLAN/segment rows", "DesignDhcpScope rows", "review notes", "consumed field summary"],
    consumers: ["design-core snapshot", "requirements closure", "validation", "report", "diagram"],
    sourceOfTruthLevel: "backend-authoritative",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectRequirementsPage", "ProjectSitesPage", "ProjectVlansPage", "ProjectAddressingPage"],
    reportExportSectionsUsingIt: ["Requirement traceability", "Addressing plan", "Network object model", "Review-required items"],
    diagramSectionsUsingIt: ["Physical topology", "Logical segmentation", "Security zones/flows"],
    validationReadinessImpact: "Any captured requirement must become an object, engine input signal, validation blocker, review item, or explicit no-op/unsupported reason.",
    testsSelftestsProvingIt: ["backend/src/services/requirementsGoldenScenarios.selftest.ts", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "NEEDS_STAGE_REPAIR",
  },
  {
    stage: 3,
    engineName: "Requirements impact / closure / scenario proof",
    primarySourceFiles: [
      "backend/src/services/designCore/designCore.requirementsImpactClosure.ts",
      "backend/src/services/designCore/designCore.requirementsScenarioProof.ts",
      "backend/src/services/requirementsRuntimeProof.service.ts",
      "backend/src/services/requirementsGoldenScenarios.selftest.ts",
    ],
    inputs: ["requirementsJson", "materialized objects", "network object model", "design-core outputs"],
    outputs: ["requirementsImpactClosure", "requirementsScenarioProof", "golden scenario results", "missing consumer findings"],
    consumers: ["validation/readiness", "ProjectRequirementsPage", "ProjectReportPage", "export truth", "diagram truth"],
    sourceOfTruthLevel: "backend-control-ledger",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectRequirementsPage", "ProjectOverviewPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["Requirement traceability", "Validation findings", "Assumptions and limitations"],
    diagramSectionsUsingIt: ["Requirement-driven visual evidence", "Diagram truth warnings"],
    validationReadinessImpact: "Prevents requirements from being marked complete when they are only captured or only partially propagated.",
    testsSelftestsProvingIt: ["backend/src/services/requirementsGoldenScenarios.selftest.ts", "backend/src/lib/scenarioMatrix.selftest.ts"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "NEEDS_STAGE_REPAIR",
  },
  {
    stage: 4,
    engineName: "Engine 1 CIDR/addressing",
    primarySourceFiles: [
      "backend/src/lib/cidr.ts",
      "backend/src/lib/addressAllocator.ts",
      "backend/src/services/designCore.service.ts",
      "backend/src/services/designCore/designCore.cidrAddressingTruthControl.ts",
    ],
    inputs: ["Project basePrivateRange", "Site defaultAddressBlock", "VLAN subnet/gateway/host demand", "requirement-derived segment demand", "V1 requirement materialization", "V1 closure matrix"],
    outputs: ["organizationBlock", "siteBlocks", "addressingRows", "proposedRows", "transitPlan", "loopbackPlan", "CIDR/gateway/capacity findings", "V1CidrAddressingTruth"],
    consumers: ["design-core snapshot", "enterprise IPAM reconciler", "validation", "network object model", "report", "diagram labels"],
    sourceOfTruthLevel: "backend-authoritative",
    requirementFieldsConsumed: [
      "usersPerSite",
      "siteCount",
      "guestWifi",
      "voice",
      "wireless",
      "printers",
      "iot",
      "cameras",
      "management",
      "remoteAccess",
      "serverPlacement",
      "growthBufferModel",
      "siteBlockStrategy",
      "gatewayConvention",
      "reservedRangePolicy",
    ],
    frontendPagesUsingIt: ["ProjectAddressingPage", "ProjectSitesPage", "ProjectVlansPage", "ProjectCoreModelPage", "ProjectValidationPage"],
    reportExportSectionsUsingIt: ["Addressing plan", "Validation findings", "Appendices"],
    diagramSectionsUsingIt: ["Logical segmentation labels", "Per-site subnet labels", "WAN/transit labels"],
    validationReadinessImpact: "Invalid CIDRs, overlaps, unusable gateways, capacity gaps, and site-block exhaustion must block or require review.",
    testsSelftestsProvingIt: ["backend/src/lib/cidr.selftest.ts", "backend/src/lib/cidrProof.selftest.ts", "backend/src/lib/addressAllocator.selftest.ts", "backend/src/lib/cidrBoundary.selftest.ts", "backend/src/lib/cidrAddressing.selftest.ts", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 5,
    engineName: "Engine 2 enterprise IPAM",
    primarySourceFiles: [
      "backend/src/services/enterpriseIpam.service.ts",
      "backend/src/domain/ipam/enterprise-ipam.ts",
      "backend/src/services/designCore/designCore.enterpriseIpamTruthControl.ts",
      "backend/src/controllers/enterpriseIpam.controller.ts",
      "backend/prisma/schema.prisma",
    ],
    inputs: ["DesignRouteDomain", "DesignIpPool", "DesignIpAllocation", "DesignDhcpScope", "DesignIpReservation", "brownfield imports", "Engine 1 planned rows"],
    outputs: ["route domain truth", "pool truth", "durable allocations", "DHCP scopes", "reservations", "brownfield conflicts", "approvals", "ledger", "V1EnterpriseIpamTruth"],
    consumers: ["design-core enterpriseAllocatorPosture", "validation", "ProjectEnterpriseIpamPage", "report/export", "implementation planning"],
    sourceOfTruthLevel: "durable-ipam-authority",
    requirementFieldsConsumed: ["addressHierarchyModel", "siteBlockStrategy", "reservedRangePolicy", "managementIpPolicy", "dualIsp", "cloudConnected", "siteCount", "usersPerSite"],
    frontendPagesUsingIt: ["ProjectEnterpriseIpamPage", "ProjectAddressingPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["Enterprise IPAM status", "Addressing plan", "Review-required items", "Appendices"],
    diagramSectionsUsingIt: ["Route-domain labels", "Address truth labels where IPAM is approved or blocked"],
    validationReadinessImpact: "A pretty planned subnet cannot be implementation-ready if IPAM says conflict, stale allocation, reserved pool, or approval missing.",
    testsSelftestsProvingIt: ["backend/src/lib/proofMatrix.selftest.ts", "backend/src/lib/behavioralMatrix.selftest.ts", "backend/src/lib/enterpriseIpam.selftest.ts", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 6,
    engineName: "Design-core orchestrator",
    primarySourceFiles: [
      "backend/src/services/designCore.service.ts",
      "backend/src/services/designCore.types.ts",
      "backend/src/services/designCore/designCore.repository.ts",
      "backend/src/services/designCore/designCore.designCoreOrchestratorControl.ts",
      "backend/src/lib/designCoreOrchestrator.selftest.ts",
    ],
    inputs: ["Project aggregate from repository", "requirements", "sites", "VLANs", "IPAM records", "V1-5 control surfaces", "engine outputs"],
    outputs: ["DesignCoreSnapshot", "V1DesignCoreOrchestrator", "summary", "readiness truth", "engine boundary sections", "dependency edges", "boundary findings"],
    consumers: ["all project design pages", "validation", "report/export", "diagram renderer", "implementation/templates"],
    sourceOfTruthLevel: "backend-authoritative",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectOverviewPage", "ProjectCoreModelPage", "ProjectAddressingPage", "ProjectRoutingPage", "ProjectSecurityPage", "ProjectImplementationPage", "ProjectReportPage", "ProjectDiagramPage"],
    reportExportSectionsUsingIt: ["V1 Design-Core Orchestrator Contract", "All backend report sections"],
    diagramSectionsUsingIt: ["All backend-truth diagram modes", "Diagram truth boundary sections"],
    validationReadinessImpact: "Central aggregation point for design review readiness and implementation execution readiness; missing snapshot sections or review-gated sections become V1 boundary findings.",
    testsSelftestsProvingIt: ["backend/src/lib/designCore.selftest.ts", "backend/src/lib/engineMatrix.selftest.ts", "backend/src/lib/behavioralMatrix.selftest.ts", "backend/src/lib/designCoreOrchestrator.selftest.ts", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 7,
    engineName: "Standards alignment / rulebook",
    primarySourceFiles: [
      "backend/src/lib/networkStandardsRulebook.ts",
      "backend/src/services/designCore/designCore.standardsAlignment.ts",
      "backend/src/services/designCore/designCore.standardsRulebookControl.ts",
    ],
    inputs: ["requirements", "organizationBlock", "siteSummaries", "transitPlan", "securityIntent", "allocationPolicy", "issues", "V1 requirements closure", "networkObjectModel"],
    outputs: ["standardsAlignment", "standardsRulebook", "V1StandardsRulebookControl", "standards blocker issues", "remediation guidance", "exception policy", "requirement-to-standards activation"],
    consumers: ["design-core summary", "validation", "report/export", "frontend standards page", "ProjectOverviewPage traceability ledger"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ["guestWifi", "management", "remoteAccess", "dualIsp", "cloudConnected", "securityPosture", "trustBoundaryModel", "addressHierarchyModel", "gatewayConvention"],
    frontendPagesUsingIt: ["ProjectStandardsPage", "ProjectValidationPage", "ProjectReportPage", "ProjectCoreModelPage"],
    reportExportSectionsUsingIt: ["Validation findings", "Assumptions and limitations", "Review-required items"],
    diagramSectionsUsingIt: ["Standards warning overlays where relevant"],
    validationReadinessImpact: "Required standards blockers are promoted into design-core issues and must prevent false implementation readiness.",
    testsSelftestsProvingIt: ["backend/src/lib/designCore.selftest.ts", "backend/src/lib/standardsRulebook.selftest.ts", "scripts/check-v1-release.cjs", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 8,
    engineName: "Validation/readiness",
    primarySourceFiles: [
      "backend/src/services/validation.service.ts",
      "backend/src/services/designCore/designCore.validationReadinessControl.ts",
      "backend/src/lib/validationReadiness.selftest.ts",
      "backend/src/controllers/validation.controller.ts",
      "frontend/src/features/validation",
    ],
    inputs: ["DesignCoreSnapshot", "V1 requirements closure", "V1 CIDR/addressing truth", "V1 Enterprise IPAM truth", "V1 orchestrator boundaries", "V1 standards rulebook", "routing", "security", "implementation", "reportTruth", "diagramTruth"],
    outputs: ["ValidationResult rows", "V1ValidationReadiness", "BLOCKING/REVIEW_REQUIRED/WARNING/INFO/PASSED findings", "strict readiness gates", "requirement readiness gates"],
    consumers: ["ProjectValidationPage", "ProjectOverviewPage", "ProjectReportPage", "export service", "report/export truth", "diagram truth warnings"],
    sourceOfTruthLevel: "backend-authoritative",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectValidationPage", "ProjectOverviewPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["Readiness status", "Validation findings", "Review-required items", "V1 Validation Readiness Authority"],
    diagramSectionsUsingIt: ["Diagram truth warnings and blockers"],
    validationReadinessImpact: "Strict readiness authority; a design cannot be marked implementation-ready while blocking or review-required requirement, addressing, IPAM, standards, routing, security, implementation, report, or diagram truth gaps remain.",
    testsSelftestsProvingIt: ["backend/src/lib/validationReadiness.selftest.ts", "backend/src/lib/behavioralMatrix.selftest.ts", "scripts/check-v1-release.cjs", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 9,
    engineName: "Network object model",
    primarySourceFiles: [
      "backend/src/services/designCore/designCore.networkObjectModel.ts",
      "backend/src/services/designCore/designCore.networkObjectModelControl.ts",
      "backend/src/services/designCore.types.ts",
      "backend/src/lib/networkObjectModel.selftest.ts",
    ],
    inputs: ["project", "addressingRows", "siteSummaries", "transitPlan", "loopbackPlan", "V1RequirementsClosure"],
    outputs: ["devices", "interfaces", "links", "zones", "policy objects", "NAT objects", "DHCP objects", "reservations", "object truth states", "object provenance labels", "V1NetworkObjectModel", "requirement-to-object lineage"],
    consumers: ["design graph", "routing", "security", "implementation plan", "validation", "ProjectOverviewPage", "reportTruth", "diagramTruth", "export.service"],
    sourceOfTruthLevel: "backend-authoritative",
    requirementFieldsConsumed: ["siteCount", "guestWifi", "voice", "management", "printers", "iot", "cameras", "wireless", "serverPlacement", "remoteAccess", "cloudConnected", "dualIsp"],
    frontendPagesUsingIt: ["ProjectCoreModelPage", "ProjectDiagramPage", "ProjectRoutingPage", "ProjectSecurityPage", "ProjectImplementationPage"],
    reportExportSectionsUsingIt: ["Network object model", "Routing review", "Security policy review", "Implementation plan"],
    diagramSectionsUsingIt: ["Physical topology", "Logical segmentation", "WAN/cloud topology", "Security zones/flows"],
    validationReadinessImpact: "Generated objects must be truth-labelled; inferred or review-required objects cannot masquerade as approved implementation facts.",
    testsSelftestsProvingIt: ["backend/src/lib/networkObjectModel.selftest.ts", "scripts/check-v1-release.cjs", "backend/src/lib/engineMatrix.selftest.ts", "backend/src/lib/designCore.selftest.ts"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 10,
    engineName: "Design graph",
    primarySourceFiles: ["backend/src/services/designCore/designCore.graph.ts", "backend/src/services/designCore/designCore.designGraphControl.ts", "backend/src/lib/designGraph.selftest.ts"],
    inputs: ["network object model", "requirement-derived objects", "routes", "policies", "implementation steps"],
    outputs: ["DesignGraph nodes", "DesignGraph edges", "integrity findings", "dependency paths", "V1DesignGraph", "requirement-to-object-to-consumer paths", "object graph coverage rows"],
    consumers: ["network object summary", "implementation plan", "validation", "ProjectOverviewPage", "report/export", "diagram relationship rendering"],
    sourceOfTruthLevel: "backend-authoritative",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectCoreModelPage", "ProjectImplementationPage", "ProjectDiagramPage"],
    reportExportSectionsUsingIt: ["V1 Design Graph Dependency Integrity", "Network object model", "Implementation plan", "Validation findings"],
    diagramSectionsUsingIt: ["Node/edge backend identity", "Dependency-aware diagram truth"],
    validationReadinessImpact: "Orphaned objects, edges without sources, and diagram nodes without backend objects must become findings.",
    testsSelftestsProvingIt: ["backend/src/lib/designGraph.selftest.ts", "scripts/check-v1-release.cjs", "backend/src/lib/engineMatrix.selftest.ts", "backend/src/lib/implementationPlanningEngine.selftest.ts"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 11,
    engineName: "Routing and segmentation",
    primarySourceFiles: [
      "backend/src/services/designCore/designCore.routingSegmentation.ts",
      "backend/src/services/designCore/designCore.routingSegmentationControl.ts",
      "backend/src/services/designCore/designCore.intentSummaries.ts",
      "backend/src/lib/routingSegmentation.selftest.ts",
    ],
    inputs: ["route domains", "site summaries", "transit/loopback rows", "network object model", "V1 design graph", "policy signals", "WAN/cloud requirements"],
    outputs: ["routingSegmentation", "V1RoutingSegmentation", "route intents", "protocol-aware planning rows", "route entries", "reachability checks", "segmentation expectations", "review blockers", "simulation-unavailable protocol rows"],
    consumers: ["security policy flow", "implementation plan", "validation", "ProjectOverviewPage", "ProjectRoutingPage", "report/export", "WAN/logical diagrams"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ["siteCount", "internetModel", "dualIsp", "cloudConnected", "remoteAccess", "guestWifi", "management", "interSiteTrafficModel", "cloudRoutingModel", "resilienceTarget"],
    frontendPagesUsingIt: ["ProjectRoutingPage", "ProjectDiagramPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["V1 Routing Segmentation Protocol-Aware Planning", "Routing review", "Security policy review", "Implementation plan", "Review-required items"],
    diagramSectionsUsingIt: ["WAN/cloud topology", "Logical segmentation", "Security flow view"],
    validationReadinessImpact: "Routing is planning/review truth, not packet simulation; missing next hops, route-domain conflicts, unknown cloud routing, route leaking, ECMP, redistribution, OSPF/BGP, and asymmetric path gaps must require review/blocking evidence.",
    testsSelftestsProvingIt: ["backend/src/lib/routingSegmentation.selftest.ts", "scripts/check-v1-release.cjs", "backend/src/lib/routingEngine.selftest.ts", "backend/src/lib/scenarioMatrix.selftest.ts"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 12,
    engineName: "Security policy flow",
    primarySourceFiles: ["backend/src/services/designCore/designCore.securityPolicyFlow.ts", "backend/src/services/designCore/designCore.securityPolicyFlowControl.ts", "backend/src/lib/securityPolicyFlow.selftest.ts"],
    inputs: ["security zones", "policy rules", "service objects/groups", "NAT rules", "routing/segmentation expectations", "V1 graph paths", "security-sensitive requirements"],
    outputs: ["securityPolicyFlow", "V1SecurityPolicyFlow", "service objects", "policy matrix", "requirement security matrix", "flow consequences", "zone policy reviews", "NAT review", "logging review", "broad-permit review", "rule order/shadowing findings", "policy consequence summaries"],
    consumers: ["validation", "implementation plan", "report/export", "ProjectOverviewPage", "ProjectSecurityPage", "security diagrams"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ["guestWifi", "guestPolicy", "remoteAccess", "remoteAccessMethod", "management", "managementAccess", "cloudConnected", "cloudHybrid", "serverPlacement", "iot", "cameras", "printers", "voice", "securityPosture", "trustBoundaryModel", "adminBoundary", "loggingModel", "complianceProfile"],
    frontendPagesUsingIt: ["ProjectOverviewPage", "ProjectSecurityPage", "ProjectDiagramPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["V1 Security Policy Flow", "Security policy review", "Implementation plan", "Validation findings", "Review-required items"],
    diagramSectionsUsingIt: ["Security zones/flows", "Logical segmentation"],
    validationReadinessImpact: "Security-sensitive requirements must create explicit flow consequences or review/blocker findings; missing policies, default-deny gaps, overbroad permits, shadowed/duplicate intent, NAT gaps, logging gaps, and review-only security claims must block/review implementation readiness.",
    testsSelftestsProvingIt: ["backend/src/lib/securityPolicyFlow.selftest.ts", "scripts/check-v1-release.cjs", "backend/src/lib/securityPolicyEngine.selftest.ts", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 13,
    engineName: "Implementation planning",
    primarySourceFiles: ["backend/src/services/designCore/designCore.implementationPlan.ts", "backend/src/services/designCore/designCore.implementationPlanningControl.ts"],
    inputs: ["verified source objects", "routes", "security flows", "DHCP/IPAM truth", "graph dependencies", "V1 object truth", "V1 graph", "V1 routing", "V1 security flow"],
    outputs: ["ImplementationPlanModel", "V1ImplementationPlanning", "stage gates", "step gates", "dependency gates", "preconditions", "verification", "rollback", "readiness"],
    consumers: ["vendor-neutral templates", "validation", "ProjectImplementationPage", "report/export"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectImplementationPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["Implementation plan", "Validation findings", "Review-required items"],
    diagramSectionsUsingIt: ["Implementation view when rendered from backend objects"],
    validationReadinessImpact: "No step should be READY unless upstream source objects and evidence exist; inferred inputs must become review/blocker states.",
    testsSelftestsProvingIt: ["backend/src/lib/implementationPlanningEngine.selftest.ts", "backend/src/lib/implementationPlanning.selftest.ts", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 14,
    engineName: "Vendor-neutral implementation templates",
    primarySourceFiles: ["backend/src/services/designCore/designCore.implementationTemplates.ts", "backend/src/services/designCore/designCore.implementationTemplatesControl.ts"],
    inputs: ["ImplementationPlanModel", "source objects", "source requirements", "missing data blockers"],
    outputs: ["VendorNeutralImplementationTemplateModel", "V1ImplementationTemplates", "domain gates", "template gates", "required variables", "source object IDs", "source requirement IDs", "missing data blockers", "evidence", "rollback requirements", "command generation disabled reason"],
    consumers: ["validation", "ProjectImplementationPage", "report/export", "future vendor translators"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectImplementationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["V1 Vendor-Neutral Implementation Templates", "Implementation plan", "Appendices", "Assumptions and limitations"],
    diagramSectionsUsingIt: ["Implementation view only when traceable to source objects"],
    validationReadinessImpact: "Templates cannot appear as fake command output; missing source objects, missing requirement lineage, missing variables, evidence gaps, rollback gaps, blocked V1 steps, and command leaks become blockers/review findings.",
    testsSelftestsProvingIt: ["backend/src/lib/vendorNeutralTemplates.selftest.ts", "backend/src/lib/implementationTemplates.selftest.ts", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 15,
    engineName: "Report/export truth",
    primarySourceFiles: [
      "backend/src/services/designCore/designCore.reportExportTruthControl.ts",
      "backend/src/services/exportDesignCoreReport.service.ts",
      "backend/src/services/export.service.ts",
      "frontend/src/pages/ProjectReportPage.tsx",
    ],
    inputs: ["DesignCoreSnapshot", "reportTruth", "diagramTruth", "validation", "requirements closure", "V1 addressing", "V1 IPAM", "V1 object model", "V1 routing", "V1 security", "V1 implementation", "V1 templates"],
    outputs: ["V1ReportExportTruth", "required report section gates", "requirement traceability matrix", "truth label rows", "PDF/DOCX/CSV coverage gate", "backend report truth sections", "assumptions/limitations", "review-required items", "appendix evidence"],
    consumers: ["ProjectReportPage", "validation", "PDF export", "DOCX export", "CSV export", "downloaded deliverables"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectReportPage"],
    reportExportSectionsUsingIt: ["Executive summary", "Readiness status", "Requirement traceability", "Addressing plan", "Enterprise IPAM status", "Network object model", "Routing review", "Security policy review", "Implementation plan", "Validation findings", "Diagram truth", "Assumptions and limitations"],
    diagramSectionsUsingIt: ["Diagram truth section references rendered backend object evidence"],
    validationReadinessImpact: "Exports must not claim readiness or design facts that backend design-core cannot prove; blocked/review upstream evidence must remain visible in report/PDF/DOCX/CSV gates.",
    testsSelftestsProvingIt: ["backend/src/lib/reportExportTruth.selftest.ts", "scripts/check-v1-release.cjs", "scripts/check-v1-release.cjs", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 16,
    engineName: "Diagram truth / renderer / layout",
    primarySourceFiles: [
      "frontend/src/features/diagram/components/BackendDiagramCanvas.tsx",
      "frontend/src/features/diagram/components/diagramLayoutGrammar.ts",
      "frontend/src/features/diagram/components/diagramRendererShared.tsx",
      "frontend/src/lib/diagramObjectModel.ts",
      "backend/src/services/designCore/designCore.diagramTruthControl.ts",
      "backend/src/lib/diagramTruthRendererLayout.selftest.ts",
    ],
    inputs: ["backend diagramTruth", "networkObjectModel", "designGraph", "routing/security objects", "truth states"],
    outputs: ["physical topology", "logical segmentation", "WAN/cloud topology", "security flows", "per-site detail", "implementation view", "diagram truth warnings", "V1DiagramTruth", "mode contracts", "render coverage", "backend-only proof boundary"],
    consumers: ["ProjectDiagramPage", "report diagram truth section", "visual QA checks"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ["siteCount", "guestWifi", "management", "voice", "wireless", "dualIsp", "cloudConnected", "remoteAccess", "serverPlacement", "securityPosture"],
    frontendPagesUsingIt: ["ProjectDiagramPage"],
    reportExportSectionsUsingIt: ["Diagram truth", "Network object model", "Security policy review"],
    diagramSectionsUsingIt: ["Physical", "Logical", "WAN/cloud", "Security", "Per-site", "Implementation"],
    validationReadinessImpact: "Diagram nodes and edges must render backend truth only; inferred/review-required objects must be visibly labelled, not hidden; V1 findings now feed validation and report/export evidence.",
    testsSelftestsProvingIt: ["backend/src/lib/diagramTruthRendererLayout.selftest.ts", "scripts/check-v1-release.cjs", "scripts/check-v1-release.cjs", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 17,
    engineName: "Platform/BOM foundation",
    primarySourceFiles: ["backend/src/services/designCore/designCore.platformBomFoundationControl.ts", "backend/src/lib/platformBomFoundation.selftest.ts", "frontend/src/lib/platformBomFoundation.ts", "frontend/src/pages/ProjectPlatformBomPage.tsx"],
    inputs: ["requirements", "platformProfileJson", "networkObjectModel", "V1 diagram truth", "topology assumptions", "physical/device counts", "growth/redundancy signals"],
    outputs: ["V1PlatformBomFoundation", "switch/AP/firewall/WAN estimates", "PoE/port assumptions", "licensing placeholders", "confidence notes", "requirement-driven BOM rows", "manual review gates"],
    consumers: ["ProjectPlatformBomPage", "validation", "PDF/DOCX report", "CSV export", "future procurement workflow"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ["wireless", "guestWifi", "voice", "printers", "iot", "cameras", "usersPerSite", "siteCount", "dualIsp", "remoteAccess", "cloudHybrid", "cloudConnected", "securityPosture", "complianceProfile", "printerCount", "phoneCount", "apCount", "cameraCount", "serverCount", "iotDeviceCount", "buildingCount", "floorCount", "growthMarginPercent"],
    frontendPagesUsingIt: ["ProjectPlatformBomPage", "ProjectOverviewPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["V1 Platform/BOM Foundation", "Platform Profile and Bill of Materials Foundation", "Assumptions and limitations", "CSV Platform/BOM rows"],
    diagramSectionsUsingIt: ["Physical topology only as advisory sizing context; V1 diagram truth must remain backend-authored"],
    validationReadinessImpact: "BOM rows now carry backend source requirements, source objects where available, calculation basis, confidence, manual review notes, and explicit advisory-only procurement authority. Final SKUs/prices remain blocked until a future catalog/discovery stage.",
    testsSelftestsProvingIt: ["backend/src/lib/platformBomFoundation.selftest.ts", "scripts/check-v1-release.cjs", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 18,
    engineName: "Discovery/current-state",
    primarySourceFiles: ["backend/src/services/designCore/designCore.discoveryCurrentStateControl.ts", "backend/src/lib/discoveryCurrentState.selftest.ts", "frontend/src/lib/discoveryFoundation.ts", "frontend/src/pages/ProjectDiscoveryPage.tsx", "backend/prisma/schema.prisma"],
    inputs: ["discoveryJson", "manual discovery fields", "future imported current-state artifacts", "brownfield requirements", "currentStateBoundary", "brownfieldReadiness", "discoveredStateImportPlan", "networkObjectModel"],
    outputs: ["V1DiscoveryCurrentState", "manual discovery plan", "current-state boundary", "structured import targets", "requirement-created discovery tasks", "conflict/review states", "manual/imported/validated distinction", "no-live-discovery proof boundary"],
    consumers: ["ProjectDiscoveryPage", "brownfield readiness", "validation", "PDF/DOCX report", "CSV export", "future reconciliation/importer workflow"],
    sourceOfTruthLevel: "manual-discovery-boundary",
    requirementFieldsConsumed: ["brownfield", "migration", "planningFor", "projectStage", "siteCount", "multiSite", "dualIsp", "cloudHybrid", "cloudConnected", "guestAccess", "guestWifi", "remoteAccess", "management", "voice", "wireless", "interSiteTrafficModel"],
    frontendPagesUsingIt: ["ProjectDiscoveryPage", "ProjectEnterpriseIpamPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["V1 Discovery/Current-State", "Discovery/current-state", "Assumptions and limitations", "Review-required items", "CSV Discovery rows"],
    diagramSectionsUsingIt: ["Imported/discovered overlays only after import validation exists; no frontend-invented live topology"],
    validationReadinessImpact: "V1_DISCOVERY_CURRENT_STATE_CONTRACT requires discovery to distinguish not provided, manually entered, imported, validated, conflicting, and review required. Brownfield/current-state requirements create discovery tasks and blockers instead of fake live-discovery authority.",
    testsSelftestsProvingIt: ["backend/src/lib/discoveryCurrentState.selftest.ts", "scripts/check-v1-release.cjs", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 19,
    engineName: "AI draft/helper",
    primarySourceFiles: ["backend/src/services/designCore/designCore.aiDraftHelperControl.ts", "backend/src/services/ai.service.ts", "backend/src/lib/aiDraftHelper.selftest.ts", "frontend/src/features/ai/components/AIPlanningPanel.tsx", "frontend/src/pages/AIWorkspacePage.tsx", "frontend/src/pages/NewProjectPage.tsx", "frontend/src/pages/ProjectOverviewPage.tsx"],
    inputs: ["user prompt", "AI draft authority object", "draft project context", "requirements profile V1AiDraft metadata", "review/apply controls", "AI-applied site/VLAN provenance markers"],
    outputs: ["V1AiDraftHelper", "AI_DRAFT suggestions", "REVIEW_REQUIRED object rows", "NOT_AUTHORITATIVE gate evidence", "selective draft apply payloads", "validation/report/export AI draft findings"],
    consumers: ["AIWorkspacePage", "NewProjectPage", "ProjectOverviewPage", "validation", "PDF/DOCX report", "CSV export", "future materialization after explicit review"],
    sourceOfTruthLevel: "ai-draft-only-review-gated",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["AIWorkspacePage", "NewProjectPage", "ProjectOverviewPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["V1 AI Draft/Helper", "Assumptions and limitations", "Review-required items", "CSV AI draft rows"],
    diagramSectionsUsingIt: ["None as authority; only reviewed/materialized backend objects may reach diagrams with review-required provenance"],
    validationReadinessImpact: "V1_AI_DRAFT_HELPER_CONTRACT forces AI output to stay AI_DRAFT / REVIEW_REQUIRED / NOT_AUTHORITATIVE until converted into reviewed structured requirements/source objects and proven by requirements materialization, validation, Engine 1 addressing, Engine 2 IPAM where relevant, standards, and traceability checks.",
    testsSelftestsProvingIt: ["backend/src/lib/aiDraftHelper.selftest.ts", "scripts/check-v1-release.cjs", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
  {
    stage: 20,
    engineName: "Final cross-engine proof pass",
    primarySourceFiles: ["backend/src/services/designCore/designCore.finalProofPassControl.ts", "backend/src/lib/finalProofPass.selftest.ts", "scripts/check-v1-release.cjs", "frontend/src/pages/ProjectOverviewPage.tsx"],
    inputs: ["V1TraceabilityControl", "V1RequirementsMaterialization", "V1RequirementsClosure", "V1CidrAddressingTruth", "V1EnterpriseIpamTruth", "V1DesignCoreOrchestrator", "V1StandardsRulebookControl", "V1ValidationReadiness", "V1NetworkObjectModel", "V1DesignGraph", "V1RoutingSegmentation", "V1SecurityPolicyFlow", "V1ImplementationPlanning", "V1ImplementationTemplates", "V1ReportExportTruth", "V1DiagramTruth", "V1PlatformBomFoundation", "V1DiscoveryCurrentState", "V1AiDraftHelper", "reportTruth", "diagramTruth"],
    outputs: ["V1FinalProofPass", "cross-engine scenario proof rows", "engine contract proof rows", "release gate rows", "A-/A not A+ release boundary", "validation/report/export final proof findings"],
    consumers: ["ProjectOverviewPage", "validation", "PDF/DOCX report", "CSV export", "release check scripts", "final release decision"],
    sourceOfTruthLevel: "final-cross-engine-proof-gate",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectOverviewPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["V1 Final Cross-Engine Proof Pass", "Review-required items", "Assumptions and limitations", "CSV V1 rows"],
    diagramSectionsUsingIt: ["Diagram impact is validated through V1; V1 does not invent diagram nodes or edges."],
    validationReadinessImpact: "V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT blocks final release claims when engine contracts, scenario proof rows, release gates, report/export truth, diagram truth, or AI/discovery/BOM boundaries are missing or overclaimed.",
    testsSelftestsProvingIt: ["backend/src/lib/finalProofPass.selftest.ts", "scripts/check-v1-release.cjs", "scripts/check-v1-release.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentV1Verdict: "CONTROLLED",
  },
];

export const V1_ENGINE_INVENTORY_EXPECTED_STAGES = 20;

export function validateV1EngineInventory(rows: V1EngineInventoryRow[] = V1_ENGINE_INVENTORY) {
  const errors: string[] = [];
  if (rows.length !== V1_ENGINE_INVENTORY_EXPECTED_STAGES) {
    errors.push(`Expected ${V1_ENGINE_INVENTORY_EXPECTED_STAGES} engine rows, found ${rows.length}.`);
  }

  const stages = new Set<number>();
  for (const row of rows) {
    stages.add(row.stage);
    for (const field of [
      "engineName",
      "validationReadinessImpact",
    ] as const) {
      if (!row[field]) errors.push(`Stage ${row.stage} missing ${field}.`);
    }
    for (const field of [
      "primarySourceFiles",
      "inputs",
      "outputs",
      "consumers",
      "requirementFieldsConsumed",
      "frontendPagesUsingIt",
      "reportExportSectionsUsingIt",
      "diagramSectionsUsingIt",
      "testsSelftestsProvingIt",
      "propagationContract",
    ] as const) {
      if (!Array.isArray(row[field]) || row[field].length === 0) errors.push(`Stage ${row.stage} missing ${field}.`);
    }
    for (const contractStep of V1_PROPAGATION_CONTRACT) {
      if (!row.propagationContract.includes(contractStep)) {
        errors.push(`Stage ${row.stage} is missing propagation contract step: ${contractStep}.`);
      }
    }
  }

  for (let stage = 1; stage <= V1_ENGINE_INVENTORY_EXPECTED_STAGES; stage += 1) {
    if (!stages.has(stage)) errors.push(`Missing Stage ${stage} engine inventory row.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    engineCount: rows.length,
  };
}


// V1_IMPLEMENTATION_PLANNING_CONTRACT: CONTROLLED implementation planning stage.
// V1_VENDOR_NEUTRAL_IMPLEMENTATION_TEMPLATES_CONTRACT: CONTROLLED vendor-neutral template stage.
// Engine files: designCore.implementationTemplates.ts, designCore.implementationTemplatesControl.ts, implementationTemplates.selftest.ts.

// V1_REPORT_EXPORT_TRUTH_CONTRACT: CONTROLLED report/export truth stage.
// Engine files: designCore.reportExportTruthControl.ts, exportDesignCoreReport.service.ts, export.service.ts, reportExportTruth.selftest.ts.
