import { deriveReadinessLadder, V1_READINESS_LADDER_CONTRACT, V1_READINESS_LADDER_ROLE } from '../../domain/readiness/index.js';
import type {
  BackendDiagramTruthModel,
  BackendReportTruthModel,
  NetworkObjectModel,
  V1AiDraftHelperControlSummary,
  V1CidrAddressingTruthControlSummary,
  V1EnterpriseIpamTruthControlSummary,
  V1ImplementationPlanningControlSummary,
  V1ImplementationTemplateControlSummary,
  V1ReadinessLadderControlSummary,
  V1ReportExportTruthControlSummary,
  V1SecurityPolicyFlowControlSummary,
  V1ValidationReadinessControlSummary,
  V1RequirementsMaterializationControlSummary,
  V1DiagramTruthControlSummary,
} from '../designCore.types.js';

export { V1_READINESS_LADDER_CONTRACT, V1_READINESS_LADDER_ROLE };

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function omittedHas(items: unknown, key: 'omittedHasBlockers' | 'omittedHasReviewRequired'): boolean {
  return Array.isArray(items) && items.some((item) => Boolean((item as Record<string, unknown>)?.[key]));
}

export function buildV1ReadinessLadderControl(params: {
  V1RequirementsMaterialization: V1RequirementsMaterializationControlSummary;
  V1CidrAddressingTruth: V1CidrAddressingTruthControlSummary;
  V1EnterpriseIpamTruth: V1EnterpriseIpamTruthControlSummary;
  V1ValidationReadiness: V1ValidationReadinessControlSummary;
  V1SecurityPolicyFlow: V1SecurityPolicyFlowControlSummary;
  V1ImplementationPlanning: V1ImplementationPlanningControlSummary;
  V1ImplementationTemplates: V1ImplementationTemplateControlSummary;
  V1ReportExportTruth: V1ReportExportTruthControlSummary;
  V1DiagramTruth: V1DiagramTruthControlSummary;
  V1AiDraftHelper: V1AiDraftHelperControlSummary;
  networkObjectModel: NetworkObjectModel;
  reportTruth: BackendReportTruthModel;
  diagramTruth: BackendDiagramTruthModel;
}): V1ReadinessLadderControlSummary {
  const reportOmitted = (params.V1ReportExportTruth as any)?.omittedEvidenceSummaries;
  const diagramOmitted = (params.V1DiagramTruth as any)?.renderModel?.omittedEvidenceSummaries ?? (params.diagramTruth as any)?.renderModel?.omittedEvidenceSummaries;
  const securitySummary = (params.networkObjectModel as any)?.securityPolicyFlow?.summary ?? {};

  const missingCapacitySourceCount =
    numberValue(params.V1RequirementsMaterialization.reviewItemCount)
    + numberValue(params.V1CidrAddressingTruth.addressingTruthRows?.filter((row: any) => row.capacityState === 'unknown' || row.estimatedHosts == null).length);

  const inferredSecurityPolicyCount =
    numberValue((params.V1SecurityPolicyFlow as any)?.reviewFindingCount)
    + numberValue((params.V1SecurityPolicyFlow as any)?.flowConsequences?.filter((row: any) => String(row.readinessImpact ?? row.state ?? '').toUpperCase().includes('REVIEW')).length)
    + numberValue(securitySummary.missingPolicyCount)
    + numberValue(securitySummary.missingNatCount);

  const unvalidatedGeneratedObjectCount =
    numberValue((params.networkObjectModel as any)?.summary?.V1MetadataGapCount)
    + numberValue((params.networkObjectModel as any)?.summary?.implementationReviewObjectCount)
    + numberValue((params.V1ValidationReadiness as any)?.warningFindingCount && params.V1ValidationReadiness.validationGateAllowsImplementation ? 0 : 0);

  const summary = deriveReadinessLadder({
    invalidAddressingCount:
      numberValue(params.V1CidrAddressingTruth.invalidSubnetCount)
      + numberValue(params.V1CidrAddressingTruth.gatewayIssueCount)
      + numberValue(params.V1CidrAddressingTruth.overlapIssueCount)
      + numberValue(params.V1EnterpriseIpamTruth.conflictBlockerCount),
    missingCapacitySourceCount,
    inferredSecurityPolicyCount,
    omittedHasBlockers: omittedHas(reportOmitted, 'omittedHasBlockers') || omittedHas(diagramOmitted, 'omittedHasBlockers'),
    omittedHasReviewRequired: omittedHas(reportOmitted, 'omittedHasReviewRequired') || omittedHas(diagramOmitted, 'omittedHasReviewRequired'),
    unvalidatedGeneratedObjectCount,
    blockingFindingCount:
      numberValue(params.V1ValidationReadiness.blockingFindingCount)
      + numberValue(params.V1ReportExportTruth.blockedFindingCount)
      + numberValue((params.V1DiagramTruth as any)?.blockedFindingCount)
      + numberValue(params.V1ImplementationPlanning.blockedFindingCount)
      + numberValue(params.V1ImplementationTemplates.blockedFindingCount),
    reviewRequiredFindingCount:
      numberValue(params.V1ValidationReadiness.reviewRequiredFindingCount)
      + numberValue(params.V1ReportExportTruth.reviewFindingCount)
      + numberValue((params.V1DiagramTruth as any)?.reviewFindingCount)
      + numberValue(params.V1ImplementationPlanning.reviewFindingCount)
      + numberValue(params.V1ImplementationTemplates.reviewFindingCount),
    warningFindingCount: numberValue(params.V1ValidationReadiness.warningFindingCount),
    materializedObjectCount: numberValue(params.V1RequirementsMaterialization.materializedObjectCount) + numberValue((params.networkObjectModel as any)?.summary?.objectCount),
    validatedObjectCount: numberValue(params.V1ValidationReadiness.passedFindingCount) + numberValue((params.networkObjectModel as any)?.summary?.V1MetadataCompleteCount),
    implementationPlanningReadiness: params.V1ImplementationPlanning.overallReadiness,
    implementationTemplateReadiness: params.V1ImplementationTemplates.overallReadiness,
    reportExportReadiness: params.V1ReportExportTruth.overallReadiness,
    diagramReadiness: (params.V1DiagramTruth as any)?.overallReadiness ?? (params.diagramTruth as any)?.overallReadiness,
    aiDraftOnly: params.V1AiDraftHelper.aiAuthority === 'DRAFT_ONLY_NOT_AUTHORITATIVE' && (params.V1AiDraftHelper.aiDerivedObjectCount > 0 || params.V1AiDraftHelper.reviewRequiredObjectCount > 0),
  });

  return {
    ...summary,
    validationGateAllowsImplementation: summary.implementationOutputAllowed && params.V1ValidationReadiness.validationGateAllowsImplementation,
    implementationReadinessImpact: summary.overallReadiness === 'IMPLEMENTATION_READY' ? 'READY' : summary.overallReadiness === 'BLOCKED' ? 'BLOCKED' : 'REVIEW_REQUIRED',
    reportReadinessImpact: summary.reportMayClaimImplementationReady ? 'READY' : summary.overallReadiness === 'BLOCKED' ? 'BLOCKED' : 'REVIEW_REQUIRED',
    diagramReadinessImpact: summary.diagramMayShowCleanProductionTruth ? 'READY' : summary.overallReadiness === 'BLOCKED' ? 'BLOCKED' : 'REVIEW_REQUIRED',
  };
}
