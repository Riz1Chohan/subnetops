export type StandardsAuthority = "formal-standard" | "best-practice";
export type StandardsStrength = "required" | "recommended" | "conditional" | "review-required";
export type StandardsRuleStatus = "applied" | "review" | "deferred" | "violated";

export interface StandardsRule {
  id: string;
  area:
    | "addressing"
    | "aggregation"
    | "wan"
    | "ipv6"
    | "segmentation"
    | "access-control"
    | "link-resiliency"
    | "wireless"
    | "security";
  title: string;
  authority: StandardsAuthority;
  strength: StandardsStrength;
  sourceLabel: string;
  sourceReference: string;
  summary: string;
  engineUse: string;
}

export interface StandardsRulebookSummary {
  totalRuleCount: number;
  formalStandardCount: number;
  bestPracticeCount: number;
  requiredRuleCount: number;
  recommendedRuleCount: number;
  conditionalRuleCount: number;
  reviewRequiredRuleCount: number;
  notes: string[];
}

export const NETWORK_STANDARDS_RULEBOOK: StandardsRule[] = [
  {
    id: "ADDR-PRIVATE-IPV4",
    area: "addressing",
    title: "Use RFC 1918 private IPv4 space for internal enterprise addressing",
    authority: "formal-standard",
    strength: "required",
    sourceLabel: "IETF",
    sourceReference: "RFC 1918",
    summary: "Internal enterprise IPv4 plans should stay inside RFC 1918 private ranges unless the design explicitly requires public addressing.",
    engineUse: "SubnetOps should treat private RFC 1918 space as the default internal planning baseline for enterprise IPv4 designs.",
  },
  {
    id: "ADDR-CIDR-HIERARCHY",
    area: "aggregation",
    title: "Prefer CIDR-based hierarchical allocation and summarizable boundaries",
    authority: "formal-standard",
    strength: "required",
    sourceLabel: "IETF",
    sourceReference: "RFC 4632",
    summary: "Address plans should use CIDR hierarchy so summarization is possible and routing state stays controlled.",
    engineUse: "SubnetOps should prefer site blocks and subnet allocations that support clean summarization rather than flat, scattered assignments.",
  },
  {
    id: "WAN-POINT-TO-POINT-31",
    area: "wan",
    title: "Allow /31 on IPv4 point-to-point transit links where appropriate",
    authority: "formal-standard",
    strength: "conditional",
    sourceLabel: "IETF",
    sourceReference: "RFC 3021",
    summary: "A /31 prefix is valid for IPv4 point-to-point links and improves address efficiency when the design truly is point-to-point.",
    engineUse: "SubnetOps may prefer /31 for proposed transit links, but only for point-to-point use and never as a blanket rule for all transit segments.",
  },
  {
    id: "IPV6-ARCHITECTURE",
    area: "ipv6",
    title: "Follow the IPv6 addressing architecture when IPv6 planning is enabled",
    authority: "formal-standard",
    strength: "required",
    sourceLabel: "IETF",
    sourceReference: "RFC 4291",
    summary: "IPv6 planning should follow the IPv6 addressing architecture rather than copying IPv4 assumptions directly.",
    engineUse: "SubnetOps should keep its future IPv6 model aligned with real IPv6 address architecture instead of inventing a private scheme.",
  },
  {
    id: "IPV6-ULA",
    area: "ipv6",
    title: "Use Unique Local Addresses deliberately for internal IPv6-only or mixed internal scopes",
    authority: "formal-standard",
    strength: "conditional",
    sourceLabel: "IETF",
    sourceReference: "RFC 4193",
    summary: "Unique Local Addresses are appropriate for internal IPv6 use cases when that scope fits the design intent.",
    engineUse: "SubnetOps should treat ULA as an option for internal IPv6 planning, not as an automatic replacement for every IPv6 design.",
  },
  {
    id: "VLAN-SEGMENTATION",
    area: "segmentation",
    title: "Use VLAN-aware bridged network segmentation where Layer 2 separation is part of the design",
    authority: "formal-standard",
    strength: "required",
    sourceLabel: "IEEE",
    sourceReference: "IEEE 802.1Q",
    summary: "VLAN-aware bridged networking is the formal Ethernet standard basis for VLAN segmentation and tagging.",
    engineUse: "SubnetOps should keep VLAN segmentation logic consistent with VLAN-aware Ethernet design instead of inventing proprietary segmentation assumptions.",
  },
  {
    id: "ACCESS-CONTROL-8021X",
    area: "access-control",
    title: "Treat port-based access control as the standards-based NAC baseline when NAC is required",
    authority: "formal-standard",
    strength: "conditional",
    sourceLabel: "IEEE",
    sourceReference: "IEEE 802.1X",
    summary: "Port-based network access control is the standards-based baseline for authenticated access at the edge.",
    engineUse: "SubnetOps should recognize NAC requirements and explain that 802.1X-style access control is the standards-based edge access model.",
  },
  {
    id: "LINK-AGGREGATION",
    area: "link-resiliency",
    title: "Use standards-based link aggregation for bundled Ethernet uplinks",
    authority: "formal-standard",
    strength: "conditional",
    sourceLabel: "IEEE",
    sourceReference: "IEEE 802.1AX",
    summary: "Link aggregation is the formal standards basis for bundling multiple Ethernet links into one logical resilient link.",
    engineUse: "SubnetOps should map resilient uplink or aggregated-port intent to standards-based link aggregation language.",
  },
  {
    id: "WLAN-STANDARDS",
    area: "wireless",
    title: "Treat IEEE 802.11 as the standards family behind WLAN planning",
    authority: "formal-standard",
    strength: "required",
    sourceLabel: "IEEE",
    sourceReference: "IEEE 802.11",
    summary: "Wireless LAN planning should remain grounded in the IEEE 802.11 standards family rather than ad-hoc wireless assumptions.",
    engineUse: "SubnetOps should keep SSID, guest separation, and WLAN role design within normal 802.11-based enterprise planning language.",
  },
  {
    id: "FIREWALL-POLICY",
    area: "security",
    title: "Use structured firewall policy and controlled traffic flow between differing security postures",
    authority: "formal-standard",
    strength: "required",
    sourceLabel: "NIST",
    sourceReference: "SP 800-41 Rev. 1",
    summary: "Firewall planning should define policy, deployment, configuration, testing, and management around controlled traffic flow between differing security postures.",
    engineUse: "SubnetOps should treat firewalling as a policy and trust-boundary design discipline, not a late add-on after addressing is done.",
  },
  {
    id: "ZERO-TRUST-RESOURCE-FOCUS",
    area: "security",
    title: "Use zero-trust ideas as a resource-focused design overlay, not as a substitute for network standards",
    authority: "formal-standard",
    strength: "recommended",
    sourceLabel: "NIST",
    sourceReference: "SP 800-207",
    summary: "Zero trust shifts protection focus from static network perimeters toward users, assets, and resources, without replacing formal network protocols or standards.",
    engineUse: "SubnetOps should use zero-trust principles to influence segmentation and access expectations where requirements justify it, while keeping them distinct from protocol standards.",
  },
  {
    id: "MGMT-ISOLATION",
    area: "security",
    title: "Isolate management access from general user and guest access",
    authority: "best-practice",
    strength: "recommended",
    sourceLabel: "Enterprise networking practice",
    sourceReference: "Common enterprise design baseline",
    summary: "Management networks are normally separated from user and guest traffic because that improves control-plane security and operational safety.",
    engineUse: "SubnetOps should recommend management isolation when management segments, shared services, or remote administration exist.",
  },
  {
    id: "GUEST-ISOLATION",
    area: "security",
    title: "Keep guest access isolated from internal business and management resources",
    authority: "best-practice",
    strength: "recommended",
    sourceLabel: "Enterprise networking practice",
    sourceReference: "Common enterprise design baseline",
    summary: "Guest access is normally segmented away from internal corporate and management resources.",
    engineUse: "SubnetOps should recommend guest isolation whenever guest access is part of the requirements.",
  },
  {
    id: "HIERARCHICAL-SITE-BLOCKS",
    area: "aggregation",
    title: "Allocate per-site summary blocks before per-VLAN subnets",
    authority: "best-practice",
    strength: "recommended",
    sourceLabel: "Enterprise networking practice",
    sourceReference: "Common enterprise design baseline",
    summary: "Hierarchical site allocation usually produces cleaner summarization, cleaner WAN routing, and better future growth handling.",
    engineUse: "SubnetOps should prefer site-level block planning before individual subnet placement whenever the project is multi-site.",
  },
  {
    id: "GATEWAY-CONSISTENCY",
    area: "addressing",
    title: "Keep gateway conventions consistent within a site unless a special case requires deviation",
    authority: "best-practice",
    strength: "review-required",
    sourceLabel: "Enterprise networking practice",
    sourceReference: "Common enterprise design baseline",
    summary: "Consistent gateway placement improves readability and operations, but the exact convention is an implementation preference rather than a formal standard.",
    engineUse: "SubnetOps should flag mixed gateway conventions for review without pretending there is one universal mandatory gateway address convention.",
  },
];

export function summarizeStandardsRulebook(): StandardsRulebookSummary {
  const notes = [
    "Formal standards and official guidance should be enforced where they truly exist.",
    "Best-practice rules should be labeled as recommendations or review-required items rather than treated as universal mandates.",
  ];

  return {
    totalRuleCount: NETWORK_STANDARDS_RULEBOOK.length,
    formalStandardCount: NETWORK_STANDARDS_RULEBOOK.filter((rule) => rule.authority === "formal-standard").length,
    bestPracticeCount: NETWORK_STANDARDS_RULEBOOK.filter((rule) => rule.authority === "best-practice").length,
    requiredRuleCount: NETWORK_STANDARDS_RULEBOOK.filter((rule) => rule.strength === "required").length,
    recommendedRuleCount: NETWORK_STANDARDS_RULEBOOK.filter((rule) => rule.strength === "recommended").length,
    conditionalRuleCount: NETWORK_STANDARDS_RULEBOOK.filter((rule) => rule.strength === "conditional").length,
    reviewRequiredRuleCount: NETWORK_STANDARDS_RULEBOOK.filter((rule) => rule.strength === "review-required").length,
    notes,
  };
}


export function getStandardsRule(ruleId: string): StandardsRule | undefined {
  return NETWORK_STANDARDS_RULEBOOK.find((rule) => rule.id === ruleId);
}

export function isRequiredStandardsRule(ruleId: string): boolean {
  const rule = getStandardsRule(ruleId);
  return Boolean(rule && rule.strength === "required");
}
