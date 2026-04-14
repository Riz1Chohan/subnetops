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
  canvas.width = image.width || 1600;
  canvas.height = image.height || 1000;
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
  if (text.includes("clinical") || text.includes("medical") || text.includes("iot") || text.includes("camera")) return "clinical";
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
    case "clinical": return { fill: "#e7fbff", stroke: "#92deee", text: "#0f7286", label: "Specialized" };
    default: return { fill: "#edf3ff", stroke: "#c7d9fb", text: "#20427f", label: "Other" };
  }
}

function openTaskCount(comments: ProjectComment[], targetType: "SITE" | "VLAN", targetId: string) {
  return comments.filter((comment) => comment.taskStatus !== "DONE" && comment.targetType === targetType && comment.targetId === targetId).length;
}

function siteRole(site: SiteWithVlans, index: number) {
  const text = `${site.name} ${site.siteCode || ""}`.toLowerCase();
  if (text.includes("hq") || text.includes("head") || text.includes("core")) return "HQ";
  return index === 0 ? "Primary Site" : "Branch Site";
}

function networkCloud(cx: number, cy: number, label: string) {
  return (
    <g>
      <ellipse cx={cx - 34} cy={cy + 6} rx={34} ry={21} fill="#eef5ff" stroke="#b9d1f5" strokeWidth="2" />
      <ellipse cx={cx + 4} cy={cy - 6} rx={42} ry={26} fill="#eef5ff" stroke="#b9d1f5" strokeWidth="2" />
      <ellipse cx={cx + 44} cy={cy + 8} rx={30} ry={18} fill="#eef5ff" stroke="#b9d1f5" strokeWidth="2" />
      <rect x={cx - 54} y={cy + 2} width={112} height={28} rx={14} fill="#eef5ff" stroke="#b9d1f5" strokeWidth="2" />
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="14" fontWeight="700" fill="#244579">{label}</text>
    </g>
  );
}

function deviceBox(x: number, y: number, width: number, height: number, label: string, sublabel?: string, tone: "edge" | "core" | "site" = "site") {
  const palette = tone === "edge"
    ? { fill: "#eaf3ff", stroke: "#7fa9f7", text: "#1f4eaa" }
    : tone === "core"
      ? { fill: "#2357d8", stroke: "#2357d8", text: "#ffffff" }
      : { fill: "#ffffff", stroke: "#d7e2f3", text: "#16263d" };

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={16} fill={palette.fill} stroke={palette.stroke} strokeWidth="2" />
      <text x={x + width / 2} y={y + 24} textAnchor="middle" fontSize="14" fontWeight="700" fill={palette.text}>{label}</text>
      {sublabel ? <text x={x + width / 2} y={y + 42} textAnchor="middle" fontSize="11" fill={palette.text === "#ffffff" ? "#e8efff" : "#6a7d97"}>{sublabel}</text> : null}
    </g>
  );
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

function LogicalDiagram({ project, svgId, comments = [], onSelectTarget }: { project: ProjectDetail; svgId: string; comments?: ProjectComment[]; onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void; }) {
  const sites = (project.sites ?? []) as SiteWithVlans[];
  const siteWidth = 280;
  const siteGap = 36;
  const width = Math.max(1200, 80 + sites.length * siteWidth + Math.max(0, sites.length - 1) * siteGap);
  const height = 760;
  const startX = width / 2 - (sites.length * siteWidth + (sites.length - 1) * siteGap) / 2;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Logical network design diagram">
        <rect x={0} y={0} width={width} height={height} rx={28} fill="#fbfdff" />

        {networkCloud(width / 2, 48, "Internet / WAN")}
        <line x1={width / 2} y1={92} x2={width / 2} y2={130} stroke="#99b6e5" strokeWidth="3" />
        {deviceBox(width / 2 - 110, 130, 220, 62, "Edge Firewall", "Security boundary / policy", "edge")}
        <line x1={width / 2} y1={192} x2={width / 2} y2={234} stroke="#99b6e5" strokeWidth="3" />
        {deviceBox(width / 2 - 130, 234, 260, 68, project.name, "Core routing / services / design anchor", "core")}

        <text x={width / 2} y={338} textAnchor="middle" fontSize="13" fill="#5f7390">Logical design view • site boundaries, segment roles, and addressing containers</text>

        {sites.map((site, index) => {
          const x = startX + index * (siteWidth + siteGap);
          const y = 382;
          const role = siteRole(site, index);
          const siteTaskCount = openTaskCount(comments, "SITE", site.id);
          const vlans = site.vlans ?? [];
          const displayedVlans = vlans.slice(0, 6);
          const extraCount = Math.max(0, vlans.length - displayedVlans.length);
          const siteHeight = 270 + Math.max(0, displayedVlans.length - 3) * 28;
          const centerX = x + siteWidth / 2;

          return (
            <g key={site.id}>
              <line x1={width / 2} y1={302} x2={centerX} y2={y} stroke="#a8bfe8" strokeWidth="2.5" />
              <circle cx={centerX} cy={y} r="5" fill="#2357d8" />

              <rect x={x} y={y} width={siteWidth} height={siteHeight} rx={22} fill="#ffffff" stroke="#dbe6f7" strokeWidth="2" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 20} y={y + 28} fontSize="17" fontWeight="700" fill="#16263d">{site.name}</text>
              <text x={x + 20} y={y + 48} fontSize="11" fill="#6a7d97">{role} • {site.location || "Location not set"}</text>
              <text x={x + 20} y={y + 66} fontSize="11" fill="#6a7d97">{site.defaultAddressBlock || "No site block assigned"}</text>

              {siteTaskCount > 0 ? (
                <g>
                  <circle cx={x + siteWidth - 24} cy={y + 24} r="12" fill="#ff7a59" />
                  <text x={x + siteWidth - 24} y={y + 28} textAnchor="middle" fontSize="11" fill="white" fontWeight="700">{siteTaskCount}</text>
                </g>
              ) : null}

              {deviceBox(x + 16, y + 88, siteWidth - 32, 52, "Site Edge Router / L3 Gateway", "Inter-site routing and uplink to core", "edge")}
              {deviceBox(x + 16, y + 152, siteWidth - 32, 48, "Access Switch / Distribution", "Local access, trunks, DHCP relay, AP uplinks")}

              <text x={x + 18} y={y + 226} fontSize="12" fontWeight="700" fill="#324866">Segments</text>
              {displayedVlans.map((vlan, vlanIndex) => {
                const style = categoryColor(vlanCategory(vlan));
                const badgeY = y + 238 + vlanIndex * 28;
                const vlanTaskCount = openTaskCount(comments, "VLAN", vlan.id);
                return (
                  <g key={vlan.id} style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("VLAN", vlan.id)}>
                    <rect x={x + 16} y={badgeY} width={siteWidth - 32} height={22} rx={11} fill={style.fill} stroke={style.stroke} />
                    <text x={x + 26} y={badgeY + 15} fontSize="10.5" fill={style.text}>VLAN {vlan.vlanId} • {vlan.vlanName} • {vlan.subnetCidr}</text>
                    {vlanTaskCount > 0 ? <circle cx={x + siteWidth - 28} cy={badgeY + 11} r="7" fill="#ff7a59" /> : null}
                  </g>
                );
              })}
              {extraCount > 0 ? <text x={x + 18} y={y + 238 + displayedVlans.length * 28 + 14} fontSize="10.5" fill="#6a7d97">+ {extraCount} more segment{extraCount === 1 ? "" : "s"}</text> : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PhysicalDiagram({ project, svgId, comments = [], onSelectTarget }: { project: ProjectDetail; svgId: string; comments?: ProjectComment[]; onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void; }) {
  const sites = (project.sites ?? []) as SiteWithVlans[];
  const primaryIndex = sites.findIndex((site, index) => siteRole(site, index) === "HQ" || index === 0);
  const primarySite = sites[primaryIndex >= 0 ? primaryIndex : 0];
  const branches = sites.filter((site) => site.id !== primarySite?.id);
  const width = Math.max(1300, 900 + branches.length * 120);
  const height = 820;
  const centerX = width / 2;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Physical style network topology diagram">
        <rect x={0} y={0} width={width} height={height} rx={28} fill="#fbfdff" />

        {networkCloud(centerX, 54, "ISP / Internet")}
        {deviceBox(centerX - 120, 138, 240, 60, "HQ Edge Firewall", "Perimeter, NAT, VPN / security policies", "edge")}
        <line x1={centerX} y1={90} x2={centerX} y2={138} stroke="#99b6e5" strokeWidth="3" />

        <rect x={centerX - 190} y={240} width={380} height={240} rx={26} fill="#ffffff" stroke="#dbe6f7" strokeWidth="2" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => primarySite && onSelectTarget?.("SITE", primarySite.id)} />
        <text x={centerX - 166} y={272} fontSize="18" fontWeight="700" fill="#16263d">{primarySite?.name || project.name}</text>
        <text x={centerX - 166} y={292} fontSize="11" fill="#6a7d97">Primary site / HQ topology view</text>
        <text x={centerX - 166} y={310} fontSize="11" fill="#6a7d97">{primarySite?.defaultAddressBlock || "No site block assigned"}</text>

        {deviceBox(centerX - 150, 330, 130, 52, "Core Switch Stack", "Distribution / inter-VLAN", "site")}
        {deviceBox(centerX + 20, 330, 130, 52, "Server Zone", "Shared services / applications", "site")}
        {deviceBox(centerX - 150, 402, 130, 48, "Access Layer", "Wired edge / trunks / PoE", "site")}
        {deviceBox(centerX + 20, 402, 130, 48, "Wireless / APs", "SSID and mobility edge", "site")}
        <line x1={centerX} y1={198} x2={centerX} y2={240} stroke="#99b6e5" strokeWidth="3" />
        <line x1={centerX - 85} y1={382} x2={centerX - 85} y2={402} stroke="#b6c9ea" strokeWidth="2" />
        <line x1={centerX + 85} y1={382} x2={centerX + 85} y2={402} stroke="#b6c9ea" strokeWidth="2" />

        {branches.map((site, index) => {
          const leftSide = index % 2 === 0;
          const row = Math.floor(index / 2);
          const x = leftSide ? 70 : width - 350;
          const y = 250 + row * 220;
          const anchorX = leftSide ? x + 280 : x;
          const anchorY = y + 62;
          const siteTaskCount = openTaskCount(comments, "SITE", site.id);
          const categories = Array.from(new Set((site.vlans ?? []).map((vlan) => categoryColor(vlanCategory(vlan)).label))).slice(0, 3);

          return (
            <g key={site.id}>
              <line x1={centerX} y1={300} x2={anchorX} y2={anchorY} stroke="#a9c0e8" strokeWidth="2.5" />
              <rect x={x} y={y} width={280} height={126} rx={22} fill="#ffffff" stroke="#dbe6f7" strokeWidth="2" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 18} y={y + 28} fontSize="16" fontWeight="700" fill="#16263d">{site.name}</text>
              <text x={x + 18} y={y + 48} fontSize="11" fill="#6a7d97">{site.location || "Location not set"}</text>
              <text x={x + 18} y={y + 66} fontSize="11" fill="#6a7d97">{site.defaultAddressBlock || "No site block"}</text>
              <text x={x + 18} y={y + 88} fontSize="11" fill="#6a7d97">Edge router • access switch • AP / local edge</text>
              <text x={x + 18} y={y + 108} fontSize="11" fill="#6a7d97">{categories.join(", ") || "No segments yet"}</text>
              {siteTaskCount > 0 ? <g><circle cx={x + 252} cy={y + 22} r="12" fill="#ff7a59" /><text x={x + 252} y={y + 26} textAnchor="middle" fontSize="11" fill="white" fontWeight="700">{siteTaskCount}</text></g> : null}
            </g>
          );
        })}

        <text x={centerX} y={520} textAnchor="middle" fontSize="13" fill="#5f7390">Physical / topology view • perimeter, core, branch attachment, and local site edge components</text>
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
    return <div className="panel"><div className="diagram-toolbar"><div><h2 style={{ marginBottom: 6 }}>Diagram</h2><p className="muted" style={{ margin: 0 }}>Add sites and VLANs to generate a network diagram.</p></div></div></div>;
  }

  return (
    <div className="panel">
      <div className="diagram-toolbar" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Generated Diagram</h2>
          <p className="muted" style={{ margin: 0 }}>Switch between a logical design view and a more recognizable physical/topology-style view.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="diagram-toggle">
            <button type="button" className={mode === "logical" ? "active" : ""} onClick={() => setMode("logical")}>Logical Design</button>
            <button type="button" className={mode === "physical" ? "active" : ""} onClick={() => setMode("physical")}>Physical / Topology</button>
          </div>
          <button type="button" onClick={() => exportSvg(svgId, `${baseFilename}.svg`)}>Export SVG</button>
          <button type="button" onClick={() => { void exportPng(svgId, `${baseFilename}.png`); }}>Export PNG</button>
        </div>
      </div>
      <Legend />
      {mode === "logical"
        ? <LogicalDiagram project={project} svgId={svgId} comments={comments} onSelectTarget={onSelectTarget} />
        : <PhysicalDiagram project={project} svgId={svgId} comments={comments} onSelectTarget={onSelectTarget} />}
    </div>
  );
}
