import { type SitePlacementDevice, type SynthesizedLogicalDesign } from "../../../lib/designSynthesis.types";
import type { ProjectComment, ValidationResult, Vlan } from "../../../lib/types";
import type { ActiveOverlayMode, DeviceFocus, DiagramScope, LabelFocus, LinkAnnotationMode, LinkFocus, OverlayMode } from "../diagramTypes";
import {
  diagramScopeMeta,
  flowsForDiagramScope,
  siteIdsWithBoundaries,
  siteIdsWithCloudOrInternetEdges,
  siteIdsWithWanLinks,
  sitesForDiagramScope,
  type SiteWithVlans,
} from "../diagramWorkspaceHelpers";

export {
  diagramScopeMeta,
  flowsForDiagramScope,
  siteIdsWithBoundaries,
  siteIdsWithCloudOrInternetEdges,
  siteIdsWithWanLinks,
  sitesForDiagramScope,
} from "../diagramWorkspaceHelpers";
export type { SiteWithVlans } from "../diagramWorkspaceHelpers";

export type SitePoint = { x: number; y: number };

export type DeviceKind = SitePlacementDevice["deviceType"] | "internet" | "cloud";

export type ChipTone = "blue" | "purple" | "green" | "orange";

export function getSvgElement(svgId: string) {
  return document.getElementById(svgId) as unknown as SVGSVGElement | null;
}

export function siteTierLabel(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return siteName === synthesized.topology.primarySiteName
    ? "Primary site / shared-service hub"
    : synthesized.topology.topologyType === "collapsed-core"
      ? "Campus / attached access domain"
      : "Attached site / routed edge domain";
}

export function siteTierTone(siteName: string, synthesized: SynthesizedLogicalDesign): ChipTone {
  return siteName === synthesized.topology.primarySiteName ? "blue" : synthesized.topology.topologyType === "collapsed-core" ? "purple" : "green";
}

export function DiagramCanvasDefs() {
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

export function DiagramCanvasBackdrop({ width, height, title, subtitle, summary, chipLabel, chipTone, minimal = false }: { width: number; height: number; title: string; subtitle: string; summary: string; chipLabel: string; chipTone: ChipTone; minimal?: boolean; }) {
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

export function exportSvg(svgId: string, filename: string) {
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

export async function exportPng(svgId: string, filename: string) {
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

export function openTaskCount(comments: ProjectComment[], targetType: "SITE" | "VLAN", targetId: string) {
  return comments.filter((comment) => comment.taskStatus !== "DONE" && comment.targetType === targetType && comment.targetId === targetId).length;
}

export function roleTone(kind: DeviceKind) {
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

export function deviceLabel(kind: DeviceKind) {
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

export function linkStyle(type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow") {
  switch (type) {
    case "internet": return { stroke: "#7ca5eb", dash: "8 6", width: 2.5 };
    case "trunk": return { stroke: "#9a7cff", dash: "2 0", width: 3.5 };
    case "vpn": return { stroke: "#1d7f4c", dash: "10 5", width: 3 };
    case "ha": return { stroke: "#ff9b5d", dash: "6 5", width: 2.5 };
    case "flow": return { stroke: "#ff7a59", dash: "0", width: 3.5 };
    default: return { stroke: "#85a7e6", dash: "0", width: 2.6 };
  }
}

export function deviceFocusMatchesKind(focus: DeviceFocus, kind: DeviceKind) {
  if (focus === "all") return true;
  if (focus === "edge") return kind === "firewall" || kind === "router" || kind === "cloud-edge" || kind === "internet" || kind === "cloud";
  if (focus === "switching") return kind === "core-switch" || kind === "distribution-switch" || kind === "access-switch";
  if (focus === "wireless") return kind === "wireless-controller" || kind === "access-point";
  if (focus === "services") return kind === "server";
  return true;
}

export function linkFocusMatchesType(focus: LinkFocus, type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow") {
  if (focus === "all") return true;
  if (focus === "transport") return type === "routed" || type === "vpn" || type === "internet" || type === "ha";
  if (focus === "access") return type === "trunk";
  if (focus === "security") return type === "internet" || type === "vpn" || type === "ha" || type === "flow";
  if (focus === "flows") return type === "flow";
  return true;
}

export function deviceFocusTitle(focus: DeviceFocus) {
  if (focus === "edge") return "Edge roles";
  if (focus === "switching") return "Switching roles";
  if (focus === "wireless") return "Wireless roles";
  if (focus === "services") return "Service roles";
  return "All device roles";
}

export function linkFocusTitle(focus: LinkFocus) {
  if (focus === "transport") return "Transport semantics";
  if (focus === "access") return "Access / trunk semantics";
  if (focus === "security") return "Security / control semantics";
  if (focus === "flows") return "Critical flow semantics";
  return "All link semantics";
}

export function labelFocusMatchesCategory(focus: LabelFocus, category: Exclude<LabelFocus, "all">) {
  return focus === "all" || focus === category;
}

export function labelFocusTitle(focus: LabelFocus) {
  if (focus === "topology") return "Topology labels";
  if (focus === "addressing") return "Addressing labels";
  if (focus === "zones") return "Zone / boundary labels";
  if (focus === "transport") return "Transport labels";
  if (focus === "flows") return "Flow labels";
  return "All label families";
}

export function inferSecondaryLabelCategory(type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow", secondaryLabel?: string): Exclude<LabelFocus, "all"> {
  if (type === "flow") return "flows";
  if (!secondaryLabel) return "transport";
  const normalized = secondaryLabel.toLowerCase();
  if (/\/\d+/.test(secondaryLabel) || /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(secondaryLabel) || /gateway|subnet|vlan|loopback|summary/i.test(secondaryLabel)) return "addressing";
  if (/dmz|management|guest|inside|outside|zone|trust|policy/i.test(normalized)) return "zones";
  if (/flow|path|nat|vpn|wan|internet|transport/i.test(normalized)) return "transport";
  return "topology";
}

export function overlayLabelCategory(mode: OverlayMode): Exclude<LabelFocus, "all"> {
  if (mode === "addressing") return "addressing";
  if (mode === "security") return "zones";
  if (mode === "flows") return "flows";
  if (mode === "redundancy") return "transport";
  return "topology";
}

export function labelFocusOpacity(focus: LabelFocus, category: Exclude<LabelFocus, "all">) {
  return labelFocusMatchesCategory(focus, category) ? 1 : 0.22;
}

export function DeviceIcon({ x, y, kind, label, sublabel, showSublabel = true, emphasized = true }: { x: number; y: number; kind: DeviceKind; label: string; sublabel?: string; showSublabel?: boolean; emphasized?: boolean }) {
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

export function taskBadge(x: number, y: number, count: number) {
  if (count <= 0) return null;
  return (
    <g>
      <circle cx={x} cy={y} r="12" fill="#ff7a59" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="white" fontWeight="700">{count}</text>
    </g>
  );
}

export function chip(x: number, y: number, width: number, text: string, tone: "blue" | "purple" | "green" | "orange") {
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

export function pathLine(
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

export function dedupeDiagramPoints(points: Array<[number, number]>) {
  return points.filter((point, index) => index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1]);
}

export function orthogonalVH(start: [number, number], end: [number, number], midY?: number): Array<[number, number]> {
  const turnY = midY ?? (start[1] + end[1]) / 2;
  return dedupeDiagramPoints([start, [start[0], turnY], [end[0], turnY], end]);
}

export function orthogonalHV(start: [number, number], end: [number, number], midX?: number): Array<[number, number]> {
  const turnX = midX ?? (start[0] + end[0]) / 2;
  return dedupeDiagramPoints([start, [turnX, start[1]], [turnX, end[1]], end]);
}

export function chipTonePalette(tone: ChipTone) {
  return tone === "purple"
    ? { fill: "#f7f1ff", stroke: "#c9abff", text: "#5a34a3" }
    : tone === "green"
      ? { fill: "#f2fff8", stroke: "#96dfb7", text: "#1d7f4c" }
      : tone === "orange"
        ? { fill: "#fff7ef", stroke: "#ffc98e", text: "#8f4b00" }
        : { fill: "#eef5ff", stroke: "#b8cff5", text: "#20427f" };
}

export function logicalNode(x: number, y: number, width: number, label: string, subtitle?: string, tone: ChipTone = "blue") {
  const palette = chipTonePalette(tone);
  return (
    <g>
      <rect x={x} y={y} width={width} height={44} rx={14} fill={palette.fill} stroke={palette.stroke} />
      <text x={x + width / 2} y={y + 18} textAnchor="middle" fontSize="11" fontWeight="700" fill={palette.text}>{label}</text>
      {subtitle ? <text x={x + width / 2} y={y + 32} textAnchor="middle" fontSize="9.6" fill="#5f748f">{subtitle}</text> : null}
    </g>
  );
}


export function primaryDmzService(synthesized: SynthesizedLogicalDesign, siteName?: string) {
  return synthesized.servicePlacements.find((service) => service.serviceType === "dmz-service" && (!siteName || service.siteName === siteName));
}

export function sitePositionMap(sites: SiteWithVlans[], synthesized: SynthesizedLogicalDesign, cardWidth: number, startX: number, gap: number): Record<string, SitePoint> {
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


export function validationSeverityTone(items: ValidationResult[]) {
  if (items.some((item) => item.severity === "ERROR")) return { stroke: "#ef4444", fill: "#fff1f2", label: "Blocker" };
  if (items.some((item) => item.severity === "WARNING")) return { stroke: "#f59e0b", fill: "#fff7ed", label: "Warning" };
  return { stroke: "#dce7f8", fill: "#ffffff", label: "Clear" };
}

export function siteValidationItems(site: SiteWithVlans, validations: ValidationResult[]) {
  return validations.filter((item) => (item.entityType === "SITE" && item.entityId === site.id) || (item.entityType === "VLAN" && (site.vlans ?? []).some((vlan) => vlan.id === item.entityId)));
}

export function normalizeDiagramText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9./-]+/g, " ");
}

export function relevantSiteSubnets(siteId: string, synthesized: SynthesizedLogicalDesign) {
  return synthesized.addressingPlan.filter((row) => row.siteId === siteId).map((row) => row.subnetCidr.toLowerCase());
}

export function relevantZoneNames(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return synthesized.securityBoundaries.filter((boundary) => boundary.siteName === siteName).map((boundary) => boundary.zoneName.toLowerCase());
}

export function deterministicValidationAnchor(item: ValidationResult, site: SiteWithVlans, synthesized: SynthesizedLogicalDesign) {
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

export function deviceValidationItems(device: SitePlacementDevice | undefined, site: SiteWithVlans, validations: ValidationResult[], synthesized: SynthesizedLogicalDesign) {
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

export function interfaceValidationItems(device: SitePlacementDevice | undefined, site: SiteWithVlans, validations: ValidationResult[], synthesized: SynthesizedLogicalDesign) {
  if (!device) return [];
  const labels = device.interfaceLabels.map((label) => label.toLowerCase());
  return siteValidationItems(site, validations).filter((item) => {
    const text = normalizeDiagramText(`${item.title} ${item.message}`);
    const anchor = deterministicValidationAnchor(item, site, synthesized);
    return labels.some((label) => label.split(/\W+/).filter((token) => token.length > 2).some((token) => text.includes(token)))
      || ((anchor === 'edge' || anchor === 'management' || anchor === 'dmz') && (device.deviceType === 'firewall' || device.deviceType === 'router'));
  }).slice(0, 2);
}

export function linkValidationItems(site: SiteWithVlans, validations: ValidationResult[], synthesized: SynthesizedLogicalDesign) {
  return siteValidationItems(site, validations).filter((item) => deterministicValidationAnchor(item, site, synthesized) === 'path').slice(0, 2);
}

export function zoneBoundaryRectsForSite(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return synthesized.securityBoundaries
    .filter((boundary) => boundary.siteName === siteName)
    .slice(0, 3)
    .map((boundary) => ({
      label: boundary.zoneName,
      subnet: boundary.subnetCidrs[0] || 'TBD',
      anchor: boundary.attachedInterface || boundary.attachedDevice,
    }));
}

export function compactInterfaceStack(device?: SitePlacementDevice, limit = 3) {
  if (!device) return [];
  return device.interfaceLabels.slice(0, limit).map((label, index) => `${index + 1}. ${label}`);
}

export function boundaryLabelsForSite(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return zoneBoundaryRectsForSite(siteName, synthesized)
    .map((boundary) => `${boundary.label} • ${boundary.subnet} • ${boundary.anchor}`);
}

export function siteRoleSummary(siteName: string, synthesized: SynthesizedLogicalDesign) {
  if (siteName === synthesized.topology.primarySiteName) return "Primary site • shared services • policy anchor";
  if (synthesized.topology.topologyType === 'collapsed-core') return 'Collapsed-core site • local edge and switching';
  if (synthesized.topology.topologyType === 'hub-spoke') return 'Branch site • uplinked to primary hub';
  if (synthesized.topology.topologyType === 'hybrid-cloud') return 'Attached site • cloud-aware edge';
  return 'Attached site • routed inter-site design';
}

export function topologyScopeBehaviorSummary(scope: DiagramScope, synthesized: SynthesizedLogicalDesign, focusedSite?: SiteWithVlans) {
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

export function siteBreakoutSummary(siteName: string, synthesized: SynthesizedLogicalDesign) {
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

export function siteRoutingSummary(siteId: string, siteName: string, synthesized: SynthesizedLogicalDesign) {
  const route = (synthesized.routePlan ?? synthesized.routingPlan).find((item) => item.siteId === siteId || item.siteName === siteName);
  if (route?.summaryAdvertisement) return `Summarizes ${route.summaryAdvertisement}`;
  if (route?.transitAdjacencyCount && route.transitAdjacencyCount > 0) return `${route.transitAdjacencyCount} transit adjacencies`;
  if (siteName === synthesized.topology.primarySiteName) return "Shared route / policy anchor";
  if (synthesized.topology.topologyType === "hub-spoke") return `Attached route domain via ${synthesized.topology.primarySiteName || "hub"}`;
  if (synthesized.topology.topologyType === "collapsed-core") return "Local gateway and switching role";
  return "Routed attached site";
}

export function siteTransportSummary(siteId: string, siteName: string, synthesized: SynthesizedLogicalDesign) {
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

export function siteAnchorSummary(siteId: string, siteName: string, synthesized: SynthesizedLogicalDesign) {
  const services = synthesized.servicePlacements.filter((placement) => placement.siteId === siteId || placement.siteName === siteName);
  const boundaries = synthesized.securityBoundaries.filter((boundary) => boundary.siteName === siteName);
  const placements = synthesized.sitePlacements.filter((placement) => placement.siteId === siteId);
  const primaryService = services[0]?.serviceName;
  const primaryBoundary = boundaries[0]?.boundaryName;
  const primaryDevice = placements[0]?.deviceName;
  return [primaryService, primaryBoundary, primaryDevice].filter(Boolean).slice(0, 2).join(" • ") || "Core anchors still inferred";
}

export function truncateDiagramText(value: string | undefined, max = 58) {
  if (!value) return "";
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function TopologyPostureLedgerPanel({ synthesized, sites }: { synthesized: SynthesizedLogicalDesign; sites: SiteWithVlans[]; }) {
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

export function dmzBoundaryForSite(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return synthesized.securityBoundaries.find((boundary) => boundary.siteName === siteName && /dmz/i.test(boundary.zoneName));
}

export function managementBoundaryForSite(siteName: string, synthesized: SynthesizedLogicalDesign) {
  return synthesized.securityBoundaries.find((boundary) => boundary.siteName === siteName && /management/i.test(boundary.zoneName));
}

export function firstInterfaceLabel(device?: SitePlacementDevice) {
  return device?.interfaceLabels?.[0];
}

export function interfaceSummary(device?: SitePlacementDevice) {
  return device?.interfaceLabels?.slice(0, 3) ?? [];
}

export function overlayTone(mode: OverlayMode) {
  switch (mode) {
    case "addressing": return "blue" as const;
    case "security": return "purple" as const;
    case "flows": return "orange" as const;
    case "services": return "purple" as const;
    case "redundancy": return "green" as const;
    default: return "green" as const;
  }
}

export function overlayItems(site: SiteWithVlans, synthesized: SynthesizedLogicalDesign, mode: OverlayMode) {
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

export function diagramLegend(mode: OverlayMode) {
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

export function normalizeActiveOverlays(overlay: OverlayMode, activeOverlays?: ActiveOverlayMode[]) {
  const normalized = Array.from(new Set(activeOverlays ?? []));
  if (normalized.length > 0) return normalized;
  return overlay === "none" ? [] : [overlay];
}

export function overlaySummaryLabel(activeOverlays: ActiveOverlayMode[]) {
  if (!activeOverlays.length) return "Devices + traffic lines";
  const labels = activeOverlays.map((item) => diagramLegend(item).title.replace(/ overlay$/i, ""));
  return labels.length <= 2 ? labels.join(" + ") : `${labels.slice(0, 2).join(" + ")} +${labels.length - 2}`;
}

export function placementRowsForSite(site: SiteWithVlans, synthesized: SynthesizedLogicalDesign, limit = 5) {
  return synthesized.sitePlacements
    .filter((placement) => placement.siteId === site.id)
    .slice(0, limit)
    .map((placement) => ({ text: `${deviceLabel(placement.deviceType)} • ${placement.role} • ${placement.connectedZones.join(", ") || "No zone labels yet"}`, tone: "green" as const, category: "topology" as const }));
}

export function overlayRowsForSite(site: SiteWithVlans, synthesized: SynthesizedLogicalDesign, activeOverlays: ActiveOverlayMode[], limit = 3) {
  if (!activeOverlays.length) return placementRowsForSite(site, synthesized, limit);
  const perOverlayLimit = Math.max(1, Math.floor(limit / Math.max(activeOverlays.length, 1)));
  return activeOverlays.flatMap((mode) =>
    overlayItems(site, synthesized, mode)
      .slice(0, perOverlayLimit + (activeOverlays.length === 1 ? limit : 0))
      .map((item) => ({ text: item, tone: overlayTone(mode), category: overlayLabelCategory(mode) }))
  ).slice(0, limit);
}
