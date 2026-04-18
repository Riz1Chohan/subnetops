import { useMemo, useState } from "react";
import { synthesizeLogicalDesign, type SitePlacementDevice, type SynthesizedLogicalDesign, type TrafficFlowPath } from "../../../lib/designSynthesis";
import { parseRequirementsProfile } from "../../../lib/requirementsProfile";
import type { ProjectComment, ProjectDetail, Site, ValidationResult, Vlan } from "../../../lib/types";

interface SiteWithVlans extends Site {
  vlans?: Vlan[];
}

export type DiagramMode = "logical" | "physical";
export type DiagramDensity = "guided" | "expanded";
export type DiagramLabelMode = "essential" | "detailed";
export type LinkAnnotationMode = "minimal" | "full";
export type OverlayMode = "none" | "addressing" | "security" | "flows" | "services" | "redundancy";
export type ActiveOverlayMode = Exclude<OverlayMode, "none">;
type ChipTone = "blue" | "purple" | "green" | "orange";
type DiagramReviewPresetKey = "architecture" | "site-lld" | "transport" | "boundaries" | "services" | "critical-flows";
export type DiagramScope = "global" | "site" | "wan-cloud" | "boundaries";
export type DeviceFocus = "all" | "edge" | "switching" | "wireless" | "services";
export type LinkFocus = "all" | "transport" | "access" | "security" | "flows";
export type LabelFocus = "all" | "topology" | "addressing" | "zones" | "transport" | "flows";

interface ProjectDiagramProps {
  project: ProjectDetail;
  comments?: ProjectComment[];
  validations?: ValidationResult[];
  onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void;
  compact?: boolean;
  minimalWorkspace?: boolean;
  controls?: Partial<{
    mode: DiagramMode;
    overlay: OverlayMode;
    activeOverlays: ActiveOverlayMode[];
    scope: DiagramScope;
    workspaceDensity: DiagramDensity;
    labelMode: DiagramLabelMode;
    linkAnnotationMode: LinkAnnotationMode;
    labelFocus: LabelFocus;
    deviceFocus: DeviceFocus;
    linkFocus: LinkFocus;
    focusedSiteId: string;
    bareCanvas: boolean;
  }>;
}
type SitePoint = { x: number; y: number };

type DeviceKind = SitePlacementDevice["deviceType"] | "internet" | "cloud";

function siteIdsWithBoundaries(synthesized: SynthesizedLogicalDesign) {
  return new Set(
    synthesized.securityBoundaries
      .map((boundary) => synthesized.siteHierarchy.find((site) => site.name === boundary.siteName)?.id)
      .filter((siteId): siteId is string => Boolean(siteId))
  );
}

function siteIdsWithWanLinks(synthesized: SynthesizedLogicalDesign) {
  return new Set(
    synthesized.wanLinks.flatMap((link) => [link.endpointASiteId, link.endpointBSiteId]).filter((siteId): siteId is string => Boolean(siteId))
  );
}

function siteIdsWithCloudOrInternetEdges(synthesized: SynthesizedLogicalDesign) {
  return new Set(
    synthesized.sitePlacements
      .filter((placement) => placement.deviceType === "cloud-edge" || placement.role.toLowerCase().includes("internet") || placement.role.toLowerCase().includes("wan"))
      .map((placement) => placement.siteId)
  );
}

function flowsForDiagramScope(flows: TrafficFlowPath[], scope: DiagramScope, focusedSiteName?: string) {
  if (scope === "site" && focusedSiteName) {
    return flows.filter((flow) => flow.sourceSite === focusedSiteName || flow.destinationSite === focusedSiteName || flow.path.some((step) => step.includes(focusedSiteName)));
  }
  if (scope === "wan-cloud") {
    return flows.filter((flow) => flow.flowCategory === "site-centralized-service" || flow.flowCategory === "site-cloud-service" || flow.path.length > 2 || flow.path.some((step) => /cloud|internet|vpn|wan/i.test(step)));
  }
  if (scope === "boundaries") {
    return flows.filter((flow) => flow.sourceZone !== flow.destinationZone || flow.controlPoints.length > 0 || /dmz|management|guest/i.test(`${flow.sourceZone} ${flow.destinationZone}`));
  }
  return flows;
}

function sitesForDiagramScope(sites: SiteWithVlans[], synthesized: SynthesizedLogicalDesign, scope: DiagramScope, focusedSiteId?: string) {
  if (scope === "site" && focusedSiteId) {
    const focused = sites.find((site) => site.id === focusedSiteId);
    return focused ? [focused] : sites.slice(0, 1);
  }
  if (scope === "wan-cloud") {
    const wanIds = siteIdsWithWanLinks(synthesized);
    const edgeIds = siteIdsWithCloudOrInternetEdges(synthesized);
    const primary = synthesized.siteHierarchy.find((site) => site.name === synthesized.topology.primarySiteName)?.id;
    const relevantIds = new Set<string>([...(primary ? [primary] : []), ...wanIds, ...edgeIds]);
    const scoped = sites.filter((site) => relevantIds.has(site.id));
    return scoped.length > 0 ? scoped : sites;
  }
  if (scope === "boundaries") {
    const boundaryIds = siteIdsWithBoundaries(synthesized);
    const scoped = sites.filter((site) => boundaryIds.has(site.id) || synthesized.servicePlacements.some((placement) => placement.siteId === site.id && placement.placementType === "dmz"));
    return scoped.length > 0 ? scoped : sites;
  }
  return sites;
}

function diagramScopeMeta(scope: DiagramScope, synthesized: SynthesizedLogicalDesign, focusedSite?: SiteWithVlans) {
  if (scope === "site") {
    return {
      title: focusedSite ? `Detailed site topology — ${focusedSite.name}` : "Detailed site topology",
      detail: focusedSite
        ? `This scope keeps the diagram on one site so the edge, switching, boundary, and local service relationships can be reviewed without the rest of the multi-site estate competing for space.`
        : "This scope narrows the diagram to one site so local topology review becomes easier.",
    };
  }
  if (scope === "wan-cloud") {
    return {
      title: "WAN / cloud view",
      detail: `This scope keeps the review on inter-site, internet, and cloud-connected paths so the WAN edge, breakout posture, and centralized-service movement stay visible.`
    };
  }
  if (scope === "boundaries") {
    return {
      title: "Security boundary view",
      detail: `This scope emphasizes the sites carrying concrete boundary objects so trust boundaries, control points, DMZ placement, and cross-zone flows are easier to inspect.`
    };
  }
  return {
    title: "Global multi-site topology",
    detail: `This scope keeps the full multi-site design visible so the overall architecture, topology type, site roles, and major placement decisions can be reviewed together.`
  };
}

function getSvgElement(svgId: string) {
  return document.getElementById(svgId) as unknown as SVGSVGElement | null;
}

function siteTierLabel(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return siteName === synthesized.topology.primarySiteName
    ? "Primary site / shared-service hub"
    : synthesized.topology.topologyType === "collapsed-core"
      ? "Campus / attached access domain"
      : "Attached site / routed edge domain";
}

function siteTierTone(siteName: string, synthesized: SynthesizedLogicalDesign): ChipTone {
  return siteName === synthesized.topology.primarySiteName ? "blue" : synthesized.topology.topologyType === "collapsed-core" ? "purple" : "green";
}

function DiagramCanvasDefs() {
  return (
    <defs>
      <pattern id="diagram-grid-fine" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#dfe7f3" strokeWidth="1" opacity="0.55" />
      </pattern>
      <pattern id="diagram-grid-major" width="96" height="96" patternUnits="userSpaceOnUse">
        <rect width="96" height="96" fill="url(#diagram-grid-fine)" />
        <path d="M 96 0 L 0 0 0 96" fill="none" stroke="#cfd9e8" strokeWidth="1.2" opacity="0.78" />
      </pattern>
      <linearGradient id="diagram-canvas-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f8fbff" />
        <stop offset="100%" stopColor="#eef4fb" />
      </linearGradient>
      <filter id="diagram-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#8aa0c7" floodOpacity="0.14" />
      </filter>
      <marker id="diagram-arrow-flow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff7a59" />
      </marker>
      <marker id="diagram-arrow-internet" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#7ca5eb" />
      </marker>
      <marker id="diagram-arrow-vpn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#1d7f4c" />
      </marker>
      <marker id="diagram-arrow-routed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#85a7e6" />
      </marker>
    </defs>
  );
}

function DiagramCanvasBackdrop({ width, height, title, subtitle, summary, chipLabel, chipTone, minimal = false }: { width: number; height: number; title: string; subtitle: string; summary: string; chipLabel: string; chipTone: ChipTone; minimal?: boolean; }) {
  return (
    <>
      <DiagramCanvasDefs />
      <rect x={0} y={0} width={width} height={height} rx={30} fill="url(#diagram-canvas-bg)" />
      <rect x={0} y={0} width={width} height={height} rx={30} fill="url(#diagram-grid-major)" opacity="0.72" />
      {minimal ? null : (<>
        <rect x={34} y={30} width={width - 68} height={96} rx={24} fill="rgba(255,255,255,0.84)" stroke="#d8e3f2" filter="url(#diagram-soft-shadow)" />
        <text x={58} y={64} fontSize="20" fontWeight="700" fill="#142742">{title}</text>
        <text x={58} y={86} fontSize="12" fill="#5f748f">{subtitle}</text>
        <text x={58} y={106} fontSize="11" fill="#6d819a">{summary}</text>
        {chip(width - 282, 52, 206, chipLabel, chipTone)}
      </>)}
    </>
  );
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

function deviceFocusMatchesKind(focus: DeviceFocus, kind: DeviceKind) {
  if (focus === "all") return true;
  if (focus === "edge") return kind === "firewall" || kind === "router" || kind === "cloud-edge" || kind === "internet" || kind === "cloud";
  if (focus === "switching") return kind === "core-switch" || kind === "distribution-switch" || kind === "access-switch";
  if (focus === "wireless") return kind === "wireless-controller" || kind === "access-point";
  if (focus === "services") return kind === "server";
  return true;
}

function linkFocusMatchesType(focus: LinkFocus, type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow") {
  if (focus === "all") return true;
  if (focus === "transport") return type === "routed" || type === "vpn" || type === "internet" || type === "ha";
  if (focus === "access") return type === "trunk";
  if (focus === "security") return type === "internet" || type === "vpn" || type === "ha" || type === "flow";
  if (focus === "flows") return type === "flow";
  return true;
}

function deviceFocusTitle(focus: DeviceFocus) {
  if (focus === "edge") return "Edge roles";
  if (focus === "switching") return "Switching roles";
  if (focus === "wireless") return "Wireless roles";
  if (focus === "services") return "Service roles";
  return "All device roles";
}

function linkFocusTitle(focus: LinkFocus) {
  if (focus === "transport") return "Transport semantics";
  if (focus === "access") return "Access / trunk semantics";
  if (focus === "security") return "Security / control semantics";
  if (focus === "flows") return "Critical flow semantics";
  return "All link semantics";
}

function labelFocusMatchesCategory(focus: LabelFocus, category: Exclude<LabelFocus, "all">) {
  return focus === "all" || focus === category;
}

function labelFocusTitle(focus: LabelFocus) {
  if (focus === "topology") return "Topology labels";
  if (focus === "addressing") return "Addressing labels";
  if (focus === "zones") return "Zone / boundary labels";
  if (focus === "transport") return "Transport labels";
  if (focus === "flows") return "Flow labels";
  return "All label families";
}

function inferSecondaryLabelCategory(type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow", secondaryLabel?: string): Exclude<LabelFocus, "all"> {
  if (type === "flow") return "flows";
  if (!secondaryLabel) return "transport";
  const normalized = secondaryLabel.toLowerCase();
  if (/\/\d+/.test(secondaryLabel) || /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(secondaryLabel) || /gateway|subnet|vlan|loopback|summary/i.test(secondaryLabel)) return "addressing";
  if (/dmz|management|guest|inside|outside|zone|trust|policy/i.test(normalized)) return "zones";
  if (/flow|path|nat|vpn|wan|internet|transport/i.test(normalized)) return "transport";
  return "topology";
}

function overlayLabelCategory(mode: OverlayMode): Exclude<LabelFocus, "all"> {
  if (mode === "addressing") return "addressing";
  if (mode === "security") return "zones";
  if (mode === "flows") return "flows";
  if (mode === "redundancy") return "transport";
  return "topology";
}

function labelFocusOpacity(focus: LabelFocus, category: Exclude<LabelFocus, "all">) {
  return labelFocusMatchesCategory(focus, category) ? 1 : 0.22;
}

function DeviceIcon({ x, y, kind, label, sublabel, showSublabel = true, emphasized = true }: { x: number; y: number; kind: DeviceKind; label: string; sublabel?: string; showSublabel?: boolean; emphasized?: boolean }) {
  const tone = roleTone(kind);
  const bodyX = x;
  const bodyY = y;
  const renderedSublabel = showSublabel ? sublabel : undefined;
  const titleFill = tone.text;
  const sublabelFill = "#657892";
  const opacity = emphasized ? 1 : 0.22;

  const renderLabels = (centerX: number, titleY: number, subtitleY: number) => (
    <>
      {label ? <text x={centerX} y={titleY} textAnchor="middle" fontSize="12" fontWeight="700" fill={titleFill}>{label}</text> : null}
      {renderedSublabel ? <text x={centerX} y={subtitleY} textAnchor="middle" fontSize="10.5" fill={sublabelFill}>{renderedSublabel}</text> : null}
    </>
  );

  if (kind === "internet") {
    return (
      <g opacity={opacity}>
        <ellipse cx={bodyX + 38} cy={bodyY + 28} rx={22} ry={14} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        <ellipse cx={bodyX + 64} cy={bodyY + 18} rx={28} ry={18} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        <ellipse cx={bodyX + 92} cy={bodyY + 29} rx={22} ry={14} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        <rect x={bodyX + 22} y={bodyY + 26} width="78" height="20" rx="10" fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        <circle cx={bodyX + 61} cy={bodyY + 28} r="14" fill="#ffffff" stroke={tone.stroke} strokeOpacity="0.32" />
        <path d={`M ${bodyX + 49} ${bodyY + 28} H ${bodyX + 73}`} fill="none" stroke={tone.stroke} strokeWidth="1.5" opacity="0.75" />
        <path d={`M ${bodyX + 61} ${bodyY + 14} Q ${bodyX + 68} ${bodyY + 28} ${bodyX + 61} ${bodyY + 42}`} fill="none" stroke={tone.stroke} strokeWidth="1.5" opacity="0.75" />
        <path d={`M ${bodyX + 61} ${bodyY + 14} Q ${bodyX + 53} ${bodyY + 28} ${bodyX + 61} ${bodyY + 42}`} fill="none" stroke={tone.stroke} strokeWidth="1.5" opacity="0.75" />
        <path d={`M ${bodyX + 48} ${bodyY + 22} Q ${bodyX + 61} ${bodyY + 18} ${bodyX + 74} ${bodyY + 22}`} fill="none" stroke={tone.stroke} strokeWidth="1.2" opacity="0.6" />
        <path d={`M ${bodyX + 48} ${bodyY + 34} Q ${bodyX + 61} ${bodyY + 38} ${bodyX + 74} ${bodyY + 34}`} fill="none" stroke={tone.stroke} strokeWidth="1.2" opacity="0.6" />
        {renderLabels(bodyX + 61, bodyY + 74, bodyY + 89)}
      </g>
    );
  }

  if (kind === "cloud" || kind === "cloud-edge") {
    return (
      <g opacity={opacity}>
        <ellipse cx={bodyX + 38} cy={bodyY + 28} rx={22} ry={14} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        <ellipse cx={bodyX + 64} cy={bodyY + 18} rx={28} ry={18} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        <ellipse cx={bodyX + 92} cy={bodyY + 29} rx={22} ry={14} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        <rect x={bodyX + 22} y={bodyY + 26} width="78" height="20" rx="10" fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        {kind === "cloud-edge" ? (
          <g>
            <rect x={bodyX + 46} y={bodyY + 18} width="30" height="19" rx="5" fill="#ffffff" stroke={tone.stroke} strokeWidth="1.6" />
            <path d={`M ${bodyX + 52} ${bodyY + 28} H ${bodyX + 70}`} fill="none" stroke={tone.stroke} strokeWidth="1.8" />
            <path d={`M ${bodyX + 63} ${bodyY + 22} V ${bodyY + 34}`} fill="none" stroke={tone.stroke} strokeWidth="1.8" />
            <path d={`M ${bodyX + 49} ${bodyY + 41} Q ${bodyX + 61} ${bodyY + 48} ${bodyX + 73} ${bodyY + 41}`} fill="none" stroke={tone.stroke} strokeWidth="1.6" opacity="0.7" />
          </g>
        ) : (
          <g>
            <circle cx={bodyX + 61} cy={bodyY + 28} r="13" fill="#ffffff" stroke={tone.stroke} strokeOpacity="0.28" />
            <path d={`M ${bodyX + 52} ${bodyY + 31} L ${bodyX + 61} ${bodyY + 20} L ${bodyX + 70} ${bodyY + 31}`} fill="none" stroke={tone.stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M ${bodyX + 52} ${bodyY + 27} H ${bodyX + 70}`} fill="none" stroke={tone.stroke} strokeWidth="1.6" strokeLinecap="round" />
          </g>
        )}
        {renderLabels(bodyX + 61, bodyY + 74, bodyY + 89)}
      </g>
    );
  }

  if (kind === "router") {
    return (
      <g opacity={opacity}>
        <ellipse cx={bodyX + 54} cy={bodyY + 18} rx={38} ry={12} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.4" />
        <path d={`M ${bodyX + 16} ${bodyY + 18} L ${bodyX + 16} ${bodyY + 42} Q ${bodyX + 54} ${bodyY + 58} ${bodyX + 92} ${bodyY + 42} L ${bodyX + 92} ${bodyY + 18}`} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.4" />
        <ellipse cx={bodyX + 54} cy={bodyY + 42} rx={38} ry={12} fill="#f9fcff" stroke={tone.stroke} strokeWidth="2.2" />
        <circle cx={bodyX + 54} cy={bodyY + 30} r="12.5" fill="#ffffff" stroke={tone.stroke} strokeWidth="1.8" opacity="0.95" />
        <path d={`M ${bodyX + 44} ${bodyY + 33} L ${bodyX + 54} ${bodyY + 22} L ${bodyX + 54} ${bodyY + 27} L ${bodyX + 64} ${bodyY + 17}`} fill="none" stroke={tone.stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M ${bodyX + 64} ${bodyY + 27} L ${bodyX + 54} ${bodyY + 38} L ${bodyX + 54} ${bodyY + 33} L ${bodyX + 44} ${bodyY + 43}`} fill="none" stroke={tone.stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={bodyX + 26} cy={bodyY + 42} r={2.1} fill={tone.stroke} opacity="0.78" />
        <circle cx={bodyX + 82} cy={bodyY + 42} r={2.1} fill={tone.stroke} opacity="0.78" />
        <line x1={bodyX + 24} y1={bodyY + 51} x2={bodyX + 84} y2={bodyY + 51} stroke={tone.stroke} strokeOpacity="0.28" strokeWidth="1.5" />
        {renderLabels(bodyX + 54, bodyY + 72, bodyY + 87)}
      </g>
    );
  }

  if (kind === "firewall") {
    return (
      <g opacity={opacity}>
        <path d={`M ${bodyX + 14} ${bodyY + 8} L ${bodyX + 108} ${bodyY + 8} L ${bodyX + 118} ${bodyY + 18} L ${bodyX + 118} ${bodyY + 56} L ${bodyX + 4} ${bodyY + 56} L ${bodyX + 4} ${bodyY + 18} Z`} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.4" />
        {Array.from({ length: 4 }).map((_, rowIndex) => (
          Array.from({ length: 6 }).map((__, colIndex) => (
            <rect key={`${rowIndex}-${colIndex}`} x={bodyX + 16 + colIndex * 14} y={bodyY + 16 + rowIndex * 8} width="11" height="6" rx="1.7" fill={colIndex % 2 === rowIndex % 2 ? "#ffffff" : tone.stroke} opacity={colIndex % 2 === rowIndex % 2 ? 0.8 : 0.18} stroke={tone.stroke} strokeOpacity="0.18" />
          ))
        ))}
        <path d={`M ${bodyX + 85} ${bodyY + 19} Q ${bodyX + 96} ${bodyY + 24} ${bodyX + 96} ${bodyY + 36} Q ${bodyX + 96} ${bodyY + 46} ${bodyX + 85} ${bodyY + 51} Q ${bodyX + 74} ${bodyY + 46} ${bodyX + 74} ${bodyY + 36} Q ${bodyX + 74} ${bodyY + 24} ${bodyX + 85} ${bodyY + 19} Z`} fill="#ffffff" stroke={tone.stroke} strokeWidth="1.7" />
        <path d={`M ${bodyX + 85} ${bodyY + 24} L ${bodyX + 91} ${bodyY + 27} L ${bodyX + 91} ${bodyY + 33} Q ${bodyX + 91} ${bodyY + 37} ${bodyX + 85} ${bodyY + 42} Q ${bodyX + 79} ${bodyY + 37} ${bodyX + 79} ${bodyY + 33} L ${bodyX + 79} ${bodyY + 27} Z`} fill={tone.stroke} opacity="0.22" />
        <circle cx={bodyX + 102} cy={bodyY + 15} r="3.2" fill="#ff8b6b" opacity="0.88" />
        <circle cx={bodyX + 92} cy={bodyY + 15} r="3.2" fill="#ffd166" opacity="0.78" />
        {renderLabels(bodyX + 61, bodyY + 76, bodyY + 91)}
      </g>
    );
  }

  if (kind === "wireless-controller") {
    return (
      <g opacity={opacity}>
        <rect x={bodyX + 2} y={bodyY + 12} width="82" height="28" rx="8" fill={tone.fill} stroke={tone.stroke} strokeWidth="2.1" />
        <rect x={bodyX + 10} y={bodyY + 18} width="18" height="6" rx="3" fill={tone.stroke} opacity="0.26" />
        {Array.from({ length: 5 }).map((_, index) => (
          <rect key={index} x={bodyX + 34 + index * 8.5} y={bodyY + 19} width="6" height="6" rx="1.8" fill={tone.stroke} opacity={0.75 - index * 0.08} />
        ))}
        <rect x={bodyX + 60} y={bodyY + 28} width="14" height="4" rx="2" fill={tone.stroke} opacity="0.22" />
        <path d={`M ${bodyX + 94} ${bodyY + 18} Q ${bodyX + 108} ${bodyY + 4} ${bodyX + 122} ${bodyY + 18}`} fill="none" stroke={tone.stroke} strokeWidth="2" />
        <path d={`M ${bodyX + 99} ${bodyY + 24} Q ${bodyX + 108} ${bodyY + 14} ${bodyX + 117} ${bodyY + 24}`} fill="none" stroke={tone.stroke} strokeWidth="1.9" opacity="0.86" />
        <path d={`M ${bodyX + 103} ${bodyY + 30} Q ${bodyX + 108} ${bodyY + 24} ${bodyX + 113} ${bodyY + 30}`} fill="none" stroke={tone.stroke} strokeWidth="1.7" opacity="0.78" />
        <circle cx={bodyX + 108} cy={bodyY + 34} r="3.2" fill={tone.text} />
        {renderLabels(bodyX + 61, bodyY + 60, bodyY + 75)}
      </g>
    );
  }

  if (kind === "access-point") {
    return (
      <g opacity={opacity}>
        <ellipse cx={bodyX + 46} cy={bodyY + 26} rx="28" ry="13" fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        <ellipse cx={bodyX + 46} cy={bodyY + 26} rx="16" ry="7" fill="#ffffff" stroke={tone.stroke} strokeOpacity="0.24" />
        <circle cx={bodyX + 46} cy={bodyY + 26} r={3.5} fill={tone.text} />
        <path d={`M ${bodyX + 19} ${bodyY + 17} Q ${bodyX + 46} ${bodyY - 3} ${bodyX + 73} ${bodyY + 17}`} fill="none" stroke={tone.stroke} strokeWidth="2" />
        <path d={`M ${bodyX + 26} ${bodyY + 22} Q ${bodyX + 46} ${bodyY + 7} ${bodyX + 66} ${bodyY + 22}`} fill="none" stroke={tone.stroke} strokeWidth="1.9" opacity="0.9" />
        <path d={`M ${bodyX + 33} ${bodyY + 28} Q ${bodyX + 46} ${bodyY + 18} ${bodyX + 59} ${bodyY + 28}`} fill="none" stroke={tone.stroke} strokeWidth="1.7" opacity="0.8" />
        <rect x={bodyX + 34} y={bodyY + 43} width="24" height="4" rx="2" fill={tone.stroke} opacity="0.28" />
        {renderLabels(bodyX + 46, bodyY + 62, bodyY + 77)}
      </g>
    );
  }

  if (kind === "server") {
    return (
      <g opacity={opacity}>
        {Array.from({ length: 3 }).map((_, index) => (
          <g key={index} transform={`translate(0, ${index * 14})`}>
            <rect x={bodyX + 8} y={bodyY + 2} width="72" height="18" rx="5" fill={tone.fill} stroke={tone.stroke} strokeWidth="2" />
            <rect x={bodyX + 16} y={bodyY + 7} width="28" height="4" rx="2" fill={tone.stroke} opacity="0.24" />
            <rect x={bodyX + 16} y={bodyY + 13} width="20" height="2.8" rx="1.4" fill={tone.stroke} opacity="0.18" />
            <circle cx={bodyX + 61} cy={bodyY + 11} r="2.1" fill="#8fdab3" />
            <circle cx={bodyX + 68} cy={bodyY + 11} r="2.1" fill="#ffd166" />
            <circle cx={bodyX + 75} cy={bodyY + 11} r="2.1" fill="#ff8b6b" opacity="0.78" />
          </g>
        ))}
        <rect x={bodyX + 30} y={bodyY + 47} width="26" height="4" rx="2" fill={tone.stroke} opacity="0.2" />
        {renderLabels(bodyX + 44, bodyY + 74, bodyY + 89)}
      </g>
    );
  }

  if (kind === "core-switch" || kind === "distribution-switch" || kind === "access-switch") {
    const stackCount = kind === "core-switch" ? 2 : 1;
    const baseY = kind === "core-switch" ? bodyY + 8 : bodyY + 14;
    const width = kind === "access-switch" ? 112 : 122;
    const portCount = kind === "access-switch" ? 12 : 14;
    return (
      <g opacity={opacity}>
        {Array.from({ length: stackCount }).map((_, stackIndex) => (
          <g key={stackIndex} transform={`translate(${stackIndex * 7}, ${stackIndex * -6})`}>
            <rect x={bodyX} y={baseY} width={width} height="30" rx="6" fill={tone.fill} stroke={tone.stroke} strokeWidth="2.1" />
            <rect x={bodyX + 8} y={baseY + 6} width="16" height="4" rx="2" fill={tone.stroke} opacity="0.28" />
            <rect x={bodyX + 8} y={baseY + 18} width="10" height="4" rx="2" fill={tone.stroke} opacity="0.22" />
            {Array.from({ length: portCount }).map((_, index) => (
              <rect key={index} x={bodyX + 29 + index * 6.2} y={baseY + 7} width="4.7" height="4.7" rx="1.3" fill="#ffffff" stroke={tone.stroke} strokeWidth="0.7" opacity={0.95 - index * 0.03} />
            ))}
            {Array.from({ length: portCount }).map((_, index) => (
              <rect key={`lower-${index}`} x={bodyX + 29 + index * 6.2} y={baseY + 16} width="4.7" height="4.7" rx="1.3" fill={tone.stroke} opacity={0.42 - index * 0.012} />
            ))}
            <rect x={bodyX + width - 18} y={baseY + 5} width="9" height="16" rx="3" fill={tone.stroke} opacity="0.16" />
          </g>
        ))}
        {renderLabels(bodyX + 61, bodyY + 62, bodyY + 77)}
      </g>
    );
  }

  return (
    <g opacity={opacity}>
      <rect x={bodyX} y={bodyY} width="112" height="42" rx="10" fill={tone.fill} stroke={tone.stroke} strokeWidth="2" />
      {renderLabels(bodyX + 56, bodyY + 24, bodyY + 38)}
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

function pathLine(
  points: Array<[number, number]>,
  type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow",
  label?: string,
  secondaryLabel?: string,
  linkAnnotationMode: LinkAnnotationMode = "full",
  emphasized: boolean = true,
  labelFocus: LabelFocus = "all"
) {
  const style = linkStyle(type);
  const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const labelPoint = points[Math.floor(points.length / 2)];
  const primaryCategory: Exclude<LabelFocus, "all"> = type === "flow" ? "flows" : "transport";
  const secondaryCategory = inferSecondaryLabelCategory(type, secondaryLabel);
  const rawPrimaryLabel = linkAnnotationMode === "full" ? label : (type === "flow" || type === "internet" || type === "vpn" ? label : undefined);
  const rawSecondaryLabel = linkAnnotationMode === "full" ? secondaryLabel : undefined;
  const visibleLabel = rawPrimaryLabel && labelFocusMatchesCategory(labelFocus, primaryCategory) ? rawPrimaryLabel : undefined;
  const visibleSecondaryLabel = rawSecondaryLabel && labelFocusMatchesCategory(labelFocus, secondaryCategory) ? rawSecondaryLabel : undefined;
  const labelWidth = Math.max(116, ((visibleLabel?.length ?? 0) * 6.3) + 24);
  const secondaryWidth = Math.max(104, ((visibleSecondaryLabel?.length ?? 0) * 6.1) + 24);
  const markerEnd = type === "flow"
    ? "url(#diagram-arrow-flow)"
    : type === "internet"
      ? "url(#diagram-arrow-internet)"
      : type === "vpn"
        ? "url(#diagram-arrow-vpn)"
        : type === "routed"
          ? "url(#diagram-arrow-routed)"
          : undefined;
  return (
    <g opacity={emphasized ? 1 : 0.2}>
      <path d={path} fill="none" stroke="#ffffff" strokeWidth={style.width + 4} strokeLinecap="round" strokeLinejoin="round" opacity={0.78} />
      <path d={path} fill="none" stroke={style.stroke} strokeWidth={style.width} strokeDasharray={style.dash} strokeLinecap="round" strokeLinejoin="round" markerEnd={markerEnd} />
      {(visibleLabel || visibleSecondaryLabel) && labelPoint ? (
        <g>
          {visibleLabel ? (
            <>
              <rect x={labelPoint[0] - labelWidth / 2} y={labelPoint[1] - (visibleSecondaryLabel ? 28 : 18)} width={labelWidth} height={18} rx="9" fill="#ffffff" stroke="#dbe6f7" />
              <text x={labelPoint[0]} y={labelPoint[1] - (visibleSecondaryLabel ? 15 : 5)} textAnchor="middle" fontSize="10.5" fill="#526984">{visibleLabel}</text>
            </>
          ) : null}
          {visibleSecondaryLabel ? (
            <g>
              <rect x={labelPoint[0] - secondaryWidth / 2} y={labelPoint[1] - 6} width={secondaryWidth} height={16} rx="8" fill="#f8fbff" stroke="#dbe6f7" />
              <text x={labelPoint[0]} y={labelPoint[1] + 5} textAnchor="middle" fontSize="9.6" fill="#6a7d97">{visibleSecondaryLabel}</text>
            </g>
          ) : null}
        </g>
      ) : null}
    </g>
  );
}

function dedupeDiagramPoints(points: Array<[number, number]>) {
  return points.filter((point, index) => index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1]);
}

function orthogonalVH(start: [number, number], end: [number, number], midY?: number): Array<[number, number]> {
  const turnY = midY ?? (start[1] + end[1]) / 2;
  return dedupeDiagramPoints([start, [start[0], turnY], [end[0], turnY], end]);
}

function orthogonalHV(start: [number, number], end: [number, number], midX?: number): Array<[number, number]> {
  const turnX = midX ?? (start[0] + end[0]) / 2;
  return dedupeDiagramPoints([start, [turnX, start[1]], [turnX, end[1]], end]);
}

function chipTonePalette(tone: ChipTone) {
  return tone === "purple"
    ? { fill: "#f7f1ff", stroke: "#c9abff", text: "#5a34a3" }
    : tone === "green"
      ? { fill: "#f2fff8", stroke: "#96dfb7", text: "#1d7f4c" }
      : tone === "orange"
        ? { fill: "#fff7ef", stroke: "#ffc98e", text: "#8f4b00" }
        : { fill: "#eef5ff", stroke: "#b8cff5", text: "#20427f" };
}

function logicalNode(x: number, y: number, width: number, label: string, subtitle?: string, tone: ChipTone = "blue") {
  const palette = chipTonePalette(tone);
  return (
    <g>
      <rect x={x} y={y} width={width} height={44} rx={14} fill={palette.fill} stroke={palette.stroke} />
      <text x={x + width / 2} y={y + 18} textAnchor="middle" fontSize="11" fontWeight="700" fill={palette.text}>{label}</text>
      {subtitle ? <text x={x + width / 2} y={y + 32} textAnchor="middle" fontSize="9.6" fill="#5f748f">{subtitle}</text> : null}
    </g>
  );
}


function primaryDmzService(synthesized: SynthesizedLogicalDesign, siteName?: string) {
  return synthesized.servicePlacements.find((service) => service.serviceType === "dmz-service" && (!siteName || service.siteName === siteName));
}

function sitePositionMap(sites: SiteWithVlans[], synthesized: SynthesizedLogicalDesign, cardWidth: number, startX: number, gap: number): Record<string, SitePoint> {
  const positions: Record<string, SitePoint> = {};
  if (sites.length === 1) {
    positions[sites[0].id] = { x: 560, y: 272 };
    return positions;
  }

  if (synthesized.topology.topologyType === "hub-spoke" && synthesized.topology.primarySiteId) {
    const primary = sites.find((site) => site.id === synthesized.topology.primarySiteId) || sites[0];
    const branches = sites.filter((site) => site.id !== primary.id);
    const centerX = 800;
    positions[primary.id] = { x: centerX - cardWidth / 2, y: 232 };
    const columns = branches.length <= 2 ? Math.max(branches.length, 1) : branches.length <= 4 ? 2 : 3;
    const columnGap = columns === 1 ? 0 : columns === 2 ? 120 : 96;
    const firstRowY = 522;
    const rowGap = 306;
    branches.forEach((site, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const rowCount = Math.min(columns, branches.length - row * columns);
      const rowWidth = rowCount * cardWidth + Math.max(0, rowCount - 1) * columnGap;
      const rowStartX = centerX - rowWidth / 2;
      positions[site.id] = { x: rowStartX + col * (cardWidth + columnGap), y: firstRowY + row * rowGap };
    });
    return positions;
  }

  sites.forEach((site, index) => {
    positions[site.id] = { x: startX + index * (cardWidth + gap), y: 272 };
  });
  return positions;
}


function validationSeverityTone(items: ValidationResult[]) {
  if (items.some((item) => item.severity === "ERROR")) return { stroke: "#ef4444", fill: "#fff1f2", label: "Blocker" };
  if (items.some((item) => item.severity === "WARNING")) return { stroke: "#f59e0b", fill: "#fff7ed", label: "Warning" };
  return { stroke: "#dce7f8", fill: "#ffffff", label: "Clear" };
}

function siteValidationItems(site: SiteWithVlans, validations: ValidationResult[]) {
  return validations.filter((item) => (item.entityType === "SITE" && item.entityId === site.id) || (item.entityType === "VLAN" && (site.vlans ?? []).some((vlan) => vlan.id === item.entityId)));
}

function normalizeDiagramText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9./-]+/g, " ");
}

function relevantSiteSubnets(siteId: string, synthesized: SynthesizedLogicalDesign) {
  return synthesized.addressingPlan.filter((row) => row.siteId === siteId).map((row) => row.subnetCidr.toLowerCase());
}

function relevantZoneNames(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return synthesized.securityBoundaries.filter((boundary) => boundary.siteName === siteName).map((boundary) => boundary.zoneName.toLowerCase());
}

function deterministicValidationAnchor(item: ValidationResult, site: SiteWithVlans, synthesized: SynthesizedLogicalDesign) {
  const text = normalizeDiagramText(`${item.title} ${item.message}`);
  const subnets = relevantSiteSubnets(site.id, synthesized);
  const zones = relevantZoneNames(site.name, synthesized);
  const matchesSubnet = subnets.some((subnet) => text.includes(subnet.split('/')[0]));
  const mentionsDmz = /\bdmz\b|published|public|internet inbound|reverse proxy|web/.test(text);
  const mentionsMgmt = /management|admin|monitor|snmp|ssh|https access|jump/.test(text);
  const mentionsGuest = /guest|ssid|wireless|ap|wifi/.test(text);
  const mentionsPath = /trunk|uplink|wan|transit|route|path|internet|vpn|link|summary|adjacency/.test(text);
  const mentionsAddressing = /subnet|vlan|gateway|address|dhcp|cidr/.test(text);
  const mentionsEdge = /firewall|edge|nat|outside|inside|dmz interface|internet edge/.test(text);

  if (mentionsDmz || zones.some((zone) => zone.includes('dmz'))) return 'dmz';
  if (mentionsMgmt) return 'management';
  if (mentionsGuest) return 'wireless';
  if (mentionsPath) return 'path';
  if (mentionsEdge) return 'edge';
  if (mentionsAddressing || matchesSubnet) return 'switch';
  return 'site';
}

function deviceValidationItems(device: SitePlacementDevice | undefined, site: SiteWithVlans, validations: ValidationResult[], synthesized: SynthesizedLogicalDesign) {
  if (!device) return [];
  const roleText = `${device.role} ${device.connectedZones.join(" " )} ${device.connectedSubnets.join(" " )} ${device.interfaceLabels.join(" " )}`.toLowerCase();
  return siteValidationItems(site, validations).filter((item) => {
    const anchor = deterministicValidationAnchor(item, site, synthesized);
    if ((device.deviceType === "firewall" || device.deviceType === "router") && (anchor === 'edge' || anchor === 'dmz' || anchor === 'management' || anchor === 'path')) return true;
    if ((device.deviceType === "core-switch" || device.deviceType === "access-switch" || device.deviceType === "distribution-switch") && (anchor === 'switch' || anchor === 'management')) return true;
    if (device.deviceType === "server" && anchor === 'dmz') return true;
    if ((device.deviceType === "access-point" || device.deviceType === "wireless-controller") && anchor === 'wireless') return true;
    const text = normalizeDiagramText(`${item.title} ${item.message}`);
    return text.split(/\W+/).some((token) => token.length > 4 && roleText.includes(token));
  }).slice(0, 2);
}

function interfaceValidationItems(device: SitePlacementDevice | undefined, site: SiteWithVlans, validations: ValidationResult[], synthesized: SynthesizedLogicalDesign) {
  if (!device) return [];
  const labels = device.interfaceLabels.map((label) => label.toLowerCase());
  return siteValidationItems(site, validations).filter((item) => {
    const text = normalizeDiagramText(`${item.title} ${item.message}`);
    const anchor = deterministicValidationAnchor(item, site, synthesized);
    return labels.some((label) => label.split(/\W+/).filter((token) => token.length > 2).some((token) => text.includes(token)))
      || ((anchor === 'edge' || anchor === 'management' || anchor === 'dmz') && (device.deviceType === 'firewall' || device.deviceType === 'router'));
  }).slice(0, 2);
}

function linkValidationItems(site: SiteWithVlans, validations: ValidationResult[], synthesized: SynthesizedLogicalDesign) {
  return siteValidationItems(site, validations).filter((item) => deterministicValidationAnchor(item, site, synthesized) === 'path').slice(0, 2);
}

function zoneBoundaryRectsForSite(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return synthesized.securityBoundaries
    .filter((boundary) => boundary.siteName === siteName)
    .slice(0, 3)
    .map((boundary) => ({
      label: boundary.zoneName,
      subnet: boundary.subnetCidrs[0] || 'TBD',
      anchor: boundary.attachedInterface || boundary.attachedDevice,
    }));
}

function compactInterfaceStack(device?: SitePlacementDevice, limit = 3) {
  if (!device) return [];
  return device.interfaceLabels.slice(0, limit).map((label, index) => `${index + 1}. ${label}`);
}

function boundaryLabelsForSite(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return zoneBoundaryRectsForSite(siteName, synthesized)
    .map((boundary) => `${boundary.label} • ${boundary.subnet} • ${boundary.anchor}`);
}

function siteRoleSummary(siteName: string, synthesized: SynthesizedLogicalDesign) {
  if (siteName === synthesized.topology.primarySiteName) return "Primary site • shared services • policy anchor";
  if (synthesized.topology.topologyType === 'collapsed-core') return 'Collapsed-core site • local edge and switching';
  if (synthesized.topology.topologyType === 'hub-spoke') return 'Branch site • uplinked to primary hub';
  if (synthesized.topology.topologyType === 'hybrid-cloud') return 'Attached site • cloud-aware edge';
  return 'Attached site • routed inter-site design';
}

function topologyScopeBehaviorSummary(scope: DiagramScope, synthesized: SynthesizedLogicalDesign, focusedSite?: SiteWithVlans) {
  if (scope === "site" && focusedSite) {
    return `${focusedSite.name}: ${siteBreakoutSummary(focusedSite.name, synthesized)} • ${siteRoutingSummary(focusedSite.id, focusedSite.name, synthesized)}`;
  }
  if (synthesized.topology.topologyType === "hub-spoke") {
    return `Hub-and-spoke posture: branches should traverse ${synthesized.topology.primarySiteName || "the primary hub"} unless breakout rules explicitly override that path.`;
  }
  if (synthesized.topology.topologyType === "collapsed-core") {
    return "Collapsed-core posture: local edge, local switching, and local internet/security boundaries should dominate the rendered view.";
  }
  if (synthesized.topology.topologyType === "hybrid-cloud") {
    return "Hybrid-cloud posture: cloud edge, hosted services, and cross-boundary trust/control points should remain explicit in the diagram.";
  }
  return "Routed multi-site posture: attached sites, transit paths, and summarized route domains should remain visible without overloading the view.";
}

function siteBreakoutSummary(siteName: string, synthesized: SynthesizedLogicalDesign) {
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

function siteRoutingSummary(siteId: string, siteName: string, synthesized: SynthesizedLogicalDesign) {
  const route = (synthesized.routePlan ?? synthesized.routingPlan).find((item) => item.siteId === siteId || item.siteName === siteName);
  if (route?.summaryAdvertisement) return `Summarizes ${route.summaryAdvertisement}`;
  if (route?.transitAdjacencyCount && route.transitAdjacencyCount > 0) return `${route.transitAdjacencyCount} transit adjacencies`;
  if (siteName === synthesized.topology.primarySiteName) return "Shared route / policy anchor";
  if (synthesized.topology.topologyType === "hub-spoke") return `Attached route domain via ${synthesized.topology.primarySiteName || "hub"}`;
  if (synthesized.topology.topologyType === "collapsed-core") return "Local gateway and switching role";
  return "Routed attached site";
}

function siteTransportSummary(siteId: string, siteName: string, synthesized: SynthesizedLogicalDesign) {
  const links = synthesized.wanLinks.filter((link) => link.endpointASiteId === siteId || link.endpointBSiteId === siteId);
  if (!links.length) {
    if (siteName === synthesized.topology.primarySiteName) return "Primary edge without explicit WAN link rows yet";
    return synthesized.topology.topologyType === "collapsed-core" ? "No WAN transit required" : "Transit relationship still inferred";
  }

  return links
    .slice(0, 2)
    .map((link) => {
      const peer = link.endpointASiteId === siteId ? link.endpointBSiteName : link.endpointASiteName;
      return `${link.linkName} → ${peer}`;
    })
    .join(" • ");
}

function siteAnchorSummary(siteId: string, siteName: string, synthesized: SynthesizedLogicalDesign) {
  const services = synthesized.servicePlacements.filter((placement) => placement.siteId === siteId || placement.siteName === siteName);
  const boundaries = synthesized.securityBoundaries.filter((boundary) => boundary.siteName === siteName);
  const placements = synthesized.sitePlacements.filter((placement) => placement.siteId === siteId);
  const primaryService = services[0]?.serviceName;
  const primaryBoundary = boundaries[0]?.boundaryName;
  const primaryDevice = placements[0]?.deviceName;
  return [primaryService, primaryBoundary, primaryDevice].filter(Boolean).slice(0, 2).join(" • ") || "Core anchors still inferred";
}

function TopologyPostureLedgerPanel({ synthesized, sites }: { synthesized: SynthesizedLogicalDesign; sites: SiteWithVlans[]; }) {
  if (!sites.length) return null;

  return (
    <div className="diagram-note-card" style={{ marginBottom: 12 }}>
      <strong style={{ display: "block", marginBottom: 6 }}>Topology-specific posture ledger</strong>
      <p style={{ margin: "0 0 12px 0", color: "#61758f" }}>
        This keeps Phase J tied to real design objects by showing how each in-scope site should behave in the current topology, not just what overlay is selected.
      </p>
      <div className="diagram-overlay-evidence-grid">
        {sites.map((site) => (
          <div key={site.id} className="diagram-overlay-evidence-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <strong>{site.name}</strong>
              <span className="badge-soft">{site.name === synthesized.topology.primarySiteName ? "Primary" : "Attached"}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#42566f" }}>
              <li style={{ marginBottom: 6 }}><strong>Breakout:</strong> {siteBreakoutSummary(site.name, synthesized)}</li>
              <li style={{ marginBottom: 6 }}><strong>Routing:</strong> {siteRoutingSummary(site.id, site.name, synthesized)}</li>
              <li style={{ marginBottom: 6 }}><strong>Transport:</strong> {siteTransportSummary(site.id, site.name, synthesized)}</li>
              <li style={{ marginBottom: 0 }}><strong>Anchors:</strong> {siteAnchorSummary(site.id, site.name, synthesized)}</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function dmzBoundaryForSite(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return synthesized.securityBoundaries.find((boundary) => boundary.siteName === siteName && /dmz/i.test(boundary.zoneName));
}

function managementBoundaryForSite(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return synthesized.securityBoundaries.find((boundary) => boundary.siteName === siteName && /management/i.test(boundary.zoneName));
}

function firstInterfaceLabel(device?: SitePlacementDevice) {
  return device?.interfaceLabels?.[0];
}

function interfaceSummary(device?: SitePlacementDevice) {
  return device?.interfaceLabels?.slice(0, 3) ?? [];
}

function overlayTone(mode: OverlayMode) {
  switch (mode) {
    case "addressing": return "blue" as const;
    case "security": return "purple" as const;
    case "flows": return "orange" as const;
    case "services": return "purple" as const;
    case "redundancy": return "green" as const;
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
      .map((boundary) => `${boundary.boundaryName} • via ${boundary.attachedDevice}`);
  }

  if (mode === "flows") {
    return synthesized.trafficFlows
      .filter((flow) => flow.sourceSite === site.name || flow.destinationSite === site.name)
      .slice(0, 4)
      .map((flow) => `${flow.flowLabel} • ${flow.sourceZone} → ${flow.destinationZone}`);
  }

  if (mode === "services") {
    return synthesized.servicePlacements
      .filter((placement) => placement.siteId === site.id || placement.siteName === site.name)
      .slice(0, 5)
      .map((placement) => `${placement.serviceName} • ${placement.placementType} • ${placement.zoneName}`);
  }

  if (mode === "redundancy") {
    const placements = synthesized.sitePlacements.filter((placement) => placement.siteId === site.id);
    const routedLinks = synthesized.wanLinks.filter((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id);
    const firewalls = placements.filter((placement) => placement.deviceType === "firewall");
    const routeDomain = synthesized.designTruthModel.routeDomains.find((route) => route.siteId === site.id || route.siteName === site.name);
    const redundancyItems = [
      `Redundancy posture • ${synthesized.topology.redundancyModel}`,
      ...(routedLinks.length > 0
        ? routedLinks.slice(0, 2).map((link) => `${link.linkName} • ${link.transport}`)
        : [synthesized.topology.topologyType === "collapsed-core" ? "Local-only switching posture" : "Single routed anchor not fully explicit"]),
      firewalls.length > 1 ? `Firewall pair • ${firewalls.length} nodes` : placements.some((placement) => placement.deviceType === "firewall" || placement.deviceType === "router") ? "Single edge anchor" : "Edge redundancy not explicit yet",
      routeDomain ? `Route domain • ${routeDomain.summaryAdvertisement || routeDomain.loopbackCidr || routeDomain.notes[0] || routeDomain.siteName}` : "Route domain still thin",
    ];
    return redundancyItems.slice(0, 5);
  }

  return synthesized.sitePlacements
    .filter((placement) => placement.siteId === site.id)
    .slice(0, 4)
    .map((placement) => `${placement.deviceName} • ${placement.role}`);
}

function diagramLegend(mode: OverlayMode) {
  const title = mode === "addressing" ? "Addressing overlay"
    : mode === "security" ? "Security overlay"
      : mode === "flows" ? "Traffic-flow overlay"
        : mode === "services" ? "Service-placement overlay"
          : mode === "redundancy" ? "Redundancy overlay"
            : "Placement overlay";
  const details = mode === "addressing"
    ? ["Shows site VLAN / subnet labels.", "Use this to confirm where blocks land."]
    : mode === "security"
      ? ["Shows zones and attached enforcement devices.", "Use this to verify DMZ, guest, and management boundaries."]
      : mode === "flows"
        ? ["Highlights critical traffic paths and control points.", "Use this to review north-south and shared-service movement."]
        : mode === "services"
          ? ["Shows explicit local, centralized, DMZ, and cloud-hosted service anchors.", "Use this to verify which services are local versus remote and which boundary owns them."]
          : mode === "redundancy"
            ? ["Shows routed uplinks, edge posture, and route-domain anchors that affect failover meaning.", "Use this to verify whether the topology reads like single-edge, paired-edge, or broader resilient transport."]
            : ["Shows actual device roles that the engine placed at each site.", "Use this to verify edge, switching, and service placement."];
  return { title, details };
}

function normalizeActiveOverlays(overlay: OverlayMode, activeOverlays?: ActiveOverlayMode[]) {
  const normalized = Array.from(new Set(activeOverlays ?? []));
  if (normalized.length > 0) return normalized;
  return overlay === "none" ? [] : [overlay];
}

function overlaySummaryLabel(activeOverlays: ActiveOverlayMode[]) {
  if (!activeOverlays.length) return "Devices + traffic lines";
  const labels = activeOverlays.map((item) => diagramLegend(item).title.replace(/ overlay$/i, ""));
  return labels.length <= 2 ? labels.join(" + ") : `${labels.slice(0, 2).join(" + ")} +${labels.length - 2}`;
}

function placementRowsForSite(site: SiteWithVlans, synthesized: SynthesizedLogicalDesign, limit = 5) {
  return synthesized.sitePlacements
    .filter((placement) => placement.siteId === site.id)
    .slice(0, limit)
    .map((placement) => ({ text: `${deviceLabel(placement.deviceType)} • ${placement.role} • ${placement.connectedZones.join(", ") || "No zone labels yet"}`, tone: "green" as const, category: "topology" as const }));
}

function overlayRowsForSite(site: SiteWithVlans, synthesized: SynthesizedLogicalDesign, activeOverlays: ActiveOverlayMode[], limit = 3) {
  if (!activeOverlays.length) return placementRowsForSite(site, synthesized, limit);
  const perOverlayLimit = Math.max(1, Math.floor(limit / Math.max(activeOverlays.length, 1)));
  return activeOverlays.flatMap((mode) =>
    overlayItems(site, synthesized, mode)
      .slice(0, perOverlayLimit + (activeOverlays.length === 1 ? limit : 0))
      .map((item) => ({ text: item, tone: overlayTone(mode), category: overlayLabelCategory(mode) }))
  ).slice(0, limit);
}

function LogicalTopologyDiagram({
  project,
  synthesized,
  svgId,
  comments,
  validations,
  overlay,
  activeOverlays,
  scope,
  focusedSiteId,
  labelMode,
  linkAnnotationMode,
  labelFocus,
  deviceFocus,
  linkFocus,
  onSelectTarget,
  bareCanvas = false,
}: {
  project: ProjectDetail;
  synthesized: SynthesizedLogicalDesign;
  svgId: string;
  comments: ProjectComment[];
  validations: ValidationResult[];
  overlay: OverlayMode;
  activeOverlays?: ActiveOverlayMode[];
  scope: DiagramScope;
  focusedSiteId?: string;
  labelMode: DiagramLabelMode;
  linkAnnotationMode: LinkAnnotationMode;
  labelFocus: LabelFocus;
  deviceFocus: DeviceFocus;
  linkFocus: LinkFocus;
  onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void;
  compact?: boolean;
  bareCanvas?: boolean;
}) {
  const sites = sitesForDiagramScope((project.sites ?? []) as SiteWithVlans[], synthesized, scope, focusedSiteId);
  const cardWidth = bareCanvas ? 300 : 320;
  const cardHeight = bareCanvas ? 248 : 276;
  const startX = 64;
  const gap = 36;
  const sitePositions = sitePositionMap(sites, synthesized, cardWidth, startX, gap);
  const emphasizeDevice = (kind: DeviceKind) => deviceFocusMatchesKind(deviceFocus, kind);
  const occupiedXs = Object.values(sitePositions).map((point) => point.x);
  const occupiedYs = Object.values(sitePositions).map((point) => point.y);
  const width = Math.max(1600, (Math.max(...occupiedXs, 0)) + cardWidth + 120);
  const height = Math.max(1100, (Math.max(...occupiedYs, 0)) + cardHeight + 120);
  const showDetailedLabels = labelMode === "detailed";
  const enabledOverlays = normalizeActiveOverlays(overlay, activeOverlays);
  const hasOverlay = (mode: ActiveOverlayMode) => enabledOverlays.includes(mode);
  const showOverlayNotes = false;
  const showAddressing = hasOverlay("addressing");
  const showSecurity = scope === "boundaries" || hasOverlay("security");
  const showServices = hasOverlay("services") || scope === "boundaries";
  const showRedundancy = false;
  const quietCanvas = bareCanvas && linkAnnotationMode !== "full";
  const renderPath = (points: Array<[number, number]>, type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow", label?: string, secondaryLabel?: string) => pathLine(points, type, quietCanvas ? undefined : label, quietCanvas ? undefined : secondaryLabel, linkAnnotationMode, linkFocusMatchesType(linkFocus, type), labelFocus);
  const primarySite = sites.find((site) => site.name === synthesized.topology.primarySiteName) || sites[0];
  const primarySiteId = synthesized.topology.primarySiteId || primarySite?.id;
  const primarySitePoint = primarySite ? sitePositions[primarySite.id] : undefined;
  const cloudNeeded = synthesized.topology.cloudConnected || synthesized.servicePlacements.some((service) => service.placementType === "cloud");
  const globalInternetX = primarySitePoint ? primarySitePoint.x + cardWidth / 2 - 61 : Math.max(80, (width / 2) - 61);
  const globalInternetY = 146;
  const cloudX = width - 250;
  const cloudY = 154;
  const layoutShiftY = bareCanvas ? -112 : 0;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Logical topology diagram with explicit device placement, addressing, and overlay modes">
        <DiagramCanvasBackdrop
          width={width}
          height={height}
          title={diagramScopeMeta(scope, synthesized, sites[0]).title}
          subtitle={diagramScopeMeta(scope, synthesized, sites[0]).detail}
          summary={`Topology: ${synthesized.topology.topologyLabel} • Breakout: ${synthesized.topology.internetBreakout} • Redundancy: ${synthesized.topology.redundancyModel}`}
          chipLabel={overlaySummaryLabel(enabledOverlays)}
          chipTone={enabledOverlays[0] ? overlayTone(enabledOverlays[0]) : "green"}
          minimal={bareCanvas}
        />
        <g transform={layoutShiftY ? `translate(0 ${layoutShiftY})` : undefined}>
        {!bareCanvas ? chip(width - 286, 82, 210, "Logical posture review", "green") : null}
        {!bareCanvas ? <rect x={36} y={136} width={width - 72} height={110} rx={34} fill="rgba(238,245,255,0.8)" stroke="#c9d9f1" strokeDasharray="10 7" /> : null}
        {!bareCanvas ? <text x={60} y={164} fontSize="12.5" fontWeight="700" fill="#284b78">North-south edge / WAN / cloud zone</text> : null}
        {!bareCanvas ? <text x={60} y={184} fontSize="11" fill="#607791">Internet, perimeter controls, hybrid edge, and inter-site transport anchors stay grouped here so the logical view reads more like an actual architecture map.</text> : null}
        {!bareCanvas ? <rect x={36} y={266} width={width - 72} height={height - 322} rx={34} fill="rgba(255,255,255,0.5)" stroke="#d7e2f1" strokeDasharray="10 8" /> : null}
        {!bareCanvas ? <text x={60} y={294} fontSize="12.5" fontWeight="700" fill="#284b78">Site fabric domains</text> : null}
        {!bareCanvas ? <text x={60} y={314} fontSize="11" fill="#607791">Each site card shows edge, switching, service, wireless, and boundary clues so the topology reads like a real multi-site estate instead of a generic card grid.</text> : null}

        {sites.map((site, index) => {
          const sitePoint = sitePositions[site.id] || { x: startX + index * (cardWidth + gap), y: 178 };
          const x = sitePoint.x;
          const y = sitePoint.y;
          const siteDevices = synthesized.sitePlacements.filter((placement) => placement.siteId === site.id);
          const taskCount = openTaskCount(comments, "SITE", site.id);
          const siteValidation = siteValidationItems(site, validations);
          const validationTone = validationSeverityTone(siteValidation);
          const edgeDevice = siteDevices.find((device) => device.role.toLowerCase().includes("edge") || device.deviceType === "firewall" || device.deviceType === "router") || siteDevices[0];
          const switchDevice = siteDevices.find((device) => device.deviceType === "core-switch" || device.deviceType === "distribution-switch" || device.deviceType === "access-switch");
          const serviceDevice = siteDevices.find((device) => device.deviceType === "server");
          const wirelessDevice = siteDevices.find((device) => device.deviceType === "wireless-controller" || device.deviceType === "access-point");
          const isPrimary = site.id === primarySiteId;
          const showAddressBlock = showAddressing && Boolean(site.defaultAddressBlock);
          const headerY = y + 32;
          const edgeTitle = isPrimary ? "Edge / policy" : "Branch edge";
          const coreTitle = isPrimary ? "Core / routing" : "Local switching";
          const accessTitle = isPrimary ? "Access / WLAN" : "User access";
          const serviceTitle = isPrimary ? "Shared services" : (showServices ? "Local services" : "");
          const edgeSubtitle = showDetailedLabels ? (edgeDevice?.deviceName || edgeDevice?.role || undefined) : undefined;
          const coreSubtitle = showDetailedLabels ? (switchDevice?.deviceName || switchDevice?.role || undefined) : undefined;
          const serviceSubtitle = showDetailedLabels ? (serviceDevice?.deviceName || serviceDevice?.role || undefined) : undefined;
          const accessSubtitle = showDetailedLabels ? (wirelessDevice?.deviceName || wirelessDevice?.role || undefined) : undefined;

          return (
            <g key={site.id}>
              <rect x={x} y={y} width={cardWidth} height={cardHeight} rx={24} fill={validationTone.fill} stroke={validationTone.stroke} strokeWidth="2.3" filter="url(#diagram-soft-shadow)" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 20} y={headerY} fontSize="18" fontWeight="700" fill="#142742" opacity={labelFocusOpacity(labelFocus, "topology")}>{site.name}</text>
              {showAddressBlock ? <text x={x + 20} y={headerY + 18} fontSize="11" fill="#697f98" opacity={labelFocusOpacity(labelFocus, "addressing")}>{site.defaultAddressBlock}</text> : null}
              {!bareCanvas ? chip(x + cardWidth - 126, y + 16, 106, isPrimary ? "Primary hub" : "Attached site", siteTierTone(site.name, synthesized)) : null}
              {!bareCanvas ? taskBadge(x + cardWidth - 24, y + 24, taskCount) : null}
              {!bareCanvas && siteValidation.length > 0 ? chip(x + cardWidth - 150, y + 46, 126, `${validationTone.label} ${siteValidation.length}`, siteValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null}

              {logicalNode(x + 26, y + 84, 104, edgeTitle, edgeSubtitle, "blue")}
              {logicalNode(x + 146, y + 84, 124, coreTitle, coreSubtitle, "purple")}
              {isPrimary && serviceTitle ? logicalNode(x + cardWidth - 130, y + 84, 104, serviceTitle, serviceSubtitle, "orange") : null}
              {logicalNode(x + 90, y + 160, 136, accessTitle, accessSubtitle, "green")}

              {renderPath(orthogonalHV([x + 130, y + 106], [x + 146, y + 106], x + 138), "routed", edgeDevice?.deviceType === "firewall" ? "inside" : "LAN", edgeDevice?.connectedSubnets[0] || undefined)}
              {isPrimary && serviceTitle ? renderPath(orthogonalHV([x + 270, y + 106], [x + cardWidth - 130, y + 106], x + 292), "trunk", "services", serviceDevice?.connectedSubnets[0] || undefined) : null}
              {renderPath(orthogonalVH([x + 208, y + 128], [x + 158, y + 160], y + 144), "trunk", isPrimary ? "access / WLAN" : "user access", wirelessDevice?.connectedZones[0] || undefined)}
            </g>
          );
        })}

{sites.length > 1 ? (
          synthesized.topology.topologyType === "hub-spoke" && primarySiteId
            ? (() => {
                const primaryPoint = sitePositions[primarySiteId];
                const branchEntries = sites.filter((site) => site.id !== primarySiteId).map((site) => ({ site, point: sitePositions[site.id] }));
                const routeType = bareCanvas && scope !== "wan-cloud" ? "routed" : "vpn";
                const busY = (primaryPoint?.y ?? 0) + cardHeight + 48;
                const columnXs = Array.from(new Set(branchEntries.map((entry) => entry.point.x + cardWidth / 2))).sort((a, b) => a - b);
                const busLeft = Math.min(...columnXs, primaryPoint.x + cardWidth / 2);
                const busRight = Math.max(...columnXs, primaryPoint.x + cardWidth / 2);
                return (
                  <g>
                    {renderPath([[primaryPoint.x + cardWidth / 2, primaryPoint.y + cardHeight], [primaryPoint.x + cardWidth / 2, busY]], routeType, undefined, undefined)}
                    {renderPath([[busLeft, busY], [busRight, busY]], routeType, undefined, undefined)}
                    {columnXs.map((columnX) => {
                      const columnEntries = branchEntries.filter((entry) => entry.point.x + cardWidth / 2 === columnX);
                      const lastEntry = columnEntries[columnEntries.length - 1];
                      return (
                        <g key={`logical-column-${columnX}`}>
                          {renderPath([[columnX, busY], [columnX, lastEntry.point.y]], routeType, undefined, undefined)}
                          {columnEntries.map((entry) => {
                            const wanLink = synthesized.wanLinks.find((link) => link.endpointASiteId === entry.site.id || link.endpointBSiteId === entry.site.id);
                            return (
                              <g key={`inter-${entry.site.id}`}>
                                {renderPath(
                                  [[columnX, entry.point.y], [columnX, entry.point.y + 18]],
                                  routeType,
                                  "WAN / hub-spoke",
                                  wanLink?.subnetCidr || "Point-to-point transit",
                                )}
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}
                  </g>
                );
              })()
            : sites.slice(0, -1).map((site, index) => {
                const currentPoint = sitePositions[site.id];
                const nextSite = sites[index + 1];
                const nextPoint = sitePositions[nextSite.id];
                const label = synthesized.topology.topologyType === "collapsed-core" ? "Campus / local core" : "Inter-site routed path";
                return (
                  <g key={`inter-${site.id}`}>
                    {renderPath(
                      orthogonalHV([currentPoint.x + cardWidth, currentPoint.y + cardHeight / 2], [nextPoint.x, nextPoint.y + cardHeight / 2], currentPoint.x + cardWidth + 48),
                      synthesized.topology.topologyType === "collapsed-core" ? "trunk" : "routed",
                      label,
                      synthesized.wanLinks[index]?.subnetCidr || undefined,
                    )}
                  </g>
                );
              })
        ) : null}
        </g>
      </svg>
    </div>
  );
}

function PhysicalTopologyDiagram({
  project,
  synthesized,
  svgId,
  comments,
  validations,
  overlay,
  activeOverlays,
  scope,
  focusedSiteId,
  labelMode,
  linkAnnotationMode,
  labelFocus,
  deviceFocus,
  linkFocus,
  onSelectTarget,
  bareCanvas = false,
}: {
  project: ProjectDetail;
  synthesized: SynthesizedLogicalDesign;
  svgId: string;
  comments: ProjectComment[];
  validations: ValidationResult[];
  overlay: OverlayMode;
  activeOverlays?: ActiveOverlayMode[];
  scope: DiagramScope;
  focusedSiteId?: string;
  labelMode: DiagramLabelMode;
  linkAnnotationMode: LinkAnnotationMode;
  labelFocus: LabelFocus;
  deviceFocus: DeviceFocus;
  linkFocus: LinkFocus;
  onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void;
  compact?: boolean;
  bareCanvas?: boolean;
}) {
  const sites = sitesForDiagramScope((project.sites ?? []) as SiteWithVlans[], synthesized, scope, focusedSiteId);
  const requirements = parseRequirementsProfile(project.requirementsJson);
  const primarySite = sites.find((site) => site.name === synthesized.topology.primarySiteName) || sites[0];
  const branchSites = sites.filter((site) => site.id !== primarySite?.id);
  const cloudNeeded = synthesized.topology.cloudConnected || synthesized.servicePlacements.some((service) => service.placementType === "cloud");
  const branchRows = Math.max(1, Math.ceil(Math.max(branchSites.length, 1) / 2));
  const branchCardWidth = bareCanvas ? 356 : 320;
  const siteCardHeight = bareCanvas ? 316 : 340;
  const siteRowGap = bareCanvas ? 334 : 246;
  const siteRowStartY = bareCanvas ? 430 : 392;
  const enabledOverlays = normalizeActiveOverlays(overlay, activeOverlays);
  const hasOverlay = (mode: ActiveOverlayMode) => enabledOverlays.includes(mode);
  const showOverlayNotes = false;
  const showAddressing = hasOverlay("addressing");
  const showSecurity = scope === "boundaries" || hasOverlay("security");
  const showServices = hasOverlay("services") || scope === "boundaries";
  const showRedundancy = false;
  const showFlows = hasOverlay("flows") && !bareCanvas;
  const flowOverlays = showFlows ? flowsForDiagramScope(synthesized.trafficFlows, scope, sites[0]?.name).slice(0, 4) : [];
  const width = Math.max(bareCanvas ? 1640 : 1480, (bareCanvas ? 1260 : 1180) + branchSites.length * 120 + (cloudNeeded ? 150 : 0));
  const centerX = width / 2;
  const primaryCardWidth = bareCanvas ? 620 : 540;
  const primaryCardHeight = bareCanvas ? 420 : 360;
  const primaryCardX = centerX - primaryCardWidth / 2;
  const primaryCardY = bareCanvas ? 332 : 344;
  const primarySiteBottom = primaryCardY + primaryCardHeight;
  const branchSectionBottom = branchSites.length ? siteRowStartY + ((branchRows - 1) * siteRowGap) + siteCardHeight : primarySiteBottom;
  const flowLaneStartY = Math.max(774, branchSectionBottom + 76);
  const flowLaneHeight = hasOverlay("flows") ? Math.max(0, flowOverlays.length - 1) * 84 + 96 : 0;
  const fabricSectionBottom = Math.max(primarySiteBottom, branchSectionBottom) + 28;
  const height = Math.max(bareCanvas ? 1220 : 1160, flowLaneStartY + flowLaneHeight + 64, fabricSectionBottom + 180);
  const showDetailedLabels = labelMode === "detailed";
  const showDeviceLabels = showDetailedLabels;
  const showDeviceSublabels = showDetailedLabels && !bareCanvas;
  const quietCanvas = bareCanvas && linkAnnotationMode !== "full";
  const renderPath = (points: Array<[number, number]>, type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow", label?: string, secondaryLabel?: string) => pathLine(points, type, quietCanvas ? undefined : label, quietCanvas ? undefined : secondaryLabel, linkAnnotationMode, linkFocusMatchesType(linkFocus, type), labelFocus);
  const hqTaskCount = primarySite ? openTaskCount(comments, "SITE", primarySite.id) : 0;
  const hqValidation = primarySite ? siteValidationItems(primarySite, validations) : [];
  const hqValidationTone = validationSeverityTone(hqValidation);
  const emphasizeDevice = (kind: DeviceKind) => deviceFocusMatchesKind(deviceFocus, kind);
  const legendTone = enabledOverlays[0] ? overlayTone(enabledOverlays[0]) : "green";
  const totalVlanCount = sites.reduce((sum, site) => sum + (site.vlans?.length ?? 0), 0);
  const transportSpineY = 308;
  const sectionRailX = 56;
  const branchAnchorBlueprint = branchSites.map((site, index) => {
    const left = index % 2 === 0;
    const row = Math.floor(index / 2);
    const x = left ? 76 : width - 76 - branchCardWidth;
    const y = siteRowStartY + row * siteRowGap;
    return { site, index, row, left, x, y, anchorX: left ? x + branchCardWidth : x, anchorY: y + siteCardHeight / 2 - 8 };
  });
  const legendDockY = height - 168;
  const siteIndexItems = (primarySite ? [primarySite, ...branchSites] : branchSites).slice(0, 4);
  const siteVlanCount = (site?: SiteWithVlans) => site?.vlans?.length ?? 0;
  const siteServiceCount = (siteName?: string) => synthesized.servicePlacements.filter((service) => !siteName || service.siteName === siteName).length;
  const siteWanLink = (siteId?: string) => synthesized.wanLinks.find((link) => link.endpointASiteId === siteId || link.endpointBSiteId === siteId);
  const siteWanLabel = (siteId?: string) => siteWanLink(siteId)?.linkName || (synthesized.topology.topologyType === "hub-spoke" ? "WAN / hub-spoke" : "Inter-site path");
  const transportCapsuleSites = primarySite ? [primarySite, ...branchSites] : branchSites;
  const branchRouteType = bareCanvas && scope !== "wan-cloud" ? "routed" : (synthesized.topology.topologyType === "hub-spoke" ? "vpn" : "routed");
  const leftBranchAnchors = branchAnchorBlueprint.filter((entry) => entry.left);
  const rightBranchAnchors = branchAnchorBlueprint.filter((entry) => !entry.left);
  const lowerBusY = primarySiteBottom + (bareCanvas ? 56 : 46);
  const leftSpineX = primaryCardX - (bareCanvas ? 52 : 44);
  const rightSpineX = primaryCardX + primaryCardWidth + (bareCanvas ? 52 : 44);
  const transportCapsuleWidth = 172;
  const transportCapsuleGap = 12;
  const transportCapsuleCount = Math.max(1, Math.min(transportCapsuleSites.length, 6));
  const transportCapsuleVisibleSites = transportCapsuleSites.slice(0, transportCapsuleCount);
  const transportCapsuleTotalWidth = transportCapsuleVisibleSites.length * transportCapsuleWidth + Math.max(0, transportCapsuleVisibleSites.length - 1) * transportCapsuleGap;
  const transportCapsuleStartX = centerX - transportCapsuleTotalWidth / 2;
  const layoutShiftY = bareCanvas ? -124 : 0;
  const primaryRouterPos = bareCanvas ? { x: primaryCardX + 74, y: primaryCardY + 132 } : { x: centerX - 216, y: 448 };
  const primarySwitchPos = bareCanvas ? { x: primaryCardX + 276, y: primaryCardY + 132 } : { x: centerX - 66, y: 452 };
  const primaryServerPos = bareCanvas ? { x: primaryCardX + 464, y: primaryCardY + 126 } : { x: centerX + 96, y: 448 };
  const primaryAccessPos = bareCanvas ? { x: primaryCardX + 204, y: primaryCardY + 254 } : { x: centerX - 20, y: 564 };
  const primaryWirelessPos = bareCanvas ? { x: primaryCardX + 500, y: primaryCardY + 248 } : { x: centerX + 178, y: 564 };

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Physical style topology diagram with network-style device symbols, overlay modes, and reviewable connection semantics">
        <DiagramCanvasBackdrop
          width={width}
          height={height}
          title="Physical network blueprint"
          subtitle="The live canvas is the main diagram surface, with device-aware symbols, connection semantics, and boundary placement visible without flooding the view."
          summary="Connection semantics: routed = blue, trunk = purple, VPN/WAN = green dashed, internet = blue dashed, management/control = slate, critical flow = orange."
          chipLabel={overlaySummaryLabel(enabledOverlays)}
          chipTone={legendTone}
          minimal={bareCanvas}
        />
        <g transform={layoutShiftY ? `translate(0 ${layoutShiftY})` : undefined}>
        {!bareCanvas ? (enabledOverlays.length ? enabledOverlays : ["none"]).flatMap((mode) => diagramLegend(mode as OverlayMode).details).slice(0, 3).map((detail, index) => <text key={`${detail}-${index}`} x={width - 300} y={100 + index * 18} fontSize="11" fill="#607791">• {detail}</text>) : null}
        {!bareCanvas ? <rect x={48} y={148} width={width - 96} height={170} rx={46} fill="rgba(238,245,255,0.76)" stroke="#c6d9f5" strokeDasharray="10 8" /> : null}
        {!bareCanvas ? <text x={78} y={178} fontSize="12.5" fontWeight="700" fill="#284b78">North-south edge / WAN transport domain</text> : null}
        {!bareCanvas ? <text x={78} y={198} fontSize="11" fill="#607791">Internet, firewall, DMZ, hybrid edge, and upstream transport stay grouped here so the physical view immediately reads as a real network diagram.</text> : null}
        {!bareCanvas ? <rect x={48} y={336} width={width - 96} height={Math.max(388, fabricSectionBottom - 336)} rx={40} fill="rgba(255,255,255,0.48)" stroke="#d5e1f2" strokeDasharray="10 8" /> : null}
        {!bareCanvas ? <text x={78} y={366} fontSize="12.5" fontWeight="700" fill="#284b78">Primary and branch site fabrics</text> : null}
        {!bareCanvas ? <text x={78} y={386} fontSize="11" fill="#607791">Site containers expose edge, switching, service, wireless, and boundary elements in a more diagram-like blueprint layout rather than isolated cards.</text> : null}
        {!bareCanvas ? chip(78, 410, 118, `Sites ${sites.length}`, "blue") : null}
        {!bareCanvas ? chip(208, 410, 122, `VLANs ${totalVlanCount}`, "green") : null}
        {!bareCanvas ? chip(342, 410, 166, `Topology ${synthesized.topology.topologyLabel}`, "purple") : null}
        {!bareCanvas ? chip(520, 410, 128, `Services ${synthesized.servicePlacements.length}`, "orange") : null}

        {!bareCanvas ? <rect x={centerX - 196} y={98} width={392} height={92} rx={26} fill="rgba(245,249,255,0.78)" stroke="#cad9f2" strokeDasharray="8 6" /> : null}
        {!bareCanvas ? <text x={centerX} y={122} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#284b78">Internet / northbound exchange</text> : null}
        {!bareCanvas ? <text x={centerX} y={140} textAnchor="middle" fontSize="10.5" fill="#607791">Public edge, provider handoff, and upstream routing entry stay centered before the perimeter stack.</text> : null}
        {!bareCanvas ? <rect x={centerX - 188} y={214} width={376} height={88} rx={24} fill="rgba(249,252,255,0.74)" stroke="#d3e0f4" strokeDasharray="8 6" /> : null}
        {!bareCanvas ? <text x={centerX} y={238} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#284b78">Perimeter control stack</text> : null}
        {!bareCanvas ? <text x={centerX} y={256} textAnchor="middle" fontSize="10.5" fill="#607791">Firewall, DMZ publication, and routed handoff into the internal fabric.</text> : null}

        {!bareCanvas ? <rect x={centerX - 316} y={332} width={632} height={384} rx={34} fill="rgba(242,247,255,0.58)" stroke="#cad9f2" strokeDasharray="8 6" /> : null}
        {!bareCanvas ? <text x={centerX} y={356} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#284b78">Primary hub backbone zone</text> : null}
        {!bareCanvas ? <text x={centerX} y={374} textAnchor="middle" fontSize="10.5" fill="#607791">Core routing, campus switching, shared services, and user access stay visually grouped in one central engineering zone.</text> : null}
        {!bareCanvas && branchSites.length ? Array.from({ length: branchRows }).map((_, rowIndex) => {
          const rowY = siteRowStartY + rowIndex * siteRowGap;
          return (
            <g key={`branch-corridor-${rowIndex}`}>
              <rect x={58} y={rowY - 34} width={width - 116} height={388} rx={30} fill="rgba(248,251,255,0.48)" stroke="#d9e4f4" strokeDasharray="8 7" />
              <text x={centerX} y={rowY - 14} textAnchor="middle" fontSize="10.8" fontWeight="700" fill="#4a6587">Branch corridor {rowIndex + 1} • attached access + local services + WAN uplink</text>
            </g>
          );
        }) : null}

        {!bareCanvas ? <g opacity="0.9">
          <rect x={sectionRailX} y={160} width="8" height={Math.max(520, fabricSectionBottom - 130)} rx="4" fill="#d9e7fb" />
          <rect x={sectionRailX - 12} y={168} width="118" height="24" rx="12" fill="#eef5ff" stroke="#bfd2f3" />
          <text x={sectionRailX + 47} y={184} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#284b78">TRANSPORT</text>
          <rect x={sectionRailX - 12} y={352} width="118" height="24" rx="12" fill="#f4f8ff" stroke="#ccd8ed" />
          <text x={sectionRailX + 47} y={368} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#284b78">SITE FABRIC</text>
          {flowOverlays.length ? <><rect x={sectionRailX - 12} y={flowLaneStartY - 28} width="118" height="24" rx="12" fill="#fff4e8" stroke="#ffc98e" /><text x={sectionRailX + 47} y={flowLaneStartY - 12} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#9a3412">FLOW LANE</text></> : null}
        </g> : null}

        <g>
          <path d={`M ${Math.max(120, centerX - 430)} ${transportSpineY} L ${Math.min(width - 120, centerX + 430)} ${transportSpineY}`} stroke="#8fb0eb" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
          <path d={`M ${Math.max(120, centerX - 430)} ${transportSpineY} L ${Math.min(width - 120, centerX + 430)} ${transportSpineY}`} stroke="#ffffff" strokeWidth="1.4" strokeDasharray="8 10" opacity="0.9" />
          {!bareCanvas ? <text x={centerX} y={transportSpineY - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#365d93">WAN / transport spine</text> : null}
          {branchAnchorBlueprint.map((entry) => (
            <g key={`${entry.site.id}-spine-node`}>
              <line x1={entry.anchorX} y1={transportSpineY} x2={entry.anchorX} y2={entry.anchorY - 18} stroke="#d0ddf2" strokeWidth="2.4" strokeDasharray="7 7" opacity={bareCanvas ? 0.45 : 1} />
              {!bareCanvas ? <circle cx={entry.anchorX} cy={transportSpineY} r="8" fill="#ffffff" stroke="#7ea3e1" strokeWidth="3" /> : null}
              {!bareCanvas ? <text x={entry.anchorX} y={transportSpineY - 16} textAnchor="middle" fontSize="10" fill="#5e7691">{entry.site.name}</text> : null}
            </g>
          ))}
          {!bareCanvas ? transportCapsuleVisibleSites.map((site, index) => {
            const x = transportCapsuleStartX + index * (transportCapsuleWidth + transportCapsuleGap);
            const isPrimaryTransportSite = site.id === primarySite?.id;
            return (
              <g key={`${site.id}-transport-capsule`}>
                <rect x={x} y={transportSpineY + 18} width={transportCapsuleWidth} height="42" rx="18" fill={isPrimaryTransportSite ? "rgba(236, 251, 242, 0.98)" : "rgba(255,255,255,0.94)"} stroke={isPrimaryTransportSite ? "#a7d8b6" : "#d6e3f5"} filter="url(#diagram-soft-shadow)" />
                <text x={x + transportCapsuleWidth / 2} y={transportSpineY + 34} textAnchor="middle" fontSize="10.2" fontWeight="700" fill={isPrimaryTransportSite ? "#17603b" : "#365d93"}>{site.name} • {siteWanLabel(site.id)}</text>
                <text x={x + transportCapsuleWidth / 2} y={transportSpineY + 48} textAnchor="middle" fontSize="9.8" fill="#607791">{isPrimaryTransportSite ? "Primary hub" : "Attached site"} • VLANs {siteVlanCount(site)} • Services {siteServiceCount(site.name)}</text>
              </g>
            );
          }) : null}
        </g>

        {!bareCanvas ? Array.from({ length: branchRows }).map((_, rowIndex) => {
          const rowY = siteRowStartY + rowIndex * siteRowGap;
          return (
            <g key={`branch-row-${rowIndex}`}>
              <rect x={116} y={rowY - 26} width={154} height="20" rx="10" fill="#eef5ff" stroke="#bfd2f3" />
              <text x={193} y={rowY - 12} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#284b78">Branch fabric row {rowIndex + 1}</text>
            </g>
          );
        }) : null}

        <DeviceIcon x={centerX - 65} y={104} kind="internet" label={showDeviceLabels ? "Internet / WAN" : ""} sublabel={synthesized.topology.internetBreakout} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("internet")} />
        {renderPath([[centerX, 170], [centerX, 222]], "internet", synthesized.topology.topologyType === "hub-spoke" ? "Internet + branch WAN" : "North-south edge")}
        <DeviceIcon x={centerX - 60} y={226} kind="firewall" label={showDeviceLabels ? "Perimeter Firewall" : ""} sublabel={synthesized.topology.redundancyModel} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("firewall")} />
        {(showServices || showSecurity) && primaryDmzService(synthesized, primarySite?.name) ? <g><rect x={centerX + 126} y={246} width="120" height="28" rx="14" fill="#eef6ff" stroke="#9ab9ef" /><text x={centerX + 186} y={264} textAnchor="middle" fontSize="11" fill="#24446f">DMZ subnet</text><DeviceIcon x={centerX + 270} y={232} kind="server" label={showDeviceLabels ? "DMZ Host" : ""} sublabel={primaryDmzService(synthesized, primarySite?.name)?.subnetCidr || "Published service"} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("server")} /></g> : null}
        {(showServices || showSecurity) && primaryDmzService(synthesized, primarySite?.name) ? <><g>{renderPath([[centerX + 58, 262], [centerX + 126, 262]], "internet", "dmz", primaryDmzService(synthesized, primarySite?.name)?.ingressInterface || undefined)}</g><g>{renderPath([[centerX + 246, 262], [centerX + 270, 262]], "trunk", "dmz host", primaryDmzService(synthesized, primarySite?.name)?.subnetCidr || undefined)}</g></> : null}
        {renderPath([[centerX, 278], [centerX, 340]], "routed", "inside / routed core", synthesized.routingPlan.find((item) => item.siteId === primarySite?.id)?.summaryAdvertisement || undefined)}

        {!bareCanvas ? <rect x={centerX - 186} y={320} width="372" height="20" rx="10" fill="#eef4ff" stroke="#bfd2f3" /> : null}
        {!bareCanvas ? <text x={centerX} y={334} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#284b78">PRIMARY HUB • POLICY EXCHANGE • SHARED SERVICES BACKBONE</text> : null}

        <rect x={primaryCardX} y={primaryCardY} width={primaryCardWidth} height={primaryCardHeight} rx={28} fill={hqValidationTone.fill} stroke={hqValidationTone.stroke} strokeWidth="2.5" filter="url(#diagram-soft-shadow)" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => primarySite && onSelectTarget?.("SITE", primarySite.id)} />
        <text x={primaryCardX + 34} y={primaryCardY + 36} fontSize="19" fontWeight="700" fill="#16263d" opacity={labelFocusOpacity(labelFocus, "topology")}>{primarySite?.name || project.name}</text>
        {!bareCanvas ? <text x={primaryCardX + 34} y={primaryCardY + 56} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "topology")}>Primary site / policy hub</text> : null}
        {showAddressing ? <text x={primaryCardX + 34} y={primaryCardY + 74} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "addressing")}>{primarySite?.defaultAddressBlock || "No site summary block assigned"}</text> : null}
        {!bareCanvas ? taskBadge(primaryCardX + primaryCardWidth - 34, primaryCardY + 28, hqTaskCount) : null}
        {!bareCanvas && hqValidation.length > 0 ? chip(primaryCardX + primaryCardWidth - 188, primaryCardY + 16, 148, `Validation ${hqValidation.length}`, hqValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null}

        {!bareCanvas ? <rect x={centerX - 236} y={438} width={142} height={118} rx={22} fill="rgba(241,247,255,0.96)" stroke="#c7d8f7" strokeDasharray="7 5" /> : null}
        {!bareCanvas ? <text x={centerX - 220} y={458} fontSize="10.5" fontWeight="700" fill="#284b78">Core routing cluster</text> : null}
        {!bareCanvas ? <text x={centerX - 220} y={474} fontSize="10" fill="#607791">Summaries, north-south control, inter-site path selection.</text> : null}
        {!bareCanvas ? <rect x={centerX - 86} y={442} width={144} height={112} rx={22} fill="rgba(245,249,255,0.96)" stroke="#d1def4" strokeDasharray="7 5" /> : null}
        {!bareCanvas ? <text x={centerX - 70} y={462} fontSize="10.5" fontWeight="700" fill="#284b78">Core switching cluster</text> : null}
        {!bareCanvas ? <text x={centerX - 70} y={478} fontSize="10" fill="#607791">SVIs, trunks, campus switching, local segmentation.</text> : null}
        {!bareCanvas ? <rect x={centerX + 74} y={438} width={166} height={118} rx={22} fill="rgba(247,250,255,0.98)" stroke="#c9d7ee" strokeDasharray="7 5" /> : null}
        {!bareCanvas ? <text x={centerX + 90} y={458} fontSize="10.5" fontWeight="700" fill="#284b78">Shared services cluster</text> : null}
        {!bareCanvas ? <text x={centerX + 90} y={474} fontSize="10" fill="#607791">Server roles, management anchors, shared applications.</text> : null}
        {!bareCanvas ? <rect x={centerX - 42} y={552} width={300} height={108} rx={24} fill="rgba(249,252,255,0.96)" stroke="#d7e5f8" strokeDasharray="7 5" /> : null}
        {!bareCanvas ? <text x={centerX - 26} y={572} fontSize="10.5" fontWeight="700" fill="#284b78">User access and wireless fabric</text> : null}
        {!bareCanvas ? <text x={centerX - 26} y={588} fontSize="10" fill="#607791">Access switching, edge closets, PoE, and staff / guest wireless coverage.</text> : null}

        <DeviceIcon x={primaryRouterPos.x} y={primaryRouterPos.y} kind="router" label={showDeviceLabels ? "Core Routing" : ""} sublabel="Summaries / north-south" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("router")} />
        <DeviceIcon x={primarySwitchPos.x} y={primarySwitchPos.y} kind="core-switch" label={showDeviceLabels ? "Core Switch" : ""} sublabel="Inter-VLAN / trunks" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("core-switch")} />
        <DeviceIcon x={primaryServerPos.x} y={primaryServerPos.y} kind="server" label={showDeviceLabels ? "Shared Services" : ""} sublabel="Server / management" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("server")} />
        <DeviceIcon x={primaryAccessPos.x} y={primaryAccessPos.y} kind="access-switch" label={showDeviceLabels ? "Access Layer" : ""} sublabel="Users / closets / PoE" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("access-switch")} />
        <DeviceIcon x={primaryWirelessPos.x} y={primaryWirelessPos.y} kind="access-point" label={showDeviceLabels ? "Wireless" : ""} sublabel="Staff / guest" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("access-point")} />

        {renderPath([[primaryRouterPos.x + 92, primaryRouterPos.y + 30], [primarySwitchPos.x, primarySwitchPos.y + 30]], "routed", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "router")) || "svi / routed handoff", synthesized.routingPlan.find((item) => item.siteId === primarySite?.id)?.loopbackCidr || undefined)}
        {renderPath([[primarySwitchPos.x + 122, primarySwitchPos.y + 26], [primaryServerPos.x, primaryServerPos.y + 26]], "trunk", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "server")) || "server / service trunk", synthesized.servicePlacements.find((item) => item.siteName === primarySite?.name)?.subnetCidr || undefined)}
        {renderPath([[primaryAccessPos.x + 112, primaryAccessPos.y + 26], [primaryWirelessPos.x, primaryWirelessPos.y + 26]], "trunk", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "access-point")) || "edge access / AP uplink", (requirements.wireless || requirements.guestWifi) ? "staff + guest SSIDs" : undefined)}

        {showOverlayNotes ? overlayRowsForSite(primarySite || sites[0], synthesized, enabledOverlays, 5).map((row, index) => labelFocusMatchesCategory(labelFocus, row.category) ? chip(centerX - 238, 630 + index * 28, 476, row.text, row.tone) : null) : null}

        {cloudNeeded ? (
          <g>
            <rect x={width - 348} y={148} width="268" height="146" rx="28" fill="rgba(244,239,255,0.74)" stroke="#cdb7ff" strokeDasharray="9 7" />
            <text x={width - 324} y={174} fontSize="11.5" fontWeight="700" fill="#5a34a3">Hybrid / cloud edge domain</text>
            <text x={width - 324} y={192} fontSize="10.5" fill="#6e5a97">Cloud attachment, edge termination, and policy exchange stay visually grouped here.</text>
            <DeviceIcon x={width - 250} y={132} kind="cloud" label={showDeviceLabels ? "Cloud" : ""} sublabel={synthesized.topology.cloudConnected ? "Connected" : "Optional"} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("cloud")} />
            <DeviceIcon x={width - 256} y={224} kind="cloud-edge" label={showDeviceLabels ? "Cloud Edge" : ""} sublabel="VNet / VPN / route filters" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("cloud-edge")} />
            {renderPath([[centerX + 58, 262], [width - 220, 262]], "vpn", "Hybrid / cloud transport", requirements.cloudConnectivity || undefined)}
          </g>
        ) : null}

        {branchSites.length ? (
          <g>
            {renderPath([[centerX, primarySiteBottom], [centerX, lowerBusY]], branchRouteType, undefined, undefined)}
            {leftBranchAnchors.length ? renderPath([[centerX, lowerBusY], [leftSpineX, lowerBusY]], branchRouteType, undefined, undefined) : null}
            {rightBranchAnchors.length ? renderPath([[centerX, lowerBusY], [rightSpineX, lowerBusY]], branchRouteType, undefined, undefined) : null}
            {leftBranchAnchors.length ? renderPath([[leftSpineX, lowerBusY], [leftSpineX, Math.max(...leftBranchAnchors.map((entry) => entry.anchorY))]], branchRouteType, undefined, undefined) : null}
            {rightBranchAnchors.length ? renderPath([[rightSpineX, lowerBusY], [rightSpineX, Math.max(...rightBranchAnchors.map((entry) => entry.anchorY))]], branchRouteType, undefined, undefined) : null}
            {branchAnchorBlueprint.map((entry) => {
              const wanLink = synthesized.wanLinks.find((link) => link.endpointASiteId === entry.site.id || link.endpointBSiteId === entry.site.id);
              const trunkX = entry.left ? leftSpineX : rightSpineX;
              return (
                <g key={`branch-route-${entry.site.id}`}>
                  {renderPath(
                    [[trunkX, entry.anchorY], [entry.anchorX, entry.anchorY]],
                    branchRouteType,
                    wanLink?.linkName || (synthesized.topology.topologyType === "hub-spoke" ? "WAN / hub-spoke" : "Inter-site path"),
                    wanLink?.subnetCidr || undefined,
                  )}
                </g>
              );
            })}
          </g>
        ) : null}

        {branchSites.map((site, index) => {
          const left = index % 2 === 0;
          const row = Math.floor(index / 2);
          const x = left ? 76 : width - 76 - branchCardWidth;
          const y = siteRowStartY + row * siteRowGap;
          const boxWidth = branchCardWidth;
          const anchorX = left ? x + boxWidth : x;
          const anchorY = y + siteCardHeight / 2 - 8;
          const siteTaskCount = openTaskCount(comments, "SITE", site.id);
          const siteValidation = siteValidationItems(site, validations);
          const siteValidationTone = validationSeverityTone(siteValidation);
          const edgePlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "firewall" || placement.deviceType === "router"));
          const switchPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "core-switch" || placement.deviceType === "access-switch" || placement.deviceType === "distribution-switch"));
          const serverPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && placement.deviceType === "server");
          const wirelessPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "access-point" || placement.deviceType === "wireless-controller"));
          const edgeDevice = edgePlacement?.deviceType || "router";
          const localOverlay = overlayRowsForSite(site, synthesized, enabledOverlays, 2);
          const edgeValidation = deviceValidationItems(edgePlacement, site, validations, synthesized);
          const switchValidation = deviceValidationItems(switchPlacement, site, validations, synthesized);
          const edgeInterfaceValidation = interfaceValidationItems(edgePlacement, site, validations, synthesized);
          const switchInterfaceValidation = interfaceValidationItems(switchPlacement, site, validations, synthesized);
          const pathValidation = linkValidationItems(site, validations, synthesized);
          const zoneLabels = boundaryLabelsForSite(site.name, synthesized);
          const zoneRects = zoneBoundaryRectsForSite(site.name, synthesized);
          const edgeStack = compactInterfaceStack(edgePlacement, 2);
          const switchStack = compactInterfaceStack(switchPlacement, 2);
          const dmzBoundary = dmzBoundaryForSite(site.name, synthesized);
          const managementBoundary = managementBoundaryForSite(site.name, synthesized);
          const dmzService = primaryDmzService(synthesized, site.name);

          return (
            <g key={site.id}>
              <rect x={x} y={y} width={boxWidth} height={siteCardHeight} rx={24} fill={siteValidationTone.fill} stroke={siteValidationTone.stroke} strokeWidth="2.3" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 20} y={y + 30} fontSize="17" fontWeight="700" fill="#16263d" opacity={labelFocusOpacity(labelFocus, "topology")}>{site.name}</text>
              {showAddressing ? <text x={x + 20} y={y + 49} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "addressing")}>{site.defaultAddressBlock || "No site block assigned"}</text> : null}
              {!bareCanvas ? <text x={x + 20} y={y + 64} fontSize="10.5" fill="#526984" opacity={labelFocusOpacity(labelFocus, "topology")}>{siteRoleSummary(site.name, synthesized)}</text> : null}
              {!bareCanvas ? <text x={x + 20} y={y + 78} fontSize="10.2" fill="#5b708d" opacity={labelFocusOpacity(labelFocus, "topology")}>VLANs {siteVlanCount(site)} • Services {siteServiceCount(site.name)} • WAN {siteWanLabel(site.id)}</text> : null}
              {!bareCanvas ? <circle cx={x + boxWidth - 48} cy={y + 54} r="13" fill="#eef5ff" stroke="#bfd2f3" /> : null}
              {!bareCanvas ? <text x={x + boxWidth - 48} y={y + 58} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#284b78">{index + 1}</text> : null}
              {!bareCanvas ? chip(x + 18, y + 18, 106, left ? `Row ${row + 1} left` : `Row ${row + 1} right`, "blue") : null}
              {!bareCanvas ? chip(x + 182, y + 46, 110, site.name === synthesized.topology.primarySiteName ? "Primary hub" : "Attached site", siteTierTone(site.name, synthesized)) : null}
              {!bareCanvas ? taskBadge(x + boxWidth - 28, y + 24, siteTaskCount) : null}
              {!bareCanvas && siteValidation.length > 0 ? chip(x + 150, y + 18, 132, `Validation ${siteValidation.length}`, siteValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null}

              {!bareCanvas ? <rect x={x + 8} y={y + 86} width={112} height={92} rx={16} fill="#f8fbff" stroke="#c7d8f7" strokeDasharray="6 4" /> : null}
              {!bareCanvas ? <text x={x + 20} y={y + 100} fontSize="10.5" fill="#526984">Perimeter / edge zone group</text> : null}
              {!bareCanvas ? <rect x={x + 118} y={y + 90} width={122} height={88} rx={16} fill="#f9fcff" stroke="#d6e4fb" strokeDasharray="6 4" /> : null}
              {!bareCanvas ? <text x={x + 130} y={y + 104} fontSize="10.5" fill="#526984">Core / access zone group</text> : null}
                            {!bareCanvas && site.name === synthesized.topology.primarySiteName ? <rect x={x + 8} y={y + 58} width={boxWidth - 16} height="12" rx="6" fill="#eef4ff" stroke="#bfd2f3" /> : null}
              {!bareCanvas && site.name === synthesized.topology.primarySiteName ? <text x={x + boxWidth / 2} y={y + 67} textAnchor="middle" fontSize="10" fontWeight="700" fill="#284b78" opacity={labelFocusOpacity(labelFocus, "topology")}>PRIMARY / SHARED-SERVICE / POLICY HUB</text> : null}

              <DeviceIcon x={bareCanvas ? x + 28 : x + 16} y={bareCanvas ? y + 78 : y + 96} kind={edgeDevice} label={showDeviceLabels ? (edgePlacement?.deviceName || deviceLabel(edgeDevice)) : ""} sublabel={`${edgePlacement?.role || "Site edge / VPN"}${edgePlacement?.uplinkTarget ? ` • uplink ${edgePlacement.uplinkTarget}` : ""}`} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice(edgeDevice)} />
              <DeviceIcon x={bareCanvas ? x + 176 : x + 132} y={bareCanvas ? y + 78 : y + 98} kind={switchPlacement?.deviceType || "access-switch"} label={showDeviceLabels ? (switchPlacement?.deviceName || deviceLabel(switchPlacement?.deviceType || "access-switch")) : ""} sublabel={`${switchPlacement?.role || "Users / trunks"}${switchPlacement?.uplinkTarget ? ` • uplink ${switchPlacement.uplinkTarget}` : ""}`} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice(switchPlacement?.deviceType || "access-switch")} />
              {wirelessPlacement ? <DeviceIcon x={bareCanvas ? x + 120 : x + 254} y={bareCanvas ? y + 198 : y + 102} kind={wirelessPlacement.deviceType} label={showDeviceLabels ? wirelessPlacement.deviceName : ""} sublabel={`${wirelessPlacement.role}${wirelessPlacement.uplinkTarget ? ` • uplink ${wirelessPlacement.uplinkTarget}` : ""}`} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice(wirelessPlacement.deviceType)} /> : null}
              {(!bareCanvas || showServices) && serverPlacement ? <DeviceIcon x={bareCanvas ? x + 234 : x + 214} y={bareCanvas ? y + 28 : y + 26} kind="server" label={showDeviceLabels ? serverPlacement.deviceName : ""} sublabel={serverPlacement.connectedSubnets[0] || serverPlacement.role} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("server")} /> : null}
              {renderPath([bareCanvas ? [x + 146, y + 112] : [x + 118, y + 125], bareCanvas ? [x + 176, y + 112] : [x + 132, y + 125]], "routed", firstInterfaceLabel(edgePlacement) || "inside", synthesized.addressingPlan.find((row) => row.siteId === site.id)?.gatewayIp || undefined)}
              {wirelessPlacement ? renderPath(orthogonalVH(bareCanvas ? [x + 232, y + 112] : [x + 244, y + 125], bareCanvas ? [x + 176, y + 212] : [x + 254, y + 125], y + (bareCanvas ? 168 : 142)), "trunk", firstInterfaceLabel(wirelessPlacement) || "wireless / access", localOverlay[0]?.text || undefined) : null}

              {showAddressing || showRedundancy ? edgeStack.map((item, itemIndex) => chip(x + 18, y + 178 + itemIndex * 24, boxWidth - 36, item, "green")) : null}
              {showAddressing || showRedundancy ? switchStack.map((item, itemIndex) => chip(x + 18, y + 226 + itemIndex * 24, boxWidth - 36, item, "blue")) : null}
              {showSecurity ? zoneLabels.slice(0, 1).map((item, itemIndex) => chip(x + 18, y + 274 + itemIndex * 24, boxWidth - 36, item, "purple")) : null}
              {showOverlayNotes ? localOverlay.slice(0, 2).map((item, itemIndex) => labelFocusMatchesCategory(labelFocus, item.category) ? chip(x + 18, y + 298 + itemIndex * 24, boxWidth - 36, item.text, item.tone) : null) : null}
              {showSecurity && dmzBoundary ? <text x={x + 18} y={y + 320} fontSize="10.2" fill="#5a34a3" opacity={labelFocusOpacity(labelFocus, "zones")}>DMZ boundary: {dmzBoundary.attachedDevice}{dmzBoundary.attachedInterface ? ` • ${dmzBoundary.attachedInterface}` : ''}</text> : null}
              {showSecurity && managementBoundary ? <text x={x + 18} y={y + 334} fontSize="10.2" fill="#24446f" opacity={labelFocusOpacity(labelFocus, "zones")}>Management boundary: {managementBoundary.controlPoint}</text> : null}

              {!bareCanvas ? edgeInterfaceValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-edge-if-validation-${itemIndex}`} x={x + 18} y={y + 352 + itemIndex * 14} fontSize="10.2" fill="#9a3412">Edge interface: {item.title}</text>) : null}
              {!bareCanvas ? switchInterfaceValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-switch-if-validation-${itemIndex}`} x={x + 18} y={y + 366 + itemIndex * 14} fontSize="10.2" fill="#9a3412">Switch interface: {item.title}</text>) : null}
              {!bareCanvas ? pathValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-path-validation-${itemIndex}`} x={x + 18} y={y + 380 + itemIndex * 14} fontSize="10.2" fill="#9a3412">Path/link: {item.title}</text>) : null}
              {!bareCanvas ? edgeValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-edge-validation-${itemIndex}`} x={x + 18} y={y + 394 + itemIndex * 14} fontSize="10.2" fill="#9a3412">Edge role: {item.title}</text>) : null}
              {!bareCanvas ? switchValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-switch-validation-${itemIndex}`} x={x + 18} y={y + 408 + itemIndex * 14} fontSize="10.2" fill="#9a3412">Switching role: {item.title}</text>) : null}

              {showSecurity ? zoneRects.slice(0, 2).map((zone, zoneIndex) => <text key={`${site.id}-zone-rect-${zoneIndex}`} x={x + 214} y={y + 186 + zoneIndex * 14} fontSize="10.2" fill="#5a34a3">{zone.label}: {zone.anchor}</text>) : null}
              {(showServices || showSecurity) && dmzService ? <g>{renderPath([[x + 66, y + 118], [x + 252, y + 74]], 'internet', 'Published-service path', dmzService.ingressInterface || dmzService.subnetCidr || undefined)}<rect x={x + 234} y={y + 28} width="68" height="18" rx="9" fill="#eef6ff" stroke="#9ab9ef" /><text x={x + 268} y={y + 40} textAnchor="middle" fontSize="10" fill="#24446f">DMZ subnet</text>{renderPath([[x + 268, y + 46], [x + 268, y + 62]], 'trunk', 'Published host', dmzService.subnetCidr || undefined)}{showSecurity && managementBoundary ? renderPath([[x + 184, y + 122], [x + 268, y + 62]], 'ha', 'Management-only path', managementBoundary.attachedInterface || managementBoundary.zoneName) : null}</g> : null}
            </g>
          );
        })}

        {labelFocusMatchesCategory(labelFocus, "flows") && flowOverlays.length && !bareCanvas ? (
          <g>
            <rect x={48} y={flowLaneStartY - 42} width={width - 96} height={flowLaneHeight + 40} rx={32} fill="rgba(255, 247, 237, 0.82)" stroke="#fdba74" strokeDasharray="10 8" />
            <text x={78} y={flowLaneStartY - 14} fontSize="12.5" fontWeight="700" fill="#9a3412">Critical flow review lane</text>
            <text x={78} y={flowLaneStartY + 4} fontSize="11" fill="#9a3412">When flow labels are enabled, traffic paths move below the site fabric so larger enterprise layouts can keep growing downward without overlap.</text>
          </g>
        ) : null}

        {labelFocusMatchesCategory(labelFocus, "flows") ? flowOverlays.map((flow, index) => {
          const baseY = flowLaneStartY + index * 84;
          return (
            <g key={flow.id}>
              {renderPath([[86, baseY], [width - 86, baseY]], "flow", `${flow.flowLabel} • ${flow.sourceZone} → ${flow.destinationZone}`)}
              {!bareCanvas ? <text x={92} y={baseY + 22} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "flows")}>Path: {flow.path.join(" → ")}</text> : null}
              {!bareCanvas ? <text x={92} y={baseY + 40} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "flows")}>Control points: {flow.controlPoints.join(", ")}</text> : null}
              {!bareCanvas ? <text x={92} y={baseY + 58} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "flows")}>NAT / policy: {flow.natBehavior} • {flow.enforcementPolicy}</text> : null}
            </g>
          );
        }) : null}


        {!bareCanvas ? (
          <>
            <g>
              <rect x={48} y={legendDockY} width="316" height="122" rx="20" fill="rgba(255,255,255,0.92)" stroke="#d5e1f2" filter="url(#diagram-soft-shadow)" />
              <text x={72} y={legendDockY + 24} fontSize="12.5" fontWeight="700" fill="#284b78">Site index</text>
              <text x={72} y={legendDockY + 42} fontSize="10.8" fill="#607791">Primary plus the first attached sites visible on this canvas.</text>
              {siteIndexItems.map((site, index) => (
                <g key={`${site.id}-site-index`}>
                  <circle cx={74} cy={legendDockY + 64 + index * 14} r="3.6" fill={index === 0 ? "#1d7f4c" : "#4d6fa8"} />
                  <text x={84} y={legendDockY + 68 + index * 14} fontSize="10.6" fill="#34506f">{site.name}</text>
                  <text x={186} y={legendDockY + 68 + index * 14} fontSize="10.2" fill="#607791">{site.defaultAddressBlock || "No summary block"}</text>
                </g>
              ))}
            </g>
            <g>
              <rect x={width - 322} y={legendDockY} width="274" height="122" rx="20" fill="rgba(255,255,255,0.9)" stroke="#d5e1f2" filter="url(#diagram-soft-shadow)" />
              <text x={width - 298} y={legendDockY + 24} fontSize="12.5" fontWeight="700" fill="#284b78">Physical legend</text>
              <text x={width - 298} y={legendDockY + 42} fontSize="10.8" fill="#607791">Read top-down: transport → primary hub → branches → flows.</text>
              <line x1={width - 292} y1={legendDockY + 66} x2={width - 228} y2={legendDockY + 66} stroke="#85a7e6" strokeWidth="3" />
              <text x={width - 220} y={legendDockY + 70} fontSize="10.5" fill="#4d6280">Routed / inside</text>
              <line x1={width - 292} y1={legendDockY + 88} x2={width - 228} y2={legendDockY + 88} stroke="#1d7f4c" strokeWidth="3" strokeDasharray="10 5" />
              <text x={width - 220} y={legendDockY + 92} fontSize="10.5" fill="#4d6280">VPN / WAN overlay</text>
              <line x1={width - 292} y1={legendDockY + 110} x2={width - 228} y2={legendDockY + 110} stroke="#ff7a59" strokeWidth="3" />
              <text x={width - 220} y={legendDockY + 114} fontSize="10.5" fill="#4d6280">Critical flow</text>
            </g>
          </>
        ) : null}
        </g>
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

function DeviceSymbolLibraryPanel() {
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

function OverlayReviewPanel({ overlay }: { overlay: OverlayMode }) {
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

function ConnectionSemanticsPanel() {
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




function LinkTypeRenderingPanel({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
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


function TopologySpecificRenderingPanel({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
  const topologyLabel = synthesized.topology.topologyType;
  const hubLabel = synthesized.topology.primarySiteName || synthesized.siteHierarchy[0]?.name || "Primary site";
  const items = topologyLabel === "hub-spoke"
    ? [
        { title: "Hub-and-spoke behavior", detail: `The primary site ${hubLabel} should visually read as the concentration point for shared services, WAN attachment, and most branch-bound traffic review.` },
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
          v116 pushes the diagram stage further toward topology-aware rendering. The same symbol library should not read the same way for hub-and-spoke, campus/collapsed-core, and cloud-connected patterns.
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

function SiteDeviceLinkMatrixPanel({ synthesized, siteIds }: { synthesized: SynthesizedLogicalDesign; siteIds?: string[] }) {
  const allowedIds = siteIds && siteIds.length > 0 ? new Set(siteIds) : null;
  const siteRows = synthesized.siteHierarchy.filter((site) => !allowedIds || allowedIds.has(site.id)).map((site) => {
    const placements = synthesized.sitePlacements.filter((placement) => placement.siteId === site.id);
    const edge = placements.find((placement) => placement.deviceType === 'firewall' || placement.deviceType === 'router');
    const switching = placements.find((placement) => placement.deviceType === 'core-switch' || placement.deviceType === 'distribution-switch' || placement.deviceType === 'access-switch');
    const wireless = placements.find((placement) => placement.deviceType === 'wireless-controller' || placement.deviceType === 'access-point');
    const services = synthesized.servicePlacements.filter((service) => service.siteName === site.name).slice(0, 3);
    const transit = synthesized.wanLinks.filter((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id);
    const primaryBoundary = synthesized.securityBoundaries.find((boundary) => boundary.siteName === site.name);
    return {
      id: site.id,
      siteName: site.name,
      tier: site.source === "configured" ? "configured" : "proposed",
      edge: edge ? `${edge.deviceName} • ${edge.deviceType}` : 'Not synthesized',
      switching: switching ? `${switching.deviceName} • ${switching.deviceType}` : 'Not synthesized',
      wireless: wireless ? `${wireless.deviceName} • ${wireless.deviceType}` : 'None / not synthesized',
      links: transit.length > 0 ? transit.map((link) => `${link.linkName} • ${link.transport}`).join(', ') : (synthesized.topology.topologyType === 'collapsed-core' ? 'Local switched core' : 'Local edge only'),
      boundary: primaryBoundary ? `${primaryBoundary.zoneName} • ${primaryBoundary.controlPoint}` : 'Boundary not explicit yet',
      services: services.length > 0 ? services.map((service) => service.serviceName).join(', ') : 'No anchored services yet',
    };
  });

  return (
    <div className="diagram-site-matrix-panel">
      <div>
        <strong style={{ display: 'block', marginBottom: 6 }}>Site / device / link matrix</strong>
        <p className="muted" style={{ margin: 0 }}>Use this matrix to confirm that every site has the right edge role, switching posture, transport behavior, and service or boundary anchors before trusting the diagram as a design artifact.</p>
      </div>
      <div style={{ overflowX: 'auto' }}>
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
                <td>{row.links}</td>
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

function TopologyObjectPanel({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
  const primarySite = synthesized.topology.primarySiteName || synthesized.siteHierarchy[0]?.name || "Not assigned";
  const serviceAnchors = Array.from(new Set(synthesized.servicePlacements.slice(0, 6).map((item) => `${item.serviceName} • ${item.placementType === "cloud" ? "cloud" : item.siteName || item.zoneName}`)));
  return (
    <div className="diagram-topology-object-panel">
      <div className="diagram-topology-object-card">
        <strong style={{ display: "block", marginBottom: 6 }}>Topology object model</strong>
        <p style={{ margin: "0 0 10px 0", color: "#61758f" }}>
          v114 makes the diagram stage more explicit about the underlying topology object: what architecture pattern is being drawn, where the primary edge sits, how breakout is expected, and which service anchors should appear in review.
        </p>
        <div className="diagram-topology-object-grid">
          <div><span>Pattern</span><strong>{synthesized.topology.topologyLabel}</strong></div>
          <div><span>Primary site</span><strong>{primarySite}</strong></div>
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

function OverlayBehaviorPanel({ overlay }: { overlay: OverlayMode }) {
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

function TopologyFoundationPanel({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
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



function DeviceRealismDirectionPanel() {
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

function TopologyBehaviorMatrixPanel({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
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

function OverlayEvidencePanel({ overlay, synthesized }: { overlay: OverlayMode; synthesized: SynthesizedLogicalDesign }) {
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
  const key = overlay === "none" ? "placement" : overlay;
  return (
    <div className="diagram-evidence-panel">
      <strong style={{ display: "block", marginBottom: 8 }}>Overlay evidence snapshot</strong>
      <div className="diagram-evidence-grid">
        {evidence[key].map((item) => (
          <div key={item} className="diagram-evidence-card">{item}</div>
        ))}
      </div>
    </div>
  );
}

function DiagramReviewSequencePanel({ overlay }: { overlay: OverlayMode }) {
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


function LabelFocusPanel({ labelFocus }: { labelFocus: LabelFocus }) {
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

function buildDiagramReviewPresets(focusedSiteId?: string): Array<{ key: DiagramReviewPresetKey; label: string; detail: string; mode: DiagramMode; scope: DiagramScope; overlay: OverlayMode; density: DiagramDensity; labelMode: DiagramLabelMode; linkAnnotationMode: LinkAnnotationMode; labelFocus: LabelFocus; deviceFocus: DeviceFocus; linkFocus: LinkFocus; focusedSiteId?: string; }> {
  return [
    { key: "architecture", label: "Architecture review", detail: "Global placement baseline for edge, switching, and shared anchors.", mode: "logical", scope: "global", overlay: "none", density: "guided", labelMode: "essential", linkAnnotationMode: "minimal", labelFocus: "topology", deviceFocus: "all", linkFocus: "all" },
    { key: "site-lld", label: "Site LLD", detail: "Per-site review for local topology, labels, and service anchors.", mode: "physical", scope: "site", overlay: "addressing", density: "expanded", labelMode: "detailed", linkAnnotationMode: "full", labelFocus: "addressing", deviceFocus: "all", linkFocus: "access", focusedSiteId },
    { key: "transport", label: "Transport / WAN", detail: "WAN, cloud edge, and redundancy posture review.", mode: "logical", scope: "wan-cloud", overlay: "redundancy", density: "guided", labelMode: "essential", linkAnnotationMode: "full", labelFocus: "transport", deviceFocus: "edge", linkFocus: "transport" },
    { key: "boundaries", label: "Trust boundaries", detail: "Boundary and enforcement review across edge, DMZ, guest, and management zones.", mode: "logical", scope: "boundaries", overlay: "security", density: "guided", labelMode: "detailed", linkAnnotationMode: "full", labelFocus: "zones", deviceFocus: "edge", linkFocus: "security" },
    { key: "services", label: "Service placement", detail: "Local, centralized, DMZ, and cloud-hosted service anchoring.", mode: "logical", scope: "global", overlay: "services", density: "guided", labelMode: "essential", linkAnnotationMode: "minimal", labelFocus: "topology", deviceFocus: "services", linkFocus: "all" },
    { key: "critical-flows", label: "Critical flows", detail: "Trace critical movement and control points through the current design.", mode: "logical", scope: "wan-cloud", overlay: "flows", density: "expanded", labelMode: "essential", linkAnnotationMode: "full", labelFocus: "flows", deviceFocus: "all", linkFocus: "flows" },
  ];
}

function activePresetKeyForState(mode: DiagramMode, scope: DiagramScope, overlay: OverlayMode): DiagramReviewPresetKey | undefined {
  if (mode === "logical" && scope === "global" && overlay === "none") return "architecture";
  if (mode === "physical" && scope === "site" && overlay === "addressing") return "site-lld";
  if (mode === "logical" && scope === "wan-cloud" && overlay === "redundancy") return "transport";
  if (mode === "logical" && scope === "boundaries" && overlay === "security") return "boundaries";
  if (mode === "logical" && scope === "global" && overlay === "services") return "services";
  if (mode === "logical" && scope === "wan-cloud" && overlay === "flows") return "critical-flows";
  return undefined;
}

export function ProjectDiagram({ project, comments = [], validations = [], onSelectTarget, compact = false, minimalWorkspace = false, controls }: ProjectDiagramProps) {
  const sites = (project.sites ?? []) as SiteWithVlans[];
  const svgId = `diagram-${project.id}`;
  const [internalMode, setInternalMode] = useState<DiagramMode>("logical");
  const [internalOverlay, setInternalOverlay] = useState<OverlayMode>("none");
  const [internalActiveOverlays] = useState<ActiveOverlayMode[]>([]);
  const [internalScope, setInternalScope] = useState<DiagramScope>("global");
  const [internalWorkspaceDensity, setInternalWorkspaceDensity] = useState<DiagramDensity>("guided");
  const [internalLabelMode, setInternalLabelMode] = useState<DiagramLabelMode>("essential");
  const [internalLinkAnnotationMode, setInternalLinkAnnotationMode] = useState<LinkAnnotationMode>("minimal");
  const [internalLabelFocus, setInternalLabelFocus] = useState<LabelFocus>("all");
  const [internalDeviceFocus, setInternalDeviceFocus] = useState<DeviceFocus>("all");
  const [internalLinkFocus, setInternalLinkFocus] = useState<LinkFocus>("all");
  const [internalFocusedSiteId, setInternalFocusedSiteId] = useState<string>(sites[0]?.id ?? "");
  const mode = controls?.mode ?? internalMode;
  const overlay = controls?.overlay ?? internalOverlay;
  const activeOverlays = controls?.activeOverlays ?? (overlay === "none" ? internalActiveOverlays : [overlay]);
  const scope = controls?.scope ?? internalScope;
  const workspaceDensity = controls?.workspaceDensity ?? internalWorkspaceDensity;
  const labelMode = controls?.labelMode ?? internalLabelMode;
  const linkAnnotationMode = controls?.linkAnnotationMode ?? internalLinkAnnotationMode;
  const labelFocus = controls?.labelFocus ?? internalLabelFocus;
  const deviceFocus = controls?.deviceFocus ?? internalDeviceFocus;
  const linkFocus = controls?.linkFocus ?? internalLinkFocus;
  const focusedSiteId = controls?.focusedSiteId ?? internalFocusedSiteId;
  const bareCanvas = controls?.bareCanvas ?? minimalWorkspace;
  const isExternallyControlled = Boolean(controls);
  const renderBareCanvas = isExternallyControlled || minimalWorkspace || bareCanvas || compact;
  const setMode = controls?.mode !== undefined ? (_next: DiagramMode) => {} : setInternalMode;
  const setOverlay = controls?.overlay !== undefined ? (_next: OverlayMode) => {} : setInternalOverlay;
  const setScope = controls?.scope !== undefined ? (_next: DiagramScope) => {} : setInternalScope;
  const setWorkspaceDensity = controls?.workspaceDensity !== undefined ? (_next: DiagramDensity) => {} : setInternalWorkspaceDensity;
  const setLabelMode = controls?.labelMode !== undefined ? (_next: DiagramLabelMode) => {} : setInternalLabelMode;
  const setLinkAnnotationMode = controls?.linkAnnotationMode !== undefined ? (_next: LinkAnnotationMode) => {} : setInternalLinkAnnotationMode;
  const setLabelFocus = controls?.labelFocus !== undefined ? (_next: LabelFocus) => {} : setInternalLabelFocus;
  const setDeviceFocus = controls?.deviceFocus !== undefined ? (_next: DeviceFocus) => {} : setInternalDeviceFocus;
  const setLinkFocus = controls?.linkFocus !== undefined ? (_next: LinkFocus) => {} : setInternalLinkFocus;
  const setFocusedSiteId = controls?.focusedSiteId !== undefined ? (_next: string) => {} : setInternalFocusedSiteId;
  const requirements = parseRequirementsProfile(project.requirementsJson);
  const allVlans = sites.flatMap((site) => site.vlans ?? []);
  const synthesized = useMemo(() => synthesizeLogicalDesign(project, sites, allVlans, requirements), [project, sites, allVlans, requirements]);
  const scopedSites = useMemo(() => sitesForDiagramScope(sites, synthesized, scope, focusedSiteId), [sites, synthesized, scope, focusedSiteId]);
  const focusedSite = useMemo(() => sites.find((site) => site.id === focusedSiteId) || scopedSites[0] || sites[0], [sites, scopedSites, focusedSiteId]);
  const scopeMeta = useMemo(() => diagramScopeMeta(scope, synthesized, focusedSite), [scope, synthesized, focusedSite]);
  const scopedFlows = useMemo(() => flowsForDiagramScope(synthesized.trafficFlows, scope, focusedSite?.name), [synthesized.trafficFlows, scope, focusedSite]);
  const scopedBoundaryIds = useMemo(() => new Set(scopedSites.map((site) => site.name)), [scopedSites]);
  const scopedBoundaryCount = synthesized.securityBoundaries.filter((boundary) => scopedBoundaryIds.has(boundary.siteName)).length;
  const scopedPlacementCount = synthesized.sitePlacements.filter((placement) => scopedSites.some((site) => site.id === placement.siteId)).length;
  const scopedServiceCount = synthesized.servicePlacements.filter((placement) => placement.siteId ? scopedSites.some((site) => site.id === placement.siteId) : placement.siteName ? scopedBoundaryIds.has(placement.siteName) : false).length;
  const scopeFilename = scope === "site" ? `site-${(focusedSite?.name || "focus").replace(/\s+/g, "-").toLowerCase()}` : scope;
  const baseFilename = useMemo(() => `${project.name.replace(/\s+/g, "-").toLowerCase()}-${mode}-${overlay}-${scopeFilename}-diagram`, [mode, overlay, scopeFilename, project.name]);
  const reviewPresets = useMemo(() => buildDiagramReviewPresets(focusedSite?.id || sites[0]?.id), [focusedSite?.id, sites]);
  const activePresetKey = useMemo(() => activePresetKeyForState(mode, scope, overlay), [mode, scope, overlay]);
  const activePreset = reviewPresets.find((preset) => preset.key === activePresetKey) || null;
  const topologyBehaviorSummary = useMemo(() => topologyScopeBehaviorSummary(scope, synthesized, focusedSite), [scope, synthesized, focusedSite]);
  const showNarrativePanels = !compact && !minimalWorkspace && !isExternallyControlled;
  const showSupportPanels = workspaceDensity === "expanded" && !compact && !minimalWorkspace && !isExternallyControlled;
  const densityLabel = workspaceDensity === "guided" ? "Guided" : "Expanded";

  const applyPreset = (presetKey: DiagramReviewPresetKey) => {
    const preset = reviewPresets.find((item) => item.key === presetKey);
    if (!preset) return;
    setMode(preset.mode);
    setScope(preset.scope);
    setOverlay(preset.overlay);
    setWorkspaceDensity(preset.density);
    setLabelMode(preset.labelMode);
    setLinkAnnotationMode(preset.linkAnnotationMode);
    setLabelFocus(preset.labelFocus);
    setDeviceFocus(preset.deviceFocus);
    setLinkFocus(preset.linkFocus);
    if (preset.scope === "site") {
      setFocusedSiteId(preset.focusedSiteId || focusedSite?.id || sites[0]?.id || "");
    }
  };

  if (sites.length === 0) {
    return renderBareCanvas
      ? <div className="panel diagram-minimal-panel"><div className="diagram-empty-message">Add sites and VLANs to generate a topology diagram.</div></div>
      : <div className="panel"><div className="diagram-toolbar"><div><h2 style={{ marginBottom: 6 }}>Diagram</h2><p className="muted" style={{ margin: 0 }}>Add sites and VLANs to generate a topology diagram.</p></div></div></div>;
  }

  if (renderBareCanvas) {
    return (
      <div className="panel diagram-minimal-panel">
        {mode === "logical"
          ? <LogicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} validations={validations} overlay={overlay} activeOverlays={activeOverlays} scope={scope} focusedSiteId={focusedSite?.id} labelMode={labelMode} linkAnnotationMode={linkAnnotationMode} labelFocus={labelFocus} deviceFocus={deviceFocus} linkFocus={linkFocus} onSelectTarget={onSelectTarget} bareCanvas />
          : <PhysicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} validations={validations} overlay={overlay} activeOverlays={activeOverlays} scope={scope} focusedSiteId={focusedSite?.id} labelMode={labelMode} linkAnnotationMode={linkAnnotationMode} labelFocus={labelFocus} deviceFocus={deviceFocus} linkFocus={linkFocus} onSelectTarget={onSelectTarget} bareCanvas />}
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="diagram-toolbar" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>{compact ? "Topology canvas" : "Generated Topology Diagram"}</h2>
          <p className="muted" style={{ margin: 0 }}>{compact ? "Use the canvas as the main workspace. Switch view, overlay, scope, and focus from the control strip, then review the supporting details from the diagram navigator." : "This recovery pass keeps the diagram work tied to the roadmap: real layout modes, guided-vs-expanded density control, stronger link semantics, and clearer label discipline so the workspace behaves more like a real topology review surface."}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="diagram-toggle">
            <button type="button" className={mode === "logical" ? "active" : ""} onClick={() => setMode("logical")}>Logical Topology</button>
            <button type="button" className={mode === "physical" ? "active" : ""} onClick={() => setMode("physical")}>Physical / Topology</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={scope === "global" ? "active" : ""} onClick={() => setScope("global")}>Global</button>
            <button type="button" className={scope === "site" ? "active" : ""} onClick={() => setScope("site")}>Per-site</button>
            <button type="button" className={scope === "wan-cloud" ? "active" : ""} onClick={() => setScope("wan-cloud")}>WAN / Cloud</button>
            <button type="button" className={scope === "boundaries" ? "active" : ""} onClick={() => setScope("boundaries")}>Boundaries</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={overlay === "none" ? "active" : ""} onClick={() => setOverlay("none")}>Placement</button>
            <button type="button" className={overlay === "addressing" ? "active" : ""} onClick={() => setOverlay("addressing")}>Addressing</button>
            <button type="button" className={overlay === "services" ? "active" : ""} onClick={() => setOverlay("services")}>Services</button>
            <button type="button" className={overlay === "security" ? "active" : ""} onClick={() => setOverlay("security")}>Security</button>
            <button type="button" className={overlay === "redundancy" ? "active" : ""} onClick={() => setOverlay("redundancy")}>Redundancy</button>
            <button type="button" className={overlay === "flows" ? "active" : ""} onClick={() => setOverlay("flows")}>Flows</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={workspaceDensity === "guided" ? "active" : ""} onClick={() => setWorkspaceDensity("guided")}>Guided</button>
            <button type="button" className={workspaceDensity === "expanded" ? "active" : ""} onClick={() => setWorkspaceDensity("expanded")}>Expanded</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={labelMode === "essential" ? "active" : ""} onClick={() => setLabelMode("essential")}>Essential labels</button>
            <button type="button" className={labelMode === "detailed" ? "active" : ""} onClick={() => setLabelMode("detailed")}>Detailed labels</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={linkAnnotationMode === "minimal" ? "active" : ""} onClick={() => setLinkAnnotationMode("minimal")}>Minimal link notes</button>
            <button type="button" className={linkAnnotationMode === "full" ? "active" : ""} onClick={() => setLinkAnnotationMode("full")}>Full link notes</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={deviceFocus === "all" ? "active" : ""} onClick={() => setDeviceFocus("all")}>All devices</button>
            <button type="button" className={deviceFocus === "edge" ? "active" : ""} onClick={() => setDeviceFocus("edge")}>Edge</button>
            <button type="button" className={deviceFocus === "switching" ? "active" : ""} onClick={() => setDeviceFocus("switching")}>Switching</button>
            <button type="button" className={deviceFocus === "wireless" ? "active" : ""} onClick={() => setDeviceFocus("wireless")}>Wireless</button>
            <button type="button" className={deviceFocus === "services" ? "active" : ""} onClick={() => setDeviceFocus("services")}>Services</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={linkFocus === "all" ? "active" : ""} onClick={() => setLinkFocus("all")}>All links</button>
            <button type="button" className={linkFocus === "transport" ? "active" : ""} onClick={() => setLinkFocus("transport")}>Transport</button>
            <button type="button" className={linkFocus === "access" ? "active" : ""} onClick={() => setLinkFocus("access")}>Access</button>
            <button type="button" className={linkFocus === "security" ? "active" : ""} onClick={() => setLinkFocus("security")}>Security</button>
            <button type="button" className={linkFocus === "flows" ? "active" : ""} onClick={() => setLinkFocus("flows")}>Flows</button>
          </div>
          <div className="diagram-toggle">
            <button type="button" className={labelFocus === "all" ? "active" : ""} onClick={() => setLabelFocus("all")}>All labels</button>
            <button type="button" className={labelFocus === "topology" ? "active" : ""} onClick={() => setLabelFocus("topology")}>Topology</button>
            <button type="button" className={labelFocus === "addressing" ? "active" : ""} onClick={() => setLabelFocus("addressing")}>Addressing</button>
            <button type="button" className={labelFocus === "zones" ? "active" : ""} onClick={() => setLabelFocus("zones")}>Zones</button>
            <button type="button" className={labelFocus === "transport" ? "active" : ""} onClick={() => setLabelFocus("transport")}>Transport</button>
            <button type="button" className={labelFocus === "flows" ? "active" : ""} onClick={() => setLabelFocus("flows")}>Flows</button>
          </div>
          {scope === "site" ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4f6582" }}>
              <span>Site focus</span>
              <select value={focusedSite?.id || ""} onChange={(event) => setFocusedSiteId(event.target.value)}>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" onClick={() => exportSvg(svgId, `${baseFilename}.svg`)}>Export SVG</button>
          <button type="button" onClick={() => { void exportPng(svgId, `${baseFilename}.png`); }}>Export PNG</button>
        </div>
      </div>

      {showNarrativePanels ? (
        <div className="diagram-note-grid" style={{ marginBottom: 12 }}>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Guided review presets</strong>
            <p style={{ margin: "0 0 10px 0", color: "#61758f" }}>{activePreset ? `${activePreset.label} is currently active.` : "Choose a preset to move the workspace into a stronger engineering review posture without manually toggling each control."}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {reviewPresets.map((preset) => (
                <button key={preset.key} type="button" className={activePresetKey === preset.key ? "active" : ""} onClick={() => applyPreset(preset.key)}>{preset.label}</button>
              ))}
            </div>
            <p style={{ margin: "10px 0 0 0", color: "#61758f" }}>{activePreset?.detail || "Review presets align scope, overlay, and mode around the main engineering checks that still matter most in the recovery roadmap."}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>{scopeMeta.title}</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{scopeMeta.detail}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Current evidence in scope</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{scopedSites.length} site{scopedSites.length === 1 ? "" : "s"}, {scopedPlacementCount} placement object{scopedPlacementCount === 1 ? "" : "s"}, {scopedServiceCount} service anchor{scopedServiceCount === 1 ? "" : "s"}, {scopedBoundaryCount} boundary object{scopedBoundaryCount === 1 ? "" : "s"}, and {scopedFlows.length} flow path{scopedFlows.length === 1 ? "" : "s"} are currently active in this view.</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Recovery direction</strong>
            <p style={{ margin: 0, color: "#61758f" }}>Use global for overall architecture, per-site for local LLD review, WAN / cloud for transport posture, and boundaries for trust enforcement. This keeps the diagram stage closer to the roadmap’s real topology-engine target.</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Topology-specific rendering check</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{topologyBehaviorSummary}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Current workspace discipline</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{densityLabel} density • {labelMode === "detailed" ? "Detailed device + link labels" : "Essential labels only"} • {linkAnnotationMode === "full" ? "Full link annotations" : "Minimal link annotations"} • {labelFocusTitle(labelFocus)}. Guided mode keeps critical review cards first; Expanded mode exposes the deeper support panels.</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Engineering focus controls</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{deviceFocusTitle(deviceFocus)} + {linkFocusTitle(linkFocus)} + {labelFocusTitle(labelFocus)} are now emphasized. Non-matching device roles and link types remain visible but muted so the workspace can isolate the review you are doing without losing topology context.</p>
          </div>
          <LabelFocusPanel labelFocus={labelFocus} />
        </div>
      ) : (
        <div className="diagram-note-grid" style={{ marginBottom: 12 }}>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Current review posture</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{activePreset ? `${activePreset.label} • ${activePreset.detail}` : "Choose a preset from the control strip to move quickly between architecture, site, transport, boundary, service, and flow reviews."}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Scope summary</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{scopeMeta.title}: {scopeMeta.detail}</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Evidence in this view</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{scopedSites.length} site{scopedSites.length === 1 ? "" : "s"}, {scopedPlacementCount} placement object{scopedPlacementCount === 1 ? "" : "s"}, {scopedServiceCount} service anchor{scopedServiceCount === 1 ? "" : "s"}, {scopedBoundaryCount} boundary object{scopedBoundaryCount === 1 ? "" : "s"}, and {scopedFlows.length} flow path{scopedFlows.length === 1 ? "" : "s"} are active.</p>
          </div>
          <div className="diagram-note-card">
            <strong style={{ display: "block", marginBottom: 6 }}>Focus controls</strong>
            <p style={{ margin: 0, color: "#61758f" }}>{deviceFocusTitle(deviceFocus)} • {linkFocusTitle(linkFocus)} • {labelFocusTitle(labelFocus)} • {labelMode === "detailed" ? "Detailed labels" : "Essential labels"}</p>
          </div>
        </div>
      )}

      {showNarrativePanels ? <DeviceRealismDirectionPanel /> : null}
      {showNarrativePanels ? <ArchitectureSignals synthesized={synthesized} /> : null}
      {showNarrativePanels ? <TopologyFoundationPanel synthesized={synthesized} /> : null}
      {showSupportPanels && scope !== "site" ? <TopologyObjectPanel synthesized={synthesized} /> : null}
      {showSupportPanels && (scope !== "site" || mode === "physical") ? <Legend /> : null}
      {showSupportPanels && scope === "global" ? <DeviceSymbolLibraryPanel /> : null}
      {showNarrativePanels ? <OverlayReviewPanel overlay={overlay} /> : null}
      {showNarrativePanels ? <OverlayBehaviorPanel overlay={overlay} /> : null}
      {(showSupportPanels || (showNarrativePanels && (overlay === "security" || overlay === "flows"))) && scope !== "site" && (overlay === "security" || overlay === "flows" || overlay === "redundancy") ? <ConnectionSemanticsPanel /> : null}
      {showNarrativePanels ? <LinkTypeRenderingPanel synthesized={synthesized} /> : null}
      {showNarrativePanels ? <OverlayEvidencePanel overlay={overlay} synthesized={synthesized} /> : null}
      {showNarrativePanels ? <TopologySpecificRenderingPanel synthesized={synthesized} /> : null}
      {showNarrativePanels ? <TopologyPostureLedgerPanel synthesized={synthesized} sites={scopedSites} /> : null}
      {showSupportPanels && scope !== "site" && (overlay === "none" || overlay === "redundancy" || overlay === "flows") ? <TopologyBehaviorMatrixPanel synthesized={synthesized} /> : null}
      {showNarrativePanels ? <DiagramReviewSequencePanel overlay={overlay} /> : null}
      {showNarrativePanels ? (
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
      ) : null}
      {showSupportPanels ? <SiteDeviceLinkMatrixPanel synthesized={synthesized} siteIds={scopedSites.map((site) => site.id)} /> : null}
      {overlay === "flows" ? <FlowSummaryPanel flows={scopedFlows} /> : null}
      {mode === "logical"
        ? <LogicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} validations={validations} overlay={overlay} activeOverlays={activeOverlays} scope={scope} focusedSiteId={focusedSite?.id} labelMode={labelMode} linkAnnotationMode={linkAnnotationMode} labelFocus={labelFocus} deviceFocus={deviceFocus} linkFocus={linkFocus} onSelectTarget={onSelectTarget} bareCanvas={bareCanvas} />
        : <PhysicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} validations={validations} overlay={overlay} activeOverlays={activeOverlays} scope={scope} focusedSiteId={focusedSite?.id} labelMode={labelMode} linkAnnotationMode={linkAnnotationMode} labelFocus={labelFocus} deviceFocus={deviceFocus} linkFocus={linkFocus} onSelectTarget={onSelectTarget} bareCanvas={bareCanvas} />}
    </div>
  );
}
