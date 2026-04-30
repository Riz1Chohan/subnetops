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

function nodeShapeLabel(node: BackendDiagramRenderNode) {
  if (node.objectType === "network-device") return "Device";
  if (node.objectType === "network-interface") return "Interface";
  if (node.objectType === "network-link") return "Link";
  if (node.objectType === "route-domain" || node.objectType === "route-intent") return "Route";
  if (node.objectType === "security-zone" || node.objectType === "security-flow" || node.objectType === "policy-rule" || node.objectType === "nat-rule") return "Security";
  if (node.objectType === "implementation-step" || node.objectType === "implementation-stage") return "Implementation";
  return node.objectType.replace(/-/g, " ");
}

function nodeRadius(node: BackendDiagramRenderNode) {
  if (node.objectType === "site") return 34;
  if (node.objectType === "network-device") return 42;
  if (node.objectType === "security-zone") return 38;
  return 32;
}

function selectedOverlaySet(activeOverlays: ActiveOverlayMode[]) {
  return new Set(activeOverlays.map((item) => String(item)));
}

function edgeVisible(edge: BackendDiagramRenderEdge, activeOverlays: ActiveOverlayMode[]) {
  if (activeOverlays.length === 0) return true;
  const overlays = selectedOverlaySet(activeOverlays);
  return edge.overlayKeys.some((key) => overlays.has(key));
}

function nodeVisibleByDefault(node: BackendDiagramRenderNode, mode: DiagramMode, scope: DiagramScope) {
  if (mode === "physical") {
    return node.objectType === "site" || node.objectType === "network-device" || node.objectType === "route-domain" || (node.objectType === "network-link" && /wan|transit|vpn|internet|cloud|site-to-site/i.test(node.label));
  }

  if (scope === "boundaries") {
    return node.objectType === "site" || node.objectType === "network-device" || node.objectType === "security-zone" || node.objectType === "policy-rule" || node.objectType === "nat-rule" || node.objectType === "security-flow";
  }

  if (scope === "wan-cloud") {
    return node.objectType === "site" || node.objectType === "network-device" || node.objectType === "network-link" || node.objectType === "route-domain" || node.objectType === "route-intent" || node.objectType === "security-zone";
  }

  return node.objectType === "site" || node.objectType === "network-device" || node.objectType === "route-domain" || node.objectType === "security-zone" || (node.objectType === "network-link" && /wan|transit|vpn|internet|cloud|site-to-site/i.test(node.label));
}

function nodeVisibleForOverlays(node: BackendDiagramRenderNode, activeOverlays: ActiveOverlayMode[]) {
  if (activeOverlays.length === 0) return false;
  const overlays = selectedOverlaySet(activeOverlays);
  if (overlays.has("addressing")) return node.layer === "site" || node.layer === "device" || node.layer === "interface" || node.objectType === "dhcp-pool";
  if (overlays.has("security")) return node.layer === "security" || node.layer === "device" || node.objectType === "site";
  if (overlays.has("flows")) return node.objectType === "security-flow" || node.objectType === "segmentation-flow" || node.layer === "security" || node.layer === "device";
  if (overlays.has("services")) return /service|server|cloud|remote|operations/i.test(node.label) || node.layer === "device" || node.objectType === "site";
  if (overlays.has("redundancy")) return node.layer === "routing" || node.layer === "interface" || node.layer === "device" || node.objectType === "site";
  return false;
}

function visibleNodeSet(renderModel: BackendDiagramRenderModel, mode: DiagramMode, scope: DiagramScope, activeOverlays: ActiveOverlayMode[]) {
  const visible = renderModel.nodes.filter((node) => nodeVisibleByDefault(node, mode, scope) || nodeVisibleForOverlays(node, activeOverlays));
  return visible.length > 0 ? visible : renderModel.nodes.slice(0, 40);
}

export function BackendDiagramCanvas({ renderModel, mode, scope, activeOverlays, linkAnnotationMode }: BackendDiagramCanvasProps) {
  const visibleNodes = useMemo(() => visibleNodeSet(renderModel, mode, scope, activeOverlays), [renderModel, mode, scope, activeOverlays]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(visibleNodes[0]?.id ?? renderModel.nodes[0]?.id ?? "");
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const nodeById = useMemo(() => new Map(visibleNodes.map((node) => [node.id, node])), [visibleNodes]);
  const selectedNode = nodeById.get(selectedNodeId) ?? visibleNodes[0];
  const visibleEdges = useMemo(() => renderModel.edges.filter((edge) => visibleNodeIds.has(edge.sourceNodeId) && visibleNodeIds.has(edge.targetNodeId) && edgeVisible(edge, activeOverlays)), [renderModel.edges, visibleNodeIds, activeOverlays]);
  const maxX = Math.max(1200, ...visibleNodes.map((node) => node.x + 180));
  const maxY = Math.max(760, ...visibleNodes.map((node) => node.y + 120));

  if (renderModel.emptyState || renderModel.nodes.length === 0) {
    return (
      <div className="panel diagram-minimal-panel">
        <div className="diagram-empty-message">
          <strong>Backend diagram render model is not ready.</strong>
          <p className="muted" style={{ margin: "8px 0 0 0" }}>{renderModel.emptyState?.reason ?? "No backend render nodes were provided."}</p>
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
          <strong>Backend-authoritative diagram canvas</strong>
          <p className="muted" style={{ margin: "6px 0 0 0" }}>
            Showing {visibleNodes.length} of {renderModel.summary.nodeCount} backend nodes and {visibleEdges.length} of {renderModel.summary.edgeCount} backend edges using {renderModel.summary.layoutMode}. View: {mode}. Scope: {scope}. Phase 80 default hides DHCP, implementation, and verification proof nodes unless an overlay asks for them.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">Backend authored</span>
          <span className="badge-soft">Groups {renderModel.summary.groupCount}</span>
          <span className="badge-soft">Overlays {renderModel.summary.overlayCount}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(720px, 1fr) minmax(260px, 340px)", gap: 12, alignItems: "start" }}>
        <div style={{ overflow: "auto", borderRadius: 18 }}>
          <svg width={maxX} height={maxY} viewBox={`0 0 ${maxX} ${maxY}`} role="img" aria-label="Backend-authoritative network diagram render model">
            <defs>
              <marker id="backend-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {visibleEdges.map((edge) => {
              const source = nodeById.get(edge.sourceNodeId);
              const target = nodeById.get(edge.targetNodeId);
              if (!source || !target) return null;
              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;
              return (
                <g key={edge.id} className={`backend-diagram-edge backend-diagram-edge-${edge.readiness}`}>
                  <path
                    d={`M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={edge.readiness === "blocked" ? 3 : 2}
                    strokeDasharray={edge.readiness === "unknown" ? "6 6" : undefined}
                    markerEnd="url(#backend-arrow)"
                    opacity={edge.readiness === "unknown" ? 0.45 : 0.76}
                  />
                  {linkAnnotationMode === "full" ? (
                    <text x={midX + 8} y={midY - 8} fontSize="11" fill="currentColor">{edge.label}</text>
                  ) : null}
                </g>
              );
            })}
            {visibleNodes.map((node) => {
              const radius = nodeRadius(node);
              const selected = selectedNode?.id === node.id;
              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={() => setSelectedNodeId(node.id)} style={{ cursor: "pointer" }}>
                  <circle r={radius} fill="var(--panel-bg, #fff)" stroke="currentColor" strokeWidth={selected ? 4 : node.readiness === "blocked" ? 3 : 2} opacity={node.readiness === "unknown" ? 0.72 : 1} />
                  <text textAnchor="middle" y={-6} fontSize="11" fill="currentColor">{nodeShapeLabel(node)}</text>
                  <text textAnchor="middle" y={10} fontSize="12" fontWeight={700} fill="currentColor">{node.label.slice(0, 22)}</text>
                  <text textAnchor="middle" y={26} fontSize="10" fill="currentColor">{node.readiness}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="panel" style={{ padding: 14, display: "grid", gap: 12 }}>
          {selectedNode ? (
            <>
              <div>
                <p className="workspace-detail-kicker">Backend object</p>
                <h3 style={{ margin: "0 0 8px 0" }}>{selectedNode.label}</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className={truthBadgeClass(selectedNode.readiness)}>{selectedNode.readiness}</span>
                  <span className="badge-soft">{selectedNode.objectType}</span>
                  <span className="badge-soft">{selectedNode.sourceEngine}</span>
                </div>
              </div>
              <div>
                <strong>Object ID</strong>
                <p className="muted" style={{ margin: "6px 0 0 0", wordBreak: "break-all" }}>{selectedNode.objectId}</p>
              </div>
              <div>
                <strong>Truth state</strong>
                <p className="muted" style={{ margin: "6px 0 0 0" }}>{selectedNode.truthState}</p>
              </div>
              <div>
                <strong>Related findings</strong>
                {selectedNode.relatedFindingIds.length === 0 ? (
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>No backend finding IDs are attached to this render node.</p>
                ) : (
                  <ul style={{ margin: "8px 0 0 0", paddingLeft: 18 }}>
                    {selectedNode.relatedFindingIds.map((findingId) => <li key={findingId}>{findingId}</li>)}
                  </ul>
                )}
              </div>
              <div>
                <strong>Notes</strong>
                {selectedNode.notes.length === 0 ? (
                  <p className="muted" style={{ margin: "6px 0 0 0" }}>No notes provided by backend.</p>
                ) : (
                  <ul style={{ margin: "8px 0 0 0", paddingLeft: 18 }}>
                    {selectedNode.notes.slice(0, 5).map((note) => <li key={note}>{note}</li>)}
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
