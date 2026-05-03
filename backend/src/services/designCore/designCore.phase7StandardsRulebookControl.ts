import { parseJsonMap, valueAsBoolean, valueAsString } from "./designCore.helpers.js";
import type { StandardsRuleStatus } from "../../lib/networkStandardsRulebook.js";
import type {
  DesignCoreIssue,
  NetworkObjectModel,
  Phase3RequirementsClosureControlSummary,
  Phase7StandardsAlignmentRulebookControlSummary,
  Phase7StandardsApplicabilityState,
  Phase7StandardsEnforcementState,
  Phase7StandardsFinding,
  Phase7StandardsRequirementActivation,
  Phase7StandardsRuleRow,
  Phase7StandardsSeverity,
  StandardsAlignmentSummary,
} from "../designCore.types.js";

export const PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT = "PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT" as const;
// phase7StandardsRulebookControl snapshot field is the named DesignCoreSnapshot standards control surface.

const RULE_REQUIREMENT_RELATIONSHIPS: Record<string, string[]> = {
  "ADDR-PRIVATE-IPV4": ["addressHierarchyModel", "reservedRangePolicy", "serverPlacement"],
  "ADDR-CIDR-HIERARCHY": ["siteCount", "addressHierarchyModel", "siteBlockStrategy", "growthBufferModel"],
  "WAN-POINT-TO-POINT-31": ["siteCount", "dualIsp", "interSiteTrafficModel", "resilienceTarget"],
  "IPV6-ARCHITECTURE": ["internetProtocol", "ipv6Enabled", "cloudConnected", "cloudNetworkModel"],
  "IPV6-ULA": ["internetProtocol", "ipv6Enabled", "cloudNetworkModel"],
  "VLAN-SEGMENTATION": ["guestWifi", "voice", "wireless", "printers", "iot", "cameras", "management", "remoteAccess", "trustBoundaryModel"],
  "ACCESS-CONTROL-8021X": ["nacRequired", "identityModel", "managementAccess", "remoteAccess", "securityPosture"],
  "LINK-AGGREGATION": ["linkAggregation", "redundancy", "resilienceTarget", "outageTolerance"],
  "WLAN-STANDARDS": ["wireless", "guestWifi", "wirelessModel"],
  "FIREWALL-POLICY": ["guestWifi", "guestAccess", "remoteAccess", "cloudConnected", "securityPosture", "trustBoundaryModel", "adminBoundary"],
  "ZERO-TRUST-RESOURCE-FOCUS": ["remoteAccess", "identityModel", "securityPosture", "trustBoundaryModel", "cloudIdentityBoundary"],
  "MGMT-ISOLATION": ["management", "managementAccess", "adminBoundary", "operationsOwnerModel"],
  "GUEST-ISOLATION": ["guestWifi", "guestAccess", "guestPolicy", "wirelessModel"],
  "HIERARCHICAL-SITE-BLOCKS": ["siteCount", "siteBlockStrategy", "addressHierarchyModel", "growthBufferModel"],
  "GATEWAY-CONSISTENCY": ["gatewayConvention", "managementIpPolicy", "namingHierarchy"],
};

const RULE_AFFECTED_ENGINES: Record<string, string[]> = {
  "ADDR-PRIVATE-IPV4": ["Engine 1 CIDR/addressing", "Validation"],
  "ADDR-CIDR-HIERARCHY": ["Engine 1 CIDR/addressing", "Routing/segmentation", "Validation"],
  "WAN-POINT-TO-POINT-31": ["Engine 1 CIDR/addressing", "Routing/segmentation"],
  "IPV6-ARCHITECTURE": ["Enterprise IPAM", "Validation"],
  "IPV6-ULA": ["Enterprise IPAM", "Validation"],
  "VLAN-SEGMENTATION": ["Requirements materialization", "Network object model", "Security policy flow"],
  "ACCESS-CONTROL-8021X": ["Security policy flow", "Implementation planning"],
  "LINK-AGGREGATION": ["Network object model", "Implementation planning"],
  "WLAN-STANDARDS": ["Requirements materialization", "Network object model"],
  "FIREWALL-POLICY": ["Security policy flow", "Validation", "Implementation planning"],
  "ZERO-TRUST-RESOURCE-FOCUS": ["Security policy flow", "Standards alignment"],
  "MGMT-ISOLATION": ["Security policy flow", "Network object model", "Validation"],
  "GUEST-ISOLATION": ["Security policy flow", "Network object model", "Validation"],
  "HIERARCHICAL-SITE-BLOCKS": ["Engine 1 CIDR/addressing", "Routing/segmentation"],
  "GATEWAY-CONSISTENCY": ["Engine 1 CIDR/addressing", "Implementation planning"],
};

const RULE_REMEDIATION: Record<string, string> = {
  "ADDR-PRIVATE-IPV4": "Use an RFC 1918 private organization block for internal planning, or explicitly document why public addressing is required and keep it review-gated.",
  "ADDR-CIDR-HIERARCHY": "Create valid per-site summary blocks and allocate child VLAN subnets inside those boundaries before claiming routing summarization readiness.",
  "WAN-POINT-TO-POINT-31": "Use /31 only for true point-to-point transit links; if other transit masks are used, document the reason and keep routing review visible.",
  "IPV6-ARCHITECTURE": "Keep IPv6 plans aligned to IPv6 addressing architecture and do not copy IPv4 subnet assumptions blindly.",
  "IPV6-ULA": "Use ULA only when the internal IPv6 scope fits the design; otherwise require explicit IPv6 source-of-truth review.",
  "VLAN-SEGMENTATION": "Materialize the expected VLAN-backed segments and retain requirement lineage for each segment.",
  "ACCESS-CONTROL-8021X": "Treat NAC as review-required until identity source, switch edge role, supplicant behavior, exception handling, and fallback policy are captured.",
  "LINK-AGGREGATION": "Capture link bundle intent, member links, failure behavior, and platform limits before claiming aggregation readiness.",
  "WLAN-STANDARDS": "Keep WLAN and guest SSID planning tied to 802.11-style enterprise roles, not generic Wi-Fi notes.",
  "FIREWALL-POLICY": "Define trust zones, default-deny posture, explicit allowed flows, logging expectations, NAT impact, and verification evidence.",
  "ZERO-TRUST-RESOURCE-FOCUS": "Apply zero-trust language only as an access-control overlay tied to resources, identity, and logging evidence.",
  "MGMT-ISOLATION": "Create or strengthen a management zone/segment and require restricted management-plane source evidence.",
  "GUEST-ISOLATION": "Create or strengthen a guest zone/segment and require explicit Guest-to-Internal deny evidence plus Internet access review.",
  "HIERARCHICAL-SITE-BLOCKS": "Allocate per-site summary blocks before individual VLAN rows when the design is multi-site.",
  "GATEWAY-CONSISTENCY": "Choose a gateway convention and keep custom/mixed gateways review-gated with documented exceptions.",
};

const RULE_EXCEPTION_POLICY: Record<string, string> = {
  "ADDR-PRIVATE-IPV4": "Public addressing can be allowed only as an explicit business/edge case with review-required labeling.",
  "ADDR-CIDR-HIERARCHY": "Flat addressing may be tolerated for very small single-site designs but cannot be marked summarization-ready.",
  "WAN-POINT-TO-POINT-31": "A /30 or larger transit segment is allowed when platform/provider constraints require it, but the exception must stay visible.",
  "IPV6-ARCHITECTURE": "No exception: if IPv6 is enabled, architecture review remains required until proven by IPv6 objects.",
  "IPV6-ULA": "ULA is optional; use a no-op state when IPv6 is not in scope.",
  "VLAN-SEGMENTATION": "Non-VLAN segmentation models require an explicit imported/design object proving the alternative.",
  "ACCESS-CONTROL-8021X": "NAC alternatives are allowed only with documented identity and edge-enforcement evidence.",
  "LINK-AGGREGATION": "Single uplinks are acceptable when redundancy is not required, but they must not satisfy HA requirements.",
  "WLAN-STANDARDS": "No WLAN rule applies when wireless and guest Wi-Fi are out of scope.",
  "FIREWALL-POLICY": "Policy can be implemented by different platforms, but the trust-boundary and allowed-flow evidence cannot disappear.",
  "ZERO-TRUST-RESOURCE-FOCUS": "Zero-trust language must stay advisory unless identity/resource controls are captured.",
  "MGMT-ISOLATION": "Temporary shared management paths must be marked review-required and cannot be implementation-ready.",
  "GUEST-ISOLATION": "Guest-to-internal exceptions must name business service, destination, logging, and approval evidence.",
  "HIERARCHICAL-SITE-BLOCKS": "Single-site projects may defer site block hierarchy without failing readiness.",
  "GATEWAY-CONSISTENCY": "Custom gateway placement is allowed only with an explicit convention or exception note.",
};

type Phase7Input = {
  requirementsJson?: string | null;
  siteCount: number;
  standardsAlignment: StandardsAlignmentSummary;
  phase3RequirementsClosure: Phase3RequirementsClosureControlSummary;
  networkObjectModel: NetworkObjectModel;
  issues: DesignCoreIssue[];
};

function statusToEnforcementState(status: StandardsRuleStatus, required: boolean): Phase7StandardsEnforcementState {
  if (status === "applied") return "PASS";
  if (status === "violated") return required ? "BLOCK" : "WARN";
  if (status === "review") return "REVIEW_REQUIRED";
  return "NOT_APPLICABLE";
}

function severityFromState(state: Phase7StandardsEnforcementState, required: boolean): Phase7StandardsSeverity {
  if (state === "BLOCK") return "BLOCKING";
  if (state === "REVIEW_REQUIRED") return required ? "REVIEW_REQUIRED" : "WARNING";
  if (state === "WARN") return "WARNING";
  return "INFO";
}

function applicabilityFromStatus(status: StandardsRuleStatus): Phase7StandardsApplicabilityState {
  if (status === "applied" || status === "violated" || status === "review") return "APPLICABLE";
  return "NOT_APPLICABLE";
}

function hasRequirementValue(requirements: Record<string, unknown>, key: string): boolean {
  const value = requirements[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 && !["false", "no", "none", "not applicable", "n/a", "default", "unknown"].includes(normalized);
  }
  return value !== undefined && value !== null;
}

function describeApplicability(ruleId: string, requirements: Record<string, unknown>, siteCount: number): string {
  switch (ruleId) {
    case "ADDR-PRIVATE-IPV4":
      return "Applies to every internal IPv4 plan unless public addressing has been explicitly captured as a reviewed exception.";
    case "ADDR-CIDR-HIERARCHY":
      return siteCount > 1 ? "Applies because multi-site or hierarchical addressing requires summarizable site boundaries." : "Applies as a planning quality check; single-site designs may be less strict.";
    case "WAN-POINT-TO-POINT-31":
      return siteCount > 1 || valueAsBoolean(requirements.dualIsp) ? "Applies when WAN/transit addressing is present or expected." : "Not applicable until WAN/transit scope exists.";
    case "IPV6-ARCHITECTURE":
    case "IPV6-ULA":
      return valueAsBoolean(requirements.ipv6Enabled) || valueAsString(requirements.internetProtocol).toLowerCase().includes("ipv6") ? "Applies because IPv6 was requested or implied." : "Not applicable until IPv6 is enabled.";
    case "VLAN-SEGMENTATION":
      return "Applies when requirements imply segmented enterprise roles such as guest, management, voice, IoT, wireless, or remote access.";
    case "ACCESS-CONTROL-8021X":
      return "Applies when NAC, identity-based edge access, remote access, or management-plane protection is requested.";
    case "LINK-AGGREGATION":
      return "Applies when redundancy, link aggregation, HA, or resilient uplink intent is captured.";
    case "WLAN-STANDARDS":
      return "Applies when wireless or guest Wi-Fi is in scope.";
    case "FIREWALL-POLICY":
      return "Applies whenever differing security zones, guest access, management isolation, remote access, DMZ, or cloud boundaries are in scope.";
    case "ZERO-TRUST-RESOURCE-FOCUS":
      return "Applies when security posture, identity, remote access, or resource access controls justify zero-trust overlay guidance.";
    case "MGMT-ISOLATION":
      return "Applies when management access or management segments are in scope.";
    case "GUEST-ISOLATION":
      return "Applies when guest access or guest Wi-Fi is in scope.";
    case "HIERARCHICAL-SITE-BLOCKS":
      return "Applies strongly in multi-site designs; single-site projects may defer without claiming route summarization.";
    case "GATEWAY-CONSISTENCY":
      return "Applies when subnets/gateways are present and operations needs a consistent convention.";
    default:
      return "Applicability is defined by the standards alignment engine evaluation.";
  }
}

function affectedObjectsForRule(ruleId: string, model: NetworkObjectModel): string[] {
  switch (ruleId) {
    case "VLAN-SEGMENTATION":
      return model.securityZones.map((zone) => zone.id).concat(model.dhcpPools.map((pool) => pool.id)).slice(0, 12);
    case "FIREWALL-POLICY":
    case "ZERO-TRUST-RESOURCE-FOCUS":
    case "GUEST-ISOLATION":
    case "MGMT-ISOLATION":
      return model.securityZones.map((zone) => zone.id).concat(model.policyRules.map((rule) => rule.id)).slice(0, 12);
    case "ADDR-CIDR-HIERARCHY":
    case "HIERARCHICAL-SITE-BLOCKS":
    case "WAN-POINT-TO-POINT-31":
      return model.routeDomains.map((domain) => domain.id).concat(model.routingSegmentation.routeIntents.map((route) => route.id)).slice(0, 12);
    case "GATEWAY-CONSISTENCY":
      return model.interfaces.map((iface) => iface.id).slice(0, 12);
    default:
      return model.devices.map((device) => device.id).slice(0, 8);
  }
}

function buildRequirementActivations(input: Phase7Input, ruleRows: Phase7StandardsRuleRow[]): Phase7StandardsRequirementActivation[] {
  const requirements = parseJsonMap(input.requirementsJson);
  const closureRows = input.phase3RequirementsClosure.closureMatrix ?? [];
  const keys = Array.from(new Set(Object.values(RULE_REQUIREMENT_RELATIONSHIPS).flat())).sort();
  return keys
    .filter((key) => hasRequirementValue(requirements, key) || closureRows.some((row) => row.key === key && row.active))
    .map((key) => {
      const closure = closureRows.find((row) => row.key === key);
      const activated = ruleRows.filter((row) => row.requirementRelationships.includes(key));
      const blockingRuleIds = activated.filter((row) => row.enforcementState === "BLOCK").map((row) => row.ruleId);
      const reviewRuleIds = activated.filter((row) => row.enforcementState === "REVIEW_REQUIRED" || row.enforcementState === "WARN").map((row) => row.ruleId);
      const readinessImpact = blockingRuleIds.length > 0 ? "BLOCKING" : reviewRuleIds.length > 0 ? "REVIEW_REQUIRED" : activated.length > 0 ? "PASSED" : "NOT_APPLICABLE";
      return {
        requirementKey: key,
        requirementValue: valueAsString(requirements[key]) || String(requirements[key] ?? "captured by closure"),
        lifecycleStatus: closure?.lifecycleStatus ?? "CAPTURED_ONLY",
        activatedRuleIds: activated.map((row) => row.ruleId),
        blockingRuleIds,
        reviewRuleIds,
        readinessImpact,
        evidence: activated.length > 0
          ? [`Requirement ${key} activates ${activated.length} standards rule(s).`]
          : [`Requirement ${key} is captured but no active standards rule is mapped yet.`],
      };
    });
}

function findingFromRule(row: Phase7StandardsRuleRow): Phase7StandardsFinding | null {
  if (row.enforcementState === "PASS" || row.enforcementState === "NOT_APPLICABLE") return null;
  return {
    id: `phase7-${row.ruleId.toLowerCase()}`,
    severity: row.severity,
    code: row.enforcementState === "BLOCK" ? "STANDARDS_RULE_BLOCKER" : row.enforcementState === "REVIEW_REQUIRED" ? "STANDARDS_RULE_REVIEW_REQUIRED" : "STANDARDS_RULE_WARNING",
    ruleId: row.ruleId,
    title: `${row.title} requires ${row.enforcementState === "BLOCK" ? "correction" : "review"}`,
    detail: `${row.notes.join(" ")} Remediation: ${row.remediationGuidance}`,
    affectedEngine: row.affectedEngines[0] ?? "standardsAlignment",
    affectedObjectIds: row.affectedObjectIds,
    remediationGuidance: row.remediationGuidance,
    readinessImpact: row.severity,
  };
}

export function buildPhase7StandardsRulebookControl(input: Phase7Input): Phase7StandardsAlignmentRulebookControlSummary {
  const requirements = parseJsonMap(input.requirementsJson);
  const ruleRows: Phase7StandardsRuleRow[] = input.standardsAlignment.evaluations.map((evaluation) => {
    const required = evaluation.strength === "required";
    const enforcementState = statusToEnforcementState(evaluation.status, required);
    const severity = severityFromState(enforcementState, required);
    const requirementRelationships = RULE_REQUIREMENT_RELATIONSHIPS[evaluation.ruleId] ?? [];
    return {
      ruleId: evaluation.ruleId,
      title: evaluation.title,
      authority: evaluation.authority,
      strength: evaluation.strength,
      applicabilityState: applicabilityFromStatus(evaluation.status),
      applicabilityCondition: describeApplicability(evaluation.ruleId, requirements, input.siteCount),
      severity,
      enforcementState,
      affectedEngines: RULE_AFFECTED_ENGINES[evaluation.ruleId] ?? ["Standards alignment"],
      affectedObjectIds: affectedObjectsForRule(evaluation.ruleId, input.networkObjectModel),
      remediationGuidance: RULE_REMEDIATION[evaluation.ruleId] ?? "Review the standards rule, affected object, and requirement relationship before claiming readiness.",
      requirementRelationships,
      exceptionPolicy: RULE_EXCEPTION_POLICY[evaluation.ruleId] ?? "Exceptions must be explicitly documented and review-gated.",
      evidence: evaluation.notes,
      notes: evaluation.notes,
    };
  });

  const requirementActivations = buildRequirementActivations(input, ruleRows);
  const findings = ruleRows.map(findingFromRule).filter((item): item is Phase7StandardsFinding => Boolean(item));
  const blockingRuleCount = ruleRows.filter((row) => row.enforcementState === "BLOCK").length;
  const reviewRuleCount = ruleRows.filter((row) => row.enforcementState === "REVIEW_REQUIRED").length;
  const warningRuleCount = ruleRows.filter((row) => row.enforcementState === "WARN").length;
  const passRuleCount = ruleRows.filter((row) => row.enforcementState === "PASS").length;
  const notApplicableRuleCount = ruleRows.filter((row) => row.enforcementState === "NOT_APPLICABLE").length;
  const requirementActivatedRuleCount = Array.from(new Set(requirementActivations.flatMap((item) => item.activatedRuleIds))).length;
  const exceptionRequiredRuleCount = ruleRows.filter((row) => row.enforcementState !== "PASS" && row.enforcementState !== "NOT_APPLICABLE").length;
  const overallReadiness = blockingRuleCount > 0 ? "BLOCKED" : reviewRuleCount + warningRuleCount > 0 ? "REVIEW_REQUIRED" : "READY";

  return {
    contractVersion: PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT,
    rulebookRole: "ACTIVE_STANDARDS_RULEBOOK_NOT_DECORATIVE_TEXT",
    ruleCount: ruleRows.length,
    applicableRuleCount: ruleRows.filter((row) => row.applicabilityState === "APPLICABLE").length,
    passRuleCount,
    warningRuleCount,
    reviewRuleCount,
    blockingRuleCount,
    notApplicableRuleCount,
    requirementActivatedRuleCount,
    exceptionRequiredRuleCount,
    overallReadiness,
    ruleRows,
    requirementActivations,
    findings,
    notes: [
      "PHASE7_STANDARDS_ALIGNMENT_RULEBOOK_CONTRACT turns standards into active applicability, severity, remediation, exception, and requirement-relationship evidence.",
      "Formal standards and best practices are not treated the same: required violations can block readiness, while advisory best-practice misses remain review/warning unless the requirement makes them critical.",
      "Standards findings feed validation/readiness; frontend/report/diagram consumers may display them but must not invent standards status independently.",
    ],
  };
}
