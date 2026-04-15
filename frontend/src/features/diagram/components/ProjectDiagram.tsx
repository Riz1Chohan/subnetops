import { useMemo, useState } from "react";
import { synthesizeLogicalDesign, type SitePlacementDevice, type SynthesizedLogicalDesign, type TrafficFlowPath } from "../../../lib/designSynthesis";
import { parseRequirementsProfile } from "../../../lib/requirementsProfile";
import type { ProjectComment, ProjectDetail, Site, Vlan } from "../../../lib/types";

interface SiteWithVlans extends Site {
  vlans?: Vlan[];
}

interface ProjectDiagramProps {
  project: ProjectDetail;
  comments?: ProjectComment[];
  onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void;
}

type DiagramMode = "logical" | "physical";
type OverlayMode = "none" | "addressing" | "security" | "flows";
type SitePoint = { x: number; y: number };

type DeviceKind = SitePlacementDevice["deviceType"] | "internet" | "cloud";

function getSvgElement(svgId: string) {
  return document.getElementById(svgId) as SVGSVGElement | null;
}

function exportSvg(svgId: string, filename: string) {
  const svg = getSvgElement(svgId);
  if (!svg) return;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportPng(svgId: string, filename: string) {
  const svg = getSvgElement(svgId);
  if (!svg) return;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not render SVG as image."));
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.width || 1800;
  canvas.height = image.height || 1200;
  const context = canvas.getContext("2d");
  if (!context) {
    URL.revokeObjectURL(url);
    return;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  const pngUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = pngUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function openTaskCount(comments: ProjectComment[], targetType: "SITE" | "VLAN", targetId: string) {
  return comments.filter((comment) => comment.taskStatus !== "DONE" && comment.targetType === targetType && comment.targetId === targetId).length;
}

function roleTone(kind: DeviceKind) {
  switch (kind) {
    case "firewall": return { fill: "#ebf3ff", stroke: "#73a1ef", text: "#144aab" };
    case "router": return { fill: "#ffffff", stroke: "#8cb0ef", text: "#183866" };
    case "core-switch":
    case "distribution-switch":
    case "access-switch": return { fill: "#ffffff", stroke: "#8eb7f7", text: "#183866" };
    case "wireless-controller":
    case "access-point": return { fill: "#f3fff8", stroke: "#8fdab3", text: "#1d7f4c" };
    case "server": return { fill: "#f6f0ff", stroke: "#c9abff", text: "#5a34a3" };
    case "cloud-edge":
    case "cloud": return { fill: "#f4efff", stroke: "#c7b0ff", text: "#5a34a3" };
    case "internet": return { fill: "#eef5ff", stroke: "#bad1f5", text: "#234878" };
    default: return { fill: "#ffffff", stroke: "#ccd7eb", text: "#183866" };
  }
}

function deviceLabel(kind: DeviceKind) {
  switch (kind) {
    case "firewall": return "Firewall";
    case "router": return "Router";
    case "core-switch": return "Core Switch";
    case "distribution-switch": return "Distribution";
    case "access-switch": return "Access Switch";
    case "wireless-controller": return "WLC";
    case "access-point": return "AP";
    case "server": return "Server";
    case "cloud-edge": return "Cloud Edge";
    case "cloud": return "Cloud";
    case "internet": return "Internet";
    default: return kind;
  }
}

function linkStyle(type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow") {
  switch (type) {
    case "internet": return { stroke: "#7ca5eb", dash: "8 6", width: 2.5 };
    case "trunk": return { stroke: "#9a7cff", dash: "2 0", width: 3.5 };
    case "vpn": return { stroke: "#1d7f4c", dash: "10 5", width: 3 };
    case "ha": return { stroke: "#ff9b5d", dash: "6 5", width: 2.5 };
    case "flow": return { stroke: "#ff7a59", dash: "0", width: 3.5 };
    default: return { stroke: "#85a7e6", dash: "0", width: 2.6 };
  }
}

function DeviceIcon({ x, y, kind, label, sublabel }: { x: number; y: number; kind: DeviceKind; label: string; sublabel?: string }) {
  const tone = roleTone(kind);
  const bodyX = x;
  const bodyY = y;

  if (kind === "internet" || kind === "cloud" || kind === "cloud-edge") {
    return (
      <g>
        <ellipse cx={bodyX + 34} cy={bodyY + 28} rx={28} ry={18} fill={tone.fill} stroke={tone.stroke} strokeWidth="2" />
        <ellipse cx={bodyX + 62} cy={bodyY + 18} rx={30} ry={20} fill={tone.fill} stroke={tone.stroke} strokeWidth="2" />
        <ellipse cx={bodyX + 88} cy={bodyY + 30} rx={22} ry={15} fill={tone.fill} stroke={tone.stroke} strokeWidth="2" />
        <rect x={bodyX + 20} y={bodyY + 24} width={78} height={22} rx={11} fill={tone.fill} stroke={tone.stroke} strokeWidth="2" />
        <text x={bodyX + 60} y={bodyY + 74} textAnchor="middle" fontSize="12" fontWeight="700" fill={tone.text}>{label}</text>
        {sublabel ? <text x={bodyX + 60} y={bodyY + 89} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
      </g>
    );
  }

  if (kind === "router") {
    return (
      <g>
        <circle cx={bodyX + 44} cy={bodyY + 32} r={30} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.5" />
        <path d={`M ${bodyX + 23} ${bodyY + 32} L ${bodyX + 43} ${bodyY + 18} L ${bodyX + 43} ${bodyY + 27} L ${bodyX + 62} ${bodyY + 18} L ${bodyX + 46} ${bodyY + 32} L ${bodyX + 62} ${bodyY + 46} L ${bodyX + 43} ${bodyY + 37} L ${bodyX + 43} ${bodyY + 46} L ${bodyX + 23} ${bodyY + 32} Z`} fill={tone.stroke} opacity="0.8" />
        <text x={bodyX + 44} y={bodyY + 74} textAnchor="middle" fontSize="12" fontWeight="700" fill="#183866">{label}</text>
        {sublabel ? <text x={bodyX + 44} y={bodyY + 89} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
      </g>
    );
  }

  if (kind === "firewall") {
    return (
      <g>
        <path d={`M ${bodyX + 16} ${bodyY} L ${bodyX + 104} ${bodyY} L ${bodyX + 118} ${bodyY + 14} L ${bodyX + 118} ${bodyY + 52} L ${bodyX} ${bodyY + 52} L ${bodyX} ${bodyY + 14} Z`} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        <rect x={bodyX + 18} y={bodyY + 12} width="80" height="6" rx="3" fill={tone.stroke} opacity="0.26" />
        <rect x={bodyX + 18} y={bodyY + 23} width="80" height="6" rx="3" fill={tone.stroke} opacity="0.22" />
        <rect x={bodyX + 18} y={bodyY + 34} width="80" height="6" rx="3" fill={tone.stroke} opacity="0.18" />
        <text x={bodyX + 59} y={bodyY + 71} textAnchor="middle" fontSize="12" fontWeight="700" fill="#183866">{label}</text>
        {sublabel ? <text x={bodyX + 59} y={bodyY + 86} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
      </g>
    );
  }

  if (kind === "access-point" || kind === "wireless-controller") {
    return (
      <g>
        <circle cx={bodyX + 26} cy={bodyY + 26} r={17} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        <circle cx={bodyX + 26} cy={bodyY + 26} r={4} fill={tone.text} />
        <path d={`M ${bodyX + 12} ${bodyY + 14} Q ${bodyX + 26} ${bodyY + 4} ${bodyX + 40} ${bodyY + 14}`} fill="none" stroke={tone.stroke} strokeWidth="2" />
        <path d={`M ${bodyX + 16} ${bodyY + 19} Q ${bodyX + 26} ${bodyY + 12} ${bodyX + 36} ${bodyY + 19}`} fill="none" stroke={tone.stroke} strokeWidth="2" />
        <text x={bodyX + 26} y={bodyY + 58} textAnchor="middle" fontSize="12" fontWeight="700" fill="#183866">{label}</text>
        {sublabel ? <text x={bodyX + 26} y={bodyY + 73} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
      </g>
    );
  }

  if (kind === "server") {
    return (
      <g>
        <rect x={bodyX} y={bodyY} width="74" height="50" rx="10" fill={tone.fill} stroke={tone.stroke} strokeWidth="2" />
        <rect x={bodyX + 10} y={bodyY + 10} width="54" height="7" rx="3.5" fill={tone.stroke} opacity="0.28" />
        <rect x={bodyX + 10} y={bodyY + 22} width="54" height="7" rx="3.5" fill={tone.stroke} opacity="0.22" />
        <rect x={bodyX + 10} y={bodyY + 34} width="22" height="6" rx="3" fill={tone.stroke} opacity="0.18" />
        <text x={bodyX + 37} y={bodyY + 70} textAnchor="middle" fontSize="12" fontWeight="700" fill="#183866">{label}</text>
        {sublabel ? <text x={bodyX + 37} y={bodyY + 85} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
      </g>
    );
  }

  return (
    <g>
      <rect x={bodyX} y={bodyY} width="112" height="42" rx="10" fill={tone.fill} stroke={tone.stroke} strokeWidth="2" />
      {Array.from({ length: 8 }).map((_, index) => (
        <rect key={index} x={bodyX + 11 + index * 11.2} y={bodyY + 13} width="6" height="5" rx="2" fill={tone.stroke} opacity={0.9 - index * 0.05} />
      ))}
      {Array.from({ length: 8 }).map((_, index) => (
        <rect key={`lower-${index}`} x={bodyX + 11 + index * 11.2} y={bodyY + 23} width="6" height="5" rx="2" fill={tone.stroke} opacity={0.6 - index * 0.03} />
      ))}
      <text x={bodyX + 56} y={bodyY + 60} textAnchor="middle" fontSize="12" fontWeight="700" fill="#183866">{label}</text>
      {sublabel ? <text x={bodyX + 56} y={bodyY + 75} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
    </g>
  );
}

function taskBadge(x: number, y: number, count: number) {
  if (count <= 0) return null;
  return (
    <g>
      <circle cx={x} cy={y} r="12" fill="#ff7a59" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="white" fontWeight="700">{count}</text>
    </g>
  );
}

function chip(x: number, y: number, width: number, text: string, tone: "blue" | "purple" | "green" | "orange") {
  const palette = tone === "purple"
    ? { fill: "#f7f1ff", stroke: "#c9abff", text: "#5a34a3" }
    : tone === "green"
      ? { fill: "#f2fff8", stroke: "#96dfb7", text: "#1d7f4c" }
      : tone === "orange"
        ? { fill: "#fff7ef", stroke: "#ffc98e", text: "#8f4b00" }
        : { fill: "#eef5ff", stroke: "#b8cff5", text: "#20427f" };

  return (
    <g>
      <rect x={x} y={y} width={width} height="22" rx="11" fill={palette.fill} stroke={palette.stroke} />
      <text x={x + 10} y={y + 15} fontSize="10.5" fill={palette.text}>{text}</text>
    </g>
  );
}

function pathLine(points: Array<[number, number]>, type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow", label?: string, secondaryLabel?: string) {
  const style = linkStyle(type);
  const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const labelPoint = points[Math.floor(points.length / 2)];
  const labelWidth = Math.max(116, ((label?.length ?? 0) * 6.3) + 24);
  const secondaryWidth = Math.max(104, ((secondaryLabel?.length ?? 0) * 6.1) + 24);
  return (
    <g>
      <path d={path} fill="none" stroke={style.stroke} strokeWidth={style.width} strokeDasharray={style.dash} strokeLinecap="round" strokeLinejoin="round" />
      {label && labelPoint ? (
        <g>
          <rect x={labelPoint[0] - labelWidth / 2} y={labelPoint[1] - (secondaryLabel ? 28 : 18)} width={labelWidth} height={18} rx="9" fill="#ffffff" stroke="#dbe6f7" />
          <text x={labelPoint[0]} y={labelPoint[1] - (secondaryLabel ? 15 : 5)} textAnchor="middle" fontSize="10.5" fill="#526984">{label}</text>
          {secondaryLabel ? (
            <g>
              <rect x={labelPoint[0] - secondaryWidth / 2} y={labelPoint[1] - 6} width={secondaryWidth} height={16} rx="8" fill="#f8fbff" stroke="#dbe6f7" />
              <text x={labelPoint[0]} y={labelPoint[1] + 5} textAnchor="middle" fontSize="9.6" fill="#6a7d97">{secondaryLabel}</text>
            </g>
          ) : null}
        </g>
      ) : null}
    </g>
  );
}


function primaryDmzService(synthesized: SynthesizedLogicalDesign, siteName?: string) {
  return synthesized.servicePlacements.find((service) => service.serviceType === "dmz-service" && (!siteName || service.siteName === siteName));
}

function sitePositionMap(sites: SiteWithVlans[], synthesized: SynthesizedLogicalDesign, cardWidth: number, startX: number, gap: number): Record<string, SitePoint> {
  const positions: Record<string, SitePoint> = {};
  if (sites.length === 1) {
    positions[sites[0].id] = { x: 560, y: 210 };
    return positions;
  }

  if (synthesized.topology.topologyType === "hub-spoke" && synthesized.topology.primarySiteId) {
    const primary = sites.find((site) => site.id === synthesized.topology.primarySiteId) || sites[0];
    const branches = sites.filter((site) => site.id !== primary.id);
    positions[primary.id] = { x: 560, y: 170 };
    const columns = Math.min(3, Math.max(2, branches.length));
    branches.forEach((site, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      positions[site.id] = { x: 120 + col * (cardWidth + 90), y: 580 + row * 400 };
    });
    return positions;
  }

  sites.forEach((site, index) => {
    positions[site.id] = { x: startX + index * (cardWidth + gap), y: 178 };
  });
  return positions;
}

function overlayTone(mode: OverlayMode) {
  switch (mode) {
    case "addressing": return "blue" as const;
    case "security": return "purple" as const;
    case "flows": return "orange" as const;
    default: return "green" as const;
  }
}

function overlayItems(site: SiteWithVlans, synthesized: SynthesizedLogicalDesign, mode: OverlayMode) {
  if (mode === "addressing") {
    return synthesized.addressingPlan
      .filter((row) => row.siteId === site.id)
      .slice(0, 5)
      .map((row) => `${row.segmentName} • ${row.subnetCidr}`);
  }

  if (mode === "security") {
    return synthesized.securityBoundaries
      .filter((boundary) => boundary.siteName === site.name)
      .slice(0, 5)
      .map((boundary) => `${boundary.zoneName} • via ${boundary.attachedDevice}`);
  }

  if (mode === "flows") {
    return synthesized.trafficFlows
      .filter((flow) => flow.sourceSite === site.name || flow.destinationSite === site.name)
      .slice(0, 4)
      .map((flow) => `${flow.flowName} • ${flow.sourceZone} → ${flow.destinationZone}`);
  }

  return synthesized.sitePlacements
    .filter((placement) => placement.siteId === site.id)
    .slice(0, 4)
    .map((placement) => `${deviceLabel(placement.deviceType)} • ${placement.role}`);
}

function diagramLegend(mode: OverlayMode) {
  const title = mode === "addressing" ? "Addressing overlay"
    : mode === "security" ? "Security overlay"
      : mode === "flows" ? "Traffic-flow overlay"
        : "Placement overlay";
  const details = mode === "addressing"
    ? ["Shows site VLAN / subnet labels.", "Use this to confirm where blocks land."]
    : mode === "security"
      ? ["Shows zones and attached enforcement devices.", "Use this to verify DMZ, guest, and management boundaries."]
      : mode === "flows"
        ? ["Highlights critical traffic paths and control points.", "Use this to review north-south and shared-service movement."]
        : ["Shows actual device roles that the engine placed at each site.", "Use this to verify edge, switching, and service placement."];
  return { title, details };
}

function LogicalTopologyDiagram({
  project,
  synthesized,
  svgId,
  comments,
  overlay,
  onSelectTarget,
}: {
  project: ProjectDetail;
  synthesized: SynthesizedLogicalDesign;
  svgId: string;
  comments: ProjectComment[];
  overlay: OverlayMode;
  onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void;
}) {
  const sites = (project.sites ?? []) as SiteWithVlans[];
  const cardWidth = 290;
  const cardHeight = 350;
  const startX = 50;
  const gap = 24;
  const sitePositions = sitePositionMap(sites, synthesized, cardWidth, startX, gap);
  const occupiedXs = Object.values(sitePositions).map((point) => point.x);
  const occupiedYs = Object.values(sitePositions).map((point) => point.y);
  const width = Math.max(1600, (Math.max(...occupiedXs, 0)) + cardWidth + 120);
  const height = Math.max(980, (Math.max(...occupiedYs, 0)) + cardHeight + 120);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Logical topology diagram with explicit device placement, addressing, and overlay modes">
        <rect x={0} y={0} width={width} height={height} rx={30} fill="#fbfdff" />
        <rect x={40} y={36} width={width - 80} height={110} rx={24} fill="#f6f9ff" stroke="#d9e6fb" />
        <text x={64} y={72} fontSize="20" fontWeight="700" fill="#142742">Logical topology</text>
        <text x={64} y={96} fontSize="12" fill="#637998">v97 focuses on a real topology-style view: edge devices, switching roles, service placement, and overlays that reflect explicit design objects.</text>
        <text x={64} y={118} fontSize="12" fill="#637998">Topology: {synthesized.topology.topologyLabel} • Breakout: {synthesized.topology.internetBreakout} • Redundancy: {synthesized.topology.redundancyModel}</text>
        {chip(width - 286, 58, 210, diagramLegend(overlay).title, overlayTone(overlay))}

        {sites.map((site, index) => {
          const sitePoint = sitePositions[site.id] || { x: startX + index * (cardWidth + gap), y: 178 };
          const x = sitePoint.x;
          const y = sitePoint.y;
          const siteDevices = synthesized.sitePlacements.filter((placement) => placement.siteId === site.id);
          const siteOverlays = overlayItems(site, synthesized, overlay);
          const taskCount = openTaskCount(comments, "SITE", site.id);
          const edgeDevice = siteDevices.find((device) => device.role.toLowerCase().includes("edge") || device.deviceType === "firewall" || device.deviceType === "router") || siteDevices[0];
          const switchDevice = siteDevices.find((device) => device.deviceType === "core-switch" || device.deviceType === "distribution-switch" || device.deviceType === "access-switch");
          const serviceDevice = siteDevices.find((device) => device.deviceType === "server");
          const wirelessDevice = siteDevices.find((device) => device.deviceType === "wireless-controller" || device.deviceType === "access-point");
          const securitySummary = synthesized.securityBoundaries.filter((boundary) => boundary.siteName === site.name).slice(0, 2);

          return (
            <g key={site.id}>
              <rect x={x} y={y} width={cardWidth} height={cardHeight} rx={24} fill="#ffffff" stroke="#dce7f8" strokeWidth="2.3" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 20} y={y + 30} fontSize="18" fontWeight="700" fill="#142742">{site.name}</text>
              <text x={x + 20} y={y + 50} fontSize="11" fill="#697f98">{site.defaultAddressBlock || "No site summary block assigned"}</text>
              <text x={x + 20} y={y + 68} fontSize="11" fill="#697f98">Site role: {site.name === synthesized.topology.primarySiteName ? "Primary / policy hub" : synthesized.topology.topologyType === "collapsed-core" ? "Collapsed-core site" : "Attached / branch site"}</text>
              {taskBadge(x + cardWidth - 24, y + 24, taskCount)}

              {edgeDevice ? <DeviceIcon x={x + 18} y={y + 92} kind={edgeDevice.deviceType} label={deviceLabel(edgeDevice.deviceType)} sublabel={edgeDevice.role} /> : null}
              {switchDevice ? <DeviceIcon x={x + 126} y={y + 92} kind={switchDevice.deviceType} label={deviceLabel(switchDevice.deviceType)} sublabel={switchDevice.role} /> : null}
              {serviceDevice ? <DeviceIcon x={x + 212} y={y + 92} kind={serviceDevice.deviceType} label="Services" sublabel={serviceDevice.role} /> : null}
              {wirelessDevice ? <DeviceIcon x={x + 114} y={y + 188} kind={wirelessDevice.deviceType} label={deviceLabel(wirelessDevice.deviceType)} sublabel={wirelessDevice.role} /> : null}
              {primaryDmzService(synthesized, site.name) ? <DeviceIcon x={x + 214} y={y + 186} kind="server" label="DMZ Host" sublabel={primaryDmzService(synthesized, site.name)?.subnetCidr || "Published"} /> : null}

              {edgeDevice && switchDevice ? pathLine([[x + 120, y + 122], [x + 126, y + 122]], "routed", edgeDevice.deviceType === "firewall" ? "inside / transit" : "LAN handoff", edgeDevice.connectedSubnets[0] || undefined) : null}
              {switchDevice && serviceDevice ? pathLine([[x + 238, y + 122], [x + 212, y + 122]], "trunk", "server trunk", serviceDevice.connectedSubnets[0] || undefined) : null}
              {switchDevice && wirelessDevice ? pathLine([[x + 182, y + 155], [x + 140, y + 188]], "trunk", "AP uplink", wirelessDevice.connectedZones[0] || undefined) : null}
              {edgeDevice && primaryDmzService(synthesized, site.name) ? pathLine([[x + 78, y + 144], [x + 214, y + 212]], "internet", "DMZ leg", primaryDmzService(synthesized, site.name)?.subnetCidr || undefined) : null}

              <text x={x + 18} y={y + 270} fontSize="12" fontWeight="700" fill="#324866">{diagramLegend(overlay).title}</text>
              {siteOverlays.slice(0, 5).map((item, overlayIndex) => chip(x + 18, y + 282 + overlayIndex * 28, cardWidth - 36, item, overlayTone(overlay)))}
              {siteOverlays.length === 0 ? <text x={x + 18} y={y + 300} fontSize="10.5" fill="#6a7d97">No overlay items yet for this site.</text> : null}
              {securitySummary.map((boundary, boundaryIndex) => (
                <text key={`${site.id}-${boundary.zoneName}-${boundaryIndex}`} x={x + 18} y={y + cardHeight - 30 + boundaryIndex * 14} fontSize="10.5" fill="#61758f">{boundary.zoneName}: {boundary.controlPoint}</text>
              ))}
            </g>
          );
        })}

        {sites.length > 1 ? (
          synthesized.topology.topologyType === "hub-spoke" && synthesized.topology.primarySiteId
            ? sites.filter((site) => site.id !== synthesized.topology.primarySiteId).map((site) => {
                const primaryPoint = sitePositions[synthesized.topology.primarySiteId!];
                const branchPoint = sitePositions[site.id];
                const wanLink = synthesized.wanLinks.find((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id);
                return (
                  <g key={`inter-${site.id}`}>
                    {pathLine(
                      [[primaryPoint.x + cardWidth / 2, primaryPoint.y + cardHeight], [branchPoint.x + cardWidth / 2, branchPoint.y]],
                      "vpn",
                      "WAN / hub-spoke",
                      wanLink?.subnetCidr || "Point-to-point transit",
                    )}
                  </g>
                );
              })
            : sites.slice(0, -1).map((site, index) => {
                const currentPoint = sitePositions[site.id];
                const nextSite = sites[index + 1];
                const nextPoint = sitePositions[nextSite.id];
                const label = synthesized.topology.topologyType === "collapsed-core" ? "Campus / local core" : "Inter-site routed path";
                return (
                  <g key={`inter-${site.id}`}>
                    {pathLine(
                      [[currentPoint.x + cardWidth, currentPoint.y + 176], [nextPoint.x, nextPoint.y + 176]],
                      synthesized.topology.topologyType === "collapsed-core" ? "trunk" : "routed",
                      label,
                      synthesized.wanLinks[index]?.subnetCidr || undefined,
                    )}
                  </g>
                );
              })
        ) : null}
      </svg>
    </div>
  );
}

function PhysicalTopologyDiagram({
  project,
  synthesized,
  svgId,
  comments,
  overlay,
  onSelectTarget,
}: {
  project: ProjectDetail;
  synthesized: SynthesizedLogicalDesign;
  svgId: string;
  comments: ProjectComment[];
  overlay: OverlayMode;
  onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void;
}) {
  const sites = (project.sites ?? []) as SiteWithVlans[];
  const requirements = parseRequirementsProfile(project.requirementsJson);
  const primarySite = sites.find((site) => site.name === synthesized.topology.primarySiteName) || sites[0];
  const branchSites = sites.filter((site) => site.id !== primarySite?.id);
  const cloudNeeded = synthesized.topology.cloudConnected || synthesized.servicePlacements.some((service) => service.placementType === "cloud");
  const width = Math.max(1680, 1280 + branchSites.length * 140 + (cloudNeeded ? 180 : 0));
  const height = 1160;
  const centerX = width / 2;
  const hqTaskCount = primarySite ? openTaskCount(comments, "SITE", primarySite.id) : 0;

  const flowOverlays = overlay === "flows" ? synthesized.trafficFlows.slice(0, 4) : [];
  const legend = diagramLegend(overlay);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Physical style topology diagram with real network symbols and overlay modes">
        <rect x={0} y={0} width={width} height={height} rx={30} fill="#fbfdff" />

        <rect x={48} y={42} width={width - 96} height={180} rx={28} fill="#f8fbff" stroke="#dbe6f7" strokeWidth="2" />
        <text x={72} y={76} fontSize="21" fontWeight="700" fill="#152742">Physical / topology diagram</text>
        <text x={72} y={101} fontSize="12" fill="#607791">v98 tightens the topology rebuild with labeled links, clearer DMZ host placement, and topology-aware positioning that changes with the selected design model.</text>
        <text x={72} y={122} fontSize="12" fill="#607791">Connection semantics: routed = blue, trunk = purple, VPN/WAN = green dashed, internet = blue dashed, flow overlay = orange.</text>
        {chip(width - 310, 68, 230, legend.title, overlayTone(overlay))}
        {legend.details.map((detail, index) => <text key={detail} x={width - 300} y={104 + index * 18} fontSize="11" fill="#607791">• {detail}</text>)}

        <DeviceIcon x={centerX - 65} y={104} kind="internet" label="Internet / WAN" sublabel={synthesized.topology.internetBreakout} />
        {pathLine([[centerX, 170], [centerX, 222]], "internet", synthesized.topology.topologyType === "hub-spoke" ? "Internet + branch WAN" : "North-south edge")}
        <DeviceIcon x={centerX - 60} y={226} kind="firewall" label="Perimeter Firewall" sublabel={synthesized.topology.redundancyModel} />
        {primaryDmzService(synthesized, primarySite?.name) ? <DeviceIcon x={centerX + 168} y={232} kind="server" label="DMZ Host" sublabel={primaryDmzService(synthesized, primarySite?.name)?.subnetCidr || "Published service"} /> : null}
        {primaryDmzService(synthesized, primarySite?.name) ? pathLine([[centerX + 58, 262], [centerX + 168, 262]], "internet", "dmz", primaryDmzService(synthesized, primarySite?.name)?.subnetCidr || undefined) : null}
        {pathLine([[centerX, 278], [centerX, 340]], "routed", "inside / routed core", synthesized.routingPlan.find((item) => item.siteId === primarySite?.id)?.summaryAdvertisement || undefined)}

        <rect x={centerX - 270} y={344} width={540} height={360} rx={28} fill="#ffffff" stroke="#dce7f8" strokeWidth="2.5" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => primarySite && onSelectTarget?.("SITE", primarySite.id)} />
        <text x={centerX - 236} y={380} fontSize="19" fontWeight="700" fill="#16263d">{primarySite?.name || project.name}</text>
        <text x={centerX - 236} y={400} fontSize="11" fill="#6a7d97">Primary site / policy hub</text>
        <text x={centerX - 236} y={418} fontSize="11" fill="#6a7d97">{primarySite?.defaultAddressBlock || "No site summary block assigned"}</text>
        {taskBadge(centerX + 236, 372, hqTaskCount)}

        <DeviceIcon x={centerX - 216} y={448} kind="router" label="Core Routing" sublabel="Summaries / north-south" />
        <DeviceIcon x={centerX - 66} y={452} kind="core-switch" label="Core Switch" sublabel="Inter-VLAN / trunks" />
        <DeviceIcon x={centerX + 96} y={448} kind="server" label="Shared Services" sublabel="Server / management" />
        <DeviceIcon x={centerX - 20} y={564} kind="access-switch" label="Access Layer" sublabel="Users / closets / PoE" />
        <DeviceIcon x={centerX + 178} y={564} kind="access-point" label="Wireless" sublabel="Staff / guest" />

        {pathLine([[centerX - 128, 480], [centerX - 66, 480]], "routed", "svi / routed handoff", synthesized.routingPlan.find((item) => item.siteId === primarySite?.id)?.loopbackCidr || undefined)}
        {pathLine([[centerX + 46, 480], [centerX + 96, 480]], "trunk", "server / service trunk", synthesized.servicePlacements.find((item) => item.siteName === primarySite?.name)?.subnetCidr || undefined)}
        {pathLine([[centerX - 8, 594], [centerX + 178, 594]], "trunk", "edge access / AP uplink", requirements.wirelessRequired ? "staff + guest SSIDs" : undefined)}

        {overlay === "addressing" ? synthesized.addressingPlan.filter((row) => row.siteId === primarySite?.id).slice(0, 6).map((row, index) => chip(centerX - 238, 630 + index * 28, 476, `${row.segmentName} • VLAN ${row.vlanId ?? "—"} • ${row.subnetCidr}`, "blue")) : null}
        {overlay === "security" ? synthesized.securityBoundaries.filter((boundary) => boundary.siteName === primarySite?.name).slice(0, 5).map((boundary, index) => chip(centerX - 238, 630 + index * 28, 476, `${boundary.zoneName} • ${boundary.attachedDevice} • ${boundary.controlPoint}`, "purple")) : null}
        {overlay === "flows" ? flowOverlays.slice(0, 3).map((flow, index) => chip(centerX - 238, 630 + index * 28, 476, `${flow.flowName} • ${flow.sourceZone} → ${flow.destinationZone}`, "orange")) : null}
        {overlay === "none" ? synthesized.sitePlacements.filter((placement) => placement.siteId === primarySite?.id).slice(0, 5).map((placement, index) => chip(centerX - 238, 630 + index * 28, 476, `${deviceLabel(placement.deviceType)} • ${placement.role} • ${placement.connectedZones.join(", ") || "No zone labels yet"}`, "green")) : null}

        {cloudNeeded ? (
          <g>
            <DeviceIcon x={width - 250} y={132} kind="cloud" label="Cloud" sublabel={synthesized.topology.cloudConnected ? "Connected" : "Optional"} />
            <DeviceIcon x={width - 256} y={270} kind="cloud-edge" label="Cloud Edge" sublabel="VNet / VPN / route filters" />
            {pathLine([[centerX + 58, 262], [width - 220, 262]], "vpn", "Hybrid / cloud transport", requirements.cloudConnectivity || undefined)}
          </g>
        ) : null}

        {branchSites.map((site, index) => {
          const left = index % 2 === 0;
          const row = Math.floor(index / 2);
          const x = left ? 72 : width - 392;
          const y = 392 + row * 246;
          const boxWidth = 320;
          const anchorX = left ? x + boxWidth : x;
          const anchorY = y + 92;
          const siteTaskCount = openTaskCount(comments, "SITE", site.id);
          const edgeDevice = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "firewall" || placement.deviceType === "router"))?.deviceType || "router";
          const localOverlay = overlayItems(site, synthesized, overlay);

          return (
            <g key={site.id}>
              {pathLine([[centerX, 490], [anchorX, anchorY]], synthesized.topology.topologyType === "hub-spoke" ? "vpn" : "routed", synthesized.topology.topologyType === "hub-spoke" ? "WAN / hub-spoke" : "Inter-site path", synthesized.wanLinks.find((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id)?.subnetCidr || undefined)}
              <rect x={x} y={y} width={boxWidth} height={188} rx={24} fill="#ffffff" stroke="#dce7f8" strokeWidth="2.3" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 20} y={y + 30} fontSize="17" fontWeight="700" fill="#16263d">{site.name}</text>
              <text x={x + 20} y={y + 49} fontSize="11" fill="#6a7d97">{site.defaultAddressBlock || "No site block assigned"}</text>
              {taskBadge(x + boxWidth - 28, y + 24, siteTaskCount)}

              <DeviceIcon x={x + 16} y={y + 84} kind={edgeDevice} label={deviceLabel(edgeDevice)} sublabel="Site edge / VPN" />
              <DeviceIcon x={x + 124} y={y + 88} kind="access-switch" label="Access" sublabel="Users / trunks" />
              <DeviceIcon x={x + 246} y={y + 90} kind="access-point" label="AP" sublabel="Wireless" />
              {pathLine([[x + 118, y + 113], [x + 124, y + 113]], "routed", "inside", synthesized.addressingPlan.find((row) => row.siteId === site.id)?.gatewayIp || undefined)}
              {pathLine([[x + 236, y + 113], [x + 246, y + 113]], "trunk", "wireless / access", localOverlay[0] || undefined)}

              {localOverlay.slice(0, 2).map((item, itemIndex) => chip(x + 18, y + 154 + itemIndex * 26, boxWidth - 36, item, overlayTone(overlay)))}
            </g>
          );
        })}

        {flowOverlays.map((flow, index) => {
          const baseY = 774 + index * 84;
          return (
            <g key={flow.id}>
              {pathLine([[86, baseY], [width - 86, baseY]], "flow", `${flow.flowName} • ${flow.sourceZone} → ${flow.destinationZone}`)}
              <text x={92} y={baseY + 22} fontSize="11" fill="#6a7d97">Path: {flow.path.join(" → ")}</text>
              <text x={92} y={baseY + 40} fontSize="11" fill="#6a7d97">Control points: {flow.controlPoints.join(", ")}</text>
              <text x={92} y={baseY + 58} fontSize="11" fill="#6a7d97">NAT / policy: {flow.natBehavior} • {flow.enforcementPolicy}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ArchitectureSignals({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
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

function Legend() {
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

function FlowSummaryPanel({ flows }: { flows: TrafficFlowPath[] }) {
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

export function ProjectDiagram({ project, comments = [], onSelectTarget }: ProjectDiagramProps) {
  const sites = (project.sites ?? []) as SiteWithVlans[];
  const svgId = `diagram-${project.id}`;
  const [mode, setMode] = useState<DiagramMode>("logical");
  const [overlay, setOverlay] = useState<OverlayMode>("none");
  const baseFilename = useMemo(() => `${project.name.replace(/\s+/g, "-").toLowerCase()}-${mode}-${overlay}-diagram`, [mode, overlay, project.name]);
  const requirements = parseRequirementsProfile(project.requirementsJson);
  const allVlans = sites.flatMap((site) => site.vlans ?? []);
  const synthesized = useMemo(() => synthesizeLogicalDesign(project, sites, allVlans, requirements), [project, sites, allVlans, requirements]);

  if (sites.length === 0) {
    return <div className="panel"><div className="diagram-toolbar"><div><h2 style={{ marginBottom: 6 }}>Diagram</h2><p className="muted" style={{ margin: 0 }}>Add sites and VLANs to generate a topology diagram.</p></div></div></div>;
  }

  return (
    <div className="panel">
      <div className="diagram-toolbar" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Generated Topology Diagram</h2>
          <p className="muted" style={{ margin: 0 }}>v98 adds stronger topology-specific layout, labeled links, clearer DMZ host placement, and tighter cross-checking between flows, boundaries, and site roles.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="diagram-toggle">
            <button type="button" className={mode === "logical" ? "active" : ""} onClick={() => setMode("logical")}>Logical Topology</button>
            <button type="button" className={mode === "physical" ? "active" : ""} onClick={() => setMode("physical")}>Physical / Topology</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={overlay === "none" ? "active" : ""} onClick={() => setOverlay("none")}>Placement</button>
            <button type="button" className={overlay === "addressing" ? "active" : ""} onClick={() => setOverlay("addressing")}>Addressing</button>
            <button type="button" className={overlay === "security" ? "active" : ""} onClick={() => setOverlay("security")}>Security</button>
            <button type="button" className={overlay === "flows" ? "active" : ""} onClick={() => setOverlay("flows")}>Flows</button>
          </div>
          <button type="button" onClick={() => exportSvg(svgId, `${baseFilename}.svg`)}>Export SVG</button>
          <button type="button" onClick={() => { void exportPng(svgId, `${baseFilename}.png`); }}>Export PNG</button>
        </div>
      </div>
      <ArchitectureSignals synthesized={synthesized} />
      <Legend />
      <div className="diagram-note-grid" style={{ marginTop: 10 }}>
        <div className="diagram-note-card">
          <strong style={{ display: "block", marginBottom: 6 }}>Report cross-check</strong>
          <p style={{ margin: 0, color: "#61758f" }}>Use Placement with report section 2, Addressing with section 3, Security with section 4, and Flows with section 5 so the visual review matches the written package.</p>
        </div>
        <div className="diagram-note-card">
          <strong style={{ display: "block", marginBottom: 6 }}>Validation cross-check</strong>
          <p style={{ margin: 0, color: "#61758f" }}>If labels, paths, or DMZ placement look wrong here, the same mismatch should be reviewed in validation and then corrected in addressing, security, or routing workspaces.</p>
        </div>
      </div>
      {overlay === "flows" ? <FlowSummaryPanel flows={synthesized.trafficFlows} /> : null}
      {mode === "logical"
        ? <LogicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} overlay={overlay} onSelectTarget={onSelectTarget} />
        : <PhysicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} overlay={overlay} onSelectTarget={onSelectTarget} />}
    </div>
  );
}
