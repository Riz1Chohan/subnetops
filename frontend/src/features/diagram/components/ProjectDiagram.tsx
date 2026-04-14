import { useMemo, useState } from "react";
import { parseRequirementsProfile } from "../../../lib/requirementsProfile";
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
  canvas.width = image.width || 1800;
  canvas.height = image.height || 1100;
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

function cloudGlyph(cx: number, cy: number, label: string, tone: "internet" | "cloud" = "internet") {
  const palette = tone === "internet"
    ? { fill: "#eef5ff", stroke: "#b9d1f5", text: "#244579" }
    : { fill: "#f2ecff", stroke: "#cdb8ff", text: "#5d30a6" };

  return (
    <g>
      <ellipse cx={cx - 34} cy={cy + 8} rx={34} ry={20} fill={palette.fill} stroke={palette.stroke} strokeWidth="2" />
      <ellipse cx={cx + 4} cy={cy - 8} rx={44} ry={26} fill={palette.fill} stroke={palette.stroke} strokeWidth="2" />
      <ellipse cx={cx + 46} cy={cy + 6} rx={30} ry={18} fill={palette.fill} stroke={palette.stroke} strokeWidth="2" />
      <rect x={cx - 58} y={cy + 2} width={118} height={30} rx={15} fill={palette.fill} stroke={palette.stroke} strokeWidth="2" />
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="14" fontWeight="700" fill={palette.text}>{label}</text>
    </g>
  );
}

function zoneBand(x: number, y: number, width: number, height: number, title: string, subtitle: string, tone: "blue" | "purple" | "green" | "orange" = "blue") {
  const palette = tone === "purple"
    ? { fill: "#faf7ff", stroke: "#d9c7ff", title: "#5d30a6", subtitle: "#6f6690" }
    : tone === "green"
      ? { fill: "#f4fff9", stroke: "#b9efcf", title: "#207447", subtitle: "#5f7a6a" }
      : tone === "orange"
        ? { fill: "#fff8ef", stroke: "#ffd29b", title: "#9a4f00", subtitle: "#7e6d58" }
        : { fill: "#f7fbff", stroke: "#d7e6ff", title: "#1f4eaa", subtitle: "#5f7390" };

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={20} fill={palette.fill} stroke={palette.stroke} strokeWidth="2" strokeDasharray="8 6" />
      <text x={x + 18} y={y + 24} fontSize="14" fontWeight="700" fill={palette.title}>{title}</text>
      <text x={x + 18} y={y + 42} fontSize="11" fill={palette.subtitle}>{subtitle}</text>
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

function lineLink(x1: number, y1: number, x2: number, y2: number, dashed = false, label?: string) {
  const labelX = (x1 + x2) / 2;
  const labelY = (y1 + y2) / 2 - 6;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#a8bfe8" strokeWidth="2.5" strokeDasharray={dashed ? "8 6" : undefined} />
      {label ? <text x={labelX} y={labelY} textAnchor="middle" fontSize="11" fill="#5f7390">{label}</text> : null}
    </g>
  );
}

function firewallNode(x: number, y: number, label: string, sublabel?: string) {
  return (
    <g>
      <path d={`M ${x + 18} ${y} L ${x + 112} ${y} L ${x + 130} ${y + 18} L ${x + 130} ${y + 62} L ${x} ${y + 62} L ${x} ${y + 18} Z`} fill="#eaf3ff" stroke="#7fa9f7" strokeWidth="2" />
      <rect x={x + 18} y={y + 12} width="94" height="8" rx="4" fill="#7fa9f7" opacity="0.28" />
      <rect x={x + 18} y={y + 26} width="94" height="8" rx="4" fill="#7fa9f7" opacity="0.2" />
      <rect x={x + 18} y={y + 40} width="94" height="8" rx="4" fill="#7fa9f7" opacity="0.14" />
      <text x={x + 65} y={y + 80} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1f4eaa">{label}</text>
      {sublabel ? <text x={x + 65} y={y + 95} textAnchor="middle" fontSize="10.5" fill="#60769a">{sublabel}</text> : null}
    </g>
  );
}

function routerNode(x: number, y: number, label: string, sublabel?: string, tone: "core" | "site" = "site") {
  const palette = tone === "core"
    ? { fill: "#2357d8", stroke: "#2357d8", text: "#ffffff", soft: "#dfe9ff" }
    : { fill: "#ffffff", stroke: "#9cb9ef", text: "#123566", soft: "#9cb9ef" };

  return (
    <g>
      <circle cx={x + 44} cy={y + 34} r="34" fill={palette.fill} stroke={palette.stroke} strokeWidth="2.5" />
      <path d={`M ${x + 24} ${y + 30} L ${x + 44} ${y + 18} L ${x + 44} ${y + 28} L ${x + 62} ${y + 18} L ${x + 46} ${y + 34} L ${x + 62} ${y + 50} L ${x + 44} ${y + 40} L ${x + 44} ${y + 50} L ${x + 24} ${y + 38} L ${x + 42} ${y + 34} Z`} fill={palette.text === "#ffffff" ? "#dfe9ff" : palette.soft} opacity="0.95" />
      <text x={x + 44} y={y + 83} textAnchor="middle" fontSize="12" fontWeight="700" fill="#17345e">{label}</text>
      {sublabel ? <text x={x + 44} y={y + 98} textAnchor="middle" fontSize="10.5" fill="#60769a">{sublabel}</text> : null}
    </g>
  );
}

function switchNode(x: number, y: number, label: string, sublabel?: string) {
  return (
    <g>
      <rect x={x} y={y} width="122" height="46" rx="12" fill="#ffffff" stroke="#9cb9ef" strokeWidth="2" />
      {Array.from({ length: 8 }).map((_, index) => (
        <rect key={index} x={x + 12 + index * 12.5} y={y + 14} width="7" height="6" rx="2" fill="#7fa9f7" opacity={0.9 - index * 0.05} />
      ))}
      {Array.from({ length: 8 }).map((_, index) => (
        <rect key={`lower-${index}`} x={x + 12 + index * 12.5} y={y + 25} width="7" height="6" rx="2" fill="#7fa9f7" opacity={0.6 - index * 0.03} />
      ))}
      <text x={x + 61} y={y + 64} textAnchor="middle" fontSize="12" fontWeight="700" fill="#17345e">{label}</text>
      {sublabel ? <text x={x + 61} y={y + 79} textAnchor="middle" fontSize="10.5" fill="#60769a">{sublabel}</text> : null}
    </g>
  );
}

function accessPointNode(x: number, y: number, label: string, sublabel?: string) {
  return (
    <g>
      <circle cx={x + 26} cy={y + 26} r="18" fill="#ffffff" stroke="#8ddab0" strokeWidth="2" />
      <circle cx={x + 26} cy={y + 26} r="4" fill="#1f7d4b" />
      <path d={`M ${x + 11} ${y + 14} Q ${x + 26} ${y + 2} ${x + 41} ${y + 14}`} fill="none" stroke="#8ddab0" strokeWidth="2" />
      <path d={`M ${x + 15} ${y + 19} Q ${x + 26} ${y + 11} ${x + 37} ${y + 19}`} fill="none" stroke="#8ddab0" strokeWidth="2" />
      <text x={x + 26} y={y + 58} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1d5d3e">{label}</text>
      {sublabel ? <text x={x + 26} y={y + 73} textAnchor="middle" fontSize="10.5" fill="#60796a">{sublabel}</text> : null}
    </g>
  );
}

function serverNode(x: number, y: number, label: string, sublabel?: string) {
  return (
    <g>
      <rect x={x} y={y} width="84" height="56" rx="12" fill="#ffffff" stroke="#c7a7ff" strokeWidth="2" />
      <rect x={x + 12} y={y + 10} width="60" height="10" rx="5" fill="#c7a7ff" opacity="0.35" />
      <rect x={x + 12} y={y + 25} width="60" height="10" rx="5" fill="#c7a7ff" opacity="0.23" />
      <rect x={x + 12} y={y + 40} width="60" height="6" rx="3" fill="#c7a7ff" opacity="0.17" />
      <text x={x + 42} y={y + 75} textAnchor="middle" fontSize="12" fontWeight="700" fill="#53308f">{label}</text>
      {sublabel ? <text x={x + 42} y={y + 90} textAnchor="middle" fontSize="10.5" fill="#6f6690">{sublabel}</text> : null}
    </g>
  );
}

function chip(x: number, y: number, width: number, text: string, category: VlanCategory) {
  const style = categoryColor(category);
  return (
    <g>
      <rect x={x} y={y} width={width} height="22" rx="11" fill={style.fill} stroke={style.stroke} />
      <text x={x + 10} y={y + 15} fontSize="10.5" fill={style.text}>{text}</text>
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

function ArchitectureSignals({ project }: { project: ProjectDetail }) {
  const requirements = parseRequirementsProfile(project.requirementsJson);
  const signalItems = [
    requirements.environmentType,
    requirements.internetModel,
    requirements.securityPosture,
    requirements.gatewayConvention,
    requirements.trustBoundaryModel,
  ];

  return (
    <div className="diagram-note-grid">
      {signalItems.map((item) => (
        <div key={item} className="diagram-note-card">
          {item}
        </div>
      ))}
    </div>
  );
}

function LogicalDiagram({ project, svgId, comments = [], onSelectTarget }: { project: ProjectDetail; svgId: string; comments?: ProjectComment[]; onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void; }) {
  const requirements = parseRequirementsProfile(project.requirementsJson);
  const sites = (project.sites ?? []) as SiteWithVlans[];
  const cloudActive = requirements.environmentType !== "On-prem" || requirements.cloudConnected;
  const managementActive = requirements.management;
  const wirelessActive = requirements.wireless || requirements.guestWifi;
  const voiceActive = requirements.voice || Number(requirements.phoneCount || "0") > 0;
  const dualIsp = requirements.dualIsp;

  const siteWidth = 320;
  const siteGap = 38;
  const width = Math.max(1500, 120 + sites.length * siteWidth + Math.max(0, sites.length - 1) * siteGap + (cloudActive ? 240 : 0));
  const height = 980;
  const totalSiteSpan = sites.length * siteWidth + Math.max(0, sites.length - 1) * siteGap;
  const startX = width / 2 - totalSiteSpan / 2;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Logical network design diagram">
        <rect x={0} y={0} width={width} height={height} rx={28} fill="#fbfdff" />

        {zoneBand(52, 36, width - 104, 188, "Perimeter and shared services", "WAN ingress, firewall enforcement, core routing, and shared service anchors", "blue")}
        {zoneBand(52, 252, width - 104, 120, "Control and trust boundaries", "These overlays help show guest, management, cloud, and operations intent before implementation", "green")}
        {zoneBand(52, 394, width - 104, height - 444, "Site and segment domains", "Each site groups WAN edge, switching, wireless, and segment containers inside its local addressing boundary", "purple")}

        {cloudGlyph(width / 2 - (dualIsp ? 110 : 0), 88, dualIsp ? "ISP A / Internet" : "Internet / WAN")}
        {dualIsp ? cloudGlyph(width / 2 + 110, 88, "ISP B / Internet") : null}
        {dualIsp ? lineLink(width / 2 - 110, 122, width / 2 - 56, 170) : lineLink(width / 2, 122, width / 2, 170)}
        {dualIsp ? lineLink(width / 2 + 110, 122, width / 2 + 56, 170) : null}

        {firewallNode(width / 2 - 66, 150, dualIsp ? "Perimeter HA" : "Perimeter Firewall", dualIsp ? "Dual ISP / failover edge" : "Internet edge policy")}
        {lineLink(width / 2, 246, width / 2, 314, false, requirements.internetModel)}
        {routerNode(width / 2 - 44, 286, "Core WAN", "Summaries / transit / routing", "core")}

        {managementActive ? lineLink(160, 316, width - 160, 316, true, "Management plane / monitoring") : null}
        {wirelessActive ? lineLink(160, 338, width - 160, 338, true, requirements.guestWifi ? "Staff + guest wireless overlays" : "Wireless access planning") : null}
        {voiceActive ? lineLink(160, 360, width - 160, 360, true, "Voice / QoS treatment") : null}

        {cloudActive ? (
          <g>
            {zoneBand(width - 330, 70, 250, 132, "Cloud service boundary", `${requirements.cloudProvider} • ${requirements.cloudConnectivity}`, "purple")}
            {cloudGlyph(width - 205, 118, requirements.cloudProvider || "Cloud", "cloud")}
            {lineLink(width / 2 + 44, 320, width - 250, 170, false, requirements.cloudRoutingModel)}
          </g>
        ) : null}

        {sites.map((site, index) => {
          const x = startX + index * (siteWidth + siteGap);
          const y = 448;
          const role = siteRole(site, index);
          const siteTaskCount = openTaskCount(comments, "SITE", site.id);
          const vlans = site.vlans ?? [];
          const displayedVlans = vlans.slice(0, 6);
          const extraCount = Math.max(0, vlans.length - displayedVlans.length);
          const siteHeight = 372 + Math.max(0, displayedVlans.length - 4) * 26;
          const centerX = x + siteWidth / 2;
          const apLabel = requirements.guestWifi ? "Staff / Guest SSIDs" : "Staff wireless";

          return (
            <g key={site.id}>
              {lineLink(width / 2, 356, centerX, y, false, index === 0 ? "Primary path" : undefined)}
              <rect x={x} y={y} width={siteWidth} height={siteHeight} rx={26} fill="#ffffff" stroke="#dbe6f7" strokeWidth="2.5" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 20} y={y + 30} fontSize="18" fontWeight="700" fill="#16263d">{site.name}</text>
              <text x={x + 20} y={y + 50} fontSize="11" fill="#6a7d97">{role} • {site.location || "Location not set"}</text>
              <text x={x + 20} y={y + 68} fontSize="11" fill="#6a7d97">Parent site block: {site.defaultAddressBlock || "not assigned"}</text>
              {taskBadge(x + siteWidth - 28, y + 26, siteTaskCount)}

              {routerNode(x + 22, y + 90, "WAN Edge", role === "HQ" ? "Branch / core attachment" : "VPN / transit handoff")}
              {switchNode(x + 100, y + 94, "L3 / Distribution", "SVIs / trunks / local routing")}
              {wirelessActive ? accessPointNode(x + 236, y + 100, "Wireless", apLabel) : serverNode(x + 232, y + 92, "Services", requirements.serverPlacement)}

              <line x1={x + 80} y1={y + 126} x2={x + 100} y2={y + 116} stroke="#a8bfe8" strokeWidth="2" />
              <line x1={x + 222} y1={y + 116} x2={x + 236} y2={y + 126} stroke="#a8bfe8" strokeWidth="2" />

              <text x={x + 20} y={y + 214} fontSize="12" fontWeight="700" fill="#324866">Segment containers</text>
              {displayedVlans.map((vlan, vlanIndex) => {
                const chipY = y + 228 + vlanIndex * 28;
                const vlanTaskCount = openTaskCount(comments, "VLAN", vlan.id);
                return (
                  <g key={vlan.id} style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("VLAN", vlan.id)}>
                    {chip(x + 18, chipY, siteWidth - 36, `VLAN ${vlan.vlanId} • ${vlan.vlanName} • ${vlan.subnetCidr}`, vlanCategory(vlan))}
                    {taskBadge(x + siteWidth - 26, chipY + 11, vlanTaskCount)}
                  </g>
                );
              })}
              {extraCount > 0 ? <text x={x + 20} y={y + 228 + displayedVlans.length * 28 + 16} fontSize="10.5" fill="#6a7d97">+ {extraCount} more segment{extraCount === 1 ? "" : "s"}</text> : null}

              <text x={x + 20} y={y + siteHeight - 42} fontSize="11" fill="#5f7390">Gateway policy: {requirements.gatewayConvention}</text>
              <text x={x + 20} y={y + siteHeight - 24} fontSize="11" fill="#5f7390">Trust boundary: {requirements.trustBoundaryModel}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PhysicalDiagram({ project, svgId, comments = [], onSelectTarget }: { project: ProjectDetail; svgId: string; comments?: ProjectComment[]; onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void; }) {
  const requirements = parseRequirementsProfile(project.requirementsJson);
  const sites = (project.sites ?? []) as SiteWithVlans[];
  const primaryIndex = sites.findIndex((site, index) => siteRole(site, index) === "HQ" || index === 0);
  const primarySite = sites[primaryIndex >= 0 ? primaryIndex : 0];
  const branches = sites.filter((site) => site.id !== primarySite?.id);
  const cloudActive = requirements.environmentType !== "On-prem" || requirements.cloudConnected;
  const wirelessActive = requirements.wireless || requirements.guestWifi;
  const width = Math.max(1520, 1080 + branches.length * 130 + (cloudActive ? 150 : 0));
  const height = 980;
  const centerX = width / 2;
  const hqTaskCount = primarySite ? openTaskCount(comments, "SITE", primarySite.id) : 0;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Physical style network topology diagram">
        <rect x={0} y={0} width={width} height={height} rx={28} fill="#fbfdff" />

        {zoneBand(54, 42, width - 108, 214, "Top-level topology", "Perimeter ingress, WAN edge, HQ core, branch attachment, and optional cloud connectivity", "blue")}
        {zoneBand(54, 288, width - 108, height - 338, "Site attachment and local edge", "Branches attach into the WAN/core domain and then break out to access switching, wireless, and local services", "purple")}

        {cloudGlyph(centerX, 94, requirements.dualIsp ? "Dual ISP edge" : "Internet / WAN")}
        {lineLink(centerX, 128, centerX, 192)}
        {firewallNode(centerX - 66, 176, "HQ Firewall", requirements.dualIsp ? "HA / NAT / VPN" : "Perimeter policy")}
        {lineLink(centerX, 272, centerX, 334, false, requirements.internetModel)}

        <rect x={centerX - 260} y={336} width={520} height={312} rx={28} fill="#ffffff" stroke="#dbe6f7" strokeWidth="2.5" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => primarySite && onSelectTarget?.("SITE", primarySite.id)} />
        <text x={centerX - 230} y={370} fontSize="19" fontWeight="700" fill="#16263d">{primarySite?.name || project.name}</text>
        <text x={centerX - 230} y={392} fontSize="11" fill="#6a7d97">Primary site / HQ topology</text>
        <text x={centerX - 230} y={410} fontSize="11" fill="#6a7d97">{primarySite?.defaultAddressBlock || "No HQ site block assigned"}</text>
        {taskBadge(centerX + 226, 364, hqTaskCount)}

        {routerNode(centerX - 204, 440, "Core Routing", "WAN / summaries / north-south", "core")}
        {switchNode(centerX - 78, 450, "Core Switch Stack", "Inter-VLAN / distribution")}
        {serverNode(centerX + 102, 438, "Server Zone", requirements.serverPlacement)}
        {wirelessActive ? accessPointNode(centerX + 6, 538, "Wireless", requirements.guestWifi ? "Staff + guest SSIDs" : "Staff wireless") : null}
        {switchNode(centerX - 168, 548, "Access Layer", "Closets / trunks / PoE")}
        {requirements.management ? serverNode(centerX + 118, 544, "Mgmt / NMS", requirements.monitoringModel) : null}

        <line x1={centerX - 160} y1={474} x2={centerX - 78} y2={474} stroke="#a8bfe8" strokeWidth="2" />
        <line x1={centerX + 44} y1={474} x2={centerX + 102} y2={474} stroke="#a8bfe8" strokeWidth="2" />
        <line x1={centerX - 108} y1={572} x2={centerX - 18} y2={572} stroke="#a8bfe8" strokeWidth="2" />
        {requirements.management ? <line x1={centerX + 44} y1={572} x2={centerX + 118} y2={572} stroke="#a8bfe8" strokeWidth="2" /> : null}

        {cloudActive ? (
          <g>
            {zoneBand(width - 324, 86, 244, 138, "Cloud attachment", `${requirements.cloudProvider} • ${requirements.cloudConnectivity}`, "purple")}
            {cloudGlyph(width - 204, 134, requirements.cloudProvider || "Cloud", "cloud")}
            {lineLink(centerX + 44, 366, width - 250, 170, false, requirements.cloudRoutingModel)}
          </g>
        ) : null}

        {branches.map((site, index) => {
          const leftSide = index % 2 === 0;
          const row = Math.floor(index / 2);
          const x = leftSide ? 80 : width - 400;
          const y = 392 + row * 224;
          const boxWidth = 320;
          const anchorX = leftSide ? x + boxWidth : x;
          const anchorY = y + 80;
          const siteTaskCount = openTaskCount(comments, "SITE", site.id);
          const categories = Array.from(new Set((site.vlans ?? []).map((vlan) => categoryColor(vlanCategory(vlan)).label))).slice(0, 3);

          return (
            <g key={site.id}>
              {lineLink(centerX, 456, anchorX, anchorY, false, row === 0 ? "Branch attachment" : undefined)}
              <rect x={x} y={y} width={boxWidth} height="168" rx="24" fill="#ffffff" stroke="#dbe6f7" strokeWidth="2.5" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 20} y={y + 30} fontSize="17" fontWeight="700" fill="#16263d">{site.name}</text>
              <text x={x + 20} y={y + 50} fontSize="11" fill="#6a7d97">{site.location || "Location not set"}</text>
              <text x={x + 20} y={y + 68} fontSize="11" fill="#6a7d97">{site.defaultAddressBlock || "No site block assigned"}</text>
              {taskBadge(x + boxWidth - 28, y + 24, siteTaskCount)}

              {routerNode(x + 18, y + 86, "Router", "VPN / transit")}
              {switchNode(x + 98, y + 94, "Access", "L2 / trunks / users")}
              {wirelessActive ? accessPointNode(x + 248, y + 96, "AP", requirements.guestWifi ? "Guest aware" : "Staff") : serverNode(x + 228, y + 90, "Local svc", "Optional")}

              <text x={x + 18} y={y + 150} fontSize="11" fill="#5f7390">Segment mix: {categories.join(", ") || "No segments yet"}</text>
            </g>
          );
        })}

        <text x={centerX} y={height - 34} textAnchor="middle" fontSize="13" fill="#5f7390">Physical / topology view • perimeter, HQ core, cloud boundary, branch attachment, and local site edge components</text>
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
          <p className="muted" style={{ margin: 0 }}>v71 moves the diagram closer to a real network planning surface with clearer device shapes, trust boundaries, WAN/core layers, and cloud placement cues.</p>
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
      <ArchitectureSignals project={project} />
      <Legend />
      {mode === "logical"
        ? <LogicalDiagram project={project} svgId={svgId} comments={comments} onSelectTarget={onSelectTarget} />
        : <PhysicalDiagram project={project} svgId={svgId} comments={comments} onSelectTarget={onSelectTarget} />}
    </div>
  );
}
