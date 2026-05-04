import { buildV1ReportExportTruthControl as buildDomainV1ReportExportTruthControl } from "../../domain/reporting/report-export-truth.js";
import type {
  BackendDiagramTruthModel,
  BackendReportTruthModel,
  NetworkObjectModel,
  V1RoutingSegmentationControlSummary,
  V1SecurityPolicyFlowControlSummary,
  V1ImplementationPlanningControlSummary,
  V1ImplementationTemplateControlSummary,
  V1ReportExportTruthControlSummary,
  V1RequirementsClosureControlSummary,
  V1CidrAddressingTruthControlSummary,
  V1EnterpriseIpamTruthControlSummary,
  V1ValidationReadinessControlSummary,
  V1NetworkObjectModelControlSummary,
} from "../designCore.types.js";

export function buildV1ReportExportTruthControl(params: {
  reportTruth: BackendReportTruthModel;
  diagramTruth: BackendDiagramTruthModel;
  V1RequirementsClosure: V1RequirementsClosureControlSummary;
  V1CidrAddressingTruth: V1CidrAddressingTruthControlSummary;
  V1EnterpriseIpamTruth: V1EnterpriseIpamTruthControlSummary;
  V1ValidationReadiness: V1ValidationReadinessControlSummary;
  V1NetworkObjectModel: V1NetworkObjectModelControlSummary;
  V1RoutingSegmentation: V1RoutingSegmentationControlSummary;
  V1SecurityPolicyFlow: V1SecurityPolicyFlowControlSummary;
  V1ImplementationPlanning: V1ImplementationPlanningControlSummary;
  V1ImplementationTemplates: V1ImplementationTemplateControlSummary;
  networkObjectModel: NetworkObjectModel;
}): V1ReportExportTruthControlSummary {
  return buildDomainV1ReportExportTruthControl(params as any) as unknown as V1ReportExportTruthControlSummary;
}
