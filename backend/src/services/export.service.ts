import { prisma } from "../db/prisma.js";

type JsonMap = Record<string, unknown>;
type SiteWithVlans = { name: string; location?: string | null; siteCode?: string | null; defaultAddressBlock?: string | null; vlans: Array<{ vlanId: number; vlanName: string; purpose?: string | null; subnetCidr: string; gatewayIp: string; dhcpEnabled: boolean; estimatedHosts?: number | null }> };
type ValidationItem = { severity: string; title: string; message: string; entityType?: string | null; ruleCode?: string | null; createdAt?: Date | string | null };

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

export interface ReportTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ReportSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  tables?: ReportTable[];
}

export interface ReportMetadata {
  organizationName: string;
  environment: string;
  reportVersion: string;
  revisionStatus: string;
  documentOwner: string;
  approvalStatus: string;
  projectPhase?: string;
  planningFocus?: string;
  primaryObjective?: string;
  generatedFrom: string;
}

export interface ReportVisualSnapshot {
  metrics: Array<[string, string]>;
  topologyRows: string[][];
}

export interface ProfessionalReport {
  title: string;
  subtitle: string;
  generatedAt: string;
  executiveSummary: string[];
  sections: ReportSection[];
  appendices?: ReportSection[];
  metadata?: ReportMetadata;
  visualSnapshot?: ReportVisualSnapshot;
}
export interface ExportSnapshot {
  generatedAt?: string;
  project?: JsonMap;
  requirementsProfile?: JsonMap;
  validations?: ValidationItem[];
  synthesized?: JsonMap;
  discoverySummary?: JsonMap;
  platformFoundation?: JsonMap;
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

export function composeProfessionalReport(project: Awaited<ReturnType<typeof getProjectExportData>>, snapshot?: ExportSnapshot) {
  if (snapshot?.synthesized) return composeProfessionalReportFromSnapshot(snapshot);
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
      `The saved requirements presently indicate ${exportContext.primaryGoal ? `${exportContext.primaryGoal.toLowerCase()} as the main objective` : "a still-developing main design objective"}. The design engine has therefore emphasized structured segmentation, supportable gateway ownership, reviewable security boundaries, and implementation clarity rather than over-optimizing for platform-specific detail too early in the lifecycle.`,
    ],
    bullets: exportContext.discoveryHighlights,
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
    title: "3. High-Level Design Overview",
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
    title: "4. Security Architecture and Segmentation Model",
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
    title: "5. Logical Design and Addressing Plan",
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
    title: "6. Routing, Switching, and Transport Intent",
    paragraphs: [
      `The routing and switching design is currently framed as ${exportContext.routingPosture}. The package is intentionally trying to keep control-plane ownership obvious, site boundaries reviewable, and gateway behavior stable before platform-specific configuration is generated.`,
      "Switching intent should reinforce segmentation rather than hide it. Trunking, VLAN propagation, loop prevention, and first-hop placement should all be reviewed against the addressing hierarchy so that the final implementation does not undermine the logical model presented in this report.",
    ],
    bullets: routingBullets,
  };

  const validationRows = exportContext.validations.length > 0
    ? exportContext.validations.slice(0, 15).map((item) => [item.severity, item.title, item.message])
    : [["INFO", "No validation findings saved", "Run validation after changes if a fresh technical review is required."]];

  const implementationSection: ReportSection = {
    title: "7. Implementation, Testing, and Validation Strategy",
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
        headers: ["Severity", "Finding", "Review Note"],
        rows: validationRows,
      },
    ],
  };

  const platformRows = exportContext.platformHighlights.map((line) => [line, "Review during final engineering and procurement alignment"]);

  const platformSection: ReportSection = {
    title: "8. Platform Profile and Bill of Materials Foundation",
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
    title: "9. Assumptions, Risks, and Open Review Items",
    paragraphs: [
      "Professional design packages should make uncertainty visible rather than bury it. The items below are not necessarily design failures; they are the remaining assumptions or review points that should be acknowledged before the package is treated as final implementation truth.",
    ],
    bullets: [
      ...exportContext.openItems,
      ...exportContext.warnings.slice(0, 6).map((item) => `Validation review item: ${item.title} — ${item.message}`),
    ],
  };

  const conclusionSection: ReportSection = {
    title: "10. Conclusion and Handoff Notes",
    paragraphs: [
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
        "This appendix preserves the row-level addressing detail used by the synthesized design engine. It should be treated as a core implementation artifact for subnet ownership, gateway mapping, and DHCP posture.",
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
          headers: ["Severity", "Entity", "Title", "Message"],
          rows:
            exportContext.validations.length > 0
              ? exportContext.validations.map((item) => [item.severity, asString(item.entityType, "PROJECT"), item.title, item.message])
              : [["INFO", "PROJECT", "No validation results recorded", "Run validation again if a fresh review is needed."]],
        },
      ],
    },
  ];

  const reportMetadata: ReportMetadata = {
    organizationName: asString(exportContext.project.organizationName, "To be confirmed"),
    environment: projectEnvironment,
    reportVersion: "Version 0.92",
    revisionStatus: exportContext.errors.length > 0 ? "Draft - blockers present" : exportContext.warnings.length > 0 ? "Review draft" : "Review-ready draft",
    documentOwner: asString(exportContext.project.ownerName, "SubnetOps project owner"),
    approvalStatus: exportContext.errors.length > 0 ? "Not ready for approval" : "Ready for technical review",
    projectPhase: asString(exportContext.requirements.projectPhase, "To be confirmed"),
    planningFocus: asString(exportContext.planningFor, "To be confirmed"),
    primaryObjective: asString(exportContext.primaryGoal, "To be confirmed"),
    generatedFrom: "Saved project records and synthesized planning outputs",
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
    sections: [introSection, discoverySection, hldSection, securitySection, addressingSection, routingSection, implementationSection, platformSection, risksSection, conclusionSection],
    appendices,
    metadata: reportMetadata,
    visualSnapshot,
  } satisfies ProfessionalReport;
}

export async function getCsvRows(projectId: string, snapshot?: ExportSnapshot) {
  if (snapshot?.synthesized) return getCsvRowsFromSnapshot(snapshot);
  const project = await getProjectExportData(projectId);
  const exportContext = buildExportContext(project);
  if (!exportContext) return [];

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

  for (const item of exportContext.validations) {
    rows.push({ Section: "Validation", Scope: item.entityType ?? "PROJECT", Name: item.title, Key: item.severity, Value: item.message, Notes: item.ruleCode ?? "" });
  }

  for (const item of exportContext.platformHighlights) {
    rows.push({ Section: "Platform/BOM", Scope: "Project", Name: exportContext.project.name, Key: "Profile", Value: item, Notes: "Review before procurement" });
  }

  for (const item of exportContext.discoveryHighlights) {
    rows.push({ Section: "Discovery", Scope: "Project", Name: exportContext.project.name, Key: "Highlight", Value: item, Notes: "Current-state input" });
  }

  return rows;
}

function jsonObject(value: unknown): JsonMap {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonMap) : {};
}

function jsonArray<T = JsonMap>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function boolLabel(value: unknown, yes = "Yes", no = "No") {
  return truthy(value) ? yes : no;
}

function printableValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return asString(value);
}

function valueOrDash(value: unknown) {
  const text = printableValue(value);
  return text || "—";
}

function parseIpv4CidrCapacity(cidr: string) {
  const match = cidr.match(/\/(\d{1,2})$/);
  if (!match) return null;
  const prefix = Number(match[1]);
  if (!Number.isFinite(prefix) || prefix < 0 || prefix > 32) return null;
  return 2 ** (32 - prefix);
}

function parseIpv4UsableHosts(cidr: string) {
  const capacity = parseIpv4CidrCapacity(cidr);
  if (capacity === null) return null;
  if (capacity <= 2) return capacity;
  return Math.max(0, capacity - 2);
}

function inferVlanId(row: JsonMap) {
  const explicit = asNumber(row.vlanId);
  if (explicit !== null) return explicit;
  const role = asString(row.role).toUpperCase();
  const segment = `${asString(row.segmentName)} ${asString(row.purpose)}`.toLowerCase();
  if (role === "USER" || segment.includes("user")) return 10;
  if (role === "SERVICES" || segment.includes("service") || segment.includes("server")) return 20;
  if (role === "GUEST" || segment.includes("guest")) return 40;
  if (role === "PRINTERS" || segment.includes("printer")) return 50;
  if (role === "VOICE" || segment.includes("voice")) return 60;
  if (role === "SPECIALTY" || segment.includes("iot") || segment.includes("camera") || segment.includes("specialty")) return 70;
  if (role === "MANAGEMENT" || segment.includes("management")) return 90;
  return null;
}

function deriveOrganizationHierarchyValues(
  organizationBlock: string,
  hierarchy: JsonMap,
  siteHierarchy: JsonMap[],
  addressingPlan: JsonMap[],
) {
  const organizationCapacity = asNumber(hierarchy.organizationCapacity) ?? parseIpv4CidrCapacity(organizationBlock) ?? 0;
  const allocatedSiteAddresses = asNumber(hierarchy.allocatedSiteAddresses)
    ?? siteHierarchy.reduce((sum, site) => sum + (parseIpv4CidrCapacity(asString(site.siteBlockCidr)) ?? 0), 0);
  const plannedSiteDemandAddresses = asNumber(hierarchy.plannedSiteDemandAddresses)
    ?? addressingPlan.reduce((sum, row) => sum + (parseIpv4CidrCapacity(asString(row.subnetCidr)) ?? 0), 0);
  const organizationHeadroom = asNumber(hierarchy.organizationHeadroom)
    ?? Math.max(0, organizationCapacity - allocatedSiteAddresses);
  const organizationUtilization = asNumber(hierarchy.organizationUtilization)
    ?? (organizationCapacity > 0 ? allocatedSiteAddresses / organizationCapacity : 0);

  return {
    organizationCapacity,
    allocatedSiteAddresses,
    plannedSiteDemandAddresses,
    organizationHeadroom,
    organizationUtilization,
  };
}

function severityCounts(validations: ValidationItem[]) {
  return {
    errors: validations.filter((item) => item.severity === "ERROR").length,
    warnings: validations.filter((item) => item.severity === "WARNING").length,
    infos: validations.filter((item) => item.severity === "INFO").length,
  };
}

function composeProfessionalReportFromSnapshot(snapshot: ExportSnapshot): ProfessionalReport | null {
  const project = jsonObject(snapshot.project);
  const profile = jsonObject(snapshot.requirementsProfile);
  const synthesized = jsonObject(snapshot.synthesized);
  const discovery = jsonObject(snapshot.discoverySummary);
  const platform = jsonObject(snapshot.platformFoundation);
  const validations = jsonArray<ValidationItem>(snapshot.validations);

  const siteSummaries = jsonArray<JsonMap>(synthesized.siteSummaries);
  const siteHierarchy = jsonArray<JsonMap>(synthesized.siteHierarchy);
  const addressingPlan = jsonArray<JsonMap>(synthesized.addressingPlan);
  const logicalDomains = jsonArray<JsonMap>(synthesized.logicalDomains);
  const securityZones = jsonArray<JsonMap>(synthesized.securityZones);
  const securityControls = jsonArray<JsonMap>(synthesized.securityControls);
  const securityPolicyMatrix = jsonArray<JsonMap>(synthesized.securityPolicyMatrix);
  const routePolicies = jsonArray<JsonMap>(synthesized.routePolicies);
  const routingProtocols = jsonArray<JsonMap>(synthesized.routingProtocols);
  const switchingDesign = jsonArray<JsonMap>(synthesized.switchingDesign);
  const qosPlan = jsonArray<JsonMap>(synthesized.qosPlan);
  const wanLinks = jsonArray<JsonMap>(synthesized.wanLinks);
  const implementationPhases = jsonArray<JsonMap>(synthesized.implementationPhases);
  const cutoverChecklist = jsonArray<JsonMap>(synthesized.cutoverChecklist);
  const rollbackPlan = jsonArray<JsonMap>(synthesized.rollbackPlan);
  const validationPlan = jsonArray<JsonMap>(synthesized.validationPlan);
  const lowLevelDesign = jsonArray<JsonMap>(synthesized.lowLevelDesign);
  const designReview = jsonArray<JsonMap>(synthesized.designReview);
  const openIssues = jsonArray<unknown>(synthesized.openIssues).map((item) => String(item));
  const implementationNextSteps = jsonArray<unknown>(synthesized.implementationNextSteps).map((item) => String(item));
  const highLevelDesign = jsonObject(synthesized.highLevelDesign);
  const organizationHierarchy = jsonObject(synthesized.organizationHierarchy);
  const designTruthModel = jsonObject(synthesized.designTruthModel);
  const truthRouteDomains = jsonArray<JsonMap>(designTruthModel.routeDomains);
  const truthBoundaryDomains = jsonArray<JsonMap>(designTruthModel.boundaryDomains);
  const truthServiceDomains = jsonArray<JsonMap>(designTruthModel.serviceDomains);
  const truthFlowContracts = jsonArray<JsonMap>(designTruthModel.flowContracts);
  const truthGenerationNotes = jsonArray<unknown>(designTruthModel.generationNotes).map((item) => String(item));
  const truthCoverage = jsonArray<JsonMap>(designTruthModel.coverage);
  const platformSummary = jsonObject(platform.platformSummary);
  const bomItems = jsonArray<JsonMap>(platform.bomItems);
  const bomAssumptions = jsonArray<unknown>(platform.bomAssumptions).map((item) => String(item));
  const procurementNotes = jsonArray<unknown>(platform.procurementNotes).map((item) => String(item));
  const licensingAndSupport = jsonArray<unknown>(platform.licensingAndSupport).map((item) => String(item));
  const discoveryHighlights = jsonArray<unknown>(discovery.currentStateHighlights).map((item) => String(item));
  const discoveryGaps = jsonArray<unknown>(discovery.gaps).map((item) => String(item));
  const discoveryConstraints = jsonArray<unknown>(discovery.constraints).map((item) => String(item));
  const discoveryRisks = jsonArray<unknown>(discovery.inferredRisks).map((item) => String(item));
  const discoveryNextInputs = jsonArray<unknown>(discovery.suggestedNextInputs).map((item) => String(item));
  const counts = severityCounts(validations);
  const generatedAt = snapshot.generatedAt ? new Date(snapshot.generatedAt).toLocaleString() : new Date().toLocaleString();
  const projectName = asString(project.name, "SubnetOps Project");
  const organizationName = asString(project.organizationName, "To be confirmed");
  const environment = titleCase(asString(project.environmentType, "Custom"));
  const siteCount = Math.max(siteSummaries.length, siteHierarchy.length, asNumber(profile.siteCount) ?? 0);
  const rowCount = addressingPlan.length;
  const zonesInScope = securityZones.length > 0 ? securityZones.map((zone) => asString(zone.zoneName)).filter(Boolean) : sortUnique(logicalDomains.map((domain) => asString(domain.name)).filter(Boolean));
  const architectureFallback = siteCount > 1 ? "a multi-site architecture with per-site addressing boundaries and summarized routing" : "a compact single-site architecture with segmented trust boundaries";
  const rawArchitecturePattern = asString(highLevelDesign.architecturePattern);
  const architecturePattern = rawArchitecturePattern && !(siteCount > 1 && /single-site/i.test(rawArchitecturePattern)) ? rawArchitecturePattern : architectureFallback;
  const organizationBlock = asString(synthesized.organizationBlock, asString(project.basePrivateRange, "working range still needs explicit confirmation"));
  const organizationNumbers = deriveOrganizationHierarchyValues(organizationBlock, organizationHierarchy, siteHierarchy, addressingPlan);
  const introBullets = [
    `Environment: ${environment}`,
    `Planning focus: ${asString(profile.planningFor, "To be confirmed")}`,
    `Current project phase: ${asString(profile.projectPhase, "To be confirmed")}`,
    `Primary design objective: ${asString(profile.primaryGoal, "To be confirmed")}`,
    `Estimated users per site: ${asString(profile.usersPerSite, "To be confirmed")}`,
    `Compliance or governance profile: ${asString(profile.complianceProfile, "To be confirmed")}`,
  ];

  const executiveSummary = [
    `${projectName} is presented as a ${environment.toLowerCase()} technical design report covering ${siteCount} site${siteCount === 1 ? "" : "s"}, ${rowCount} logical addressing row${rowCount === 1 ? "" : "s"}, and a complete package of design, security, routing, implementation, and delivery outputs generated from the current planning workspace.`,
    `The present design direction follows ${architecturePattern}. The package is intended to support technical review, stakeholder approval, and implementation preparation without reducing the network plan to a shallow screen dump or placeholder export.`,
    counts.errors > 0
      ? `The current design still contains ${counts.errors} error-level blocker${counts.errors === 1 ? "" : "s"} and ${counts.warnings} warning${counts.warnings === 1 ? "" : "s"}. Those findings should be resolved or explicitly accepted before implementation approval.`
      : counts.warnings > 0
        ? `The current design has ${counts.warnings} warning${counts.warnings === 1 ? "" : "s"} and ${counts.infos} informational review item${counts.infos === 1 ? "" : "s"}. No active error-level blockers are recorded in the latest validation state.`
        : `The current design is in a clean validation posture with ${counts.infos} informational review item${counts.infos === 1 ? "" : "s"} and no active error-level or warning-level blockers.`,
    `The report pulls from the active synthesized design package, including discovery context, high-level design, logical topology, addressing hierarchy, security boundaries, routing intent, implementation planning, and platform foundations, so the exported file reflects the same planning result visible in the application workspace.`,
  ];

  const siteSummaryRows = (siteHierarchy.length > 0 ? siteHierarchy : siteSummaries).map((site) => [
    asString(site.name),
    asString(site.siteCode, "—"),
    asString(site.location, "Location not set"),
    asString(site.siteBlockCidr, "Not assigned"),
    String(asNumber(site.configuredSegmentCount) ?? 0),
    String(asNumber(site.proposedSegmentCount) ?? 0),
    `${Math.round(asNumber(site.blockUtilization) ?? 0)}%`,
  ]);

  const logicalDomainRows = logicalDomains.map((domain) => [
    asString(domain.name),
    asString(domain.purpose),
    asString(domain.placement),
    asString(domain.policy),
  ]);

  const securityZoneRows = securityZones.map((zone) => [
    asString(zone.zoneName),
    asString(zone.zoneType),
    asString(zone.trustLevel),
    asString(zone.enforcement),
    asString(zone.northSouthPolicy),
  ]);

  const addressingRows = addressingPlan.map((row) => {
    const usableHosts = asNumber(row.usableHosts) ?? parseIpv4UsableHosts(asString(row.subnetCidr)) ?? null;
    const estimatedHosts = asNumber(row.estimatedHosts) ?? null;
    const headroom = asNumber(row.headroom) ?? (usableHosts !== null && estimatedHosts !== null ? Math.max(0, usableHosts - estimatedHosts) : null);
    return [
      asString(row.siteName),
      valueOrDash(inferVlanId(row)),
      asString(row.segmentName),
      asString(row.source),
      asString(row.subnetCidr),
      asString(row.gatewayIp),
      boolLabel(row.dhcpEnabled, "Enabled", "No"),
      valueOrDash(estimatedHosts),
      valueOrDash(headroom),
    ];
  });

  const routingProtocolRows = routingProtocols.map((item) => [
    asString(item.protocol),
    asString(item.scope),
    asString(item.purpose),
    asString(item.recommendation),
  ]);
  const routePolicyRows = routePolicies.map((item) => [
    asString(item.policyName),
    asString(item.scope),
    asString(item.intent),
    asString(item.recommendation),
  ]);
  const wanLinkRows = wanLinks.map((item) => [
    asString(item.linkName),
    asString(item.transport),
    asString(item.endpointASiteName),
    asString(item.endpointAIp),
    asString(item.endpointBSiteName),
    asString(item.endpointBIp),
    asString(item.subnetCidr),
  ]);
  const truthRouteRows = truthRouteDomains.map((item) => [
    asString(item.siteName),
    asString(item.sourceModel, "explicit"),
    asString(item.summaryAdvertisement, "—"),
    asString(item.loopbackCidr, "—"),
    String(jsonArray<unknown>(item.localSegmentIds).length),
    String(jsonArray<unknown>(item.transitWanAdjacencyIds).length),
    String(jsonArray<unknown>(item.flowIds).length),
  ]);
  const truthBoundaryRows = truthBoundaryDomains.map((item) => [
    asString(item.siteName),
    asString(item.zoneName),
    asString(item.sourceModel, "explicit"),
    asString(item.attachedDevice, "Boundary device to confirm"),
    String(jsonArray<unknown>(item.segmentIds).length),
    String(jsonArray<unknown>(item.serviceIds).length),
    String(jsonArray<unknown>(item.flowIds).length),
  ]);
  const truthFlowRows = truthFlowContracts.map((item) => [
    asString(item.flowLabel),
    asString(item.sourceSite, asString(item.source)),
    asString(item.destinationSite, asString(item.destination)),
    asString(item.routeModel),
    String(jsonArray<unknown>(item.routeDomainIds).length),
    String(jsonArray<unknown>(item.boundaryIds).length),
    String(jsonArray<unknown>(item.wanAdjacencyIds).length),
  ]);
  const switchingRows = switchingDesign.map((item) => [
    asString(item.topic),
    asString(item.recommendation),
    asString(item.implementationHint),
  ]);
  const qosRows = qosPlan.map((item) => [
    asString(item.trafficClass),
    asString(item.treatment),
    asString(item.marking),
    asString(item.scope),
  ]);
  const implementationPhaseRows = implementationPhases.map((item) => [
    asString(item.phase),
    asString(item.objective),
    asString(item.scope),
    jsonArray<unknown>(item.dependencies).map((value) => String(value)).join("; ") || "—",
  ]);
  const cutoverRows = cutoverChecklist.map((item) => [
    asString(item.stage),
    asString(item.item),
    asString(item.owner),
    asString(item.rationale),
  ]);
  const rollbackRows = rollbackPlan.map((item) => [
    asString(item.trigger),
    asString(item.action),
    asString(item.scope),
  ]);
  const validationTestRows = validationPlan.map((item) => [
    asString(item.stage),
    asString(item.test),
    asString(item.expectedOutcome),
    asString(item.evidence),
  ]);
  const bomRows = bomItems.map((item) => [
    asString(item.category),
    asString(item.item),
    valueOrDash(item.quantity),
    asString(item.unit),
    asString(item.scope),
    asString(item.basis),
  ]);
  const validationRows = validations.map((item) => [
    item.severity,
    asString(item.entityType, "PROJECT"),
    item.title,
    item.message,
  ]);
  const lowLevelRows = lowLevelDesign.map((item) => [
    asString(item.siteName),
    asString(item.siteRole),
    asString(item.routingRole),
    asString(item.switchingProfile),
    asString(item.securityBoundary),
    asString(item.summaryRoute || item.loopbackCidr || "—"),
  ]);
  const securityMatrixRows = securityPolicyMatrix.map((row) => [
    asString(row.sourceZone),
    asString(row.targetZone),
    asString(row.defaultAction),
    asString(row.allowedFlows),
    asString(row.controlPoint),
  ]);
  const designReviewBullets = designReview.map((item) => `${asString(item.kind, "review")}: ${asString(item.title)} — ${asString(item.detail)}`);

  const sections: ReportSection[] = [
    {
      title: "1. Introduction and Project Scope",
      paragraphs: [
        `${projectName} is currently being developed as a ${environment.toLowerCase()} network plan. The saved brief and generated outputs indicate a scope centered on ${asString(profile.planningFor, "a structured network delivery").toLowerCase()}, with ${asString(profile.primaryGoal, "reviewable network planning").toLowerCase()} as the leading design driver. This export is intended to function as an approval-ready technical package rather than a simple print of application cards or screen summaries.`,
        `The report is built from the active design package visible in the application workspace. That means the narrative, tables, and appendices are tied to the same synthesized site hierarchy, addressing rows, security model, routing posture, and implementation plan the user is reviewing on screen at export time.`,
      ],
      bullets: introBullets,
    },
    {
      title: "2. Discovery and Requirements Baseline",
      paragraphs: [
        discoveryHighlights.length > 0
          ? "Discovery information is present and has been used to anchor the design package in known current-state conditions. The exported package therefore reflects both target-state planning and currently captured operational context."
          : "The current-state baseline is still relatively light. The design package can still be used for target-state review, but migration planning and procurement decisions should be treated cautiously until discovery detail is strengthened.",
        `The current requirements emphasize ${asString(profile.primaryGoal, "network planning")}. As a result, the design package currently prioritizes segmentation, addressing structure, operational supportability, and cleaner review boundaries before vendor-specific implementation detail is introduced.`,
      ],
      bullets: [
        ...discoveryHighlights,
        ...discoveryGaps.map((item) => `Gap: ${item}`),
        ...discoveryConstraints.map((item) => `Constraint: ${item}`),
      ].slice(0, 14),
    },
    {
      title: "3. High-Level Design Overview",
      paragraphs: [
        `The proposed high-level design follows ${architecturePattern}. The package uses an organizational address hierarchy of ${organizationBlock}, with ${siteCount} site${siteCount === 1 ? "" : "s"} currently represented in the generated design and ${rowCount} total logical addressing row${rowCount === 1 ? "" : "s"}.`,
        `At the organizational level, approximately ${valueOrDash(organizationNumbers.allocatedSiteAddresses)} addresses are allocated into site blocks out of ${valueOrDash(organizationNumbers.organizationCapacity)} available, leaving ${valueOrDash(organizationNumbers.organizationHeadroom)} addresses of remaining org-level headroom.`,
      ],
      bullets: [
        `Architecture pattern: ${asString(highLevelDesign.architecturePattern, architecturePattern)}`,
        `Layer model: ${asString(highLevelDesign.layerModel, "To be confirmed")}`,
        `WAN architecture: ${asString(highLevelDesign.wanArchitecture, "To be confirmed")}`,
        `Cloud / hybrid posture: ${asString(highLevelDesign.cloudArchitecture, "To be confirmed")}`,
        `Data center / service posture: ${asString(highLevelDesign.dataCenterArchitecture, "To be confirmed")}`,
        `Redundancy model: ${asString(highLevelDesign.redundancyModel, "To be confirmed")}`,
        `Security domains in scope: ${zonesInScope.join(", ") || "To be confirmed"}`,
      ],
      tables: [
        {
          title: "Site Hierarchy Summary",
          headers: ["Site", "Code", "Location", "Site Block", "Configured Rows", "Proposed Rows", "Utilization"],
          rows: siteSummaryRows.length > 0 ? siteSummaryRows : [["No synthesized site hierarchy available", "—", "—", "—", "0", "0", "0%"]],
        },
      ],
    },
    {
      title: "4. Core Design Truth Model",
      paragraphs: [
        "This section reflects the shared internal model now linking topology, routing anchors, security boundaries, service placement, and traffic flows. It is intended to reduce drift between workspaces by giving the package one connected engineering truth layer.",
        `The current shared model resolves ${truthRouteDomains.length} route domain${truthRouteDomains.length === 1 ? "" : "s"}, ${truthBoundaryDomains.length} boundary domain${truthBoundaryDomains.length === 1 ? "" : "s"}, ${truthServiceDomains.length} service domain${truthServiceDomains.length === 1 ? "" : "s"}, and ${truthFlowContracts.length} flow contract${truthFlowContracts.length === 1 ? "" : "s"}. ${asString(designTruthModel.summary) || ""}`,
      ],
      bullets: [
        ...truthGenerationNotes,
        ...truthCoverage.slice(0, 5).map((item) => `${asString(item.label)}: ${asString(item.detail)}`),
      ].slice(0, 12),
      tables: [
        {
          title: "Route-Domain Authority",
          headers: ["Site", "Source", "Summary", "Loopback", "Segments", "WAN", "Flows"],
          rows: truthRouteRows.length > 0 ? truthRouteRows : [["No route-domain objects generated", "—", "—", "—", "—", "—", "—"]],
        },
        {
          title: "Boundary-Domain Authority",
          headers: ["Site", "Zone", "Source", "Device", "Segments", "Services", "Flows"],
          rows: truthBoundaryRows.length > 0 ? truthBoundaryRows : [["No boundary-domain objects generated", "—", "—", "—", "—", "—", "—"]],
        },
      ],
    },
    {
      title: "5. Logical Domains, Security Architecture, and Segmentation Model",
      paragraphs: [
        "Security in this package is treated as a structural design layer that shapes how segments, trust boundaries, routing edges, and implementation controls should be interpreted. The outputs below do not replace final firewall engineering, but they do define the zones, default behaviors, and policy boundaries that implementation must preserve.",
        "The combination of logical domains, mapped zones, control recommendations, and inter-zone access expectations should be reviewed together. This is the point where segmentation becomes an implementation-ready security model rather than a list of definitions.",
      ],
      bullets: securityControls.map((item) => `${asString(item.status, "review")}: ${asString(item.control)} — ${asString(item.rationale)}`).slice(0, 12),
      tables: [
        {
          title: "Logical Domains",
          headers: ["Domain", "Purpose", "Placement", "Policy"],
          rows: logicalDomainRows.length > 0 ? logicalDomainRows : [["No logical domains generated", "—", "—", "—"]],
        },
        {
          title: "Security Zone Summary",
          headers: ["Zone", "Type", "Trust Level", "Enforcement", "North-South Policy"],
          rows: securityZoneRows.length > 0 ? securityZoneRows : [["No security zones generated", "—", "—", "—", "—"]],
        },
      ],
    },
    {
      title: "6. Logical Design and Addressing Plan",
      paragraphs: [
        `The logical design currently contains ${rowCount} addressing row${rowCount === 1 ? "" : "s"}. These rows represent the actual generated planning result and should be treated as the primary implementation artifact for subnet ownership, gateway placement, DHCP posture, host sizing, and site-level segmentation.`,
        "Configured rows and proposed rows should both be reviewed. Configured rows reflect explicit saved records, while proposed rows show where the synthesis engine is carrying the design beyond what has already been manually recorded.",
      ],
      tables: [
        {
          title: "Low-Level Design by Site",
          headers: ["Site", "Role", "Routing Role", "Switching Profile", "Security Boundary", "Summary / Loopback"],
          rows: lowLevelRows.length > 0 ? lowLevelRows : [["No LLD rows generated", "—", "—", "—", "—", "—"]],
        },
        {
          title: "Addressing Plan Summary",
          headers: ["Site", "VLAN", "Segment", "Source", "Subnet", "Gateway", "DHCP", "Est. Hosts", "Headroom"],
          rows: addressingRows.slice(0, 40).length > 0 ? addressingRows.slice(0, 40) : [["No addressing rows generated", "—", "—", "—", "—", "—", "—", "—", "—"]],
        },
      ],
    },
    {
      title: "7. Routing, Switching, and Transport Intent",
      paragraphs: [
        "Routing and switching outputs should be read together with the security and addressing sections. Gateway ownership, summaries, route boundaries, WAN or cloud edge links, switching fault domains, and QoS posture should all reinforce the same logical hierarchy rather than competing with it.",
        `The current design package contains ${routingProtocols.length} protocol or transport posture item${routingProtocols.length === 1 ? "" : "s"}, ${routePolicies.length} route-policy item${routePolicies.length === 1 ? "" : "s"}, ${switchingDesign.length} switching design control${switchingDesign.length === 1 ? "" : "s"}, and ${wanLinks.length} synthesized WAN or cloud link${wanLinks.length === 1 ? "" : "s"}.`,
      ],
      tables: [
        {
          title: "Routing Protocol / Transport Posture",
          headers: ["Protocol / Transport", "Scope", "Purpose", "Recommendation"],
          rows: routingProtocolRows.length > 0 ? routingProtocolRows : [["No routing posture generated", "—", "—", "—"]],
        },
        {
          title: "Route Policy Summary",
          headers: ["Policy", "Scope", "Intent", "Recommendation"],
          rows: routePolicyRows.length > 0 ? routePolicyRows : [["No route-policy items generated", "—", "—", "—"]],
        },
        {
          title: "WAN / Cloud Edge Links",
          headers: ["Link", "Transport", "Endpoint A", "IP A", "Endpoint B", "IP B", "Subnet"],
          rows: wanLinkRows.length > 0 ? wanLinkRows : [["No dedicated WAN or cloud links synthesized", "—", "—", "—", "—", "—", "—"]],
        },
      ],
      bullets: [
        ...switchingRows.slice(0, 6).map((row) => `${row[0]}: ${row[1]}`),
        ...qosRows.slice(0, 4).map((row) => `${row[0]} — ${row[1]} (${row[2]})`),
      ],
    },
    {
      title: "8. Implementation, Testing, and Validation Strategy",
      paragraphs: [
        `Implementation should follow ${asString(jsonObject(synthesized.implementationPlan).rolloutStrategy, "a phased sequence")}, with ${implementationPhases.length} explicit phase${implementationPhases.length === 1 ? "" : "s"}, ${cutoverChecklist.length} cutover or pre/post-check item${cutoverChecklist.length === 1 ? "" : "s"}, ${rollbackPlan.length} rollback trigger${rollbackPlan.length === 1 ? "" : "s"}, and ${validationPlan.length} validation test${validationPlan.length === 1 ? "" : "s"} currently captured in the package.`,
        counts.errors > 0
          ? "Because active error-level blockers still exist, the design should not move into implementation approval until those items are resolved or explicitly accepted."
          : "The present validation posture does not show active error-level blockers. The design can therefore move into deeper technical sign-off, provided the remaining assumptions and open issues are still reviewed carefully.",
      ],
      tables: [
        {
          title: "Implementation Phases",
          headers: ["Phase", "Objective", "Scope", "Dependencies"],
          rows: implementationPhaseRows.length > 0 ? implementationPhaseRows : [["No implementation phases generated", "—", "—", "—"]],
        },
        {
          title: "Validation Test Plan",
          headers: ["Stage", "Test", "Expected Outcome", "Evidence"],
          rows: validationTestRows.length > 0 ? validationTestRows : [["No validation tests generated", "—", "—", "—"]],
        },
      ],
      bullets: [
        ...cutoverRows.slice(0, 8).map((row) => `${row[0]}: ${row[1]} — ${row[2]}`),
        ...rollbackRows.slice(0, 4).map((row) => `Rollback trigger: ${row[0]} — ${row[1]}`),
      ],
    },
    {
      title: "9. Platform Profile and Bill of Materials Foundation",
      paragraphs: [
        "The platform profile and BOM should be treated as a role-based engineering and procurement foundation. It is intended to keep the design grounded in deployment reality before exact model selection, licensing, optics, and commercial review are finalized.",
        `The current BOM foundation includes ${bomItems.length} line item${bomItems.length === 1 ? "" : "s"}. These quantities and categories are derived from the current synthesized design and saved platform posture, not from final SKU-level procurement choices.`,
      ],
      bullets: [
        `Profile label: ${asString(platformSummary.profileLabel, "To be confirmed")}`,
        `Deployment class: ${asString(platformSummary.deploymentClass, "To be confirmed")}`,
        `Management style: ${asString(platformSummary.managementStyle, "To be confirmed")}`,
        `Operations fit: ${asString(platformSummary.operationsFit, "To be confirmed")}`,
        ...bomAssumptions.slice(0, 6),
        ...procurementNotes.slice(0, 6),
        ...licensingAndSupport.slice(0, 4),
      ],
      tables: [
        {
          title: "Role-Based BOM Foundation",
          headers: ["Category", "Item", "Qty", "Unit", "Scope", "Basis"],
          rows: bomRows.slice(0, 30).length > 0 ? bomRows.slice(0, 30) : [["No BOM items generated", "—", "—", "—", "—", "—"]],
        },
      ],
    },
    {
      title: "10. Assumptions, Risks, and Open Review Items",
      paragraphs: [
        "Professional design packages should make uncertainty visible instead of hiding it. The following items are assumptions, risks, and open review points that still matter before the package is treated as final implementation truth.",
      ],
      bullets: [
        ...openIssues,
        ...discoveryRisks,
        ...designReviewBullets,
        ...implementationNextSteps,
        ...validations.filter((item) => item.severity !== "INFO").slice(0, 10).map((item) => `${item.severity}: ${item.title} — ${item.message}`),
      ].slice(0, 24),
    },
    {
      title: "11. Conclusion and Handoff Notes",
      paragraphs: [
        `${projectName} now has a structured professional network plan covering discovery context, project requirements, high-level architecture, logical design, security boundaries, routing posture, implementation planning, validation review, and platform foundations. The export is intended to function as a real review package for approvals and technical discussion, not just as a shallow application summary.`,
        `The next priority should be to confirm any remaining open assumptions, align the design with final platform choices, and carry the approved logical package into implementation artifacts, diagrams, change controls, and evidence collection.`,
      ],
    },
  ];

  const appendices: ReportSection[] = [
    {
      title: "Appendix A. Full Addressing Schedule",
      paragraphs: ["This appendix preserves the row-level addressing detail from the active synthesized design package."],
      tables: [{
        title: "Addressing Rows",
        headers: ["Site", "VLAN", "Segment", "Source", "Subnet", "Gateway", "DHCP", "Est. Hosts", "Headroom"],
        rows: addressingRows.length > 0 ? addressingRows : [["No addressing rows generated", "—", "—", "—", "—", "—", "—", "—", "—"]],
      }],
    },
    {
      title: "Appendix B. Security Policy Matrix",
      paragraphs: ["The inter-zone matrix below reflects the current structural security model and should guide detailed policy review and firewall planning."],
      tables: [{
        title: "Security Policy Matrix",
        headers: ["Source Zone", "Target Zone", "Default Action", "Allowed Flows", "Control Point"],
        rows: securityMatrixRows.length > 0 ? securityMatrixRows : [["No policy rows generated", "—", "—", "—", "—"]],
      }],
    },
    {
      title: "Appendix C. Routing and Transport Detail",
      paragraphs: ["This appendix groups the route-policy and WAN transport details that support the logical design narrative in the main report body."],
      tables: [
        {
          title: "Route Policies",
          headers: ["Policy", "Scope", "Intent", "Recommendation"],
          rows: routePolicyRows.length > 0 ? routePolicyRows : [["No route policies generated", "—", "—", "—"]],
        },
        {
          title: "Transport Links",
          headers: ["Link", "Transport", "Endpoint A", "IP A", "Endpoint B", "IP B", "Subnet"],
          rows: wanLinkRows.length > 0 ? wanLinkRows : [["No dedicated transport links generated", "—", "—", "—", "—", "—", "—"]],
        },
      ],
    },
    {
      title: "Appendix D. Core Truth-Model Flow Detail",
      paragraphs: ["This appendix shows how flow contracts currently tie back to route domains, boundary domains, and WAN adjacencies inside the shared engineering model."],
      tables: [{
        title: "Flow Contracts",
        headers: ["Flow", "Source", "Destination", "Route Model", "Route Domains", "Boundaries", "WAN"],
        rows: truthFlowRows.length > 0 ? truthFlowRows : [["No flow-contract objects generated", "—", "—", "—", "—", "—", "—"]],
      }],
    },
    {
      title: "Appendix E. Validation Detail",
      paragraphs: ["The following findings reflect the latest validation state carried into the export package."],
      tables: [{
        title: "Validation Findings",
        headers: ["Severity", "Entity", "Title", "Message"],
        rows: validationRows.length > 0 ? validationRows : [["INFO", "PROJECT", "No validation findings captured", "No validation findings are currently present in the export payload."]],
      }],
    },
    {
      title: "Appendix F. Bill of Materials Detail",
      paragraphs: ["The role-based BOM detail below remains review-oriented rather than quote-ready, but it captures the deployment categories and quantities implied by the current design package."],
      tables: [{
        title: "BOM Detail",
        headers: ["Category", "Item", "Qty", "Unit", "Scope", "Basis"],
        rows: bomRows.length > 0 ? bomRows : [["No BOM detail generated", "—", "—", "—", "—", "—"]],
      }],
    },
  ];

  const reportMetadata: ReportMetadata = {
    organizationName,
    environment,
    reportVersion: "Version 0.92",
    revisionStatus: counts.errors > 0 ? "Draft - blockers present" : counts.warnings > 0 ? "Review draft" : "Review-ready draft",
    documentOwner: asString(project.ownerName, "SubnetOps project owner"),
    approvalStatus: counts.errors > 0 ? "Not ready for approval" : "Ready for technical review",
    projectPhase: asString(profile.projectPhase, "To be confirmed"),
    planningFocus: asString(profile.planningFor, "To be confirmed"),
    primaryObjective: asString(profile.primaryGoal, "To be confirmed"),
    generatedFrom: "Active synthesized design snapshot from Deliver / Report",
  };

  const visualSnapshot: ReportVisualSnapshot = {
    metrics: [
      ["Sites in scope", String(siteCount)],
      ["Addressing rows", String(rowCount)],
      ["Security zones", String(securityZones.length || logicalDomains.length)],
      ["Validation blockers", String(counts.errors)],
      ["Validation warnings", String(counts.warnings)],
      ["Base range", organizationBlock],
    ],
    topologyRows: [
      ["Edge / Internet", asString(profile.internetModel, asString(highLevelDesign.wanArchitecture, "Edge model to be confirmed")), siteCount > 1 ? "Keep site-to-site transport summarized and review cloud/provider boundaries carefully" : "Keep north-south routing ownership explicit at the edge"],
      ["Core / Distribution", asString(highLevelDesign.layerModel, "Layering still requires confirmation"), siteCount > 1 ? "Primary site coordinates shared services and route summaries" : "Collapsed edge should still preserve segmentation and fault boundaries"],
      ["Services", asString(profile.serverPlacement, asString(highLevelDesign.dataCenterArchitecture, "Service placement to be confirmed")), "Keep service zones separated from users, guest access, and management"],
      ["Security", zonesInScope.join(", ") || "To be confirmed", "Treat the zone model as a structural boundary plan for later enforcement"],
    ],
  };

  return {
    title: asString(project.reportHeader, `${projectName} Technical Design Report`),
    subtitle: `${projectName} — Professional Network Planning Package`,
    generatedAt,
    executiveSummary,
    sections,
    appendices,
    metadata: reportMetadata,
    visualSnapshot,
  } satisfies ProfessionalReport;
}

function getCsvRowsFromSnapshot(snapshot: ExportSnapshot): Array<Record<string, unknown>> {
  const project = jsonObject(snapshot.project);
  const profile = jsonObject(snapshot.requirementsProfile);
  const synthesized = jsonObject(snapshot.synthesized);
  const discovery = jsonObject(snapshot.discoverySummary);
  const platform = jsonObject(snapshot.platformFoundation);
  const validations = jsonArray<ValidationItem>(snapshot.validations);
  const addressingPlan = jsonArray<JsonMap>(synthesized.addressingPlan);
  const siteHierarchy = jsonArray<JsonMap>(synthesized.siteHierarchy);
  const securityZones = jsonArray<JsonMap>(synthesized.securityZones);
  const securityPolicyMatrix = jsonArray<JsonMap>(synthesized.securityPolicyMatrix);
  const designTruthModel = jsonObject(synthesized.designTruthModel);
  const truthRouteDomains = jsonArray<JsonMap>(designTruthModel.routeDomains);
  const truthBoundaryDomains = jsonArray<JsonMap>(designTruthModel.boundaryDomains);
  const truthFlowContracts = jsonArray<JsonMap>(designTruthModel.flowContracts);
  const routePolicies = jsonArray<JsonMap>(synthesized.routePolicies);
  const wanLinks = jsonArray<JsonMap>(synthesized.wanLinks);
  const implementationPhases = jsonArray<JsonMap>(synthesized.implementationPhases);
  const bomItems = jsonArray<JsonMap>(jsonObject(platform).bomItems);
  const rows: Array<Record<string, unknown>> = [];

  rows.push(
    { Section: "Project", Scope: "Project", Name: asString(project.name), Key: "Organization", Value: asString(project.organizationName), Notes: "" },
    { Section: "Project", Scope: "Project", Name: asString(project.name), Key: "Environment", Value: asString(project.environmentType), Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: asString(project.name), Key: "Planning For", Value: asString(profile.planningFor), Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: asString(project.name), Key: "Project Phase", Value: asString(profile.projectPhase), Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: asString(project.name), Key: "Primary Goal", Value: asString(profile.primaryGoal), Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: asString(project.name), Key: "Users Per Site", Value: asString(profile.usersPerSite), Notes: "" },
  );

  for (const site of siteHierarchy) {
    rows.push({ Section: "Sites", Scope: asString(site.name), Name: asString(site.siteCode), Key: "Site Block", Value: asString(site.siteBlockCidr), Notes: `Configured ${valueOrDash(site.configuredSegmentCount)} | Proposed ${valueOrDash(site.proposedSegmentCount)}` });
  }
  for (const row of addressingPlan) {
    rows.push({ Section: "Addressing", Scope: asString(row.siteName), Name: asString(row.segmentName), Key: asString(row.subnetCidr), Value: asString(row.gatewayIp), Notes: `VLAN ${valueOrDash(row.vlanId)} | ${boolLabel(row.dhcpEnabled)} | ${valueOrDash(row.source)}` });
  }
  for (const zone of securityZones) {
    rows.push({ Section: "Security Zones", Scope: asString(zone.zoneName), Name: asString(zone.zoneType), Key: "Trust Level", Value: asString(zone.trustLevel), Notes: asString(zone.northSouthPolicy) });
  }
  for (const row of securityPolicyMatrix) {
    rows.push({ Section: "Security Policy", Scope: asString(row.sourceZone), Name: asString(row.targetZone), Key: asString(row.defaultAction), Value: asString(row.allowedFlows), Notes: asString(row.controlPoint) });
  }
  for (const row of truthRouteDomains) {
    rows.push({ Section: "Core Model Route Domain", Scope: asString(row.siteName), Name: asString(row.sourceModel, "explicit"), Key: asString(row.summaryAdvertisement, "—"), Value: asString(row.loopbackCidr, "—"), Notes: `Segments ${jsonArray<unknown>(row.localSegmentIds).length} | WAN ${jsonArray<unknown>(row.transitWanAdjacencyIds).length} | Flows ${jsonArray<unknown>(row.flowIds).length}` });
  }
  for (const row of truthBoundaryDomains) {
    rows.push({ Section: "Core Model Boundary", Scope: asString(row.siteName), Name: asString(row.zoneName), Key: asString(row.sourceModel, "explicit"), Value: asString(row.attachedDevice, "Boundary device to confirm"), Notes: `Segments ${jsonArray<unknown>(row.segmentIds).length} | Services ${jsonArray<unknown>(row.serviceIds).length} | Flows ${jsonArray<unknown>(row.flowIds).length}` });
  }
  for (const row of truthFlowContracts) {
    rows.push({ Section: "Core Model Flow", Scope: asString(row.flowLabel), Name: asString(row.sourceSite, asString(row.source)), Key: asString(row.destinationSite, asString(row.destination)), Value: asString(row.routeModel), Notes: `Route domains ${jsonArray<unknown>(row.routeDomainIds).length} | Boundaries ${jsonArray<unknown>(row.boundaryIds).length} | WAN ${jsonArray<unknown>(row.wanAdjacencyIds).length}` });
  }
  for (const row of routePolicies) {
    rows.push({ Section: "Routing", Scope: asString(row.scope), Name: asString(row.policyName), Key: asString(row.intent), Value: asString(row.recommendation), Notes: "" });
  }
  for (const row of wanLinks) {
    rows.push({ Section: "Transport", Scope: asString(row.transport), Name: asString(row.linkName), Key: asString(row.subnetCidr), Value: `${asString(row.endpointASiteName)} ${asString(row.endpointAIp)} -> ${asString(row.endpointBSiteName)} ${asString(row.endpointBIp)}`, Notes: "" });
  }
  for (const row of implementationPhases) {
    rows.push({ Section: "Implementation", Scope: asString(row.phase), Name: asString(row.objective), Key: asString(row.scope), Value: jsonArray<unknown>(row.dependencies).map((value) => String(value)).join("; "), Notes: "" });
  }
  for (const row of bomItems) {
    rows.push({ Section: "BOM", Scope: asString(row.category), Name: asString(row.item), Key: valueOrDash(row.quantity), Value: asString(row.scope), Notes: asString(row.basis) });
  }
  for (const item of jsonArray<unknown>(jsonObject(discovery).currentStateHighlights)) {
    rows.push({ Section: "Discovery", Scope: "Project", Name: asString(project.name), Key: "Highlight", Value: String(item), Notes: "" });
  }
  for (const item of validations) {
    rows.push({ Section: "Validation", Scope: asString(item.entityType, "PROJECT"), Name: item.title, Key: item.severity, Value: item.message, Notes: item.ruleCode ?? "" });
  }
  return rows;
}
