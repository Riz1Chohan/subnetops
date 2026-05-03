export type PlanningInputImpact = "direct" | "indirect" | "not-yet-implemented";

export interface PlanningInputAuditItem {
  sourceArea: "requirements" | "discovery" | "platform";
  key: string;
  impact: PlanningInputImpact;
  outputAreas: string[];
  note: string;
}

export interface PlanningInputAuditSummary {
  totalInputCount: number;
  directCount: number;
  indirectCount: number;
  notYetImplementedCount: number;
  notes: string[];
}

export const PLANNING_INPUT_AUDIT_ITEMS: PlanningInputAuditItem[] = [
  {
    sourceArea: "requirements",
    key: "usersPerSite",
    impact: "direct",
    outputAreas: ["subnet sizing", "capacity review", "growth buffers"],
    note: "User counts directly affect subnet sizing and capacity calculations.",
  },
  {
    sourceArea: "requirements",
    key: "guestWifi",
    impact: "direct",
    outputAreas: ["segmentation", "security intent", "guest isolation"],
    note: "Guest access directly affects segmentation and policy expectations.",
  },
  {
    sourceArea: "requirements",
    key: "remoteAccess",
    impact: "direct",
    outputAreas: ["security intent", "policy consequences", "implementation readiness"],
    note: "Remote access directly affects security and access-boundary planning.",
  },
  {
    sourceArea: "requirements",
    key: "serverPlacement",
    impact: "direct",
    outputAreas: ["WAN planning", "service centralization", "security posture"],
    note: "Server placement directly influences WAN centralization and service-boundary assumptions.",
  },
  {
    sourceArea: "requirements",
    key: "internetModel",
    impact: "direct",
    outputAreas: ["WAN planning", "firewall posture", "edge design"],
    note: "Internet breakout intent directly affects WAN and edge planning.",
  },
  {
    sourceArea: "requirements",
    key: "voice",
    impact: "indirect",
    outputAreas: ["segment role suggestions", "future QoS intent"],
    note: "Voice intent is partially reflected now and should deepen when routing and QoS synthesis becomes more evidence-driven.",
  },
  {
    sourceArea: "requirements",
    key: "iot",
    impact: "indirect",
    outputAreas: ["segment role suggestions", "security posture"],
    note: "IoT intent is partly reflected through segment roles and security posture, but not yet through a fully separate policy engine.",
  },
  {
    sourceArea: "requirements",
    key: "complianceProfile",
    impact: "indirect",
    outputAreas: ["security posture", "review notes"],
    note: "Compliance currently influences security posture language more than hard design enforcement.",
  },
  {
    sourceArea: "discovery",
    key: "topologyBaseline",
    impact: "direct",
    outputAreas: ["brownfield readiness", "current-state readiness"],
    note: "Topology baseline directly affects brownfield and discovered-state readiness logic.",
  },
  {
    sourceArea: "discovery",
    key: "addressingVlanBaseline",
    impact: "direct",
    outputAreas: ["traceability", "brownfield readiness", "validation context"],
    note: "Addressing baseline directly affects how confidently the planner can compare current and proposed states.",
  },
  {
    sourceArea: "discovery",
    key: "routingTransportBaseline",
    impact: "indirect",
    outputAreas: ["routing intent", "future migration review"],
    note: "Routing baseline informs intent summaries today, but deeper migration consequences still need more engine work.",
  },
  {
    sourceArea: "discovery",
    key: "securityPosture",
    impact: "indirect",
    outputAreas: ["security intent", "policy consequences"],
    note: "Current security posture contributes to security intent, but not yet to a full reconciliation model.",
  },
  {
    sourceArea: "platform",
    key: "routingPosture",
    impact: "direct",
    outputAreas: ["routing intent", "route-domain summary"],
    note: "Routing posture directly affects routing and summarization intent summaries.",
  },
  {
    sourceArea: "platform",
    key: "firewallPosture",
    impact: "direct",
    outputAreas: ["security intent", "policy consequences"],
    note: "Firewall posture directly affects security posture and policy consequence signaling.",
  },
  {
    sourceArea: "platform",
    key: "wanPosture",
    impact: "direct",
    outputAreas: ["WAN planning", "transit planning"],
    note: "WAN posture directly affects WAN model summaries and transit planning expectations.",
  },
  {
    sourceArea: "platform",
    key: "cloudPosture",
    impact: "not-yet-implemented",
    outputAreas: ["future hybrid design engine"],
    note: "Cloud posture is captured but still needs deeper hybrid-design synthesis and validation.",
  },
];

export function summarizePlanningInputAudit(): PlanningInputAuditSummary {
  const notes = [
    "Inputs should earn their place by changing design outputs, validation, or trust signals.",
    "Not-yet-implemented inputs are worth keeping only if they are on the roadmap to drive real synthesis later.",
  ];

  return {
    totalInputCount: PLANNING_INPUT_AUDIT_ITEMS.length,
    directCount: PLANNING_INPUT_AUDIT_ITEMS.filter((item) => item.impact === "direct").length,
    indirectCount: PLANNING_INPUT_AUDIT_ITEMS.filter((item) => item.impact === "indirect").length,
    notYetImplementedCount: PLANNING_INPUT_AUDIT_ITEMS.filter((item) => item.impact === "not-yet-implemented").length,
    notes,
  };
}
