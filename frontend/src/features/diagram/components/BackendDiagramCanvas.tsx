import { useMemo, useState } from "react";
import type { BackendDiagramRenderEdge, BackendDiagramRenderModel, BackendDiagramRenderNode } from "../../../lib/designCoreSnapshot";
import { truthBadgeClass } from "../../../lib/reportDiagramTruth";
import type { ActiveOverlayMode, DiagramMode, DiagramScope, LinkAnnotationMode } from "../diagramTypes";
import { DeviceIcon, type DeviceKind } from "./diagramRendererShared";

interface BackendDiagramCanvasProps {
  renderModel: BackendDiagramRenderModel;
  mode: DiagramMode;
  scope: DiagramScope;
  activeOverlays: ActiveOverlayMode[];
  linkAnnotationMode: LinkAnnotationMode;
}

type CanvasBounds = { width: number; height: number; offsetX: number; offsetY: number };

function professionalNodeKind(node: BackendDiagramRenderNode) {
  if (node.objectType === "site") return "Site";
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

function cleanCanvasNote(value: string, max = 140) {
  const cleaned = value
    .replace(/\bPhase\s+\d+\s+models\b/gi, "The current planning model uses")
    .replace(/\bFuture phases\b/gi, "Future versions")
    .replace(/\bbackend\b/gi, "design model")
    .replace(/\bdesign-core\b/gi, "design model")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function selectedOverlaySet(activeOverlays: ActiveOverlayMode[]) {
  return new Set(activeOverlays.map((item) => String(item)));
}

function explicitlyRequestsSecurity(activeOverlays: ActiveOverlayMode[]) {
  return activeOverlays.includes("security") || activeOverlays.includes("flows");
}

function explicitlyRequestsAddressing(activeOverlays: ActiveOverlayMode[]) {
  return activeOverlays.includes("addressing") || activeOverlays.includes("services");
}

function backendOverlayKeysForActiveOverlays(activeOverlays: ActiveOverlayMode[]) {
  const keys = new Set<string>();
  for (const overlay of activeOverlays) {
    if (overlay === "addressing") keys.add("addressing");
    if (overlay === "security" || overlay === "flows") {
      keys.add("security");
      keys.add("nat");
    }
    if (overlay === "services") {
      // Services is a summary layer, not permission to flood the physical canvas with policy objects.
      keys.add("addressing");
    }
    if (overlay === "redundancy") keys.add("routing");
  }
  return keys;
}

function edgeVisibleForView(edge: BackendDiagramRenderEdge, mode: DiagramMode, scope: DiagramScope, activeOverlays: ActiveOverlayMode[]) {
  const securityRequested = explicitlyRequestsSecurity(activeOverlays);
  const addressingRequested = explicitlyRequestsAddressing(activeOverlays);

  if (scope === "boundaries") {
    return edge.overlayKeys.some((key) => key === "security" || key === "nat");
  }

  if (mode === "physical") {
    const isSiteDeviceEdge = edge.relationship === "site-contains-device";
    const isPhysicalTransportEdge = edge.overlayKeys.includes("routing") && /site-to-site|WAN edge path|internet\/security edge/i.test(edge.label);
    const isDhcpSummaryEdge = addressingRequested && /DHCP scope summary/i.test(edge.label);
    const isExplicitSecurityEdge = securityRequested && edge.overlayKeys.includes("security");
    return isSiteDeviceEdge || isPhysicalTransportEdge || isDhcpSummaryEdge || isExplicitSecurityEdge;
  }

  if (activeOverlays.length > 0) {
    const overlays = backendOverlayKeysForActiveOverlays(activeOverlays);
    return edge.overlayKeys.some((key) => overlays.has(key));
  }

  if (scope === "wan-cloud") return edge.overlayKeys.some((key) => key === "routing" || key === "nat") || /wan|transit|cloud|route|internet/i.test(edge.label);
  return edge.overlayKeys.some((key) => key === "routing" || key === "addressing");
}

function nodeVisibleByDefault(node: BackendDiagramRenderNode, mode: DiagramMode, scope: DiagramScope) {
  const isWanEdge = node.objectType === "security-zone" && /wan|internet|cloud|transit/i.test(node.label);

  if (scope === "boundaries") {
    return node.objectType === "security-zone"
      || node.objectType === "policy-rule"
      || node.objectType === "security-flow";
  }

  if (scope === "wan-cloud") {
    return node.objectType === "site"
      || node.objectType === "network-device"
      || node.objectType === "route-domain"
      || isWanEdge;
  }

  if (mode === "physical") {
    return node.objectType === "site"
      || node.objectType === "network-device"
      || isWanEdge;
  }

  return node.objectType === "site"
    || node.objectType === "network-device"
    || node.objectType === "route-domain";
}

function nodeVisibleForOverlays(node: BackendDiagramRenderNode, activeOverlays: ActiveOverlayMode[]) {
  if (activeOverlays.length === 0) return false;
  const overlays = selectedOverlaySet(activeOverlays);
  if (overlays.has("addressing")) return node.layer === "site" || node.layer === "device" || node.layer === "interface" || node.objectType === "dhcp-pool";
  if (overlays.has("security")) return node.layer === "security" || node.objectType === "policy-rule" || node.objectType === "security-zone";
  if (overlays.has("flows")) return node.objectType === "security-flow" || node.objectType === "segmentation-flow" || node.objectType === "policy-rule" || node.layer === "security";
  if (overlays.has("services")) {
    return node.objectType === "site"
      || node.objectType === "network-device"
      || node.objectType === "dhcp-pool"
      || (node.layer !== "security" && /service|server|cloud|remote|operations|dhcp/i.test(node.label));
  }
  if (overlays.has("redundancy")) return node.layer === "routing" || node.layer === "device" || node.objectType === "site";
  return false;
}

function visibleEdgesForView(renderModel: BackendDiagramRenderModel, mode: DiagramMode, scope: DiagramScope, activeOverlays: ActiveOverlayMode[]) {
  const edges = renderModel.edges.filter((edge) => edgeVisibleForView(edge, mode, scope, activeOverlays));
  if (edges.length > 0) return edges;

  if (mode === "physical") {
    return renderModel.edges.filter((edge) => edge.relationship === "site-contains-device" || /site-to-site|WAN edge path|internet\/security edge/i.test(edge.label));
  }

  const fallbackEdges = renderModel.edges.filter((edge) => edge.overlayKeys.includes("routing") || edge.overlayKeys.includes("addressing"));
  return fallbackEdges.length > 0 ? fallbackEdges : [];
}

function visibleNodeSet(renderModel: BackendDiagramRenderModel, mode: DiagramMode, scope: DiagramScope, activeOverlays: ActiveOverlayMode[]) {
  const baseNodes = renderModel.nodes.filter((node) => nodeVisibleByDefault(node, mode, scope) || nodeVisibleForOverlays(node, activeOverlays));
  const visibleIds = new Set(baseNodes.map((node) => node.id));

  for (const edge of visibleEdgesForView(renderModel, mode, scope, activeOverlays)) {
    visibleIds.add(edge.sourceNodeId);
    visibleIds.add(edge.targetNodeId);
  }

  const visible = renderModel.nodes.filter((node) => visibleIds.has(node.id));
  const professionalLimit = activeOverlays.length > 0 || scope === "boundaries" ? 120 : 80;
  return (visible.length > 0 ? visible : renderModel.nodes).slice(0, professionalLimit);
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

function automaticIconScale(nodeCount: number) {
  if (nodeCount > 90) return 0.42;
  if (nodeCount > 60) return 0.48;
  if (nodeCount > 36) return 0.56;
  return 0.64;
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
  const strokeWidth = selected ? 3 : node.readiness === "blocked" ? 2.4 : 1.8;
  const common = {
    fill: "#ffffff",
    stroke,
    strokeWidth,
    opacity: node.readiness === "unknown" ? 0.74 : 1,
    filter: selected ? "url(#backend-diagram-device-shadow)" : undefined,
  };

  if (node.objectType === "site") {
    const width = 128 * Math.max(scale, 0.58);
    const height = 64 * Math.max(scale, 0.58);
    return <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={16} fill="#ffffff" stroke={stroke} strokeWidth={strokeWidth} opacity="0.94" />;
  }

  if (node.objectType === "policy-rule") {
    return <path d="M 0 -30 L 40 0 L 0 30 L -40 0 Z" {...common} />;
  }

  if (node.objectType === "security-zone") {
    return <rect x={-52 * scale} y={-28 * scale} width={104 * scale} height={56 * scale} rx={18 * scale} fill="#fffaf0" stroke={stroke} strokeWidth={strokeWidth} />;
  }

  return <circle r={30 * Math.max(scale, 0.58)} {...common} />;
}

function renderNodeVisual(node: BackendDiagramRenderNode, selected: boolean, scale: number) {
  const kind = professionalDeviceKind(node);
  const titleY = kind ? 48 * scale : node.objectType === "site" ? 4 : 6;
  const statusY = titleY + 15;
  const labelMax = node.objectType === "site" ? 24 : 22;

  if (kind) {
    const iconX = -58 * scale;
    const iconY = -35 * scale;
    return (
      <>
        {selected ? <circle r={54 * scale} fill="none" stroke={readinessStroke(node.readiness)} strokeWidth="2.5" opacity="0.7" /> : null}
        <g transform={`translate(${iconX}, ${iconY}) scale(${scale})`} filter={selected ? "url(#backend-diagram-device-shadow)" : undefined}>
          <DeviceIcon x={0} y={0} kind={kind} label="" showSublabel={false} emphasized />
        </g>
        <text textAnchor="middle" y={titleY} fontSize={Math.max(10, 12 * scale)} fontWeight={700} fill={backendDiagramTextFill()}>{cleanCanvasLabel(node.label, labelMax)}</text>
        <text textAnchor="middle" y={statusY} fontSize={Math.max(8, 9.5 * scale)} fill={backendDiagramMutedFill()}>{professionalNodeKind(node)} • {node.readiness}</text>
      </>
    );
  }

  return (
    <>
      {nodeShape(node, selected, scale)}
      <text textAnchor="middle" y={node.objectType === "site" ? -6 : -5} fontSize={Math.max(8, 10 * scale)} fill={backendDiagramMutedFill()}>{professionalNodeKind(node)}</text>
      <text textAnchor="middle" y={node.objectType === "site" ? 10 : 10} fontSize={Math.max(9, 11 * scale)} fontWeight={700} fill={backendDiagramTextFill()}>{cleanCanvasLabel(node.label, labelMax)}</text>
      <text textAnchor="middle" y={node.objectType === "site" ? 25 : 24} fontSize={Math.max(8, 9 * scale)} fill={backendDiagramMutedFill()}>{node.readiness}</text>
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
  const paddingRight = 420;
  const paddingBottom = 260;
  return {
    width: Math.max(2400, maxX - minX + paddingLeft + paddingRight),
    height: Math.max(1400, maxY - minY + paddingTop + paddingBottom),
    offsetX: paddingLeft - minX,
    offsetY: paddingTop - minY,
  };
}

export function BackendDiagramCanvas({ renderModel, mode, scope, activeOverlays, linkAnnotationMode }: BackendDiagramCanvasProps) {
  const visibleNodes = useMemo(() => visibleNodeSet(renderModel, mode, scope, activeOverlays), [renderModel, mode, scope, activeOverlays]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(visibleNodes[0]?.id ?? renderModel.nodes[0]?.id ?? "");
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const nodeById = useMemo(() => new Map(visibleNodes.map((node) => [node.id, node])), [visibleNodes]);
  const selectedNode = nodeById.get(selectedNodeId) ?? visibleNodes[0];
  const visibleEdges = useMemo(
    () => visibleEdgesForView(renderModel, mode, scope, activeOverlays).filter((edge) => visibleNodeIds.has(edge.sourceNodeId) && visibleNodeIds.has(edge.targetNodeId)),
    [renderModel, mode, scope, activeOverlays, visibleNodeIds],
  );
  const canvasBounds = useMemo(() => calculateCanvasBounds(visibleNodes), [visibleNodes]);
  const iconScale = automaticIconScale(visibleNodes.length);

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
            Showing {visibleNodes.length} professional topology object(s) and {visibleEdges.length} relationship(s). View: {mode}; scope: {scope}; layout: {renderModel.summary.layoutMode}. Canvas expands with topology size; detailed proof, implementation, and verification objects stay hidden unless an overlay asks for them.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Authoritative model</span>
          <span className="badge-soft">Groups {renderModel.summary.groupCount}</span>
          <span className="badge-soft">Overlays {renderModel.summary.overlayCount}</span>
          <span className="badge-soft">Icon scale {Math.round(iconScale * 100)}%</span>
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
              const bendY = Math.abs(sourcePoint.y - targetPoint.y) < 80 ? sourcePoint.y - 48 : (sourcePoint.y + targetPoint.y) / 2;
              const stroke = readinessStroke(edge.readiness);
              return (
                <g key={edge.id} className={`backend-diagram-edge backend-diagram-edge-${edge.readiness}`}>
                  <path
                    d={`M ${sourcePoint.x} ${sourcePoint.y} L ${midX} ${sourcePoint.y} L ${midX} ${targetPoint.y} L ${targetPoint.x} ${targetPoint.y}`}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={edge.readiness === "blocked" ? 7 : 5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.92"
                  />
                  <path
                    d={`M ${sourcePoint.x} ${sourcePoint.y} L ${midX} ${sourcePoint.y} L ${midX} ${targetPoint.y} L ${targetPoint.x} ${targetPoint.y}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={edge.readiness === "blocked" ? 3 : 2.2}
                    strokeDasharray={edge.readiness === "unknown" ? "6 6" : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    markerEnd={backendArrowForReadiness(edge.readiness)}
                    opacity={edge.readiness === "unknown" ? 0.48 : 0.76}
                  />
                  {linkAnnotationMode === "full" ? (
                    <text x={midX + 8} y={bendY - 8} fontSize="11" fill={backendDiagramTextFill()}>{cleanCanvasLabel(edge.label, 34)}</text>
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
                  <span className={truthBadgeClass(selectedNode.readiness)}>{selectedNode.readiness}</span>
                  <span className="badge-soft">{professionalNodeKind(selectedNode)}</span>
                  <span className="badge-soft">{selectedNode.sourceEngine.replace(/-/g, " ")}</span>
                </div>
              </div>
              <div>
                <strong>Truth state</strong>
                <p className="muted" style={{ margin: "6px 0 0 0" }}>{selectedNode.truthState}</p>
              </div>
              <div>
                <strong>Review signal</strong>
                <p className="muted" style={{ margin: "6px 0 0 0" }}>
                  {selectedNode.relatedFindingIds.length === 0
                    ? selectedNode.readiness === "blocked"
                      ? "This object is blocked by implementation readiness or safety dependency evidence, not by a graph-integrity finding."
                      : "No blocking or review finding is attached to this visible topology object."
                    : `${selectedNode.relatedFindingIds.length} finding reference(s) are attached in the technical proof model.`}
                </p>
              </div>
              <div>
                <strong>Notes</strong>
                {selectedNode.notes.length === 0 ? (
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>No notes provided for this topology object.</p>
                ) : (
                  <ul style={{ margin: "8px 0 0 0", paddingLeft: 18 }}>
                    {selectedNode.notes.slice(0, 5).map((note) => <li key={note}>{cleanCanvasNote(note, 140)}</li>)}
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
