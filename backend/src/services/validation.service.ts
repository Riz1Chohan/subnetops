import type { EntityType, ValidationSeverity } from "../lib/domainTypes.js";
import { prisma } from "../db/prisma.js";
import {
  canonicalCidr,
  cidrsOverlap,
  classifySegmentRole,
  describeRange,
  describeSubnet,
  isValidIpv4,
  parseCidr,
  recommendedPrefixForHosts,
  usableHostCount,
  validateGatewayForSubnet,
  type SegmentRole,
} from "../lib/cidr.js";
import { buildDesignCoreSnapshot } from "./designCore.service.js";
import { ensureRequirementsMaterializedForRead } from "./requirementsMaterialization.service.js";

function normalizeValidationSegmentRole(value?: string | null): SegmentRole | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "USERS") return "USER";
  if (normalized === "SERVERS") return "SERVER";
  if (normalized === "MGMT") return "MANAGEMENT";
  if (normalized === "TRANSIT") return "WAN_TRANSIT";
  if (["USER", "SERVER", "GUEST", "MANAGEMENT", "DMZ", "VOICE", "PRINTER", "IOT", "CAMERA", "WAN_TRANSIT", "LOOPBACK", "OTHER"].includes(normalized)) return normalized as SegmentRole;
  return null;
}

function resolveValidationSegmentRole(vlan: { segmentRole?: string | null; purpose?: string | null; vlanName: string; department?: string | null; notes?: string | null }): SegmentRole {
  const explicitRole = normalizeValidationSegmentRole(vlan.segmentRole);
  if (explicitRole) return explicitRole;
  return classifySegmentRole(`${vlan.purpose || ""} ${vlan.vlanName} ${vlan.department || ""} ${vlan.notes || ""}`);
}

interface ValidationItem {
  projectId: string;
  severity: ValidationSeverity;
  ruleCode: string;
  title: string;
  message: string;
  entityType: EntityType;
  entityId?: string;
}

interface ValidationNarrative {
  issue: string;
  impact: string;
  recommendation: string;
}

const validationGuidanceByRuleCode: Record<string, Partial<ValidationNarrative>> = {
  REQ_SITE_COUNT_NOT_MATERIALIZED: {
    impact: "The requirements stage captured site scope, but the engineering model has no site objects, so addressing, WAN, diagram, and report outputs are not trustworthy.",
    recommendation: "Run the requirements materializer from the save path and confirm the selected site count creates durable Site rows.",
  },
  REQ_SITE_COUNT_UNDER_MATERIALIZED: {
    impact: "The generated design covers fewer sites than the requirement, which under-scopes addressing, topology, routing, and implementation planning.",
    recommendation: "Fix materialization so the saved site count and generated Site rows match, then rerun validation.",
  },
  REQ_NO_SEGMENTS_MATERIALIZED: {
    impact: "A network plan without VLAN or segment rows cannot be sized, routed, secured, diagrammed, or exported honestly.",
    recommendation: "Materialize requirement-driven access, guest, management, services, and specialty segments before validation can pass.",
  },
  REQ_USER_SEGMENT_MISSING: {
    impact: "User population has no subnet or gateway consequence, so capacity calculations are not connected to requirements.",
    recommendation: "Create user access segments from usersPerSite and feed them through the authoritative allocator.",
  },
  REQ_GUEST_SEGMENT_MISSING: {
    impact: "Guest access without a guest segment cannot enforce isolation or internet-only behavior.",
    recommendation: "Create guest VLAN/zone/policy evidence when guest Wi-Fi is selected.",
  },
  REQ_MANAGEMENT_SEGMENT_MISSING: {
    impact: "Management-plane access cannot be scoped or protected without a dedicated management segment.",
    recommendation: "Create a management VLAN/zone and admin-plane policy evidence when management is selected.",
  },
  REQ_PRINTER_SEGMENT_MISSING: {
    impact: "Shared devices may be incorrectly blended into user access, weakening segmentation and policy clarity.",
    recommendation: "Create a printer or shared-device segment when printer requirements are selected.",
  },
  REQ_IOT_SEGMENT_MISSING: {
    impact: "IoT devices are high-risk shared devices; missing segment evidence undermines security posture.",
    recommendation: "Create an IoT/specialty segment or explicitly mark IoT as not applicable when count and selection are zero.",
  },
  REQ_CAMERA_SEGMENT_MISSING: {
    impact: "Camera/security systems need explicit placement and restrictions; missing segment evidence hides implementation risk.",
    recommendation: "Create camera/security-device segment evidence when cameras are selected or counted.",
  },
  REQ_VOICE_SEGMENT_MISSING: {
    impact: "Voice requirements have no VLAN/QoS consequence, so access-edge and service-quality planning are incomplete.",
    recommendation: "Create a voice segment only when voice is selected or phone count is positive, then map QoS review evidence.",
  },
  REQ_WIRELESS_SEGMENT_MAPPING_MISSING: {
    impact: "SSID planning without access segments cannot be mapped to VLANs, trust zones, or policies.",
    recommendation: "Map wireless requirements to staff/user and guest segments before diagram and report outputs are trusted.",
  },
  REQ_ADDRESS_ROWS_MISSING: {
    impact: "Segments exist without authoritative CIDR/gateway rows, so Engine 1 is not driving implementation evidence.",
    recommendation: "Ensure saved VLANs are consumed by design-core addressing rows and rerun validation.",
  },
  REQ_TOPOLOGY_OBJECTS_MISSING: {
    impact: "Sites without devices/interfaces cannot produce a usable diagram, routing model, or implementation handoff.",
    recommendation: "Generate at least planned topology objects from materialized sites and segments.",
  },
  REQ_MULTISITE_LINKS_MISSING: {
    impact: "A multi-site design without WAN/site links is not a network topology.",
    recommendation: "Create planned site-to-site/WAN link evidence when the requirement scope is multi-site.",
  },
  REQ_MULTISITE_ROUTING_MISSING: {
    impact: "Inter-site reachability cannot be reviewed when no route intent exists.",
    recommendation: "Generate connected/default/summary route intent for materialized multi-site designs.",
  },
  REQ_REMOTE_ACCESS_CONSEQUENCE_MISSING: {
    impact: "Remote access remains unsecured report text instead of a reviewable boundary or policy consequence.",
    recommendation: "Create VPN/remote-access edge policy and zone evidence from remote access requirements.",
  },
  REQ_CLOUD_BOUNDARY_MISSING: {
    impact: "Cloud/hybrid scope has no network boundary, route, or policy evidence, so hybrid design claims are unsupported.",
    recommendation: "Create cloud edge, site-to-cloud routing, and policy review evidence from cloud requirements.",
  },
  REQ_SECURITY_FLOWS_MISSING: {
    impact: "Security/segmentation selections produced no flow requirements, which makes the security design hollow.",
    recommendation: "Generate vendor-neutral allow/deny/review flow requirements for guest, management, remote, cloud, and shared-device boundaries.",
  },
  REQ_OPERATIONS_EVIDENCE_MISSING: {
    impact: "Monitoring, logging, backup, or ownership requirements are visible in the form but weak in engineering outputs.",
    recommendation: "Expose operations-plane review evidence in policy, implementation, and report sections.",
  },
  REQ_SCENARIO_PROOF_ZERO_PASS: {
    impact: "The requirement scenario proof layer says the selected design drivers failed, so validation cannot honestly call the project clean.",
    recommendation: "Fix the missing materialized objects and rerun scenario proof until at least the relevant selected drivers pass or produce targeted blockers.",
  },
  SITE_SUMMARY_MISSING: {
    impact: "Routing summaries, growth planning, and implementation review become weaker when the site boundary is not explicitly confirmed.",
    recommendation: "Add or confirm the site's parent address block before using the design package for implementation planning.",
  },
  SITE_SUMMARY_REVIEW: {
    impact: "A weak or oversized site summary can create route sprawl, wasted address space, or unclear site ownership.",
    recommendation: "Review the site summary against the actual VLAN list, expected growth, and WAN routing plan.",
  },
  ROUTING_SUMMARIZATION_BLOCKED: {
    impact: "Blocked summarization can make WAN routing harder to operate and can hide addressing mistakes until implementation.",
    recommendation: "Correct the site block or subnet boundary issues before treating route summaries as review-ready.",
  },
  INVALID_SITE_BLOCK: {
    impact: "Invalid site blocks prevent reliable subnet containment checks and can break downstream addressing recommendations.",
    recommendation: "Replace the site block with valid CIDR notation such as 10.10.0.0/20.",
  },
  INVALID_CIDR: {
    impact: "Invalid subnet notation prevents capacity, gateway, overlap, and routing checks from being trusted.",
    recommendation: "Enter a valid CIDR block using the true network address and prefix length.",
  },
  INVALID_GATEWAY_IP: {
    impact: "A bad gateway value can cause failed client onboarding, broken routing, and misleading implementation documents.",
    recommendation: "Replace the gateway with a valid IPv4 address inside the VLAN subnet.",
  },
  NONCANONICAL_CIDR: {
    impact: "Non-canonical subnet notation confuses engineers and can cause wrong summaries or duplicate-looking networks.",
    recommendation: "Store the subnet using the true network address for the selected prefix.",
  },
  SUBNET_OUTSIDE_SITE_BLOCK: {
    impact: "A subnet outside its parent site block breaks summarization and makes site ownership unclear.",
    recommendation: "Move the subnet into the site's assigned block or adjust the site block after review.",
  },
  SLASH31_NONTRANSIT: {
    impact: "A /31 is normally a point-to-point transit pattern; using it for access segments can leave no room for normal hosts.",
    recommendation: "Use /31 only for WAN transit or mark the segment correctly; otherwise choose a larger access subnet.",
  },
  SLASH32_NONLOOPBACK: {
    impact: "A /32 is normally a loopback or host route, not a usable VLAN segment for clients.",
    recommendation: "Use /32 only for loopbacks or host routes; otherwise assign a subnet with usable host capacity.",
  },
  GATEWAY_OUTSIDE_SUBNET: {
    impact: "Devices in the subnet will not be able to use a gateway that lives outside their Layer 3 segment.",
    recommendation: "Choose a gateway address inside the subnet's usable host range.",
  },
  GATEWAY_IS_NETWORK_ADDRESS: {
    impact: "The network address identifies the subnet itself and cannot be used as a normal gateway on LAN segments.",
    recommendation: "Use a usable host address, commonly the first usable or last usable address.",
  },
  GATEWAY_IS_BROADCAST_ADDRESS: {
    impact: "The broadcast address is reserved for the subnet and cannot be used as a normal gateway.",
    recommendation: "Use a usable host address, commonly the first usable or last usable address.",
  },
  INSUFFICIENT_HOST_CAPACITY: {
    impact: "Host demand exceeds subnet capacity, which can cause address exhaustion and failed device onboarding.",
    recommendation: "Increase the subnet size or reduce the declared host count before implementation review.",
  },
  HOST_CAPACITY_NEAR_LIMIT: {
    impact: "The subnet may work on day one but has limited growth room and can fail during onboarding or expansion.",
    recommendation: "Review the growth buffer and consider a larger prefix before finalizing the addressing plan.",
  },
  RIGHTSIZE_RECOMMENDATION: {
    impact: "Overly large subnets can waste address space and make route summarization less clean.",
    recommendation: "Consider a tighter prefix if the segment is unlikely to grow significantly.",
  },
  NONSTANDARD_GATEWAY_PATTERN: {
    impact: "A custom gateway convention can slow troubleshooting if it is not intentional and documented.",
    recommendation: "Standardize on a project-wide gateway convention or document why this segment is different.",
  },
  GATEWAY_CONVENTION_REVIEW: {
    impact: "Inconsistent gateway placement can make operations and troubleshooting harder over time.",
    recommendation: "Confirm whether the project should use a first-usable, last-usable, or documented custom gateway pattern.",
  },
  OVERLAPPING_SUBNETS: {
    impact: "Overlapping subnets can break routing, firewall policy, DHCP scopes, and site-to-site reachability.",
    recommendation: "Assign non-overlapping subnet ranges and rerun validation.",
  },
  IPAM_DURABLE_AUTHORITY_BLOCKED: {
    impact: "Engine 1 planned addressing is not safe to implement while Engine 2 durable IPAM reports a blocker such as brownfield overlap, stale approval, reserved pool breach, DHCP conflict, or reservation conflict.",
    recommendation: "Resolve the Engine 2 IPAM blocker, update the durable allocation/approval/ledger state, and rerun validation before implementation handoff.",
  },
  IPAM_DURABLE_AUTHORITY_REVIEW_REQUIRED: {
    impact: "The subnet may be mathematically valid, but it is not durable IPAM authority yet. Treating it as ready would create split-brain addressing risk.",
    recommendation: "Materialize the Engine 1 plan row into Engine 2, record approval or review state, and clear any DHCP/reservation/brownfield review notes.",
  },
  IPAM_REQUIREMENT_PROPAGATION_GAP: {
    impact: "A requirement-driven address need exists, but Engine 2 has not proven durable pool/allocation ownership or has recorded review gaps.",
    recommendation: "Use the Phase 5 requirement-to-IPAM matrix to materialize, approve, or explicitly review the affected IPAM objects.",
  },
  VALIDATION_PASSED: {
    impact: "No current blocker was detected by the saved validation checks, but this is not a live-network discovery result.",
    recommendation: "Continue engineer review against live inventory, business policy, and vendor implementation requirements.",
  },
};

function normalizeValidationText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripStructuredPrefixes(message: string) {
  return message
    .replace(/^Issue:\s*/i, "")
    .replace(/\s+Impact:\s+.*$/i, "")
    .replace(/\s+Recommendation:\s+.*$/i, "")
    .trim();
}

function fallbackImpact(severity: ValidationSeverity) {
  if (severity === "ERROR") return "This can create an implementation blocker or cause the generated design package to mislead reviewers.";
  if (severity === "WARNING") return "This may not stop the design, but it creates review debt that should be resolved or accepted explicitly.";
  return "This does not appear fatal, but it is still useful context for engineering review.";
}

function fallbackRecommendation(severity: ValidationSeverity) {
  if (severity === "ERROR") return "Correct the input, rerun validation, and confirm the finding clears before implementation handoff.";
  if (severity === "WARNING") return "Review the item, document the decision, and adjust the design if the warning is not intentional.";
  return "Review and document the item if it affects the final design basis.";
}

function buildValidationNarrative(item: ValidationItem): ValidationNarrative {
  const guidance = validationGuidanceByRuleCode[item.ruleCode] ?? {};
  const rawIssue = (guidance.issue ?? stripStructuredPrefixes(item.message)) || item.title;
  return {
    issue: normalizeValidationText(rawIssue),
    impact: normalizeValidationText(guidance.impact ?? fallbackImpact(item.severity)),
    recommendation: normalizeValidationText(guidance.recommendation ?? fallbackRecommendation(item.severity)),
  };
}

function composeValidationMessage(narrative: ValidationNarrative) {
  return `Issue: ${narrative.issue} Impact: ${narrative.impact} Recommendation: ${narrative.recommendation}`;
}

function makeItem(item: ValidationItem): ValidationItem {
  const narrative = buildValidationNarrative(item);
  return {
    ...item,
    message: composeValidationMessage(narrative),
  };
}


type RequirementInputMap = Record<string, unknown>;

type RequirementOutputEvidence = {
  siteCount: number;
  vlanCount: number;
  addressRowCount: number;
  deviceCount: number;
  interfaceCount: number;
  linkCount: number;
  routeIntentCount: number;
  policyRuleCount: number;
  securityFlowRequirementCount: number;
  securityZoneText: string;
  routeText: string;
  policyText: string;
  topologyText: string;
};

function parseRequirementsJson(requirementsJson?: string | null): RequirementInputMap {
  if (!requirementsJson) return {};
  try {
    const parsed = JSON.parse(requirementsJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as RequirementInputMap : {};
  } catch {
    return {};
  }
}

function hasRequirementValue(requirements: RequirementInputMap, key: string) {
  if (!Object.prototype.hasOwnProperty.call(requirements, key)) return false;
  const value = requirements[key];
  if (value === null || typeof value === "undefined") return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function requirementString(requirements: RequirementInputMap, key: string) {
  const value = requirements[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function requirementTextIncludes(requirements: RequirementInputMap, keys: string[], patterns: string[]) {
  const text = keys.map((key) => requirementString(requirements, key).toLowerCase()).join(" ");
  return patterns.some((pattern) => text.includes(pattern));
}

function requirementBoolean(requirements: RequirementInputMap, key: string) {
  const value = requirements[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "required", "enabled", "selected", "1"].includes(normalized)) return true;
    if (["false", "no", "n", "not required", "disabled", "0", "none"].includes(normalized)) return false;
  }
  return false;
}

function requirementNumber(requirements: RequirementInputMap, key: string) {
  const value = requirements[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function isRequirementsDrivenProject(requirements: RequirementInputMap) {
  return Object.keys(requirements).some((key) => hasRequirementValue(requirements, key));
}

function normalizeOutputText(value: unknown): string {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(normalizeOutputText).join(" ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(normalizeOutputText).join(" ");
  return "";
}

function buildRequirementOutputEvidence(project: { sites: Array<{ vlans: Array<{ segmentRole?: string | null; purpose?: string | null; vlanName: string; department?: string | null; notes?: string | null }> }> }, designSnapshot: ReturnType<typeof buildDesignCoreSnapshot> | null): RequirementOutputEvidence {
  const vlanCount = project.sites.reduce((total, site) => total + site.vlans.length, 0);
  const networkObjectModel = designSnapshot?.networkObjectModel;
  return {
    siteCount: project.sites.length,
    vlanCount,
    addressRowCount: designSnapshot?.addressingRows.length ?? 0,
    deviceCount: networkObjectModel?.devices.length ?? 0,
    interfaceCount: networkObjectModel?.interfaces.length ?? 0,
    linkCount: networkObjectModel?.links.length ?? 0,
    routeIntentCount: designSnapshot?.summary.routeIntentCount ?? 0,
    policyRuleCount: networkObjectModel?.policyRules.length ?? 0,
    securityFlowRequirementCount: designSnapshot?.summary.securityFlowRequirementCount ?? 0,
    securityZoneText: normalizeOutputText(networkObjectModel?.securityZones ?? []),
    routeText: normalizeOutputText([designSnapshot?.routingIntent, designSnapshot?.routeDomain, designSnapshot?.wanPlan, designSnapshot?.transitPlan, networkObjectModel?.routeDomains, networkObjectModel?.links]),
    policyText: normalizeOutputText([designSnapshot?.securityIntent, designSnapshot?.policyConsequences, networkObjectModel?.policyRules, designSnapshot?.requirementsScenarioProof]),
    topologyText: normalizeOutputText([networkObjectModel?.devices, networkObjectModel?.interfaces, networkObjectModel?.links, designSnapshot?.diagramTruth, designSnapshot?.reportTruth]),
  };
}

function roleExists(project: { sites: Array<{ vlans: Array<{ segmentRole?: string | null; purpose?: string | null; vlanName: string; department?: string | null; notes?: string | null }> }> }, roles: SegmentRole[]) {
  return project.sites.some((site) => site.vlans.some((vlan) => roles.includes(resolveValidationSegmentRole(vlan))));
}

function outputTextHas(text: string, patterns: string[]) {
  const normalized = text.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

function addRequirementHonestyIssue(results: ValidationItem[], item: Omit<ValidationItem, "projectId" | "entityType" | "entityId"> & { projectId: string; entityId?: string }) {
  results.push(makeItem({
    projectId: item.projectId,
    severity: item.severity,
    ruleCode: item.ruleCode,
    title: item.title,
    message: item.message,
    entityType: "PROJECT",
    entityId: item.entityId ?? item.projectId,
  }));
}

function addRequirementsHonestyValidation(
  results: ValidationItem[],
  projectId: string,
  project: { requirementsJson?: string | null; sites: Array<{ vlans: Array<{ segmentRole?: string | null; purpose?: string | null; vlanName: string; department?: string | null; notes?: string | null }> }> },
  designSnapshot: ReturnType<typeof buildDesignCoreSnapshot> | null,
) {
  const requirements = parseRequirementsJson(project.requirementsJson);
  if (!isRequirementsDrivenProject(requirements)) return;

  const evidence = buildRequirementOutputEvidence(project, designSnapshot);
  const selectedSiteCount = requirementNumber(requirements, "siteCount");
  const usersPerSite = requirementNumber(requirements, "usersPerSite");
  const multiSiteSelected = selectedSiteCount > 1 || requirementTextIncludes(requirements, ["planningFor", "internetModel", "interSiteTrafficModel"], ["multi", "branch", "site-to-site", "wan"]);
  const segmentationSelected = requirementTextIncludes(requirements, ["primaryGoal", "securityPosture", "trustBoundaryModel"], ["security", "segment", "zero trust", "restricted", "least privilege", "zone"]);
  const cloudSelected = requirementBoolean(requirements, "cloudConnected") || requirementTextIncludes(requirements, ["environmentType", "cloudProvider", "cloudConnectivity", "cloudNetworkModel", "cloudRoutingModel", "cloudTrafficBoundary"], ["cloud", "hybrid", "azure", "aws", "gcp", "vnet", "vpc", "vpn", "private"]);
  const operationsSelected = requirementTextIncludes(requirements, ["monitoringModel", "loggingModel", "backupPolicy", "operationsOwnerModel", "managementIpPolicy"], ["monitor", "logging", "syslog", "backup", "owner", "management"]);

  if (selectedSiteCount > 0 && evidence.siteCount === 0) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_SITE_COUNT_NOT_MATERIALIZED",
      title: "Requirements selected sites but no Site rows exist",
      message: `Requirement siteCount is ${selectedSiteCount}, but the saved project has 0 Site rows. Save Requirements must materialize site records before the design can be trusted.`,
    });
  } else if (selectedSiteCount > 0 && evidence.siteCount < selectedSiteCount) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_SITE_COUNT_UNDER_MATERIALIZED",
      title: "Requirements selected more sites than the design contains",
      message: `Requirement siteCount is ${selectedSiteCount}, but only ${evidence.siteCount} Site row(s) exist. The generated topology/addressing scope is incomplete.`,
    });
  }

  if ((selectedSiteCount > 0 || usersPerSite > 0) && evidence.vlanCount === 0) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_NO_SEGMENTS_MATERIALIZED",
      title: "Requirements require segments but no VLAN/segment rows exist",
      message: "Site/user requirements were captured, but no VLAN or segment rows were materialized. An empty segment table must never validate as clean.",
    });
  }

  if (usersPerSite > 0 && !roleExists(project, ["USER"])) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_USER_SEGMENT_MISSING",
      title: "Users per site did not create a user access segment",
      message: `Requirement usersPerSite is ${usersPerSite}, but no USER segment exists. User population must drive access VLAN demand and subnet sizing.`,
    });
  }

  if (requirementBoolean(requirements, "guestWifi") && !roleExists(project, ["GUEST"])) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_GUEST_SEGMENT_MISSING",
      title: "Guest Wi-Fi requirement did not create a guest segment",
      message: "guestWifi is selected, but no GUEST VLAN/segment exists. Guest access must create an isolated guest segment before policy or diagram output can be trusted.",
    });
  }

  if (requirementBoolean(requirements, "management") && !roleExists(project, ["MANAGEMENT"])) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_MANAGEMENT_SEGMENT_MISSING",
      title: "Management requirement did not create a management segment",
      message: "management is selected, but no MANAGEMENT VLAN/segment exists. Admin-plane access cannot be validated without a management segment.",
    });
  }

  if (requirementBoolean(requirements, "printers") && !roleExists(project, ["PRINTER"])) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_PRINTER_SEGMENT_MISSING",
      title: "Printer requirement did not create a printer/shared-device segment",
      message: "printers is selected, but no PRINTER segment exists. Shared-device networks must not disappear into report text.",
    });
  }

  if ((requirementBoolean(requirements, "iot") || requirementNumber(requirements, "iotDeviceCount") > 0) && !roleExists(project, ["IOT"])) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_IOT_SEGMENT_MISSING",
      title: "IoT requirement did not create an IoT segment",
      message: "IoT requirements were selected or counted, but no IOT segment exists. IoT devices require explicit isolation evidence.",
    });
  }

  if ((requirementBoolean(requirements, "cameras") || requirementNumber(requirements, "cameraCount") > 0) && !roleExists(project, ["CAMERA"])) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_CAMERA_SEGMENT_MISSING",
      title: "Camera/security device requirement did not create a camera segment",
      message: "Camera/security device requirements were selected or counted, but no CAMERA segment exists. Surveillance/security devices require explicit segment evidence.",
    });
  }

  if ((requirementBoolean(requirements, "voice") || requirementNumber(requirements, "phoneCount") > 0) && !roleExists(project, ["VOICE"])) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_VOICE_SEGMENT_MISSING",
      title: "Voice requirement did not create a voice segment",
      message: "Voice is selected or phone count is positive, but no VOICE segment exists. Voice requirements must drive voice VLAN/QoS evidence.",
    });
  }

  if (requirementBoolean(requirements, "wireless") && !roleExists(project, ["USER", "GUEST"])) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_WIRELESS_SEGMENT_MAPPING_MISSING",
      title: "Wireless requirement has no access segment mapping",
      message: "wireless is selected, but no USER or GUEST segment exists for SSID/access mapping. Wireless intent must map to real access segments.",
    });
  }

  if (evidence.vlanCount > 0 && evidence.addressRowCount === 0) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_ADDRESS_ROWS_MISSING",
      title: "Segments exist but no addressing rows were generated",
      message: `${evidence.vlanCount} VLAN/segment row(s) exist, but design-core produced 0 addressing rows. Engine 1/addressing output is not connected to the saved segments.`,
    });
  }

  if (evidence.siteCount > 0 && (evidence.deviceCount === 0 || evidence.interfaceCount === 0)) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_TOPOLOGY_OBJECTS_MISSING",
      title: "Sites exist but topology objects are missing",
      message: `${evidence.siteCount} Site row(s) exist, but the backend model has ${evidence.deviceCount} device(s) and ${evidence.interfaceCount} interface(s). A planned network needs topology objects before the diagram/report can be trusted.`,
    });
  }

  if (multiSiteSelected && evidence.siteCount > 1 && evidence.linkCount === 0) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_MULTISITE_LINKS_MISSING",
      title: "Multi-site requirement has no site-to-site link model",
      message: "The requirements indicate multi-site/WAN scope, but the backend topology has 0 links. Multi-site designs require at least planned WAN/site relationship evidence.",
    });
  }

  if (multiSiteSelected && evidence.routeIntentCount === 0 && evidence.siteCount > 1) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_MULTISITE_ROUTING_MISSING",
      title: "Multi-site requirement has no routing intent",
      message: "The requirements indicate multi-site/WAN scope, but design-core has 0 route intent rows. Inter-site reachability cannot be validated from empty routing output.",
    });
  }

  if (requirementBoolean(requirements, "remoteAccess") && !outputTextHas(`${evidence.policyText} ${evidence.securityZoneText}`, ["remote", "vpn", "access edge", "dmz"])) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_REMOTE_ACCESS_CONSEQUENCE_MISSING",
      title: "Remote access requirement has no security consequence",
      message: "remoteAccess is selected, but no remote/VPN/security-edge policy or zone evidence was found. Remote access must not remain a report-only note.",
    });
  }

  if (cloudSelected && !outputTextHas(`${evidence.routeText} ${evidence.policyText} ${evidence.securityZoneText}`, ["cloud", "azure", "aws", "gcp", "vnet", "vpc", "site-to-cloud", "cloud edge"])) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_CLOUD_BOUNDARY_MISSING",
      title: "Cloud/hybrid requirement has no cloud boundary evidence",
      message: "Cloud/hybrid requirements were captured, but no cloud/WAN boundary, route, or policy evidence was found in design-core.",
    });
  }

  if ((requirementBoolean(requirements, "guestWifi") || requirementBoolean(requirements, "management") || requirementBoolean(requirements, "remoteAccess") || segmentationSelected) && evidence.policyRuleCount === 0 && evidence.securityFlowRequirementCount === 0) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_SECURITY_FLOWS_MISSING",
      title: "Security requirements produced no policy or flow requirements",
      message: "Security/segmentation requirements are selected, but design-core has 0 policy rules and 0 security-flow requirements. This is not a valid security design output.",
    });
  }

  if (operationsSelected && !outputTextHas(evidence.policyText, ["monitor", "logging", "backup", "operations", "syslog", "management-plane"])) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "WARNING",
      ruleCode: "REQ_OPERATIONS_EVIDENCE_MISSING",
      title: "Operations requirements have weak design evidence",
      message: "Monitoring/logging/backup/operations requirements were captured, but no operations-plane policy or review evidence was found.",
    });
  }

  if (designSnapshot?.requirementsScenarioProof?.signals?.length && designSnapshot.requirementsScenarioProof.signals.every((signal) => !signal.passed && signal.severity === "blocker")) {
    addRequirementHonestyIssue(results, {
      projectId,
      severity: "ERROR",
      ruleCode: "REQ_SCENARIO_PROOF_ZERO_PASS",
      title: "Requirement scenario proof has zero passing signals",
      message: "Requirement scenario proof is fully blocked. Validation must not report a clean state while every major requirement scenario signal is failing.",
    });
  }
}

function parseStructuredValidationMessage(message: string, ruleCode: string, title: string, severity: ValidationSeverity): ValidationNarrative {
  const match = message.match(/^Issue:\s*(.*?)\s+Impact:\s*(.*?)\s+Recommendation:\s*(.*)$/i);
  if (match) {
    return {
      issue: normalizeValidationText(match[1] || title),
      impact: normalizeValidationText(match[2] || fallbackImpact(severity)),
      recommendation: normalizeValidationText(match[3] || fallbackRecommendation(severity)),
    };
  }

  return buildValidationNarrative({
    projectId: "",
    severity,
    ruleCode,
    title,
    message,
    entityType: "PROJECT",
  });
}

function enrichValidationResult<T extends { message: string; ruleCode: string; title: string; severity: ValidationSeverity }>(item: T) {
  const narrative = parseStructuredValidationMessage(item.message, item.ruleCode, item.title, item.severity);
  return {
    ...item,
    issue: narrative.issue,
    impact: narrative.impact,
    recommendation: narrative.recommendation,
  };
}

export async function runValidation(projectId: string) {
  await ensureRequirementsMaterializedForRead(projectId, "SubnetOps validation", "validation-read");
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sites: {
        include: {
          vlans: {
            orderBy: { vlanId: "asc" },
          },
        },
      },
    },
  });

  if (!project) {
    return [];
  }

  const results: ValidationItem[] = [];
  const parsedVlans: Array<{
    id: string;
    siteId: string;
    siteName: string;
    siteBlock?: string | null;
    vlanId: number;
    vlanName: string;
    role: SegmentRole;
    parsed: ReturnType<typeof parseCidr>;
  }> = [];



  const designSnapshot = buildDesignCoreSnapshot(project);
  if (designSnapshot) {
    for (const review of designSnapshot.siteSummaries) {
      if (review.status === "missing") {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "SITE_SUMMARY_MISSING",
            title: `Missing site summary review on ${review.siteName}`,
            message: review.notes.join(" ") || `${review.siteName} does not yet have a confirmed site summary block.`,
            entityType: "SITE",
            entityId: review.siteId,
          }),
        );
      } else if (review.status === "review") {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "SITE_SUMMARY_REVIEW",
            title: `Site summarization should be reviewed on ${review.siteName}`,
            message: review.notes.join(" ") || `${review.siteName} has a site summary that should be reviewed.`,
            entityType: "SITE",
            entityId: review.siteId,
          }),
        );
      }
    }

    if (designSnapshot.routingIntent.summarizationReadiness === "blocked") {
      results.push(
        makeItem({
          projectId,
          severity: "WARNING",
          ruleCode: "ROUTING_SUMMARIZATION_BLOCKED",
          title: "Routing summarization is blocked by boundary issues",
          message: designSnapshot.routingIntent.notes.join(" ") || "At least one site summary boundary still blocks clean routing summarization.",
          entityType: "PROJECT",
          entityId: projectId,
        }),
      );
    }
  }



  for (const site of project.sites) {
    const parsedSiteBlock = site.defaultAddressBlock ? (() => {
      try {
        return parseCidr(site.defaultAddressBlock);
      } catch {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "INVALID_SITE_BLOCK",
            title: `Invalid site block on ${site.name}`,
            message: `${site.name} has a default address block of ${site.defaultAddressBlock}, but that value is not valid CIDR notation.`,
            entityType: "SITE",
            entityId: site.id,
          }),
        );
        return null;
      }
    })() : null;

    for (const vlan of site.vlans) {
      const role = resolveValidationSegmentRole(vlan);
      let parsedCidr: ReturnType<typeof parseCidr> | null = null;

      try {
        parsedCidr = parseCidr(vlan.subnetCidr);
        parsedVlans.push({
          id: vlan.id,
          siteId: site.id,
          siteName: site.name,
          siteBlock: site.defaultAddressBlock,
          vlanId: vlan.vlanId,
          vlanName: vlan.vlanName,
          role,
          parsed: parsedCidr,
        });
      } catch {
        results.push(
          makeItem({
            projectId,
            severity: "ERROR",
            ruleCode: "INVALID_CIDR",
            title: `Invalid CIDR on VLAN ${vlan.vlanId}`,
            message: `VLAN ${vlan.vlanName} at ${site.name} uses an invalid subnet value: ${vlan.subnetCidr}.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }

      if (!isValidIpv4(vlan.gatewayIp)) {
        results.push(
          makeItem({
            projectId,
            severity: "ERROR",
            ruleCode: "INVALID_GATEWAY_IP",
            title: `Invalid gateway on VLAN ${vlan.vlanId}`,
            message: `VLAN ${vlan.vlanName} at ${site.name} uses an invalid gateway IP: ${vlan.gatewayIp}.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
        continue;
      }

      if (!parsedCidr) {
        continue;
      }

      const canonical = canonicalCidr(vlan.subnetCidr);
      const subnetFacts = describeSubnet(parsedCidr, role);

      if (canonical !== vlan.subnetCidr) {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "NONCANONICAL_CIDR",
            title: `CIDR should be written on its network boundary for VLAN ${vlan.vlanId}`,
            message: `${vlan.subnetCidr} resolves to the canonical network block ${canonical}. Store the subnet using the true network address to reduce confusion and improve summarization.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }

      if (parsedSiteBlock) {
        if (parsedCidr.network < parsedSiteBlock.network || parsedCidr.broadcast > parsedSiteBlock.broadcast) {
          results.push(
            makeItem({
              projectId,
              severity: "ERROR",
              ruleCode: "SUBNET_OUTSIDE_SITE_BLOCK",
              title: `Subnet falls outside the site block on VLAN ${vlan.vlanId}`,
              message: `${vlan.subnetCidr} does not fit inside ${site.name}'s default block ${site.defaultAddressBlock}. Subnets should remain inside the parent site allocation.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        }
      }

      if (parsedCidr.prefix === 31 && role !== "WAN_TRANSIT") {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "SLASH31_NONTRANSIT",
            title: `Review /31 usage on VLAN ${vlan.vlanId}`,
            message: `${vlan.subnetCidr} is a /31. That is realistic for point-to-point WAN transit links, but unusual for a user or access VLAN. Consider a larger subnet or mark this segment as WAN transit.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }

      if (parsedCidr.prefix === 32 && role !== "LOOPBACK") {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "SLASH32_NONLOOPBACK",
            title: `Review /32 usage on VLAN ${vlan.vlanId}`,
            message: `${vlan.subnetCidr} is a /32. That is typically used for a loopback or host route, not a normal VLAN segment.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }

      const gatewayValidation = validateGatewayForSubnet(parsedCidr, vlan.gatewayIp, role);
      if (!gatewayValidation.usable) {
        const ruleCode = gatewayValidation.status === "outside-subnet"
          ? "GATEWAY_OUTSIDE_SUBNET"
          : gatewayValidation.status === "network-address"
            ? "GATEWAY_IS_NETWORK_ADDRESS"
            : gatewayValidation.status === "broadcast-address"
              ? "GATEWAY_IS_BROADCAST_ADDRESS"
              : "GATEWAY_ROLE_UNUSABLE";
        results.push(
          makeItem({
            projectId,
            severity: "ERROR",
            ruleCode,
            title: `Gateway is not role-usable on VLAN ${vlan.vlanId}`,
            message: `${gatewayValidation.explanation} Valid address range is ${describeRange(parsedCidr)}.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }

      const usableHosts = usableHostCount(parsedCidr, role);
      if (typeof vlan.estimatedHosts === "number" && vlan.estimatedHosts > 0) {
        const recommendedPrefix = recommendedPrefixForHosts(vlan.estimatedHosts, role);
        const recommendedUsableHosts = usableHostCount(parseCidr(`0.0.0.0/${recommendedPrefix}`), role);

        if (vlan.estimatedHosts > usableHosts) {
          results.push(
            makeItem({
              projectId,
              severity: "ERROR",
              ruleCode: "INSUFFICIENT_HOST_CAPACITY",
              title: `Subnet too small on VLAN ${vlan.vlanId}`,
              message: `VLAN ${vlan.vlanName} estimates ${vlan.estimatedHosts} hosts, but ${canonical} supports only ${usableHosts} usable addresses for a ${role.toLowerCase().replace("_", " ")} segment. A better fit would be /${recommendedPrefix} with about ${recommendedUsableHosts} usable addresses.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        } else if (usableHosts > 0 && vlan.estimatedHosts / usableHosts >= 0.8) {
          const nextPrefix = Math.max(role === "WAN_TRANSIT" ? 31 : 1, parsedCidr.prefix - 1);
          const nextUsableHosts = usableHostCount(parseCidr(`0.0.0.0/${nextPrefix}`), role);
          results.push(
            makeItem({
              projectId,
              severity: "WARNING",
              ruleCode: "HOST_CAPACITY_NEAR_LIMIT",
              title: `Subnet nearing capacity on VLAN ${vlan.vlanId}`,
              message: `VLAN ${vlan.vlanName} estimates ${vlan.estimatedHosts} hosts out of ${usableHosts} usable addresses in ${canonical}. Consider expanding toward /${nextPrefix} for roughly ${nextUsableHosts} usable addresses.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        } else if (usableHosts > 0 && vlan.estimatedHosts / usableHosts <= 0.25 && parsedCidr.prefix < 30 && role !== "WAN_TRANSIT" && role !== "LOOPBACK") {
          results.push(
            makeItem({
              projectId,
              severity: "INFO",
              ruleCode: "RIGHTSIZE_RECOMMENDATION",
              title: `Possible right-size improvement on VLAN ${vlan.vlanId}`,
              message: `VLAN ${vlan.vlanName} uses ${canonical} with ${usableHosts} usable addresses, but the current estimate is only ${vlan.estimatedHosts}. A tighter fit could be /${recommendedPrefix} with about ${recommendedUsableHosts} usable addresses.`,
              entityType: "VLAN",
              entityId: vlan.id,
            }),
          );
        }
      }

      const gatewayIsUsableConvention = Boolean(subnetFacts.firstUsableIp && vlan.gatewayIp === subnetFacts.firstUsableIp) || Boolean(subnetFacts.lastUsableIp && vlan.gatewayIp === subnetFacts.lastUsableIp);
      if (parsedCidr.prefix <= 30 && role !== "WAN_TRANSIT" && role !== "LOOPBACK" && !gatewayIsUsableConvention) {
        results.push(
          makeItem({
            projectId,
            severity: "WARNING",
            ruleCode: "NONSTANDARD_GATEWAY_PATTERN",
            title: `Non-standard gateway pattern on VLAN ${vlan.vlanId}`,
            message: `Gateway ${vlan.gatewayIp} is valid, but it is neither the first usable (${subnetFacts.firstUsableIp ?? "unknown"}) nor last usable (${subnetFacts.lastUsableIp ?? "unknown"}) address for ${canonical}.`,
            entityType: "VLAN",
            entityId: vlan.id,
          }),
        );
      }

    }
  }

  for (let i = 0; i < parsedVlans.length; i += 1) {
    for (let j = i + 1; j < parsedVlans.length; j += 1) {
      const left = parsedVlans[i];
      const right = parsedVlans[j];

      if (cidrsOverlap(left.parsed, right.parsed)) {
        results.push(
          makeItem({
            projectId,
            severity: "ERROR",
            ruleCode: "OVERLAPPING_SUBNETS",
            title: "Overlapping subnets detected",
            message: `${left.siteName} VLAN ${left.vlanId} (${left.vlanName}) overlaps with ${right.siteName} VLAN ${right.vlanId} (${right.vlanName}).`,
            entityType: "VLAN",
            entityId: left.id,
          }),
        );
      }
    }
  }


  if (designSnapshot) {
    const hiddenIssueCodes = new Set([
      "SITE_SUMMARY_MISSING",
      "SITE_BLOCK_PROPOSAL_UNAVAILABLE",
      "SUBNET_PROPOSAL_BLOCKED_BY_SITE_BLOCK",
      "SUBNET_PROPOSAL_UNAVAILABLE",
      "TRANSIT_PLAN_DEFERRED",
      "TRANSIT_PROPOSAL_UNAVAILABLE",
      "LOOPBACK_PLAN_DEFERRED",
      "LOOPBACK_PROPOSAL_UNAVAILABLE",
      "STANDARDS_REQUIRED_RULE_BLOCKER",
    ]);

    const seenDesignCoreIssues = new Set<string>();
    for (const issue of designSnapshot.issues) {
      if (hiddenIssueCodes.has(issue.code)) continue;

      const dedupeKey = `${issue.code}|${issue.entityType}|${issue.entityId || ""}|${issue.detail}`;
      if (seenDesignCoreIssues.has(dedupeKey)) continue;
      seenDesignCoreIssues.add(dedupeKey);

      results.push(makeItem({
        projectId,
        severity: issue.severity,
        ruleCode: issue.code,
        title: issue.title,
        message: issue.detail,
        entityType: issue.entityType,
        entityId: issue.entityId,
      }));
    }
  }


  if (designSnapshot?.phase5EnterpriseIpamTruth) {
    const phase5 = designSnapshot.phase5EnterpriseIpamTruth;
    for (const row of phase5.reconciliationRows) {
      if (row.readinessImpact === "BLOCKING") {
        results.push(makeItem({
          projectId,
          severity: "ERROR",
          ruleCode: "IPAM_DURABLE_AUTHORITY_BLOCKED",
          title: `Engine 2 IPAM blocks VLAN ${row.vlanId}`,
          message: `${row.siteName} VLAN ${row.vlanId} ${row.vlanName} is ${row.reconciliationState}: ${[...row.blockers, ...row.reviewReasons].join(" ") || "Engine 2 durable authority is blocking this row."}`,
          entityType: "VLAN",
          entityId: row.rowId,
        }));
      } else if (row.readinessImpact === "REVIEW_REQUIRED") {
        results.push(makeItem({
          projectId,
          severity: "WARNING",
          ruleCode: "IPAM_DURABLE_AUTHORITY_REVIEW_REQUIRED",
          title: `Engine 2 IPAM review required for VLAN ${row.vlanId}`,
          message: `${row.siteName} VLAN ${row.vlanId} ${row.vlanName} is ${row.reconciliationState}: ${[...row.reviewReasons, ...row.evidence].slice(0, 3).join(" ")}`,
          entityType: "VLAN",
          entityId: row.rowId,
        }));
      }
    }

    for (const item of phase5.requirementIpamMatrix.filter((field) => field.active && field.readinessImpact !== "PASSED" && field.readinessImpact !== "NOT_APPLICABLE")) {
      results.push(makeItem({
        projectId,
        severity: item.readinessImpact === "BLOCKING" ? "ERROR" : "WARNING",
        ruleCode: "IPAM_REQUIREMENT_PROPAGATION_GAP",
        title: `Requirement ${item.requirementKey} has unresolved Engine 2 IPAM impact`,
        message: `${item.label}. ${item.missingIpamEvidence.slice(0, 3).join(" ") || item.expectedIpamImpact}`,
        entityType: "PROJECT",
        entityId: projectId,
      }));
    }
  }

  addRequirementsHonestyValidation(results, projectId, project, designSnapshot);

  if (results.length === 0) {
    results.push(
      makeItem({
        projectId,
        severity: "INFO",
        ruleCode: "VALIDATION_PASSED",
        title: "No validation issues found",
        message: "All current subnet boundary, gateway, capacity, and overlap checks passed.",
        entityType: "PROJECT",
        entityId: projectId,
      }),
    );
  }

  const savedResults = await prisma.$transaction(async (tx: any) => {
    await tx.validationResult.deleteMany({ where: { projectId } });
    await tx.validationResult.createMany({ data: results });
    return tx.validationResult.findMany({
      where: { projectId },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });
  });

  return savedResults.map(enrichValidationResult);
}

export async function getValidationResults(projectId: string) {
  // Phase 80: validation reads must reconcile with the same read-repaired
  // materialized evidence used by design-core/report. Returning old persisted
  // ValidationResult rows after Phase 79 can falsely claim 0 sites/0 VLANs
  // even after read-repair creates durable engineering objects.
  return runValidation(projectId);
}
