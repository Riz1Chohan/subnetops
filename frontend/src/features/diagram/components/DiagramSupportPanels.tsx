import type { SynthesizedLogicalDesign, TrafficFlowPath } from "../../../lib/designSynthesis";
import type { LabelFocus, OverlayMode } from "../diagramTypes";
import { DeviceIcon, type DeviceKind, linkStyle } from "./diagramRendererShared";

export function SupportLegend() {
  const items = [
    ["Firewall", "Perimeter, segmentation, DMZ, NAT, VPN"],
    ["Router", "WAN, summaries, inter-site routing"],
    ["Switch", "Core, distribution, access, trunks"],
    ["Server", "Shared services, management, DMZ hosts"],
    ["AP / WLC", "Wireless access and controller layers"],
  ];

  return (
    <div className="diagram-note-grid" style={{ marginTop: 10 }}>
      {items.map(([title, detail]) => (
        <div key={title} className="diagram-note-card">
          <strong style={{ display: "block", marginBottom: 6 }}>{title}</strong>
          <p style={{ margin: 0 }}>{detail}</p>
        </div>
      ))}
    </div>
  );
}

function DeviceSwatch({ kind, title, detail }: { kind: DeviceKind; title: string; detail: string }) {
  return (
    <div className="topology-icon-swatch">
      <svg viewBox="0 0 140 88" className="topology-icon-swatch-svg" aria-hidden="true">
        <DeviceIcon x={18} y={8} kind={kind} label={title} />
      </svg>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

export function SupportDeviceSymbolLibraryPanel() {
  const iconNotes = [
    ["Firewall / edge", "Chassis-style security appliance with boundary emphasis for DMZ, NAT, and VPN review."],
    ["Routing", "Cylinder-style routing symbol so WAN and summary roles read differently from switching."],
    ["Switching", "Stacked and front-panel switch treatment for core, distribution, and access layers."],
    ["Wireless", "Dedicated AP and controller visuals so coverage and control do not blur into generic nodes."],
    ["Service / public edge", "Server, cloud-edge, and internet symbols now read more like service anchors and north-south boundaries."],
  ];

  return (
    <div className="topology-icon-legend">
      <strong style={{ display: "block" }}>Device symbol library</strong>
      <p className="muted" style={{ margin: "2px 0 0 0" }}>
        This pass adds a clean in-app network icon family inspired by professional network-diagram conventions. The symbols are recreated for SubnetOps so firewall, router, stacked-switch, AP, server, cloud, and public-edge objects read like infrastructure roles instead of generic shapes.
      </p>
      <div className="diagram-note-grid" style={{ marginTop: 10, marginBottom: 12 }}>
        {iconNotes.map(([title, detail]) => (
          <div key={title} className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>{title}</strong>
            <p style={{ margin: 0 }}>{detail}</p>
          </div>
        ))}
      </div>
      <div className="topology-icon-legend-grid">
        <DeviceSwatch kind="firewall" title="Firewall" detail="Perimeter, trust boundary, DMZ, NAT, VPN edge" />
        <DeviceSwatch kind="router" title="Router" detail="WAN termination, summaries, branch or hub routing" />
        <DeviceSwatch kind="core-switch" title="Core Switch" detail="Core or distribution switching with stacked look" />
        <DeviceSwatch kind="access-switch" title="Access Switch" detail="User, printer, AP, and local trunk access" />
        <DeviceSwatch kind="wireless-controller" title="Wireless" detail="AP / controller layer for coverage and control" />
        <DeviceSwatch kind="server" title="Server" detail="Local, centralized, DMZ, or management services" />
        <DeviceSwatch kind="cloud-edge" title="Cloud Edge" detail="On-prem to cloud boundary and hosted service edge" />
        <DeviceSwatch kind="internet" title="Internet" detail="Public edge, ISP, published-service path anchor" />
      </div>
    </div>
  );
}

export function SupportOverlayReviewPanel({ overlay }: { overlay: OverlayMode }) {
  const items: Record<OverlayMode, { title: string; detail: string[] }> = {
    none: {
      title: "Placement overlay",
      detail: [
        "Use this to confirm where edge, switching, wireless, server, and cloud objects are placed.",
        "Best for role review before checking labels, subnets, or traffic paths.",
      ],
    },
    addressing: {
      title: "Addressing overlay",
      detail: [
        "Use this to verify site blocks, VLAN/subnet labels, gateways, and transit references.",
        "Best for cross-checking the diagram against the addressing hierarchy and report tables.",
      ],
    },
    security: {
      title: "Security overlay",
      detail: [
        "Use this to verify zones, DMZ placement, management-only paths, and enforcement points.",
        "Best for checking whether trust boundaries are explicit and attached to real devices.",
      ],
    },
    flows: {
      title: "Traffic-flow overlay",
      detail: [
        "Use this to verify how user, guest, management, branch, internet, and DMZ traffic are expected to move.",
        "Best for comparing critical paths against routing intent, NAT behavior, and validation warnings.",
      ],
    },
    services: {
      title: "Service-placement overlay",
      detail: [
        "Use this to verify which services are local, centralized, DMZ-based, or cloud-hosted.",
        "Best for checking whether service consumers and controlling boundaries line up with the current topology.",
      ],
    },
    redundancy: {
      title: "Redundancy overlay",
      detail: [
        "Use this to verify routed uplinks, edge posture, and route-domain anchors that change failover meaning.",
        "Best for checking whether the topology visually reads like single-edge, paired-edge, or resilient transport.",
      ],
    },
  };

  const current = items[overlay];
  return (
    <div className="diagram-overlay-guide">
      <strong style={{ display: "block", marginBottom: 6 }}>{current.title}</strong>
      {current.detail.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

export function SupportConnectionSemanticsPanel() {
  const links = [
    ["Routed link", "Solid blue path for L3 adjacency, WAN transit, or inter-device routed handoff."],
    ["Trunk / switched", "Thicker purple path for VLAN carriage, local switching, or AP uplinks."],
    ["Internet edge", "Dashed blue path for public or ISP-facing connectivity."],
    ["VPN / secure tunnel", "Dashed green path for encrypted or policy-bound overlay connectivity."],
    ["HA / restricted path", "Orange path for management-only, HA, or special-control movement."],
    ["Traffic flow", "Highlighted red path for review overlays and critical traffic traversal."],
  ];

  return (
    <div className="diagram-note-grid" style={{ marginTop: 10 }}>
      {links.map(([title, detail]) => (
        <div key={title} className="diagram-note-card">
          <strong style={{ display: "block", marginBottom: 6 }}>{title}</strong>
          <p style={{ margin: 0 }}>{detail}</p>
        </div>
      ))}
    </div>
  );
}

export function SupportLinkTypeRenderingPanel({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
  const samples = [
    {
      type: "routed" as const,
      title: "Routed handoff / WAN edge",
      detail: "Use for site-to-site transit, L3 handoff, and point-to-point path review.",
      example: synthesized.wanLinks[0]?.subnetCidr || synthesized.routingPlan[0]?.summaryAdvertisement || "Transit / summary path",
    },
    {
      type: "trunk" as const,
      title: "Trunk / switched carriage",
      detail: "Use for VLAN carriage from edge to switching or switching to access tiers.",
      example: synthesized.addressingPlan[0]?.subnetCidr || "VLAN / access carriage",
    },
    {
      type: "internet" as const,
      title: "Internet / public edge",
      detail: "Use where guest, DMZ, or egress posture crosses the public boundary.",
      example: synthesized.topology.internetBreakout || "Public edge",
    },
    {
      type: "vpn" as const,
      title: "Tunnel / protected transport",
      detail: "Use for VPN, SD-WAN, or secured branch-to-hub movement.",
      example: synthesized.wanLinks[0]?.transport || "Secured transport",
    },
    {
      type: "ha" as const,
      title: "HA / restricted control path",
      detail: "Use for sync, management-only, or constrained-control relationships.",
      example: synthesized.securityBoundaries[0]?.controlPoint || "Restricted-control path",
    },
    {
      type: "flow" as const,
      title: "Traffic-flow highlight",
      detail: "Use when reviewing how a generated flow traverses devices and boundaries.",
      example: synthesized.trafficFlows[0]?.flowLabel || "Critical flow path",
    },
  ];

  return (
    <div className="diagram-linktype-panel">
      <div>
        <strong style={{ display: "block", marginBottom: 6 }}>Link-type rendering direction</strong>
        <p className="muted" style={{ margin: 0 }}>The diagram should increasingly read like an engineering drawing: the line itself should tell you whether the relationship is routed, trunked, public-edge, tunneled, HA, or a reviewed traffic path.</p>
      </div>
      <div className="diagram-linktype-grid">
        {samples.map((sample) => {
          const tone = linkStyle(sample.type);
          return (
            <div key={sample.type} className="diagram-linktype-card">
              <div className="diagram-linktype-sample">
                <svg viewBox="0 0 180 36" width="100%" height="36" aria-hidden="true">
                  <line x1="12" y1="18" x2="168" y2="18" stroke={tone.stroke} strokeWidth={tone.width} strokeDasharray={tone.dash} strokeLinecap="round" />
                </svg>
              </div>
              <strong>{sample.title}</strong>
              <p>{sample.detail}</p>
              <span>{sample.example}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SupportArchitectureSignals({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
  const signals = [
    `Topology: ${synthesized.topology.topologyLabel}`,
    `Primary site: ${synthesized.topology.primarySiteName || "TBD"}`,
    `Breakout: ${synthesized.topology.internetBreakout}`,
    `Placements: ${synthesized.sitePlacements.length}`,
    `Services: ${synthesized.servicePlacements.length}`,
    `Flows: ${synthesized.trafficFlows.length}`,
  ];

  return (
    <div className="diagram-note-grid">
      {signals.map((item) => (
        <div key={item} className="diagram-note-card">
          <p style={{ margin: 0 }}>{item}</p>
        </div>
      ))}
    </div>
  );
}

export function SupportFlowSummaryPanel({ flows }: { flows: TrafficFlowPath[] }) {
  const displayedFlows = flows.slice(0, 5);

  return (
    <div className="diagram-note-grid" style={{ marginTop: 10 }}>
      {displayedFlows.map((flow) => (
        <div key={flow.id} className="diagram-note-card">
          <strong style={{ display: "block", marginBottom: 6 }}>{flow.flowName}</strong>
          <p style={{ margin: "0 0 6px 0" }}>{flow.sourceZone} → {flow.destinationZone}</p>
          <p style={{ margin: 0, color: "#61758f" }}>{flow.path.join(" → ")}</p>
        </div>
      ))}
    </div>
  );
}

export function SupportDeviceRealismDirectionPanel() {
  const items = [
    ["Firewall", "Shielded perimeter or security appliance posture rather than a plain box."],
    ["Router", "Routed edge / transit device with a more recognisable router silhouette."],
    ["Switch stack", "Stacked switching face with port rows so access and core look different."],
    ["Wireless", "AP / controller shapes with RF arcs so wireless roles read immediately."],
    ["Server", "Rack-like server posture instead of a generic rectangle."],
    ["Cloud / internet", "North-south edge icons that read as service or public boundary, not random circles."],
  ];

  return (
    <div className="diagram-realism-panel">
      <div>
        <strong style={{ display: "block", marginBottom: 6 }}>Device realism direction</strong>
        <p className="muted" style={{ margin: 0 }}>
          v117-v120 continues the shift away from generic circles and plain rectangles. The diagram should increasingly use network-style symbols that look like firewalls, routers, switch stacks, wireless devices, servers, cloud edges, and internet boundaries.
        </p>
      </div>
      <div className="diagram-realism-grid">
        {items.map(([title, detail]) => (
          <div key={title} className="diagram-realism-card">
            <strong>{title}</strong>
            <p>{detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupportTopologyBehaviorMatrixPanel({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
  const primarySite = synthesized.topology.primarySiteName || synthesized.siteHierarchy[0]?.name || "Primary site";
  const rows = synthesized.siteHierarchy.slice(0, 6).map((site) => {
    const boundary = synthesized.securityBoundaries.find((item) => item.siteName === site.name);
    const flow = synthesized.trafficFlows.find((item) => item.path.some((hop) => hop.includes(site.name)));
    const services = synthesized.servicePlacements.filter((item) => item.siteName === site.name).slice(0, 2);
    return {
      site: site.name,
      role: site.name === primarySite ? "Primary / policy concentration" : "Attached / branch posture",
      expectedPath: flow ? flow.path.join(" → ") : (site.name === primarySite ? "Local edge / shared services / internet" : `${site.name} → ${primarySite}`),
      boundary: boundary ? `${boundary.zoneName} via ${boundary.controlPoint}` : "Boundary not yet explicit",
      services: services.length > 0 ? services.map((item) => item.serviceName).join(", ") : "No explicit anchor yet",
    };
  });

  return (
    <div className="diagram-behavior-panel">
      <div>
        <strong style={{ display: "block", marginBottom: 6 }}>Topology-specific path and placement behavior</strong>
        <p className="muted" style={{ margin: 0 }}>
          This matrix helps the diagram read like an architecture pattern instead of a generic map. Site role, expected path, boundary attachment, and anchored services should all change when the topology changes.
        </p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th align="left">Site</th>
              <th align="left">Expected role</th>
              <th align="left">Expected path emphasis</th>
              <th align="left">Boundary anchor</th>
              <th align="left">Service anchors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.site}>
                <td><strong>{row.site}</strong></td>
                <td>{row.role}</td>
                <td>{row.expectedPath}</td>
                <td>{row.boundary}</td>
                <td>{row.services}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SupportOverlayEvidencePanel({ overlay, synthesized }: { overlay: OverlayMode; synthesized: SynthesizedLogicalDesign }) {
  const evidence = {
    placement: [
      `${synthesized.siteHierarchy.length} site summaries`,
      `${synthesized.sitePlacements.length} site placement entries`,
      `${synthesized.servicePlacements.length} service placement anchors`,
    ],
    addressing: [
      `${synthesized.addressingPlan.length} subnet or VLAN plan rows`,
      `${synthesized.wanLinks.length} WAN/transit links`,
      `${synthesized.routingPlan.length} routing intent rows`,
    ],
    security: [
      `${synthesized.securityBoundaries.length} security boundaries`,
      `${synthesized.servicePlacements.filter((item) => item.zoneName?.toLowerCase().includes("dmz")).length} DMZ-related service anchors`,
      `${synthesized.trafficFlows.filter((item) => /internet|remote|guest/i.test(item.flowLabel)).length} public-edge or remote-relevant flows`,
    ],
    flows: [
      `${synthesized.trafficFlows.length} generated traffic flows`,
      `${synthesized.trafficFlows.filter((item) => item.path.length >= 3).length} multi-hop paths`,
      `${synthesized.trafficFlows.filter((item) => /cloud/i.test(item.flowLabel)).length} cloud-oriented flows`,
    ],
    services: [
      `${synthesized.servicePlacements.length} explicit service placement anchors`,
      `${synthesized.servicePlacements.filter((item) => item.placementType === "local").length} local services`,
      `${synthesized.servicePlacements.filter((item) => item.placementType === "centralized" || item.placementType === "cloud").length} centralized or cloud services`,
    ],
    redundancy: [
      `${synthesized.wanLinks.length} WAN or transit links`,
      `${synthesized.designTruthModel.routeDomains.length} route domains`,
      `${synthesized.sitePlacements.filter((item) => item.deviceType === "firewall" || item.deviceType === "router").length} edge anchors`,
    ],
  } as const;

  const evidenceKey = overlay === "none" ? "placement" : overlay;
  return (
    <div className="diagram-evidence-panel">
      <strong style={{ display: "block", marginBottom: 8 }}>Overlay evidence snapshot</strong>
      <div className="diagram-evidence-grid">
        {evidence[evidenceKey].map((item) => (
          <div key={item} className="diagram-evidence-card">{item}</div>
        ))}
      </div>
    </div>
  );
}

export function SupportDiagramReviewSequencePanel({ overlay }: { overlay: OverlayMode }) {
  const steps = [
    ["Placement", "Confirm the edge, switching tiers, wireless roles, and service anchors look plausible before trusting finer labels."],
    ["Addressing", "Check block hierarchy, VLAN/subnet labels, DMZ or management visibility, and any transit references."],
    ["Services", "Check which services are local, centralized, DMZ-based, or cloud-hosted and whether that matches the intended architecture."],
    ["Security", "Review trust boundaries, enforcement attachment, DMZ adjacency, and guest or management separation."],
    ["Redundancy", "Check routed uplinks, edge posture, and route-domain anchors so the failover story reads honestly from the topology."],
    ["Flows", "Finish by tracing critical traffic and making sure path behavior matches the chosen topology."],
  ];

  return (
    <div className="diagram-review-sequence">
      <strong style={{ display: "block", marginBottom: 8 }}>Recommended review sequence</strong>
      <div className="diagram-review-sequence-grid">
        {steps.map(([title, detail]) => (
          <div key={title} className={`diagram-review-sequence-card${(overlay === "none" && title === "Placement") || overlay.toLowerCase() === title.toLowerCase() ? " active" : ""}`}>
            <span>{title}</span>
            <p>{detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupportLabelFocusPanel({ labelFocus }: { labelFocus: LabelFocus }) {
  const items: Record<LabelFocus, { title: string; detail: string }> = {
    all: { title: "All label families", detail: "Use this when you need the full annotation stack: site identity, addressing, boundary names, transport references, and flow labels together." },
    topology: { title: "Topology labels", detail: "Prioritize site names, device identity, and major anchor roles so the diagram reads like an architecture map first." },
    addressing: { title: "Addressing labels", detail: "Prioritize site blocks, VLAN / subnet references, gateway clues, and other CIDR-heavy labels that support LLD cross-checking." },
    zones: { title: "Zone / boundary labels", detail: "Prioritize DMZ, guest, management, and other boundary / control labels so trust review stays readable." },
    transport: { title: "Transport labels", detail: "Prioritize routed, trunk, VPN, and internet-edge annotations so path semantics stay visible without every other note competing." },
    flows: { title: "Flow labels", detail: "Prioritize critical flow names and flow-only path labels so movement review stays isolated from baseline topology commentary." },
  };

  const current = items[labelFocus];
  return (
    <div className="diagram-note-card">
      <strong style={{ display: "block", marginBottom: 6 }}>Label focus posture</strong>
      <p style={{ margin: "0 0 8px 0", color: "#61758f" }}>{current.title}</p>
      <p style={{ margin: 0, color: "#61758f" }}>{current.detail}</p>
    </div>
  );
}

export function SupportCrossCheckPanels() {
  return (
    <div className="diagram-note-grid" style={{ marginTop: 10 }}>
      <div className="diagram-note-card">
        <strong style={{ display: "block", marginBottom: 6 }}>Report cross-check</strong>
        <p style={{ margin: 0, color: "#61758f" }}>Use Placement with report section 3, Addressing with section 4, Services with section 5, Security with section 6, Redundancy with section 7, and Flows with section 7 so the device, service, subnet, and boundary names match the written package exactly.</p>
      </div>
      <div className="diagram-note-card">
        <strong style={{ display: "block", marginBottom: 6 }}>Validation cross-check</strong>
        <p style={{ margin: 0, color: "#61758f" }}>If labels, paths, interfaces, DMZ chains, or primary-versus-branch behavior look wrong here, review the same mismatch in validation and then correct it in addressing, security, routing, or service-placement workspaces.</p>
      </div>
    </div>
  );
}


export function TopologySpecificRenderingPanel({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
  const topologyLabel = synthesized.topology.topologyType;
  const primarySiteName = synthesized.topology.primarySiteName || synthesized.siteHierarchy[0]?.name || "Primary site";
  const items = topologyLabel === "hub-spoke"
    ? [
        { title: "Hub-and-spoke behavior", detail: `The primary site ${primarySiteName} should visually read as the concentration point for shared services, WAN attachment, and most branch-bound traffic review.` },
        { title: "Branch posture", detail: "Branches should read as attached edges, not mini data centers. Their diagrams should prioritize WAN handoff, local access, and dependency on shared or central services unless local breakout is explicit." },
        { title: "Flow expectation", detail: "Inter-site and shared-service flows should usually pull attention back toward the hub unless policy or local internet breakout changes that path." },
      ]
    : topologyLabel === "collapsed-core"
      ? [
          { title: "Campus / collapsed-core behavior", detail: "The site should read as a local hierarchy where switching, firewall edge, and service adjacency dominate review more than WAN routing posture." },
          { title: "Gateway concentration", detail: "Gateway and trust-boundary reading should stay local. Do not let the visual suggest fake branch routing summaries or non-existent WAN edges." },
          { title: "Flow expectation", detail: "Most important reviews should focus on internal segmentation, internet egress, local services, and management reachability." },
        ]
      : [
          { title: "Distributed topology behavior", detail: "Sites should visually show which roles are local, which roles are centralized, and where the controlling edge or shared-service anchor sits." },
          { title: "Service placement", detail: "Cloud, DMZ, and centralized-service anchors should be obvious enough that a reviewer can tell what is local versus remote at a glance." },
          { title: "Flow expectation", detail: "The active overlay should make cross-boundary movement and trust enforcement easy to follow without relying on narrative paragraphs." },
        ];

  return (
    <div className="diagram-topology-specific-panel">
      <div>
        <strong style={{ display: "block", marginBottom: 6 }}>Topology-specific rendering behavior</strong>
        <p className="muted" style={{ margin: 0 }}>
          The same symbol library should not read the same way for hub-and-spoke, campus-style, and cloud-connected patterns. This panel keeps that expected reading visible.
        </p>
      </div>
      <div className="diagram-topology-specific-grid">
        {items.map((item) => (
          <div key={item.title} className="diagram-topology-specific-card">
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SiteDeviceLinkMatrixPanel({ synthesized, siteIds }: { synthesized: SynthesizedLogicalDesign; siteIds?: string[] }) {
  const allowedSiteIds = siteIds && siteIds.length > 0 ? new Set(siteIds) : null;
  const siteRows = synthesized.siteHierarchy
    .filter((site) => !allowedSiteIds || allowedSiteIds.has(site.id))
    .map((site) => {
      const placements = synthesized.sitePlacements.filter((placement) => placement.siteId === site.id);
      const edgePlacement = placements.find((placement) => placement.deviceType === "firewall" || placement.deviceType === "router");
      const switchingPlacement = placements.find((placement) => placement.deviceType === "core-switch" || placement.deviceType === "distribution-switch" || placement.deviceType === "access-switch");
      const wirelessPlacement = placements.find((placement) => placement.deviceType === "wireless-controller" || placement.deviceType === "access-point");
      const siteServices = synthesized.servicePlacements.filter((service) => service.siteName === site.name).slice(0, 3);
      const transitLinks = synthesized.wanLinks.filter((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id);
      const primaryBoundary = synthesized.securityBoundaries.find((boundary) => boundary.siteName === site.name);

      return {
        id: site.id,
        siteName: site.name,
        tier: site.source === "configured" ? "configured" : "proposed",
        edge: edgePlacement ? `${edgePlacement.deviceName} • ${edgePlacement.deviceType}` : "Not synthesized",
        switching: switchingPlacement ? `${switchingPlacement.deviceName} • ${switchingPlacement.deviceType}` : "Not synthesized",
        wireless: wirelessPlacement ? `${wirelessPlacement.deviceName} • ${wirelessPlacement.deviceType}` : "None / not synthesized",
        transport: transitLinks.length > 0 ? transitLinks.map((link) => `${link.linkName} • ${link.transport}`).join(", ") : (synthesized.topology.topologyType === "collapsed-core" ? "Local switched core" : "Local edge only"),
        boundary: primaryBoundary ? `${primaryBoundary.zoneName} • ${primaryBoundary.controlPoint}` : "Boundary not explicit yet",
        services: siteServices.length > 0 ? siteServices.map((service) => service.serviceName).join(", ") : "No anchored services yet",
      };
    });

  return (
    <div className="diagram-site-matrix-panel">
      <div>
        <strong style={{ display: "block", marginBottom: 6 }}>Site / device / link matrix</strong>
        <p className="muted" style={{ margin: 0 }}>Use this matrix to confirm that every site has the right edge role, switching posture, transport behavior, and service or boundary anchors before trusting the diagram as a design artifact.</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th align="left">Site</th>
              <th align="left">Tier</th>
              <th align="left">Edge</th>
              <th align="left">Switching</th>
              <th align="left">Wireless</th>
              <th align="left">Transport / link meaning</th>
              <th align="left">Primary boundary</th>
              <th align="left">Anchored services</th>
            </tr>
          </thead>
          <tbody>
            {siteRows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.siteName}</strong></td>
                <td>{row.tier}</td>
                <td>{row.edge}</td>
                <td>{row.switching}</td>
                <td>{row.wireless}</td>
                <td>{row.transport}</td>
                <td>{row.boundary}</td>
                <td>{row.services}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TopologyObjectPanel({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
  const primarySiteName = synthesized.topology.primarySiteName || synthesized.siteHierarchy[0]?.name || "Not assigned";
  const serviceAnchors = Array.from(new Set(synthesized.servicePlacements.slice(0, 6).map((placement) => `${placement.serviceName} • ${placement.placementType === "cloud" ? "cloud" : placement.siteName || placement.zoneName}`)));

  return (
    <div className="diagram-topology-object-panel">
      <div className="diagram-topology-object-card">
        <strong style={{ display: "block", marginBottom: 6 }}>Topology object model</strong>
        <p style={{ margin: "0 0 10px 0", color: "#61758f" }}>
          This keeps the diagram tied to its underlying topology object: what architecture pattern is being drawn, where the primary edge sits, how breakout is expected, and which service anchors should appear in review.
        </p>
        <div className="diagram-topology-object-grid">
          <div><span>Pattern</span><strong>{synthesized.topology.topologyLabel}</strong></div>
          <div><span>Primary site</span><strong>{primarySiteName}</strong></div>
          <div><span>Breakout</span><strong>{synthesized.topology.internetBreakout}</strong></div>
          <div><span>Cloud posture</span><strong>{synthesized.topology.cloudConnected ? "cloud-attached" : "on-prem only"}</strong></div>
          <div><span>WAN posture</span><strong>{synthesized.topology.topologyType === "collapsed-core" ? "local only" : synthesized.topology.internetBreakout === "centralized" ? "centralized WAN / breakout" : "distributed WAN / breakout"}</strong></div>
          <div><span>Redundancy</span><strong>{synthesized.topology.redundancyModel}</strong></div>
        </div>
      </div>
      <div className="diagram-topology-object-card">
        <strong style={{ display: "block", marginBottom: 6 }}>Service and placement anchors</strong>
        <div className="network-chip-list">
          {serviceAnchors.length > 0 ? serviceAnchors.map((item) => <span key={item} className="badge-soft">{item}</span>) : <span className="badge-soft">No explicit service anchors yet</span>}
        </div>
        <p style={{ margin: "10px 0 0 0", color: "#61758f" }}>
          Use these anchors to decide whether the current diagram should emphasize branch-to-hub movement, cloud edge visibility, DMZ placement, or local breakout at individual sites.
        </p>
      </div>
    </div>
  );
}

export function OverlayBehaviorPanel({ overlay }: { overlay: OverlayMode }) {
  const overlayChecks: Record<OverlayMode, string[]> = {
    none: [
      "Confirm the primary edge device exists at the right site.",
      "Check that access, distribution, core, wireless, and service roles look plausible.",
      "Use this first before reviewing labels or path behavior.",
    ],
    addressing: [
      "Check site blocks, VLAN/subnet labels, gateways, and transit references.",
      "Make sure DMZ and management subnets are visible when the design expects them.",
      "Use this before trusting report addressing tables or route summaries.",
    ],
    security: [
      "Check trust boundaries, attached enforcement points, and DMZ adjacency.",
      "Verify guest, user, server, management, and edge paths are separated correctly.",
      "Use this before reviewing policy text in the report.",
    ],
    flows: [
      "Check whether branch, guest, internet, cloud, management, and published-service paths look believable.",
      "Verify the traversal path matches the topology type rather than reading like a generic network.",
      "Use this before trusting cutover, routing, or security review narrative.",
    ],
    services: [
      "Check whether services are shown as local, centralized, DMZ-based, or cloud-hosted where the design expects them.",
      "Verify the service anchor sits behind the correct boundary and consumer model.",
      "Use this before trusting service-placement sections in the report.",
    ],
    redundancy: [
      "Check whether the current layout shows one edge, paired edge, or more resilient transport clearly enough.",
      "Verify route-domain anchors and WAN links support the failover story the topology implies.",
      "Use this before trusting HA, resilience, or transport narrative in the report.",
    ],
  };

  return (
    <div className="diagram-overlay-behavior-panel">
      <strong style={{ display: "block", marginBottom: 8 }}>Overlay behavior checklist</strong>
      <div className="diagram-overlay-behavior-grid">
        {overlayChecks[overlay].map((item) => (
          <div key={item} className="diagram-overlay-behavior-card">{item}</div>
        ))}
      </div>
    </div>
  );
}

export function TopologyFoundationPanel({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
  const topServices = synthesized.servicePlacements.slice(0, 4);

  return (
    <div className="diagram-foundation-grid" style={{ marginTop: 10 }}>
      <div className="diagram-foundation-card">
        <strong style={{ display: "block", marginBottom: 6 }}>Topology intent</strong>
        <p style={{ margin: "0 0 8px 0" }}>{synthesized.topology.notes?.[0] || synthesized.topology.topologyLabel}</p>
        <div className="network-chip-list">
          <span className="badge-soft">{synthesized.topology.topologyType}</span>
          <span className="badge-soft">WAN {synthesized.topology.topologyType === "collapsed-core" ? "local only" : synthesized.topology.internetBreakout === "centralized" ? "centralized WAN / breakout" : "distributed WAN / breakout"}</span>
          <span className="badge-soft">Breakout {synthesized.topology.internetBreakout}</span>
          <span className="badge-soft">Redundancy {synthesized.topology.redundancyModel}</span>
        </div>
      </div>
      <div className="diagram-foundation-card">
        <strong style={{ display: "block", marginBottom: 6 }}>Placement and service anchors</strong>
        <div className="diagram-mini-list">
          <div><span>Placements</span><strong>{synthesized.sitePlacements.length}</strong></div>
          <div><span>Boundaries</span><strong>{synthesized.securityBoundaries.length}</strong></div>
          <div><span>Flows</span><strong>{synthesized.trafficFlows.length}</strong></div>
          <div><span>Services</span><strong>{synthesized.servicePlacements.length}</strong></div>
        </div>
        <p style={{ margin: "8px 0 0 0", color: "#61758f" }}>Primary service edge: {topServices[0]?.serviceName || "No explicit service yet"}</p>
      </div>
    </div>
  );
}

export function SupportTopologyPostureLedgerPanel({ synthesized, sites }: { synthesized: SynthesizedLogicalDesign; sites: Array<{ id: string; name: string }>; }) {
  if (!sites.length) return null;

  function siteBreakoutSummary(siteName: string) {
    if (siteName === synthesized.topology.primarySiteName) {
      return synthesized.topology.internetBreakout.toLowerCase().includes("local")
        ? "Primary site carries local breakout"
        : `Primary site anchors ${synthesized.topology.internetBreakout.toLowerCase()}`;
    }

    if (synthesized.topology.topologyType === "hub-spoke") {
      return synthesized.topology.internetBreakout.toLowerCase().includes("distributed") || synthesized.topology.internetBreakout.toLowerCase().includes("local")
        ? "Branch breakout can stay local"
        : `Branch breakout should traverse ${synthesized.topology.primarySiteName || "the hub"}`;
    }

    if (synthesized.topology.topologyType === "hybrid-cloud") return "Cloud-aware breakout and hosted-service edge";
    if (synthesized.topology.topologyType === "collapsed-core") return "Local breakout at collapsed edge";
    return synthesized.topology.internetBreakout;
  }

  function siteRoutingSummary(siteId: string, siteName: string) {
    const route = (synthesized.routePlan ?? synthesized.routingPlan).find((item) => item.siteId === siteId || item.siteName === siteName);
    if (route?.summaryAdvertisement) return `Summarizes ${route.summaryAdvertisement}`;
    if (route?.transitAdjacencyCount && route.transitAdjacencyCount > 0) return `${route.transitAdjacencyCount} transit adjacencies`;
    if (siteName === synthesized.topology.primarySiteName) return "Shared route / policy anchor";
    if (synthesized.topology.topologyType === "hub-spoke") return `Attached route domain via ${synthesized.topology.primarySiteName || "hub"}`;
    if (synthesized.topology.topologyType === "collapsed-core") return "Local gateway and switching role";
    return "Routed attached site";
  }

  function siteTransportSummary(siteId: string, siteName: string) {
    const links = synthesized.wanLinks.filter((link) => link.endpointASiteId === siteId || link.endpointBSiteId === siteId);
    if (!links.length) {
      if (siteName === synthesized.topology.primarySiteName) return "Primary edge without explicit WAN link rows yet";
      return synthesized.topology.topologyType === "collapsed-core" ? "No WAN transit required" : "Transit relationship still inferred";
    }

    return links.slice(0, 2).map((link) => {
      const peerSiteName = link.endpointASiteId === siteId ? link.endpointBSiteName : link.endpointASiteName;
      return `${link.linkName} → ${peerSiteName}`;
    }).join(" • ");
  }

  function siteAnchorSummary(siteId: string, siteName: string) {
    const services = synthesized.servicePlacements.filter((placement) => placement.siteId === siteId || placement.siteName === siteName);
    const boundaries = synthesized.securityBoundaries.filter((boundary) => boundary.siteName === siteName);
    const placements = synthesized.sitePlacements.filter((placement) => placement.siteId === siteId);
    const primaryService = services[0]?.serviceName;
    const primaryBoundary = boundaries[0]?.boundaryName;
    const primaryDevice = placements[0]?.deviceName;
    return [primaryService, primaryBoundary, primaryDevice].filter(Boolean).slice(0, 2).join(" • ") || "Core anchors still inferred";
  }

  return (
    <div className="diagram-note-card" style={{ marginBottom: 12 }}>
      <strong style={{ display: "block", marginBottom: 6 }}>Topology-specific posture ledger</strong>
      <p style={{ margin: "0 0 12px 0", color: "#61758f" }}>
        This keeps the diagram stage tied to real design objects by showing how each in-scope site should behave in the current topology, not just which overlay is selected.
      </p>
      <div className="diagram-overlay-evidence-grid">
        {sites.map((site) => (
          <div key={site.id} className="diagram-overlay-evidence-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <strong>{site.name}</strong>
              <span className="badge-soft">{site.name === synthesized.topology.primarySiteName ? "Primary" : "Attached"}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#42566f" }}>
              <li style={{ marginBottom: 6 }}><strong>Breakout:</strong> {siteBreakoutSummary(site.name)}</li>
              <li style={{ marginBottom: 6 }}><strong>Routing:</strong> {siteRoutingSummary(site.id, site.name)}</li>
              <li style={{ marginBottom: 6 }}><strong>Transport:</strong> {siteTransportSummary(site.id, site.name)}</li>
              <li style={{ marginBottom: 0 }}><strong>Anchors:</strong> {siteAnchorSummary(site.id, site.name)}</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
