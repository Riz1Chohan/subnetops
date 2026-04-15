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

export interface ProfessionalReport {
  title: string;
  subtitle: string;
  generatedAt: string;
  executiveSummary: string[];
  sections: ReportSection[];
  appendices?: ReportSection[];
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
  const ctx = buildExportContext(project);
  if (!ctx) return null;

  const generatedAt = new Date().toLocaleString();
  const projectEnvironment = titleCase(ctx.environment || "custom");
  const architecturePattern =
    ctx.siteCount > 1
      ? "a multi-site architecture with per-site addressing boundaries, summarized routing, and shared design standards"
      : "a compact single-site architecture with segmented trust boundaries, routed gateway control, and centralized review artifacts";

  const narrativeScope = humanJoin(
    [
      ctx.planningFor ? `${ctx.planningFor.toLowerCase()} delivery scope` : "general network design scope",
      ctx.primaryGoal ? `${ctx.primaryGoal.toLowerCase()} as the leading design objective` : "clean segmentation and supportable implementation as the working design assumption",
      ctx.usersPerSite ? `approximately ${ctx.usersPerSite} user${ctx.usersPerSite === 1 ? "" : "s"} per site` : "user counts still requiring final confirmation",
    ],
    "and",
  );

  const executiveSummary = [
    `${ctx.project.name} is presented as a ${projectEnvironment.toLowerCase()} technical design report covering ${ctx.siteCount || 0} site${ctx.siteCount === 1 ? "" : "s"}, ${ctx.vlanCount || 0} current addressing row${ctx.vlanCount === 1 ? "" : "s"}, and a structured package of architecture, security, routing, implementation, and platform-planning outputs. The report is intended to serve as a review-ready planning document rather than a raw export of application screens.`,
    `The current design direction follows ${architecturePattern}. This approach was selected to keep the package supportable for implementation teams while still preserving segmentation, growth headroom, and clearer operational boundaries before production configuration work begins.`,
    ctx.errors.length > 0
      ? `The present validation posture includes ${ctx.errors.length} error-level blocker${ctx.errors.length === 1 ? "" : "s"} and ${ctx.warnings.length} warning${ctx.warnings.length === 1 ? "" : "s"}. Those items should be resolved or explicitly accepted before the package is used as an implementation approval document.`
      : ctx.warnings.length > 0
        ? `The current design contains ${ctx.warnings.length} warning${ctx.warnings.length === 1 ? "" : "s"} but no active error-level blockers. The package can be reviewed professionally now, although the warning items should still be addressed during technical sign-off.`
        : "The current design is in a clean validation state with no active error-level or warning-level blockers recorded in the latest validation cycle.",
    `At this stage, the package is best used for design review, addressing confirmation, security and routing discussion, implementation planning, and stakeholder handoff. Procurement, platform-specific engineering, and migration approval should still be tied to the remaining assumptions and open review items documented later in the report.`,
  ];

  const introSection: ReportSection = {
    title: "1. Introduction and Project Scope",
    paragraphs: [
      `${ctx.project.name} is currently being developed as a ${projectEnvironment.toLowerCase()} network planning package. The saved project scope points toward ${narrativeScope}. Where the brief is still incomplete, the report presents reasonable planning assumptions and clearly identifies them as items requiring confirmation rather than hiding the gaps inside the document body.`,
      `This report is designed to provide a professional design narrative that can be reviewed by technical stakeholders, project leads, or approval teams. It translates the saved planning record into a structured package covering discovery context, high-level design, low-level addressing and segmentation, routing and switching intent, implementation planning, and platform readiness.`,
    ],
    bullets: [
      maybeBullet("Organization", ctx.project.organizationName),
      maybeBullet("Environment", projectEnvironment),
      maybeBullet("Planning focus", ctx.planningFor),
      maybeBullet("Current project phase", ctx.requirements.projectPhase),
      maybeBullet("Primary design objective", ctx.primaryGoal),
      ctx.usersPerSite ? `Estimated users per site: ${ctx.usersPerSite}` : null,
      maybeBullet("Compliance or governance profile", ctx.requirements.complianceProfile),
    ].filter(Boolean) as string[],
  };

  const discoverySection: ReportSection = {
    title: "2. Discovery and Requirements Baseline",
    paragraphs: [
      ctx.discoveryHighlights.length > 0
        ? "The project includes saved discovery notes that help anchor the target design in current-state information. These inputs should still be treated as a baseline rather than a complete discovery record, but they already provide enough context to improve migration planning, implementation sequencing, and design review quality."
        : "The current project record contains only a limited discovery baseline. The target design can still be reviewed and refined, but migration planning, procurement, and implementation approval should remain conditional until fuller current-state information is captured.",
      `The saved requirements presently indicate ${ctx.primaryGoal ? `${ctx.primaryGoal.toLowerCase()} as the main objective` : "a still-developing main design objective"}. The design engine has therefore emphasized structured segmentation, supportable gateway ownership, reviewable security boundaries, and implementation clarity rather than over-optimizing for platform-specific detail too early in the lifecycle.`,
    ],
    bullets: ctx.discoveryHighlights,
  };

  const hldBullets = [
    `Architecture direction: ${architecturePattern}`,
    `Base private range: ${asString(ctx.project.basePrivateRange) || "working range still needs explicit confirmation"}`,
    `Site count in scope: ${ctx.siteCount}`,
    `Logical security domains in scope: ${humanJoin(ctx.securityZones) || "to be finalized"}`,
    ctx.internetModel ? `Internet or edge posture: ${ctx.internetModel}` : null,
    ctx.serverPlacement ? `Server or service placement: ${ctx.serverPlacement}` : null,
    isEnabled(ctx.requirements.dualIsp)
      ? `Resilience posture: ${asString(ctx.requirements.resilienceTarget, "dual-path or failover-aware design")}`
      : `Resilience posture: ${asString(ctx.requirements.resilienceTarget, "single-primary-path posture pending further review")}`,
  ].filter(Boolean) as string[];

  const hldSection: ReportSection = {
    title: "3. High-Level Design Overview",
    paragraphs: [
      `The proposed high-level design follows ${architecturePattern}. For the current scope, that means the design package is aiming for clear trust boundaries, manageable operational control, and an addressing hierarchy that can grow without forcing redesign after the first implementation cycle.`,
      ctx.siteCount > 1
        ? "Because multiple sites are present, the architecture assumes a parent organizational block, per-site summary blocks, and transport logic that can be summarized cleanly at site boundaries. This reduces route sprawl and makes later expansion easier to reason about."
        : "Because the saved scope currently centers on a single site, the architecture stays intentionally compact. The priority is to establish good segmentation, disciplined gateway placement, and supportable controls before introducing complexity that the environment does not yet require.",
    ],
    bullets: hldBullets,
  };

  const zoneRows = sortUnique(
    ctx.sites.flatMap((site) => site.vlans.map((vlan) => `${classifyZone(vlan.vlanName, vlan.purpose)}|${site.name}|VLAN ${vlan.vlanId} ${vlan.vlanName}|${vlan.subnetCidr}`)),
  ).map((row) => {
    const [zone, site, segment, subnet] = row.split("|");
    return [zone, site, segment, subnet];
  });

  const securitySection: ReportSection = {
    title: "4. Security Architecture and Segmentation Model",
    paragraphs: [
      "The security design should be interpreted as a structural zone model that shapes addressing, routing, and implementation review. The current package is not yet pretending to be a fully vendor-specific firewall rulebase. Instead, it is defining the security boundaries that the implementation team will need to preserve when real devices, policies, and access controls are configured.",
      ctx.securityZones.includes("Guest")
        ? "Guest or untrusted access is in scope and should remain isolated from trusted user, service, and management boundaries unless an explicitly reviewed exception is approved."
        : "Guest access is not strongly modeled in the current saved scope, so the present package focuses more on trusted user, service, management, and infrastructure boundaries.",
      ctx.securityZones.includes("Management")
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
      isEnabled(ctx.requirements.remoteAccess) ? `Remote access posture: ${asString(ctx.requirements.remoteAccessMethod, "reviewed remote-access edge required")}` : null,
      isEnabled(ctx.requirements.guestWifi) ? `Guest policy intent: ${asString(ctx.requirements.guestPolicy, "internet-only or tightly filtered guest access")}` : null,
      isEnabled(ctx.requirements.management) ? `Management policy intent: ${asString(ctx.requirements.managementAccess, "trusted administrative access only")}` : null,
      isEnabled(ctx.requirements.wireless) || isEnabled(ctx.requirements.guestWifi) ? `Wireless mapping: ${asString(ctx.requirements.wirelessSecurity, "staff and guest wireless should remain mapped to the correct trust domains")}` : null,
    ].filter(Boolean) as string[],
  };

  const siteSummaryRows = ctx.sites.map((site) => [
    site.name,
    asString(site.siteCode, "—"),
    asString(site.location, "Location not set"),
    asString(site.defaultAddressBlock, "Not assigned"),
    String(site.vlans.length),
  ]);

  const addressingRows = ctx.sites.flatMap((site) =>
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
      `The low-level design currently contains ${ctx.vlanCount} addressing row${ctx.vlanCount === 1 ? "" : "s"}. These rows act as the main implementation artifact for subnet ownership, gateway placement, DHCP posture, and segmented trust boundaries.`,
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
    maybeBullet("Internet or edge model", ctx.internetModel),
    maybeBullet("Server or service placement", ctx.serverPlacement),
    maybeBullet("Platform WAN posture", ctx.platform.wanPosture),
    isEnabled(ctx.requirements.voice) ? `QoS or voice posture: ${asString(ctx.requirements.voiceQos, "voice and real-time traffic require reviewed prioritization")}` : null,
    ctx.siteCount > 1 ? "Routing posture: prefer site summarization and deliberate default-route ownership at the edge." : "Routing posture: simple routed edge with explicit gateway ownership and a controlled path to later IGP growth.",
  ].filter(Boolean) as string[];

  const routingSection: ReportSection = {
    title: "6. Routing, Switching, and Transport Intent",
    paragraphs: [
      `The routing and switching design is currently framed as ${ctx.routingPosture}. The package is intentionally trying to keep control-plane ownership obvious, site boundaries reviewable, and gateway behavior stable before platform-specific configuration is generated.`,
      "Switching intent should reinforce segmentation rather than hide it. Trunking, VLAN propagation, loop prevention, and first-hop placement should all be reviewed against the addressing hierarchy so that the final implementation does not undermine the logical model presented in this report.",
    ],
    bullets: routingBullets,
  };

  const validationRows = ctx.validations.length > 0
    ? ctx.validations.slice(0, 15).map((item) => [item.severity, item.title, item.message])
    : [["INFO", "No validation findings saved", "Run validation after changes if a fresh technical review is required."]];

  const implementationSection: ReportSection = {
    title: "7. Implementation, Testing, and Validation Strategy",
    paragraphs: [
      "Implementation should proceed in controlled phases so that addressing, gateway ownership, service reachability, security boundary enforcement, and rollback conditions can be verified without expanding the blast radius of each change window.",
      ctx.errors.length > 0
        ? "Because the current package still contains error-level blockers, implementation approval should pause until those blockers are reviewed and resolved."
        : "Because the current validation posture does not contain active error-level blockers, the package can move into deeper technical sign-off and change preparation once the warning and assumption items are reviewed.",
    ],
    bullets: [
      `Validation blockers: ${ctx.errors.length}`,
      `Validation warnings: ${ctx.warnings.length}`,
      `Validation information items: ${ctx.infos.length}`,
      ctx.warnings.length > 0 ? "Warning-level findings should be cleared or accepted explicitly before final handoff." : null,
    ].filter(Boolean) as string[],
    tables: [
      {
        title: "Validation Review Summary",
        headers: ["Severity", "Finding", "Review Note"],
        rows: validationRows,
      },
    ],
  };

  const platformRows = ctx.platformHighlights.map((line) => [line, "Review during final engineering and procurement alignment"]);

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
      ...ctx.openItems,
      ...ctx.warnings.slice(0, 6).map((item) => `Validation review item: ${item.title} — ${item.message}`),
    ],
  };

  const conclusionSection: ReportSection = {
    title: "10. Conclusion and Handoff Notes",
    paragraphs: [
      `${ctx.project.name} now has a structured network design package that translates saved requirements and synthesized planning data into a more formal handoff document. The report provides enough structure for technical review, addressing confirmation, security discussion, routing review, implementation planning, and platform alignment without pretending that the remaining open items do not exist.`,
      ctx.errors.length > 0
        ? `The next priority should be to resolve the remaining ${ctx.errors.length} blocker${ctx.errors.length === 1 ? "" : "s"}, rerun validation, and then regenerate the report so the final handoff reflects a cleaner implementation posture.`
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
          rows: ctx.sites.flatMap((site) =>
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
            ? ctx.sites.flatMap((site) =>
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
            ctx.validations.length > 0
              ? ctx.validations.map((item) => [item.severity, asString(item.entityType, "PROJECT"), item.title, item.message])
              : [["INFO", "PROJECT", "No validation results recorded", "Run validation again if a fresh review is needed."]],
        },
      ],
    },
  ];

  return {
    title: ctx.project.reportHeader || `${ctx.project.name} Technical Design Report`,
    subtitle: `${ctx.project.name} — Professional Network Planning Package`,
    generatedAt,
    executiveSummary,
    sections: [introSection, discoverySection, hldSection, securitySection, addressingSection, routingSection, implementationSection, platformSection, risksSection, conclusionSection],
    appendices,
  } satisfies ProfessionalReport;
}

export async function getCsvRows(projectId: string) {
  const project = await getProjectExportData(projectId);
  const ctx = buildExportContext(project);
  if (!ctx) return [];

  const rows: Array<Record<string, unknown>> = [];

  rows.push(
    { Section: "Project", Scope: "Project", Name: ctx.project.name, Key: "Organization", Value: ctx.project.organizationName ?? "", Notes: "" },
    { Section: "Project", Scope: "Project", Name: ctx.project.name, Key: "Environment", Value: ctx.project.environmentType ?? "", Notes: "" },
    { Section: "Project", Scope: "Project", Name: ctx.project.name, Key: "Base Private Range", Value: ctx.project.basePrivateRange ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Planning For", Value: ctx.requirements.planningFor ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Project Phase", Value: ctx.requirements.projectPhase ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Primary Goal", Value: ctx.requirements.primaryGoal ?? "", Notes: "" },
    { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Compliance Profile", Value: ctx.requirements.complianceProfile ?? "", Notes: "" },
  );

  for (const site of ctx.sites) {
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

  for (const zone of ctx.securityZones) {
    rows.push({ Section: "Security", Scope: "Project", Name: zone, Key: "Zone", Value: zone, Notes: "Generated from current requirements scope" });
  }

  for (const item of ctx.validations) {
    rows.push({ Section: "Validation", Scope: item.entityType ?? "PROJECT", Name: item.title, Key: item.severity, Value: item.message, Notes: item.ruleCode ?? "" });
  }

  for (const item of ctx.platformHighlights) {
    rows.push({ Section: "Platform/BOM", Scope: "Project", Name: ctx.project.name, Key: "Profile", Value: item, Notes: "Review before procurement" });
  }

  for (const item of ctx.discoveryHighlights) {
    rows.push({ Section: "Discovery", Scope: "Project", Name: ctx.project.name, Key: "Highlight", Value: item, Notes: "Current-state input" });
  }

  return rows;
}
