// V1_DISCOVERY_CURRENT_STATE_CONTRACT export wiring
// V1_PLATFORM_BOM_FOUNDATION_CONTRACT CSV/export evidence wiring
// V1_DIAGRAM_TRUTH_RENDERER_LAYOUT_CONTRACT: CSV/export rows expose backend-only diagram proof.
// V1_DESIGN_CORE_ORCHESTRATOR_CONTRACT
import { prisma } from "../db/prisma.js";
// V1_ENGINE1_CIDR_ADDRESSING_TRUTH
// V1_ENGINE2_ENTERPRISE_IPAM_DURABLE_ALLOCATION_WORKFLOW
import { getDesignCoreSnapshotForExport } from "./designCore.service.js";
import { ensureRequirementsMaterializedForRead } from "./requirementsMaterialization.service.js";
import { runValidation } from "./validation.service.js";
import { applyBackendDesignCoreToReport, type ProfessionalReportMode } from "./exportDesignCoreReport.service.js";
import type { ProfessionalReport, ReportMetadata, ReportSection, ReportTable, ReportVisualSnapshot } from "./export.types.js";

type JsonMap = Record<string, unknown>;
type SiteWithVlans = { name: string; location?: string | null; siteCode?: string | null; defaultAddressBlock?: string | null; vlans: Array<{ vlanId: number; vlanName: string; purpose?: string | null; subnetCidr: string; gatewayIp: string; dhcpEnabled: boolean; estimatedHosts?: number | null }> };
type ValidationItem = { severity: string; title: string; message: string; issue?: string | null; impact?: string | null; recommendation?: string | null; entityType?: string | null; ruleCode?: string | null; createdAt?: Date | string | null };

function parseJson<T = JsonMap>(value?: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function truthy(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function isEnabled(value: unknown) {
  return truthy(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function humanJoin(items: string[], conjunction = "and") {
  const clean = items.filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} ${conjunction} ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, ${conjunction} ${clean[clean.length - 1]}`;
}

function maybeBullet(label: string, value: unknown) {
  const text = asString(value);
  return text ? `${label}: ${text}` : null;
}

function gatewayConvention(gatewayIp: string) {
  const last = gatewayIp.split(".").pop() ?? "";
  if (last === "1") return "first usable address";
  if (last === "254") return "last usable address";
  return `${gatewayIp} (custom gateway choice)`;
}

function classifyZone(vlanName: string, purpose?: string | null) {
  const text = `${vlanName} ${purpose ?? ""}`.toLowerCase();
  if (text.includes("guest")) return "Guest";
  if (text.includes("manag") || text.includes("mgmt")) return "Management";
  if (text.includes("voice") || text.includes("voip")) return "Voice";
  if (text.includes("server") || text.includes("service") || text.includes("printer")) return "Services";
  if (text.includes("iot") || text.includes("camera") || text.includes("medical") || text.includes("ot")) return "Specialty / IoT";
  return "Users";
}

function sortUnique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function joinCsvList(value: unknown, fallback = "") {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean).join("; ") || fallback;
  }
  return asString(value, fallback);
}

function includesAny(value: unknown, terms: string[]) {
  const text = Array.isArray(value) ? value.join(" ").toLowerCase() : String(value ?? "").toLowerCase();
  return terms.some((term) => text.includes(term));
}

function hasVlanMatching(sites: SiteWithVlans[], terms: string[]) {
  return sites.some((site) => site.vlans.some((vlan) => includesAny(`${vlan.vlanName} ${vlan.purpose ?? ""}`, terms)));
}

function collectRequirementOutputGaps(params: {
  requirements: JsonMap;
  sites: SiteWithVlans[];
  requestedSiteCount: number | null;
  usersPerSite: number | null;
  multiSiteRequired: boolean;
}) {
  const { requirements, sites, requestedSiteCount, usersPerSite, multiSiteRequired } = params;
  const actualSiteCount = sites.length;
  const actualVlanCount = sites.reduce((sum, site) => sum + site.vlans.length, 0);
  const gaps: string[] = [];

  if (requestedSiteCount && requestedSiteCount > actualSiteCount) {
    gaps.push(`Requirement selected ${requestedSiteCount} site(s), but only ${actualSiteCount} materialized Site row(s) exist.`);
  }
  if (usersPerSite && usersPerSite > 0 && actualVlanCount === 0) {
    gaps.push(`Users per site is ${usersPerSite}, but no user/access VLAN or addressing row exists.`);
  }
  if (isEnabled(requirements.guestWifi) && !hasVlanMatching(sites, ["guest"])) {
    gaps.push("Guest Wi-Fi is selected, but no guest segment/addressing row exists.");
  }
  if (isEnabled(requirements.management) && !hasVlanMatching(sites, ["management", "mgmt"])) {
    gaps.push("Management network is selected, but no management segment/addressing row exists.");
  }
  if (isEnabled(requirements.printers) && !hasVlanMatching(sites, ["printer", "shared-device", "shared device"])) {
    gaps.push("Printers are selected, but no printer/shared-device segment exists.");
  }
  if (isEnabled(requirements.iot) && !hasVlanMatching(sites, ["iot"])) {
    gaps.push("IoT is selected, but no IoT segment exists.");
  }
  if (isEnabled(requirements.cameras) && !hasVlanMatching(sites, ["camera", "security device", "surveillance"])) {
    gaps.push("Cameras/security devices are selected, but no camera/security-device segment exists.");
  }
  if (isEnabled(requirements.voice) && !hasVlanMatching(sites, ["voice", "voip"])) {
    gaps.push("Voice is selected, but no voice segment exists.");
  }
  if (isEnabled(requirements.wireless) && !hasVlanMatching(sites, ["wireless", "wi-fi", "wifi", "staff access", "user access", "guest"])) {
    gaps.push("Wireless is selected, but no wireless/staff/guest access segment exists.");
  }
  if (isEnabled(requirements.remoteAccess) && actualVlanCount === 0) {
    gaps.push("Remote access is selected, but no VPN/security-edge or addressing evidence exists.");
  }
  if (isEnabled(requirements.cloudConnected) && actualVlanCount === 0) {
    gaps.push("Cloud/hybrid connectivity is selected, but no cloud boundary, transit, or addressing evidence exists.");
  }
  if (multiSiteRequired && actualSiteCount <= 1) {
    gaps.push("Multi-site planning is selected, but the generated design does not contain multiple materialized sites.");
  }

  return gaps;
}

const PLANNING_ASSUMPTIONS = [
  "Inputs were provided by the user and are not live-discovered network facts.",
  "Subnet allocations are based on declared host counts, saved site blocks, and planning growth buffers.",
  "Security zones are planning recommendations unless verified against actual firewall, identity, and access-control policy.",
  "Device placement is conceptual unless a confirmed hardware inventory and cabling model have been provided.",
  "Routing, WAN, DHCP, monitoring, and redundancy choices must be reviewed against business policy and vendor-specific implementation requirements.",
  "Engineer review is required before implementation or production deployment.",
];

const ENGINEER_REVIEW_STATEMENT =
  "This design package is intended for planning and review. Validate against the live environment, business policy, and vendor-specific implementation requirements before production deployment.";

const ENGINEER_REVIEW_CHECKLIST = [
  "Confirm live inventory.",
  "Confirm WAN/provider constraints.",
  "Confirm firewall policy requirements.",
  "Confirm DHCP/static reservation strategy.",
  "Confirm routing protocol choice.",
  "Confirm redundancy/HA requirements.",
  "Confirm monitoring/SNMP/logging requirements.",
  "Confirm implementation change window.",
];

function validationNarrative(item: ValidationItem) {
  const match = item.message.match(/^Issue:\s*(.*?)\s+Impact:\s*(.*?)\s+Recommendation:\s*(.*)$/i);
  const issue = asString(item.issue) || (match ? asString(match[1]) : asString(item.message, item.title));
  const impact = asString(item.impact) || (match ? asString(match[2]) : "Review impact against addressing, routing, security policy, and implementation risk.");
  const recommendation = asString(item.recommendation) || (match ? asString(match[3]) : "Review the finding, correct the source input where needed, and rerun validation.");
  return { issue, impact, recommendation };
}


export async function getProjectExportData(projectId: string) {
  await ensureRequirementsMaterializedForRead(projectId, "SubnetOps export", "export-read", {
    operation: "export-read",
    authorization: { permission: "system-internal-authorized", checkedBy: "export.controller ensureCanExportProject" },
    surfacedTo: ["report-export", "change-log", "security-audit"],
  });
  // V1: export validation detail must be generated from the same
  // repaired materialized rows as the report/design-core snapshot.
  await runValidation(projectId);
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sites: {
        include: {
          vlans: {
            orderBy: { vlanId: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
      validations: {
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      },
      changeLogs: {
        orderBy: { createdAt: "desc" },
        take: 15,
      },
    },
  });
}

export function buildExportContext(project: Awaited<ReturnType<typeof getProjectExportData>>) {
  if (!project) return null;

  const requirements = parseJson<JsonMap>(project.requirementsJson) || {};
  const discovery = parseJson<JsonMap>(project.discoveryJson) || {};
  const platform = parseJson<JsonMap>(project.platformProfileJson) || {};
  const sites = project.sites as unknown as SiteWithVlans[];
  const validations = project.validations as unknown as ValidationItem[];

  const siteCount = sites.length;
  const vlanCount = sites.reduce((sum: number, site) => sum + site.vlans.length, 0);
  const errors = validations.filter((item) => item.severity === "ERROR");
  const warnings = validations.filter((item) => item.severity === "WARNING");
  const infos = validations.filter((item) => item.severity === "INFO");

  const discoveryHighlights = [
    maybeBullet("Topology baseline", discovery.topologyBaseline),
    maybeBullet("Inventory and lifecycle", discovery.inventoryNotes),
    maybeBullet("Addressing and VLAN baseline", discovery.addressingVlanBaseline),
    maybeBullet("Routing and transport baseline", discovery.routingTransportBaseline),
    maybeBullet("Security posture", discovery.securityPosture),
    maybeBullet("Wireless baseline", discovery.wirelessBaseline),
    maybeBullet("Known gaps or pain points", discovery.gapsPainPoints),
    maybeBullet("Constraints and dependencies", discovery.constraintsDependencies),
    maybeBullet("Additional notes", discovery.extraNotes),
  ].filter(Boolean) as string[];

  const securityZones = sortUnique(
    [
      isEnabled(requirements.guestWifi) ? "Guest" : "",
      isEnabled(requirements.management) ? "Management" : "",
      isEnabled(requirements.voice) ? "Voice" : "",
      isEnabled(requirements.iot) || isEnabled(requirements.cameras) ? "Specialty / IoT" : "",
      isEnabled(requirements.remoteAccess) ? "Remote Access" : "",
      vlanCount > 0 ? sites.flatMap((site) => site.vlans.map((vlan) => classifyZone(vlan.vlanName, vlan.purpose))) : ["Users", "Services"],
    ].flat() as string[],
  );

  const openItems = [
    !asString(project.organizationName) ? "Organization name should be confirmed for final title page and approval routing." : null,
    !asString(project.basePrivateRange) ? "The parent private addressing block should be confirmed before final implementation sign-off." : null,
    !asString(requirements.primaryGoal) ? "The primary business or technical design objective should be saved explicitly in the requirements workspace." : null,
    !asString(requirements.complianceProfile) ? "Compliance and governance requirements should be confirmed if the package will be used for regulated environments." : null,
    discoveryHighlights.length === 0 ? "Current-state discovery notes are still thin and should be expanded before migration planning or procurement review." : null,
  ].filter(Boolean) as string[];

  const platformHighlights = [
    maybeBullet("Platform mode", platform.platformMode),
    maybeBullet("Vendor strategy", platform.vendorStrategy),
    maybeBullet("Routing posture", platform.routingPosture),
    maybeBullet("Switching posture", platform.switchingPosture),
    maybeBullet("Firewall posture", platform.firewallPosture),
    maybeBullet("Wireless posture", platform.wirelessPosture),
    maybeBullet("WAN posture", platform.wanPosture),
    maybeBullet("Cloud posture", platform.cloudPosture),
    maybeBullet("Operations model", platform.operationsModel),
    maybeBullet("Automation readiness", platform.automationReadiness),
    maybeBullet("Availability tier", platform.availabilityTier),
    maybeBullet("Support and lifecycle posture", platform.procurementLifecyclePosture),
  ].filter(Boolean) as string[];

  const usersPerSite = asNumber(requirements.usersPerSite);
  const requestedSiteCount = asNumber(requirements.siteCount);
  const environment = asString(project.environmentType, "custom");
  const planningFor = asString(requirements.planningFor);
  const primaryGoal = asString(requirements.primaryGoal);
  const serverPlacement = asString(requirements.serverPlacement);
  const internetModel = asString(requirements.internetModel);
  const multiSiteRequired =
    (requestedSiteCount ?? 0) > 1
    || includesAny(planningFor, ["multi-site", "multisite", "branch", "branches"])
    || includesAny(internetModel, ["site", "wan", "branch"])
    || includesAny(requirements.interSiteTrafficModel, ["site", "branch", "wan"]);
  const requirementOutputGaps = collectRequirementOutputGaps({ requirements, sites, requestedSiteCount, usersPerSite, multiSiteRequired });
  const outputTruthBlocked = requirementOutputGaps.length > 0;
  const routingPosture = multiSiteRequired ? "multi-site summarized routed design" : siteCount > 1 ? "multi-site summarized routed design" : "single-site routed access design";

  return {
    project,
    requirements,
    discovery,
    platform,
    sites,
    validations,
    siteCount,
    requestedSiteCount,
    multiSiteRequired,
    requirementOutputGaps,
    outputTruthBlocked,
    vlanCount,
    errors,
    warnings,
    infos,
    discoveryHighlights,
    securityZones,
    openItems,
    platformHighlights,
    usersPerSite,
    environment,
    planningFor,
    primaryGoal,
    serverPlacement,
    internetModel,
    routingPosture,
  };
}

export function composeProfessionalReport(project: Awaited<ReturnType<typeof getProjectExportData>>) {
  const exportContext = buildExportContext(project);
  if (!exportContext) return null;

  const generatedAt = new Date().toLocaleString();
  const projectEnvironment = titleCase(exportContext.environment || "custom");
  const architecturePattern =
    exportContext.multiSiteRequired
      ? exportContext.outputTruthBlocked
        ? "a declared multi-site architecture whose generated site, addressing, and topology evidence is incomplete"
        : "a multi-site architecture with per-site addressing boundaries, summarized routing, and shared design standards"
      : exportContext.siteCount > 1
        ? "a multi-site architecture with per-site addressing boundaries, summarized routing, and shared design standards"
        : exportContext.outputTruthBlocked
          ? "an incomplete generated design that cannot yet prove the selected requirements"
          : "a compact single-site architecture with segmented trust boundaries, routed gateway control, and centralized review artifacts";

  const narrativeScope = humanJoin(
    [
      exportContext.planningFor ? `${exportContext.planningFor.toLowerCase()} delivery scope` : "general network design scope",
      exportContext.primaryGoal ? `${exportContext.primaryGoal.toLowerCase()} as the leading design objective` : "clean segmentation and supportable implementation as the working design assumption",
      exportContext.usersPerSite ? `approximately ${exportContext.usersPerSite} user${exportContext.usersPerSite === 1 ? "" : "s"} per site` : "user counts still requiring final confirmation",
    ],
    "and",
  );

  const executiveSummary = [
    `${exportContext.project.name} is presented as a ${projectEnvironment.toLowerCase()} technical design report with ${exportContext.siteCount || 0} materialized site${exportContext.siteCount === 1 ? "" : "s"}, ${exportContext.vlanCount || 0} current addressing row${exportContext.vlanCount === 1 ? "" : "s"}, and ${exportContext.requestedSiteCount ?? "unconfirmed"} declared site${exportContext.requestedSiteCount === 1 ? "" : "s"} from requirements. The report is a truth-locked planning document: it must expose missing generated evidence instead of polishing an empty design as review-ready.`,
    `The current design direction follows ${architecturePattern}. This wording is tied to saved requirements and generated evidence; it must not fall back to single-site language when the requirements declare a multi-site design.`,
    exportContext.outputTruthBlocked
      ? `Requirement-output truth is blocked: ${exportContext.requirementOutputGaps.slice(0, 4).join(" ")}${exportContext.requirementOutputGaps.length > 4 ? " Additional gaps are listed in the Requirement Output Truth Lock section." : ""}`
      : exportContext.errors.length > 0
        ? `The present validation posture includes ${exportContext.errors.length} error-level blocker${exportContext.errors.length === 1 ? "" : "s"} and ${exportContext.warnings.length} warning${exportContext.warnings.length === 1 ? "" : "s"}. Those items should be resolved or explicitly accepted before the package is used as an implementation approval document.`
        : exportContext.warnings.length > 0
          ? `The current design contains ${exportContext.warnings.length} warning${exportContext.warnings.length === 1 ? "" : "s"} but no active error-level blockers. The package can be reviewed professionally now, although the warning items should still be addressed during technical sign-off.`
          : "The current design has no saved validation blockers and no detected requirement-output truth gaps in this export cycle.",
    `At this stage, the package is best used for design review, addressing confirmation, security and routing discussion, implementation planning, and stakeholder handoff. Procurement, platform-specific engineering, and migration approval should still be tied to the remaining assumptions and open review items documented later in the report.`,
  ];

  const introSection: ReportSection = {
    title: "1. Introduction and Project Scope",
    paragraphs: [
      `${exportContext.project.name} is currently being developed as a ${projectEnvironment.toLowerCase()} network planning package. The saved project scope points toward ${narrativeScope}. Where the brief is still incomplete, the report presents reasonable planning assumptions and clearly identifies them as items requiring confirmation rather than hiding the gaps inside the document body.`,
      `This report is designed to provide a professional design narrative that can be reviewed by technical stakeholders, project leads, or approval teams. It translates the saved planning record into a structured package covering discovery context, high-level design, low-level addressing and segmentation, routing and switching intent, implementation planning, and platform readiness.`,
    ],
    bullets: [
      maybeBullet("Organization", exportContext.project.organizationName),
      maybeBullet("Environment", projectEnvironment),
      maybeBullet("Planning focus", exportContext.planningFor),
      maybeBullet("Current project stage", exportContext.requirements.projectStage),
      maybeBullet("Primary design objective", exportContext.primaryGoal),
      exportContext.usersPerSite ? `Estimated users per site: ${exportContext.usersPerSite}` : null,
      maybeBullet("Compliance or governance profile", exportContext.requirements.complianceProfile),
    ].filter(Boolean) as string[],
  };

  const discoverySection: ReportSection = {
    title: "2. Discovery and Requirements Baseline",
    paragraphs: [
      exportContext.discoveryHighlights.length > 0
        ? "The project includes saved discovery notes that help anchor the target design in current-state information. These inputs should still be treated as a baseline rather than a complete discovery record, but they already provide enough context to improve migration planning, implementation sequencing, and design review quality."
        : "The current project record contains only a limited discovery baseline. The target design can still be reviewed and refined, but migration planning, procurement, and implementation approval should remain conditional until fuller current-state information is captured.",
      `The saved requirements presently indicate ${exportContext.primaryGoal ? `${exportContext.primaryGoal.toLowerCase()} as the main objective` : "a still-developing main design objective"}. The planning package therefore emphasizes structured segmentation, supportable gateway ownership, reviewable security boundaries, and implementation clarity rather than over-optimizing for platform-specific detail too early in the lifecycle.`,
    ],
    bullets: exportContext.discoveryHighlights,
  };

  const planningAssumptionsSection: ReportSection = {
    title: "3. Planning Assumptions",
    paragraphs: [
      "The report is deliberately explicit about its design basis. These assumptions are not legal filler; they define where SubnetOps has saved inputs and deterministic checks versus where a network engineer still needs to verify the real environment.",
      ENGINEER_REVIEW_STATEMENT,
    ],
    bullets: PLANNING_ASSUMPTIONS,
  };

  const requirementOutputTruthSection: ReportSection = {
    title: "4. Requirement Output Truth Lock",
    paragraphs: [
      exportContext.outputTruthBlocked
        ? "Selected requirements have not produced all required engineering evidence. This report must remain blocked until the missing generated objects are created, validated, and reflected in design-core."
        : "Selected requirements have generated the minimum direct evidence checked by this export truth lock.",
      "This section exists to stop polished reports from hiding a broken requirements-to-design pipeline.",
    ],
    tables: [
      {
        title: "Requirement-to-Output Gaps",
        headers: ["Status", "Requirement / Expected Output", "Observed Evidence"],
        rows: exportContext.requirementOutputGaps.length > 0
          ? exportContext.requirementOutputGaps.map((gap) => ["BLOCKED", gap, `${exportContext.siteCount} site row(s); ${exportContext.vlanCount} addressing row(s)`])
          : [["PASS", "No export-level requirement-output gap detected", `${exportContext.siteCount} site row(s); ${exportContext.vlanCount} addressing row(s)`]],
      },
    ],
  };

  const hldBullets = [
    `Architecture direction: ${architecturePattern}`,
    `Base private range: ${asString(exportContext.project.basePrivateRange) || "working range still needs explicit confirmation"}`,
    `Materialized site rows: ${exportContext.siteCount}`,
    exportContext.requestedSiteCount != null ? `Requirement-selected site count: ${exportContext.requestedSiteCount}` : null,
    exportContext.outputTruthBlocked ? `Requirement-output truth gaps: ${exportContext.requirementOutputGaps.length}` : null,
    `Logical security domains in scope: ${humanJoin(exportContext.securityZones) || "to be finalized"}`,
    exportContext.internetModel ? `Internet or edge posture: ${exportContext.internetModel}` : null,
    exportContext.serverPlacement ? `Server or service placement: ${exportContext.serverPlacement}` : null,
    isEnabled(exportContext.requirements.dualIsp)
      ? `Resilience posture: ${asString(exportContext.requirements.resilienceTarget, "dual-path or failover-aware design")}`
      : `Resilience posture: ${asString(exportContext.requirements.resilienceTarget, "single-primary-path posture pending further review")}`,
  ].filter(Boolean) as string[];

  const hldSection: ReportSection = {
    title: "5. High-Level Design Overview",
    paragraphs: [
      `The proposed high-level design follows ${architecturePattern}. For the current scope, that means the design package is aiming for clear trust boundaries, manageable operational control, and an addressing hierarchy that can grow without forcing redesign after the first implementation cycle.`,
      exportContext.multiSiteRequired
        ? exportContext.siteCount > 1
          ? "Because multiple sites are present, the architecture assumes a parent organizational block, per-site summary blocks, and transport logic that can be summarized cleanly at site boundaries. This reduces route sprawl and makes later expansion easier to reason about."
          : "The requirements declare a multi-site design, but the generated project evidence does not yet contain multiple materialized Site rows. The report must treat this as a blocked generation gap, not as a compact single-site design."
        : exportContext.siteCount > 1
          ? "Because multiple sites are present, the architecture assumes a parent organizational block, per-site summary blocks, and transport logic that can be summarized cleanly at site boundaries. This reduces route sprawl and makes later expansion easier to reason about."
          : "Because the saved generated scope currently centers on a single site, the architecture stays intentionally compact. The priority is to establish good segmentation, disciplined gateway placement, and supportable controls before introducing complexity that the environment does not yet require.",
    ],
    bullets: hldBullets,
  };

  const zoneRows = sortUnique(
    exportContext.sites.flatMap((site) => site.vlans.map((vlan) => `${classifyZone(vlan.vlanName, vlan.purpose)}|${site.name}|VLAN ${vlan.vlanId} ${vlan.vlanName}|${vlan.subnetCidr}`)),
  ).map((row) => {
    const [zone, site, segment, subnet] = row.split("|");
    return [zone, site, segment, subnet];
  });

  const securitySection: ReportSection = {
    title: "6. Security Architecture and Segmentation Model",
    paragraphs: [
      "The security design should be interpreted as a structural zone model that shapes addressing, routing, and implementation review. The current package is not yet pretending to be a fully vendor-specific firewall rulebase. Instead, it is defining the security boundaries that the implementation team will need to preserve when real devices, policies, and access controls are configured.",
      exportContext.securityZones.includes("Guest")
        ? "Guest or untrusted access is in scope and should remain isolated from trusted user, service, and management boundaries unless an explicitly reviewed exception is approved."
        : "Guest access is not strongly modeled in the current saved scope, so the present package focuses more on trusted user, service, management, and infrastructure boundaries.",
      exportContext.securityZones.includes("Management")
        ? "Management access is treated as a privileged boundary and should be carried on dedicated administrative paths rather than blended into general user access."
        : "A dedicated management boundary is not fully modeled yet, so that remains an important design checkpoint before implementation sign-off if infrastructure operations will require segregated administrative control.",
    ],
    tables: [
      {
        title: "Zone and Segment Mapping",
        headers: ["Security Zone", "Site", "Mapped Segment", "Subnet"],
        rows: zoneRows.length > 0 ? zoneRows : [["Users", "Primary scope", "No explicit VLAN records saved yet", "—"]],
      },
    ],
    bullets: [
      isEnabled(exportContext.requirements.remoteAccess) ? `Remote access posture: ${asString(exportContext.requirements.remoteAccessMethod, "reviewed remote-access edge required")}` : null,
      isEnabled(exportContext.requirements.guestWifi) ? `Guest policy intent: ${asString(exportContext.requirements.guestPolicy, "internet-only or tightly filtered guest access")}` : null,
      isEnabled(exportContext.requirements.management) ? `Management policy intent: ${asString(exportContext.requirements.managementAccess, "trusted administrative access only")}` : null,
      isEnabled(exportContext.requirements.wireless) || isEnabled(exportContext.requirements.guestWifi) ? `Wireless mapping: ${asString(exportContext.requirements.wirelessSecurity, "staff and guest wireless should remain mapped to the correct trust domains")}` : null,
    ].filter(Boolean) as string[],
  };

  const siteSummaryRows = exportContext.sites.map((site) => [
    site.name,
    asString(site.siteCode, "—"),
    asString(site.location, "Location not set"),
    asString(site.defaultAddressBlock, "Not assigned"),
    String(site.vlans.length),
  ]);

  const addressingRows = exportContext.sites.flatMap((site) =>
    site.vlans.map((vlan) => [
      site.name,
      String(vlan.vlanId),
      vlan.vlanName,
      vlan.subnetCidr,
      vlan.gatewayIp,
      gatewayConvention(vlan.gatewayIp),
      vlan.dhcpEnabled ? "Enabled" : "Not enabled",
      vlan.estimatedHosts != null ? String(vlan.estimatedHosts) : "—",
    ]),
  );

  const addressingSection: ReportSection = {
    title: "7. Logical Design and Addressing Plan",
    paragraphs: [
      `The low-level design currently contains ${exportContext.vlanCount} addressing row${exportContext.vlanCount === 1 ? "" : "s"}. These rows act as the main implementation artifact for subnet ownership, gateway placement, DHCP posture, and segmented trust boundaries.`,
      "The addressing schedule should be reviewed carefully before implementation because it affects gateway conventions, helper policies, firewall and ACL placement, and the cleanliness of later summarization. This section is therefore intended to function as a true design artifact rather than an afterthought or status card.",
    ],
    tables: [
      {
        title: "Site Addressing Summary",
        headers: ["Site", "Code", "Location", "Address Block", "Rows"],
        rows: siteSummaryRows.length > 0 ? siteSummaryRows : [["No site records saved", "—", "—", "—", "0"]],
      },
      {
        title: "Detailed Addressing Schedule",
        headers: ["Site", "VLAN", "Segment", "Subnet", "Gateway", "Gateway Pattern", "DHCP", "Est. Hosts"],
        rows: addressingRows.length > 0 ? addressingRows : [["No addressing rows saved", "—", "—", "—", "—", "—", "—", "—"]],
      },
    ],
  };

  const routingBullets = [
    maybeBullet("Internet or edge model", exportContext.internetModel),
    maybeBullet("Server or service placement", exportContext.serverPlacement),
    maybeBullet("Platform WAN posture", exportContext.platform.wanPosture),
    isEnabled(exportContext.requirements.voice) ? `QoS or voice posture: ${asString(exportContext.requirements.voiceQos, "voice and real-time traffic require reviewed prioritization")}` : null,
    exportContext.siteCount > 1 ? "Routing posture: prefer site summarization and deliberate default-route ownership at the edge." : "Routing posture: simple routed edge with explicit gateway ownership and a controlled path to later IGP growth.",
  ].filter(Boolean) as string[];

  const routingSection: ReportSection = {
    title: "8. Routing, Switching, and Transport Intent",
    paragraphs: [
      `The routing and switching design is currently framed as ${exportContext.routingPosture}. The package is intentionally trying to keep control-plane ownership obvious, site boundaries reviewable, and gateway behavior stable before platform-specific configuration is generated.`,
      "Switching intent should reinforce segmentation rather than hide it. Trunking, VLAN propagation, loop prevention, and first-hop placement should all be reviewed against the addressing hierarchy so that the final implementation does not undermine the logical model presented in this report.",
    ],
    bullets: routingBullets,
  };

  const validationRows = exportContext.validations.length > 0
    ? exportContext.validations.slice(0, 15).map((item) => {
        const narrative = validationNarrative(item);
        return [item.severity, item.title, narrative.issue, narrative.impact, narrative.recommendation];
      })
    : [["INFO", "No validation findings saved", "No saved findings are available in the current export.", "A stale validation state can hide recent design changes.", "Run validation after changes if a fresh technical review is required."]];

  const implementationSection: ReportSection = {
    title: "9. Implementation, Testing, and Validation Strategy",
    paragraphs: [
      "Implementation should proceed in controlled stages so that addressing, gateway ownership, service reachability, security boundary enforcement, and rollback conditions can be verified without expanding the blast radius of each change window.",
      exportContext.errors.length > 0
        ? "Because the current package still contains error-level blockers, implementation approval should pause until those blockers are reviewed and resolved."
        : "Because the current validation posture does not contain active error-level blockers, the package can move into deeper technical sign-off and change preparation once the warning and assumption items are reviewed.",
    ],
    bullets: [
      `Validation blockers: ${exportContext.errors.length}`,
      `Validation warnings: ${exportContext.warnings.length}`,
      `Validation information items: ${exportContext.infos.length}`,
      exportContext.warnings.length > 0 ? "Warning-level findings should be cleared or accepted explicitly before final handoff." : null,
    ].filter(Boolean) as string[],
    tables: [
      {
        title: "Validation Review Summary",
        headers: ["Severity", "Finding", "Issue", "Impact", "Recommendation"],
        rows: validationRows,
      },
    ],
  };

  const engineerChecklistSection: ReportSection = {
    title: "12. Engineer Review Checklist",
    paragraphs: [
      "The export should be treated as a design review package, not a replacement for implementation engineering. The checklist below captures the minimum review gates before the plan becomes a change-ready implementation artifact.",
      ENGINEER_REVIEW_STATEMENT,
    ],
    bullets: ENGINEER_REVIEW_CHECKLIST,
  };

  const platformRows = exportContext.platformHighlights.map((line) => [line, "Review during final engineering and procurement alignment"]);

  const platformSection: ReportSection = {
    title: "10. Platform Profile and Bill of Materials Foundation",
    paragraphs: [
      "The current platform section should be read as a role-based engineering and procurement foundation rather than a final quote or SKU-specific bill of materials. Its value is in making the deployment posture explicit early, which helps prevent the logical design from drifting too far away from operational reality.",
      "Final model selection, exact licensing, optics, accessories, and commercial pricing still require engineering and procurement review. Even so, the present platform foundation is useful because it documents the posture that the technical design currently assumes.",
    ],
    tables: [
      {
        title: "Platform and Deployment Profile",
        headers: ["Profile Item", "Review Action"],
        rows: platformRows.length > 0 ? platformRows : [["No platform profile saved yet", "Complete the Platform & BOM workspace before treating procurement outputs as review-ready"]],
      },
    ],
  };

  const risksSection: ReportSection = {
    title: "11. Risks and Open Review Items",
    paragraphs: [
      "Professional design packages should make uncertainty visible rather than bury it. The items below are not necessarily design failures; they are remaining risks or review points that should be acknowledged before the package is treated as change-ready.",
    ],
    bullets: [
      ...exportContext.requirementOutputGaps.map((gap) => `Requirement-output blocker: ${gap}`),
      ...exportContext.openItems,
      ...exportContext.warnings.slice(0, 6).map((item) => `Validation review item: ${item.title} — ${item.message}`),
    ],
  };

  const conclusionSection: ReportSection = {
    title: "13. Conclusion and Handoff Notes",
    paragraphs: [
      ENGINEER_REVIEW_STATEMENT,
      exportContext.outputTruthBlocked
        ? `${exportContext.project.name} does not yet have a complete generated network design package. Requirements are present, but one or more required downstream outputs are missing; this report is a blocked diagnostic handoff until the requirements-to-design pipeline generates the missing objects.`
        : `${exportContext.project.name} now has a structured network design package that translates saved requirements and synthesized planning data into a more formal handoff document. The report provides enough structure for technical review, addressing confirmation, security discussion, routing review, implementation planning, and platform alignment without pretending that the remaining open items do not exist.`,
      exportContext.outputTruthBlocked
        ? "The next priority should be to fix materialization/design-core propagation, rerun validation, and regenerate this export only after Sites, VLANs, addressing rows, topology, and scenario proof reflect the selected requirements."
        : exportContext.errors.length > 0
          ? `The next priority should be to resolve the remaining ${exportContext.errors.length} blocker${exportContext.errors.length === 1 ? "" : "s"}, rerun validation, and then regenerate the report so the final handoff reflects a cleaner implementation posture.`
          : "The next priority should be to tighten discovery detail, confirm platform and compliance assumptions, and carry the approved design into platform-specific implementation artifacts, diagrams, and change-control evidence.",
    ],
  };

  const appendices: ReportSection[] = [
    {
      title: "Appendix A. Detailed Addressing Schedule",
      paragraphs: [
        "This appendix preserves the row-level addressing detail used by the planning model. It should be treated as a core implementation artifact for subnet ownership, gateway mapping, and DHCP posture.",
      ],
      tables: [
        {
          title: "Addressing Rows",
          headers: ["Site", "VLAN", "Segment", "Subnet", "Gateway", "DHCP", "Est. Hosts"],
          rows: exportContext.sites.flatMap((site) =>
            site.vlans.map((vlan) => [
              site.name,
              String(vlan.vlanId),
              vlan.vlanName,
              vlan.subnetCidr,
              vlan.gatewayIp,
              vlan.dhcpEnabled ? "Enabled" : "No",
              vlan.estimatedHosts != null ? String(vlan.estimatedHosts) : "—",
            ]),
          ).length > 0
            ? exportContext.sites.flatMap((site) =>
                site.vlans.map((vlan) => [
                  site.name,
                  String(vlan.vlanId),
                  vlan.vlanName,
                  vlan.subnetCidr,
                  vlan.gatewayIp,
                  vlan.dhcpEnabled ? "Enabled" : "No",
                  vlan.estimatedHosts != null ? String(vlan.estimatedHosts) : "—",
                ]),
              )
            : [["No addressing rows saved", "—", "—", "—", "—", "—", "—"]],
        },
      ],
    },
    {
      title: "Appendix B. Validation Detail",
      paragraphs: [
        "The following findings reflect the most recent saved validation state available at export time. They should be reviewed together with the main design sections rather than in isolation.",
      ],
      tables: [
        {
          title: "Validation Findings",
          headers: ["Severity", "Entity", "Title", "Issue", "Impact", "Recommendation"],
          rows:
            exportContext.validations.length > 0
              ? exportContext.validations.map((item) => {
                  const narrative = validationNarrative(item);
                  return [item.severity, asString(item.entityType, "PROJECT"), item.title, narrative.issue, narrative.impact, narrative.recommendation];
                })
              : [["INFO", "PROJECT", "No validation results recorded", "No saved findings are available in the current export.", "A stale validation state can hide recent design changes.", "Run validation again if a fresh review is needed."]],
        },
      ],
    },
  ];

  const reportMetadata: ReportMetadata = {
    organizationName: asString(exportContext.project.organizationName, "To be confirmed"),
    environment: projectEnvironment,
    reportVersion: "Version 0.94 V1 truth-locked",
    revisionStatus: exportContext.outputTruthBlocked ? "Blocked - requirement outputs missing" : exportContext.errors.length > 0 ? "Draft - blockers present" : exportContext.warnings.length > 0 ? "Review draft" : "Review-ready draft",
    documentOwner: asString(exportContext.project.ownerName, "SubnetOps project owner"),
    approvalStatus: exportContext.outputTruthBlocked || exportContext.errors.length > 0 ? "Not ready for approval" : "Ready for technical review",
    projectStage: asString(exportContext.requirements.projectStage, "To be confirmed"),
    planningFocus: asString(exportContext.planningFor, "To be confirmed"),
    primaryObjective: asString(exportContext.primaryGoal, "To be confirmed"),
    generatedFrom: "Saved project records, authoritative design snapshot, deterministic addressing checks, and assumption-based recommendations",
  };

  const visualSnapshot: ReportVisualSnapshot = {
    metrics: [
      ["Materialized sites", String(exportContext.siteCount)],
      ["Requirement-selected sites", exportContext.requestedSiteCount != null ? String(exportContext.requestedSiteCount) : "Unconfirmed"],
      ["Addressing rows", String(exportContext.vlanCount)],
      ["Requirement-output gaps", String(exportContext.requirementOutputGaps.length)],
      ["Security zones", String(exportContext.securityZones.length)],
      ["Validation blockers", String(exportContext.errors.length)],
      ["Validation warnings", String(exportContext.warnings.length)],
      ["Base range", asString(exportContext.project.basePrivateRange, "Working range pending confirmation")],
    ],
    topologyRows: [
      ["Edge / Internet", exportContext.internetModel || "Internet/edge model pending refinement", exportContext.multiSiteRequired ? "Multi-site edge/WAN intent must produce site and transport evidence" : "Keep the routed edge intentionally simple"],
      ["Core / Distribution", exportContext.multiSiteRequired ? "Primary/branch site structure required by saved requirements" : exportContext.siteCount > 1 ? "Primary site coordinates shared services and route summaries" : "Collapsed core/access edge with local Layer 3 gateways", "Do not let Layer 2 sprawl undermine segmentation"],
      ["Services", exportContext.serverPlacement || "Small centralized service block", "Keep shared services separated from users and guest access"],
      ["Security", humanJoin(exportContext.securityZones) || "Users and services", "Apply default-deny principles between unlike trust boundaries"],
    ],
  };

  return {
    title: exportContext.project.reportHeader || `${exportContext.project.name} Technical Design Report`,
    subtitle: `${exportContext.project.name} — Professional Network Planning Package`,
    generatedAt,
    executiveSummary,
    sections: [introSection, discoverySection, planningAssumptionsSection, requirementOutputTruthSection, hldSection, securitySection, addressingSection, routingSection, implementationSection, platformSection, risksSection, engineerChecklistSection, conclusionSection],
    appendices,
    metadata: reportMetadata,
    visualSnapshot,
  } satisfies ProfessionalReport;
}

export async function composeProfessionalReportForProject(projectId: string, reportMode: ProfessionalReportMode = "professional") {
  const project = await getProjectExportData(projectId);
  const report = composeProfessionalReport(project);
  if (!project || !report) return { project, report: null };
  const designCore = await getDesignCoreSnapshotForExport(projectId);
  return { project, report: applyBackendDesignCoreToReport(report, designCore, { reportMode }) };
}

export async function getCsvRows(projectId: string) {
  const project = await getProjectExportData(projectId);
  const exportContext = buildExportContext(project);
  if (!exportContext) return [];
  const designCore = await getDesignCoreSnapshotForExport(projectId);

  const rows: Array<Record<string, unknown>> = [];

  rows.push(
    { Section: "Project", Scope: "Project", Name: exportContext.project.name, Key: "Organization", Value: exportContext.project.organizationName ?? "", Notes: "" },
    { Section: "Project", Scope: "Project", Name: exportContext.project.name, Key: "Environment", Value: exportContext.project.environmentType ?? "", Notes: "" },
    { Section: "Project", Scope: "Project", Name: exportContext.project.name, Key: "Base Private Range", Value: exportContext.project.basePrivateRange ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: exportContext.project.name, Key: "Planning For", Value: exportContext.requirements.planningFor ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: exportContext.project.name, Key: "Project Stage", Value: exportContext.requirements.projectStage ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: exportContext.project.name, Key: "Primary Goal", Value: exportContext.requirements.primaryGoal ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: exportContext.project.name, Key: "Compliance Profile", Value: exportContext.requirements.complianceProfile ?? "", Notes: "" },
  );

  for (const assumption of PLANNING_ASSUMPTIONS) {
    rows.push({ Section: "Planning Assumptions", Scope: "Project", Name: exportContext.project.name, Key: "Assumption", Value: assumption, Notes: "Engineer review required" });
  }

  for (const item of ENGINEER_REVIEW_CHECKLIST) {
    rows.push({ Section: "Engineer Review Checklist", Scope: "Project", Name: exportContext.project.name, Key: "Review gate", Value: item, Notes: ENGINEER_REVIEW_STATEMENT });
  }

  for (const site of exportContext.sites) {
    rows.push({ Section: "Sites", Scope: "Site", Name: site.name, Key: "Address Block", Value: site.defaultAddressBlock ?? "", Notes: site.location ?? "" });
    for (const vlan of site.vlans) {
      rows.push({
        Section: "Addressing",
        Scope: site.name,
        Name: `VLAN ${vlan.vlanId} ${vlan.vlanName}`,
        Key: "Subnet",
        Value: vlan.subnetCidr,
        Notes: `Gateway ${vlan.gatewayIp} | DHCP ${vlan.dhcpEnabled ? "Yes" : "No"} | Hosts ${vlan.estimatedHosts ?? ""}`,
      });
    }
  }

  for (const zone of exportContext.securityZones) {
    rows.push({ Section: "Security", Scope: "Project", Name: zone, Key: "Zone", Value: zone, Notes: "Generated from current requirements scope" });
  }

  if (designCore) {
    for (const row of designCore.addressingRows) {
      rows.push({
        Section: "Addressing Recommendation",
        Scope: row.siteName,
        Name: `VLAN ${row.vlanId} ${row.vlanName}`,
        Key: "Subnet review",
        Value: row.canonicalSubnetCidr ?? row.sourceSubnetCidr,
        Notes: `Gateway state ${row.gatewayState} | Capacity ${row.capacityState} | Required ${row.requiredUsableHosts ?? "—"} usable | Recommended ${row.recommendedPrefix ? `/${row.recommendedPrefix}` : "—"} | Role ${row.role} (${row.roleSource ?? "unknown"}/${row.roleConfidence ?? "low"}) | In site block ${row.inSiteBlock === null ? "Unknown" : row.inSiteBlock ? "Yes" : "No"} | ${row.engine1Explanation ?? row.capacityExplanation ?? row.roleEvidence ?? "Backend addressing reviewed"}` ,
      });
    }

    for (const proposal of designCore.proposedRows ?? []) {
      rows.push({
        Section: "Addressing Recommendation",
        Scope: proposal.siteName,
        Name: `VLAN ${proposal.vlanId} ${proposal.vlanName}`,
        Key: "Recommended subnet",
        Value: proposal.proposedSubnetCidr ?? `/${proposal.recommendedPrefix}`,
        Notes: `${proposal.reason}${proposal.proposedGatewayIp ? ` | Proposed gateway ${proposal.proposedGatewayIp}` : ""}`,
      });
    }

    for (const review of designCore.siteSummaries ?? []) {
      rows.push({
        Section: "Site Block Review",
        Scope: review.siteName,
        Name: review.siteName,
        Key: "Site block review",
        Value: review.minimumRequiredSummary ?? review.currentSiteBlock ?? "Pending",
        Notes: `${review.status.toUpperCase()} | ${review.notes.join(" ")}` ,
      });
    }

    for (const transit of designCore.transitPlan ?? []) {
      rows.push({
        Section: "Transit Plan",
        Scope: transit.siteName,
        Name: transit.kind === "existing" ? "Existing transit" : "Proposed transit",
        Key: transit.kind,
        Value: transit.subnetCidr ?? "Pending",
        Notes: `${transit.gatewayOrEndpoint ? `Endpoint ${transit.gatewayOrEndpoint} | ` : ""}${transit.notes.join(" ")}`,
      });
    }

    for (const loopback of designCore.loopbackPlan ?? []) {
      rows.push({
        Section: "Loopback Plan",
        Scope: loopback.siteName,
        Name: loopback.kind === "existing" ? "Existing loopback" : "Proposed loopback",
        Key: loopback.kind,
        Value: loopback.subnetCidr ?? loopback.endpointIp ?? "Pending",
        Notes: loopback.notes.join(" "),
      });
    }

    rows.push({
      Section: "Backend Truth",
      Scope: "Project",
      Name: designCore.projectName,
      Key: "Implementation readiness",
      Value: designCore.reportTruth.readiness.implementation,
      Notes: designCore.reportTruth.readiness.implementation === "blocked" ? "This design is not implementation-ready." : "Engineer review is still required before production change approval.",
    });
    rows.push({
      Section: "Backend Truth",
      Scope: "Project",
      Name: designCore.projectName,
      Key: "Report truth",
      Value: designCore.reportTruth.overallReadinessLabel,
      Notes: `Routing ${designCore.reportTruth.readiness.routing} | Security ${designCore.reportTruth.readiness.security} | NAT ${designCore.reportTruth.readiness.nat} | Blocked findings ${designCore.reportTruth.blockedFindings.length} | Review findings ${designCore.reportTruth.reviewFindings.length}`,
    });
    if (designCore.V1ReportExportTruth) {
      rows.push({
        Section: "V1 Report Export Truth",
        Scope: "Project",
        Name: designCore.projectName,
        Key: "Report/export readiness",
        Value: designCore.V1ReportExportTruth.overallReadiness,
        Notes: `${designCore.V1ReportExportTruth.requiredSectionCount} required section gate(s); ${designCore.V1ReportExportTruth.traceabilityRowCount} traceability row(s); PDF/DOCX/CSV covered ${designCore.V1ReportExportTruth.pdfDocxCsvCovered ? "yes" : "no"}`,
      });
      for (const section of designCore.V1ReportExportTruth.sectionGates) {
        rows.push({
          Section: "V1 Report Section Gates",
          Scope: section.sectionKey,
          Name: section.title,
          Key: section.readinessImpact,
          Value: section.reportSection,
          Notes: `Frontend: ${section.frontendLocation} | Truth labels: ${joinCsvList(section.truthLabels, "none")} | Evidence: ${joinCsvList(section.evidence, "none")} | Blockers: ${joinCsvList(section.blockers, "none")}`,
        });
      }
      for (const trace of designCore.V1ReportExportTruth.traceabilityMatrix) {
        rows.push({
          Section: "Requirement Traceability Matrix",
          Scope: trace.requirementKey,
          Name: trace.requirementLabel,
          Key: trace.readinessStatus,
          Value: trace.designConsequence,
          Notes: `Engines: ${joinCsvList(trace.enginesAffected, "none")} | Frontend: ${trace.frontendLocation} | Report: ${trace.reportSection} | Diagram: ${trace.diagramImpact} | Missing consumers: ${joinCsvList(trace.missingConsumers, "none")}`,
        });
      }
      for (const label of designCore.V1ReportExportTruth.truthLabelRows) {
        rows.push({
          Section: "V1 Truth Labels",
          Scope: label.truthLabel,
          Name: label.truthLabel,
          Key: label.readinessImpact,
          Value: String(label.count),
          Notes: `${label.reportUsage} | Evidence: ${joinCsvList(label.evidence, "none")}`,
        });
      }
      for (const finding of designCore.V1ReportExportTruth.findings) {
        rows.push({
          Section: "V1 Report Export Findings",
          Scope: joinCsvList(finding.affectedSectionKeys, "project"),
          Name: finding.title,
          Key: `${finding.severity} | ${finding.code}`,
          Value: finding.detail,
          Notes: finding.remediation,
        });
      }
      for (const summary of designCore.V1ReportExportTruth.omittedEvidenceSummaries ?? []) {
        rows.push({
          Section: "V1 Report Omitted Evidence",
          Scope: summary.surface,
          Name: summary.collection,
          Key: summary.readinessImpact,
          Value: `${summary.shownCount}/${summary.totalCount} shown; ${summary.omittedCount} omitted`,
          Notes: `Omitted blockers ${summary.omittedHasBlockers ? "yes" : "no"} | Omitted review ${summary.omittedHasReviewRequired ? "yes" : "no"} | Severity ${joinCsvList(Object.entries(summary.omittedSeveritySummary ?? {}).map(([key, value]) => `${key}:${value}`), "none")} | ${summary.exportImpact}`,
        });
      }
      for (const item of designCore.V1ReportExportTruth.fullEvidenceInventory ?? []) {
        rows.push({
          Section: "V1 Report Full Evidence Inventory",
          Scope: item.collection,
          Name: item.collection,
          Key: item.readinessImpact,
          Value: `${item.surfacedCount}/${item.totalCount} surfaced; ${item.omittedCount} omitted`,
          Notes: "Full evidence appendix preserves the machine-readable collection instead of hiding sliced rows.",
        });
      }
      for (const rule of designCore.V1ReportExportTruth.antiOverclaimRules ?? []) {
        rows.push({
          Section: "V1 Report Anti-Overclaim Rules",
          Scope: rule.allowedOnlyWhen,
          Name: rule.phrase,
          Key: rule.claimAllowed ? "claim-allowed" : "claim-blocked",
          Value: rule.replacement,
          Notes: joinCsvList(rule.evidence, "no evidence"),
        });
      }
      if (designCore.V1ReportExportTruth.fullMachineReadableAppendix) {
        rows.push({
          Section: "V1 Report Machine-Readable Appendix",
          Scope: "PDF/DOCX/CSV/JSON",
          Name: "Full evidence appendix",
          Key: designCore.V1ReportExportTruth.fullMachineReadableAppendix.machineReadable ? "machine-readable" : "missing",
          Value: joinCsvList(designCore.V1ReportExportTruth.fullMachineReadableAppendix.exportFormats, "none"),
          Notes: `Traceability ${designCore.V1ReportExportTruth.fullMachineReadableAppendix.includesRequirementTraceability ? "yes" : "no"} | Omitted summaries ${designCore.V1ReportExportTruth.fullMachineReadableAppendix.includesOmittedEvidenceSummaries ? "yes" : "no"} | Full inventory ${designCore.V1ReportExportTruth.fullMachineReadableAppendix.includesFullEvidenceInventory ? "yes" : "no"}`,
        });
      }
    }

    rows.push({
      Section: "Diagram Truth",
      Scope: "Project",
      Name: designCore.projectName,
      Key: "Diagram render model summary",
      Value: `${designCore.diagramTruth.renderModel.summary.nodeCount} render nodes / ${designCore.diagramTruth.renderModel.summary.edgeCount} render edges`,
      Notes: `Modeled devices ${designCore.diagramTruth.topologySummary.deviceCount} | Interfaces ${designCore.diagramTruth.topologySummary.interfaceCount} | Links ${designCore.diagramTruth.topologySummary.linkCount} | Route domains ${designCore.diagramTruth.topologySummary.routeDomainCount} | Security zones ${designCore.diagramTruth.topologySummary.securityZoneCount} | Empty-state ${designCore.diagramTruth.emptyStateReason ?? designCore.diagramTruth.renderModel.emptyState?.reason ?? "none"}`,
    });

    if (designCore.V1DiagramTruth) {
      rows.push({
        Section: "V1 Diagram Truth",
        Scope: "Project",
        Name: designCore.projectName,
        Key: designCore.V1DiagramTruth.overallReadiness,
        Value: `${designCore.V1DiagramTruth.renderNodeCount} backend render nodes / ${designCore.V1DiagramTruth.renderEdgeCount} backend render edges`,
        Notes: `Contract ${designCore.V1DiagramTruth.contract} | Backend-authored ${designCore.V1DiagramTruth.backendAuthored ? "yes" : "no"} | Node ID gaps ${designCore.V1DiagramTruth.nodesWithoutBackendObjectId} | Edge lineage gaps ${designCore.V1DiagramTruth.edgesWithoutRelatedObjects}`,
      });
      for (const mode of designCore.V1DiagramTruth.modeContracts) {
        rows.push({
          Section: "V1 Diagram Mode Contracts",
          Scope: mode.mode,
          Name: mode.purpose,
          Key: `${mode.status} | ${mode.readinessImpact}`,
          Value: `${mode.evidenceCount} evidence item(s)`,
          Notes: `Required evidence: ${joinCsvList(mode.requiredBackendEvidence, "none")}`,
        });
      }
      for (const finding of designCore.V1DiagramTruth.findings) {
        rows.push({
          Section: "V1 Diagram Findings",
          Scope: joinCsvList(finding.affectedRenderIds, "project"),
          Name: finding.title,
          Key: `${finding.severity} | ${finding.code}`,
          Value: finding.detail,
          Notes: finding.remediation,
        });
      }
    }


    if (designCore.V1PlatformBomFoundation) {
      rows.push({ Section: "V1 Platform/BOM Foundation", Scope: "Project", Name: designCore.projectName, Key: designCore.V1PlatformBomFoundation.overallReadiness, Value: `${designCore.V1PlatformBomFoundation.rowCount} BOM row(s) / ${designCore.V1PlatformBomFoundation.requirementDriverCount} requirement driver(s)`, Notes: `Contract ${designCore.V1PlatformBomFoundation.contract} | Authority ${designCore.V1PlatformBomFoundation.procurementAuthority} | Source ${designCore.V1PlatformBomFoundation.sourceOfTruthLevel} | Placeholder rows ${designCore.V1PlatformBomFoundation.placeholderRowCount}` });
      for (const bomRow of designCore.V1PlatformBomFoundation.rows) rows.push({ Section: "V1 BOM Rows", Scope: bomRow.category, Name: bomRow.item, Key: `${bomRow.confidence} | ${bomRow.readinessImpact}`, Value: `${bomRow.quantity} ${bomRow.unit}`, Notes: `Basis: ${bomRow.calculationBasis} | Requirements: ${joinCsvList(bomRow.sourceRequirementIds, "none")} | Review: ${bomRow.manualReviewNote}` });
      for (const driver of designCore.V1PlatformBomFoundation.requirementDrivers) rows.push({ Section: "V1 BOM Requirement Drivers", Scope: driver.requirementId, Name: driver.requirementId, Key: driver.readinessImpact, Value: driver.value, Notes: `${driver.evidence} Rows: ${joinCsvList(driver.affectedRows, "none")}` });
      for (const finding of designCore.V1PlatformBomFoundation.findings) rows.push({ Section: "V1 BOM Findings", Scope: joinCsvList(finding.affectedRows, "project"), Name: finding.title, Key: `${finding.severity} | ${finding.code}`, Value: finding.detail, Notes: finding.remediation });
    }

    // V1_DISCOVERY_CURRENT_STATE_CONTRACT: CSV export distinguishes manual, imported, validated, conflicting, and review-required current-state evidence.
    if (designCore.V1DiscoveryCurrentState) {
      rows.push({ Section: "V1 Discovery/Current-State", Scope: "Project", Name: designCore.projectName, Key: designCore.V1DiscoveryCurrentState.overallReadiness, Value: `${designCore.V1DiscoveryCurrentState.areaRowCount} discovery area(s) / ${designCore.V1DiscoveryCurrentState.importTargetCount} import target(s) / ${designCore.V1DiscoveryCurrentState.taskCount} task(s)`, Notes: `Contract ${designCore.V1DiscoveryCurrentState.contract} | Authority ${designCore.V1DiscoveryCurrentState.currentStateAuthority} | Role ${designCore.V1DiscoveryCurrentState.role}` });
      for (const area of designCore.V1DiscoveryCurrentState.areaRows) rows.push({ Section: "V1 Discovery Areas", Scope: area.area, Name: area.area, Key: `${area.state} | ${area.readinessImpact}`, Value: `${area.evidenceCount} evidence line(s)`, Notes: `Required for: ${joinCsvList(area.requiredFor, "none")} | Requirements: ${joinCsvList(area.sourceRequirementIds, "none")} | Review: ${area.reviewReason}` });
      for (const target of designCore.V1DiscoveryCurrentState.importTargets) rows.push({ Section: "V1 Discovery Import Targets", Scope: target.target, Name: target.target, Key: `${target.state} | ${target.readinessImpact}`, Value: joinCsvList(target.sourceExamples, "examples not listed"), Notes: `Required for: ${joinCsvList(target.requiredFor, "none")} | Reconciliation: ${target.reconciliationNeed}` });
      for (const task of designCore.V1DiscoveryCurrentState.tasks) rows.push({ Section: "V1 Discovery Tasks", Scope: task.requirementId, Name: task.title, Key: `${task.priority} | ${task.state} | ${task.readinessImpact}`, Value: task.detail, Notes: `Targets: ${joinCsvList(task.linkedTargets, "none")} | Blockers: ${joinCsvList(task.blockers, "none")}` });
      for (const finding of designCore.V1DiscoveryCurrentState.findings) rows.push({ Section: "V1 Discovery Findings", Scope: joinCsvList([...finding.affectedAreas, ...finding.affectedImportTargets], "project"), Name: finding.title, Key: `${finding.severity} | ${finding.code}`, Value: finding.detail, Notes: finding.remediation });
    }


    // V1_AI_DRAFT_HELPER_CONTRACT: CSV export labels AI as draft-only and review-required, never authority.
    if (designCore.V1AiDraftHelper) {
      rows.push({ Section: "V1 AI Draft/Helper", Scope: "Project", Name: designCore.projectName, Key: designCore.V1AiDraftHelper.overallReadiness, Value: `${designCore.V1AiDraftHelper.aiDerivedObjectCount} AI-derived object(s) / ${designCore.V1AiDraftHelper.reviewRequiredObjectCount} review-required object(s)`, Notes: `Contract ${designCore.V1AiDraftHelper.contract} | Authority ${designCore.V1AiDraftHelper.aiAuthority} | Role ${designCore.V1AiDraftHelper.role}` });
      for (const gate of designCore.V1AiDraftHelper.gateRows) rows.push({ Section: "V1 AI Gates", Scope: gate.gateKey, Name: gate.gate, Key: gate.state, Value: gate.blocksAuthority ? "Blocks authority" : "Does not block authority", Notes: `${joinCsvList(gate.evidence, "no evidence")} | Consumer impact: ${gate.consumerImpact}` });
      for (const object of designCore.V1AiDraftHelper.draftObjectRows) rows.push({ Section: "V1 AI-Derived Objects", Scope: object.objectType, Name: object.objectLabel, Key: `${object.state} | ${object.proofStatus}`, Value: object.downstreamAuthority, Notes: `Requirements: ${joinCsvList(object.sourceRequirementIds, "none")} | Path: ${joinCsvList(object.materializationPath, "none")}` });
      for (const finding of designCore.V1AiDraftHelper.findings) rows.push({ Section: "V1 AI Findings", Scope: joinCsvList(finding.affectedObjects, "project"), Name: finding.title, Key: `${finding.severity} | ${finding.code}`, Value: finding.detail, Notes: finding.remediation });
    }

    // V1_FINAL_CROSS_ENGINE_PROOF_CONTRACT: CSV export carries final engine/scenario/release-gate proof without A+ overclaim.
    if (designCore.V1FinalProofPass) {
      rows.push({ Section: "V1 Final Proof", Scope: "Project", Name: designCore.projectName, Key: designCore.V1FinalProofPass.overallReadiness, Value: `${designCore.V1FinalProofPass.scenarioCount} scenario(s) / ${designCore.V1FinalProofPass.engineProofCount} engine proof row(s) / ${designCore.V1FinalProofPass.gateCount} release gate(s)`, Notes: `Contract ${designCore.V1FinalProofPass.contract} | Target ${designCore.V1FinalProofPass.releaseTarget} | Role ${designCore.V1FinalProofPass.role}` });
      for (const gate of designCore.V1FinalProofPass.releaseGates) rows.push({ Section: "V1 Release Gates", Scope: gate.gateKey, Name: gate.gate, Key: gate.state, Value: joinCsvList(gate.evidence, "no evidence"), Notes: gate.remediation });
      for (const scenario of designCore.V1FinalProofPass.scenarioRows) rows.push({ Section: "V1 Cross-Engine Scenarios", Scope: scenario.scenarioKey, Name: scenario.scenarioName, Key: scenario.readinessImpact, Value: joinCsvList(scenario.requirementsCovered, "none"), Notes: `Stages: ${joinCsvList(scenario.expectedEngineStages.map((stage) => `Stage ${stage}`), "none")} | Missing: ${joinCsvList(scenario.missingEvidence, "none")}` });
      for (const engine of designCore.V1FinalProofPass.engineProofRows) rows.push({ Section: "V1 Engine Proof Rows", Scope: `Stage ${engine.stage}`, Name: engine.engineKey, Key: `${engine.status} | ${engine.readinessImpact}`, Value: engine.expectedContract, Notes: `${engine.proofFocus} | Evidence: ${joinCsvList(engine.evidence, "none")} | Blockers: ${joinCsvList(engine.blockers, "none")}` });
      for (const finding of designCore.V1FinalProofPass.findings) rows.push({ Section: "V1 Findings", Scope: joinCsvList(finding.affectedItems, "project"), Name: finding.title, Key: `${finding.severity} | ${finding.code}`, Value: finding.detail, Notes: finding.remediation });
    }

    for (const finding of designCore.reportTruth.blockedFindings) {
      rows.push({
        Section: "Blocking Findings",
        Scope: finding.source,
        Name: finding.title,
        Key: finding.severity,
        Value: finding.detail,
        Notes: "Must be resolved or formally accepted before implementation approval",
      });
    }

    for (const finding of designCore.reportTruth.reviewFindings) {
      rows.push({
        Section: "Review Findings",
        Scope: finding.source,
        Name: finding.title,
        Key: finding.severity,
        Value: finding.detail,
        Notes: "Engineer review required",
      });
    }

    for (const step of designCore.reportTruth.implementationReviewQueue) {
      rows.push({
        Section: "Implementation Review Queue",
        Scope: step.stageId,
        Name: step.title,
        Key: `${step.category} | ${step.readiness} | ${step.riskLevel}`,
        Value: joinCsvList(step.blockers, "No blockers recorded"),
        Notes: `Required evidence: ${joinCsvList(step.requiredEvidence, "not modeled")} | Acceptance criteria: ${joinCsvList(step.acceptanceCriteria, "not modeled")} | Rollback intent: ${step.rollbackIntent || "not modeled"}`,
      });
    }

    for (const check of designCore.reportTruth.verificationChecks) {
      rows.push({
        Section: "Verification Matrix",
        Scope: check.verificationScope,
        Name: check.name,
        Key: `${check.checkType} | ${check.sourceEngine} | ${check.readiness}`,
        Value: check.expectedResult,
        Notes: `Required evidence: ${joinCsvList(check.requiredEvidence, "not modeled")} | Acceptance criteria: ${joinCsvList(check.acceptanceCriteria, "not modeled")} | Blocking steps: ${joinCsvList(check.blockingStepIds, "none")} | Failure impact: ${check.failureImpact}`,
      });
    }

    for (const action of designCore.reportTruth.rollbackActions) {
      rows.push({
        Section: "Rollback Actions",
        Scope: "Implementation",
        Name: action.name,
        Key: action.triggerCondition,
        Value: action.rollbackIntent,
        Notes: `Related steps: ${joinCsvList(action.relatedStepIds, "none")} | Notes: ${joinCsvList(action.notes, "review before change window")}`,
      });
    }

    for (const overlay of designCore.diagramTruth.overlaySummaries) {
      rows.push({
        Section: "Diagram Truth",
        Scope: "Overlay readiness",
        Name: overlay.label,
        Key: overlay.readiness,
        Value: String(overlay.count),
        Notes: overlay.detail,
      });
    }

    for (const hotspot of designCore.diagramTruth.hotspots) {
      rows.push({
        Section: "Diagram Truth",
        Scope: hotspot.scopeLabel,
        Name: hotspot.title,
        Key: hotspot.readiness,
        Value: hotspot.detail,
        Notes: "Backend diagram hotspot",
      });
    }

    for (const item of designCore.requirementsImpactClosure.fieldOutcomes.filter((field) => field.captured).slice(0, 60)) {
      rows.push({
        Section: "Requirement Impact Closure",
        Scope: item.category,
        Name: item.label,
        Key: item.reflectionStatus,
        Value: joinCsvList(item.concreteOutputs, "No concrete evidence recorded"),
        Notes: `Requirement key ${item.key} | Impact ${item.impact} | Visible in ${joinCsvList(item.visibleIn, "not recorded")} | Missing ${joinCsvList(item.missingEvidence, "none")}`,
      });
    }

    for (const signal of designCore.requirementsScenarioProof.signals) {
      rows.push({
        Section: "Requirement Scenario Proof",
        Scope: designCore.requirementsScenarioProof.scenarioName,
        Name: signal.label,
        Key: signal.passed ? "pass" : signal.severity,
        Value: joinCsvList(signal.evidence, "No evidence recorded"),
        Notes: `Requirement keys ${joinCsvList(signal.requirementKeys, "not linked")} | Expected ${joinCsvList(signal.expectedEvidence, "not recorded")} | Missing ${joinCsvList(signal.missingEvidence, "none")}`,
      });
    }

    if (designCore.V1RequirementsClosure) {
      rows.push({
        Section: "V1 Requirements Closure",
        Scope: "Project",
        Name: designCore.projectName,
        Key: designCore.V1RequirementsClosure.contractVersion,
        Value: `${designCore.V1RequirementsClosure.fullPropagatedCount} full / ${designCore.V1RequirementsClosure.partialPropagatedCount} partial / ${designCore.V1RequirementsClosure.reviewRequiredCount} review / ${designCore.V1RequirementsClosure.blockedCount} blocked`,
        Notes: `Missing consumers ${designCore.V1RequirementsClosure.missingConsumerCount}; active requirements ${designCore.V1RequirementsClosure.activeRequirementCount}`,
      });

      for (const item of designCore.V1RequirementsClosure.closureMatrix.filter((field) => field.active || field.consumerCoverage.captured).slice(0, 80)) {
        rows.push({
          Section: "V1 Requirements Closure",
          Scope: item.category,
          Name: item.label,
          Key: item.lifecycleStatus,
          Value: joinCsvList(item.actualAffectedEngines, "No actual consumers recorded"),
          Notes: `Requirement key ${item.key} | readiness ${item.readinessImpact} | missing ${joinCsvList(item.missingConsumers, "none")} | evidence ${joinCsvList(item.evidence, "none")}`,
        });
      }

      for (const scenario of designCore.V1RequirementsClosure.goldenScenarioClosures.filter((item) => item.relevant)) {
        rows.push({
          Section: "V1 Golden Scenario Closure",
          Scope: scenario.id,
          Name: scenario.label,
          Key: scenario.lifecycleStatus,
          Value: joinCsvList(scenario.requiredRequirementKeys, "No keys recorded"),
          Notes: `Blocking ${joinCsvList(scenario.blockingRequirementKeys, "none")} | Review ${joinCsvList(scenario.reviewRequirementKeys, "none")} | Missing ${joinCsvList(scenario.missingRequirementKeys, "none")}`,
        });
      }
    }


    if (designCore.V1CidrAddressingTruth) {
      const V1 = designCore.V1CidrAddressingTruth;
      rows.push({
        Section: "V1 CIDR Addressing Truth",
        Scope: "Project",
        Name: designCore.projectName,
        Key: V1.contractVersion,
        Value: `${V1.validSubnetCount} valid / ${V1.invalidSubnetCount} invalid / ${V1.undersizedSubnetCount} undersized / ${V1.gatewayIssueCount} gateway issue(s)`,
        Notes: `Requirement addressing gaps ${V1.requirementAddressingGapCount}; deterministic proposals ${V1.deterministicProposalCount}; blocked proposals ${V1.blockedProposalCount}`,
      });

      for (const item of V1.requirementAddressingMatrix.filter((field) => field.active).slice(0, 80)) {
        rows.push({
          Section: "V1 Requirement Addressing Matrix",
          Scope: item.readinessImpact,
          Name: item.requirementKey,
          Key: item.affectedRoles.join(", "),
          Value: joinCsvList(item.materializedAddressingEvidence, "No addressing evidence recorded"),
          Notes: `Source value ${item.sourceValue} | Missing ${joinCsvList(item.missingAddressingEvidence, "none")} | Expected ${item.expectedAddressingImpact}`,
        });
      }

      for (const row of V1.addressingTruthRows.slice(0, 120)) {
        rows.push({
          Section: "V1 Addressing Row Truth",
          Scope: row.siteName,
          Name: `VLAN ${row.vlanId} ${row.vlanName}`,
          Key: row.readinessImpact,
          Value: `${row.canonicalSubnetCidr || row.sourceSubnetCidr} / proposed ${row.proposedSubnetCidr || "none"}`,
          Notes: `Role ${row.role}; capacity ${row.capacityState}; gateway ${row.gatewayState}; blockers ${joinCsvList(row.blockers, "none")}`,
        });
      }
    }

    if (designCore.V1EnterpriseIpamTruth) {
      const V1 = designCore.V1EnterpriseIpamTruth;
      rows.push({
        Section: "V1 Enterprise IPAM Durable Authority",
        Scope: "Project",
        Name: designCore.projectName,
        Key: V1.contractVersion,
        Value: `${V1.overallReadiness} | ${V1.durablePoolCount} pools / ${V1.durableAllocationCount} allocations / ${V1.approvedAllocationCount} approved`,
        Notes: `Proposal-only ${V1.engine1ProposalOnlyCount}; blockers ${V1.conflictBlockerCount}; review ${V1.reviewRequiredCount}; stale ${V1.staleAllocationCount}; hash ${V1.currentInputHash}`,
      });

      for (const row of V1.reconciliationRows.slice(0, 120)) {
        rows.push({
          Section: "V1 Addressing/IPAM Reconciliation",
          Scope: row.siteName,
          Name: `VLAN ${row.vlanId} ${row.vlanName}`,
          Key: row.reconciliationState,
          Value: `${row.engine1PlannedCidr} -> ${row.engine2AllocationCidr || "proposal-only"}`,
          Notes: `Readiness ${row.readinessImpact}; pool ${row.engine2PoolName || "none"}; route domain ${row.routeDomainKey}; blockers ${joinCsvList(row.blockers, "none")}; review ${joinCsvList(row.reviewReasons, "none")}`,
        });
      }

      for (const item of V1.requirementIpamMatrix.filter((field) => field.active).slice(0, 80)) {
        rows.push({
          Section: "V1 Requirement-to-IPAM Matrix",
          Scope: item.readinessImpact,
          Name: item.requirementKey,
          Key: `${item.approvedAllocationCount} approved / ${item.durableCandidateCount} candidate / ${item.engine1ProposalOnlyCount} proposal-only`,
          Value: joinCsvList(item.materializedIpamEvidence, "No IPAM evidence recorded"),
          Notes: `Missing ${joinCsvList(item.missingIpamEvidence, "none")} | Expected ${item.expectedIpamImpact}`,
        });
      }

      for (const finding of V1.conflictRows.slice(0, 80)) {
        rows.push({
          Section: "V1 Enterprise IPAM Findings",
          Scope: finding.severity,
          Name: finding.code,
          Key: finding.readinessImpact,
          Value: finding.title,
          Notes: finding.detail,
        });
      }
    }



    if (designCore.V1DesignCoreOrchestrator) {
      const V1 = designCore.V1DesignCoreOrchestrator;
      rows.push({
        Section: "V1 Design-Core Orchestrator Contract",
        Scope: "Project",
        Name: designCore.projectName,
        Key: V1.contractVersion,
        Value: `${V1.overallReadiness} | ${V1.presentSnapshotSectionCount}/${V1.requiredSnapshotSectionCount} sections present`,
        Notes: `Boundary findings ${V1.boundaryFindings.length}; missing sections ${V1.missingSnapshotSectionCount}; frontend truth risks ${V1.frontendIndependentTruthRiskCount}; role ${V1.orchestratorRole}`,
      });

      for (const row of V1.sectionRows.slice(0, 120)) {
        rows.push({
          Section: "V1 Snapshot Boundary Sections",
          Scope: row.readiness,
          Name: row.label,
          Key: row.snapshotPath,
          Value: `${row.ownerEngine} | ${row.sourceType} | ${row.itemCount} item(s)`,
          Notes: `Consumers ${joinCsvList(row.downstreamConsumers, "none")}; proof ${joinCsvList(row.proofGates, "none")}; report ${row.reportImpact}; diagram ${row.diagramImpact}`,
        });
      }

      for (const edge of V1.dependencyEdges.slice(0, 80)) {
        rows.push({
          Section: "V1 Orchestrator Dependency Edges",
          Scope: edge.required ? "required" : "optional",
          Name: edge.relationship,
          Key: `${edge.sourceSectionKey} -> ${edge.targetSectionKey}`,
          Value: joinCsvList(edge.evidence, "No evidence recorded"),
          Notes: edge.id,
        });
      }

      for (const finding of V1.boundaryFindings.slice(0, 80)) {
        rows.push({
          Section: "V1 Boundary Findings",
          Scope: finding.severity,
          Name: finding.code,
          Key: finding.readinessImpact,
          Value: finding.title,
          Notes: `${finding.affectedSnapshotPath} | ${finding.detail}`,
        });
      }
    }



    if (designCore.V1StandardsRulebookControl) {
      const V1 = designCore.V1StandardsRulebookControl;
      rows.push({
        Section: "V1 Standards Rulebook Contract",
        Scope: "Project",
        Name: designCore.projectName,
        Key: V1.contractVersion,
        Value: `${V1.overallReadiness} | ${V1.passRuleCount} pass / ${V1.blockingRuleCount} block / ${V1.reviewRuleCount} review / ${V1.warningRuleCount} warn`,
        Notes: `Applicable ${V1.applicableRuleCount}/${V1.ruleCount}; requirement-activated ${V1.requirementActivatedRuleCount}; exceptions required ${V1.exceptionRequiredRuleCount}; role ${V1.rulebookRole}`,
      });

      for (const row of V1.ruleRows.slice(0, 120)) {
        rows.push({
          Section: "V1 Active Standards Rules",
          Scope: row.enforcementState,
          Name: row.ruleId,
          Key: row.severity,
          Value: row.title,
          Notes: `Applicability: ${row.applicabilityCondition}; engines: ${joinCsvList(row.affectedEngines, "none")}; requirements: ${joinCsvList(row.requirementRelationships, "none")}; remediation: ${row.remediationGuidance}; exception: ${row.exceptionPolicy}`,
        });
      }

      for (const activation of V1.requirementActivations.slice(0, 80)) {
        rows.push({
          Section: "V1 Requirement-to-Standards Activation",
          Scope: activation.readinessImpact,
          Name: activation.requirementKey,
          Key: activation.lifecycleStatus,
          Value: joinCsvList(activation.activatedRuleIds, "No standards rule activated"),
          Notes: `Blocking ${joinCsvList(activation.blockingRuleIds, "none")}; review ${joinCsvList(activation.reviewRuleIds, "none")}; evidence ${joinCsvList(activation.evidence, "none")}`,
        });
      }

      for (const finding of V1.findings.slice(0, 80)) {
        rows.push({
          Section: "V1 Standards Findings",
          Scope: finding.severity,
          Name: finding.ruleId,
          Key: finding.code,
          Value: finding.title,
          Notes: `${finding.detail}; remediation ${finding.remediationGuidance}`,
        });
      }
    }


    if (designCore.V1ValidationReadiness) {
      const V1 = designCore.V1ValidationReadiness;
      rows.push({
        Section: "V1 Validation Readiness Authority",
        Scope: "Project",
        Name: designCore.projectName,
        Key: V1.contractVersion,
        Value: `${V1.overallReadiness} | ${V1.blockingFindingCount} block / ${V1.reviewRequiredFindingCount} review / ${V1.warningFindingCount} warning`,
        Notes: `Implementation gate ${V1.validationGateAllowsImplementation ? "allowed" : "blocked/review-gated"}; role ${V1.validationRole}; findings ${V1.findingCount}`,
      });

      for (const row of V1.coverageRows.slice(0, 120)) {
        rows.push({
          Section: "V1 Validation Coverage Domains",
          Scope: row.readiness,
          Name: row.domain,
          Key: row.sourceSnapshotPath,
          Value: `${row.blockerCount} block / ${row.reviewRequiredCount} review / ${row.warningCount} warning / ${row.passedCount} passed`,
          Notes: joinCsvList(row.evidence, "No evidence recorded"),
        });
      }

      for (const gate of V1.requirementGateRows.slice(0, 120)) {
        rows.push({
          Section: "V1 Requirement Readiness Gates",
          Scope: gate.readinessImpact,
          Name: gate.requirementKey,
          Key: gate.lifecycleStatus,
          Value: `Rules ${joinCsvList(gate.validationRuleCodes, "none")}`,
          Notes: `Missing consumers ${joinCsvList(gate.missingConsumers, "none")}; expected engines ${joinCsvList(gate.expectedAffectedEngines, "none")}; evidence ${joinCsvList(gate.evidence, "none")}`,
        });
      }

      for (const finding of V1.findings.slice(0, 120)) {
        rows.push({
          Section: "V1 Validation Findings",
          Scope: finding.category,
          Name: finding.ruleCode,
          Key: finding.sourceEngine,
          Value: finding.title,
          Notes: `${finding.detail}; remediation ${finding.remediation}; frontend ${finding.frontendImpact}; report ${finding.reportImpact}; diagram ${finding.diagramImpact}`,
        });
      }
    }
    if (designCore.V1ReadinessLadder) {
      const V1 = designCore.V1ReadinessLadder;
      rows.push({
        Section: "V1 Central Readiness Ladder",
        Scope: V1.overallReadiness,
        Name: designCore.projectName,
        Key: V1.contract,
        Value: `Implementation allowed ${V1.implementationOutputAllowed ? "yes" : "no"}; planning allowed ${V1.planningOutputAllowed ? "yes" : "no"}`,
        Notes: `Report may claim implementation-ready ${V1.reportMayClaimImplementationReady ? "yes" : "no"}; diagram clean production truth ${V1.diagramMayShowCleanProductionTruth ? "yes" : "no"}; AI authority ${V1.aiMayProduceAuthority ? "yes" : "no"}`,
      });
      for (const reason of V1.reasons.slice(0, 120)) {
        rows.push({
          Section: "V1 Readiness Ladder Reasons",
          Scope: reason.severity,
          Name: reason.code,
          Key: reason.sourcePath,
          Value: reason.readinessImpact,
          Notes: reason.detail,
        });
      }
    }

    if (designCore.V1NetworkObjectModel) {
      const V1 = designCore.V1NetworkObjectModel;
      rows.push({ Section: "V1 Network Object Model Truth", Scope: V1.overallReadiness, Name: designCore.projectName, Key: V1.contract, Value: `${V1.objectCount} objects / ${V1.metadataGapObjectCount} metadata gaps / ${V1.requirementLineageGapCount} lineage gaps`, Notes: `Ready ${V1.implementationReadyObjectCount}; review ${V1.implementationReviewObjectCount}; blocked ${V1.implementationBlockedObjectCount}` });
      for (const object of V1.objectLineage.slice(0, 180)) rows.push({ Section: "V1 Object Lineage Rows", Scope: object.implementationReadiness, Name: object.displayName, Key: `${object.objectType} | ${object.objectRole} | ${object.truthState}`, Value: `Source ${object.sourceType}; confidence ${object.confidence}; proof ${object.proofStatus}`, Notes: `Requirements ${joinCsvList(object.sourceRequirementIds, "none")}; source objects ${joinCsvList(object.sourceObjectIds, "none")}; missing metadata ${joinCsvList(object.missingMetadataFields, "none")}` });
      for (const row of V1.requirementObjectLineage.slice(0, 180)) rows.push({ Section: "V1 Requirement Object Lineage", Scope: row.readinessImpact, Name: row.sourceKey, Key: row.lifecycleStatus, Value: `Actual ${joinCsvList(row.actualObjectTypes, "none")}; missing ${joinCsvList(row.missingObjectTypes, "none")}`, Notes: `Requirement ${row.requirementId}; objects ${joinCsvList(row.actualObjectIds, "none")}` });
      for (const finding of V1.findings.slice(0, 120)) rows.push({ Section: "V1 Network Object Findings", Scope: finding.severity, Name: finding.code, Key: finding.readinessImpact, Value: finding.title, Notes: `${finding.detail}; remediation ${finding.remediation}` });
    }

    if (designCore.V1DesignGraph) {
      const V1 = designCore.V1DesignGraph;
      rows.push({ Section: "V1 Design Graph Dependency Integrity", Scope: V1.overallReadiness, Name: designCore.projectName, Key: V1.contract, Value: `${V1.graphNodeCount} nodes / ${V1.graphEdgeCount} edges / ${V1.objectCoverageGapCount} object graph gaps`, Notes: `Requirement paths ready ${V1.requirementPathReadyCount}; review ${V1.requirementPathReviewCount}; blocked ${V1.requirementPathBlockedCount}` });
      for (const path of V1.requirementDependencyPaths.slice(0, 180)) rows.push({ Section: "V1 Requirement Dependency Paths", Scope: path.readinessImpact, Name: path.sourceKey, Key: path.lifecycleStatus, Value: `Objects ${joinCsvList(path.actualObjectIds, "none")}; graph nodes ${joinCsvList(path.actualGraphNodeIds, "none")}`, Notes: `Relationships ${joinCsvList(path.actualRelationshipTypes, "none")}; missing graph ${joinCsvList(path.missingGraphNodeIds, "none")}; missing consumers ${joinCsvList(path.missingConsumerSurfaces, "none")}` });
      for (const object of V1.objectCoverage.slice(0, 180)) rows.push({ Section: "V1 Object Graph Coverage", Scope: object.dependencyState, Name: object.displayName, Key: `${object.objectType} | ${object.truthState}`, Value: `Nodes ${joinCsvList(object.graphNodeIds, "none")}; relationships ${joinCsvList(object.relationshipTypes, "none")}`, Notes: `Requirements ${joinCsvList(object.sourceRequirementIds, "none")}; consumers ${joinCsvList(object.consumerSurfaces, "none")}; missing ${joinCsvList(object.missingConsumerSurfaces, "none")}` });
      for (const finding of V1.findings.slice(0, 120)) rows.push({ Section: "V1 Design Graph Findings", Scope: finding.severity, Name: finding.code, Key: finding.readinessImpact, Value: finding.title, Notes: `${finding.detail}; remediation ${finding.remediation}` });
    }

    if (designCore.V1RoutingSegmentation) {
      const V1 = designCore.V1RoutingSegmentation;
      rows.push({ Section: "V1 Routing Segmentation Protocol-Aware Planning", Scope: V1.overallReadiness, Name: designCore.projectName, Key: V1.contract, Value: `${V1.protocolIntentCount} protocol rows / ${V1.simulationUnavailableCount} simulation-unavailable / ${V1.activeRequirementRoutingGapCount} requirement gaps`, Notes: `Role ${V1.role}; routing ${V1.routingReadiness}; segmentation ${V1.segmentationReadiness}` });
      for (const row of V1.protocolIntents.slice(0, 180)) rows.push({ Section: "V1 Protocol Intent Rows", Scope: row.readinessImpact, Name: row.name, Key: `${row.category} | ${row.controlState}`, Value: `Routes ${joinCsvList(row.sourceRouteIntentIds, "none")}; objects ${joinCsvList(row.sourceObjectIds, "none")}`, Notes: `Requirements ${joinCsvList(row.requirementKeys, "none")}; evidence ${joinCsvList(row.evidence, "none")}; review ${row.reviewReason ?? "none"}` });
      for (const row of V1.requirementRoutingMatrix.slice(0, 120)) rows.push({ Section: "V1 Requirement Routing Matrix", Scope: row.readinessImpact, Name: row.requirementLabel, Key: `${row.requirementKey} | active=${row.active}`, Value: `Actual ${joinCsvList(row.actualProtocolIntentIds, "none")}; missing ${joinCsvList(row.missingProtocolCategories, "none")}`, Notes: `Expected ${joinCsvList(row.expectedProtocolCategories, "none")}; evidence ${joinCsvList(row.evidence, "none")}` });
      for (const finding of V1.findings.slice(0, 120)) rows.push({ Section: "V1 Routing Findings", Scope: finding.severity, Name: finding.code, Key: finding.readinessImpact, Value: finding.title, Notes: `${finding.detail}; remediation ${finding.remediation}` });
    }

    if (designCore.V1SecurityPolicyFlow) {
      const V1 = designCore.V1SecurityPolicyFlow;
      rows.push({ Section: "V1 Security Policy Flow", Item: "Readiness", Value: String(V1.overallReadiness), Notes: `${V1.flowConsequenceCount} flow consequence(s); ${V1.zonePolicyReviewCount} zone policy row(s); ${V1.activeRequirementSecurityGapCount} active requirement gap(s)` });
      for (const row of V1.requirementSecurityMatrix ?? []) rows.push({ Section: "V1 Requirement Security Matrix", Item: row.requirementLabel, Value: String(row.readinessImpact), Notes: `${row.active ? "active" : "inactive"}; missing=${(row.missingSecurityCategories ?? []).join(", ") || "none"}; flows=${(row.actualFlowRequirementIds ?? []).join(", ") || "none"}` });
      for (const row of V1.flowConsequences ?? []) rows.push({ Section: "V1 Flow Consequences", Item: row.name, Value: String(row.V1PolicyState), Notes: `${row.sourceZoneName} -> ${row.destinationZoneName}; expected=${row.expectedAction}; ${row.reviewReason ?? row.consequenceSummary}` });
      for (const row of V1.zonePolicyReviews ?? []) rows.push({ Section: "V1 Zone Policy Matrix", Item: `${row.sourceZoneName} -> ${row.destinationZoneName}`, Value: String(row.V1PolicyState), Notes: `${row.defaultPosture}; rules=${row.explicitPolicyRuleIds.length}; flows=${row.requiredFlowIds.length}; nat=${row.natRequiredFlowIds.length}` });
      for (const row of V1.natReviews ?? []) rows.push({ Section: "V1 NAT Review", Item: row.natRuleName, Value: String(row.V1PolicyState), Notes: `${row.sourceZoneName} -> ${row.destinationZoneName ?? "review"}; missing=${row.missingFlowRequirementIds.join(", ") || "none"}` });
      for (const finding of V1.findings ?? []) rows.push({ Section: "V1 Security Findings", Item: finding.code, Value: String(finding.readinessImpact), Notes: `${finding.title}: ${finding.remediation}` });
    }

    if (designCore.vendorNeutralImplementationTemplates) {
      const templateModel = designCore.vendorNeutralImplementationTemplates;
      rows.push({
        Section: "Vendor-Neutral Implementation Templates",
        Scope: "Project",
        Name: designCore.projectName,
        Key: "Template summary",
        Value: `${templateModel.summary.templateCount} templates / ${templateModel.summary.groupCount} groups / readiness ${templateModel.summary.templateReadiness}`,
        Notes: `Vendor-specific commands ${templateModel.summary.vendorSpecificCommandCount}; command generation allowed ${templateModel.summary.commandGenerationAllowed ? "yes" : "no"}`,
      });

      for (const group of templateModel.groups) {
        rows.push({
          Section: "Vendor-Neutral Template Groups",
          Scope: group.stageId,
          Name: group.name,
          Key: group.readiness,
          Value: group.objective,
          Notes: `Templates: ${joinCsvList(group.templateIds, "none")} | Exit criteria: ${joinCsvList(group.exitCriteria, "review required")}`,
        });
      }

      for (const template of templateModel.templates) {
        rows.push({
          Section: "Vendor-Neutral Templates",
          Scope: template.stageName,
          Name: template.title,
          Key: `${template.category} | ${template.readiness} | ${template.riskLevel}`,
          Value: template.vendorNeutralIntent,
          Notes: `Command generation allowed: ${template.commandGenerationAllowed ? "yes" : "no"} | Pre-checks: ${joinCsvList(template.preChecks, "review required")} | Neutral actions: ${joinCsvList(template.neutralActions, "review required")}`,
        });
        rows.push({
          Section: "Vendor-Neutral Template Evidence",
          Scope: template.title,
          Name: "Verification and rollback evidence",
          Key: template.readiness,
          Value: `Verification: ${joinCsvList(template.verificationEvidence, "not linked")}`,
          Notes: `Rollback: ${joinCsvList(template.rollbackEvidence, "not linked")} | Blockers: ${joinCsvList(template.blockerReasons, "none recorded")} | Blast radius: ${joinCsvList(template.blastRadius, "not modeled")}`,
        });
      }

      for (const boundary of templateModel.proofBoundary) {
        rows.push({ Section: "Vendor-Neutral Template Proof Boundary", Scope: "Project", Name: "Proof boundary", Key: "Boundary", Value: boundary, Notes: templateModel.safetyNotice });
      }
    }
    const proofBoundaryRows = [
      ["Modeled", `Backend object counts: ${designCore.networkObjectModel.devices.length} devices, ${designCore.networkObjectModel.interfaces.length} interfaces, ${designCore.networkObjectModel.links.length} links, ${designCore.networkObjectModel.routeDomains.length} route domains, ${designCore.networkObjectModel.securityZones.length} security zones.`],
      ["Inferred", "Routing, security, NAT, implementation readiness, and diagram overlays are inferred from saved planning inputs, modeled objects, graph edges, and backend engine findings."],
      ["Proposed", `Addressing proposals: ${designCore.proposedRows.length}; transit rows: ${designCore.transitPlan.length}; loopback rows: ${designCore.loopbackPlan.length}; implementation steps: ${designCore.networkObjectModel.implementationPlan.steps.length}.`],
      ["Not proven", "Live device state, cabling, vendor CLI syntax, production firewall rulebase, provider WAN behavior, and change-window operational success are not proven by this export."],
      ["Engineer review", "Engineer review is required for blockers, review findings, verification evidence, rollback proof, and vendor-specific implementation details."],
    ];

    for (const [boundary, value] of proofBoundaryRows) {
      rows.push({ Section: "Proof Boundary / Limitations", Scope: "Project", Name: boundary, Key: boundary, Value: value, Notes: "V1 export truth boundary" });
    }

    for (const limitation of designCore.reportTruth.limitations) {
      rows.push({ Section: "Proof Boundary / Limitations", Scope: "Report truth", Name: "Limitation", Key: "Limitation", Value: limitation, Notes: "Backend truth limitation" });
    }
  }

  for (const item of exportContext.validations) {
    const narrative = validationNarrative(item);
    rows.push({ Section: "Validation", Scope: item.entityType ?? "PROJECT", Name: item.title, Key: item.severity, Value: narrative.issue, Notes: `${narrative.impact} Recommendation: ${narrative.recommendation} Rule: ${item.ruleCode ?? ""}` });
  }

  for (const item of exportContext.platformHighlights) {
    rows.push({ Section: "Platform/BOM", Scope: "Project", Name: exportContext.project.name, Key: "Profile", Value: item, Notes: "Review before procurement" });
  }

  for (const item of exportContext.discoveryHighlights) {
    rows.push({ Section: "Discovery", Scope: "Project", Name: exportContext.project.name, Key: "Highlight", Value: item, Notes: "Current-state input" });
  }

  return rows;
}
export type { ProfessionalReport, ReportMetadata, ReportSection, ReportTable, ReportVisualSnapshot } from "./export.types.js";
