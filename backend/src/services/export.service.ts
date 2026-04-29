import { prisma } from "../db/prisma.js";
import { getDesignCoreSnapshotForExport } from "./designCore.service.js";
import { applyBackendDesignCoreToReport } from "./exportDesignCoreReport.service.js";
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
  const environment = asString(project.environmentType, "custom");
  const planningFor = asString(requirements.planningFor);
  const primaryGoal = asString(requirements.primaryGoal);
  const serverPlacement = asString(requirements.serverPlacement);
  const internetModel = asString(requirements.internetModel);
  const routingPosture = siteCount > 1 ? "multi-site summarized routed design" : "single-site routed access design";

  return {
    project,
    requirements,
    discovery,
    platform,
    sites,
    validations,
    siteCount,
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
    exportContext.siteCount > 1
      ? "a multi-site architecture with per-site addressing boundaries, summarized routing, and shared design standards"
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
    `${exportContext.project.name} is presented as a ${projectEnvironment.toLowerCase()} technical design report covering ${exportContext.siteCount || 0} site${exportContext.siteCount === 1 ? "" : "s"}, ${exportContext.vlanCount || 0} current addressing row${exportContext.vlanCount === 1 ? "" : "s"}, and a structured package of architecture, security, routing, implementation, and platform-planning outputs. The report is intended to serve as a review-ready planning document rather than a raw export of application screens.`,
    `The current design direction follows ${architecturePattern}. This approach was selected to keep the package supportable for implementation teams while still preserving segmentation, growth headroom, and clearer operational boundaries before production configuration work begins.`,
    exportContext.errors.length > 0
      ? `The present validation posture includes ${exportContext.errors.length} error-level blocker${exportContext.errors.length === 1 ? "" : "s"} and ${exportContext.warnings.length} warning${exportContext.warnings.length === 1 ? "" : "s"}. Those items should be resolved or explicitly accepted before the package is used as an implementation approval document.`
      : exportContext.warnings.length > 0
        ? `The current design contains ${exportContext.warnings.length} warning${exportContext.warnings.length === 1 ? "" : "s"} but no active error-level blockers. The package can be reviewed professionally now, although the warning items should still be addressed during technical sign-off.`
        : "The current design is in a clean validation state with no active error-level or warning-level blockers recorded in the latest validation cycle.",
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
      maybeBullet("Current project phase", exportContext.requirements.projectPhase),
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

  const hldBullets = [
    `Architecture direction: ${architecturePattern}`,
    `Base private range: ${asString(exportContext.project.basePrivateRange) || "working range still needs explicit confirmation"}`,
    `Site count in scope: ${exportContext.siteCount}`,
    `Logical security domains in scope: ${humanJoin(exportContext.securityZones) || "to be finalized"}`,
    exportContext.internetModel ? `Internet or edge posture: ${exportContext.internetModel}` : null,
    exportContext.serverPlacement ? `Server or service placement: ${exportContext.serverPlacement}` : null,
    isEnabled(exportContext.requirements.dualIsp)
      ? `Resilience posture: ${asString(exportContext.requirements.resilienceTarget, "dual-path or failover-aware design")}`
      : `Resilience posture: ${asString(exportContext.requirements.resilienceTarget, "single-primary-path posture pending further review")}`,
  ].filter(Boolean) as string[];

  const hldSection: ReportSection = {
    title: "4. High-Level Design Overview",
    paragraphs: [
      `The proposed high-level design follows ${architecturePattern}. For the current scope, that means the design package is aiming for clear trust boundaries, manageable operational control, and an addressing hierarchy that can grow without forcing redesign after the first implementation cycle.`,
      exportContext.siteCount > 1
        ? "Because multiple sites are present, the architecture assumes a parent organizational block, per-site summary blocks, and transport logic that can be summarized cleanly at site boundaries. This reduces route sprawl and makes later expansion easier to reason about."
        : "Because the saved scope currently centers on a single site, the architecture stays intentionally compact. The priority is to establish good segmentation, disciplined gateway placement, and supportable controls before introducing complexity that the environment does not yet require.",
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
    title: "5. Security Architecture and Segmentation Model",
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
    title: "6. Logical Design and Addressing Plan",
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
    title: "7. Routing, Switching, and Transport Intent",
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
    title: "8. Implementation, Testing, and Validation Strategy",
    paragraphs: [
      "Implementation should proceed in controlled phases so that addressing, gateway ownership, service reachability, security boundary enforcement, and rollback conditions can be verified without expanding the blast radius of each change window.",
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
    title: "11. Engineer Review Checklist",
    paragraphs: [
      "The export should be treated as a design review package, not a replacement for implementation engineering. The checklist below captures the minimum review gates before the plan becomes a change-ready implementation artifact.",
      ENGINEER_REVIEW_STATEMENT,
    ],
    bullets: ENGINEER_REVIEW_CHECKLIST,
  };

  const platformRows = exportContext.platformHighlights.map((line) => [line, "Review during final engineering and procurement alignment"]);

  const platformSection: ReportSection = {
    title: "9. Platform Profile and Bill of Materials Foundation",
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
    title: "10. Risks and Open Review Items",
    paragraphs: [
      "Professional design packages should make uncertainty visible rather than bury it. The items below are not necessarily design failures; they are remaining risks or review points that should be acknowledged before the package is treated as change-ready.",
    ],
    bullets: [
      ...exportContext.openItems,
      ...exportContext.warnings.slice(0, 6).map((item) => `Validation review item: ${item.title} — ${item.message}`),
    ],
  };

  const conclusionSection: ReportSection = {
    title: "12. Conclusion and Handoff Notes",
    paragraphs: [
      ENGINEER_REVIEW_STATEMENT,
      `${exportContext.project.name} now has a structured network design package that translates saved requirements and synthesized planning data into a more formal handoff document. The report provides enough structure for technical review, addressing confirmation, security discussion, routing review, implementation planning, and platform alignment without pretending that the remaining open items do not exist.`,
      exportContext.errors.length > 0
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
    reportVersion: "Version 0.93",
    revisionStatus: exportContext.errors.length > 0 ? "Draft - blockers present" : exportContext.warnings.length > 0 ? "Review draft" : "Review-ready draft",
    documentOwner: asString(exportContext.project.ownerName, "SubnetOps project owner"),
    approvalStatus: exportContext.errors.length > 0 ? "Not ready for approval" : "Ready for technical review",
    projectPhase: asString(exportContext.requirements.projectPhase, "To be confirmed"),
    planningFocus: asString(exportContext.planningFor, "To be confirmed"),
    primaryObjective: asString(exportContext.primaryGoal, "To be confirmed"),
    generatedFrom: "Saved project records, backend design-core snapshot, deterministic addressing checks, and assumption-based recommendations",
  };

  const visualSnapshot: ReportVisualSnapshot = {
    metrics: [
      ["Sites in scope", String(exportContext.siteCount)],
      ["Addressing rows", String(exportContext.vlanCount)],
      ["Security zones", String(exportContext.securityZones.length)],
      ["Validation blockers", String(exportContext.errors.length)],
      ["Validation warnings", String(exportContext.warnings.length)],
      ["Base range", asString(exportContext.project.basePrivateRange, "Working range pending confirmation")],
    ],
    topologyRows: [
      ["Edge / Internet", exportContext.internetModel || "Single internet edge pending refinement", exportContext.siteCount > 1 ? "Prefer explicit WAN summaries between sites" : "Keep the routed edge intentionally simple"],
      ["Core / Distribution", exportContext.siteCount > 1 ? "Primary site coordinates shared services and route summaries" : "Collapsed core/access edge with local Layer 3 gateways", "Do not let Layer 2 sprawl undermine segmentation"],
      ["Services", exportContext.serverPlacement || "Small centralized service block", "Keep shared services separated from users and guest access"],
      ["Security", humanJoin(exportContext.securityZones) || "Users and services", "Apply default-deny principles between unlike trust boundaries"],
    ],
  };

  return {
    title: exportContext.project.reportHeader || `${exportContext.project.name} Technical Design Report`,
    subtitle: `${exportContext.project.name} — Professional Network Planning Package`,
    generatedAt,
    executiveSummary,
    sections: [introSection, discoverySection, planningAssumptionsSection, hldSection, securitySection, addressingSection, routingSection, implementationSection, platformSection, risksSection, engineerChecklistSection, conclusionSection],
    appendices,
    metadata: reportMetadata,
    visualSnapshot,
  } satisfies ProfessionalReport;
}

export async function composeProfessionalReportForProject(projectId: string) {
  const project = await getProjectExportData(projectId);
  const report = composeProfessionalReport(project);
  if (!project || !report) return { project, report: null };
  const designCore = await getDesignCoreSnapshotForExport(projectId);
  return { project, report: applyBackendDesignCoreToReport(report, designCore) };
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
    { Section: "Requirements", Scope: "Project", Name: exportContext.project.name, Key: "Project Phase", Value: exportContext.requirements.projectPhase ?? "", Notes: "" },
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
        Notes: `Gateway state ${row.gatewayState} | Capacity ${row.capacityState} | Required ${row.requiredUsableHosts ?? "—"} usable | Recommended ${row.recommendedPrefix ? `/${row.recommendedPrefix}` : "—"} | Role ${row.role} (${row.roleSource ?? "unknown"}/${row.roleConfidence ?? "low"}) | In site block ${row.inSiteBlock === null ? "Unknown" : row.inSiteBlock ? "Yes" : "No"} | ${row.engine1Explanation ?? row.capacityExplanation ?? row.roleEvidence ?? "Backend Engine 1 reviewed"}` ,
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
    rows.push({
      Section: "Diagram Truth",
      Scope: "Project",
      Name: designCore.projectName,
      Key: "Diagram render model summary",
      Value: `${designCore.diagramTruth.renderModel.summary.nodeCount} render nodes / ${designCore.diagramTruth.renderModel.summary.edgeCount} render edges`,
      Notes: `Modeled devices ${designCore.diagramTruth.topologySummary.deviceCount} | Interfaces ${designCore.diagramTruth.topologySummary.interfaceCount} | Links ${designCore.diagramTruth.topologySummary.linkCount} | Route domains ${designCore.diagramTruth.topologySummary.routeDomainCount} | Security zones ${designCore.diagramTruth.topologySummary.securityZoneCount} | Empty-state ${designCore.diagramTruth.emptyStateReason ?? designCore.diagramTruth.renderModel.emptyState?.reason ?? "none"}`,
    });

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
      rows.push({ Section: "Proof Boundary / Limitations", Scope: "Project", Name: boundary, Key: boundary, Value: value, Notes: "Phase 40 export truth boundary" });
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
