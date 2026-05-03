import { PHASE6_DESIGN_CORE_ORCHESTRATOR_CONTRACT, buildPhase6DesignCoreOrchestratorControl } from "../services/designCore/designCore.phase6DesignCoreOrchestratorControl.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[phase6] ${message}`);
}

const minimal = buildPhase6DesignCoreOrchestratorControl({
  projectId: "project-1",
  projectName: "Phase 6 Selftest",
  planningInputCoverage: { totalFieldCount: 1 } as any,
  planningInputDiscipline: { notReflectedCount: 0 } as any,
  requirementsCoverage: { totalFieldCount: 1 } as any,
  requirementsImpactClosure: {} as any,
  requirementsScenarioProof: {} as any,
  phase1TraceabilityControl: { requirementLineage: [], outputLabels: [] } as any,
  phase2RequirementsMaterialization: { contractVersion: "PHASE2_REQUIREMENTS_MATERIALIZATION_POLICY_CONTRACT", totalPolicyCount: 1, reviewItemCount: 0, validationBlockerCount: 0, silentDropCount: 0 } as any,
  phase3RequirementsClosure: { contractVersion: "PHASE3_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF", closureMatrix: [], missingConsumerCount: 0 } as any,
  phase4CidrAddressingTruth: { contractVersion: "PHASE4_ENGINE1_CIDR_ADDRESSING_TRUTH", totalAddressRowCount: 1, invalidSubnetCount: 0, gatewayIssueCount: 0, overlapIssueCount: 0, undersizedSubnetCount: 0, requirementAddressingGapCount: 0 } as any,
  phase5EnterpriseIpamTruth: { contractVersion: "PHASE5_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW", reconciliationRows: [], reviewRequiredCount: 0, activeRequirementIpamGapCount: 0, conflictBlockerCount: 0 } as any,
  traceability: [{ sourceKey: "usersPerSite" }] as any,
  siteBlocks: [{ siteId: "site-1" }] as any,
  addressingRows: [{ id: "vlan-1" }] as any,
  proposedRows: [],
  enterpriseAllocatorPosture: {} as any,
  standardsAlignment: { evaluations: [{ ruleId: "guest-isolation" }], reviewRuleIds: [], violatedRuleIds: [] } as any,
  currentStateBoundary: {} as any,
  brownfieldReadiness: {} as any,
  discoveredStateImportPlan: {} as any,
  networkObjectModel: {
    summary: { deviceCount: 1, interfaceCount: 1, linkCount: 1, securityZoneCount: 1, orphanedAddressRowCount: 0 },
    designGraph: { summary: { nodeCount: 1, edgeCount: 1, integrityFindingCount: 0, blockingFindingCount: 0 } },
    routingSegmentation: { summary: { routeIntentCount: 1, routeEntryCount: 1, segmentationExpectationCount: 1, reachabilityFindingCount: 0, nextHopReviewCount: 0, blockingFindingCount: 0 } },
    securityPolicyFlow: { summary: { flowRequirementCount: 1, policyMatrixRowCount: 1, serviceObjectCount: 1, findingCount: 0, blockingFindingCount: 0, missingNatCount: 0 } },
    implementationPlan: { summary: { stepCount: 1, reviewStepCount: 0, blockedStepCount: 0 } },
  } as any,
  reportTruth: { reviewFindings: [], blockedFindings: [] } as any,
  diagramTruth: { hotspots: [] } as any,
  vendorNeutralImplementationTemplates: { summary: { templateCount: 1, reviewTemplateCount: 0, blockedTemplateCount: 0 } } as any,
  implementationReadiness: {} as any,
  issues: [],
});

assert(minimal.contractVersion === PHASE6_DESIGN_CORE_ORCHESTRATOR_CONTRACT, "contract marker missing");
assert(minimal.orchestratorRole === "DESIGN_CORE_COORDINATOR_NOT_GOD_FILE", "orchestrator role must forbid god-file behavior");
assert(minimal.requiredSnapshotSectionCount === 13, "Phase 6 must expose all orchestrator boundary sections");
assert(minimal.sectionRows.some((row) => row.sectionKey === "sourceInputs"), "source input section missing");
assert(minimal.sectionRows.some((row) => row.sectionKey === "addressingTruth"), "addressing truth section missing");
assert(minimal.sectionRows.some((row) => row.sectionKey === "enterpriseIpamTruth"), "enterprise IPAM truth section missing");
assert(minimal.sectionRows.some((row) => row.sectionKey === "readinessTruth"), "readiness truth section missing");
assert(minimal.dependencyEdges.some((edge) => edge.id === "phase6-addressing-to-ipam"), "Engine 1 to Engine 2 dependency edge missing");
assert(minimal.frontendIndependentTruthRiskCount === 0, "Phase 6 must not introduce frontend-independent engineering truth");

console.log("[phase6] Design-core orchestrator selftest passed");
