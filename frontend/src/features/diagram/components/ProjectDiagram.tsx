import { useMemo, useState } from "react";
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
type VlanCategory = "admin" | "guest" | "servers" | "management" | "voice" | "clinical" | "default";

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
  canvas.width = image.width || 1400;
  canvas.height = image.height || 900;
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

function vlanCategory(vlan: Vlan): VlanCategory {
  const text = `${vlan.vlanName} ${vlan.purpose || ""} ${vlan.department || ""}`.toLowerCase();
  if (text.includes("guest")) return "guest";
  if (text.includes("server")) return "servers";
  if (text.includes("management") || text.includes("mgmt")) return "management";
  if (text.includes("voice")) return "voice";
  if (text.includes("clinical") || text.includes("medical")) return "clinical";
  if (text.includes("admin")) return "admin";
  return "default";
}

function categoryColor(category: VlanCategory) {
  switch (category) {
    case "admin": return { fill: "#e6f0ff", stroke: "#87aef7", text: "#1f4eaa", label: "Admin" };
    case "guest": return { fill: "#fff0e3", stroke: "#ffc98e", text: "#9a4f00", label: "Guest" };
    case "servers": return { fill: "#efe8ff", stroke: "#c7a7ff", text: "#5d30a6", label: "Servers" };
    case "management": return { fill: "#e7fff3", stroke: "#8ddab0", text: "#1f7d4b", label: "Management" };
    case "voice": return { fill: "#ffe8f0", stroke: "#ffadc8", text: "#a52f63", label: "Voice" };
    case "clinical": return { fill: "#e7fbff", stroke: "#92deee", text: "#0f7286", label: "Clinical" };
    default: return { fill: "#edf3ff", stroke: "#c7d9fb", text: "#20427f", label: "Other" };
  }
}

function siteHeight(site: SiteWithVlans) {
  const vlanCount = site.vlans?.length ?? 0;
  return Math.max(160, 100 + vlanCount * 34);
}

function Legend() {
  const items = ["admin", "guest", "servers", "management", "voice", "clinical", "default"] as const;
  return (
    <div className="legend">
      {items.map((item) => {
        const style = categoryColor(item);
        return (
          <div className="legend-item" key={item}>
            <span className="legend-swatch" style={{ background: style.stroke }} />
            {style.label}
          </div>
        );
      })}
    </div>
  );
}

function openTaskCount(comments: ProjectComment[], targetType: "SITE" | "VLAN", targetId: string) {
  return comments.filter((comment) => comment.taskStatus !== "DONE" && comment.targetType === targetType && comment.targetId === targetId).length;
}

function LogicalDiagram({ project, svgId, comments = [], onSelectTarget }: { project: ProjectDetail; svgId: string; comments?: ProjectComment[]; onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void; }) {
  const sites = project.sites ?? [];
  const siteWidth = 250;
  const gap = 40;
  const leftPadding = 40;
  const topPadding = 40;
  const projectBoxWidth = 260;
  const projectBoxHeight = 70;
  const maxSiteHeight = Math.max(...sites.map(siteHeight));
  const width = Math.max(900, leftPadding * 2 + sites.length * siteWidth + Math.max(0, sites.length - 1) * gap);
  const height = 220 + maxSiteHeight;
  const projectX = width / 2 - projectBoxWidth / 2;
  const projectY = topPadding;
  const siteStartY = 170;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Logical network diagram">
        <rect x={0} y={0} width={width} height={height} rx={24} fill="#fbfdff" />
        <rect x={projectX} y={projectY} width={projectBoxWidth} height={projectBoxHeight} rx={18} fill="#2357d8" />
        <text x={width / 2} y={projectY + 28} textAnchor="middle" fill="white" fontSize="18" fontWeight="700">{project.name}</text>
        <text x={width / 2} y={projectY + 50} textAnchor="middle" fill="#e7efff" fontSize="12">{project.organizationName || "SubnetOps Project"}</text>

        {sites.map((site, index) => {
          const x = leftPadding + index * (siteWidth + gap);
          const y = siteStartY;
          const boxHeight = siteHeight(site);
          const centerX = x + siteWidth / 2;
          const lineStartY = projectY + projectBoxHeight;
          const lineEndY = y;
          const siteTaskCount = openTaskCount(comments, "SITE", site.id);

          return (
            <g key={site.id}>
              <line x1={width / 2} y1={lineStartY} x2={centerX} y2={lineEndY} stroke="#9fb7df" strokeWidth="2.5" />
              <circle cx={centerX} cy={lineEndY} r="5" fill="#2357d8" />
              <rect x={x} y={y} width={siteWidth} height={boxHeight} rx={18} fill="#ffffff" stroke="#dbe6f7" strokeWidth="2" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 18} y={y + 26} fontSize="16" fontWeight="700" fill="#16263d">{site.name}</text>
              <text x={x + 18} y={y + 46} fontSize="11" fill="#6a7d97">{site.location || "Location not set"}</text>
              <text x={x + 18} y={y + 62} fontSize="11" fill="#6a7d97">{site.defaultAddressBlock || "No address block"}</text>
              {siteTaskCount > 0 ? <g><circle cx={x + siteWidth - 24} cy={y + 24} r="12" fill="#ff7a59" /><text x={x + siteWidth - 24} y={y + 28} textAnchor="middle" fontSize="11" fill="white" fontWeight="700">{siteTaskCount}</text></g> : null}

              {(site.vlans ?? []).map((vlan, vlanIndex) => {
                const vlanY = y + 78 + vlanIndex * 34;
                const style = categoryColor(vlanCategory(vlan));
                const vlanTaskCount = openTaskCount(comments, "VLAN", vlan.id);
                return (
                  <g key={vlan.id} style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("VLAN", vlan.id)}>
                    <rect x={x + 14} y={vlanY} width={siteWidth - 28} height={26} rx={10} fill={style.fill} stroke={style.stroke} />
                    <text x={x + 24} y={vlanY + 17} fontSize="11" fill={style.text}>VLAN {vlan.vlanId} • {vlan.vlanName} • {vlan.subnetCidr}</text>
                    {vlanTaskCount > 0 ? <g><circle cx={x + siteWidth - 28} cy={vlanY + 13} r="10" fill="#ff7a59" /><text x={x + siteWidth - 28} y={vlanY + 17} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">{vlanTaskCount}</text></g> : null}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PhysicalDiagram({ project, svgId, comments = [], onSelectTarget }: { project: ProjectDetail; svgId: string; comments?: ProjectComment[]; onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void; }) {
  const sites = project.sites ?? [];
  const width = Math.max(900, 220 + sites.length * 240);
  const height = 420;
  const centerX = width / 2;
  const internetY = 60;
  const coreY = 150;
  const siteY = 285;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Physical style network diagram">
        <rect x={0} y={0} width={width} height={height} rx={24} fill="#fbfdff" />
        <ellipse cx={centerX} cy={internetY} rx={85} ry={30} fill="#ecf4ff" stroke="#bad0f5" strokeWidth="2" />
        <text x={centerX} y={internetY + 5} textAnchor="middle" fontSize="16" fontWeight="700" fill="#20427f">Internet / WAN</text>
        <rect x={centerX - 130} y={coreY - 30} width={260} height={60} rx={18} fill="#2357d8" />
        <text x={centerX} y={coreY - 4} textAnchor="middle" fontSize="18" fontWeight="700" fill="white">{project.name}</text>
        <text x={centerX} y={coreY + 16} textAnchor="middle" fontSize="12" fill="#e6efff">Core / Routing Layer</text>
        <line x1={centerX} y1={internetY + 30} x2={centerX} y2={coreY - 30} stroke="#9fb7df" strokeWidth="3" />

        {sites.map((site, index) => {
          const siteBoxWidth = 190;
          const totalWidth = sites.length * siteBoxWidth + (sites.length - 1) * 36;
          const startX = centerX - totalWidth / 2;
          const x = startX + index * (siteBoxWidth + 36);
          const vlanCount = site.vlans?.length ?? 0;
          const categories = new Set((site.vlans ?? []).map((vlan) => categoryColor(vlanCategory(vlan)).label));
          const siteTaskCount = openTaskCount(comments, "SITE", site.id);

          return (
            <g key={site.id}>
              <line x1={centerX} y1={coreY + 30} x2={x + siteBoxWidth / 2} y2={siteY - 18} stroke="#9fb7df" strokeWidth="2.5" />
              <rect x={x} y={siteY} width={siteBoxWidth} height={100} rx={16} fill="#ffffff" stroke="#dbe6f7" strokeWidth="2" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 16} y={siteY + 24} fontSize="15" fontWeight="700" fill="#16263d">{site.name}</text>
              <text x={x + 16} y={siteY + 44} fontSize="11" fill="#6a7d97">{site.location || "Location not set"}</text>
              <text x={x + 16} y={siteY + 62} fontSize="11" fill="#6a7d97">VLANs: {vlanCount}</text>
              <text x={x + 16} y={siteY + 80} fontSize="11" fill="#6a7d97">{Array.from(categories).slice(0, 3).join(", ") || "No categories"}</text>
              {siteTaskCount > 0 ? <g><circle cx={x + siteBoxWidth - 20} cy={siteY + 20} r="12" fill="#ff7a59" /><text x={x + siteBoxWidth - 20} y={siteY + 24} textAnchor="middle" fontSize="11" fill="white" fontWeight="700">{siteTaskCount}</text></g> : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ProjectDiagram({ project, comments = [], onSelectTarget }: ProjectDiagramProps) {
  const sites = project.sites ?? [];
  const svgId = `diagram-${project.id}`;
  const [mode, setMode] = useState<DiagramMode>("logical");
  const baseFilename = useMemo(() => `${project.name.replace(/\s+/g, "-").toLowerCase()}-${mode}-diagram`, [mode, project.name]);

  if (sites.length === 0) {
    return <div className="panel"><div className="diagram-toolbar"><div><h2 style={{ marginBottom: 6 }}>Diagram</h2><p className="muted" style={{ margin: 0 }}>Add sites and VLANs to generate a diagram.</p></div></div></div>;
  }

  return (
    <div className="panel">
      <div className="diagram-toolbar" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Generated Diagram</h2>
          <p className="muted" style={{ margin: 0 }}>Switch between logical and physical-style views.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="diagram-toggle">
            <button type="button" className={mode === "logical" ? "active" : ""} onClick={() => setMode("logical")}>Logical</button>
            <button type="button" className={mode === "physical" ? "active" : ""} onClick={() => setMode("physical")}>Physical</button>
          </div>
          <button type="button" onClick={() => exportSvg(svgId, `${baseFilename}.svg`)}>Export SVG</button>
          <button type="button" onClick={() => { void exportPng(svgId, `${baseFilename}.png`); }}>Export PNG</button>
        </div>
      </div>
      <Legend />
      {mode === "logical" ? <LogicalDiagram project={project} svgId={svgId} comments={comments} onSelectTarget={onSelectTarget} /> : <PhysicalDiagram project={project} svgId={svgId} comments={comments} onSelectTarget={onSelectTarget} />}
    </div>
  );
}
