import type { Project, Site, Vlan } from "./types";
import type { RequirementsProfile } from "./requirementsProfile";
import type { SynthesizedLogicalDesign } from "./designSynthesis";

export interface PlatformProfileState {
  platformMode: string;
  vendorStrategy: string;
  routingStack: string;
  switchingStack: string;
  firewallStack: string;
  wirelessStack: string;
  wanStack: string;
  cloudStack: string;
  operationsModel: string;
  automationReadiness: string;
  availabilityTier: string;
  supportModel: string;
  procurementModel: string;
  lifecyclePolicy: string;
  notesText: string;
  lastSavedAt?: string;
}

export interface PlatformProfileSummary {
  profileLabel: string;
  deploymentClass: string;
  managementStyle: string;
  operationsFit: string;
  highlights: string[];
  compatibilityNotes: string[];
  deploymentRisks: string[];
}

export interface BomFoundationRow {
  category: string;
  item: string;
  quantity: number | string;
  unit: string;
  scope: string;
  basis: string;
  confidence: "estimated" | "review" | "placeholder";
  notes: string[];
}

export interface BomFoundationSummary {
  platformSummary: PlatformProfileSummary;
  bomItems: BomFoundationRow[];
  bomAssumptions: string[];
  procurementNotes: string[];
  licensingAndSupport: string[];
  totals: {
    lineItems: number;
    hardwareCategories: number;
    reviewItems: number;
  };
}

const storageKey = (projectId: string) => `subnetops.platform-bom.${projectId}`;

export const emptyPlatformProfileState = (): PlatformProfileState => ({
  platformMode: "traditional campus and branch",
  vendorStrategy: "mixed vendor with practical standardization",
  routingStack: "enterprise routed core and branch edge",
  switchingStack: "stackable campus switching",
  firewallStack: "NGFW at primary edge and policy boundaries",
  wirelessStack: "controller or cloud-managed enterprise wireless",
  wanStack: "business WAN with VPN or SD-WAN evolution path",
  cloudStack: "hybrid-ready with secure cloud edge",
  operationsModel: "small internal team with repeatable standards",
  automationReadiness: "template-driven with light automation",
  availabilityTier: "business-critical with controlled resilience",
  supportModel: "vendor support plus internal operational ownership",
  procurementModel: "role-based BOM with final engineering review",
  lifecyclePolicy: "standard refresh and supportability review",
  notesText: "",
});

export function parsePlatformProfileState(raw?: string | null): PlatformProfileState {
  if (!raw) return emptyPlatformProfileState();
  try {
    const parsed = JSON.parse(raw) as Partial<PlatformProfileState>;
    return {
      ...emptyPlatformProfileState(),
      ...parsed,
    };
  } catch {
    return emptyPlatformProfileState();
  }
}

export function resolvePlatformProfileState(projectId: string, project?: Pick<Project, "platformProfileJson"> | null): PlatformProfileState {
  const fromProject = parsePlatformProfileState(project?.platformProfileJson);
  if (project?.platformProfileJson) return fromProject;
  return loadPlatformProfileState(projectId);
}

export function loadPlatformProfileState(projectId: string): PlatformProfileState {
  if (typeof window === "undefined") return emptyPlatformProfileState();
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    return parsePlatformProfileState(raw);
  } catch {
    return emptyPlatformProfileState();
  }
}

export function savePlatformProfileState(projectId: string, value: PlatformProfileState) {
  if (typeof window === "undefined") return;
  const payload: PlatformProfileState = {
    ...value,
    lastSavedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(storageKey(projectId), JSON.stringify(payload));
}

export function clearPlatformProfileState(projectId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(projectId));
}

function toNumber(value: string | number | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function countSites(profile: RequirementsProfile, sites: Site[]) {
  return Math.max(sites.length, Math.max(1, toNumber(profile.siteCount, 1)));
}

function primarySiteName(sites: Site[]) {
  return sites[0]?.name || "Primary site";
}

function normalizePerSiteCount(raw: string | number | undefined, fallbackPerSite: number, siteCount: number, maxReasonablePerSite: number) {
  const parsed = toNumber(raw, fallbackPerSite);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackPerSite;
  if (parsed <= maxReasonablePerSite) return parsed;
  const spreadAcrossSites = Math.ceil(parsed / Math.max(1, siteCount));
  if (spreadAcrossSites <= maxReasonablePerSite) return spreadAcrossSites;
  return maxReasonablePerSite;
}

function wiredUserFactor(mix: string) {
  if (/mostly wireless/i.test(mix)) return 0.45;
  if (/balanced/i.test(mix)) return 0.65;
  if (/wired/i.test(mix)) return 0.85;
  return 0.6;
}

export function synthesizePlatformBomFoundation(input: {
  project?: Project;
  sites: Site[];
  vlans: Vlan[];
  profile: RequirementsProfile;
  synthesized: SynthesizedLogicalDesign;
  state: PlatformProfileState;
}): BomFoundationSummary {
  const { sites, vlans, profile, synthesized, state } = input;
  const siteCount = countSites(profile, sites);
  const usersPerSite = Math.max(1, toNumber(profile.usersPerSite, 50));
  const printersPerSite = profile.printers ? Math.max(1, normalizePerSiteCount(profile.printerCount, 3, siteCount, Math.max(10, Math.ceil(usersPerSite / 15)))) : 0;
  const phonesPerSite = profile.voice ? Math.max(1, normalizePerSiteCount(profile.phoneCount, Math.ceil(usersPerSite * 0.3), siteCount, Math.max(20, usersPerSite))) : 0;
  const apsPerSite = profile.wireless || profile.guestWifi ? Math.max(1, normalizePerSiteCount(profile.apCount, Math.ceil(usersPerSite / 25), siteCount, Math.max(4, Math.ceil(usersPerSite / 8)))) : 0;
  const camerasPerSite = profile.cameras ? Math.max(1, normalizePerSiteCount(profile.cameraCount, 4, siteCount, Math.max(8, Math.ceil(usersPerSite / 10)))) : 0;
  const iotPerSite = profile.iot ? Math.max(1, normalizePerSiteCount(profile.iotDeviceCount, 6, siteCount, Math.max(10, usersPerSite * 2))) : 0;
  const serversPerSite = /distributed|local/i.test(profile.serverPlacement) ? Math.max(0, normalizePerSiteCount(profile.serverCount, 2, siteCount, Math.max(2, Math.ceil(usersPerSite / 50)))) : 0;
  const localEdgePortDemand = Math.ceil(usersPerSite * wiredUserFactor(profile.wiredWirelessMix)) + printersPerSite + phonesPerSite + apsPerSite + camerasPerSite + iotPerSite + Math.min(serversPerSite, 4) + 4;
  const accessSwitchesPerSite = Math.max(1, Math.ceil(localEdgePortDemand / 48));
  const multiSite = siteCount > 1;
  const largePrimary = usersPerSite >= 150 || toNumber(profile.buildingCount, 1) > 1 || toNumber(profile.floorCount, 1) > 2;
  const primaryCoreCount = multiSite || largePrimary ? 2 : 1;
  const branchAggregationCount = multiSite ? Math.max(1, siteCount - 1) : 0;
  const firewallCount = multiSite || profile.dualIsp || /high|critical|compliance/i.test(`${profile.outageTolerance} ${profile.complianceProfile}`) ? Math.max(siteCount, 2) : Math.max(1, siteCount);
  const edgeRouterCount = /sd-wan|mpls|router/i.test(`${state.wanStack} ${profile.internetModel} ${profile.cloudConnectivity}`) ? Math.max(siteCount, multiSite ? 2 : 1) : 0;
  const wanCircuits = profile.dualIsp ? siteCount * 2 : siteCount;
  const opticsBundles = Math.max(primaryCoreCount + branchAggregationCount + siteCount, synthesized.wanLinks.length * 2 || 2);
  const rackPowerKits = Math.max(siteCount, primaryCoreCount);

  const platformHighlights = [
    `${state.platformMode} profile with ${state.vendorStrategy} as the working vendor posture for design and delivery outputs.`,
    `Operations posture assumes ${state.operationsModel}, ${state.automationReadiness}, and ${state.supportModel}.`,
    `Availability target is ${state.availabilityTier}, which shapes redundancy, support, and BOM review expectations.`,
  ];

  const compatibilityNotes: string[] = [
    `The current design package expects ${state.routingStack} and ${state.switchingStack}, so the chosen platform family should support routed site summaries, stable loopback identity, and access-edge role templates.`,
    `Security and segmentation outputs assume ${state.firewallStack}; final rule granularity still needs platform-specific engineering review.`,
    profile.wireless || profile.guestWifi
      ? `Wireless scope exists, so ${state.wirelessStack} should support separate staff/guest SSIDs, policy-aware segmentation, and centralized monitoring.`
      : `Wireless is not a major driver in this project, so platform emphasis stays on routing, switching, and security controls.`,
    profile.cloudConnected || profile.environmentType !== "On-prem"
      ? `Hybrid/cloud posture exists, so ${state.cloudStack} should support the proposed edge trust boundary and controlled route exchange.`
      : `Cloud posture is limited, so the platform profile can stay more campus/branch-centric unless the scope changes.`,
  ];

  const deploymentRisks: string[] = [];
  if (/manual|low/i.test(state.automationReadiness) && synthesized.configurationTemplates.length > 3) {
    deploymentRisks.push("The standards package is growing, but the platform profile still assumes mostly manual execution. That raises drift risk across multiple sites.");
  }
  if (/single/i.test(state.availabilityTier) && (profile.dualIsp || multiSite || largePrimary)) {
    deploymentRisks.push("The project scope implies business-critical resilience, but the chosen availability tier still looks light for the current topology and outage expectations.");
  }
  if (/cloud-managed/i.test(state.wirelessStack) && /strict on-prem|controller/i.test(profile.wirelessModel)) {
    deploymentRisks.push("Wireless platform posture and requirement text are pulling in different directions. Reconcile controller versus cloud-managed expectations before procurement.");
  }
  if (/mixed vendor/i.test(state.vendorStrategy) && /small internal team|generalist/i.test(`${state.operationsModel} ${profile.teamCapability}`)) {
    deploymentRisks.push("A mixed-vendor environment may outpace the current team model unless standards and support boundaries stay very disciplined.");
  }
  if (deploymentRisks.length === 0) {
    deploymentRisks.push("This platform profile is directionally aligned with the current logical design, but quantities and final models still need engineering review before procurement.");
  }

  const platformSummary: PlatformProfileSummary = {
    profileLabel: `${state.vendorStrategy} · ${state.platformMode}`,
    deploymentClass: multiSite ? `${siteCount}-site structured deployment` : "single-site structured deployment",
    managementStyle: `${state.operationsModel} with ${state.automationReadiness}`,
    operationsFit: state.supportModel,
    highlights: platformHighlights,
    compatibilityNotes,
    deploymentRisks,
  };

  const bomItems: BomFoundationRow[] = [
    {
      category: "Campus / core switching",
      item: largePrimary || multiSite ? "Core or distribution switching pair" : "Primary routed switching node",
      quantity: primaryCoreCount,
      unit: "device",
      scope: primarySiteName(sites),
      basis: multiSite || largePrimary ? "Primary site needs a resilient routed switching layer for summaries, services, and control-plane roles." : "Single-site scope can start with one routed switching node, but the BOM still records the role explicitly.",
      confidence: multiSite || largePrimary ? "estimated" : "review",
      notes: [state.switchingStack, synthesized.highLevelDesign.layerModel],
    },
    {
      category: "Branch / site aggregation",
      item: multiSite ? "Branch routed aggregation or collapsed-edge node" : "Optional expansion node",
      quantity: branchAggregationCount,
      unit: "device",
      scope: multiSite ? `${Math.max(siteCount - 1, 0)} remote site(s)` : "Future growth",
      basis: multiSite ? "Each additional site normally needs a local routed or security-aware edge to terminate site segments and summaries." : "Not required today, but reserved for growth review.",
      confidence: multiSite ? "estimated" : "placeholder",
      notes: multiSite ? [synthesized.highLevelDesign.wanArchitecture, synthesized.highLevelDesign.routingStrategy] : ["No current multi-site requirement."] ,
    },
    {
      category: "Access layer",
      item: "48-port access switches",
      quantity: accessSwitchesPerSite * siteCount,
      unit: "device",
      scope: `${siteCount} site(s)`,
      basis: `Per-site port demand is estimated at ${localEdgePortDemand} ports from users, APs, phones, printers, cameras, IoT, and local infra margin.`,
      confidence: "estimated",
      notes: [`Approx. ${accessSwitchesPerSite} switch(es) per site`, profile.wiredWirelessMix],
    },
    {
      category: "Security edge",
      item: "Firewall / security edge nodes",
      quantity: firewallCount,
      unit: "device",
      scope: multiSite ? "Primary edge and site boundaries" : "Primary site edge",
      basis: "Segmentation, guest isolation, remote access, and WAN/cloud edge policy all require explicit security enforcement points.",
      confidence: multiSite || profile.dualIsp ? "estimated" : "review",
      notes: [state.firewallStack, synthesized.highLevelDesign.securityArchitecture],
    },
    {
      category: "Routing / WAN edge",
      item: "WAN / SD-WAN / provider edge routers or edge licenses",
      quantity: edgeRouterCount || "Review",
      unit: edgeRouterCount ? "device" : "line item",
      scope: multiSite || profile.cloudConnected ? "Site and cloud/provider edges" : "Primary edge only",
      basis: "Included when the WAN posture suggests distinct routed/provider edge functions beyond firewall-only internet access.",
      confidence: edgeRouterCount ? "review" : "placeholder",
      notes: [state.wanStack, profile.cloudConnectivity],
    },
    {
      category: "Wireless",
      item: "Access points",
      quantity: apsPerSite * siteCount,
      unit: "AP",
      scope: `${siteCount} site(s)`,
      basis: profile.wireless || profile.guestWifi ? `Using ${Math.max(1, apsPerSite)} AP(s) per site based on user density and saved AP estimates.` : "Wireless not currently in scope.",
      confidence: profile.wireless || profile.guestWifi ? "estimated" : "placeholder",
      notes: [state.wirelessStack, profile.wirelessModel],
    },
    {
      category: "Wireless control / licensing",
      item: /cloud-managed/i.test(state.wirelessStack) ? "Cloud wireless subscriptions" : "Wireless controller or controller licensing",
      quantity: profile.wireless || profile.guestWifi ? (siteCount > 1 ? "Review" : 1) : 0,
      unit: /cloud-managed/i.test(state.wirelessStack) ? "subscription group" : "controller/license",
      scope: profile.wireless || profile.guestWifi ? "Wireless management plane" : "Not required",
      basis: "Wireless platforms need a management/control plane even when AP counts are modest.",
      confidence: profile.wireless || profile.guestWifi ? "review" : "placeholder",
      notes: [state.wirelessStack],
    },
    {
      category: "Optics and cabling",
      item: "Uplink optic / DAC / cabling bundles",
      quantity: opticsBundles,
      unit: "bundle",
      scope: "Core, aggregation, and edge uplinks",
      basis: `Based on ${primaryCoreCount + branchAggregationCount} routed switching/aggregation roles plus ${siteCount} site edge footprints and ${synthesized.wanLinks.length} synthesized transit links.`,
      confidence: "review",
      notes: ["Exact optics depend on distance, media, and platform selections."],
    },
    {
      category: "Power and rack",
      item: "UPS / rack / power accessory kits",
      quantity: rackPowerKits,
      unit: "kit",
      scope: `${siteCount} site(s) or primary network rooms`,
      basis: "Physical deployment support items must be accounted for even in a logical-design-first BOM foundation.",
      confidence: "review",
      notes: [profile.physicalScope, profile.closetModel],
    },
    {
      category: "Carrier / subscriptions",
      item: profile.dualIsp ? "WAN or ISP circuits (dual path)" : "WAN or ISP circuits",
      quantity: wanCircuits,
      unit: "service",
      scope: `${siteCount} site(s)`,
      basis: profile.dualIsp ? "Dual-path resilience was requested, so the foundation assumes two circuit or provider dependencies per site." : "One primary WAN or internet path per site is assumed at this stage.",
      confidence: "estimated",
      notes: [profile.internetModel, state.wanStack],
    },
    {
      category: "Support and software",
      item: "Support contracts / device software subscriptions",
      quantity: "Review",
      unit: "program",
      scope: "All managed infrastructure roles",
      basis: "Every platform profile needs an explicit supportability model, not just hardware quantities.",
      confidence: "review",
      notes: [state.supportModel, state.lifecyclePolicy],
    },
  ];

  const bomAssumptions = [
    `BOM quantities are derived from approximately ${usersPerSite} users per site across ${siteCount} site(s) plus the saved device counts in the requirements workspace.`,
    `This is a role-based BOM foundation, not a final SKU list. Platform family, form factor, and licensing still need engineering and procurement review.`,
    `Addressing, segmentation, WAN, and security roles from the synthesized design are treated as the minimum structural drivers for the BOM.` ,
  ];

  const procurementNotes = [
    `Use the platform profile to narrow the vendor family before creating exact models, optics, support tiers, and software subscriptions.`,
    `Treat multi-site, dual-ISP, hybrid-cloud, and high-availability assumptions as cost multipliers that need explicit approval before quoting.`,
    `Finalize BOM quantities only after physical layout, closet assumptions, and any current-state reuse decisions are reviewed against discovery inputs.`,
  ];

  const licensingAndSupport = [
    `Wireless management approach: ${state.wirelessStack}.`,
    `Support posture: ${state.supportModel}.`,
    `Lifecycle policy: ${state.lifecyclePolicy}.`,
    `Procurement approach: ${state.procurementModel}.`,
  ];

  return {
    platformSummary,
    bomItems,
    bomAssumptions,
    procurementNotes,
    licensingAndSupport,
    totals: {
      lineItems: bomItems.length,
      hardwareCategories: new Set(bomItems.map((item) => item.category)).size,
      reviewItems: bomItems.filter((item) => item.confidence !== "estimated").length,
    },
  };
}
