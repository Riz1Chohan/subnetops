import { useMemo, useState } from "react";
import { synthesizeLogicalDesign, type SitePlacementDevice, type SynthesizedLogicalDesign, type TrafficFlowPath } from "../../../lib/designSynthesis";
import { parseRequirementsProfile } from "../../../lib/requirementsProfile";
import type { ProjectComment, ProjectDetail, Site, ValidationResult, Vlan } from "../../../lib/types";

interface SiteWithVlans extends Site {
  vlans?: Vlan[];
}

interface ProjectDiagramProps {
  project: ProjectDetail;
  comments?: ProjectComment[];
  validations?: ValidationResult[];
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
        <path d={`M ${bodyX + 26} ${bodyY + 36} Q ${bodyX + 60} ${bodyY + 4} ${bodyX + 94} ${bodyY + 36}`} fill="none" stroke={tone.stroke} strokeWidth="1.4" opacity="0.45" />
        <text x={bodyX + 60} y={bodyY + 74} textAnchor="middle" fontSize="12" fontWeight="700" fill={tone.text}>{label}</text>
        {sublabel ? <text x={bodyX + 60} y={bodyY + 89} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
      </g>
    );
  }

  if (kind === "router") {
    return (
      <g>
        <ellipse cx={bodyX + 54} cy={bodyY + 18} rx={38} ry={12} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.4" />
        <path d={`M ${bodyX + 16} ${bodyY + 18} L ${bodyX + 16} ${bodyY + 42} Q ${bodyX + 54} ${bodyY + 58} ${bodyX + 92} ${bodyY + 42} L ${bodyX + 92} ${bodyY + 18}`} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.4" />
        <ellipse cx={bodyX + 54} cy={bodyY + 42} rx={38} ry={12} fill="#f9fcff" stroke={tone.stroke} strokeWidth="2.2" />
        <path d={`M ${bodyX + 37} ${bodyY + 29} L ${bodyX + 54} ${bodyY + 19} L ${bodyX + 54} ${bodyY + 25} L ${bodyX + 69} ${bodyY + 16} L ${bodyX + 57} ${bodyY + 30} L ${bodyX + 69} ${bodyY + 42} L ${bodyX + 54} ${bodyY + 35} L ${bodyX + 54} ${bodyY + 41} L ${bodyX + 37} ${bodyY + 29} Z`} fill={tone.stroke} opacity="0.78" />
        <circle cx={bodyX + 26} cy={bodyY + 42} r={2.1} fill={tone.stroke} opacity="0.78" />
        <circle cx={bodyX + 82} cy={bodyY + 42} r={2.1} fill={tone.stroke} opacity="0.78" />
        <line x1={bodyX + 24} y1={bodyY + 51} x2={bodyX + 84} y2={bodyY + 51} stroke={tone.stroke} strokeOpacity="0.28" strokeWidth="1.5" />
        <text x={bodyX + 54} y={bodyY + 72} textAnchor="middle" fontSize="12" fontWeight="700" fill="#183866">{label}</text>
        {sublabel ? <text x={bodyX + 54} y={bodyY + 87} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
      </g>
    );
  }

  if (kind === "firewall") {
    return (
      <g>
        <path d={`M ${bodyX + 16} ${bodyY + 4} L ${bodyX + 104} ${bodyY + 4} L ${bodyX + 118} ${bodyY + 18} L ${bodyX + 118} ${bodyY + 56} L ${bodyX} ${bodyY + 56} L ${bodyX} ${bodyY + 18} Z`} fill={tone.fill} stroke={tone.stroke} strokeWidth="2.4" />
        <path d={`M ${bodyX + 52} ${bodyY + 18} L ${bodyX + 66} ${bodyY + 18} L ${bodyX + 66} ${bodyY + 31} L ${bodyX + 78} ${bodyY + 31} L ${bodyX + 78} ${bodyY + 43} L ${bodyX + 66} ${bodyY + 43} L ${bodyX + 66} ${bodyY + 56} L ${bodyX + 52} ${bodyY + 56} L ${bodyX + 52} ${bodyY + 43} L ${bodyX + 40} ${bodyY + 43} L ${bodyX + 40} ${bodyY + 31} L ${bodyX + 52} ${bodyY + 31} Z`} fill={tone.stroke} opacity="0.16" />
        {Array.from({ length: 6 }).map((_, index) => (
          <rect key={index} x={bodyX + 14 + index * 16} y={bodyY + 14} width="12" height="7" rx="2" fill={tone.stroke} opacity={0.28 - index * 0.02} />
        ))}
        {Array.from({ length: 5 }).map((_, index) => (
          <rect key={`lower-${index}`} x={bodyX + 24 + index * 16} y={bodyY + 44} width="12" height="7" rx="2" fill={tone.stroke} opacity={0.2 - index * 0.02} />
        ))}
        <line x1={bodyX + 18} y1={bodyY + 28} x2={bodyX + 100} y2={bodyY + 28} stroke={tone.stroke} strokeOpacity="0.24" strokeWidth="1.8" />
        <circle cx={bodyX + 102} cy={bodyY + 12} r="3.2" fill="#ff8b6b" opacity="0.85" />
        <circle cx={bodyX + 92} cy={bodyY + 12} r="3.2" fill="#ffd166" opacity="0.75" />
        <text x={bodyX + 59} y={bodyY + 76} textAnchor="middle" fontSize="12" fontWeight="700" fill="#183866">{label}</text>
        {sublabel ? <text x={bodyX + 59} y={bodyY + 91} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
      </g>
    );
  }

  if (kind === "access-point" || kind === "wireless-controller") {
    return (
      <g>
        <ellipse cx={bodyX + 27} cy={bodyY + 24} rx="20" ry="11" fill={tone.fill} stroke={tone.stroke} strokeWidth="2.2" />
        <rect x={bodyX + 13} y={bodyY + 12} width="28" height="4" rx="2" fill={tone.stroke} opacity="0.18" />
        <circle cx={bodyX + 27} cy={bodyY + 24} r={3.5} fill={tone.text} />
        <path d={`M ${bodyX + 9} ${bodyY + 16} Q ${bodyX + 27} ${bodyY - 1} ${bodyX + 45} ${bodyY + 16}`} fill="none" stroke={tone.stroke} strokeWidth="2" />
        <path d={`M ${bodyX + 13} ${bodyY + 21} Q ${bodyX + 27} ${bodyY + 8} ${bodyX + 41} ${bodyY + 21}`} fill="none" stroke={tone.stroke} strokeWidth="2" opacity="0.9" />
        <path d={`M ${bodyX + 18} ${bodyY + 27} Q ${bodyX + 27} ${bodyY + 18} ${bodyX + 36} ${bodyY + 27}`} fill="none" stroke={tone.stroke} strokeWidth="1.8" opacity="0.8" />
        <rect x={bodyX + 16} y={bodyY + 40} width="22" height="4" rx="2" fill={tone.stroke} opacity="0.32" />
        <text x={bodyX + 27} y={bodyY + 60} textAnchor="middle" fontSize="12" fontWeight="700" fill="#183866">{label}</text>
        {sublabel ? <text x={bodyX + 27} y={bodyY + 75} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
      </g>
    );
  }

  if (kind === "server") {
    return (
      <g>
        <rect x={bodyX + 4} y={bodyY} width="70" height="56" rx="8" fill={tone.fill} stroke={tone.stroke} strokeWidth="2.1" />
        <rect x={bodyX + 10} y={bodyY + 8} width="58" height="10" rx="4" fill="#ffffff" stroke={tone.stroke} strokeOpacity="0.25" />
        {Array.from({ length: 3 }).map((_, index) => (
          <g key={index}>
            <rect x={bodyX + 12} y={bodyY + 24 + index * 9} width="42" height="5.5" rx="2.75" fill={tone.stroke} opacity={0.24 - index * 0.03} />
            <circle cx={bodyX + 60} cy={bodyY + 26.5 + index * 9} r="1.9" fill={tone.stroke} opacity="0.7" />
          </g>
        ))}
        <rect x={bodyX + 22} y={bodyY + 59} width="34" height="4" rx="2" fill={tone.stroke} opacity="0.18" />
        <text x={bodyX + 39} y={bodyY + 79} textAnchor="middle" fontSize="12" fontWeight="700" fill="#183866">{label}</text>
        {sublabel ? <text x={bodyX + 39} y={bodyY + 94} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
      </g>
    );
  }

  if (kind === "core-switch" || kind === "distribution-switch" || kind === "access-switch") {
    const stackCount = kind === "core-switch" ? 2 : 1;
    const baseY = kind === "core-switch" ? bodyY + 8 : bodyY + 14;
    const width = kind === "access-switch" ? 110 : 122;
    return (
      <g>
        {Array.from({ length: stackCount }).map((_, stackIndex) => (
          <g key={stackIndex} transform={`translate(${stackIndex * 7}, ${stackIndex * -6})`}>
            <rect x={bodyX} y={baseY} width={width} height="30" rx="6" fill={tone.fill} stroke={tone.stroke} strokeWidth="2.1" />
            <rect x={bodyX + 8} y={baseY + 6} width="16" height="4" rx="2" fill={tone.stroke} opacity="0.34" />
            <rect x={bodyX + 8} y={baseY + 18} width="10" height="4" rx="2" fill={tone.stroke} opacity="0.28" />
            {Array.from({ length: kind === "access-switch" ? 12 : 14 }).map((_, index) => (
              <rect key={index} x={bodyX + 30 + index * 6.1} y={baseY + 7} width="4.6" height="4.6" rx="1.3" fill={tone.stroke} opacity={0.95 - index * 0.03} />
            ))}
            {Array.from({ length: kind === "access-switch" ? 12 : 14 }).map((_, index) => (
              <rect key={`lower-${index}`} x={bodyX + 30 + index * 6.1} y={baseY + 16} width="4.6" height="4.6" rx="1.3" fill={tone.stroke} opacity={0.78 - index * 0.025} />
            ))}
            <rect x={bodyX + width - 18} y={baseY + 5} width="9" height="16" rx="3" fill={tone.stroke} opacity="0.16" />
          </g>
        ))}
        <text x={bodyX + 61} y={bodyY + 62} textAnchor="middle" fontSize="12" fontWeight="700" fill="#183866">{label}</text>
        {sublabel ? <text x={bodyX + 61} y={bodyY + 77} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
      </g>
    );
  }

  return (
    <g>
      <rect x={bodyX} y={bodyY} width="112" height="42" rx="10" fill={tone.fill} stroke={tone.stroke} strokeWidth="2" />
      <text x={bodyX + 56} y={bodyY + 24} textAnchor="middle" fontSize="12" fontWeight="700" fill="#183866">{label}</text>
      {sublabel ? <text x={bodyX + 56} y={bodyY + 38} textAnchor="middle" fontSize="10.5" fill="#657892">{sublabel}</text> : null}
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

  return synthesized.sitePlacements
    .filter((placement) => placement.siteId === site.id)
    .slice(0, 4)
    .map((placement) => `${placement.deviceName} • ${placement.role}`);
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
  validations,
  overlay,
  diagramMode = "logical",
  onSelectTarget,
}: {
  project: ProjectDetail;
  synthesized: SynthesizedLogicalDesign;
  svgId: string;
  comments: ProjectComment[];
  validations: ValidationResult[];
  overlay: OverlayMode;
  diagramMode?: DiagramMode;
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
        <text x={64} y={96} fontSize="12" fill="#637998">v103 pushes exact device, boundary, and path naming out of the synthesis layer so the diagram and report reference the same topology objects and branch sites read less like generic copies of the primary site.</text>
        <text x={64} y={118} fontSize="12" fill="#637998">Topology: {synthesized.topology.topologyLabel} • Breakout: {synthesized.topology.internetBreakout} • Redundancy: {synthesized.topology.redundancyModel}</text>
        <text x={64} y={136} fontSize="11" fill="#6c819b">Legend intent: firewall / router / switching / wireless / server / cloud edge should read as real network roles, not generic boxes.</text>
        {chip(width - 286, 58, 210, diagramLegend(overlay).title, overlayTone(overlay))}
        {chip(width - 286, 86, 210, diagramMode === "physical" ? "Physical posture review" : "Logical posture review", "green")}

        {sites.map((site, index) => {
          const sitePoint = sitePositions[site.id] || { x: startX + index * (cardWidth + gap), y: 178 };
          const x = sitePoint.x;
          const y = sitePoint.y;
          const siteDevices = synthesized.sitePlacements.filter((placement) => placement.siteId === site.id);
          const siteOverlays = overlayItems(site, synthesized, overlay);
          const taskCount = openTaskCount(comments, "SITE", site.id);
          const siteValidation = siteValidationItems(site, validations);
          const validationTone = validationSeverityTone(siteValidation);
          const edgeDevice = siteDevices.find((device) => device.role.toLowerCase().includes("edge") || device.deviceType === "firewall" || device.deviceType === "router") || siteDevices[0];
          const switchDevice = siteDevices.find((device) => device.deviceType === "core-switch" || device.deviceType === "distribution-switch" || device.deviceType === "access-switch");
          const serviceDevice = siteDevices.find((device) => device.deviceType === "server");
          const wirelessDevice = siteDevices.find((device) => device.deviceType === "wireless-controller" || device.deviceType === "access-point");
          const securitySummary = synthesized.securityBoundaries.filter((boundary) => boundary.siteName === site.name).slice(0, 2);
          const dmzService = primaryDmzService(synthesized, site.name);

          return (
            <g key={site.id}>
              <rect x={x} y={y} width={cardWidth} height={cardHeight} rx={24} fill={validationTone.fill} stroke={validationTone.stroke} strokeWidth="2.3" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 20} y={y + 30} fontSize="18" fontWeight="700" fill="#142742">{site.name}</text>
              <text x={x + 20} y={y + 50} fontSize="11" fill="#697f98">{site.defaultAddressBlock || "No site summary block assigned"}</text>
              <text x={x + 20} y={y + 68} fontSize="11" fill="#697f98">{siteRoleSummary(site.name, synthesized)}</text>
              {taskBadge(x + cardWidth - 24, y + 24, taskCount)}
              {siteValidation.length > 0 ? chip(x + 156, y + 18, 94, `${validationTone.label} ${siteValidation.length}`, siteValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null}
              {site.name === synthesized.topology.primarySiteName ? <rect x={x + 18} y={y + 76} width={cardWidth - 36} height="14" rx="7" fill="#eef4ff" stroke="#bfd2f3" /> : null}
              {site.name === synthesized.topology.primarySiteName ? <text x={x + cardWidth / 2} y={y + 86} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#284b78">PRIMARY / SHARED-SERVICE / POLICY HUB</text> : null}
              {site.name !== synthesized.topology.primarySiteName ? <rect x={x + 18} y={y + 76} width={cardWidth - 36} height="14" rx="7" fill="#f8fbff" stroke="#d7e5fb" /> : null}
              {site.name !== synthesized.topology.primarySiteName ? <text x={x + cardWidth / 2} y={y + 86} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#4f6582">ATTACHED SITE / LOCAL ACCESS / UPLINKED EDGE</text> : null}

              <rect x={x + 12} y={y + 92} width="108" height="116" rx="18" fill="#f8fbff" stroke="#c7d8f7" strokeDasharray="6 4" />
              <text x={x + 22} y={y + 108} fontSize="10.5" fill="#526984">Perimeter / edge group</text>
              <rect x={x + 122} y={y + 92} width="160" height="116" rx="18" fill="#fbfdff" stroke="#d9e6fb" strokeDasharray="6 4" />
              <text x={x + 132} y={y + 108} fontSize="10.5" fill="#526984">Core / services / access group</text>

              {edgeDevice ? <DeviceIcon x={x + 18} y={y + 112} kind={edgeDevice.deviceType} label={edgeDevice.deviceName} sublabel={`${edgeDevice.role}${edgeDevice.uplinkTarget ? ` • uplink ${edgeDevice.uplinkTarget}` : ""}`} /> : null}
              {switchDevice ? <DeviceIcon x={x + 126} y={y + 112} kind={switchDevice.deviceType} label={switchDevice.deviceName} sublabel={`${switchDevice.role}${switchDevice.uplinkTarget ? ` • uplink ${switchDevice.uplinkTarget}` : ""}`} /> : null}
              {serviceDevice ? <DeviceIcon x={x + 212} y={y + 112} kind={serviceDevice.deviceType} label="Services" sublabel={`${serviceDevice.role}${serviceDevice.uplinkTarget ? ` • upstream ${serviceDevice.uplinkTarget}` : ""}`} /> : null}
              {wirelessDevice ? <DeviceIcon x={x + 140} y={y + 196} kind={wirelessDevice.deviceType} label={wirelessDevice.deviceName} sublabel={`${wirelessDevice.role}${wirelessDevice.uplinkTarget ? ` • uplink ${wirelessDevice.uplinkTarget}` : ""}`} /> : null}
              {edgeDevice ? chip(x + 24, y + 188, 90, `${deviceValidationItems(edgeDevice, site, validations, synthesized).length} edge flags`, deviceValidationItems(edgeDevice, site, validations, synthesized).length ? "orange" : "green") : null}
              {switchDevice ? chip(x + 150, y + 188, 104, `${deviceValidationItems(switchDevice, site, validations, synthesized).length} core/access flags`, deviceValidationItems(switchDevice, site, validations, synthesized).length ? "orange" : "blue") : null}
              {dmzService ? <g><rect x={x + 194} y={y + 188} width="88" height="24" rx="12" fill="#eef6ff" stroke="#9ab9ef" /><text x={x + 238} y={y + 204} textAnchor="middle" fontSize="10.5" fill="#24446f">DMZ subnet</text><DeviceIcon x={x + 210} y={y + 218} kind="server" label="DMZ Host" sublabel={dmzService.subnetCidr || "Published"} /></g> : null}

              {edgeDevice && switchDevice ? pathLine([[x + 120, y + 142], [x + 126, y + 142]], "routed", edgeDevice.deviceType === "firewall" ? "inside / transit" : "LAN handoff", edgeDevice.connectedSubnets[0] || undefined) : null}
              {switchDevice && serviceDevice ? pathLine([[x + 238, y + 142], [x + 212, y + 142]], "trunk", "server trunk", serviceDevice.connectedSubnets[0] || undefined) : null}
              {switchDevice && wirelessDevice ? pathLine([[x + 182, y + 175], [x + 166, y + 196]], "trunk", "AP uplink", wirelessDevice.connectedZones[0] || undefined) : null}
              {edgeDevice && dmzService ? <><g>{pathLine([[x + 78, y + 164], [x + 194, y + 200]], "internet", "Published-service path", dmzService.ingressInterface || dmzService.subnetCidr || undefined)}</g><g>{pathLine([[x + 238, y + 212], [x + 238, y + 218]], "trunk", "DMZ host access", dmzService.subnetCidr || undefined)}</g>{managementBoundaryForSite(site.name, synthesized) ? <g>{pathLine([[x + 170, y + 155], [x + 214, y + 250]], "ha", "Management-only path", managementBoundaryForSite(site.name, synthesized)?.attachedInterface || managementBoundaryForSite(site.name, synthesized)?.zoneName)}</g> : null}</> : null}

              <text x={x + 18} y={y + 286} fontSize="12" fontWeight="700" fill="#324866">{diagramLegend(overlay).title}</text>
              {siteOverlays.slice(0, 3).map((item, overlayIndex) => chip(x + 18, y + 298 + overlayIndex * 24, cardWidth - 36, item, overlayTone(overlay)))}
              {siteOverlays.length === 0 ? <text x={x + 18} y={y + 316} fontSize="10.5" fill="#6a7d97">No overlay items yet for this site.</text> : null}
              {interfaceSummary(edgeDevice).slice(0,2).map((label, interfaceIndex) => chip(x + 18, y + 224 + interfaceIndex * 24, 118, label, "green"))}
              {interfaceSummary(switchDevice).slice(0, 2).map((label, interfaceIndex) => chip(x + 146, y + 224 + interfaceIndex * 24, 126, label, "blue"))}
              {securitySummary.map((boundary, boundaryIndex) => (
                <text key={`${site.id}-${boundary.zoneName}-${boundaryIndex}`} x={x + 18} y={y + cardHeight - 30 + boundaryIndex * 14} fontSize="10.5" fill="#61758f">{boundary.zoneName}: {boundary.controlPoint}{boundary.attachedInterface ? ` • ${boundary.attachedInterface}` : ""}</text>
              ))}
              {siteValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-validation-${itemIndex}`} x={x + 18} y={y + cardHeight - 8} fontSize="10.5" fill="#9a3412">Validation: {item.title}</text>)}
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
  validations,
  overlay,
  onSelectTarget,
}: {
  project: ProjectDetail;
  synthesized: SynthesizedLogicalDesign;
  svgId: string;
  comments: ProjectComment[];
  validations: ValidationResult[];
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
  const hqValidation = primarySite ? siteValidationItems(primarySite, validations) : [];
  const hqValidationTone = validationSeverityTone(hqValidation);

  const flowOverlays = overlay === "flows" ? synthesized.trafficFlows.slice(0, 4) : [];
  const legend = diagramLegend(overlay);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Physical style topology diagram with network-style device symbols, overlay modes, and reviewable connection semantics">
        <rect x={0} y={0} width={width} height={height} rx={30} fill="#fbfdff" />

        <rect x={48} y={42} width={width - 96} height={180} rx={28} fill="#f8fbff" stroke="#dbe6f7" strokeWidth="2" />
        <text x={72} y={76} fontSize="21" fontWeight="700" fill="#152742">Physical / topology diagram</text>
        <text x={72} y={101} fontSize="12" fill="#607791">v160 keeps the diagram moving toward network-style symbols, clearer path semantics, stronger boundary visibility, and more reviewable topology behavior across primary, branch, and cloud contexts.</text>
        <text x={72} y={122} fontSize="12" fill="#607791">Connection semantics: routed = blue, trunk = purple, VPN/WAN = green dashed, internet = blue dashed, management/control = slate, flow overlay = orange.</text>
        {chip(width - 310, 68, 230, legend.title, overlayTone(overlay))}
        {legend.details.map((detail, index) => <text key={detail} x={width - 300} y={104 + index * 18} fontSize="11" fill="#607791">• {detail}</text>)}

        <DeviceIcon x={centerX - 65} y={104} kind="internet" label="Internet / WAN" sublabel={synthesized.topology.internetBreakout} />
        {pathLine([[centerX, 170], [centerX, 222]], "internet", synthesized.topology.topologyType === "hub-spoke" ? "Internet + branch WAN" : "North-south edge")}
        <DeviceIcon x={centerX - 60} y={226} kind="firewall" label="Perimeter Firewall" sublabel={synthesized.topology.redundancyModel} />
        {primaryDmzService(synthesized, primarySite?.name) ? <g><rect x={centerX + 126} y={246} width="120" height="28" rx="14" fill="#eef6ff" stroke="#9ab9ef" /><text x={centerX + 186} y={264} textAnchor="middle" fontSize="11" fill="#24446f">DMZ subnet</text><DeviceIcon x={centerX + 270} y={232} kind="server" label="DMZ Host" sublabel={primaryDmzService(synthesized, primarySite?.name)?.subnetCidr || "Published service"} /></g> : null}
        {primaryDmzService(synthesized, primarySite?.name) ? <><g>{pathLine([[centerX + 58, 262], [centerX + 126, 262]], "internet", "dmz", primaryDmzService(synthesized, primarySite?.name)?.ingressInterface || undefined)}</g><g>{pathLine([[centerX + 246, 262], [centerX + 270, 262]], "trunk", "dmz host", primaryDmzService(synthesized, primarySite?.name)?.subnetCidr || undefined)}</g></> : null}
        {pathLine([[centerX, 278], [centerX, 340]], "routed", "inside / routed core", synthesized.routingPlan.find((item) => item.siteId === primarySite?.id)?.summaryAdvertisement || undefined)}

        <rect x={centerX - 270} y={344} width={540} height={360} rx={28} fill={hqValidationTone.fill} stroke={hqValidationTone.stroke} strokeWidth="2.5" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => primarySite && onSelectTarget?.("SITE", primarySite.id)} />
        <text x={centerX - 236} y={380} fontSize="19" fontWeight="700" fill="#16263d">{primarySite?.name || project.name}</text>
        <text x={centerX - 236} y={400} fontSize="11" fill="#6a7d97">Primary site / policy hub</text>
        <text x={centerX - 236} y={418} fontSize="11" fill="#6a7d97">{primarySite?.defaultAddressBlock || "No site summary block assigned"}</text>
        {taskBadge(centerX + 236, 372, hqTaskCount)}
        {hqValidation.length > 0 ? chip(centerX + 82, 360, 148, `Validation ${hqValidation.length}`, hqValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null}

        <DeviceIcon x={centerX - 216} y={448} kind="router" label="Core Routing" sublabel="Summaries / north-south" />
        <DeviceIcon x={centerX - 66} y={452} kind="core-switch" label="Core Switch" sublabel="Inter-VLAN / trunks" />
        <DeviceIcon x={centerX + 96} y={448} kind="server" label="Shared Services" sublabel="Server / management" />
        <DeviceIcon x={centerX - 20} y={564} kind="access-switch" label="Access Layer" sublabel="Users / closets / PoE" />
        <DeviceIcon x={centerX + 178} y={564} kind="access-point" label="Wireless" sublabel="Staff / guest" />

        {pathLine([[centerX - 128, 480], [centerX - 66, 480]], "routed", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "router")) || "svi / routed handoff", synthesized.routingPlan.find((item) => item.siteId === primarySite?.id)?.loopbackCidr || undefined)}
        {pathLine([[centerX + 46, 480], [centerX + 96, 480]], "trunk", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "server")) || "server / service trunk", synthesized.servicePlacements.find((item) => item.siteName === primarySite?.name)?.subnetCidr || undefined)}
        {pathLine([[centerX - 8, 594], [centerX + 178, 594]], "trunk", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "access-point")) || "edge access / AP uplink", (requirements.wireless || requirements.guestWifi) ? "staff + guest SSIDs" : undefined)}

        {overlay === "addressing" ? synthesized.addressingPlan.filter((row) => row.siteId === primarySite?.id).slice(0, 6).map((row, index) => chip(centerX - 238, 630 + index * 28, 476, `${row.segmentName} • VLAN ${row.vlanId ?? "—"} • ${row.subnetCidr}`, "blue")) : null}
        {overlay === "security" ? synthesized.securityBoundaries.filter((boundary) => boundary.siteName === primarySite?.name).slice(0, 5).map((boundary, index) => chip(centerX - 238, 630 + index * 28, 476, `${boundary.zoneName} • ${boundary.attachedDevice} • ${boundary.controlPoint}`, "purple")) : null}
        {overlay === "flows" ? flowOverlays.slice(0, 3).map((flow, index) => chip(centerX - 238, 630 + index * 28, 476, `${flow.flowLabel} • ${flow.sourceZone} → ${flow.destinationZone}`, "orange")) : null}
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
          const siteValidation = siteValidationItems(site, validations);
          const siteValidationTone = validationSeverityTone(siteValidation);
          const edgePlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "firewall" || placement.deviceType === "router"));
          const switchPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "core-switch" || placement.deviceType === "access-switch" || placement.deviceType === "distribution-switch"));
          const serverPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && placement.deviceType === "server");
          const wirelessPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "access-point" || placement.deviceType === "wireless-controller"));
          const edgeDevice = edgePlacement?.deviceType || "router";
          const localOverlay = overlayItems(site, synthesized, overlay);
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
              {pathLine([[centerX, 490], [anchorX, anchorY]], synthesized.topology.topologyType === "hub-spoke" ? "vpn" : "routed", synthesized.wanLinks.find((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id)?.linkName || (synthesized.topology.topologyType === "hub-spoke" ? "WAN / hub-spoke" : "Inter-site path"), synthesized.wanLinks.find((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id)?.subnetCidr || undefined)}
              <rect x={x} y={y} width={boxWidth} height={340} rx={24} fill={siteValidationTone.fill} stroke={siteValidationTone.stroke} strokeWidth="2.3" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 20} y={y + 30} fontSize="17" fontWeight="700" fill="#16263d">{site.name}</text>
              <text x={x + 20} y={y + 49} fontSize="11" fill="#6a7d97">{site.defaultAddressBlock || "No site block assigned"}</text>
              <text x={x + 20} y={y + 64} fontSize="10.5" fill="#526984">{siteRoleSummary(site.name, synthesized)}</text>
              {taskBadge(x + boxWidth - 28, y + 24, siteTaskCount)}
              {siteValidation.length > 0 ? chip(x + 150, y + 18, 132, `Validation ${siteValidation.length}`, siteValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null}

              <rect x={x + 8} y={y + 74} width={112} height={100} rx={16} fill="#f8fbff" stroke="#c7d8f7" strokeDasharray="6 4" />
              <text x={x + 20} y={y + 88} fontSize="10.5" fill="#526984">Perimeter / edge zone group</text>
              <rect x={x + 118} y={y + 78} width={122} height={96} rx={16} fill="#f9fcff" stroke="#d6e4fb" strokeDasharray="6 4" />
              <text x={x + 130} y={y + 92} fontSize="10.5" fill="#526984">Core / access zone group</text>
              {site.name === synthesized.topology.primarySiteName ? <rect x={x + 8} y={y + 58} width={boxWidth - 16} height="12" rx="6" fill="#eef4ff" stroke="#bfd2f3" /> : null}
              {site.name === synthesized.topology.primarySiteName ? <text x={x + boxWidth / 2} y={y + 67} textAnchor="middle" fontSize="10" fontWeight="700" fill="#284b78">PRIMARY / SHARED-SERVICE / POLICY HUB</text> : null}

              <DeviceIcon x={x + 16} y={y + 96} kind={edgeDevice} label={edgePlacement?.deviceName || deviceLabel(edgeDevice)} sublabel={`${edgePlacement?.role || "Site edge / VPN"}${edgePlacement?.uplinkTarget ? ` • uplink ${edgePlacement.uplinkTarget}` : ""}`} />
              <DeviceIcon x={x + 132} y={y + 98} kind={switchPlacement?.deviceType || "access-switch"} label={switchPlacement?.deviceName || deviceLabel(switchPlacement?.deviceType || "access-switch")} sublabel={`${switchPlacement?.role || "Users / trunks"}${switchPlacement?.uplinkTarget ? ` • uplink ${switchPlacement.uplinkTarget}` : ""}`} />
              {wirelessPlacement ? <DeviceIcon x={x + 254} y={y + 102} kind={wirelessPlacement.deviceType} label={wirelessPlacement.deviceName} sublabel={`${wirelessPlacement.role}${wirelessPlacement.uplinkTarget ? ` • uplink ${wirelessPlacement.uplinkTarget}` : ""}`} /> : null}
              {serverPlacement ? <DeviceIcon x={x + 214} y={y + 26} kind="server" label={serverPlacement.deviceName} sublabel={serverPlacement.connectedSubnets[0] || serverPlacement.role} /> : null}
              {pathLine([[x + 118, y + 125], [x + 132, y + 125]], "routed", firstInterfaceLabel(edgePlacement) || "inside", synthesized.addressingPlan.find((row) => row.siteId === site.id)?.gatewayIp || undefined)}
              {wirelessPlacement ? pathLine([[x + 244, y + 125], [x + 254, y + 125]], "trunk", firstInterfaceLabel(wirelessPlacement) || "wireless / access", localOverlay[0] || undefined) : null}

              {edgeStack.map((item, itemIndex) => chip(x + 18, y + 178 + itemIndex * 24, boxWidth - 36, item, "green"))}
              {switchStack.map((item, itemIndex) => chip(x + 18, y + 226 + itemIndex * 24, boxWidth - 36, item, "blue"))}
              {zoneLabels.slice(0, 1).map((item, itemIndex) => chip(x + 18, y + 274 + itemIndex * 24, boxWidth - 36, item, "purple"))}
              {localOverlay.slice(0, 1).map((item, itemIndex) => chip(x + 18, y + 298 + itemIndex * 24, boxWidth - 36, item, overlayTone(overlay)))}
              {dmzBoundary ? <text x={x + 18} y={y + 320} fontSize="10.2" fill="#5a34a3">DMZ boundary: {dmzBoundary.attachedDevice}{dmzBoundary.attachedInterface ? ` • ${dmzBoundary.attachedInterface}` : ''}</text> : null}
              {managementBoundary ? <text x={x + 18} y={y + 334} fontSize="10.2" fill="#24446f">Management boundary: {managementBoundary.controlPoint}</text> : null}

              {edgeInterfaceValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-edge-if-validation-${itemIndex}`} x={x + 18} y={y + 352 + itemIndex * 14} fontSize="10.2" fill="#9a3412">Edge interface: {item.title}</text>)}
              {switchInterfaceValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-switch-if-validation-${itemIndex}`} x={x + 18} y={y + 366 + itemIndex * 14} fontSize="10.2" fill="#9a3412">Switch interface: {item.title}</text>)}
              {pathValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-path-validation-${itemIndex}`} x={x + 18} y={y + 380 + itemIndex * 14} fontSize="10.2" fill="#9a3412">Path/link: {item.title}</text>)}
              {edgeValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-edge-validation-${itemIndex}`} x={x + 18} y={y + 394 + itemIndex * 14} fontSize="10.2" fill="#9a3412">Edge role: {item.title}</text>)}
              {switchValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-switch-validation-${itemIndex}`} x={x + 18} y={y + 408 + itemIndex * 14} fontSize="10.2" fill="#9a3412">Switching role: {item.title}</text>)}

              {zoneRects.slice(0, 2).map((zone, zoneIndex) => <text key={`${site.id}-zone-rect-${zoneIndex}`} x={x + 214} y={y + 186 + zoneIndex * 14} fontSize="10.2" fill="#5a34a3">{zone.label}: {zone.anchor}</text>)}
              {dmzService ? <g>{pathLine([[x + 66, y + 118], [x + 252, y + 74]], 'internet', 'Published-service path', dmzService.ingressInterface || dmzService.subnetCidr || undefined)}<rect x={x + 234} y={y + 28} width="68" height="18" rx="9" fill="#eef6ff" stroke="#9ab9ef" /><text x={x + 268} y={y + 40} textAnchor="middle" fontSize="10" fill="#24446f">DMZ subnet</text>{pathLine([[x + 268, y + 46], [x + 268, y + 62]], 'trunk', 'Published host', dmzService.subnetCidr || undefined)}{managementBoundary ? pathLine([[x + 184, y + 122], [x + 268, y + 62]], 'ha', 'Management-only path', managementBoundary.attachedInterface || managementBoundary.zoneName) : null}</g> : null}
            </g>
          );
        })}

        {flowOverlays.map((flow, index) => {
          const baseY = 774 + index * 84;
          return (
            <g key={flow.id}>
              {pathLine([[86, baseY], [width - 86, baseY]], "flow", `${flow.flowLabel} • ${flow.sourceZone} → ${flow.destinationZone}`)}
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
  return (
    <div className="topology-icon-legend">
      <strong style={{ display: "block" }}>Device symbol library</strong>
      <p className="muted" style={{ margin: "2px 0 0 0" }}>
        v113 sets the diagram direction toward network-style device symbols. The goal is firewall, router, stacked-switch, AP, server, cloud, and edge visuals that read like infrastructure objects, not generic circles or plain rectangles.
      </p>
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
    : topologyLabel === "campus"
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

function SiteDeviceLinkMatrixPanel({ synthesized }: { synthesized: SynthesizedLogicalDesign }) {
  const siteRows = synthesized.siteHierarchy.map((site) => {
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
      tier: site.tier || site.siteRole || site.source,
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
  const serviceAnchors = Array.from(new Set(synthesized.servicePlacements.slice(0, 6).map((item) => `${item.serviceName} • ${item.placementType}`)));
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
          <div><span>Cloud posture</span><strong>{synthesized.topology.cloudPattern || (synthesized.topology.cloudConnected ? "Cloud-connected" : "On-prem")}</strong></div>
          <div><span>WAN posture</span><strong>{synthesized.topology.wanPattern || (synthesized.wanLinks.length ? "WAN present" : "Local only")}</strong></div>
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
        <p style={{ margin: "0 0 8px 0" }}>{synthesized.topology.topologyNarrative || synthesized.topology.topologyLabel}</p>
        <div className="network-chip-list">
          <span className="badge-soft">{synthesized.topology.topologyType}</span>
          <span className="badge-soft">WAN {synthesized.topology.wanPattern || (synthesized.wanLinks.length ? "WAN present" : "Local only")}</span>
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
    ["Security", "Review trust boundaries, enforcement attachment, DMZ adjacency, and guest or management separation."],
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


export function ProjectDiagram({ project, comments = [], validations = [], onSelectTarget }: ProjectDiagramProps) {
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
          <p className="muted" style={{ margin: 0 }}>v120 batches several deeper diagram passes together: more realistic network-style device visuals, topology-specific path and placement review, stronger overlay evidence, and a clearer review sequence so the workspace reads more like an engineering tool than a placeholder canvas.</p>
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
      <DeviceRealismDirectionPanel />
      <TopologyObjectPanel synthesized={synthesized} />
      <TopologyFoundationPanel synthesized={synthesized} />
      <ArchitectureSignals synthesized={synthesized} />
      <Legend />
      <DeviceSymbolLibraryPanel />
      <OverlayReviewPanel overlay={overlay} />
      <OverlayBehaviorPanel overlay={overlay} />
      <ConnectionSemanticsPanel />
      <LinkTypeRenderingPanel synthesized={synthesized} />
      <OverlayEvidencePanel overlay={overlay} synthesized={synthesized} />
      <TopologySpecificRenderingPanel synthesized={synthesized} />
      <TopologyBehaviorMatrixPanel synthesized={synthesized} />
      <DiagramReviewSequencePanel overlay={overlay} />
      <div className="diagram-note-grid" style={{ marginTop: 10 }}>
        <div className="diagram-note-card">
          <strong style={{ display: "block", marginBottom: 6 }}>Report cross-check</strong>
          <p style={{ margin: 0, color: "#61758f" }}>Use Placement with report section 3, Addressing with section 4, Security with section 6, and Flows with section 7 so the device, subnet, and boundary names match the written package exactly.</p>
        </div>
        <div className="diagram-note-card">
          <strong style={{ display: "block", marginBottom: 6 }}>Validation cross-check</strong>
          <p style={{ margin: 0, color: "#61758f" }}>If labels, paths, interfaces, DMZ chains, or primary-versus-branch behavior look wrong here, review the same mismatch in validation and then correct it in addressing, security, routing, or service-placement workspaces.</p>
        </div>
      </div>
      <SiteDeviceLinkMatrixPanel synthesized={synthesized} />
      {overlay === "flows" ? <FlowSummaryPanel flows={synthesized.trafficFlows} /> : null}
      {mode === "logical"
        ? <LogicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} validations={validations} overlay={overlay} diagramMode={mode} onSelectTarget={onSelectTarget} />
        : <PhysicalTopologyDiagram project={project} synthesized={synthesized} svgId={svgId} comments={comments} validations={validations} overlay={overlay} onSelectTarget={onSelectTarget} />}
    </div>
  );
}
