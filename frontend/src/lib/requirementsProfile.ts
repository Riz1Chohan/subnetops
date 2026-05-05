export type RequirementsProfile = {
  planningFor: string;
  projectStage: string;
  environmentType: string;
  complianceProfile: string;
  siteCount: string;
  usersPerSite: string;
  internetModel: string;
  serverPlacement: string;
  primaryGoal: string;
  guestWifi: boolean;
  voice: boolean;
  management: boolean;
  printers: boolean;
  iot: boolean;
  cameras: boolean;
  wireless: boolean;
  remoteAccess: boolean;
  dualIsp: boolean;
  cloudConnected: boolean;
  guestPolicy: string;
  voiceQos: string;
  managementAccess: string;
  wirelessModel: string;
  remoteAccessMethod: string;
  cloudProvider: string;
  cloudConnectivity: string;
  resilienceTarget: string;
  securityPosture: string;
  trustBoundaryModel: string;
  adminBoundary: string;
  identityModel: string;
  cloudIdentityBoundary: string;
  cloudTrafficBoundary: string;
  cloudHostingModel: string;
  cloudNetworkModel: string;
  cloudRoutingModel: string;
  addressHierarchyModel: string;
  siteBlockStrategy: string;
  gatewayConvention: string;
  growthBufferModel: string;
  reservedRangePolicy: string;
  managementIpPolicy: string;
  siteIdentityCapture: string;
  namingStandard: string;
  deviceNamingConvention: string;
  namingTokenPreference: string;
  namingHierarchy: string;
  customNamingPattern: string;
  monitoringModel: string;
  loggingModel: string;
  backupPolicy: string;
  operationsOwnerModel: string;
  siteLayoutModel: string;
  physicalScope: string;
  printerCount: string;
  phoneCount: string;
  apCount: string;
  cameraCount: string;
  serverCount: string;
  iotDeviceCount: string;
  wiredWirelessMix: string;
  siteRoleModel: string;
  buildingCount: string;
  floorCount: string;
  closetModel: string;
  edgeFootprint: string;
  applicationProfile: string;
  criticalServicesModel: string;
  interSiteTrafficModel: string;
  bandwidthProfile: string;
  latencySensitivity: string;
  qosModel: string;
  outageTolerance: string;
  growthHorizon: string;
  budgetModel: string;
  vendorPreference: string;
  implementationTimeline: string;
  rolloutModel: string;
  downtimeConstraint: string;
  teamCapability: string;
  outputPackage: string;
  primaryAudience: string;
  customRequirementsNotes: string;
};

export const defaultRequirementsProfile: RequirementsProfile = {
  planningFor: "Office",
  projectStage: "New network build",
  environmentType: "On-prem",
  complianceProfile: "General business",
  siteCount: "",
  usersPerSite: "",
  internetModel: "internet at each site",
  serverPlacement: "centralized servers or services",
  primaryGoal: "security and segmentation",
  guestWifi: true,
  voice: false,
  management: true,
  printers: true,
  iot: false,
  cameras: false,
  wireless: true,
  remoteAccess: false,
  dualIsp: false,
  cloudConnected: false,
  guestPolicy: "internet-only isolated guest access",
  voiceQos: "voice prioritized over standard user traffic",
  managementAccess: "management reachable only from trusted admin networks",
  wirelessModel: "separate staff and guest SSIDs",
  remoteAccessMethod: "SSL VPN or modern remote access gateway",
  cloudProvider: "Azure",
  cloudConnectivity: "site-to-cloud VPN",
  resilienceTarget: "single ISP acceptable",
  securityPosture: "segmented by function and trust level",
  trustBoundaryModel: "internal users, guests, management, and services separated",
  adminBoundary: "privileged administration isolated from user access",
  identityModel: "central identity for staff and administrators",
  cloudIdentityBoundary: "shared identity between on-prem and cloud",
  cloudTrafficBoundary: "private application traffic separated from public internet access",
  cloudHostingModel: "selected services extended into cloud while core users remain on-prem",
  cloudNetworkModel: "provider VNet/VPC with private application address space",
  cloudRoutingModel: "summarized site routes and controlled cloud prefixes",
  addressHierarchyModel: "organization block to site block to segment subnet hierarchy",
  siteBlockStrategy: "reserve consistent site blocks for clean summarization",
  gatewayConvention: "first usable address as default gateway",
  growthBufferModel: "leave headroom for expansion in each site and segment",
  reservedRangePolicy: "reserve infrastructure and management ranges inside each site block",
  managementIpPolicy: "dedicated management IP space per site and device role",
  siteIdentityCapture: "capture site name, city or location label, and optional street address for each site",
  namingStandard: "site-role-device naming with consistent short codes",
  deviceNamingConvention: "automatic short-code standard (SW_TOR_01 / FW_TOR_01)",
  namingTokenPreference: "prefer site code when available, otherwise derive from the location or site name",
  namingHierarchy: "site → building → floor → role → index when available",
  customNamingPattern: "",
  monitoringModel: "central monitoring with device health, interfaces, and alerts",
  loggingModel: "central syslog and event retention for infrastructure devices",
  backupPolicy: "scheduled configuration backups for key network devices",
  operationsOwnerModel: "internal IT ownership with documented admin responsibilities",
  siteLayoutModel: "single building or floor per site with a simple edge layout",
  physicalScope: "basic site layout without detailed closet mapping yet",
  printerCount: "5",
  phoneCount: "0",
  apCount: "4",
  cameraCount: "0",
  serverCount: "2",
  iotDeviceCount: "0",
  wiredWirelessMix: "mostly wireless users with wired infrastructure and shared devices",
  siteRoleModel: "primary office or main site",
  buildingCount: "1",
  floorCount: "1",
  closetModel: "single small edge/closet footprint",
  edgeFootprint: "compact access edge with limited local infrastructure",
  applicationProfile: "general business apps, collaboration, file access, and internet browsing",
  criticalServicesModel: "directory, DHCP/DNS, file access, and internet edge are important services",
  interSiteTrafficModel: "moderate inter-site traffic for shared services and administration",
  bandwidthProfile: "balanced branch and user bandwidth with normal business traffic",
  latencySensitivity: "voice and interactive apps should remain responsive",
  qosModel: "basic prioritization for voice and critical interactive traffic",
  outageTolerance: "short outages acceptable but critical services should recover quickly",
  growthHorizon: "plan for 1 to 3 years of moderate growth",
  budgetModel: "balanced budget with room for core security and reliability controls",
  vendorPreference: "vendor-flexible with preference for practical supportable options",
  implementationTimeline: "normal staged project timeline",
  rolloutModel: "staged rollout with validation before wider deployment",
  downtimeConstraint: "limited downtime should be planned and communicated",
  teamCapability: "small to mid-sized internal team with practical support needs",
  outputPackage: "technical handoff plus stakeholder summary",
  primaryAudience: "internal IT team and technical reviewers",
  customRequirementsNotes: "",
};

export function parseRequirementsProfile(value?: string | null): RequirementsProfile {
  if (!value) return { ...defaultRequirementsProfile };
  try {
    const parsed = JSON.parse(value) as Partial<RequirementsProfile>;
    return { ...defaultRequirementsProfile, ...parsed };
  } catch {
    return { ...defaultRequirementsProfile };
  }
}

export function stringifyRequirementsProfile(value: RequirementsProfile) {
  return JSON.stringify(value);
}

export function buildGuidedPrompt(values: RequirementsProfile) {
  const features: string[] = [];
  if (values.guestWifi) features.push(`isolated guest Wi-Fi with ${values.guestPolicy}`);
  if (values.voice) features.push(`voice VLANs with ${values.voiceQos}`);
  if (values.management) features.push(`a management network with ${values.managementAccess}`);
  if (values.printers) features.push("printer segmentation");
  if (values.iot) features.push("IoT separation");
  if (values.cameras) features.push("camera/security device separation");
  if (values.wireless) features.push(`wireless access planning using ${values.wirelessModel}`);
  if (values.remoteAccess) features.push(`remote access using ${values.remoteAccessMethod}`);
  if (values.dualIsp) features.push(`redundancy target of ${values.resilienceTarget}`);
  if (values.cloudConnected || values.environmentType !== "On-prem") features.push(`cloud connectivity via ${values.cloudConnectivity} with ${values.cloudProvider}`, `cloud identity boundary of ${values.cloudIdentityBoundary}`, `cloud traffic boundary of ${values.cloudTrafficBoundary}`, `cloud hosting model of ${values.cloudHostingModel}`, `cloud network model of ${values.cloudNetworkModel}`, `cloud routing model of ${values.cloudRoutingModel}`);
  if (values.management || values.guestWifi || values.remoteAccess || values.iot || values.cameras) features.push(`security posture of ${values.securityPosture}`, `trust boundary model of ${values.trustBoundaryModel}`, `administrative boundary of ${values.adminBoundary}`, `identity model of ${values.identityModel}`);
  features.push(`address hierarchy of ${values.addressHierarchyModel}`, `site block strategy of ${values.siteBlockStrategy}`, `gateway convention of ${values.gatewayConvention}`, `growth buffer model of ${values.growthBufferModel}`, `reserved range policy of ${values.reservedRangePolicy}`);
  features.push(`management IP policy of ${values.managementIpPolicy}`, `site identity capture of ${values.siteIdentityCapture}`, `naming standard of ${values.namingStandard}`, `device naming convention of ${values.deviceNamingConvention}`, `naming token preference of ${values.namingTokenPreference}`, `naming hierarchy of ${values.namingHierarchy}`, ...(values.customNamingPattern.trim() ? [`custom naming pattern of ${values.customNamingPattern.trim()}`] : []), `monitoring model of ${values.monitoringModel}`, `logging model of ${values.loggingModel}`, `backup policy of ${values.backupPolicy}`, `operations ownership of ${values.operationsOwnerModel}`);
  features.push(`site layout model of ${values.siteLayoutModel}`, `site role of ${values.siteRoleModel}`, `physical scope of ${values.physicalScope}`, `${values.buildingCount} building(s)`, `${values.floorCount} floor(s)`, `closet model of ${values.closetModel}`, `edge footprint of ${values.edgeFootprint}`, `about ${values.printerCount} printers`, `about ${values.phoneCount} phones`, `about ${values.apCount} access points`, `about ${values.cameraCount} cameras`, `about ${values.serverCount} servers`, `about ${values.iotDeviceCount} IoT or specialty devices`, `a user access mix of ${values.wiredWirelessMix}`);
  features.push(`application profile of ${values.applicationProfile}`, `critical services model of ${values.criticalServicesModel}`, `inter-site traffic model of ${values.interSiteTrafficModel}`, `bandwidth profile of ${values.bandwidthProfile}`, `latency sensitivity of ${values.latencySensitivity}`, `QoS model of ${values.qosModel}`, `outage tolerance of ${values.outageTolerance}`, `growth horizon of ${values.growthHorizon}`);
  features.push(`budget model of ${values.budgetModel}`, `vendor preference of ${values.vendorPreference}`, `implementation timeline of ${values.implementationTimeline}`, `rollout model of ${values.rolloutModel}`, `downtime constraint of ${values.downtimeConstraint}`, `team capability of ${values.teamCapability}`, `output package of ${values.outputPackage}`, `primary audience of ${values.primaryAudience}`);
  if (values.customRequirementsNotes.trim()) features.push(`custom requirements notes: ${values.customRequirementsNotes.trim()}`);

  const siteScope = values.siteCount.trim() ? `about ${values.siteCount} site(s)` : "site count not captured";
  const userScope = values.usersPerSite.trim() ? `around ${values.usersPerSite} users per site` : "users per site not captured";
  return `${values.planningFor} network, ${values.projectStage.toLowerCase()}, ${values.environmentType} environment, ${values.complianceProfile} context, ${siteScope}, ${userScope}, ${values.internetModel}, ${values.serverPlacement}, primary goal is ${values.primaryGoal}. Include ${features.length > 0 ? features.join(", ") : "realistic segmentation and subnet planning"}.`;
}



type NamingPreviewSite = {
  name: string;
  siteCode?: string | null;
  location?: string | null;
  buildingLabel?: string | null;
  floorLabel?: string | null;
  closetLabel?: string | null;
};

function normalizeToken(value?: string | null, fallback = "") {
  const cleaned = (value || '').trim();
  if (!cleaned) return fallback;
  return cleaned.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || fallback;
}

function shortNameToken(value?: string | null, fallback = 'SITE') {
  const fullName = (value || '').trim();
  if (!fullName) return fallback;
  return fullName.toUpperCase().replace(/[^A-Z0-9 ]+/g, '').split(/\s+/).filter(Boolean).map((part) => part.slice(0, 3)).join('_').slice(0, 18) || fallback;
}

function previewSiteToken(site: NamingPreviewSite, preference: string) {
  const pref = (preference || '').toLowerCase();
  const siteCodeToken = normalizeToken(site.siteCode);
  const siteNameToken = normalizeToken(site.location || site.name, 'SITE').slice(0, 18);
  const shortSiteToken = shortNameToken(site.location || site.name, 'SITE');
  const buildingToken = normalizeToken(site.buildingLabel, 'BLDG');
  const floorToken = normalizeToken(site.floorLabel, 'FLR');
  const closetToken = normalizeToken(site.closetLabel, 'CLST');
  if (pref.includes('full location') || pref.includes('full site name')) return siteNameToken;
  if (pref.includes('closet')) return [siteCodeToken || shortSiteToken, buildingToken, floorToken, closetToken].filter(Boolean).join('_').slice(0, 30);
  if (pref.includes('building') && pref.includes('floor')) return [siteCodeToken || shortSiteToken, buildingToken, floorToken].filter(Boolean).join('_').slice(0, 24);
  if (pref.includes('building')) return [siteCodeToken || shortSiteToken, buildingToken].filter(Boolean).join('_').slice(0, 20);
  if (pref.includes('floor')) return [siteCodeToken || shortSiteToken, floorToken].filter(Boolean).join('_').slice(0, 20);
  if (pref.includes('site code')) return (siteCodeToken || shortSiteToken).slice(0, 18);
  return (siteCodeToken || shortSiteToken || siteNameToken).slice(0, 18);
}

function previewDevicePrefix(role: string) {
  switch (role) {
    case 'firewall': return 'FW';
    case 'router': return 'RTR';
    case 'distribution-switch': return 'DSW';
    case 'access-switch':
    case 'core-switch': return 'SW';
    case 'access-point': return 'AP';
    case 'wireless-controller': return 'WLC';
    case 'server': return 'SRV';
    default: return 'DEV';
  }
}

function previewRoleLabel(role: string) {
  switch (role) {
    case 'firewall': return 'firewall';
    case 'router': return 'router';
    case 'distribution-switch': return 'distribution switch';
    case 'access-switch': return 'access switch';
    case 'core-switch': return 'switch';
    case 'access-point': return 'ap';
    case 'wireless-controller': return 'wlc';
    case 'server': return 'server';
    default: return role.replace(/-/g, ' ');
  }
}

function applyCustomPattern(input: { pattern: string; site: NamingPreviewSite; token: string; role: string; prefix: string; index: number; }) {
  const { pattern, site, token, role, prefix, index } = input;
  const replacements: Record<string, string> = {
    '{site}': token,
    '{siteCode}': normalizeToken(site.siteCode, token),
    '{siteName}': normalizeToken(site.location || site.name, token),
    '{location}': normalizeToken(site.location, token),
    '{building}': normalizeToken(site.buildingLabel, 'BLDG'),
    '{floor}': normalizeToken(site.floorLabel, 'FLR'),
    '{closet}': normalizeToken(site.closetLabel, 'CLST'),
    '{role}': prefix,
    '{roleLabel}': previewRoleLabel(role).toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
    '{index}': String(index).padStart(2, '0'),
  };
  let output = pattern;
  for (const [key, value] of Object.entries(replacements)) output = output.split(key).join(value);
  return output.replace(/[^A-Z0-9_-]+/gi, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, '') || `${prefix}_${token}_${String(index).padStart(2, '0')}`;
}

function previewDeviceName(input: { site: NamingPreviewSite; role: string; convention: string; preference: string; customPattern?: string; index?: number; }) {
  const { site, role, convention, preference, customPattern = '', index = 1 } = input;
  const token = previewSiteToken(site, preference);
  const prefix = previewDevicePrefix(role);
  const siteLabel = site.location || site.name || 'Site';
  const normalizedConvention = (convention || '').toLowerCase();
  if (normalizedConvention.includes('custom') && customPattern.trim()) {
    return applyCustomPattern({ pattern: customPattern.trim(), site, token, role, prefix, index });
  }
  if (normalizedConvention.includes('short-code')) return `${prefix}_${token}_${String(index).padStart(2, '0')}`;
  if (normalizedConvention.includes('location-role-index')) return `${token}-${prefix}-${String(index).padStart(2, '0')}`;
  if (normalizedConvention.includes('readable')) return `${siteLabel}-${prefix}${index}`;
  return `${siteLabel} ${role.replace(/-/g, ' ')} ${index}`;
}

export function buildNamingPreviewExamples(values: RequirementsProfile, sites?: NamingPreviewSite[]) {
  const previewSites = sites && sites.length > 0
    ? sites.slice(0, 3)
    : [
        { name: 'Toronto HQ', siteCode: 'TOR', location: 'Toronto HQ', buildingLabel: 'BLDG-A', floorLabel: 'FLR-01', closetLabel: 'MDF' },
        { name: 'Vancouver Branch', siteCode: 'VAN', location: 'Vancouver Branch', buildingLabel: 'BLDG-B', floorLabel: 'FLR-02', closetLabel: 'IDF-1' },
      ];

  return previewSites.map((site) => ({
    siteLabel: site.location || site.name,
    buildingLabel: site.buildingLabel || '—',
    floorLabel: site.floorLabel || '—',
    closetLabel: site.closetLabel || values.closetModel || '—',
    token: previewSiteToken(site, values.namingTokenPreference),
    firewall: previewDeviceName({ site, role: 'firewall', convention: values.deviceNamingConvention, preference: values.namingTokenPreference, customPattern: values.customNamingPattern, index: 1 }),
    firewallSecondary: previewDeviceName({ site, role: 'firewall', convention: values.deviceNamingConvention, preference: values.namingTokenPreference, customPattern: values.customNamingPattern, index: 2 }),
    switchName: previewDeviceName({ site, role: 'core-switch', convention: values.deviceNamingConvention, preference: values.namingTokenPreference, customPattern: values.customNamingPattern, index: 1 }),
    switchSecondary: previewDeviceName({ site, role: 'access-switch', convention: values.deviceNamingConvention, preference: values.namingTokenPreference, customPattern: values.customNamingPattern, index: 2 }),
    accessPoint: previewDeviceName({ site, role: 'access-point', convention: values.deviceNamingConvention, preference: values.namingTokenPreference, customPattern: values.customNamingPattern, index: 1 }),
    accessPointSecondary: previewDeviceName({ site, role: 'access-point', convention: values.deviceNamingConvention, preference: values.namingTokenPreference, customPattern: values.customNamingPattern, index: 2 }),
    routerName: previewDeviceName({ site, role: 'router', convention: values.deviceNamingConvention, preference: values.namingTokenPreference, customPattern: values.customNamingPattern, index: 1 }),
    controllerName: previewDeviceName({ site, role: 'wireless-controller', convention: values.deviceNamingConvention, preference: values.namingTokenPreference, customPattern: values.customNamingPattern, index: 1 }),
    serverName: previewDeviceName({ site, role: 'server', convention: values.deviceNamingConvention, preference: values.namingTokenPreference, customPattern: values.customNamingPattern, index: 1 }),
  }));
}

export function buildProjectSummaryDescription(values: RequirementsProfile, maxLength = 320) {
  const parts = [
    `${values.projectStage} ${values.planningFor.toLowerCase()} network`,
    `${values.environmentType.toLowerCase()} environment`,
    values.siteCount.trim() ? `${values.siteCount} site(s)` : "site count not captured",
    values.usersPerSite.trim() ? `${values.usersPerSite} users/site` : "users/site not captured",
    `primary goal: ${values.primaryGoal}`,
  ];

  if (values.guestWifi) parts.push(`guest access`);
  if (values.management) parts.push(`management network`);
  if (values.voice) parts.push(`voice`);
  if (values.remoteAccess) parts.push(`remote access`);
  if (values.cloudConnected || values.environmentType !== "On-prem") parts.push(`cloud-connected`);
  if (values.dualIsp) parts.push(`redundancy`);

  let summary = parts.join(", ");
  if (values.customRequirementsNotes.trim()) {
    summary += `. Notes: ${values.customRequirementsNotes.trim()}`;
  }
  if (summary.length <= maxLength) return summary;
  return `${summary.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildGuidedDescription(values: RequirementsProfile) {
  const details: string[] = [];
  if (values.guestWifi) details.push(`guest access policy: ${values.guestPolicy}`);
  if (values.management) details.push(`management access: ${values.managementAccess}`);
  if (values.voice) details.push(`voice treatment: ${values.voiceQos}`);
  if (values.wireless) details.push(`wireless model: ${values.wirelessModel}`);
  if (values.remoteAccess) details.push(`remote access via ${values.remoteAccessMethod}`);
  if (values.dualIsp) details.push(`resilience target: ${values.resilienceTarget}`);
  if (values.cloudConnected || values.environmentType !== "On-prem") details.push(`cloud pattern: ${values.cloudProvider} over ${values.cloudConnectivity}`, `cloud identity boundary: ${values.cloudIdentityBoundary}`, `cloud traffic boundary: ${values.cloudTrafficBoundary}`, `cloud hosting model: ${values.cloudHostingModel}`, `cloud network model: ${values.cloudNetworkModel}`, `cloud routing model: ${values.cloudRoutingModel}`);
  if (values.management || values.guestWifi || values.remoteAccess || values.iot || values.cameras) details.push(`security posture: ${values.securityPosture}`, `trust boundaries: ${values.trustBoundaryModel}`, `admin boundary: ${values.adminBoundary}`, `identity model: ${values.identityModel}`);
  details.push(`address hierarchy: ${values.addressHierarchyModel}`, `site block strategy: ${values.siteBlockStrategy}`, `gateway convention: ${values.gatewayConvention}`, `growth buffer model: ${values.growthBufferModel}`, `reserved range policy: ${values.reservedRangePolicy}`);
  details.push(`management IP policy: ${values.managementIpPolicy}`, `site identity capture: ${values.siteIdentityCapture}`, `naming standard: ${values.namingStandard}`, `device naming convention: ${values.deviceNamingConvention}`, `naming token preference: ${values.namingTokenPreference}`, `naming hierarchy: ${values.namingHierarchy}`, ...(values.customNamingPattern.trim() ? [`custom naming pattern: ${values.customNamingPattern.trim()}`] : []), `monitoring model: ${values.monitoringModel}`, `logging model: ${values.loggingModel}`, `backup policy: ${values.backupPolicy}`, `operations ownership: ${values.operationsOwnerModel}`);
  details.push(`site layout: ${values.siteLayoutModel}`, `site role: ${values.siteRoleModel}`, `physical scope: ${values.physicalScope}`, `buildings: ${values.buildingCount}`, `floors: ${values.floorCount}`, `closet model: ${values.closetModel}`, `edge footprint: ${values.edgeFootprint}`, `printers: ${values.printerCount}`, `phones: ${values.phoneCount}`, `access points: ${values.apCount}`, `cameras: ${values.cameraCount}`, `servers: ${values.serverCount}`, `IoT/specialty devices: ${values.iotDeviceCount}`, `wired/wireless mix: ${values.wiredWirelessMix}`);
  details.push(`application profile: ${values.applicationProfile}`, `critical services: ${values.criticalServicesModel}`, `inter-site traffic: ${values.interSiteTrafficModel}`, `bandwidth profile: ${values.bandwidthProfile}`, `latency sensitivity: ${values.latencySensitivity}`, `QoS model: ${values.qosModel}`, `outage tolerance: ${values.outageTolerance}`, `growth horizon: ${values.growthHorizon}`);
  details.push(`budget model: ${values.budgetModel}`, `vendor preference: ${values.vendorPreference}`, `implementation timeline: ${values.implementationTimeline}`, `rollout model: ${values.rolloutModel}`, `downtime constraint: ${values.downtimeConstraint}`, `team capability: ${values.teamCapability}`, `output package: ${values.outputPackage}`, `primary audience: ${values.primaryAudience}`);
  if (values.customRequirementsNotes.trim()) details.push(`custom requirements notes: ${values.customRequirementsNotes.trim()}`);

  return [
    `${values.projectStage} ${values.planningFor.toLowerCase()} network plan for a ${values.environmentType.toLowerCase()} environment.`,
    `Planned scope: ${values.siteCount.trim() ? `${values.siteCount} site(s)` : "site count not captured"}, ${values.usersPerSite.trim() ? `about ${values.usersPerSite} users per site` : "users per site not captured"}, ${values.internetModel}, ${values.serverPlacement}.`,
    `Primary design priority: ${values.primaryGoal}. Compliance or policy context: ${values.complianceProfile}.`,
    details.length > 0 ? `Scenario details include ${details.join(", ")}.` : "Planning assumptions will be refined during logical design.",
  ].join(" ");
}

export function planningSignals(values: RequirementsProfile) {
  return [values.planningFor, values.environmentType, values.complianceProfile, values.primaryGoal];
}

export function conditionalSections(values: RequirementsProfile) {
  return {
    wireless: values.wireless || values.guestWifi,
    voice: values.voice,
    security: values.guestWifi || values.management || values.iot || values.cameras || values.remoteAccess,
    resilience: values.dualIsp,
    cloud: values.environmentType !== "On-prem" || values.cloudConnected,
  };
}


export function planningTracks(values: RequirementsProfile) {
  const tracks: string[] = ["Core requirements", "Addressing"];
  const siteCount = Number(values.siteCount || "0");
  if (values.guestWifi || values.management || values.remoteAccess || values.iot || values.cameras) tracks.push("Security");
  if (values.environmentType !== "On-prem" || values.cloudConnected) tracks.push("Cloud / Hybrid");
  if (values.wireless || values.guestWifi) tracks.push("Wireless");
  if (values.voice || Number(values.phoneCount || "0") > 0) tracks.push("Voice / QoS");
  if (siteCount > 1 || values.internetModel !== "internet at each site") tracks.push("WAN / Multi-site");
  if (Number(values.cameraCount || "0") > 0 || Number(values.iotDeviceCount || "0") > 0) tracks.push("Specialty devices");
  tracks.push("Operations", "Implementation / Handoff");
  return tracks;
}


export type PlanningTrackStatus = {
  key: string;
  label: string;
  active: boolean;
  status: "READY" | "REVIEW" | "INACTIVE";
  note: string;
};

export function planningTrackStatuses(values: RequirementsProfile): PlanningTrackStatus[] {
  const siteCount = Number(values.siteCount || "0");
  const cloudActive = values.environmentType !== "On-prem" || values.cloudConnected;
  const securityActive = values.guestWifi || values.management || values.remoteAccess || values.iot || values.cameras;
  const wirelessActive = values.wireless || values.guestWifi;
  const voiceActive = values.voice || Number(values.phoneCount || "0") > 0;
  const wanActive = siteCount > 1 || values.internetModel !== "internet at each site";

  return [
    {
      key: "security",
      label: "Security",
      active: securityActive,
      status: securityActive ? "READY" : "INACTIVE",
      note: securityActive ? `${values.securityPosture}; ${values.trustBoundaryModel}` : "Not heavily triggered by the current scenario.",
    },
    {
      key: "cloud",
      label: "Cloud / Hybrid",
      active: cloudActive,
      status: cloudActive ? "READY" : "INACTIVE",
      note: cloudActive ? `${values.cloudProvider} via ${values.cloudConnectivity}; ${values.cloudRoutingModel}` : "On-prem focused scenario.",
    },
    {
      key: "addressing",
      label: "Addressing",
      active: true,
      status: values.addressHierarchyModel && values.siteBlockStrategy && values.gatewayConvention ? "READY" : "REVIEW",
      note: `${values.addressHierarchyModel}; ${values.siteBlockStrategy}`,
    },
    {
      key: "operations",
      label: "Operations",
      active: true,
      status: values.managementIpPolicy && values.monitoringModel && values.backupPolicy ? "READY" : "REVIEW",
      note: `${values.managementIpPolicy}; ${values.monitoringModel}`,
    },
    {
      key: "physical",
      label: "Physical / Endpoints",
      active: true,
      status: values.siteLayoutModel && values.serverCount ? "READY" : "REVIEW",
      note: `${values.siteLayoutModel}; ${values.wiredWirelessMix}`,
    },
    {
      key: "wan",
      label: "Apps / WAN / Performance",
      active: true,
      status: values.applicationProfile && values.bandwidthProfile && values.outageTolerance ? "READY" : "REVIEW",
      note: wanActive || voiceActive || wirelessActive ? `${values.interSiteTrafficModel}; ${values.qosModel}` : `${values.applicationProfile}; ${values.bandwidthProfile}`,
    },
    {
      key: "implementation",
      label: "Implementation / Handoff",
      active: true,
      status: values.budgetModel && values.outputPackage && values.primaryAudience ? "READY" : "REVIEW",
      note: `${values.rolloutModel}; ${values.outputPackage}`,
    },
  ];
}


export type PlanningReadinessSummary = {
  readyCount: number;
  reviewCount: number;
  inactiveCount: number;
  completionLabel: string;
  nextReviewLabels: string[];
};

export function planningReadinessSummary(values: RequirementsProfile): PlanningReadinessSummary {
  const statuses = planningTrackStatuses(values);
  const readyCount = statuses.filter((item) => item.status === "READY").length;
  const reviewCount = statuses.filter((item) => item.status === "REVIEW").length;
  const inactiveCount = statuses.filter((item) => item.status === "INACTIVE").length;
  let completionLabel = "Early draft";
  if (reviewCount === 0 && readyCount > 0) completionLabel = "Review-ready";
  else if (readyCount >= 4) completionLabel = "Mostly shaped";
  else if (readyCount >= 2) completionLabel = "Taking shape";
  const nextReviewLabels = statuses.filter((item) => item.status === "REVIEW").map((item) => item.label).slice(0, 4);
  return { readyCount, reviewCount, inactiveCount, completionLabel, nextReviewLabels };
}
