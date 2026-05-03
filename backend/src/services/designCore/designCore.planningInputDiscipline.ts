import { hasMeaningfulValue, parseJsonMap } from "./designCore.helpers.js";
import {
  PLANNING_INPUT_AUDIT_ITEMS,
  summarizePlanningInputAudit,
} from "../../lib/planningInputAudit.js";
import type { getProjectDesignData } from "./designCore.repository.js";
import type {
  DesignCoreIssue,
  DesignCoreAddressRow,
  DesignCoreSiteBlock,
  DesignCoreProposalRow,
  DesignTraceabilityItem,
  CurrentStateBoundarySummary,
  SiteSummarizationReview,
  TransitPlanRow,
  LoopbackPlanRow,
  TruthStateLedger,
  AllocationPolicySummary,
  RoutingIntentSummary,
  SecurityIntentSummary,
  TraceabilityCoverageSummary,
  WanPlanSummary,
  BrownfieldReadinessSummary,
  AllocatorConfidenceSummary,
  RouteDomainSummary,
  PolicyConsequenceSummary,
  DiscoveredStateImportPlanSummary,
  ImplementationReadinessSummary,
  EngineConfidenceSummary,
  AllocatorDeterminismSummary,
  StandardsAlignmentSummary,
  ActivePlanningInputSummary,
  PlanningInputCoverageSummary,
  RequirementsCoverageSummary,
  PlanningInputDisciplineItem,
  PlanningInputDisciplineSummary,
} from "../designCore.types.js";

type ProjectWithDesignData = NonNullable<Awaited<ReturnType<typeof getProjectDesignData>>>;
type SiteBlockRecord = DesignCoreSiteBlock;
type AddressRowRecord = DesignCoreAddressRow;

export function buildPlanningInputCoverageSummary(project: ProjectWithDesignData): PlanningInputCoverageSummary {
  const directKeys = PLANNING_INPUT_AUDIT_ITEMS.filter((item) => item.impact === "direct").map((item) => item.key);
  const indirectKeys = PLANNING_INPUT_AUDIT_ITEMS.filter((item) => item.impact === "indirect").map((item) => item.key);
  const notYetImplementedKeys = PLANNING_INPUT_AUDIT_ITEMS.filter((item) => item.impact === "not-yet-implemented").map((item) => item.key);

  const sourceMaps = {
    requirements: parseJsonMap(project.requirementsJson),
    discovery: parseJsonMap(project.discoveryJson),
    platform: parseJsonMap(project.platformProfileJson),
  } as const;

  const activeInputs: ActivePlanningInputSummary[] = PLANNING_INPUT_AUDIT_ITEMS
    .map((item) => {
      const rawValue = sourceMaps[item.sourceArea][item.key];
      if (!hasMeaningfulValue(rawValue)) return null;
      const value = typeof rawValue === "string" ? rawValue.trim() : String(rawValue);
      return {
        sourceArea: item.sourceArea,
        key: item.key,
        impact: item.impact,
        value,
        outputAreas: item.outputAreas,
        note: item.note,
      } satisfies ActivePlanningInputSummary;
    })
    .filter((item): item is ActivePlanningInputSummary => Boolean(item));

  const activeDirectCount = activeInputs.filter((item) => item.impact === "direct").length;
  const activeIndirectCount = activeInputs.filter((item) => item.impact === "indirect").length;
  const activeNotYetImplementedCount = activeInputs.filter((item) => item.impact === "not-yet-implemented").length;

  const notes = [
    "Direct inputs already change design outputs or trust signals.",
    "Indirect inputs influence summaries or posture but still need deeper synthesis.",
    "Not-yet-implemented inputs are intentionally labeled so the planner does not overclaim what they change today.",
  ];
  if (activeNotYetImplementedCount > 0) {
    notes.push(`The current project actively uses ${activeNotYetImplementedCount} saved input${activeNotYetImplementedCount === 1 ? "" : "s"} that still do not change the design deeply enough yet.`);
  }

  return {
    audit: summarizePlanningInputAudit(),
    directKeys,
    indirectKeys,
    notYetImplementedKeys,
    activeInputs,
    activeDirectCount,
    activeIndirectCount,
    activeNotYetImplementedCount,
    notes,
  };
}

function sourceRequirementId(sourceArea: PlanningInputDisciplineItem["sourceArea"], key: string) {
  return `${sourceArea}:${key}`;
}

function confidenceForInput(impact: PlanningInputDisciplineItem["impact"], reflectedInOutputs: boolean): PlanningInputDisciplineItem["confidence"] {
  if (!reflectedInOutputs) return impact === "direct" ? "medium" : "advisory";
  if (impact === "direct") return "high";
  if (impact === "indirect") return "medium";
  return "advisory";
}

export function buildPlanningInputDisciplineSummary(
  planningInputCoverage: PlanningInputCoverageSummary,
  routingIntent: RoutingIntentSummary,
  securityIntent: SecurityIntentSummary,
  policyConsequences: PolicyConsequenceSummary,
  wanPlan: WanPlanSummary,
  siteSummaries: SiteSummarizationReview[],
  proposedRows: DesignCoreProposalRow[],
  standardsAlignment: StandardsAlignmentSummary,
): PlanningInputDisciplineSummary {
  const hasGuestBoundary = securityIntent.zoneNames.includes("guest") || standardsAlignment.appliedRuleIds.includes("bp-guest-isolation");
  const hasRemoteAccessSignal = securityIntent.remoteAccessExpected || policyConsequences.remoteAccessControlState !== "not-signaled";
  const hasWanSignal = wanPlan.recommendedModel !== "single-site" || wanPlan.transitStrategy !== "deferred" || routingIntent.topologyStyle !== "single-site";
  const hasDemandSignal = siteSummaries.length > 0 || proposedRows.length > 0;

  const items: PlanningInputDisciplineItem[] = planningInputCoverage.activeInputs.map((input) => {
    let reflectedInOutputs = false;
    const reflectionNotes: string[] = [];

    switch (`${input.sourceArea}:${input.key}`) {
      case "requirements:usersPerSite":
        reflectedInOutputs = hasDemandSignal;
        reflectionNotes.push(reflectedInOutputs
          ? "Demand inputs are reflected in subnet sizing and proposal review outputs."
          : "User demand is saved, but current sizing and proposal outputs still do not show enough demand-driven behavior.");
        break;
      case "requirements:guestWifi":
        reflectedInOutputs = hasGuestBoundary && securityIntent.guestIsolationExpected;
        reflectionNotes.push(reflectedInOutputs
          ? "Guest access is reflected in security intent and guest-boundary design outputs."
          : "Guest access is saved, but the current design outputs still do not show a clear guest boundary.");
        break;
      case "requirements:remoteAccess":
        reflectedInOutputs = hasRemoteAccessSignal;
        reflectionNotes.push(reflectedInOutputs
          ? "Remote access is reflected in security intent and policy consequence outputs."
          : "Remote access is saved, but policy and design outputs still do not clearly reflect it.");
        break;
      case "requirements:serverPlacement":
        reflectedInOutputs = wanPlan.centralization !== "local" || wanPlan.notes.some((note) => note.toLowerCase().includes("shared"));
        reflectionNotes.push(reflectedInOutputs
          ? "Server placement is reflected in WAN and service centralization outputs."
          : "Server placement is saved, but WAN and service outputs still do not clearly reflect it.");
        break;
      case "requirements:internetModel":
        reflectedInOutputs = wanPlan.notes.some((note) => note.toLowerCase().includes("internet") || note.toLowerCase().includes("breakout")) || hasWanSignal;
        reflectionNotes.push(reflectedInOutputs
          ? "Internet model is reflected in WAN and edge planning outputs."
          : "Internet model is saved, but WAN and edge outputs still do not clearly reflect it.");
        break;
      case "discovery:topologyBaseline":
        reflectedInOutputs = routingIntent.topologyStyle !== "single-site" || wanPlan.recommendedModel !== "single-site";
        reflectionNotes.push(reflectedInOutputs
          ? "Topology baseline is reflected in topology and WAN planning outputs."
          : "Topology baseline is saved, but outputs still do not clearly show topology-aware planning.");
        break;
      case "discovery:addressingVlanBaseline":
        reflectedInOutputs = siteSummaries.length > 0 || standardsAlignment.appliedRuleIds.includes("bp-hierarchical-site-blocks");
        reflectionNotes.push(reflectedInOutputs
          ? "Addressing baseline is reflected in hierarchy and summary review outputs."
          : "Addressing baseline is saved, but hierarchy outputs still need stronger reflection.");
        break;
      case "platform:routingPosture":
        reflectedInOutputs = routingIntent.routingPosture.trim().length > 0 && routingIntent.routingPosture !== "unspecified";
        reflectionNotes.push(reflectedInOutputs
          ? "Routing posture is reflected in routing intent outputs."
          : "Routing posture is saved, but routing outputs still do not clearly reflect it.");
        break;
      case "platform:firewallPosture":
        reflectedInOutputs = securityIntent.posture !== "baseline" || policyConsequences.managementPlaneProtectionState !== "not-signaled" || policyConsequences.guestContainmentState !== "not-signaled";
        reflectionNotes.push(reflectedInOutputs
          ? "Firewall posture is reflected in security and policy outputs."
          : "Firewall posture is saved, but security outputs still do not clearly reflect it.");
        break;
      case "platform:wanPosture":
        reflectedInOutputs = hasWanSignal;
        reflectionNotes.push(reflectedInOutputs
          ? "WAN posture is reflected in WAN planning and transit outputs."
          : "WAN posture is saved, but WAN outputs still do not clearly reflect it.");
        break;
      default:
        reflectedInOutputs = input.impact !== "not-yet-implemented";
        reflectionNotes.push(reflectedInOutputs
          ? "This input currently influences at least one design or review output."
          : "This input is intentionally labeled as not yet deeply implemented.");
        break;
    }

    return {
      sourceArea: input.sourceArea,
      key: input.key,
      impact: input.impact,
      value: input.value,
      outputAreas: input.outputAreas,
      reflectedInOutputs,
      reflectionNotes,
      sourceType: input.sourceArea === "discovery" ? "IMPORTED" : "USER_PROVIDED",
      sourceRequirementIds: [sourceRequirementId(input.sourceArea, input.key)],
      sourceObjectIds: [],
      sourceEngine: "designCore.planningInputDiscipline",
      confidence: confidenceForInput(input.impact, reflectedInOutputs),
      proofStatus: reflectedInOutputs ? "PROVEN" : input.impact === "not-yet-implemented" ? "NOT_DESIGN_DRIVING" : "REVIEW_REQUIRED",
      reviewReason: reflectedInOutputs
        ? undefined
        : input.impact === "not-yet-implemented"
          ? "Captured but not currently design-driving: this input is intentionally labelled as future-engine or unsupported for current synthesis."
          : "Requires manual review: this captured planning input is not reflected in backend design outputs yet.",
    };
  });

  const notReflected = items.filter((item) => !item.reflectedInOutputs);

  return {
    items,
    reflectedCount: items.length - notReflected.length,
    notReflectedCount: notReflected.length,
    notReflectedKeys: notReflected.map((item) => `${item.sourceArea}:${item.key}`),
    notes: [
      "Active planning inputs should be visible in design, validation, or exported review outputs.",
      "Inputs that are saved but not reflected should be treated as cleanup or future-engine work, not as hidden design truth.",
    ],
  };
}

