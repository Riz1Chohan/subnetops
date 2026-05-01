import { useMemo, useState } from "react";
import type { BackendDiagramRenderEdge, BackendDiagramRenderModel, BackendDiagramRenderNode } from "../../../lib/designCoreSnapshot";
import { truthBadgeClass } from "../../../lib/reportDiagramTruth";
import type { ActiveOverlayMode, DiagramMode, DiagramScope, LinkAnnotationMode } from "../diagramTypes";

interface BackendDiagramCanvasProps {
  renderModel: BackendDiagramRenderModel;
  mode: DiagramMode;
  scope: DiagramScope;
  activeOverlays: ActiveOverlayMode[];
  linkAnnotationMode: LinkAnnotationMode;
}

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

function nodeRadius(node: BackendDiagramRenderNode) {
  if (node.objectType === "site") return 40;
  if (node.objectType === "network-device") return /firewall/i.test(node.label) ? 38 : 36;
  if (node.objectType === "security-zone") return /wan|internet/i.test(node.label) ? 44 : 34;
  if (node.objectType === "policy-rule") return 28;
  if (node.objectType === "dhcp-pool") return 28;
  return 32;
}

function cleanCanvasLabel(value: string, max = 28) {
  const cleaned = value
    .replace(/device-[0-9a-f-]+/gi, "device")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function selectedOverlaySet(activeOverlays: ActiveOverlayMode[]) {
  return new Set(activeOverlays.map((item) => String(item)));
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
      keys.add("addressing");
      keys.add("security");
      keys.add("nat");
    }
    if (overlay === "redundancy") keys.add("routing");
  }
  return keys;
}

function edgeVisibleForView(edge: BackendDiagramRenderEdge, mode: DiagramMode, scope: DiagramScope, activeOverlays: ActiveOverlayMode[]) {
  if (activeOverlays.length > 0) {
    const overlays = backendOverlayKeysForActiveOverlays(activeOverlays);
    return edge.overlayKeys.some((key) => overlays.has(key));
  }

  if (scope === "boundaries") return edge.overlayKeys.some((key) => key === "security" || key === "nat");
  if (scope === "wan-cloud") return edge.overlayKeys.some((key) => key === "routing" || key === "nat") || /wan|transit|cloud|route|internet/i.test(edge.label);
  if (mode === "physical") return edge.overlayKeys.some((key) => key === "routing" || key === "addressing" || key === "nat");
  return edge.overlayKeys.some((key) => key === "routing" || key === "security" || key === "addressing");
}

function nodeVisibleByDefault(node: BackendDiagramRenderNode, mode: DiagramMode, scope: DiagramScope) {
  if (scope === "boundaries") {
    return node.objectType === "site"
      || node.objectType === "network-device"
      || node.objectType === "security-zone"
      || node.objectType === "policy-rule";
  }

  if (scope === "wan-cloud") {
    return node.objectType === "site"
      || node.objectType === "network-device"
      || node.objectType === "route-domain"
      || (node.objectType === "security-zone" && /wan|internet|cloud|transit/i.test(node.label));
  }

  if (mode === "physical") {
    return node.objectType === "site"
      || node.objectType === "network-device"
      || node.objectType === "route-domain"
      || (node.objectType === "security-zone" && /wan|internet/i.test(node.label));
  }

  return node.objectType === "site"
    || node.objectType === "network-device"
    || node.objectType === "route-domain"
    || node.objectType === "security-zone";
}

function nodeVisibleForOverlays(node: BackendDiagramRenderNode, activeOverlays: ActiveOverlayMode[]) {
  if (activeOverlays.length === 0) return false;
  const overlays = selectedOverlaySet(activeOverlays);
  if (overlays.has("addressing")) return node.layer === "site" || node.layer === "device" || node.layer === "interface" || node.objectType === "dhcp-pool";
  if (overlays.has("security")) return node.layer === "security" || node.layer === "device" || node.objectType === "site" || node.objectType === "policy-rule";
  if (overlays.has("flows")) return node.objectType === "security-flow" || node.objectType === "segmentation-flow" || node.objectType === "policy-rule" || node.layer === "security" || node.layer === "device";
  if (overlays.has("services")) return /service|server|cloud|remote|operations|dhcp/i.test(node.label) || node.layer === "device" || node.objectType === "site";
  if (overlays.has("redundancy")) return node.layer === "routing" || node.layer === "device" || node.objectType === "site";
  return false;
}

function visibleEdgesForView(renderModel: BackendDiagramRenderModel, mode: DiagramMode, scope: DiagramScope, activeOverlays: ActiveOverlayMode[]) {
  const edges = renderModel.edges.filter((edge) => edgeVisibleForView(edge, mode, scope, activeOverlays));
  if (edges.length > 0) return edges;

  const fallbackEdges = renderModel.edges.filter((edge) => edge.overlayKeys.includes("routing") || edge.overlayKeys.includes("addressing"));
  return fallbackEdges.length > 0 ? fallbackEdges : renderModel.edges;
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

function nodeShape(node: BackendDiagramRenderNode, selected: boolean) {
  const radius = nodeRadius(node);
  const strokeWidth = selected ? 4 : node.readiness === "blocked" ? 3 : 2;
  const common = {
    fill: "var(--panel-bg, #fff)",
    stroke: "currentColor",
    strokeWidth,
    opacity: node.readiness === "unknown" ? 0.72 : 1,
  };

  if (node.objectType === "site") {
    return <rect x={-60} y={-34} width={120} height={68} rx={18} {...common} />;
  }

  if (node.objectType === "network-device") {
    if (/firewall/i.test(node.label)) {
      return <path d="M -46 -28 H 46 V 28 H -46 Z M -46 -9 H 46 M -46 10 H 46 M -16 -28 V 28 M 16 -28 V 28" {...common} />;
    }
    return <rect x={-48} y={-28} width={96} height={56} rx={14} {...common} />;
  }

  if (node.objectType === "policy-rule") {
    return <path d="M 0 -34 L 44 0 L 0 34 L -44 0 Z" {...common} />;
  }

  return <circle r={radius} {...common} />;
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
  const maxX = Math.max(1200, ...visibleNodes.map((node) => node.x + 220));
  const maxY = Math.max(760, ...visibleNodes.map((node) => node.y + 160));

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
            Showing {visibleNodes.length} professional topology object(s) and {visibleEdges.length} relationship(s). View: {mode}; scope: {scope}; layout: {renderModel.summary.layoutMode}. Detailed proof, implementation, and verification objects stay hidden unless an overlay asks for them.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Authoritative model</span>
          <span className="badge-soft">Groups {renderModel.summary.groupCount}</span>
          <span className="badge-soft">Overlays {renderModel.summary.overlayCount}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(720px, 1fr) minmax(260px, 340px)", gap: 12, alignItems: "start" }}>
        <div style={{ overflow: "auto", borderRadius: 18, border: "1px solid var(--border-subtle, #d8e2f0)" }}>
          <svg width={maxX} height={maxY} viewBox={`0 0 ${maxX} ${maxY}`} role="img" aria-label="Authoritative professional network topology diagram">
            <defs>
              <marker id="backend-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            <rect x={0} y={0} width={maxX} height={maxY} rx={20} fill="var(--canvas-bg, #f7fbff)" opacity={0.9} />
            {visibleEdges.map((edge) => {
              const source = nodeById.get(edge.sourceNodeId);
              const target = nodeById.get(edge.targetNodeId);
              if (!source || !target) return null;
              const midX = (source.x + target.x) / 2;
              const bendY = Math.abs(source.y - target.y) < 80 ? source.y - 48 : (source.y + target.y) / 2;
              return (
                <g key={edge.id} className={`backend-diagram-edge backend-diagram-edge-${edge.readiness}`}>
                  <path
                    d={`M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={edge.readiness === "blocked" ? 3 : 2}
                    strokeDasharray={edge.readiness === "unknown" ? "6 6" : undefined}
                    markerEnd="url(#backend-arrow)"
                    opacity={edge.readiness === "unknown" ? 0.38 : 0.7}
                  />
                  {linkAnnotationMode === "full" ? (
                    <text x={midX + 8} y={bendY - 8} fontSize="11" fill="currentColor">{cleanCanvasLabel(edge.label, 34)}</text>
                  ) : null}
                </g>
              );
            })}
            {visibleNodes.map((node) => {
              const selected = selectedNode?.id === node.id;
              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={() => setSelectedNodeId(node.id)} style={{ cursor: "pointer" }}>
                  {nodeShape(node, selected)}
                  <text textAnchor="middle" y={-8} fontSize="10" fill="currentColor">{professionalNodeKind(node)}</text>
                  <text textAnchor="middle" y={8} fontSize="12" fontWeight={700} fill="currentColor">{cleanCanvasLabel(node.label, 22)}</text>
                  <text textAnchor="middle" y={24} fontSize="10" fill="currentColor">{node.readiness}</text>
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
                    ? "No blocking or review finding is attached to this visible topology object."
                    : `${selectedNode.relatedFindingIds.length} finding reference(s) are attached in the technical proof model.`}
                </p>
              </div>
              <div>
                <strong>Notes</strong>
                {selectedNode.notes.length === 0 ? (
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>No notes provided for this topology object.</p>
                ) : (
                  <ul style={{ margin: "8px 0 0 0", paddingLeft: 18 }}>
                    {selectedNode.notes.slice(0, 5).map((note) => <li key={note}>{cleanCanvasLabel(note, 120)}</li>)}
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
