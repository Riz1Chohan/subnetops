import { buildSecurityPolicyFlowModel as buildSecurityPolicyDomainModel } from "../../domain/security-policy/index.js";
import type {
  NetworkObjectModel,
  RoutingSegmentationModel,
  SecurityPolicyFlowModel,
} from "../designCore.types.js";

export function buildSecurityPolicyFlowModel(params: {
  networkObjectModel: Omit<NetworkObjectModel, "summary" | "designGraph" | "routingSegmentation" | "securityPolicyFlow" | "implementationPlan">;
  routingSegmentation: RoutingSegmentationModel;
  requirementsJson?: string | null;
}): SecurityPolicyFlowModel {
  return buildSecurityPolicyDomainModel(params as never) as SecurityPolicyFlowModel;
}
