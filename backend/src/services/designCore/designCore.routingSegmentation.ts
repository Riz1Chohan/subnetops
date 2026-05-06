import { buildRoutingSegmentationModel as buildRoutingSegmentationDomainModel } from "../../domain/routing/index.js";
import type {
  NetworkObjectModel,
  RoutingSegmentationModel,
  SiteSummarizationReview,
  TransitPlanRow,
} from "../designCore.types.js";

type RoutingProject = {
  sites: Array<{ id: string; name: string; siteCode?: string | null }>;
};

export function buildRoutingSegmentationModel(params: {
  project: RoutingProject;
  networkObjectModel: Omit<NetworkObjectModel, "summary" | "designGraph" | "routingSegmentation" | "securityPolicyFlow" | "implementationPlan">;
  siteSummaries: SiteSummarizationReview[];
  transitPlan: TransitPlanRow[];
}): RoutingSegmentationModel {
  return buildRoutingSegmentationDomainModel(params as never) as RoutingSegmentationModel;
}
