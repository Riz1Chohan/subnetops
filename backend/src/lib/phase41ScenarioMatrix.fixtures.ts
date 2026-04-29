import type { SecurityZone } from "../services/designCore.types.js";
export type Phase41ScenarioRiskClass = "baseline" | "security" | "routing" | "addressing" | "implementation" | "known-gap";
export type Phase41ExpectedReadiness = "ready" | "review" | "blocked" | "unknown";

export interface Phase41ScenarioExpectation {
  readinessOneOf: Phase41ExpectedReadiness[];
  requiredCodes?: string[];
  forbiddenCodes?: string[];
  requiredStandardsViolations?: string[];
  requiredZoneRoles?: Array<SecurityZone["zoneRole"]>;
  requiredOverlayKeys?: string[];
  minSites?: number;
  minVlans?: number;
  minDevices?: number;
  minInterfaces?: number;
  minLinks?: number;
  minRouteIntents?: number;
  minSecurityFlows?: number;
  minImplementationSteps?: number;
  minVerificationChecks?: number;
  minRollbackActions?: number;
  minDiagramRenderNodes?: number;
  minImplementationReviewQueue?: number;
  mustHaveProposal?: boolean;
  mustHaveTransitPlan?: boolean;
  mustHaveLoopbackPlan?: boolean;
  mustHaveBlockedReportTruth?: boolean;
  mustDocumentKnownGap?: boolean;
}

export interface Phase41ScenarioFixture {
  id: string;
  name: string;
  riskClass: Phase41ScenarioRiskClass;
  intent: string;
  project: unknown;
  expected: Phase41ScenarioExpectation;
  knownGaps: string[];
}

function vlan(params: {
  id: string;
  vlanId: number;
  vlanName: string;
  purpose: string;
  subnetCidr?: string | null;
  gatewayIp?: string | null;
  estimatedHosts?: number | null;
  dhcpEnabled?: boolean;
  department?: string | null;
  notes?: string | null;
}) {
  return {
    id: params.id,
    vlanId: params.vlanId,
    vlanName: params.vlanName,
    purpose: params.purpose,
    department: params.department ?? null,
    notes: params.notes ?? null,
    subnetCidr: params.subnetCidr ?? null,
    gatewayIp: params.gatewayIp ?? null,
    estimatedHosts: params.estimatedHosts ?? null,
    dhcpEnabled: params.dhcpEnabled ?? false,
  };
}

function project(params: {
  id: string;
  name: string;
  basePrivateRange?: string | null;
  requirements?: Record<string, unknown>;
  discovery?: Record<string, unknown>;
  platformProfile?: Record<string, unknown>;
  sites: Array<{
    id: string;
    name: string;
    siteCode?: string | null;
    defaultAddressBlock?: string | null;
    vlans: ReturnType<typeof vlan>[];
  }>;
}) {
  return {
    id: params.id,
    name: params.name,
    basePrivateRange: params.basePrivateRange ?? null,
    requirementsJson: JSON.stringify(params.requirements ?? {}),
    discoveryJson: JSON.stringify(params.discovery ?? {}),
    platformProfileJson: JSON.stringify(params.platformProfile ?? {}),
    sites: params.sites,
  };
}

export const PHASE41_SCENARIOS: Phase41ScenarioFixture[] = [
  {
    id: "small-office-baseline-review-gated",
    name: "Small office baseline with management and users",
    riskClass: "baseline",
    intent: "A compact valid design should produce backend topology, verification checks, rollback actions, and still refuse fake implementation confidence when device safety proof is missing.",
    project: project({
      id: "phase41-small-office",
      name: "Phase 41 Small Office Baseline",
      basePrivateRange: "10.41.0.0/22",
      requirements: {
        planningFor: "small office refresh",
        primaryGoal: "standardize users and management VLANs",
        cutoverWindow: "after hours",
        rollbackNeed: "known-good config backup and rollback path required",
        internetEgress: true,
      },
      discovery: {
        topologyBaseline: "single-site brownfield office",
        observedManagement: "management VLAN exists but device management IP evidence is not imported yet",
      },
      platformProfile: {
        routingPosture: "single corporate route domain",
        firewallPosture: "default deny with explicit management controls",
        wanPosture: "local internet egress",
      },
      sites: [
        {
          id: "site-hq",
          name: "HQ",
          siteCode: "HQ",
          defaultAddressBlock: "10.41.0.0/24",
          vlans: [
            vlan({ id: "vlan-hq-users", vlanId: 10, vlanName: "Corporate Users", purpose: "user access", subnetCidr: "10.41.0.0/25", gatewayIp: "10.41.0.1", estimatedHosts: 110, dhcpEnabled: true }),
            vlan({ id: "vlan-hq-management", vlanId: 99, vlanName: "Network Management", purpose: "management", subnetCidr: "10.41.0.224/27", gatewayIp: "10.41.0.225", estimatedHosts: 12, dhcpEnabled: false, notes: "ssh snmp https management" }),
          ],
        },
      ],
    }),
    expected: {
      readinessOneOf: ["blocked", "review"],
      requiredCodes: ["IMPLEMENTATION_OPERATIONAL_SAFETY_BLOCKED"],
      forbiddenCodes: ["SITE_BLOCK_OVERLAP", "SUBNET_OVERLAP_LOCAL", "ORG_BLOCK_INVALID"],
      requiredZoneRoles: ["internal", "management", "wan"],
      requiredOverlayKeys: ["addressing", "implementation", "verification", "operational-safety"],
      minSites: 1,
      minVlans: 2,
      minDevices: 2,
      minInterfaces: 2,
      minLinks: 2,
      minSecurityFlows: 1,
      minImplementationSteps: 6,
      minVerificationChecks: 5,
      minRollbackActions: 2,
      minDiagramRenderNodes: 5,
      minImplementationReviewQueue: 1,
      mustHaveLoopbackPlan: true,
      mustHaveBlockedReportTruth: true,
    },
    knownGaps: [
      "Device management IPs are not yet imported as first-class project inputs, so operational safety remains blocked by design.",
    ],
  },
  {
    id: "multi-site-guest-dmz-security-boundary",
    name: "Multi-site enterprise with guest, DMZ, management, and WAN truth",
    riskClass: "security",
    intent: "A serious enterprise scenario must light up routing, zones, NAT, implementation, verification, rollback, and backend diagram truth together.",
    project: project({
      id: "phase41-enterprise",
      name: "Phase 41 Multi-Site Guest DMZ Enterprise",
      basePrivateRange: "10.42.0.0/16",
      requirements: {
        planningFor: "HQ and branches segmentation refresh",
        primaryGoal: "segment internal, guest, DMZ, management, and branch networks",
        guestWifi: true,
        remoteAccess: true,
        internetEgress: true,
        dmzServices: "public web tier with restricted internal reachability",
        eastWestSegmentation: "guest must never reach internal; DMZ to internal is application-specific only",
      },
      discovery: {
        topologyBaseline: "brownfield hub and spoke network",
        firewallBaseline: "legacy broad rules require cleanup",
      },
      platformProfile: {
        routingPosture: "summarized hub-and-spoke routing",
        firewallPosture: "default deny with explicit permit list",
        natPosture: "interface overload for trusted and guest internet egress",
      },
      sites: [
        {
          id: "site-hq",
          name: "HQ",
          siteCode: "HQ",
          defaultAddressBlock: "10.42.0.0/22",
          vlans: [
            vlan({ id: "vlan-hq-users", vlanId: 10, vlanName: "HQ Users", purpose: "user access", subnetCidr: "10.42.0.0/25", gatewayIp: "10.42.0.1", estimatedHosts: 100, dhcpEnabled: true }),
            vlan({ id: "vlan-hq-guest", vlanId: 30, vlanName: "Guest Wireless", purpose: "guest wifi", subnetCidr: "10.42.1.0/25", gatewayIp: "10.42.1.1", estimatedHosts: 90, dhcpEnabled: true }),
            vlan({ id: "vlan-hq-dmz", vlanId: 50, vlanName: "DMZ Web", purpose: "server farm", subnetCidr: "10.42.2.0/27", gatewayIp: "10.42.2.1", estimatedHosts: 12, dhcpEnabled: false, notes: "dmz public web tier" }),
            vlan({ id: "vlan-hq-mgmt", vlanId: 99, vlanName: "Network Management", purpose: "management", subnetCidr: "10.42.3.0/27", gatewayIp: "10.42.3.1", estimatedHosts: 20, dhcpEnabled: false, notes: "ssh snmp https management" }),
          ],
        },
        {
          id: "site-branch-a",
          name: "Branch A",
          siteCode: "BRA",
          defaultAddressBlock: "10.42.8.0/23",
          vlans: [
            vlan({ id: "vlan-bra-users", vlanId: 10, vlanName: "Branch A Users", purpose: "user access", subnetCidr: "10.42.8.0/25", gatewayIp: "10.42.8.1", estimatedHosts: 90, dhcpEnabled: true }),
            vlan({ id: "vlan-bra-guest", vlanId: 30, vlanName: "Branch A Guest", purpose: "guest wifi", subnetCidr: "10.42.9.0/26", gatewayIp: "10.42.9.1", estimatedHosts: 50, dhcpEnabled: true }),
          ],
        },
        {
          id: "site-branch-b",
          name: "Branch B",
          siteCode: "BRB",
          defaultAddressBlock: "10.42.12.0/23",
          vlans: [
            vlan({ id: "vlan-brb-users", vlanId: 10, vlanName: "Branch B Users", purpose: "user access", subnetCidr: "10.42.12.0/25", gatewayIp: "10.42.12.1", estimatedHosts: 80, dhcpEnabled: true }),
          ],
        },
      ],
    }),
    expected: {
      readinessOneOf: ["blocked", "review"],
      requiredCodes: ["IMPLEMENTATION_OPERATIONAL_SAFETY_BLOCKED"],
      requiredZoneRoles: ["internal", "guest", "dmz", "management", "transit", "wan"],
      requiredOverlayKeys: ["routing", "security", "nat", "implementation", "verification", "operational-safety"],
      minSites: 3,
      minVlans: 7,
      minDevices: 4,
      minInterfaces: 9,
      minLinks: 9,
      minRouteIntents: 2,
      minSecurityFlows: 3,
      minImplementationSteps: 10,
      minVerificationChecks: 8,
      minRollbackActions: 4,
      minDiagramRenderNodes: 15,
      minImplementationReviewQueue: 3,
      mustHaveTransitPlan: true,
      mustHaveLoopbackPlan: true,
      mustHaveBlockedReportTruth: true,
    },
    knownGaps: [
      "The engine still does not compile vendor ACL/NAT syntax; it only proves backend policy/NAT truth and readiness.",
    ],
  },
  {
    id: "overlapping-site-blocks-hard-blocker",
    name: "Overlapping site summary blocks",
    riskClass: "routing",
    intent: "Overlapping site blocks must never be exported or displayed as a clean implementation-ready design.",
    project: project({
      id: "phase41-overlap-sites",
      name: "Phase 41 Overlapping Site Blocks",
      basePrivateRange: "10.43.0.0/16",
      requirements: {
        planningFor: "branch rollout",
        primaryGoal: "catch overlapping site summaries before implementation",
      },
      discovery: {
        topologyBaseline: "two branches loaded from inconsistent spreadsheet",
      },
      platformProfile: {
        routingPosture: "summarized hub-and-spoke routing",
      },
      sites: [
        {
          id: "site-alpha",
          name: "Alpha Branch",
          siteCode: "ALP",
          defaultAddressBlock: "10.43.10.0/24",
          vlans: [
            vlan({ id: "vlan-alpha-users", vlanId: 10, vlanName: "Alpha Users", purpose: "user access", subnetCidr: "10.43.10.0/24", gatewayIp: "10.43.10.1", estimatedHosts: 200, dhcpEnabled: true }),
          ],
        },
        {
          id: "site-beta",
          name: "Beta Branch",
          siteCode: "BET",
          defaultAddressBlock: "10.43.10.128/25",
          vlans: [
            vlan({ id: "vlan-beta-users", vlanId: 10, vlanName: "Beta Users", purpose: "user access", subnetCidr: "10.43.10.128/26", gatewayIp: "10.43.10.129", estimatedHosts: 50, dhcpEnabled: true }),
          ],
        },
      ],
    }),
    expected: {
      readinessOneOf: ["blocked"],
      requiredCodes: ["SITE_BLOCK_OVERLAP", "SUBNET_OVERLAP_CROSS_SITE"],
      requiredOverlayKeys: ["addressing", "routing", "implementation", "verification"],
      minSites: 2,
      minVlans: 2,
      minImplementationSteps: 6,
      minVerificationChecks: 5,
      minRollbackActions: 2,
      minDiagramRenderNodes: 6,
      mustHaveTransitPlan: true,
      mustHaveBlockedReportTruth: true,
    },
    knownGaps: [],
  },
  {
    id: "public-organization-range-standards-blocker",
    name: "Public organization range violates private-address planning rule",
    riskClass: "addressing",
    intent: "A valid CIDR can still be invalid design truth when it violates the standards rulebook for private enterprise planning.",
    project: project({
      id: "phase41-public-range",
      name: "Phase 41 Public Range Standards Blocker",
      basePrivateRange: "8.8.8.0/24",
      requirements: {
        planningFor: "greenfield private network",
        primaryGoal: "verify standards rulebook blocks public addressing for internal networks",
      },
      discovery: {},
      platformProfile: {
        routingPosture: "single corporate route domain",
      },
      sites: [
        {
          id: "site-public-hq",
          name: "HQ",
          siteCode: "HQ",
          defaultAddressBlock: "10.44.0.0/24",
          vlans: [
            vlan({ id: "vlan-public-users", vlanId: 10, vlanName: "Users", purpose: "user access", subnetCidr: "10.44.0.0/25", gatewayIp: "10.44.0.1", estimatedHosts: 100, dhcpEnabled: true }),
          ],
        },
      ],
    }),
    expected: {
      readinessOneOf: ["blocked"],
      requiredCodes: ["SITE_BLOCK_OUTSIDE_ORG_RANGE", "STANDARDS_REQUIRED_RULE_BLOCKER"],
      requiredStandardsViolations: ["ADDR-PRIVATE-IPV4"],
      minSites: 1,
      minVlans: 1,
      minImplementationSteps: 4,
      minVerificationChecks: 4,
      minRollbackActions: 2,
      minDiagramRenderNodes: 4,
      mustHaveBlockedReportTruth: true,
    },
    knownGaps: [],
  },
  {
    id: "undersized-subnet-requires-backend-proposal",
    name: "Undersized subnet creates allocator proposal and review queue",
    riskClass: "addressing",
    intent: "A subnet with too few usable addresses must create backend proposal truth, not a fake green checkmark.",
    project: project({
      id: "phase41-undersized",
      name: "Phase 41 Undersized Subnet",
      basePrivateRange: "10.45.0.0/16",
      requirements: {
        planningFor: "department expansion",
        primaryGoal: "right-size address plan before rollout",
      },
      discovery: {
        addressingVlanBaseline: "legacy /28 kept for a growing user network",
      },
      platformProfile: {},
      sites: [
        {
          id: "site-growth",
          name: "Growth Office",
          siteCode: "GRO",
          defaultAddressBlock: "10.45.20.0/24",
          vlans: [
            vlan({ id: "vlan-growth-users", vlanId: 10, vlanName: "Growth Users", purpose: "user access", subnetCidr: "10.45.20.0/28", gatewayIp: "10.45.20.1", estimatedHosts: 120, dhcpEnabled: true }),
            vlan({ id: "vlan-growth-mgmt", vlanId: 99, vlanName: "Management", purpose: "management", subnetCidr: "10.45.20.224/27", gatewayIp: "10.45.20.225", estimatedHosts: 10, dhcpEnabled: false, notes: "ssh snmp" }),
          ],
        },
      ],
    }),
    expected: {
      readinessOneOf: ["blocked", "review"],
      requiredCodes: ["SUBNET_UNDERSIZED", "IMPLEMENTATION_OPERATIONAL_SAFETY_BLOCKED"],
      requiredZoneRoles: ["internal", "management", "wan"],
      requiredOverlayKeys: ["addressing", "implementation", "verification"],
      minSites: 1,
      minVlans: 2,
      minImplementationSteps: 6,
      minVerificationChecks: 5,
      minRollbackActions: 2,
      minDiagramRenderNodes: 5,
      minImplementationReviewQueue: 1,
      mustHaveProposal: true,
      mustHaveBlockedReportTruth: true,
    },
    knownGaps: [],
  },
  {
    id: "invalid-gateway-hardens-addressing-truth",
    name: "Invalid and unusable gateway addresses",
    riskClass: "addressing",
    intent: "Gateway addresses outside the subnet or on network/broadcast addresses must be caught before implementation planning is trusted.",
    project: project({
      id: "phase41-invalid-gateways",
      name: "Phase 41 Invalid Gateways",
      basePrivateRange: "10.46.0.0/16",
      requirements: {
        planningFor: "gateway cleanup",
        primaryGoal: "catch invalid gateway values from imported data",
      },
      discovery: {
        addressingVlanBaseline: "manual spreadsheet import contains bad gateway values",
      },
      platformProfile: {},
      sites: [
        {
          id: "site-bad-gw",
          name: "Bad Gateway Site",
          siteCode: "BGW",
          defaultAddressBlock: "10.46.10.0/23",
          vlans: [
            vlan({ id: "vlan-bad-outside", vlanId: 10, vlanName: "Outside Gateway Users", purpose: "user access", subnetCidr: "10.46.10.0/24", gatewayIp: "10.46.99.1", estimatedHosts: 100, dhcpEnabled: true }),
            vlan({ id: "vlan-bad-network", vlanId: 20, vlanName: "Network Address Gateway", purpose: "server access", subnetCidr: "10.46.11.0/25", gatewayIp: "10.46.11.0", estimatedHosts: 40, dhcpEnabled: false }),
          ],
        },
      ],
    }),
    expected: {
      readinessOneOf: ["blocked", "review"],
      requiredCodes: ["GATEWAY_INVALID", "GATEWAY_UNUSABLE", "IMPLEMENTATION_OPERATIONAL_SAFETY_BLOCKED"],
      minSites: 1,
      minVlans: 2,
      minImplementationSteps: 5,
      minVerificationChecks: 5,
      minRollbackActions: 2,
      minDiagramRenderNodes: 5,
      minImplementationReviewQueue: 1,
      mustHaveBlockedReportTruth: true,
    },
    knownGaps: [],
  },
  {
    id: "exhausted-site-block-cannot-pretend-to-allocate",
    name: "Exhausted site block with impossible VLAN sizing",
    riskClass: "addressing",
    intent: "When the allocator cannot safely place required VLANs inside a tiny site block, the scenario must remain blocked/reviewed instead of invented confidence.",
    project: project({
      id: "phase41-exhausted-site",
      name: "Phase 41 Exhausted Site Block",
      basePrivateRange: "10.47.0.0/24",
      requirements: {
        planningFor: "tiny branch growth",
        primaryGoal: "prove allocator refuses impossible fit",
      },
      discovery: {
        addressingVlanBaseline: "site was incorrectly assigned a /30",
      },
      platformProfile: {},
      sites: [
        {
          id: "site-tiny",
          name: "Tiny Branch",
          siteCode: "TNY",
          defaultAddressBlock: "10.47.0.0/30",
          vlans: [
            vlan({ id: "vlan-tiny-users", vlanId: 10, vlanName: "Tiny Users", purpose: "user access", subnetCidr: "10.47.0.0/30", gatewayIp: "10.47.0.1", estimatedHosts: 40, dhcpEnabled: true }),
            vlan({ id: "vlan-tiny-voice", vlanId: 20, vlanName: "Tiny Voice", purpose: "voice", subnetCidr: "10.47.0.0/30", gatewayIp: "10.47.0.2", estimatedHosts: 20, dhcpEnabled: true }),
          ],
        },
      ],
    }),
    expected: {
      readinessOneOf: ["blocked"],
      requiredCodes: ["SUBNET_UNDERSIZED", "SUBNET_OVERLAP_LOCAL", "SUBNET_PROPOSAL_UNAVAILABLE"],
      requiredOverlayKeys: ["addressing", "implementation", "verification"],
      minSites: 1,
      minVlans: 2,
      minImplementationSteps: 4,
      minVerificationChecks: 4,
      minRollbackActions: 2,
      minDiagramRenderNodes: 4,
      mustHaveBlockedReportTruth: true,
    },
    knownGaps: [],
  },
  {
    id: "empty-site-topology-incomplete",
    name: "Site with no VLAN/interface evidence",
    riskClass: "implementation",
    intent: "A site shell with no interfaces must be useful for intake but blocked from topology confidence and implementation readiness.",
    project: project({
      id: "phase41-empty-site",
      name: "Phase 41 Empty Site Topology Incomplete",
      basePrivateRange: "10.48.0.0/16",
      requirements: {
        planningFor: "new branch intake",
        primaryGoal: "capture missing topology evidence without pretending it is complete",
      },
      discovery: {
        topologyBaseline: "site exists but no VLAN/interface import has been provided",
      },
      platformProfile: {},
      sites: [
        {
          id: "site-empty",
          name: "Empty Branch",
          siteCode: "EMP",
          defaultAddressBlock: "10.48.10.0/24",
          vlans: [],
        },
      ],
    }),
    expected: {
      readinessOneOf: ["blocked", "review"],
      requiredCodes: ["DESIGN_GRAPH_DEVICE_WITHOUT_INTERFACES", "ROUTING_SITE_SUMMARY_REQUIRES_REVIEW"],
      minSites: 1,
      minVlans: 0,
      minDevices: 2,
      minInterfaces: 0,
      minImplementationSteps: 2,
      minVerificationChecks: 3,
      minRollbackActions: 1,
      minDiagramRenderNodes: 2,
      mustHaveLoopbackPlan: true,
      mustHaveBlockedReportTruth: true,
    },
    knownGaps: [
      "Topology discovery import is still a future live-mapping integration; this scenario proves the current planner does not hide that missing evidence.",
    ],
  },
  {
    id: "local-overlap-dhcp-conflict-regression-gap",
    name: "Local overlapping DHCP VLANs",
    riskClass: "known-gap",
    intent: "Two DHCP-enabled VLANs with overlapping subnets must be caught as local overlap today; richer DHCP option/relay conflict proof remains future work.",
    project: project({
      id: "phase41-dhcp-overlap",
      name: "Phase 41 DHCP Overlap Regression Gap",
      basePrivateRange: "10.49.0.0/16",
      requirements: {
        planningFor: "DHCP cleanup",
        primaryGoal: "catch overlapping DHCP-enabled scopes",
      },
      discovery: {
        addressingVlanBaseline: "two DHCP scopes were imported with overlapping CIDRs",
      },
      platformProfile: {},
      sites: [
        {
          id: "site-dhcp",
          name: "DHCP Site",
          siteCode: "DHC",
          defaultAddressBlock: "10.49.10.0/23",
          vlans: [
            vlan({ id: "vlan-dhcp-users", vlanId: 10, vlanName: "Users DHCP", purpose: "user access", subnetCidr: "10.49.10.0/24", gatewayIp: "10.49.10.1", estimatedHosts: 100, dhcpEnabled: true }),
            vlan({ id: "vlan-dhcp-iot", vlanId: 40, vlanName: "IoT DHCP", purpose: "iot devices", subnetCidr: "10.49.10.128/25", gatewayIp: "10.49.10.129", estimatedHosts: 60, dhcpEnabled: true }),
          ],
        },
      ],
    }),
    expected: {
      readinessOneOf: ["blocked"],
      requiredCodes: ["SUBNET_OVERLAP_LOCAL"],
      requiredZoneRoles: ["internal", "iot", "wan"],
      requiredOverlayKeys: ["addressing", "implementation", "verification"],
      minSites: 1,
      minVlans: 2,
      minImplementationSteps: 5,
      minVerificationChecks: 5,
      minRollbackActions: 2,
      minDiagramRenderNodes: 5,
      mustHaveBlockedReportTruth: true,
      mustDocumentKnownGap: true,
    },
    knownGaps: [
      "First-class DHCP lease pool, exclusion range, helper-address, and option-conflict modeling is not complete yet. Current proof catches the overlapping subnet truth, not every DHCP server behavior.",
    ],
  },
];
