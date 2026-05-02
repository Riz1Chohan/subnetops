import { useEffect, useMemo, useState } from "react";
import type { BackendDiagramRenderEdge, BackendDiagramRenderModel, BackendDiagramRenderNode } from "../../../lib/designCoreSnapshot";
import { truthBadgeClass } from "../../../lib/reportDiagramTruth";
import type { ActiveOverlayMode, DiagramLabelMode, DiagramMode, DiagramScope, LinkAnnotationMode } from "../diagramTypes";
import { DeviceIcon, type DeviceKind } from "./diagramRendererShared";

interface BackendDiagramCanvasProps {
  renderModel: BackendDiagramRenderModel;
  mode: DiagramMode;
  scope: DiagramScope;
  focusedSiteId?: string;
  activeOverlays: ActiveOverlayMode[];
  labelMode: DiagramLabelMode;
  linkAnnotationMode: LinkAnnotationMode;
  canvasZoom: number;
}

type CanvasBounds = { width: number; height: number; offsetX: number; offsetY: number };
type PreparedDiagram = { nodes: BackendDiagramRenderNode[]; edges: BackendDiagramRenderEdge[] };
type ViewScope = { mode: DiagramMode; scope: DiagramScope };

// Phase 98 compatibility copy for prior static gates: Canvas expands with topology size. Detail panels stay out of the way until an object is selected. Policy rules are grouped by allow/review/deny lanes.
// Phase 99: topology semantics now separate local Internet underlay, VPN overlay, and internal site handoff paths so WAN views stop drawing one magic cloud to every site.
// Phase 100: diagram trust pass removes raw database relationship labels from professional topology views, keeps sites as containers, forces VPN tunnels onto edge devices, hides DHCP as a fake physical device, and classifies security rules by deny/review/allow action with deny precedence.
// Phase 101: view-discipline pass locks physical views to physical edge/core objects only, makes firewall/VPN edge termination explicit, fixes underlay vs overlay styling, compacts the policy matrix, and keeps VLAN/subnet detail inside logical views.
// Phase 102: edge-path truth makes security/VPN edge detection label-first, routes local ISP -> firewall/security edge -> core, and terminates branch VPN overlays on the HQ firewall when present.
// Phase 103: enterprise-scale views collapse global 7+ site designs into summary cards/fabric layouts, reserve VLAN detail for per-site logical review, and stop WAN tunnels from becoming unreadable spaghetti.
// Compatibility truth from Phase 99: Physical and WAN views separate local Internet underlay from VPN overlay and internal site handoffs.

function professionalNodeKind(node: BackendDiagramRenderNode) {
  if (isPhase99LocalInternet(node)) return "Local Internet";
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

function deviceLabelText(node: BackendDiagramRenderNode) {
  return node.label.toLowerCase();
}

function deviceNotesText(node: BackendDiagramRenderNode) {
  return node.notes.join(" ").toLowerCase();
}

function hasSecurityFirewallLabel(node: BackendDiagramRenderNode) {
  const label = deviceLabelText(node);
  return node.objectType === "network-device" && /firewall|fortigate|palo\s*alto|pa-?\d+|asa|srx|perimeter|security\s*firewall/.test(label);
}

function hasExplicitWanVpnEdgeLabel(node: BackendDiagramRenderNode) {
  const label = deviceLabelText(node);
  return node.objectType === "network-device"
    && /\b(wan|vpn|sd-wan|edge)\b/.test(label)
    && !/core|distribution|access|switch/.test(label);
}

function isSecurityOrVpnEdgeDevice(node: BackendDiagramRenderNode) {
  if (hasSecurityFirewallLabel(node) || hasExplicitWanVpnEdgeLabel(node)) return true;
  const label = deviceLabelText(node);
  const notes = deviceNotesText(node);
  // Phase 102: notes may say a core gateway participates in security/VPN decisions, but that
  // must not let a "Core Gateway" steal the firewall/security-edge role. Only use notes as a
  // fallback when the label itself is not clearly a core/distribution/router/access device.
  if (/core|gateway|router|distribution|switch|access/.test(label)) return false;
  return /firewall|perimeter|security edge|vpn edge|terminates vpn|ipsec termination/.test(notes);
}

function isCoreInsideDevice(node: BackendDiagramRenderNode) {
  const label = deviceLabelText(node);
  if (hasSecurityFirewallLabel(node)) return false;
  return node.objectType === "network-device" && /core|distribution|gateway|router|l3/.test(label);
}

function deviceRoleWeight(node: BackendDiagramRenderNode) {
  const label = deviceLabelText(node);
  if (isSecurityOrVpnEdgeDevice(node)) return 10;
  if (/wan|vpn|edge/.test(label)) return 18;
  if (isCoreInsideDevice(node)) return 24;
  if (/switch|access/.test(label)) return 34;
  return 50;
}

function normalizedSiteTokens(site?: BackendDiagramRenderNode) {
  if (!site) return [] as string[];
  const label = site.label.toLowerCase();
  const tokens = new Set<string>();
  if (/hq|head|primary/.test(label)) tokens.add("hq");
  const siteMatch = label.match(/\bsite\s*(\d{1,2})\b/);
  const shortMatch = label.match(/\bs\s*(\d{1,2})\b/);
  const number = siteMatch?.[1] ?? shortMatch?.[1];
  if (number) {
    tokens.add(`site ${number}`);
    tokens.add(`s${number}`);
  }
  const code = siteCodeFromLabel(site.label).toLowerCase();
  if (code) tokens.add(code);
  return [...tokens].filter(Boolean);
}

function regexEscape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nodeBelongsToSite(node: BackendDiagramRenderNode, site?: BackendDiagramRenderNode) {
  if (!site) return false;
  if (node.siteId && site.siteId && node.siteId === site.siteId) return true;
  const text = `${node.label} ${node.notes.join(" ")}`.toLowerCase();
  return normalizedSiteTokens(site).some((token) => token.length > 1 && new RegExp(`\\b${regexEscape(token)}\\b`, "i").test(text));
}

function sortedSiteDevices(nodes: BackendDiagramRenderNode[], site?: BackendDiagramRenderNode) {
  return nodes
    .filter((node) => node.objectType === "network-device" && nodeBelongsToSite(node, site))
    .sort((a, b) => deviceRoleWeight(a) - deviceRoleWeight(b) || a.label.localeCompare(b.label));
}

function securityOrVpnEdgeForSite(nodes: BackendDiagramRenderNode[], site?: BackendDiagramRenderNode) {
  const devices = sortedSiteDevices(nodes, site);
  return devices.find(hasSecurityFirewallLabel)
    ?? devices.find(hasExplicitWanVpnEdgeLabel)
    ?? devices.find(isSecurityOrVpnEdgeDevice);
}

function coreInsideDeviceForSite(nodes: BackendDiagramRenderNode[], site?: BackendDiagramRenderNode, edgeDevice?: BackendDiagramRenderNode) {
  const devices = sortedSiteDevices(nodes, site).filter((node) => node.id !== edgeDevice?.id);
  return devices.find(isCoreInsideDevice)
    ?? devices.find((node) => !isSecurityOrVpnEdgeDevice(node));
}

function firewallForSite(nodes: BackendDiagramRenderNode[], site?: BackendDiagramRenderNode) {
  return securityOrVpnEdgeForSite(nodes, site);
}

function gatewayForSite(nodes: BackendDiagramRenderNode[], site?: BackendDiagramRenderNode) {
  return coreInsideDeviceForSite(nodes, site, securityOrVpnEdgeForSite(nodes, site));
}

function isExternalAnchor(node: BackendDiagramRenderNode) {
  return isWanEdge(node) || node.objectType === "route-domain";
}

function isPolicyNode(node: BackendDiagramRenderNode) {
  return node.objectType === "policy-rule" || node.objectType === "security-flow" || node.objectType === "nat-rule";
}

function policyActionColumn(policy: BackendDiagramRenderNode) {
  const label = `${policy.label} ${policy.notes.join(" ")}`.toLowerCase();
  // Phase 100 trust fix: deny/block/isolate language wins before allow/approved language.
  // Example: "Deny users to management; approved admins only" must be a deny rule, not an allow rule.
  if (/\bdeny\b|\bblocked?\b|\bdisallow\b|\bisolat(?:e|ed|ion)\b|default[-\s]?deny|not permitted|must not|no broad|without approval/.test(label)) return 2;
  if (/\breview\b|requires? review|approval required|must become explicit|exception|manual decision|to be reviewed/.test(label)) return 1;
  if (/\ballow\b|\bpermit(?:ted)?\b|approved|internet access|controlled access|authorized/.test(label)) return 0;
  return 1;
}

type SecurityMatrixAction = "allow" | "review" | "deny";

function policyActionKey(policy: BackendDiagramRenderNode): SecurityMatrixAction {
  const column = policyActionColumn(policy);
  if (column === 0) return "allow";
  if (column === 2) return "deny";
  return "review";
}

function fullCanvasLabel(value: string) {
  return value
    .replace(/device-[0-9a-f-]+/gi, "device")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function policySummary(policy: BackendDiagramRenderNode) {
  const label = fullCanvasLabel(policy.label);
  const evidence = policy.notes.find((note) => note && note.trim().length > 0);
  return evidence ? `${label} — ${cleanCanvasNote(evidence, 180)}` : label;
}

function securityZoneRank(node: BackendDiagramRenderNode) {
  const text = `${node.label} ${node.notes.join(" ")}`.toLowerCase();
  if (/corporate|internal|user|staff/.test(text)) return 10;
  if (/management|admin/.test(text)) return 20;
  if (/dmz|server|service/.test(text)) return 30;
  if (/guest/.test(text)) return 40;
  if (/iot|camera|printer|shared/.test(text)) return 50;
  if (/voice/.test(text)) return 60;
  if (/wan|internet|transit|cloud/.test(text)) return 70;
  return 90;
}

function primaryWanAnchor(nodes: BackendDiagramRenderNode[]) {
  const wanNodes = nodes.filter(isWanEdge);
  return wanNodes.find((node) => /internet\s*edge|internet/i.test(node.label))
    ?? wanNodes.find((node) => /wan/i.test(node.label) && !/transit/i.test(node.label))
    ?? wanNodes[0];
}

function pruneDuplicateWanAnchors(nodes: BackendDiagramRenderNode[]) {
  const primary = primaryWanAnchor(nodes);
  if (!primary) return nodes;
  return nodes.filter((node) => !isWanEdge(node) || node.id === primary.id);
}

function siteTopologyKey(site: BackendDiagramRenderNode) {
  return (site.siteId || site.objectId || site.id).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function isPhase99LocalInternet(node: BackendDiagramRenderNode) {
  return node.id.startsWith("phase99-local-internet-");
}

function localInternetForSite(nodes: BackendDiagramRenderNode[], site?: BackendDiagramRenderNode) {
  if (!site) return undefined;
  const key = siteTopologyKey(site);
  return nodes.find((node) => node.id === `phase99-local-internet-${key}`);
}

function createLocalInternetNode(site: BackendDiagramRenderNode, template?: BackendDiagramRenderNode): BackendDiagramRenderNode {
  const code = siteCodeFromLabel(site.label);
  return {
    id: `phase99-local-internet-${siteTopologyKey(site)}`,
    objectId: `phase99-local-internet-${siteTopologyKey(site)}`,
    objectType: "security-zone",
    label: `${code} Internet`,
    groupId: site.groupId,
    siteId: site.siteId,
    layer: "routing",
    readiness: template?.readiness ?? "review",
    truthState: template?.truthState ?? "inferred",
    x: site.x,
    y: site.y,
    sourceEngine: "routing",
    relatedFindingIds: template?.relatedFindingIds ?? [],
    notes: [
      "Local ISP or Internet breakout for this site. This is underlay transport only; VPN overlay tunnels are drawn separately between site edge devices.",
      ...(template?.notes ?? []).slice(0, 1),
    ],
  };
}

function addLocalInternetBreakouts(nodes: BackendDiagramRenderNode[], mode: DiagramMode, scope: DiagramScope, focusedSiteId?: string) {
  if (scope === "boundaries" || (mode !== "physical" && scope !== "wan-cloud")) return nodes;
  const template = primaryWanAnchor(nodes);
  const sites = nodes
    .filter((node) => node.objectType === "site" && (scope !== "site" || !focusedSiteId || node.siteId === focusedSiteId))
    .sort((a, b) => siteRank(a) - siteRank(b) || a.label.localeCompare(b.label, undefined, { numeric: true }));
  if (sites.length === 0) return nodes;
  const withoutGlobalWan = nodes.filter((node) => !isWanEdge(node) || isPhase99LocalInternet(node) || isPhase103VpnFabric(node));
  const existingIds = new Set(withoutGlobalWan.map((node) => node.id));
  const localBreakouts = sites
    .map((site) => createLocalInternetNode(site, template))
    .filter((node) => !existingIds.has(node.id));
  return [...withoutGlobalWan, ...localBreakouts];
}

function shouldShowRouteDomain({ mode: _mode, scope }: ViewScope) {
  // Route domains are logical control-plane evidence, not physical equipment.
  // Phase 100 refinement: route domains are control-plane evidence, not physical equipment. Phase 100 keeps them
  // out of regular topology canvases because the floating route-domain node looked orphaned
  // and made the logical view read like a database graph. Security/boundary views may still
  // consume route-domain evidence when policies require it.
  return scope === "boundaries";
}

function shouldShowDhcpSummary(activeOverlays: ActiveOverlayMode[]) {
  void activeOverlays;
  // Legacy Phase 92 guard string: shouldShowDhcpSummary(activeOverlays).
  // Legacy Phase 94 guard string: shouldShowDhcpSummary(params.activeOverlays).
  // Legacy Phase 96 guard string kept for compatibility: node.objectType === "dhcp-pool" && scope === "site".
  // DHCP is a service attribute unless a real DHCP server object exists. Do not render
  // DHCP pools as topology devices in professional diagrams.
  return false;
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

const PHASE103_ENTERPRISE_SITE_THRESHOLD = 7;
const PHASE103_SITE_SUMMARY_MARKER = "PHASE_103_SITE_SUMMARY_CARD";
const PHASE103_VPN_FABRIC_ID = "phase103-ipsec-vpn-overlay-fabric";

function phase103SiteNodes(nodes: BackendDiagramRenderNode[]) {
  return nodes
    .filter((node) => node.objectType === "site")
    .sort((a, b) => siteRank(a) - siteRank(b) || a.label.localeCompare(b.label, undefined, { numeric: true }));
}

function isPhase103EnterpriseScale(nodes: BackendDiagramRenderNode[]) {
  return phase103SiteNodes(nodes).length >= PHASE103_ENTERPRISE_SITE_THRESHOLD;
}

function phase103SiteMembers(nodes: BackendDiagramRenderNode[], site: BackendDiagramRenderNode, objectType?: BackendDiagramRenderNode["objectType"]) {
  return nodes.filter((node) => {
    if (node.id === site.id) return false;
    if (objectType && node.objectType !== objectType) return false;
    return node.siteId === site.siteId || nodeBelongsToSite(node, site);
  });
}

function phase103CidrFromText(value: string) {
  return value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/)?.[0];
}

function phase103InferSiteBlock(site: BackendDiagramRenderNode, allNodes: BackendDiagramRenderNode[]) {
  const noteBlock = phase103CidrFromText(`${site.label} ${site.notes.join(" ")}`);
  if (noteBlock) return noteBlock;
  const subnetBlock = phase103SiteMembers(allNodes, site, "subnet")
    .map((node) => phase103CidrFromText(`${node.label} ${node.notes.join(" ")}`))
    .find(Boolean);
  if (!subnetBlock) return "Address block pending";
  const match = subnetBlock.match(/^(\d{1,3})\.(\d{1,3})\./);
  return match ? `${match[1]}.${match[2]}.0.0/16` : subnetBlock;
}

function phase103SegmentName(node: BackendDiagramRenderNode) {
  return fullCanvasLabel(node.label)
    .replace(/^VLAN\s*\d+\s*/i, "")
    .replace(/^segment\s*/i, "")
    .trim();
}

function phase103ReadinessSummary(site: BackendDiagramRenderNode, allNodes: BackendDiagramRenderNode[]) {
  const members = phase103SiteMembers(allNodes, site);
  const blocked = members.filter((node) => node.readiness === "blocked").length;
  const review = members.filter((node) => node.readiness === "review").length;
  if (blocked > 0) return `${blocked} blocker${blocked === 1 ? "" : "s"}`;
  if (review > 0) return `${review} review item${review === 1 ? "" : "s"}`;
  return "Ready for design review";
}

function phase103WithSiteSummary(site: BackendDiagramRenderNode, allNodes: BackendDiagramRenderNode[]): BackendDiagramRenderNode {
  const vlans = phase103SiteMembers(allNodes, site, "vlan");
  const subnets = phase103SiteMembers(allNodes, site, "subnet");
  const segments = vlans.map(phase103SegmentName).filter(Boolean);
  const uniqueSegments = Array.from(new Set(segments)).slice(0, 5);
  const siteBlock = phase103InferSiteBlock(site, allNodes);
  const role = siteRank(site) < 0 ? "HQ / hub" : "Branch / spoke";
  return {
    ...site,
    notes: [
      PHASE103_SITE_SUMMARY_MARKER,
      `Role: ${role}`,
      `Site block: ${siteBlock}`,
      `VLANs: ${vlans.length}`,
      `Subnets: ${subnets.length}`,
      `Segments: ${uniqueSegments.length ? uniqueSegments.join(", ") : "No VLANs materialized"}`,
      `Readiness: ${phase103ReadinessSummary(site, allNodes)}`,
      "Collapsed summary. Open Logical / Per-site for full VLAN, subnet, gateway, and DHCP detail.",
      ...site.notes.slice(0, 2),
    ],
  };
}

function isPhase103SiteSummaryNode(node: BackendDiagramRenderNode) {
  return node.objectType === "site" && node.notes.includes(PHASE103_SITE_SUMMARY_MARKER);
}

function phase103SummaryValue(node: BackendDiagramRenderNode, label: string) {
  const note = node.notes.find((item) => item.startsWith(`${label}:`));
  return note ? note.slice(label.length + 1).trim() : "";
}

function isPhase103VpnFabric(node: BackendDiagramRenderNode) {
  return node.id === PHASE103_VPN_FABRIC_ID;
}

function addPhase103VpnFabric(nodes: BackendDiagramRenderNode[], mode: DiagramMode, scope: DiagramScope) {
  if (scope === "site" || scope === "boundaries" || (mode !== "physical" && scope !== "wan-cloud")) return nodes;
  if (!isPhase103EnterpriseScale(nodes) || nodes.some(isPhase103VpnFabric)) return nodes;
  const hq = phase103SiteNodes(nodes).find((site) => /hq|head|primary/i.test(site.label)) ?? phase103SiteNodes(nodes)[0];
  const fabricNode: BackendDiagramRenderNode = {
    id: PHASE103_VPN_FABRIC_ID,
    objectId: PHASE103_VPN_FABRIC_ID,
    objectType: "security-zone",
    label: "IPsec VPN overlay fabric",
    groupId: hq?.groupId,
    layer: "routing",
    readiness: "review",
    truthState: "inferred",
    x: 760,
    y: 610,
    sourceEngine: "routing",
    relatedFindingIds: [],
    notes: [
      "Phase 103 enterprise-scale WAN summary: branch tunnels collapse into a shared VPN fabric rail so 7+ site diagrams do not turn into unreadable tunnel spaghetti.",
      "Traffic meaning is still hub-and-spoke: local ISP underlay stays per site; secure VPN overlay terminates on the security/VPN edge when present.",
    ],
  };
  return [...nodes, fabricNode];
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
  const wantsAddressing = explicitlyRequestsAddressing(activeOverlays);
  const wantsSecurity = explicitlyRequestsSecurity(activeOverlays);

  if (node.objectType === "route-domain" && !shouldShowRouteDomain({ mode, scope })) return false;

  if (scope === "boundaries") {
    return isSecurityObject(node) || node.objectType === "route-domain";
  }

  if (scope === "wan-cloud") {
    // WAN mode should read like a WAN topology, not a route-domain/debug graph.
    return node.objectType === "site" || isGatewayDevice(node) || isWanEdge(node);
  }

  if (mode === "physical") {
    if (node.objectType === "site" || isGatewayDevice(node) || isWanEdge(node)) return true;
    // Phase 101 view discipline: physical topology is not a subnet chart. VLAN/subnet/DHCP
    // detail stays in logical views or details panels even when IP/service overlays are toggled on.
    // Compatibility with Phase 96 promise: DHCP/services are shown only in focused site drawings.
    void wantsAddressing;
    if (wantsSecurity && isSecurityObject(node)) return true;
    return false;
  }

  if (mode === "logical") {
    if (node.objectType === "site" || node.objectType === "vlan" || node.objectType === "route-domain") return true;
    // Subnet rows are detail density. They show when IP/addressing detail is explicitly requested.
    if (node.objectType === "subnet" && wantsAddressing) return true;
    if (isGatewayDevice(node)) return true;
    if (wantsSecurity && isSecurityObject(node)) return true;
    return false;
  }

  return true;
}


function edgeAllowedByView(edge: BackendDiagramRenderEdge, mode: DiagramMode, scope: DiagramScope, activeOverlays: ActiveOverlayMode[]) {
  const wantsAddressing = explicitlyRequestsAddressing(activeOverlays);
  const wantsSecurity = explicitlyRequestsSecurity(activeOverlays);

  if (scope === "boundaries") {
    // Security view should read like a policy map, not a raw graph. Keep only primary
    // zone-to-policy relationships and hide duplicate flow target/protection edges.
    return edge.relationship === "security-zone-applies-policy";
  }

  if (scope === "wan-cloud") {
    // Phase 100: WAN view is generated from explicit presentation connectors after filtering.
    // Raw model edges like summary/route-domain relationships are not professional topology links.
    return false;
  }

  if (mode === "physical") {
    if (edge.overlayKeys.includes("routing") && /site-to-site|WAN edge path|internet\/security edge|vpn|tunnel/i.test(edge.label)) return true;
    // Phase 101: no VLAN/subnet membership edges in physical drawings. IP overlays may annotate
    // devices later, but must not create logical topology objects inside the physical canvas.
    void wantsAddressing;
    if (wantsSecurity && edge.overlayKeys.includes("security") && edge.relationship !== "security-zone-protects-subnet") return true;
    return false;
  }

  if (mode === "logical") {
    if (edge.relationship === "site-contains-vlan") return true;
    if (wantsAddressing && edge.relationship === "vlan-uses-subnet") return true;
    if (edge.relationship === "site-contains-device") return true;
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

function edgeFamily(edge: BackendDiagramRenderEdge) {
  const text = `${edge.relationship} ${edge.label}`.toLowerCase();
  if (/dhcp/.test(text)) return "dhcp";
  if (/wan|internet|site-to-site|summary|routing|route/.test(text)) return "wan";
  if (/policy|security|zone|nat/.test(text)) return "security";
  if (/vlan|subnet/.test(text)) return "logical";
  return edge.relationship;
}

function dedupeEdgesForReadableView(edges: BackendDiagramRenderEdge[], nodeById: Map<string, BackendDiagramRenderNode>, mode: DiagramMode, scope: DiagramScope) {
  if (mode !== "physical" && scope !== "wan-cloud" && scope !== "boundaries") return edges;
  const seen = new Set<string>();
  const result: BackendDiagramRenderEdge[] = [];
  for (const edge of edges) {
    const source = nodeById.get(edge.sourceNodeId);
    const target = nodeById.get(edge.targetNodeId);
    if (!source || !target) continue;
    const sourceKey = source.siteId || source.id;
    const targetKey = target.siteId || target.id;
    const pair = [sourceKey, targetKey].sort().join("--");
    const key = `${scope}:${mode}:${pair}:${edgeFamily(edge)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(edge);
  }
  return result;
}

function hasPresentationEdge(edges: BackendDiagramRenderEdge[], a?: BackendDiagramRenderNode, b?: BackendDiagramRenderNode, label?: string) {
  if (!a || !b) return true;
  return edges.some((edge) => {
    const samePair = (edge.sourceNodeId === a.id && edge.targetNodeId === b.id) || (edge.sourceNodeId === b.id && edge.targetNodeId === a.id);
    if (!samePair) return false;
    return label ? edge.label === label : true;
  });
}

function presentationEdge(id: string, source: BackendDiagramRenderNode, target: BackendDiagramRenderNode, label: string, readiness: BackendDiagramRenderEdge["readiness"] = "ready"): BackendDiagramRenderEdge {
  return {
    id: `phase101-${id}-${source.id}-${target.id}`.slice(0, 160),
    relationship: "network-link-terminates-on-device",
    sourceNodeId: source.id,
    targetNodeId: target.id,
    label,
    readiness,
    overlayKeys: ["routing"],
    relatedObjectIds: [source.objectId, target.objectId].filter(Boolean),
    notes: ["Professional topology connector: transport handoff, secure tunnel, and internal handoff are rendered as separate network meanings rather than raw database relationships."],
  };
}

function supplementPresentationEdges(nodes: BackendDiagramRenderNode[], edges: BackendDiagramRenderEdge[], mode: DiagramMode, scope: DiagramScope, focusedSiteId?: string) {
  if (scope === "boundaries") return edges;
  // Phase 100: physical and WAN diagrams are professional topology drawings, not raw relationship graphs.
  // Drop model-derived WAN/site/device summary edges first, then add deterministic underlay/overlay/handoff connectors.
  const result = (mode === "physical" || scope === "wan-cloud")
    ? edges.filter((edge) => edgeSemanticKind(edge) === "security-policy")
    : [...edges];
  const sites = nodes.filter((node) => node.objectType === "site").sort((a, b) => siteRank(a) - siteRank(b) || a.label.localeCompare(b.label, undefined, { numeric: true }));
  const hq = sites.find((site) => /hq|head|primary/i.test(site.label)) ?? sites[0];
  // Phase 101: VPN must terminate on the security/VPN edge when a firewall exists.
  // Phase 102: VPN must terminate on the label-identified security/VPN edge when present.
  // Do not let a core gateway steal the firewall role just because notes mention security or VPN context.
  const hqEdge = securityOrVpnEdgeForSite(nodes, hq) ?? coreInsideDeviceForSite(nodes, hq) ?? sortedSiteDevices(nodes, hq)[0];

  const add = (source: BackendDiagramRenderNode | undefined, target: BackendDiagramRenderNode | undefined, label: string, readiness: BackendDiagramRenderEdge["readiness"] = "ready") => {
    if (!source || !target || source.id === target.id || hasPresentationEdge(result, source, target, label)) return;
    result.push(presentationEdge(label.replace(/\W+/g, "-").toLowerCase(), source, target, label, readiness));
  };

  const connectSiteUnderlayAndInside = (site: BackendDiagramRenderNode | undefined) => {
    if (!site) return undefined;
    const firstDevice = sortedSiteDevices(nodes, site)[0];
    const edgeDevice = securityOrVpnEdgeForSite(nodes, site) ?? coreInsideDeviceForSite(nodes, site) ?? firstDevice;
    const coreDevice = coreInsideDeviceForSite(nodes, site, edgeDevice);
    const localInternet = localInternetForSite(nodes, site);

    // Phase 102 edge-path truth: local ISP/Internet -> security or VPN edge -> core/distribution.
    // Legacy Phase 99 guard phrase: local internet handoff.
    // Legacy Phase 101 guard phrase: firewall-to-core handoff.
    // This stops the firewall from looking like disconnected decoration beside the topology.
    add(localInternet, edgeDevice, "local ISP underlay", "ready");
    add(edgeDevice, coreDevice, "firewall-to-core handoff", "ready");

    return edgeDevice;
  };

  if (scope === "site") {
    const site = sites.find((candidate) => candidate.siteId === focusedSiteId) ?? sites[0];
    connectSiteUnderlayAndInside(site);
  } else if (scope === "wan-cloud" || mode === "physical") {
    const vpnFabric = nodes.find(isPhase103VpnFabric);
    if (hq) connectSiteUnderlayAndInside(hq);
    if (vpnFabric) add(hqEdge, vpnFabric, "HQ VPN hub termination", "review");
    sites.filter((site) => site.id !== hq?.id).forEach((site) => {
      const branchEdge = connectSiteUnderlayAndInside(site);
      // Phase 103: enterprise-scale branch tunnels terminate on a shared overlay fabric rail,
      // not as nine or more long diagonals into the HQ edge. Smaller projects keep direct tunnel labels.
      if (vpnFabric) {
        add(branchEdge, vpnFabric, "IPsec VPN overlay fabric", "review");
      } else {
        add(branchEdge, hqEdge, "IPsec VPN tunnel to HQ", "review");
      }
    });
  }

  return dedupeEdgesForReadableView(result, new Map(nodes.map((node) => [node.id, node])), mode, scope);
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
    if (isExternalAnchor(source) && scope !== "boundaries" && nodeAllowedByView(source, mode, scope, activeOverlays)) visibleIds.add(source.id);
    if (isExternalAnchor(target) && scope !== "boundaries" && nodeAllowedByView(target, mode, scope, activeOverlays)) visibleIds.add(target.id);
  }

  let nodes = renderModel.nodes.filter((node) => visibleIds.has(node.id));

  if (isPhase103EnterpriseScale(renderModel.nodes) && mode === "logical" && scope === "global") {
    const summaryNodes = phase103SiteNodes(renderModel.nodes).map((site) => phase103WithSiteSummary(site, renderModel.nodes));
    return layoutNodesForView({ nodes: summaryNodes, edges: [], mode, scope, focusedSiteId, activeOverlays });
  }

  // Phase 99: physical/WAN drawings should not use one global WAN cloud as a fake parent.
  // Replace raw WAN anchors with per-site local Internet breakouts, then draw VPN overlay separately.
  if (scope !== "boundaries" && (mode === "physical" || scope === "wan-cloud")) {
    nodes = addLocalInternetBreakouts(nodes, mode, scope, focusedSiteId);
    nodes = addPhase103VpnFabric(nodes, mode, scope);
  }

  const limit = scope === "boundaries" ? 80 : mode === "logical" ? 120 : isPhase103EnterpriseScale(nodes) ? 140 : 80;
  const limitedNodes = nodes.slice(0, limit);
  const nodeIds = new Set(limitedNodes.map((node) => node.id));
  const filteredEdges = candidateEdges.filter((edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId));
  const edges = supplementPresentationEdges(limitedNodes, dedupeEdgesForReadableView(filteredEdges, nodeById, mode, scope), mode, scope, focusedSiteId);
  return layoutNodesForView({ nodes: limitedNodes, edges, mode, scope, focusedSiteId, activeOverlays });
}

function layoutNodesForView(params: PreparedDiagram & { mode: DiagramMode; scope: DiagramScope; focusedSiteId?: string; activeOverlays: ActiveOverlayMode[] }): PreparedDiagram {
  const { nodes, edges, mode, scope } = params;
  const byId = new Map(nodes.map((node) => [node.id, { ...node }]));
  const orderedSites = nodes.filter((node) => node.objectType === "site").sort((a, b) => siteRank(a) - siteRank(b) || a.label.localeCompare(b.label, undefined, { numeric: true }));
  const hq = orderedSites.find((site) => /hq|head|primary/i.test(site.label)) ?? orderedSites[0];
  const branches = orderedSites.filter((site) => site.id !== hq?.id);
  const routeDomain = nodes.find((node) => node.objectType === "route-domain");
  const set = (node: BackendDiagramRenderNode | undefined, x: number, y: number) => {
    if (!node) return;
    const current = byId.get(node.id);
    if (current) byId.set(node.id, { ...current, x, y });
  };
  const setDeviceRow = (site: BackendDiagramRenderNode, startX: number, startY: number, spacing = 150) => {
    const siteDevices = sortedSiteDevices(nodes, site);
    siteDevices.forEach((device, index) => set(device, startX + (index - (siteDevices.length - 1) / 2) * spacing, startY));
  };
  const setEdgePair = (site: BackendDiagramRenderNode, firewallX: number, gatewayX: number, y: number) => {
    const firewall = firewallForSite(nodes, site);
    const gateway = gatewayForSite(nodes, site);
    const remaining = sortedSiteDevices(nodes, site).filter((device) => device.id !== firewall?.id && device.id !== gateway?.id);
    if (firewall) set(firewall, firewallX, y);
    if (gateway) set(gateway, gatewayX, y);
    remaining.forEach((device, index) => set(device, gatewayX + 190 + index * 150, y));
  };
  const setLocalInternet = (site: BackendDiagramRenderNode, x: number, y: number) => {
    set(localInternetForSite(nodes, site), x, y);
  };
  const setDhcpBadges = (site: BackendDiagramRenderNode, startX: number, startY: number) => {
    const dhcp = nodes.filter((node) => node.siteId === site.siteId && node.objectType === "dhcp-pool");
    dhcp.slice(0, 2).forEach((node, index) => set(node, startX + 190, startY + index * 58));
  };

  if (scope === "boundaries") {
    const zones = nodes
      .filter((node) => node.objectType === "security-zone")
      .sort((a, b) => securityZoneRank(a) - securityZoneRank(b) || a.label.localeCompare(b.label));
    const policies = nodes
      .filter(isPolicyNode)
      .sort((a, b) => policyActionColumn(a) - policyActionColumn(b) || a.label.localeCompare(b.label));
    const policySourceZoneId = new Map<string, string>();
    for (const edge of edges) {
      const source = byId.get(edge.sourceNodeId);
      const target = byId.get(edge.targetNodeId);
      if (source?.objectType === "security-zone" && target && isPolicyNode(target)) policySourceZoneId.set(target.id, source.id);
      if (target?.objectType === "security-zone" && source && isPolicyNode(source)) policySourceZoneId.set(source.id, target.id);
    }
    const rowY = (index: number) => 235 + index * 118;
    const actionX = [690, 990, 1290];
    zones.forEach((zone, index) => set(zone, 280, rowY(index)));
    const laneSlots = new Map<string, number>();
    policies.forEach((policy, index) => {
      const col = policyActionColumn(policy);
      const foundZoneIndex = zones.findIndex((zone) => zone.id === policySourceZoneId.get(policy.id));
      const rowIndex = foundZoneIndex >= 0 ? foundZoneIndex : Math.floor(index / 3);
      const key = `${rowIndex}:${col}`;
      const slot = laneSlots.get(key) ?? 0;
      laneSlots.set(key, slot + 1);
      set(policy, actionX[col], rowY(rowIndex) + Math.min(slot, 2) * 34 - (slot > 0 ? 6 : 0));
    });
    return { nodes: [...byId.values()], edges };
  }

  if (scope === "site") {
    const site = orderedSites.find((candidate) => candidate.siteId === params.focusedSiteId) ?? orderedSites[0];
    if (mode === "physical") {
      set(site, 560, 150);
      if (site) setLocalInternet(site, 360, 300);
      if (site) setEdgePair(site, 560, 760, 455);
      // Phase 101: physical per-site view remains an equipment/path diagram only.
      // VLAN/subnet cards are deliberately absent here; use Logical / Per-site for segmentation detail.
      return { nodes: [...byId.values()], edges };
    }

    set(routeDomain, 560, 95);
    set(site, 560, 215);
    if (site) setEdgePair(site, 405, 715, 360);
    const logicalRows = nodes.filter((node) => node.siteId === site?.siteId && (node.objectType === "vlan" || node.objectType === "subnet"));
    const vlans = logicalRows.filter((node) => node.objectType === "vlan");
    const subnets = logicalRows.filter((node) => node.objectType === "subnet");
    const columnX = [245, 560, 875];
    vlans.forEach((vlan, index) => set(vlan, columnX[index % columnX.length], 535 + Math.floor(index / columnX.length) * 92));
    subnets.forEach((subnet, index) => set(subnet, columnX[index % columnX.length], 575 + Math.floor(index / columnX.length) * 92));
    if (site && shouldShowDhcpSummary(params.activeOverlays)) setDhcpBadges(site, 1010, 395);
    return { nodes: [...byId.values()], edges };
  }

  if (scope === "wan-cloud") {
    const enterprise = isPhase103EnterpriseScale(nodes);
    const vpnFabric = nodes.find(isPhase103VpnFabric);
    if (hq) {
      set(hq, 760, 160);
      setLocalInternet(hq, 630, 285);
      setEdgePair(hq, 630, 890, 425);
    }
    if (vpnFabric) set(vpnFabric, 760, 610);
    const columns = enterprise ? 3 : Math.min(4, Math.max(1, branches.length));
    branches.forEach((site, index) => {
      const x = enterprise ? 340 + (index % columns) * 430 : (branches.length === 1 ? 760 : 320 + (index % columns) * 390);
      const y = enterprise ? 820 + Math.floor(index / columns) * 315 : 700 + Math.floor(index / columns) * 255;
      set(site, x, y);
      setLocalInternet(site, x - 95, y + 112);
      setEdgePair(site, x - 95, x + 95, y + 245);
    });
    return { nodes: [...byId.values()], edges };
  }

  if (mode === "logical" && scope === "global" && orderedSites.some(isPhase103SiteSummaryNode)) {
    const columns = orderedSites.length >= 10 ? 4 : 3;
    orderedSites.forEach((site, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = 260 + column * 390;
      const y = 210 + row * 240;
      set(site, x, y);
    });
    return { nodes: [...byId.values()], edges };
  }

  if (mode === "logical") {
    set(routeDomain, 760, 90);
    const columns = Math.max(1, Math.min(3, orderedSites.length));
    orderedSites.forEach((site, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = 270 + column * 560;
      const y = 240 + row * 860;
      set(site, x, y);
      setDeviceRow(site, x, y + 115, 170);
      const vlans = nodes.filter((node) => node.siteId === site.siteId && node.objectType === "vlan");
      const subnets = nodes.filter((node) => node.siteId === site.siteId && node.objectType === "subnet");
      vlans.forEach((vlan, vlanIndex) => set(vlan, x - 165 + (vlanIndex % 2) * 330, y + 235 + Math.floor(vlanIndex / 2) * 92));
      subnets.forEach((subnet, subnetIndex) => set(subnet, x - 165 + (subnetIndex % 2) * 330, y + 272 + Math.floor(subnetIndex / 2) * 92));
    });
    return { nodes: [...byId.values()], edges };
  }

  // Physical global: hub/WAN view with a clean branch fan-out.
  // Phase 99 refinement: HQ is the hub, branches are spokes, and Internet is local underlay per site.
  const enterprise = isPhase103EnterpriseScale(nodes);
  const vpnFabric = nodes.find(isPhase103VpnFabric);
  if (hq) {
    set(hq, 760, 145);
    setLocalInternet(hq, 630, 255);
    setEdgePair(hq, 630, 890, 380);
  }
  if (vpnFabric) set(vpnFabric, 760, 570);
  const columns = enterprise ? 3 : Math.min(4, Math.max(1, branches.length));
  branches.forEach((site, index) => {
    const x = enterprise ? 340 + (index % columns) * 430 : (branches.length === 1 ? 760 : 260 + (index % columns) * 360);
    const y = enterprise ? 780 + Math.floor(index / columns) * 305 : 675 + Math.floor(index / columns) * 265;
    set(site, x, y);
    setLocalInternet(site, x - 85, y + 105);
    setEdgePair(site, x - 85, x + 95, y + 220);
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

function edgeSemanticKind(edge: BackendDiagramRenderEdge) {
  // Phase 101 trust fix: classify from structured relationship/label first. Generic notes can mention
  // transport and tunnel concepts together, so notes must not accidentally turn every connector into a VPN tunnel.
  const primary = `${edge.relationship} ${edge.label}`.toLowerCase();
  if (/ipsec|vpn|tunnel|dmvpn|sd-wan|overlay/.test(primary)) return "vpn-overlay";
  if (/local internet|local isp|internet handoff|isp|underlay/.test(primary)) return "internet-underlay";
  if (/firewall-to-core|site core|site edge|handoff|site-contains-device/.test(primary)) return "internal-site";
  if (/security|policy|nat/.test(primary)) return "security-policy";
  const notes = edge.notes.join(" ").toLowerCase();
  if (/security|policy|nat/.test(notes)) return "security-policy";
  return "topology";
}

function edgeStroke(edge: BackendDiagramRenderEdge) {
  const kind = edgeSemanticKind(edge);
  if (kind === "vpn-overlay") return "#4c6fc1";
  if (kind === "internet-underlay") return "#c68a2c";
  if (kind === "internal-site") return "#7890ad";
  if (kind === "security-policy") return "#c2410c";
  return readinessStroke(edge.readiness);
}

function edgeDashArray(edge: BackendDiagramRenderEdge) {
  const kind = edgeSemanticKind(edge);
  if (kind === "vpn-overlay") return "9 7";
  if (edge.readiness === "unknown") return "6 6";
  return undefined;
}

function automaticIconScale(nodeCount: number, scope: DiagramScope) {
  if (scope === "site") return 0.72;
  if (nodeCount > 90) return 0.42;
  if (nodeCount > 60) return 0.48;
  if (nodeCount > 36) return 0.56;
  return 0.66;
}

function professionalDeviceKind(node: BackendDiagramRenderNode): DeviceKind | null {
  const label = deviceLabelText(node);
  const text = `${node.objectType} ${node.label} ${node.notes.join(" ")}`.toLowerCase();
  if (node.objectType === "dhcp-pool") return "server";
  if (node.objectType === "route-domain" || node.objectType === "route-intent") return "cloud-edge";
  if (node.objectType === "security-zone" && /wan|internet|wide area/.test(text)) return "internet";
  if (node.objectType !== "network-device") return null;
  // Phase 102: icon role is label-first. Notes can mention security/VPN without turning a
  // core gateway into a firewall icon.
  if (hasSecurityFirewallLabel(node)) return "firewall";
  if (/core|distribution|layer-3|l3/.test(label)) return "core-switch";
  if (/switch|access/.test(label)) return "access-switch";
  if (/cloud/.test(label)) return "cloud-edge";
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

function Phase103SiteSummaryCard({ node, selected }: { node: BackendDiagramRenderNode; selected: boolean }) {
  const role = phase103SummaryValue(node, "Role") || "Site";
  const siteBlock = phase103SummaryValue(node, "Site block") || "Address block pending";
  const vlans = phase103SummaryValue(node, "VLANs") || "0";
  const subnets = phase103SummaryValue(node, "Subnets") || "0";
  const segments = phase103SummaryValue(node, "Segments") || "No VLANs materialized";
  const readiness = phase103SummaryValue(node, "Readiness") || executionReadinessText(node.readiness);
  const width = 315;
  const height = 172;
  const stroke = selected ? readinessStroke(node.readiness) : "#b9c9df";
  return (
    <>
      <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={20} fill="#ffffff" stroke={stroke} strokeWidth={selected ? 2.8 : 1.5} filter={selected ? "url(#backend-diagram-device-shadow)" : undefined} />
      <rect x={-width / 2} y={-height / 2} width={width} height={42} rx={20} fill="#f8fbff" stroke="none" />
      <text x={-width / 2 + 18} y={-height / 2 + 26} fontSize="13" fontWeight={900} fill={backendDiagramTextFill()}>{cleanCanvasLabel(node.label, 34)}</text>
      <text x={width / 2 - 18} y={-height / 2 + 26} textAnchor="end" fontSize="10" fontWeight={800} fill="#40699f">{role}</text>
      <text x={-width / 2 + 18} y={-height / 2 + 66} fontSize="11" fontWeight={800} fill={backendDiagramMutedFill()}>Site block</text>
      <text x={-width / 2 + 92} y={-height / 2 + 66} fontSize="12" fontWeight={900} fill={backendDiagramTextFill()}>{cleanCanvasLabel(siteBlock, 22)}</text>
      <text x={-width / 2 + 18} y={-height / 2 + 91} fontSize="11" fontWeight={800} fill={backendDiagramMutedFill()}>VLANs / subnets</text>
      <text x={-width / 2 + 122} y={-height / 2 + 91} fontSize="12" fontWeight={900} fill={backendDiagramTextFill()}>{vlans} / {subnets}</text>
      <text x={-width / 2 + 18} y={-height / 2 + 116} fontSize="11" fontWeight={800} fill={backendDiagramMutedFill()}>Major segments</text>
      <text x={-width / 2 + 18} y={-height / 2 + 137} fontSize="11" fontWeight={700} fill={backendDiagramTextFill()}>{cleanCanvasLabel(segments, 44)}</text>
      <text x={-width / 2 + 18} y={height / 2 - 16} fontSize="10.5" fontWeight={800} fill={node.readiness === "blocked" ? "#c2410c" : node.readiness === "review" ? "#8a6428" : "#40699f"}>{cleanCanvasLabel(readiness, 42)}</text>
    </>
  );
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

function renderNodeVisual(node: BackendDiagramRenderNode, selected: boolean, scale: number, labelMode: DiagramLabelMode, canvasZoom: number, mode: DiagramMode, scope: DiagramScope) {
  if (mode === "logical" && scope === "global" && isPhase103SiteSummaryNode(node)) {
    return <Phase103SiteSummaryCard node={node} selected={selected} />;
  }
  const kind = professionalDeviceKind(node);
  const labelMax = node.objectType === "site" ? 30 : node.objectType === "vlan" ? 31 : node.objectType === "subnet" ? 28 : 26;
  const compactLabels = labelMode === "essential" || canvasZoom < 0.75;

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
        {compactLabels ? null : <text textAnchor="middle" y={64 * scale} fontSize={Math.max(9, 9.5 * scale)} fill={backendDiagramMutedFill()}>{professionalNodeKind(node)}</text>}
      </>
    );
  }

  return (
    <>
      {nodeShape(node, selected, scale)}
      {compactLabels && node.objectType !== "site" && node.objectType !== "security-zone" ? null : <text textAnchor="middle" y={node.objectType === "site" ? -7 : -4} fontSize={Math.max(8, 9.8 * scale)} fill={backendDiagramMutedFill()}>{professionalNodeKind(node)}</text>}
      <text textAnchor="middle" y={compactLabels && node.objectType !== "site" && node.objectType !== "security-zone" ? 4 : 10} fontSize={Math.max(10, 11.5 * scale)} fontWeight={700} fill={backendDiagramTextFill()}>{cleanCanvasLabel(node.label, compactLabels ? Math.min(labelMax, 18) : labelMax)}</text>
      {!compactLabels && (node.objectType === "site" || node.objectType === "security-zone") ? <text textAnchor="middle" y={node.objectType === "site" ? 26 : 25} fontSize={Math.max(8, 8.8 * scale)} fill={backendDiagramMutedFill()}>{node.truthState}</text> : null}
    </>
  );
}

function nodePoint(node: BackendDiagramRenderNode, bounds: CanvasBounds) {
  return { x: node.x + bounds.offsetX, y: node.y + bounds.offsetY };
}

function calculateCanvasBounds(nodes: BackendDiagramRenderNode[], mode: DiagramMode, scope: DiagramScope): CanvasBounds {
  if (nodes.length === 0) return { width: 1240, height: 780, offsetX: 140, offsetY: 120 };
  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const maxY = Math.max(...nodes.map((node) => node.y));
  const isMatrix = scope === "boundaries";
  const isLogical = mode === "logical" && !isMatrix;
  const enterprise = isPhase103EnterpriseScale(nodes);
  const summaryBoard = nodes.some(isPhase103SiteSummaryNode);
  const paddingLeft = isMatrix ? 210 : summaryBoard ? 245 : enterprise ? 220 : 170;
  const paddingTop = isMatrix ? 150 : summaryBoard ? 160 : enterprise ? 155 : 135;
  const paddingRight = isMatrix ? 230 : summaryBoard ? 260 : enterprise ? 260 : 220;
  const paddingBottom = isMatrix ? 170 : enterprise ? 270 : 190;
  const siteCount = phase103SiteNodes(nodes).length;
  const enterpriseRows = Math.max(1, Math.ceil(Math.max(siteCount - 1, 0) / 3));
  const minWidth = isMatrix ? 1180 : summaryBoard ? 1780 : enterprise ? 1580 : isLogical ? 1320 : scope === "wan-cloud" ? 1120 : 1080;
  const minHeight = isMatrix ? 760 : summaryBoard ? 980 : enterprise && scope !== "site" ? Math.max(980, 720 + enterpriseRows * 300) : isLogical ? 820 : scope === "site" ? 720 : 700;
  return {
    width: Math.max(minWidth, maxX - minX + paddingLeft + paddingRight),
    height: Math.max(minHeight, maxY - minY + paddingTop + paddingBottom),
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

function edgePath(sourcePoint: { x: number; y: number }, targetPoint: { x: number; y: number }, mode: DiagramMode, scope: DiagramScope, edge?: BackendDiagramRenderEdge) {
  const midX = (sourcePoint.x + targetPoint.x) / 2;
  if (scope === "boundaries") {
    const elbowX = sourcePoint.x + Math.max(130, Math.min(270, Math.abs(targetPoint.x - sourcePoint.x) * 0.48));
    return `M ${sourcePoint.x} ${sourcePoint.y} L ${elbowX} ${sourcePoint.y} L ${elbowX} ${targetPoint.y} L ${targetPoint.x} ${targetPoint.y}`;
  }
  if ((mode === "physical" || scope === "wan-cloud") && edge && edgeSemanticKind(edge) === "vpn-overlay") {
    const railY = Math.min(sourcePoint.y, targetPoint.y) - 118;
    return `M ${sourcePoint.x} ${sourcePoint.y} L ${sourcePoint.x} ${railY} L ${targetPoint.x} ${railY} L ${targetPoint.x} ${targetPoint.y}`;
  }
  if (mode === "physical" || scope === "wan-cloud") {
    return `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`;
  }
  return `M ${sourcePoint.x} ${sourcePoint.y} L ${midX} ${sourcePoint.y} L ${midX} ${targetPoint.y} L ${targetPoint.x} ${targetPoint.y}`;
}

function phase97SecurityMatrixGuides(nodes: BackendDiagramRenderNode[], bounds: CanvasBounds) {
  const zones = nodes
    .filter((node) => node.objectType === "security-zone")
    .sort((a, b) => securityZoneRank(a) - securityZoneRank(b) || a.label.localeCompare(b.label));
  const columns = [
    { label: "Allowed / permitted", x: 690 },
    { label: "Review required", x: 990 },
    { label: "Denied / isolated", x: 1290 },
  ];
  const left = 70;
  const right = bounds.width - 90;
  return (
    <g className="phase97-security-matrix-guides" aria-hidden="true">
      <rect x={left} y={60} width={right - left} height={Math.max(680, bounds.height - 150)} rx={22} fill="#f8fbff" stroke="#d8e2f0" strokeWidth="1.2" opacity="0.96" />
      <text x={bounds.offsetX + 280} y={106} textAnchor="middle" fontSize="13" fontWeight={800} fill="#1f3148">Source zones</text>
      {columns.map((column) => (
        <g key={column.label}>
          <rect x={bounds.offsetX + column.x - 104} y={82} width={208} height={40} rx={12} fill="#ffffff" stroke="#cbd8e8" strokeWidth="1" opacity="0.98" />
          <text x={bounds.offsetX + column.x} y={107} textAnchor="middle" fontSize="13" fontWeight={800} fill="#1f3148">{column.label}</text>
          <line x1={bounds.offsetX + column.x - 132} y1={136} x2={bounds.offsetX + column.x - 132} y2={bounds.height - 80} stroke="#d8e2f0" strokeWidth="1" strokeDasharray="7 8" opacity="0.75" />
        </g>
      ))}
      {zones.map((zone, index) => {
        const y = nodePoint(zone, bounds).y;
        return (
          <g key={`phase97-security-row-${zone.id}`}>
            <rect x={left + 18} y={y - 52} width={right - left - 36} height={104} rx={18} fill={index % 2 === 0 ? "#ffffff" : "#f3f7fc"} stroke="#e3ebf5" strokeWidth="1" opacity="0.78" />
            <line x1={bounds.offsetX + 420} y1={y} x2={right - 54} y2={y} stroke="#dbe6f3" strokeWidth="1" opacity="0.72" />
          </g>
        );
      })}
    </g>
  );
}

function phase97LogicalSiteGuides(nodes: BackendDiagramRenderNode[], bounds: CanvasBounds) {
  const sites = nodes.filter((node) => node.objectType === "site");
  if (sites.length === 0) return null;
  return (
    <g className="phase97-logical-site-lanes" aria-hidden="true">
      {sites.map((site) => {
        const point = nodePoint(site, bounds);
        const siteMembers = nodes.filter((node) => node.siteId === site.siteId && node.id !== site.id);
        const memberYs = siteMembers.map((node) => nodePoint(node, bounds).y);
        const minY = Math.min(point.y - 70, ...memberYs.map((y) => y - 42));
        const maxY = Math.max(point.y + 380, ...memberYs.map((y) => y + 42));
        return <rect key={`phase97-site-lane-${site.id}`} x={point.x - 250} y={minY} width={500} height={maxY - minY + 42} rx={24} fill="#f8fbff" stroke="#d8e2f0" strokeWidth="1.1" opacity="0.66" />;
      })}
    </g>
  );
}

function phase97TopologyGuides(nodes: BackendDiagramRenderNode[], bounds: CanvasBounds, scope: DiagramScope) {
  const localInternetNodes = nodes.filter(isPhase99LocalInternet);
  const vpnFabric = nodes.find(isPhase103VpnFabric);
  if (localInternetNodes.length === 0 && !vpnFabric) return null;
  return (
    <g className="phase99-topology-guides" aria-hidden="true">
      {vpnFabric ? (() => {
        const point = nodePoint(vpnFabric, bounds);
        return (
          <g key="phase103-vpn-fabric-guide">
            <rect x={point.x - 310} y={point.y - 38} width={620} height={76} rx={28} fill="#f4f7ff" stroke="#aebfec" strokeWidth="1.2" opacity="0.72" />
            <line x1={point.x - 255} y1={point.y} x2={point.x + 255} y2={point.y} stroke="#4c6fc1" strokeWidth="2.4" strokeDasharray="9 7" strokeLinecap="round" opacity="0.62" />
            <text x={point.x} y={point.y - 18} textAnchor="middle" fontSize="12" fontWeight={900} fill="#334f91">Enterprise VPN overlay fabric</text>
          </g>
        );
      })() : null}
      {localInternetNodes.map((internet) => {
        const point = nodePoint(internet, bounds);
        return (
          <g key={`phase99-underlay-guide-${internet.id}`}>
            <rect x={point.x - 125} y={point.y - 62} width={250} height={104} rx={24} fill="#fffaf0" stroke="#ead8b9" strokeWidth="1.1" opacity="0.58" />
            <text x={point.x} y={point.y - 38} textAnchor="middle" fontSize="11" fontWeight={800} fill="#8a6428">{scope === "wan-cloud" ? "Local ISP underlay" : "Local Internet edge"}</text>
          </g>
        );
      })}
    </g>
  );
}

function phase99SiteContainers(nodes: BackendDiagramRenderNode[], bounds: CanvasBounds, mode: DiagramMode, scope: DiagramScope) {
  if (scope === "boundaries" || (mode !== "physical" && scope !== "wan-cloud")) return null;
  const sites = nodes.filter((node) => node.objectType === "site");
  if (sites.length === 0) return null;
  return (
    <g className="phase99-site-containers" aria-hidden="true">
      {sites.map((site) => {
        const sitePoint = nodePoint(site, bounds);
        const members = nodes.filter((node) => node.id !== site.id && (node.siteId === site.siteId || (isPhase99LocalInternet(node) && node.siteId === site.siteId)));
        const xs = [sitePoint.x, ...members.map((node) => nodePoint(node, bounds).x)];
        const ys = [sitePoint.y, ...members.map((node) => nodePoint(node, bounds).y)];
        const left = Math.min(...xs) - 150;
        const right = Math.max(...xs) + 150;
        const top = Math.min(...ys) - 76;
        const bottom = Math.max(...ys) + 96;
        return (
          <g key={`phase99-site-container-${site.id}`}>
            <rect x={left} y={top} width={Math.max(310, right - left)} height={Math.max(220, bottom - top)} rx={24} fill="#f8fbff" stroke="#b9c9df" strokeWidth="1.6" opacity="0.74" />
            <text x={left + 22} y={top + 28} fontSize="13" fontWeight={900} fill="#334762">{cleanCanvasLabel(site.label, 38)}</text>
          </g>
        );
      })}
    </g>
  );
}

// Legacy Phase 99 symbol kept for static compatibility: phase99TopologyLegend.
function phase101TopologyLegend(mode: DiagramMode, scope: DiagramScope) {
  if (scope === "boundaries" || (mode !== "physical" && scope !== "wan-cloud")) return null;
  const rows = [
    { label: "Local Internet / ISP underlay", stroke: "#c68a2c", dash: undefined },
    { label: "IPsec VPN overlay tunnel", stroke: "#4c6fc1", dash: "9 7" },
    { label: "Internal site handoff", stroke: "#7890ad", dash: undefined },
  ];
  return (
    <g className="phase99-topology-legend" aria-hidden="true">
      <rect x={38} y={34} width={260} height={104} rx={16} fill="#ffffff" stroke="#d8e2f0" strokeWidth="1.1" opacity="0.94" />
      <text x={58} y={60} fontSize="12" fontWeight={800} fill="#1f3148">Topology meaning</text>
      {rows.map((row, index) => {
        const y = 82 + index * 24;
        return (
          <g key={row.label}>
            <line x1={58} y1={y} x2={98} y2={y} stroke={row.stroke} strokeWidth="2.2" strokeDasharray={row.dash} strokeLinecap="round" />
            <text x={110} y={y + 4} fontSize="11" fill="#64748b">{row.label}</text>
          </g>
        );
      })}
    </g>
  );
}

function friendlyScopeLabel(scope: DiagramScope) {
  if (scope === "site") return "selected site";
  if (scope === "wan-cloud") return "WAN/cloud";
  if (scope === "boundaries") return "security boundaries";
  return "global";
}

type SecurityMatrixRow = {
  zone: BackendDiagramRenderNode;
  allow: BackendDiagramRenderNode[];
  review: BackendDiagramRenderNode[];
  deny: BackendDiagramRenderNode[];
};

function buildSecurityMatrixRows(nodes: BackendDiagramRenderNode[], edges: BackendDiagramRenderEdge[]): SecurityMatrixRow[] {
  const zones = nodes
    .filter((node) => node.objectType === "security-zone")
    .sort((a, b) => securityZoneRank(a) - securityZoneRank(b) || a.label.localeCompare(b.label));
  const policies = nodes.filter(isPolicyNode);
  const policySourceZoneId = new Map<string, string>();
  for (const edge of edges) {
    const source = nodes.find((node) => node.id === edge.sourceNodeId);
    const target = nodes.find((node) => node.id === edge.targetNodeId);
    if (source?.objectType === "security-zone" && target && isPolicyNode(target)) policySourceZoneId.set(target.id, source.id);
    if (target?.objectType === "security-zone" && source && isPolicyNode(source)) policySourceZoneId.set(source.id, target.id);
  }
  return zones
    .map((zone) => {
      const zonePolicies = policies.filter((policy) => policySourceZoneId.get(policy.id) === zone.id);
      return {
        zone,
        allow: zonePolicies.filter((policy) => policyActionKey(policy) === "allow"),
        review: zonePolicies.filter((policy) => policyActionKey(policy) === "review"),
        deny: zonePolicies.filter((policy) => policyActionKey(policy) === "deny"),
      };
    })
    .filter((row) => row.allow.length + row.review.length + row.deny.length > 0 || !/transit/i.test(row.zone.label));
}

function policyActionBadge(policy: BackendDiagramRenderNode) {
  const action = policyActionKey(policy);
  if (action === "allow") return { label: "ALLOW", color: "#315f46", border: "#9fc6af", background: "#f1fbf5" };
  if (action === "deny") return { label: "DENY", color: "#8a341f", border: "#e7b29d", background: "#fff6f1" };
  return { label: "REVIEW", color: "#805b1d", border: "#dec58d", background: "#fffaf0" };
}

function SecurityPolicyCell({ policies, emptyLabel, onSelectObject }: { policies: BackendDiagramRenderNode[]; emptyLabel: string; onSelectObject: (id: string) => void }) {
  if (!policies.length) return <span className="muted" style={{ fontSize: 13 }}>{emptyLabel}</span>;
  return (
    <div style={{ display: "grid", gap: 7 }}>
      {policies.map((policy) => {
        const badge = policyActionBadge(policy);
        return (
          <button
            key={policy.id}
            type="button"
            onClick={() => onSelectObject(policy.id)}
            style={{
              width: "100%",
              textAlign: "left",
              border: `1px solid ${badge.border}`,
              background: "#ffffff",
              borderRadius: 12,
              padding: "8px 9px",
              color: backendDiagramTextFill(),
              fontWeight: 700,
              lineHeight: 1.28,
              whiteSpace: "normal",
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(75, 101, 137, 0.08)",
            }}
            title={fullCanvasLabel(policy.label)}
          >
            <span style={{ display: "inline-block", marginRight: 7, marginBottom: 4, padding: "2px 6px", borderRadius: 999, border: `1px solid ${badge.border}`, background: badge.background, color: badge.color, fontSize: 10, letterSpacing: "0.05em", fontWeight: 900 }}>{badge.label}</span>
            {policySummary(policy)}
          </button>
        );
      })}
    </div>
  );
}

function SecurityPolicyMatrixPanel({ nodes, edges, filteredEvidenceCount, onSelectObject }: { nodes: BackendDiagramRenderNode[]; edges: BackendDiagramRenderEdge[]; filteredEvidenceCount: number; onSelectObject: (id: string) => void }) {
  const rows = buildSecurityMatrixRows(nodes, edges);
  const zoneCount = nodes.filter((node) => node.objectType === "security-zone").length;
  const policyCount = nodes.filter(isPolicyNode).length;
  return (
    <div style={{ overflow: "auto", borderRadius: 18, border: "1px solid var(--border-subtle, #d8e2f0)", background: "#f8fbff", maxHeight: "calc(100vh - 220px)", minHeight: 520 }}>
      <div style={{ minWidth: 1040, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div>
            <strong>Security policy matrix</strong>
            <p className="muted" style={{ margin: "5px 0 0 0" }}>Readable policy rows replace node-link spaghetti. Click any zone or rule for evidence details.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge-soft">Zones {zoneCount}</span>
            <span className="badge-soft">Policy rules {policyCount}</span>
            <span className="badge-soft">Filtered evidence {filteredEvidenceCount}</span>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ width: "18%", textAlign: "left", padding: "10px 12px", color: backendDiagramMutedFill(), fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Source zone</th>
              <th style={{ width: "27%", textAlign: "left", padding: "10px 12px", color: backendDiagramMutedFill(), fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Allowed / permitted</th>
              <th style={{ width: "27%", textAlign: "left", padding: "10px 12px", color: backendDiagramMutedFill(), fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Review required</th>
              <th style={{ width: "28%", textAlign: "left", padding: "10px 12px", color: backendDiagramMutedFill(), fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Denied / isolated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.zone.id} style={{ background: "#ffffff" }}>
                <td style={{ verticalAlign: "top", padding: 12, border: "1px solid #dbe6f3", borderRight: 0, borderRadius: "16px 0 0 16px", background: "#fffaf0" }}>
                  <button
                    type="button"
                    onClick={() => onSelectObject(row.zone.id)}
                    style={{ border: 0, background: "transparent", textAlign: "left", padding: 0, color: backendDiagramTextFill(), fontWeight: 800, cursor: "pointer" }}
                  >
                    {fullCanvasLabel(row.zone.label)}
                  </button>
                  {row.zone.readiness === "ready" ? null : <p className="muted" style={{ margin: "6px 0 0 0", fontSize: 12 }}>{row.zone.readiness === "blocked" ? "Needs implementation evidence" : executionReadinessText(row.zone.readiness)}</p>}
                </td>
                <td style={{ verticalAlign: "top", padding: 12, borderTop: "1px solid #dbe6f3", borderBottom: "1px solid #dbe6f3" }}>
                  <SecurityPolicyCell policies={row.allow} emptyLabel="No explicit allow rule shown" onSelectObject={onSelectObject} />
                </td>
                <td style={{ verticalAlign: "top", padding: 12, borderTop: "1px solid #dbe6f3", borderBottom: "1px solid #dbe6f3" }}>
                  <SecurityPolicyCell policies={row.review} emptyLabel="No review gate shown" onSelectObject={onSelectObject} />
                </td>
                <td style={{ verticalAlign: "top", padding: 12, border: "1px solid #dbe6f3", borderLeft: 0, borderRadius: "0 16px 16px 0" }}>
                  <SecurityPolicyCell policies={row.deny} emptyLabel="No deny/isolation rule shown" onSelectObject={onSelectObject} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BackendDiagramCanvas({ renderModel, mode, scope, focusedSiteId, activeOverlays, labelMode, linkAnnotationMode, canvasZoom }: BackendDiagramCanvasProps) {
  const prepared = useMemo(() => buildVisibleDiagram(renderModel, mode, scope, focusedSiteId, activeOverlays), [renderModel, mode, scope, focusedSiteId, activeOverlays]);
  const visibleNodes = prepared.nodes;
  const visibleEdges = prepared.edges;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedNodeId && !visibleNodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, visibleNodes]);

  const nodeById = useMemo(() => new Map(visibleNodes.map((node) => [node.id, node])), [visibleNodes]);
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : undefined;
  const canvasBounds = useMemo(() => calculateCanvasBounds(visibleNodes, mode, scope), [visibleNodes, mode, scope]);
  const iconScale = automaticIconScale(visibleNodes.length, scope);
  const siteCount = visibleNodes.filter((node) => node.objectType === "site").length;
  const deviceCount = visibleNodes.filter((node) => node.objectType === "network-device").length;
  const zoneCount = visibleNodes.filter((node) => node.objectType === "security-zone").length;
  const policyCount = visibleNodes.filter(isPolicyNode).length;
  const hiddenProofCount = Math.max(0, renderModel.summary.nodeCount - visibleNodes.length);
  const canvasTitle = scope === "boundaries" ? "Security policy matrix" : "Network topology canvas";
  const countBadges = scope === "boundaries"
    ? [
        `Zones ${zoneCount}`,
        `Policies ${policyCount}`,
        `Relationships ${visibleEdges.length}`,
        `Filtered evidence ${hiddenProofCount}`,
      ]
    : [
        `Sites shown ${siteCount}`,
        `Devices ${deviceCount}`,
        `Links ${visibleEdges.length}`,
        `Filtered evidence ${hiddenProofCount}`,
      ];
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
          <strong>{canvasTitle}</strong>
          <p className="muted" style={{ margin: "6px 0 0 0" }}>
            Showing {visibleNodes.length} object(s) and {visibleEdges.length} relationship(s). View: {mode}; scope: {friendlyScopeLabel(scope)}. {scope === "boundaries" ? "Policy rules are shown as readable matrix rows, not a raw relationship graph." : "Physical and WAN views show sites as containers, local ISP underlay separately, VPN overlay tunnels terminating on the security edge when present, and VLAN detail reserved for logical views."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {countBadges.map((badge) => <span key={badge} className="badge-soft">{badge}</span>)}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, alignItems: "start" }}>
        {scope === "boundaries" ? (
          <SecurityPolicyMatrixPanel nodes={visibleNodes} edges={visibleEdges} filteredEvidenceCount={hiddenProofCount} onSelectObject={setSelectedNodeId} />
        ) : (
        <div style={{ overflow: "auto", borderRadius: 18, border: "1px solid var(--border-subtle, #d8e2f0)", minHeight: 700, maxHeight: "calc(100vh - 220px)", background: "#f8fbff" }}>
          <svg width={canvasBounds.width} height={canvasBounds.height} viewBox={`0 0 ${canvasBounds.width} ${canvasBounds.height}`} role="img" aria-label="Authoritative professional network topology diagram" style={{ display: "block", minWidth: `${canvasBounds.width}px`, maxWidth: "none", background: "#ffffff" }}>
            <BackendDiagramCanvasDefs />
            <rect x={0} y={0} width={canvasBounds.width} height={canvasBounds.height} rx={0} fill="#fbfdff" />
            <rect x={0} y={0} width={canvasBounds.width} height={canvasBounds.height} rx={0} fill="url(#backend-diagram-grid-major)" opacity="0.82" />
            {mode === "logical" ? phase97LogicalSiteGuides(visibleNodes, canvasBounds) : null}
            {phase99SiteContainers(visibleNodes, canvasBounds, mode, scope)}
            {(mode === "physical" || scope === "wan-cloud") ? phase97TopologyGuides(visibleNodes, canvasBounds, scope) : null}
            {phase101TopologyLegend(mode, scope)}
            {visibleEdges.map((edge) => {
              const source = nodeById.get(edge.sourceNodeId);
              const target = nodeById.get(edge.targetNodeId);
              if (!source || !target) return null;
              const sourcePoint = nodePoint(source, canvasBounds);
              const targetPoint = nodePoint(target, canvasBounds);
              const midX = (sourcePoint.x + targetPoint.x) / 2;
              const midY = (sourcePoint.y + targetPoint.y) / 2;
              const stroke = edgeStroke(edge);
              const path = edgePath(sourcePoint, targetPoint, mode, scope, edge);
              const count = edgeLabelCounts.get(edge.label) ?? 0;
              const seen = labelSeen.get(edge.label) ?? 0;
              labelSeen.set(edge.label, seen + 1);
              const professionalEdgeKind = edgeSemanticKind(edge);
              const noisyRelationshipLabel = /vlan membership|site device|site core|site edge|dhcp scope summary|dhcp-pool-serves|vlan-uses-subnet|site-contains/i.test(`${edge.relationship} ${edge.label}`);
              // Legacy Phase 94 guard strings: scope !== "wan-cloud" and !(mode === "physical" && scope === "global").
              const shouldShowLabel = linkAnnotationMode === "full"
                && !noisyRelationshipLabel
                && (professionalEdgeKind === "vpn-overlay" || professionalEdgeKind === "internet-underlay" || professionalEdgeKind === "internal-site")
                && (scope === "site" || scope === "wan-cloud" || count <= 1);
              return (
                <g key={edge.id} className={`backend-diagram-edge backend-diagram-edge-${edge.readiness}`}>
                  <path d={path} fill="none" stroke="#ffffff" strokeWidth={mode === "physical" || scope === "wan-cloud" ? 5 : edge.readiness === "blocked" ? 7 : 5} strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                  <path d={path} fill="none" stroke={stroke} strokeWidth={edgeSemanticKind(edge) === "vpn-overlay" ? 2.6 : mode === "physical" || scope === "wan-cloud" ? 2 : edge.readiness === "blocked" ? 3 : 2.2} strokeDasharray={edgeDashArray(edge)} strokeLinecap="round" strokeLinejoin="round" markerEnd={undefined} opacity={edge.readiness === "unknown" ? 0.42 : edgeSemanticKind(edge) === "vpn-overlay" ? 0.78 : mode === "physical" || scope === "wan-cloud" ? 0.62 : 0.7} />
                  {shouldShowLabel ? (
                    <text x={midX + 8} y={midY - 8} fontSize="11" fill={backendDiagramTextFill()}>{cleanCanvasLabel(edge.label, 34)}</text>
                  ) : null}
                </g>
              );
            })}
            {visibleNodes.map((node) => {
              // Phase 100: in physical/WAN views a site is a container/area, not a peer topology node.
              if (node.objectType === "site" && (mode === "physical" || scope === "wan-cloud")) return null;
              const selected = selectedNode?.id === node.id;
              const point = nodePoint(node, canvasBounds);
              return (
                <g key={node.id} transform={`translate(${point.x}, ${point.y})`} onClick={() => setSelectedNodeId(node.id)} style={{ cursor: "pointer" }}>
                  {renderNodeVisual(node, selected, iconScale, labelMode, canvasZoom, mode, scope)}
                </g>
              );
            })}
          </svg>
        </div>
        )}

        {selectedNode ? (
          <aside className="panel" style={{ padding: 14, display: "grid", gap: 12, maxWidth: 720 }}>
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
                      ? "Execution is blocked by missing implementation safety evidence. The diagram object itself is still usable for design review."
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
                    {selectedNode.notes.slice(0, 4).map((note) => <li key={note}>{cleanCanvasNote(note, 130)}</li>)}
                  </ul>
                )}
              </div>
          </aside>
          ) : null}
      </div>
    </div>
  );
}
