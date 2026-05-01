import { useEffect, useMemo, useState } from "react";
import type { BackendDiagramRenderEdge, BackendDiagramRenderModel, BackendDiagramRenderNode } from "../../../lib/designCoreSnapshot";
import { truthBadgeClass } from "../../../lib/reportDiagramTruth";
import type { ActiveOverlayMode, DiagramMode, DiagramScope, LinkAnnotationMode } from "../diagramTypes";
import { DeviceIcon, type DeviceKind } from "./diagramRendererShared";

interface BackendDiagramCanvasProps {
  renderModel: BackendDiagramRenderModel;
  mode: DiagramMode;
  scope: DiagramScope;
  focusedSiteId?: string;
  activeOverlays: ActiveOverlayMode[];
  linkAnnotationMode: LinkAnnotationMode;
}

type CanvasBounds = { width: number; height: number; offsetX: number; offsetY: number };
type PreparedDiagram = { nodes: BackendDiagramRenderNode[]; edges: BackendDiagramRenderEdge[] };

function professionalNodeKind(node: BackendDiagramRenderNode) {
  if (node.objectType === "site") return "Site";
  if (node.objectType === "vlan") return "VLAN";
  if (node.objectType === "subnet") return "Subnet";
  if (node.objectType === "network-device") {
    if (/firewall/i.test(node.label)) return "Firewall";
    if (/core|gateway|router/i.test(node.label)) return "Gateway";
    return "Device";
  }
  if (node.objectType === "route-domain" || node.objectType === "route-intent") return "Routing";
  if (node.objectType === "security-zone") {
    if (/wan|internet/i.test(node.label)) return "WAN";
    return "Zone";
  }
  if (node.objectType === "policy-rule" || node.objectType === "security-flow") return "Policy";
  if (node.objectType === "dhcp-pool") return "DHCP";
  if (node.objectType === "network-link") return "Link";
  return node.objectType.replace(/-/g, " ");
}

function cleanCanvasLabel(value: string, max = 28) {
  const cleaned = value
    .replace(/device-[0-9a-f-]+/gi, "device")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function cleanCanvasNote(value: string, max = 150) {
  const cleaned = value
    .replace(/\bPhase\s+\d+\s+models\b/gi, "The current planning model uses")
    .replace(/\bFuture phases\b/gi, "Future versions")
    .replace(/\bbackend\b/gi, "design model")
    .replace(/\bdesign-core\b/gi, "design model")
    .replace(/\bfinding reference\(s\)/gi, "review item")
    .replace(/\btechnical proof model\b/gi, "engineering review model")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function isWanEdge(node: BackendDiagramRenderNode) {
  return node.objectType === "security-zone" && /wan|internet|cloud|wide area/i.test(`${node.label} ${node.notes.join(" ")}`);
}

function isSecurityObject(node: BackendDiagramRenderNode) {
  return node.objectType === "security-zone" || node.objectType === "policy-rule" || node.objectType === "security-flow" || node.objectType === "nat-rule";
}

function isGatewayDevice(node: BackendDiagramRenderNode) {
  return node.objectType === "network-device" && /gateway|router|firewall|core|edge/i.test(`${node.label} ${node.notes.join(" ")}`);
}

function isExternalAnchor(node: BackendDiagramRenderNode) {
  return isWanEdge(node) || node.objectType === "route-domain";
}

function siteCodeFromLabel(label: string) {
  const clean = label.replace(/—.*/, "").replace(/\(.*/, "").trim();
  if (/hq/i.test(label)) return "HQ";
  const match = clean.match(/\bS\d+\b/i) || label.match(/\bSite\s*(\d+)\b/i);
  return match ? (match[0].toUpperCase().startsWith("S") ? match[0].toUpperCase() : `S${match[1]}`) : clean.slice(0, 8);
}

function siteRank(node: BackendDiagramRenderNode) {
  const label = node.label.toLowerCase();
  if (label.includes("hq") || label.includes("head") || label.includes("primary")) return -1;
  const match = label.match(/\b(?:site|s)\s*(\d{1,2})\b/);
  return match ? Number(match[1]) : 999;
}

function selectedOverlaySet(activeOverlays: ActiveOverlayMode[]) {
  return new Set(activeOverlays.map((item) => String(item)));
}

function explicitlyRequestsAddressing(activeOverlays: ActiveOverlayMode[]) {
  return activeOverlays.includes("addressing") || activeOverlays.includes("services");
}

function explicitlyRequestsSecurity(activeOverlays: ActiveOverlayMode[]) {
  return activeOverlays.includes("security") || activeOverlays.includes("flows");
}

function nodeAllowedByScope(node: BackendDiagramRenderNode, scope: DiagramScope, focusedSiteId?: string) {
  if (scope === "site") {
    return Boolean(focusedSiteId && node.siteId === focusedSiteId) || isExternalAnchor(node);
  }
  if (scope === "wan-cloud") {
    return node.objectType === "site" || isGatewayDevice(node) || node.objectType === "route-domain" || isWanEdge(node);
  }
  if (scope === "boundaries") {
    return isSecurityObject(node) && !(/voice/i.test(node.label) && node.notes.every((note) => /no|zero|not/i.test(note)));
  }
  return true;
}

function nodeAllowedByView(node: BackendDiagramRenderNode, mode: DiagramMode, scope: DiagramScope, activeOverlays: ActiveOverlayMode[]) {
  const overlays = selectedOverlaySet(activeOverlays);
  const wantsAddressing = explicitlyRequestsAddressing(activeOverlays);
  const wantsSecurity = explicitlyRequestsSecurity(activeOverlays);

  if (scope === "boundaries") {
    return isSecurityObject(node);
  }

  if (scope === "wan-cloud") {
    return node.objectType === "site" || isGatewayDevice(node) || isWanEdge(node) || node.objectType === "route-domain";
  }

  if (mode === "physical") {
    if (node.objectType === "site" || isGatewayDevice(node) || isWanEdge(node)) return true;
    if (node.objectType === "dhcp-pool" && overlays.has("services")) return true;
    if (wantsSecurity && isSecurityObject(node)) return true;
    return false;
  }

  if (mode === "logical") {
    if (node.objectType === "site" || node.objectType === "vlan" || node.objectType === "subnet" || node.objectType === "route-domain") return true;
    if (isGatewayDevice(node)) return true;
    if (node.objectType === "dhcp-pool" && wantsAddressing) return true;
    if (wantsSecurity && isSecurityObject(node)) return true;
    return false;
  }

  return true;
}

function edgeAllowedByView(edge: BackendDiagramRenderEdge, mode: DiagramMode, scope: DiagramScope, activeOverlays: ActiveOverlayMode[]) {
  const wantsAddressing = explicitlyRequestsAddressing(activeOverlays);
  const wantsSecurity = explicitlyRequestsSecurity(activeOverlays);

  if (scope === "boundaries") {
    return edge.relationship === "security-zone-applies-policy"
      || edge.relationship === "security-flow-covered-by-policy"
      || edge.relationship === "security-zone-initiates-security-flow"
      || edge.relationship === "security-flow-targets-security-zone"
      || edge.relationship === "nat-rule-translates-zone";
  }

  if (scope === "wan-cloud") {
    return edge.overlayKeys.includes("routing") || edge.overlayKeys.includes("nat") || /wan|internet|cloud|site-to-site|summary/i.test(edge.label);
  }

  if (mode === "physical") {
    if (edge.relationship === "site-contains-device") return true;
    if (edge.overlayKeys.includes("routing") && /site-to-site|WAN edge path|internet\/security edge|routing domain/i.test(edge.label)) return true;
    if (wantsAddressing && edge.relationship === "dhcp-pool-serves-subnet") return true;
    if (wantsSecurity && edge.overlayKeys.includes("security") && edge.relationship !== "security-zone-protects-subnet") return true;
    return false;
  }

  if (mode === "logical") {
    if (edge.relationship === "site-contains-vlan" || edge.relationship === "vlan-uses-subnet" || edge.relationship === "interface-belongs-to-route-domain") return true;
    if (edge.relationship === "site-contains-device") return true;
    if (edge.overlayKeys.includes("routing") && /routing domain|site-to-site|summary/i.test(edge.label)) return true;
    if (wantsAddressing && edge.relationship === "dhcp-pool-serves-subnet") return true;
    if (wantsSecurity && edge.overlayKeys.includes("security") && edge.relationship !== "security-zone-protects-subnet") return true;
    return false;
  }

  return false;
}

function edgeAllowedByScope(edge: BackendDiagramRenderEdge, source: BackendDiagramRenderNode, target: BackendDiagramRenderNode, scope: DiagramScope, focusedSiteId?: string) {
  if (scope !== "site") return true;
  const sourceInSite = Boolean(focusedSiteId && source.siteId === focusedSiteId);
  const targetInSite = Boolean(focusedSiteId && target.siteId === focusedSiteId);
  const sourceAnchor = isExternalAnchor(source);
  const targetAnchor = isExternalAnchor(target);
  return (sourceInSite && (targetInSite || targetAnchor)) || (targetInSite && (sourceInSite || sourceAnchor));
}

function buildVisibleDiagram(renderModel: BackendDiagramRenderModel, mode: DiagramMode, scope: DiagramScope, focusedSiteId: string | undefined, activeOverlays: ActiveOverlayMode[]): PreparedDiagram {
  const nodeById = new Map(renderModel.nodes.map((node) => [node.id, node]));
  const baseIds = new Set<string>();

  for (const node of renderModel.nodes) {
    if (nodeAllowedByScope(node, scope, focusedSiteId) && nodeAllowedByView(node, mode, scope, activeOverlays)) {
      baseIds.add(node.id);
    }
  }

  const candidateEdges = renderModel.edges.filter((edge) => {
    const source = nodeById.get(edge.sourceNodeId);
    const target = nodeById.get(edge.targetNodeId);
    if (!source || !target) return false;
    return edgeAllowedByView(edge, mode, scope, activeOverlays) && edgeAllowedByScope(edge, source, target, scope, focusedSiteId);
  });

  const visibleIds = new Set(baseIds);
  for (const edge of candidateEdges) {
    const source = nodeById.get(edge.sourceNodeId);
    const target = nodeById.get(edge.targetNodeId);
    if (!source || !target) continue;
    if (nodeAllowedByScope(source, scope, focusedSiteId) && nodeAllowedByView(source, mode, scope, activeOverlays)) visibleIds.add(source.id);
    if (nodeAllowedByScope(target, scope, focusedSiteId) && nodeAllowedByView(target, mode, scope, activeOverlays)) visibleIds.add(target.id);
    if (isExternalAnchor(source) && scope !== "boundaries") visibleIds.add(source.id);
    if (isExternalAnchor(target) && scope !== "boundaries") visibleIds.add(target.id);
  }

  const nodes = renderModel.nodes.filter((node) => visibleIds.has(node.id));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = candidateEdges.filter((edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId));
  const limit = scope === "boundaries" ? 90 : mode === "logical" ? 120 : 80;
  return layoutNodesForView({ nodes: nodes.slice(0, limit), edges, mode, scope, focusedSiteId, activeOverlays });
}

function layoutNodesForView(params: PreparedDiagram & { mode: DiagramMode; scope: DiagramScope; focusedSiteId?: string; activeOverlays: ActiveOverlayMode[] }): PreparedDiagram {
  const { nodes, edges, mode, scope } = params;
  const byId = new Map(nodes.map((node) => [node.id, { ...node }]));
  const orderedSites = nodes.filter((node) => node.objectType === "site").sort((a, b) => siteRank(a) - siteRank(b) || a.label.localeCompare(b.label, undefined, { numeric: true }));
  const hq = orderedSites.find((site) => /hq|head|primary/i.test(site.label)) ?? orderedSites[0];
  const branches = orderedSites.filter((site) => site.id !== hq?.id);
  const routeDomain = nodes.find((node) => node.objectType === "route-domain");
  const wan = nodes.find(isWanEdge);
  const set = (node: BackendDiagramRenderNode | undefined, x: number, y: number) => {
    if (!node) return;
    const current = byId.get(node.id);
    if (current) byId.set(node.id, { ...current, x, y });
  };
  const setChildren = (site: BackendDiagramRenderNode, startX: number, startY: number) => {
    const siteDevices = nodes.filter((node) => node.siteId === site.siteId && node.objectType === "network-device");
    siteDevices.forEach((device, index) => set(device, startX + (index - (siteDevices.length - 1) / 2) * 116, startY + 108));
    const dhcp = nodes.filter((node) => node.siteId === site.siteId && node.objectType === "dhcp-pool");
    dhcp.forEach((node, index) => set(node, startX + 150, startY + 104 + index * 68));
  };

  if (scope === "boundaries") {
    const zones = nodes.filter((node) => node.objectType === "security-zone").sort((a, b) => a.label.localeCompare(b.label));
    const policies = nodes.filter((node) => node.objectType === "policy-rule" || node.objectType === "security-flow").sort((a, b) => a.label.localeCompare(b.label));
    zones.forEach((zone, index) => set(zone, 360, 170 + index * 118));
    policies.forEach((policy, index) => set(policy, 880, 150 + index * 86));
    if (wan) set(wan, 130, 220);
    return { nodes: [...byId.values()], edges };
  }

  if (scope === "site") {
    const site = orderedSites.find((candidate) => candidate.siteId === params.focusedSiteId) ?? orderedSites[0];
    set(routeDomain, 520, 80);
    set(site, 520, 220);
    setChildren(site, 520, 220);
    set(wan, 880, 360);
    if (mode === "logical") {
      const logicalRows = nodes.filter((node) => node.siteId === site?.siteId && (node.objectType === "vlan" || node.objectType === "subnet"));
      const vlans = logicalRows.filter((node) => node.objectType === "vlan");
      const subnets = logicalRows.filter((node) => node.objectType === "subnet");
      vlans.forEach((vlan, index) => set(vlan, 240 + (index % 2) * 340, 430 + Math.floor(index / 2) * 92));
      subnets.forEach((subnet, index) => set(subnet, 240 + (index % 2) * 340, 466 + Math.floor(index / 2) * 92));
    }
    return { nodes: [...byId.values()], edges };
  }

  if (scope === "wan-cloud") {
    set(routeDomain, 760, 80);
    set(wan, 760, 280);
    if (hq) {
      set(hq, 760, 470);
      setChildren(hq, 760, 470);
    }
    const columns = Math.max(1, Math.min(5, branches.length));
    branches.forEach((site, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = 220 + column * 280;
      const y = 720 + row * 220;
      set(site, x, y);
      setChildren(site, x, y);
    });
    return { nodes: [...byId.values()], edges };
  }

  if (mode === "logical") {
    set(routeDomain, 760, 80);
    const columns = Math.max(1, Math.min(4, orderedSites.length));
    orderedSites.forEach((site, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = 240 + column * 390;
      const y = 240 + row * 720;
      set(site, x, y);
      const devices = nodes.filter((node) => node.siteId === site.siteId && node.objectType === "network-device");
      devices.slice(0, 2).forEach((device, deviceIndex) => set(device, x - 70 + deviceIndex * 140, y + 96));
      const vlans = nodes.filter((node) => node.siteId === site.siteId && node.objectType === "vlan");
      const subnets = nodes.filter((node) => node.siteId === site.siteId && node.objectType === "subnet");
      vlans.forEach((vlan, vlanIndex) => set(vlan, x - 125 + (vlanIndex % 2) * 250, y + 190 + Math.floor(vlanIndex / 2) * 88));
      subnets.forEach((subnet, subnetIndex) => set(subnet, x - 125 + (subnetIndex % 2) * 250, y + 224 + Math.floor(subnetIndex / 2) * 88));
    });
    return { nodes: [...byId.values()], edges };
  }

  set(routeDomain, 760, 70);
  set(wan, 760, 300);
  if (hq) {
    set(hq, 760, 200);
    setChildren(hq, 760, 200);
  }
  const columns = Math.max(1, Math.min(4, branches.length));
  branches.forEach((site, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = 240 + column * 360;
    const y = 570 + row * 260;
    set(site, x, y);
    setChildren(site, x, y);
  });
  return { nodes: [...byId.values()], edges };
}

function backendDiagramTextFill() {
  return "#1f3148";
}

function backendDiagramMutedFill() {
  return "#64748b";
}

function readinessStroke(readiness: BackendDiagramRenderNode["readiness"] | BackendDiagramRenderEdge["readiness"]) {
  if (readiness === "blocked") return "#c2410c";
  if (readiness === "review") return "#b7791f";
  if (readiness === "ready") return "#40699f";
  return "#64748b";
}

function automaticIconScale(nodeCount: number, scope: DiagramScope) {
  if (scope === "site") return 0.72;
  if (nodeCount > 90) return 0.42;
  if (nodeCount > 60) return 0.48;
  if (nodeCount > 36) return 0.56;
  return 0.66;
}

function professionalDeviceKind(node: BackendDiagramRenderNode): DeviceKind | null {
  const text = `${node.objectType} ${node.label} ${node.notes.join(" ")}`.toLowerCase();
  if (node.objectType === "dhcp-pool") return "server";
  if (node.objectType === "route-domain" || node.objectType === "route-intent") return "cloud-edge";
  if (node.objectType === "security-zone" && /wan|internet|wide area/.test(text)) return "internet";
  if (node.objectType !== "network-device") return null;
  if (/firewall|security boundary|perimeter/.test(text)) return "firewall";
  if (/switch|layer-3|l3/.test(text) && /core|hq/.test(text)) return "core-switch";
  if (/switch|access/.test(text)) return "access-switch";
  if (/cloud/.test(text)) return "cloud-edge";
  return "router";
}

function BackendDiagramCanvasDefs() {
  return (
    <defs>
      <pattern id="backend-diagram-grid-fine" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#d9e4f2" strokeWidth="1" opacity="0.42" />
      </pattern>
      <pattern id="backend-diagram-grid-major" width="96" height="96" patternUnits="userSpaceOnUse">
        <rect width="96" height="96" fill="url(#backend-diagram-grid-fine)" />
        <path d="M 96 0 L 0 0 0 96" fill="none" stroke="#c8d6e8" strokeWidth="1.1" opacity="0.58" />
      </pattern>
      <filter id="backend-diagram-device-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#587399" floodOpacity="0.13" />
      </filter>
      <marker id="backend-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#40699f" />
      </marker>
      <marker id="backend-arrow-blocked" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#c2410c" />
      </marker>
      <marker id="backend-arrow-review" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#b7791f" />
      </marker>
    </defs>
  );
}

function backendArrowForReadiness(readiness: BackendDiagramRenderEdge["readiness"]) {
  if (readiness === "blocked") return "url(#backend-arrow-blocked)";
  if (readiness === "review") return "url(#backend-arrow-review)";
  return "url(#backend-arrow)";
}

function nodeShape(node: BackendDiagramRenderNode, selected: boolean, scale: number) {
  const stroke = readinessStroke(node.readiness);
  const strokeWidth = selected ? 3 : node.readiness === "blocked" ? 2.2 : 1.7;
  const common = {
    fill: "#ffffff",
    stroke,
    strokeWidth,
    opacity: node.readiness === "unknown" ? 0.74 : 1,
    filter: selected ? "url(#backend-diagram-device-shadow)" : undefined,
  };

  if (node.objectType === "site") {
    const width = 138 * Math.max(scale, 0.62);
    const height = 66 * Math.max(scale, 0.62);
    return <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={16} fill="#ffffff" stroke={stroke} strokeWidth={strokeWidth} opacity="0.96" />;
  }

  if (node.objectType === "vlan" || node.objectType === "subnet" || node.objectType === "dhcp-pool") {
    const width = node.objectType === "subnet" ? 150 : 158;
    const height = 42;
    return <rect x={-(width * scale) / 2} y={-(height * scale) / 2} width={width * scale} height={height * scale} rx={10 * scale} fill={node.objectType === "subnet" ? "#f8fbff" : "#ffffff"} stroke={stroke} strokeWidth={strokeWidth} opacity="0.98" />;
  }

  if (node.objectType === "policy-rule" || node.objectType === "security-flow") {
    return <path d="M 0 -30 L 44 0 L 0 30 L -44 0 Z" {...common} />;
  }

  if (node.objectType === "security-zone") {
    return <rect x={-76 * scale} y={-32 * scale} width={152 * scale} height={64 * scale} rx={18 * scale} fill="#fffaf0" stroke={stroke} strokeWidth={strokeWidth} />;
  }

  return <circle r={31 * Math.max(scale, 0.6)} {...common} />;
}

function renderNodeVisual(node: BackendDiagramRenderNode, selected: boolean, scale: number) {
  const kind = professionalDeviceKind(node);
  const labelMax = node.objectType === "site" ? 26 : node.objectType === "subnet" ? 24 : 23;

  if (kind) {
    const iconX = -58 * scale;
    const iconY = -35 * scale;
    return (
      <>
        {selected ? <circle r={56 * scale} fill="none" stroke={readinessStroke(node.readiness)} strokeWidth="2.5" opacity="0.7" /> : null}
        <g transform={`translate(${iconX}, ${iconY}) scale(${scale})`} filter={selected ? "url(#backend-diagram-device-shadow)" : undefined}>
          <DeviceIcon x={0} y={0} kind={kind} label="" showSublabel={false} emphasized />
        </g>
        <text textAnchor="middle" y={49 * scale} fontSize={Math.max(11, 12.5 * scale)} fontWeight={700} fill={backendDiagramTextFill()}>{cleanCanvasLabel(node.label, labelMax)}</text>
        <text textAnchor="middle" y={64 * scale} fontSize={Math.max(9, 9.5 * scale)} fill={backendDiagramMutedFill()}>{professionalNodeKind(node)}</text>
      </>
    );
  }

  return (
    <>
      {nodeShape(node, selected, scale)}
      <text textAnchor="middle" y={node.objectType === "site" ? -7 : -4} fontSize={Math.max(8, 9.8 * scale)} fill={backendDiagramMutedFill()}>{professionalNodeKind(node)}</text>
      <text textAnchor="middle" y={node.objectType === "site" ? 10 : 10} fontSize={Math.max(10, 11.5 * scale)} fontWeight={700} fill={backendDiagramTextFill()}>{cleanCanvasLabel(node.label, labelMax)}</text>
      {node.objectType === "site" || node.objectType === "security-zone" ? <text textAnchor="middle" y={node.objectType === "site" ? 26 : 25} fontSize={Math.max(8, 8.8 * scale)} fill={backendDiagramMutedFill()}>{node.truthState}</text> : null}
    </>
  );
}

function nodePoint(node: BackendDiagramRenderNode, bounds: CanvasBounds) {
  return { x: node.x + bounds.offsetX, y: node.y + bounds.offsetY };
}

function calculateCanvasBounds(nodes: BackendDiagramRenderNode[]): CanvasBounds {
  const minX = Math.min(...nodes.map((node) => node.x), 0);
  const minY = Math.min(...nodes.map((node) => node.y), 0);
  const maxX = Math.max(...nodes.map((node) => node.x), 1600);
  const maxY = Math.max(...nodes.map((node) => node.y), 900);
  const paddingLeft = 240;
  const paddingTop = 180;
  const paddingRight = 440;
  const paddingBottom = 300;
  return {
    width: Math.max(1800, maxX - minX + paddingLeft + paddingRight),
    height: Math.max(1050, maxY - minY + paddingTop + paddingBottom),
    offsetX: paddingLeft - minX,
    offsetY: paddingTop - minY,
  };
}

function sourceLabel(sourceEngine: BackendDiagramRenderNode["sourceEngine"]) {
  if (sourceEngine === "object-model") return "Planning model";
  if (sourceEngine === "routing") return "Routing model";
  if (sourceEngine === "security") return "Security model";
  if (sourceEngine === "implementation") return "Implementation model";
  return "Design model";
}

function executionReadinessText(readiness: BackendDiagramRenderNode["readiness"]) {
  if (readiness === "blocked") return "Implementation blocked";
  if (readiness === "review") return "Review required";
  if (readiness === "ready") return "Ready for review";
  return "Unknown";
}

function edgePath(sourcePoint: { x: number; y: number }, targetPoint: { x: number; y: number }, scope: DiagramScope) {
  const midX = (sourcePoint.x + targetPoint.x) / 2;
  if (scope === "boundaries") {
    return `M ${sourcePoint.x} ${sourcePoint.y} C ${midX} ${sourcePoint.y}, ${midX} ${targetPoint.y}, ${targetPoint.x} ${targetPoint.y}`;
  }
  return `M ${sourcePoint.x} ${sourcePoint.y} L ${midX} ${sourcePoint.y} L ${midX} ${targetPoint.y} L ${targetPoint.x} ${targetPoint.y}`;
}

export function BackendDiagramCanvas({ renderModel, mode, scope, focusedSiteId, activeOverlays, linkAnnotationMode }: BackendDiagramCanvasProps) {
  const prepared = useMemo(() => buildVisibleDiagram(renderModel, mode, scope, focusedSiteId, activeOverlays), [renderModel, mode, scope, focusedSiteId, activeOverlays]);
  const visibleNodes = prepared.nodes;
  const visibleEdges = prepared.edges;
  const [selectedNodeId, setSelectedNodeId] = useState<string>(visibleNodes[0]?.id ?? renderModel.nodes[0]?.id ?? "");

  useEffect(() => {
    if (visibleNodes.length > 0 && !visibleNodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(visibleNodes[0].id);
    }
  }, [selectedNodeId, visibleNodes]);

  const nodeById = useMemo(() => new Map(visibleNodes.map((node) => [node.id, node])), [visibleNodes]);
  const selectedNode = nodeById.get(selectedNodeId) ?? visibleNodes[0];
  const canvasBounds = useMemo(() => calculateCanvasBounds(visibleNodes), [visibleNodes]);
  const iconScale = automaticIconScale(visibleNodes.length, scope);
  const siteCount = visibleNodes.filter((node) => node.objectType === "site").length;
  const deviceCount = visibleNodes.filter((node) => node.objectType === "network-device").length;
  const hiddenProofCount = Math.max(0, renderModel.summary.nodeCount - visibleNodes.length);
  const edgeLabelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const edge of visibleEdges) counts.set(edge.label, (counts.get(edge.label) ?? 0) + 1);
    return counts;
  }, [visibleEdges]);
  const labelSeen = new Map<string, number>();

  if (renderModel.emptyState || renderModel.nodes.length === 0) {
    return (
      <div className="panel diagram-minimal-panel">
        <div className="diagram-empty-message">
          <strong>Authoritative topology canvas is not ready.</strong>
          <p className="muted" style={{ margin: "8px 0 0 0" }}>{renderModel.emptyState?.reason ?? "No authoritative topology nodes were provided."}</p>
          {renderModel.emptyState?.requiredInputs?.length ? (
            <ul style={{ margin: "12px 0 0 0", paddingLeft: 18 }}>
              {renderModel.emptyState.requiredInputs.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="panel diagram-minimal-panel" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <strong>Authoritative topology canvas</strong>
          <p className="muted" style={{ margin: "6px 0 0 0" }}>
            Showing {visibleNodes.length} object(s) and {visibleEdges.length} relationship(s). View: {mode}; scope: {scope}; layout: {renderModel.summary.layoutMode}. Canvas expands with topology size. The canvas is mode-specific: physical, logical, WAN/cloud, and security views use separate filtering and placement rules.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Sites shown {siteCount}</span>
          <span className="badge-soft">Devices {deviceCount}</span>
          <span className="badge-soft">Links {visibleEdges.length}</span>
          <span className="badge-soft">Hidden proof objects {hiddenProofCount}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(720px, 1fr) minmax(260px, 340px)", gap: 12, alignItems: "start" }}>
        <div style={{ overflow: "auto", borderRadius: 18, border: "1px solid var(--border-subtle, #d8e2f0)", minHeight: 680, maxHeight: "calc(100vh - 250px)", background: "#f8fbff" }}>
          <svg width={canvasBounds.width} height={canvasBounds.height} viewBox={`0 0 ${canvasBounds.width} ${canvasBounds.height}`} role="img" aria-label="Authoritative professional network topology diagram" style={{ display: "block", minWidth: `${canvasBounds.width}px`, maxWidth: "none", background: "#ffffff" }}>
            <BackendDiagramCanvasDefs />
            <rect x={0} y={0} width={canvasBounds.width} height={canvasBounds.height} rx={0} fill="#fbfdff" />
            <rect x={0} y={0} width={canvasBounds.width} height={canvasBounds.height} rx={0} fill="url(#backend-diagram-grid-major)" opacity="0.82" />
            {visibleEdges.map((edge) => {
              const source = nodeById.get(edge.sourceNodeId);
              const target = nodeById.get(edge.targetNodeId);
              if (!source || !target) return null;
              const sourcePoint = nodePoint(source, canvasBounds);
              const targetPoint = nodePoint(target, canvasBounds);
              const midX = (sourcePoint.x + targetPoint.x) / 2;
              const midY = (sourcePoint.y + targetPoint.y) / 2;
              const stroke = readinessStroke(edge.readiness);
              const path = edgePath(sourcePoint, targetPoint, scope);
              const count = edgeLabelCounts.get(edge.label) ?? 0;
              const seen = labelSeen.get(edge.label) ?? 0;
              labelSeen.set(edge.label, seen + 1);
              const shouldShowLabel = linkAnnotationMode === "full" && (count <= 2 || seen === 0 || scope === "site") && !(mode === "physical" && count > 3);
              return (
                <g key={edge.id} className={`backend-diagram-edge backend-diagram-edge-${edge.readiness}`}>
                  <path d={path} fill="none" stroke="#ffffff" strokeWidth={edge.readiness === "blocked" ? 7 : 5} strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
                  <path d={path} fill="none" stroke={stroke} strokeWidth={edge.readiness === "blocked" ? 3 : 2.2} strokeDasharray={edge.readiness === "unknown" ? "6 6" : undefined} strokeLinecap="round" strokeLinejoin="round" markerEnd={backendArrowForReadiness(edge.readiness)} opacity={edge.readiness === "unknown" ? 0.48 : 0.76} />
                  {shouldShowLabel ? (
                    <text x={midX + 8} y={midY - 8} fontSize="11" fill={backendDiagramTextFill()}>{cleanCanvasLabel(edge.label, 34)}</text>
                  ) : null}
                </g>
              );
            })}
            {visibleNodes.map((node) => {
              const selected = selectedNode?.id === node.id;
              const point = nodePoint(node, canvasBounds);
              return (
                <g key={node.id} transform={`translate(${point.x}, ${point.y})`} onClick={() => setSelectedNodeId(node.id)} style={{ cursor: "pointer" }}>
                  {renderNodeVisual(node, selected, iconScale)}
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="panel" style={{ padding: 14, display: "grid", gap: 12 }}>
          {selectedNode ? (
            <>
              <div>
                <p className="workspace-detail-kicker">Topology object</p>
                <h3 style={{ margin: "0 0 8px 0" }}>{cleanCanvasLabel(selectedNode.label, 56)}</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="badge-soft">{professionalNodeKind(selectedNode)}</span>
                  <span className="badge-soft">{sourceLabel(selectedNode.sourceEngine)}</span>
                </div>
              </div>
              <div>
                <strong>Design evidence</strong>
                <p className="muted" style={{ margin: "6px 0 0 0" }}>{selectedNode.truthState}</p>
              </div>
              <div>
                <strong>Execution readiness</strong>
                <p style={{ margin: "6px 0 0 0" }}><span className={truthBadgeClass(selectedNode.readiness)}>{executionReadinessText(selectedNode.readiness)}</span></p>
              </div>
              <div>
                <strong>Review signal</strong>
                <p className="muted" style={{ margin: "6px 0 0 0" }}>
                  {selectedNode.relatedFindingIds.length === 0
                    ? selectedNode.readiness === "blocked"
                      ? "This object is blocked by implementation readiness or safety evidence, not because the design object is missing."
                      : "No visible blocker is attached to this topology object."
                    : `${selectedNode.relatedFindingIds.length} engineering review item(s) are attached to this object.`}
                </p>
              </div>
              <div>
                <strong>Notes</strong>
                {selectedNode.notes.length === 0 ? (
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>No notes provided for this topology object.</p>
                ) : (
                  <ul style={{ margin: "8px 0 0 0", paddingLeft: 18 }}>
                    {selectedNode.notes.slice(0, 5).map((note) => <li key={note}>{cleanCanvasNote(note, 150)}</li>)}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
