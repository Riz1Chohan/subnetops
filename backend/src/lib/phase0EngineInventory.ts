export type Phase0SourceOfTruthLevel =
  | "backend-authoritative"
  | "backend-control-ledger"
  | "durable-ipam-authority"
  | "backend-computed-review-gated"
  | "frontend-advisory-estimate"
  | "manual-discovery-boundary"
  | "ai-draft-only";

export type Phase0ProofGate =
  | "root-static-check"
  | "backend-engine-selftest"
  | "frontend-build"
  | "backend-build"
  | "release-artifact-check"
  | "release-discipline-check"
  | "diagram-truth-check"
  | "requirements-golden-scenario"
  | "export-truth-check";

export type Phase0EngineInventoryRow = {
  phase: number;
  engineName: string;
  primarySourceFiles: string[];
  inputs: string[];
  outputs: string[];
  consumers: string[];
  sourceOfTruthLevel: Phase0SourceOfTruthLevel;
  requirementFieldsConsumed: string[];
  frontendPagesUsingIt: string[];
  reportExportSectionsUsingIt: string[];
  diagramSectionsUsingIt: string[];
  validationReadinessImpact: string;
  testsSelftestsProvingIt: string[];
  propagationContract: string[];
  currentPhase0Verdict: "CONTROLLED" | "NEEDS_PHASE_REPAIR" | "ADVISORY_ONLY" | "DRAFT_ONLY";
};

export const PHASE0_PROPAGATION_CONTRACT = [
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

export const PHASE0_REQUIREMENT_FIELD_GROUPS = {
  core: [
    "planningFor",
    "projectPhase",
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
  ...PHASE0_REQUIREMENT_FIELD_GROUPS.core,
  ...PHASE0_REQUIREMENT_FIELD_GROUPS.securityAndSegments,
  ...PHASE0_REQUIREMENT_FIELD_GROUPS.wanCloudAndResilience,
  ...PHASE0_REQUIREMENT_FIELD_GROUPS.addressingAndNaming,
  ...PHASE0_REQUIREMENT_FIELD_GROUPS.operationsAndDiscovery,
  ...PHASE0_REQUIREMENT_FIELD_GROUPS.physicalAndBom,
  ...PHASE0_REQUIREMENT_FIELD_GROUPS.delivery,
];

const REQUIRED_CONTRACT = [...PHASE0_PROPAGATION_CONTRACT];

export const PHASE0_ENGINE_INVENTORY: Phase0EngineInventoryRow[] = [
  {
    phase: 1,
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
    testsSelftestsProvingIt: ["backend/src/lib/designCore.selftest.ts", "backend/src/lib/behavioralMatrix.selftest.ts", "scripts/check-phase0-engine-inventory.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 2,
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
    testsSelftestsProvingIt: ["backend/src/services/requirementsGoldenScenarios.selftest.ts", "scripts/check-phase0-engine-inventory.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 3,
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
    testsSelftestsProvingIt: ["backend/src/services/requirementsGoldenScenarios.selftest.ts", "backend/src/lib/phase41ScenarioMatrix.selftest.ts"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 4,
    engineName: "Engine 1 CIDR/addressing",
    primarySourceFiles: [
      "backend/src/lib/cidr.ts",
      "backend/src/lib/addressAllocator.ts",
      "backend/src/services/designCore.service.ts",
      "backend/src/services/designCore/designCore.phase4CidrAddressingTruthControl.ts",
    ],
    inputs: ["Project basePrivateRange", "Site defaultAddressBlock", "VLAN subnet/gateway/host demand", "requirement-derived segment demand", "Phase 2 requirement materialization", "Phase 3 closure matrix"],
    outputs: ["organizationBlock", "siteBlocks", "addressingRows", "proposedRows", "transitPlan", "loopbackPlan", "CIDR/gateway/capacity findings", "phase4CidrAddressingTruth"],
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
    testsSelftestsProvingIt: ["backend/src/lib/cidr.selftest.ts", "backend/src/lib/cidrProof.selftest.ts", "backend/src/lib/addressAllocator.selftest.ts", "backend/src/lib/cidrBoundary.selftest.ts", "backend/src/lib/phase4CidrAddressing.selftest.ts", "scripts/check-phase4-cidr-addressing.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "CONTROLLED",
  },
  {
    phase: 5,
    engineName: "Engine 2 enterprise IPAM",
    primarySourceFiles: [
      "backend/src/services/enterpriseIpam.service.ts",
      "backend/src/lib/enterpriseAddressAllocator.ts",
      "backend/src/controllers/enterpriseIpam.controller.ts",
      "backend/prisma/schema.prisma",
    ],
    inputs: ["DesignRouteDomain", "DesignIpPool", "DesignIpAllocation", "DesignDhcpScope", "DesignIpReservation", "brownfield imports", "Engine 1 planned rows"],
    outputs: ["route domain truth", "pool truth", "durable allocations", "DHCP scopes", "reservations", "brownfield conflicts", "approvals", "ledger"],
    consumers: ["design-core enterpriseAllocatorPosture", "validation", "ProjectEnterpriseIpamPage", "report/export", "implementation planning"],
    sourceOfTruthLevel: "durable-ipam-authority",
    requirementFieldsConsumed: ["addressHierarchyModel", "siteBlockStrategy", "reservedRangePolicy", "managementIpPolicy", "dualIsp", "cloudConnected", "siteCount", "usersPerSite"],
    frontendPagesUsingIt: ["ProjectEnterpriseIpamPage", "ProjectAddressingPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["Enterprise IPAM status", "Addressing plan", "Review-required items", "Appendices"],
    diagramSectionsUsingIt: ["Route-domain labels", "Address truth labels where IPAM is approved or blocked"],
    validationReadinessImpact: "A pretty planned subnet cannot be implementation-ready if IPAM says conflict, stale allocation, reserved pool, or approval missing.",
    testsSelftestsProvingIt: ["backend/src/lib/proofMatrix.selftest.ts", "backend/src/lib/behavioralMatrix.selftest.ts"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 6,
    engineName: "Design-core orchestrator",
    primarySourceFiles: [
      "backend/src/services/designCore.service.ts",
      "backend/src/services/designCore.types.ts",
      "backend/src/services/designCore/designCore.repository.ts",
    ],
    inputs: ["Project aggregate from repository", "requirements", "sites", "VLANs", "IPAM records", "engine outputs"],
    outputs: ["DesignCoreSnapshot", "summary", "readiness truth", "engine sections", "issues"],
    consumers: ["all project design pages", "validation", "report/export", "diagram renderer", "implementation/templates"],
    sourceOfTruthLevel: "backend-authoritative",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectOverviewPage", "ProjectCoreModelPage", "ProjectAddressingPage", "ProjectRoutingPage", "ProjectSecurityPage", "ProjectImplementationPage", "ProjectReportPage", "ProjectDiagramPage"],
    reportExportSectionsUsingIt: ["All backend report sections"],
    diagramSectionsUsingIt: ["All backend-truth diagram modes"],
    validationReadinessImpact: "Central aggregation point for design review readiness and implementation execution readiness.",
    testsSelftestsProvingIt: ["backend/src/lib/designCore.selftest.ts", "backend/src/lib/phase33EngineMatrix.selftest.ts", "backend/src/lib/behavioralMatrix.selftest.ts"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 7,
    engineName: "Standards alignment / rulebook",
    primarySourceFiles: [
      "backend/src/lib/networkStandardsRulebook.ts",
      "backend/src/services/designCore/designCore.standardsAlignment.ts",
    ],
    inputs: ["requirements", "organizationBlock", "siteSummaries", "transitPlan", "securityIntent", "allocationPolicy", "issues"],
    outputs: ["standardsAlignment", "standardsRulebook", "standards blocker issues", "remediation guidance"],
    consumers: ["design-core summary", "validation", "report/export", "frontend standards page"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ["guestWifi", "management", "remoteAccess", "dualIsp", "cloudConnected", "securityPosture", "trustBoundaryModel", "addressHierarchyModel", "gatewayConvention"],
    frontendPagesUsingIt: ["ProjectStandardsPage", "ProjectValidationPage", "ProjectReportPage", "ProjectCoreModelPage"],
    reportExportSectionsUsingIt: ["Validation findings", "Assumptions and limitations", "Review-required items"],
    diagramSectionsUsingIt: ["Standards warning overlays where relevant"],
    validationReadinessImpact: "Required standards blockers are promoted into design-core issues and must prevent false implementation readiness.",
    testsSelftestsProvingIt: ["backend/src/lib/designCore.selftest.ts", "scripts/check-phase84-design-trust-policy.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 8,
    engineName: "Validation/readiness",
    primarySourceFiles: [
      "backend/src/services/validation.service.ts",
      "backend/src/controllers/validation.controller.ts",
      "frontend/src/features/validation",
    ],
    inputs: ["DesignCoreSnapshot", "CIDR/IPAM findings", "requirements closure", "standards", "routing", "security", "implementation"],
    outputs: ["ValidationResult rows", "BLOCKING/REVIEW_REQUIRED/WARNING/INFO/PASSED findings", "readiness gates"],
    consumers: ["ProjectValidationPage", "ProjectOverviewPage", "ProjectReportPage", "export service"],
    sourceOfTruthLevel: "backend-authoritative",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectValidationPage", "ProjectOverviewPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["Readiness status", "Validation findings", "Review-required items"],
    diagramSectionsUsingIt: ["Diagram truth warnings and blockers"],
    validationReadinessImpact: "The readiness gate; design cannot be marked ready while critical requirement chains or engineering blockers are unresolved.",
    testsSelftestsProvingIt: ["backend/src/lib/behavioralMatrix.selftest.ts", "scripts/check-phase87-readiness-policy-report-diagram.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 9,
    engineName: "Network object model",
    primarySourceFiles: [
      "backend/src/services/designCore/designCore.networkObjectModel.ts",
      "backend/src/services/designCore.types.ts",
    ],
    inputs: ["project", "addressingRows", "siteSummaries", "transitPlan", "loopbackPlan"],
    outputs: ["devices", "interfaces", "links", "zones", "policy objects", "NAT objects", "DHCP objects", "reservations", "object truth states"],
    consumers: ["design graph", "routing", "security", "implementation plan", "reportTruth", "diagramTruth"],
    sourceOfTruthLevel: "backend-authoritative",
    requirementFieldsConsumed: ["siteCount", "guestWifi", "voice", "management", "printers", "iot", "cameras", "wireless", "serverPlacement", "remoteAccess", "cloudConnected", "dualIsp"],
    frontendPagesUsingIt: ["ProjectCoreModelPage", "ProjectDiagramPage", "ProjectRoutingPage", "ProjectSecurityPage", "ProjectImplementationPage"],
    reportExportSectionsUsingIt: ["Network object model", "Routing review", "Security policy review", "Implementation plan"],
    diagramSectionsUsingIt: ["Physical topology", "Logical segmentation", "WAN/cloud topology", "Security zones/flows"],
    validationReadinessImpact: "Generated objects must be truth-labelled; inferred or review-required objects cannot masquerade as approved implementation facts.",
    testsSelftestsProvingIt: ["backend/src/lib/phase33EngineMatrix.selftest.ts", "backend/src/lib/designCore.selftest.ts"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 10,
    engineName: "Design graph",
    primarySourceFiles: ["backend/src/services/designCore/designCore.graph.ts"],
    inputs: ["network object model", "requirement-derived objects", "routes", "policies", "implementation steps"],
    outputs: ["DesignGraph nodes", "DesignGraph edges", "integrity findings", "dependency paths"],
    consumers: ["network object summary", "implementation plan", "report/export", "diagram relationship rendering"],
    sourceOfTruthLevel: "backend-authoritative",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectCoreModelPage", "ProjectImplementationPage", "ProjectDiagramPage"],
    reportExportSectionsUsingIt: ["Network object model", "Implementation plan", "Validation findings"],
    diagramSectionsUsingIt: ["Node/edge backend identity", "Dependency-aware diagram truth"],
    validationReadinessImpact: "Orphaned objects, edges without sources, and diagram nodes without backend objects must become findings.",
    testsSelftestsProvingIt: ["backend/src/lib/phase33EngineMatrix.selftest.ts", "backend/src/lib/phase36ImplementationPlanningEngine.selftest.ts"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 11,
    engineName: "Routing and segmentation",
    primarySourceFiles: [
      "backend/src/services/designCore/designCore.routingSegmentation.ts",
      "backend/src/services/designCore/designCore.intentSummaries.ts",
    ],
    inputs: ["route domains", "site summaries", "transit/loopback rows", "network object model", "policy signals", "WAN/cloud requirements"],
    outputs: ["routingSegmentation", "route intents", "route entries", "reachability checks", "segmentation expectations", "review blockers"],
    consumers: ["security policy flow", "implementation plan", "validation", "report/export", "WAN/logical diagrams"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ["siteCount", "internetModel", "dualIsp", "cloudConnected", "remoteAccess", "guestWifi", "management", "interSiteTrafficModel", "cloudRoutingModel", "resilienceTarget"],
    frontendPagesUsingIt: ["ProjectRoutingPage", "ProjectDiagramPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["Routing review", "Security policy review", "Implementation plan", "Review-required items"],
    diagramSectionsUsingIt: ["WAN/cloud topology", "Logical segmentation", "Security flow view"],
    validationReadinessImpact: "Routing is planning/review truth, not packet simulation; missing next hops, route-domain conflicts, and unknown cloud routing must require review.",
    testsSelftestsProvingIt: ["backend/src/lib/phase34RoutingEngine.selftest.ts", "backend/src/lib/phase41ScenarioMatrix.selftest.ts"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 12,
    engineName: "Security policy flow",
    primarySourceFiles: ["backend/src/services/designCore/designCore.securityPolicyFlow.ts"],
    inputs: ["security zones", "policy rules", "NAT rules", "routing/segmentation expectations", "security-sensitive requirements"],
    outputs: ["securityPolicyFlow", "service objects", "policy matrix", "flow requirements", "NAT review", "rule order/shadowing findings"],
    consumers: ["validation", "implementation plan", "report/export", "security diagrams"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ["guestWifi", "remoteAccess", "management", "cloudConnected", "iot", "cameras", "printers", "voice", "securityPosture", "trustBoundaryModel", "adminBoundary"],
    frontendPagesUsingIt: ["ProjectSecurityPage", "ProjectDiagramPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["Security policy review", "Implementation plan", "Validation findings", "Review-required items"],
    diagramSectionsUsingIt: ["Security zones/flows", "Logical segmentation"],
    validationReadinessImpact: "Missing policies, overbroad permits, NAT gaps, logging gaps, and review-only security claims must block/review implementation readiness.",
    testsSelftestsProvingIt: ["backend/src/lib/phase35SecurityPolicyEngine.selftest.ts", "scripts/check-phase96-diagram-readability-defaults-security-matrix.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 13,
    engineName: "Implementation planning",
    primarySourceFiles: ["backend/src/services/designCore/designCore.implementationPlan.ts"],
    inputs: ["verified source objects", "routes", "security flows", "DHCP/IPAM truth", "graph dependencies"],
    outputs: ["ImplementationPlanModel", "stages", "steps", "preconditions", "verification", "rollback", "readiness"],
    consumers: ["vendor-neutral templates", "validation", "ProjectImplementationPage", "report/export"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectImplementationPage", "ProjectValidationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["Implementation plan", "Validation findings", "Review-required items"],
    diagramSectionsUsingIt: ["Implementation view when rendered from backend objects"],
    validationReadinessImpact: "No step should be READY unless upstream source objects and evidence exist; inferred inputs must become review/blocker states.",
    testsSelftestsProvingIt: ["backend/src/lib/phase36ImplementationPlanningEngine.selftest.ts", "backend/src/lib/phase42VendorNeutralTemplates.selftest.ts"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 14,
    engineName: "Vendor-neutral implementation templates",
    primarySourceFiles: ["backend/src/services/designCore/designCore.implementationTemplates.ts"],
    inputs: ["ImplementationPlanModel", "source objects", "source requirements", "missing data blockers"],
    outputs: ["VendorNeutralImplementationTemplateModel", "domain templates", "required variables", "evidence", "rollback requirements"],
    consumers: ["ProjectImplementationPage", "report/export", "future vendor translators"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectImplementationPage", "ProjectReportPage"],
    reportExportSectionsUsingIt: ["Implementation plan", "Appendices", "Assumptions and limitations"],
    diagramSectionsUsingIt: ["Implementation view only when traceable to source objects"],
    validationReadinessImpact: "Templates cannot appear as fake command output; missing source variables must remain blockers or review notes.",
    testsSelftestsProvingIt: ["backend/src/lib/phase42VendorNeutralTemplates.selftest.ts", "scripts/check-phase88-professional-report-release-discipline.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 15,
    engineName: "Report/export truth",
    primarySourceFiles: [
      "backend/src/services/exportDesignCoreReport.service.ts",
      "backend/src/services/export.service.ts",
      "frontend/src/pages/ProjectReportPage.tsx",
    ],
    inputs: ["DesignCoreSnapshot", "reportTruth", "validation", "requirements closure", "engine summaries"],
    outputs: ["DOCX/PDF/CSV export content", "backend report truth sections", "assumptions/limitations", "review-required items"],
    consumers: ["ProjectReportPage", "export logs", "downloaded deliverables"],
    sourceOfTruthLevel: "backend-authoritative",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["ProjectReportPage"],
    reportExportSectionsUsingIt: ["Executive summary", "Readiness status", "Requirement traceability", "Addressing plan", "Enterprise IPAM status", "Network object model", "Routing review", "Security policy review", "Implementation plan", "Validation findings", "Diagram truth", "Assumptions and limitations"],
    diagramSectionsUsingIt: ["Diagram truth section references rendered backend object evidence"],
    validationReadinessImpact: "Exports must not claim readiness or design facts that backend design-core cannot prove.",
    testsSelftestsProvingIt: ["scripts/check-phase88-professional-report-release-discipline.cjs", "scripts/check-release-artifacts.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 16,
    engineName: "Diagram truth / renderer / layout",
    primarySourceFiles: [
      "frontend/src/features/diagram/components/BackendDiagramCanvas.tsx",
      "frontend/src/features/diagram/components/diagramLayoutGrammar.ts",
      "frontend/src/features/diagram/components/diagramRendererShared.tsx",
      "frontend/src/lib/diagramObjectModel.ts",
    ],
    inputs: ["backend diagramTruth", "networkObjectModel", "designGraph", "routing/security objects", "truth states"],
    outputs: ["physical topology", "logical segmentation", "WAN/cloud topology", "security flows", "per-site detail", "diagram truth warnings"],
    consumers: ["ProjectDiagramPage", "report diagram truth section", "visual QA checks"],
    sourceOfTruthLevel: "backend-computed-review-gated",
    requirementFieldsConsumed: ["siteCount", "guestWifi", "management", "voice", "wireless", "dualIsp", "cloudConnected", "remoteAccess", "serverPlacement", "securityPosture"],
    frontendPagesUsingIt: ["ProjectDiagramPage"],
    reportExportSectionsUsingIt: ["Diagram truth", "Network object model", "Security policy review"],
    diagramSectionsUsingIt: ["Physical", "Logical", "WAN/cloud", "Security", "Per-site", "Implementation"],
    validationReadinessImpact: "Diagram nodes and edges must render backend truth only; inferred/review-required objects must be visibly labelled, not hidden.",
    testsSelftestsProvingIt: ["scripts/check-phase107-diagram-layout-contract-rewrite.cjs", "scripts/check-phase106-engineer-grade-diagram-final-pass.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 17,
    engineName: "Platform/BOM foundation",
    primarySourceFiles: ["frontend/src/lib/platformBomFoundation.ts", "frontend/src/pages/ProjectPlatformBomPage.tsx"],
    inputs: ["requirements", "topology assumptions", "physical/device counts", "growth/redundancy signals"],
    outputs: ["switch/AP/firewall/WAN estimates", "PoE/port assumptions", "licensing placeholders", "confidence notes"],
    consumers: ["ProjectPlatformBomPage", "future report BOM section"],
    sourceOfTruthLevel: "frontend-advisory-estimate",
    requirementFieldsConsumed: ["wireless", "voice", "printers", "iot", "cameras", "usersPerSite", "siteCount", "dualIsp", "securityPosture", "printerCount", "phoneCount", "apCount", "cameraCount", "serverCount", "iotDeviceCount"],
    frontendPagesUsingIt: ["ProjectPlatformBomPage"],
    reportExportSectionsUsingIt: ["Advisory BOM / assumptions only until backend-owned"],
    diagramSectionsUsingIt: ["Physical topology only as advisory sizing context until backend-owned"],
    validationReadinessImpact: "BOM estimates must not be treated as implementation authority until moved backend-side or clearly labelled advisory.",
    testsSelftestsProvingIt: ["scripts/check-phase0-engine-inventory.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "ADVISORY_ONLY",
  },
  {
    phase: 18,
    engineName: "Discovery/current-state",
    primarySourceFiles: ["frontend/src/lib/discoveryFoundation.ts", "frontend/src/pages/ProjectDiscoveryPage.tsx", "backend/prisma/schema.prisma"],
    inputs: ["discoveryJson", "manual discovery fields", "future imported current-state artifacts", "brownfield requirements"],
    outputs: ["manual discovery plan", "current-state boundary", "import readiness", "conflict/review states"],
    consumers: ["ProjectDiscoveryPage", "brownfield readiness", "validation", "future reconciliation"],
    sourceOfTruthLevel: "manual-discovery-boundary",
    requirementFieldsConsumed: ["planningFor", "projectPhase", "siteCount", "monitoringModel", "loggingModel", "backupPolicy", "operationsOwnerModel", "interSiteTrafficModel"],
    frontendPagesUsingIt: ["ProjectDiscoveryPage", "ProjectEnterpriseIpamPage", "ProjectValidationPage"],
    reportExportSectionsUsingIt: ["Discovery/current-state", "Assumptions and limitations", "Review-required items"],
    diagramSectionsUsingIt: ["Imported/discovered overlays only after import validation exists"],
    validationReadinessImpact: "Discovery must distinguish not provided, manually entered, imported, validated, conflicting, and review required.",
    testsSelftestsProvingIt: ["backend/src/lib/designCore.selftest.ts", "scripts/check-phase0-engine-inventory.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "NEEDS_PHASE_REPAIR",
  },
  {
    phase: 19,
    engineName: "AI draft/helper",
    primarySourceFiles: ["backend/src/services/ai.service.ts", "frontend/src/features/ai/components/AIPlanningPanel.tsx", "frontend/src/pages/AIWorkspacePage.tsx"],
    inputs: ["user prompt", "draft project context", "requirements profile", "review/apply controls"],
    outputs: ["AI draft suggestions", "review checklist", "selective draft apply payloads"],
    consumers: ["ProjectRequirementsPage", "AIWorkspacePage", "future materialization after explicit review"],
    sourceOfTruthLevel: "ai-draft-only",
    requirementFieldsConsumed: ALL_REQUIREMENT_FIELDS,
    frontendPagesUsingIt: ["AIWorkspacePage", "ProjectRequirementsPage"],
    reportExportSectionsUsingIt: ["None as authority; only reviewed/materialized outputs may reach reports"],
    diagramSectionsUsingIt: ["None as authority; only reviewed/materialized outputs may reach diagrams"],
    validationReadinessImpact: "AI suggestions must stay draft/review-required until converted into structured requirements and passed through backend validation.",
    testsSelftestsProvingIt: ["scripts/check-phase0-engine-inventory.cjs"],
    propagationContract: REQUIRED_CONTRACT,
    currentPhase0Verdict: "DRAFT_ONLY",
  },
];

export const PHASE0_ENGINE_INVENTORY_EXPECTED_PHASES = 19;

export function validatePhase0EngineInventory(rows: Phase0EngineInventoryRow[] = PHASE0_ENGINE_INVENTORY) {
  const errors: string[] = [];
  if (rows.length !== PHASE0_ENGINE_INVENTORY_EXPECTED_PHASES) {
    errors.push(`Expected ${PHASE0_ENGINE_INVENTORY_EXPECTED_PHASES} engine rows, found ${rows.length}.`);
  }

  const phases = new Set<number>();
  for (const row of rows) {
    phases.add(row.phase);
    for (const field of [
      "engineName",
      "validationReadinessImpact",
    ] as const) {
      if (!row[field]) errors.push(`Phase ${row.phase} missing ${field}.`);
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
      if (!Array.isArray(row[field]) || row[field].length === 0) errors.push(`Phase ${row.phase} missing ${field}.`);
    }
    for (const contractStep of PHASE0_PROPAGATION_CONTRACT) {
      if (!row.propagationContract.includes(contractStep)) {
        errors.push(`Phase ${row.phase} is missing propagation contract step: ${contractStep}.`);
      }
    }
  }

  for (let phase = 1; phase <= PHASE0_ENGINE_INVENTORY_EXPECTED_PHASES; phase += 1) {
    if (!phases.has(phase)) errors.push(`Missing Phase ${phase} engine inventory row.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    engineCount: rows.length,
  };
}
