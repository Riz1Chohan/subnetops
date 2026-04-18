import { type SynthesizedLogicalDesign } from "../../../lib/designSynthesis";
import type { ProjectComment, ProjectDetail, ValidationResult } from "../../../lib/types";
import type { ActiveOverlayMode, DeviceFocus, DiagramLabelMode, DiagramScope, LabelFocus, LinkAnnotationMode, LinkFocus, OverlayMode, SiteWithVlans } from "..";
import {
  type ChipTone,
  type DeviceKind,
  type SitePoint,
  DiagramCanvasBackdrop,
  DeviceIcon,
  chip,
  compactInterfaceStack,
  boundaryLabelsForSite,
  deviceFocusMatchesKind,
  deviceFocusTitle,
  deviceLabel,
  deviceValidationItems,
  diagramLegend,
  diagramScopeMeta,
  dmzBoundaryForSite,
  firstInterfaceLabel,
  flowsForDiagramScope,
  interfaceSummary,
  interfaceValidationItems,
  labelFocusMatchesCategory,
  labelFocusOpacity,
  labelFocusTitle,
  linkFocusMatchesType,
  linkFocusTitle,
  logicalNode,
  managementBoundaryForSite,
  normalizeActiveOverlays,
  openTaskCount,
  orthogonalHV,
  orthogonalVH,
  overlayItems,
  overlayRowsForSite,
  overlaySummaryLabel,
  overlayTone,
  pathLine,
  placementRowsForSite,
  primaryDmzService,
  relevantSiteSubnets,
  roleTone,
  siteAnchorSummary,
  siteBreakoutSummary,
  sitePositionMap,
  siteRoleSummary,
  siteRoutingSummary,
  siteTierLabel,
  siteTierTone,
  siteTransportSummary,
  siteValidationItems,
  sitesForDiagramScope,
  taskBadge,
  topologyScopeBehaviorSummary,
  truncateDiagramText,
  validationSeverityTone,
  zoneBoundaryRectsForSite,
  overlayLabelCategory,
} from "./diagramRendererShared";
import { buildLogicalSiteLayout, logicalCanvasFrame, logicalGlobalAnchors } from "./diagramLayoutGrammar";
import { logicalSiteContainer } from "./diagramSiteContainers";

export function LogicalTopologyDiagram({
  project,
  synthesized,
  svgId,
  comments,
  validations,
  overlay,
  activeOverlays,
  scope,
  focusedSiteId,
  labelMode,
  linkAnnotationMode,
  labelFocus,
  deviceFocus,
  linkFocus,
  onSelectTarget,
  bareCanvas = false,
}: {
  project: ProjectDetail;
  synthesized: SynthesizedLogicalDesign;
  svgId: string;
  comments: ProjectComment[];
  validations: ValidationResult[];
  overlay: OverlayMode;
  activeOverlays?: ActiveOverlayMode[];
  scope: DiagramScope;
  focusedSiteId?: string;
  labelMode: DiagramLabelMode;
  linkAnnotationMode: LinkAnnotationMode;
  labelFocus: LabelFocus;
  deviceFocus: DeviceFocus;
  linkFocus: LinkFocus;
  onSelectTarget?: (targetType: "SITE" | "VLAN", targetId: string) => void;
  compact?: boolean;
  bareCanvas?: boolean;
}) {
  const sites = sitesForDiagramScope((project.sites ?? []) as SiteWithVlans[], synthesized, scope, focusedSiteId);
  const primarySite = sites.find((site) => site.name === synthesized.topology.primarySiteName) || sites[0];
  const primarySiteId = synthesized.topology.primarySiteId || primarySite?.id;
  const { positions: sitePositions, config: layoutConfig } = buildLogicalSiteLayout({
    sites,
    synthesized,
    primarySiteId,
    scope,
    bareCanvas,
  });
  const { width, height } = logicalCanvasFrame(sitePositions, bareCanvas);
  const { cardWidth, cardHeight, startX, gap } = layoutConfig;
  const emphasizeDevice = (kind: DeviceKind) => deviceFocusMatchesKind(deviceFocus, kind);
  const showDetailedLabels = labelMode === "detailed";
  const enabledOverlays = normalizeActiveOverlays(overlay, activeOverlays);
  const hasOverlay = (mode: ActiveOverlayMode) => enabledOverlays.includes(mode);
  const showOverlayNotes = false;
  const showAddressing = hasOverlay("addressing");
  const showSecurity = scope === "boundaries" || hasOverlay("security");
  const showServices = hasOverlay("services") || scope === "boundaries";
  const showRedundancy = false;
  const quietCanvas = bareCanvas && linkAnnotationMode !== "full";
  const renderPath = (points: Array<[number, number]>, type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow", label?: string, secondaryLabel?: string) => pathLine(points, type, quietCanvas ? undefined : label, quietCanvas ? undefined : secondaryLabel, linkAnnotationMode, linkFocusMatchesType(linkFocus, type), labelFocus);
  const primarySitePoint = primarySite ? sitePositions[primarySite.id] : undefined;
  const cloudNeeded = synthesized.topology.cloudConnected || synthesized.servicePlacements.some((service) => service.placementType === "cloud");
  const { globalInternetX, globalInternetY, cloudX, cloudY, layoutShiftY } = logicalGlobalAnchors({ width, primarySitePoint, bareCanvas });

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Logical topology diagram with explicit device placement, addressing, and overlay modes">
        <DiagramCanvasBackdrop
          width={width}
          height={height}
          title={diagramScopeMeta(scope, synthesized, sites[0]).title}
          subtitle={diagramScopeMeta(scope, synthesized, sites[0]).detail}
          summary={`Topology: ${synthesized.topology.topologyLabel} • Breakout: ${synthesized.topology.internetBreakout} • Redundancy: ${synthesized.topology.redundancyModel}`}
          chipLabel={overlaySummaryLabel(enabledOverlays)}
          chipTone={enabledOverlays[0] ? overlayTone(enabledOverlays[0]) : "green"}
          minimal={bareCanvas}
        />
        <g transform={layoutShiftY ? `translate(0 ${layoutShiftY})` : undefined}>
        {!bareCanvas ? chip(width - 286, 82, 210, "Logical posture review", "green") : null}
        {!bareCanvas ? <rect x={36} y={136} width={width - 72} height={110} rx={34} fill="rgba(238,245,255,0.8)" stroke="#c9d9f1" strokeDasharray="10 7" /> : null}
        {!bareCanvas ? <text x={60} y={164} fontSize="12.5" fontWeight="700" fill="#284b78">North-south edge / WAN / cloud zone</text> : null}
        {!bareCanvas ? <text x={60} y={184} fontSize="11" fill="#607791">Internet, perimeter controls, hybrid edge, and inter-site transport anchors stay grouped here so the logical view reads more like an actual architecture map.</text> : null}
        {!bareCanvas ? <rect x={36} y={266} width={width - 72} height={height - 322} rx={34} fill="rgba(255,255,255,0.5)" stroke="#d7e2f1" strokeDasharray="10 8" /> : null}
        {!bareCanvas ? <text x={60} y={294} fontSize="12.5" fontWeight="700" fill="#284b78">Site fabric domains</text> : null}
        {!bareCanvas ? <text x={60} y={314} fontSize="11" fill="#607791">Each site card shows edge, switching, service, wireless, and boundary clues so the topology reads like a real multi-site estate instead of a generic card grid.</text> : null}

        {primarySitePoint ? (
          <g>
            <DeviceIcon x={globalInternetX} y={globalInternetY} kind="internet" label={showDetailedLabels ? "Internet / WAN edge" : ""} sublabel={synthesized.topology.internetBreakout} showSublabel={showDetailedLabels && !bareCanvas} emphasized={emphasizeDevice("internet")} />
            {renderPath([[globalInternetX + 61, globalInternetY + 66], [globalInternetX + 61, 244], [primarySitePoint.x + cardWidth / 2, 244], [primarySitePoint.x + cardWidth / 2, primarySitePoint.y]], "internet", "North-south edge", synthesized.topology.internetBreakout)}
            {cloudNeeded ? <DeviceIcon x={cloudX} y={cloudY} kind="cloud" label={showDetailedLabels ? (synthesized.topology.cloudProvider || "Cloud edge") : ""} sublabel={showDetailedLabels ? "Hosted services / provider boundary" : undefined} showSublabel={showDetailedLabels && !bareCanvas} emphasized={emphasizeDevice("cloud")} /> : null}
            {cloudNeeded ? renderPath([[cloudX + 56, cloudY + 56], [cloudX + 56, 230], [primarySitePoint.x + cardWidth / 2, 230], [primarySitePoint.x + cardWidth / 2, primarySitePoint.y]], "vpn", "Cloud / hosted edge", synthesized.topology.servicePlacementModel) : null}
          </g>
        ) : null}

        {sites.map((site, index) => {
          const sitePoint = sitePositions[site.id] || { x: startX + index * (cardWidth + gap), y: 178 };
          const x = sitePoint.x;
          const y = sitePoint.y;
          const taskCount = openTaskCount(comments, "SITE", site.id);
          const siteValidation = siteValidationItems(site, validations);
          const validationTone = validationSeverityTone(siteValidation);
          const isPrimary = site.id === primarySiteId;
          const showAddressBlock = showAddressing && Boolean(site.defaultAddressBlock);
          const headerY = y + 32;
          const roleSummary = truncateDiagramText(siteRoleSummary(site.name, synthesized), bareCanvas ? 40 : 54);
          const breakoutSummary = truncateDiagramText(siteBreakoutSummary(site.name, synthesized), bareCanvas ? 38 : 54);
          const routingSummary = truncateDiagramText(siteRoutingSummary(site.id, site.name, synthesized), bareCanvas ? 38 : 54);
          const anchorSummary = truncateDiagramText(siteAnchorSummary(site.id, site.name, synthesized), bareCanvas ? 40 : 54);
          const transportSummary = truncateDiagramText(siteTransportSummary(site.id, site.name, synthesized), bareCanvas ? 36 : 54);
          const zoneSummary = truncateDiagramText(boundaryLabelsForSite(site.name, synthesized)[0] || relevantZoneNames(site.name, synthesized)[0] || "Trust boundary still inferred", bareCanvas ? 42 : 56);
          const subnetSummary = truncateDiagramText(relevantSiteSubnets(site.id, synthesized).slice(0, 2).join(" • ") || site.defaultAddressBlock || "Subnet hierarchy still inferred", bareCanvas ? 40 : 56);
          const container = logicalSiteContainer({ x, y, cardWidth, cardHeight });
          const perimeterLane = container.lanes[0];
          const fabricLane = container.lanes[1];
          const servicesLane = container.lanes[2];

          return (
            <g key={site.id}>
              <rect x={x} y={y} width={cardWidth} height={cardHeight} rx={24} fill={validationTone.fill} stroke={validationTone.stroke} strokeWidth="2.3" filter="url(#diagram-soft-shadow)" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={container.headerTitleX} y={container.headerTitleY} fontSize="18" fontWeight="700" fill="#142742" opacity={labelFocusOpacity(labelFocus, "topology")}>{site.name}</text>
              <text x={container.headerDetailX} y={container.headerDetailY} fontSize="11" fill="#697f98" opacity={labelFocusOpacity(labelFocus, "topology")}>{roleSummary}</text>
              {showAddressBlock ? <text x={container.headerAddressX} y={container.headerAddressY} fontSize="11" fill="#5f748f" opacity={labelFocusOpacity(labelFocus, "addressing")}>{site.defaultAddressBlock}</text> : null}
              {!bareCanvas ? chip(x + cardWidth - 126, y + 16, 106, isPrimary ? "Primary hub" : "Attached site", siteTierTone(site.name, synthesized)) : null}
              {!bareCanvas ? taskBadge(x + cardWidth - 24, y + 24, taskCount) : null}
              {!bareCanvas && siteValidation.length > 0 ? chip(x + cardWidth - 150, y + 46, 126, `${validationTone.label} ${siteValidation.length}`, siteValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null}

              <rect x={perimeterLane.x} y={perimeterLane.y} width={perimeterLane.width} height={perimeterLane.height} rx={14} fill={perimeterLane.fill} stroke={perimeterLane.stroke} />
              <text x={perimeterLane.titleX} y={perimeterLane.titleY} fontSize="10.5" fontWeight="700" fill={perimeterLane.titleColor}>{perimeterLane.title}</text>
              <text x={perimeterLane.textX} y={perimeterLane.textY} fontSize="10.5" fill={perimeterLane.textColor} opacity={labelFocusOpacity(labelFocus, "transport")}>{breakoutSummary}</text>

              <rect x={fabricLane.x} y={fabricLane.y} width={fabricLane.width} height={fabricLane.height} rx={14} fill={fabricLane.fill} stroke={fabricLane.stroke} />
              <text x={fabricLane.titleX} y={fabricLane.titleY} fontSize="10.5" fontWeight="700" fill={fabricLane.titleColor}>{fabricLane.title}</text>
              <text x={fabricLane.textX} y={fabricLane.textY} fontSize="10.5" fill={fabricLane.textColor} opacity={labelFocusOpacity(labelFocus, "topology")}>{routingSummary}</text>

              <rect x={servicesLane.x} y={servicesLane.y} width={servicesLane.width} height={servicesLane.height} rx={14} fill={servicesLane.fill} stroke={servicesLane.stroke} />
              <text x={servicesLane.titleX} y={servicesLane.titleY} fontSize="10.5" fontWeight="700" fill={servicesLane.titleColor}>{servicesLane.title}</text>
              <text x={servicesLane.textX} y={servicesLane.textY} fontSize="10.5" fill={servicesLane.textColor} opacity={labelFocusOpacity(labelFocus, showSecurity ? "zones" : "topology")}>{anchorSummary}</text>

              {showAddressing ? <text x={container.footerSummaryX} y={container.footerSummaryY} fontSize="10.4" fill="#607791" opacity={labelFocusOpacity(labelFocus, "addressing")}>Addressing: {subnetSummary}</text> : null}
              <text x={container.footerMetaX} y={container.footerMetaY} fontSize="10.4" fill="#607791" opacity={labelFocusOpacity(labelFocus, showSecurity ? "zones" : "transport")}>{showSecurity ? `Boundary: ${zoneSummary}` : `Transport: ${transportSummary}`}</text>
            </g>
          );
        })}

{sites.length > 1 ? (
          synthesized.topology.topologyType === "hub-spoke" && primarySiteId
            ? (() => {
                const primaryPoint = sitePositions[primarySiteId];
                const branchEntries = sites.filter((site) => site.id !== primarySiteId).map((site) => ({ site, point: sitePositions[site.id] }));
                const routeType = bareCanvas && scope !== "wan-cloud" ? "routed" : "vpn";
                const busY = (primaryPoint?.y ?? 0) + cardHeight + 52;
                const branchCenters = branchEntries.map((entry) => entry.point.x + cardWidth / 2).sort((a, b) => a - b);
                const busLeft = Math.min(...branchCenters, primaryPoint.x + cardWidth / 2);
                const busRight = Math.max(...branchCenters, primaryPoint.x + cardWidth / 2);
                return (
                  <g>
                    {renderPath([[primaryPoint.x + cardWidth / 2, primaryPoint.y + cardHeight], [primaryPoint.x + cardWidth / 2, busY]], routeType, undefined, undefined)}
                    {renderPath([[busLeft, busY], [busRight, busY]], routeType, undefined, undefined)}
                    {branchEntries.map((entry) => {
                      const columnX = entry.point.x + cardWidth / 2;
                      const entryY = entry.point.y;
                      const wanLink = synthesized.wanLinks.find((link) => link.endpointASiteId === entry.site.id || link.endpointBSiteId === entry.site.id);
                      return (
                        <g key={`logical-drop-${entry.site.id}`}>
                          {renderPath([[columnX, busY], [columnX, entryY - 16], [columnX, entryY]], routeType, "WAN / hub-spoke", wanLink?.subnetCidr || "Point-to-point transit")}
                        </g>
                      );
                    })}
                  </g>
                );
              })()
            : sites.slice(0, -1).map((site, index) => {
                const currentPoint = sitePositions[site.id];
                const nextSite = sites[index + 1];
                const nextPoint = sitePositions[nextSite.id];
                const label = synthesized.topology.topologyType === "collapsed-core" ? "Campus / local core" : "Inter-site routed path";
                return (
                  <g key={`inter-${site.id}`}>
                    {renderPath(
                      orthogonalHV([currentPoint.x + cardWidth, currentPoint.y + cardHeight / 2], [nextPoint.x, nextPoint.y + cardHeight / 2], currentPoint.x + cardWidth + 48),
                      synthesized.topology.topologyType === "collapsed-core" ? "trunk" : "routed",
                      label,
                      synthesized.wanLinks[index]?.subnetCidr || undefined,
                    )}
                  </g>
                );
              })
        ) : null}
        </g>
      </svg>
    </div>
  );
}

