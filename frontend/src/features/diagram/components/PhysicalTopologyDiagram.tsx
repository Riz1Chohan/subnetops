import { type SynthesizedLogicalDesign } from "../../../lib/designSynthesis";
import { parseRequirementsProfile } from "../../../lib/requirementsProfile";
import type { ProjectComment, ProjectDetail, ValidationResult } from "../../../lib/types";
import type { ActiveOverlayMode, DeviceFocus, DiagramLabelMode, DiagramScope, LabelFocus, LinkAnnotationMode, LinkFocus, OverlayMode, SiteWithVlans } from "..";
import {
  type ChipTone,
  type SitePoint,
  DiagramCanvasBackdrop,
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
import { physicalBranchAnchors, physicalCanvasFrame, physicalHubDevicePositions, physicalLayoutConfig } from "./diagramLayoutGrammar";
import { branchFabricLinkAnchors, branchTransportRailGeometry, primaryHubLinkAnchors } from "./diagramConnectorAnchors";
import { physicalBranchSiteContainer, physicalPrimarySiteContainer } from "./diagramSiteContainers";

export function PhysicalTopologyDiagram({
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
  const requirements = parseRequirementsProfile(project.requirementsJson);
  const primarySite = sites.find((site) => site.name === synthesized.topology.primarySiteName) || sites[0];
  const branchSites = sites.filter((site) => site.id !== primarySite?.id);
  const cloudNeeded = synthesized.topology.cloudConnected || synthesized.servicePlacements.some((service) => service.placementType === "cloud");
  const branchRows = Math.max(1, Math.ceil(Math.max(branchSites.length, 1) / 2));
  const layoutConfig = physicalLayoutConfig(bareCanvas);
  const { branchCardWidth, siteCardHeight, siteRowGap, siteRowStartY, transportSpineY, sectionRailX, layoutShiftY } = layoutConfig;
  const enabledOverlays = normalizeActiveOverlays(overlay, activeOverlays);
  const hasOverlay = (mode: ActiveOverlayMode) => enabledOverlays.includes(mode);
  const showOverlayNotes = false;
  const showAddressing = hasOverlay("addressing");
  const showSecurity = scope === "boundaries" || hasOverlay("security");
  const showServices = hasOverlay("services") || scope === "boundaries";
  const showRedundancy = false;
  const showFlows = hasOverlay("flows") && !bareCanvas;
  const flowOverlays = showFlows ? flowsForDiagramScope(synthesized.trafficFlows, scope, sites[0]?.name).slice(0, 4) : [];
  const flowOverlayCount = hasOverlay("flows") ? flowOverlays.length : 0;
  const {
    width,
    height,
    centerX,
    primaryCardX,
    primaryCardY,
    primaryCardWidth,
    primaryCardHeight,
    primarySiteBottom,
    branchSectionBottom,
    flowLaneStartY,
    flowLaneHeight,
    fabricSectionBottom,
  } = physicalCanvasFrame({
    bareCanvas,
    branchSiteCount: branchSites.length,
    cloudNeeded,
    flowOverlayCount,
    branchRows,
  });
  const showDetailedLabels = labelMode === "detailed";
  const showDeviceLabels = showDetailedLabels;
  const showDeviceSublabels = showDetailedLabels && !bareCanvas;
  const quietCanvas = bareCanvas && linkAnnotationMode !== "full";
  const renderPath = (points: Array<[number, number]>, type: "internet" | "routed" | "trunk" | "vpn" | "ha" | "flow", label?: string, secondaryLabel?: string) => pathLine(points, type, quietCanvas ? undefined : label, quietCanvas ? undefined : secondaryLabel, linkAnnotationMode, linkFocusMatchesType(linkFocus, type), labelFocus);
  const primarySiteTaskCount = primarySite ? openTaskCount(comments, "SITE", primarySite.id) : 0;
  const primarySiteValidation = primarySite ? siteValidationItems(primarySite, validations) : [];
  const primarySiteValidationTone = validationSeverityTone(primarySiteValidation);
  const emphasizeDevice = (kind: DeviceKind) => deviceFocusMatchesKind(deviceFocus, kind);
  const legendTone = enabledOverlays[0] ? overlayTone(enabledOverlays[0]) : "green";
  const totalVlanCount = sites.reduce((sum, site) => sum + (site.vlans?.length ?? 0), 0);
  const branchAnchorBlueprint = physicalBranchAnchors({ branchSites, width, bareCanvas });
  const legendDockY = height - 168;
  const siteIndexItems = (primarySite ? [primarySite, ...branchSites] : branchSites).slice(0, 4);
  const siteVlanCount = (site?: SiteWithVlans) => site?.vlans?.length ?? 0;
  const siteServiceCount = (siteName?: string) => synthesized.servicePlacements.filter((service) => !siteName || service.siteName === siteName).length;
  const siteWanLink = (siteId?: string) => synthesized.wanLinks.find((link) => link.endpointASiteId === siteId || link.endpointBSiteId === siteId);
  const siteWanLabel = (siteId?: string) => siteWanLink(siteId)?.linkName || (synthesized.topology.topologyType === "hub-spoke" ? "WAN / hub-spoke" : "Inter-site path");
  const transportCapsuleSites = primarySite ? [primarySite, ...branchSites] : branchSites;
  const branchRouteType = bareCanvas && scope !== "wan-cloud" ? "routed" : (synthesized.topology.topologyType === "hub-spoke" ? "vpn" : "routed");
  const leftBranchAnchors = branchAnchorBlueprint.filter((entry) => entry.left);
  const rightBranchAnchors = branchAnchorBlueprint.filter((entry) => !entry.left);
  const branchMidY = primaryCardY + (bareCanvas ? 176 : 166);
  const leftSpineX = primaryCardX - (bareCanvas ? 58 : 48);
  const rightSpineX = primaryCardX + primaryCardWidth + (bareCanvas ? 58 : 48);
  const branchTransportRails = branchTransportRailGeometry({
    leftBranchEntries: leftBranchAnchors,
    rightBranchEntries: rightBranchAnchors,
    primaryCardX,
    primaryCardWidth,
    branchMidY,
    leftSpineX,
    rightSpineX,
  });
  const transportCapsuleWidth = 172;
  const transportCapsuleGap = 12;
  const transportCapsuleCount = Math.max(1, Math.min(transportCapsuleSites.length, 6));
  const transportCapsuleVisibleSites = transportCapsuleSites.slice(0, transportCapsuleCount);
  const transportCapsuleTotalWidth = transportCapsuleVisibleSites.length * transportCapsuleWidth + Math.max(0, transportCapsuleVisibleSites.length - 1) * transportCapsuleGap;
  const transportCapsuleStartX = centerX - transportCapsuleTotalWidth / 2;
  const { primaryRouterPos, primarySwitchPos, primaryServerPos, primaryAccessPos, primaryWirelessPos } = physicalHubDevicePositions({
    bareCanvas,
    centerX,
    primaryCardX,
    primaryCardY,
  });
  const primaryContainer = physicalPrimarySiteContainer({ bareCanvas, centerX, primaryCardX, primaryCardY, primaryCardWidth });
  const primaryHubLinks = primaryHubLinkAnchors({
    primaryRouterX: primaryRouterPos.x,
    primaryRouterY: primaryRouterPos.y,
    primarySwitchX: primarySwitchPos.x,
    primarySwitchY: primarySwitchPos.y,
    primaryServicesX: primaryServerPos.x,
    primaryServicesY: primaryServerPos.y,
    primaryAccessX: primaryAccessPos.x,
    primaryAccessY: primaryAccessPos.y,
    primaryWirelessX: primaryWirelessPos.x,
    primaryWirelessY: primaryWirelessPos.y,
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <svg id={svgId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Physical style topology diagram with network-style device symbols, overlay modes, and reviewable connection semantics">
        <DiagramCanvasBackdrop
          width={width}
          height={height}
          title="Physical network blueprint"
          subtitle="The live canvas is the main diagram surface, with device-aware symbols, connection semantics, and boundary placement visible without flooding the view."
          summary="Connection semantics: routed = blue, trunk = purple, VPN/WAN = green dashed, internet = blue dashed, management/control = slate, critical flow = orange."
          chipLabel={overlaySummaryLabel(enabledOverlays)}
          chipTone={legendTone}
          minimal={bareCanvas}
        />
        <g transform={layoutShiftY ? `translate(0 ${layoutShiftY})` : undefined}>
        {!bareCanvas ? (enabledOverlays.length ? enabledOverlays : ["none"]).flatMap((mode) => diagramLegend(mode as OverlayMode).details).slice(0, 3).map((detail, index) => <text key={`${detail}-${index}`} x={width - 300} y={100 + index * 18} fontSize="11" fill="#607791">• {detail}</text>) : null}
        {!bareCanvas ? <rect x={48} y={148} width={width - 96} height={170} rx={46} fill="rgba(238,245,255,0.76)" stroke="#c6d9f5" strokeDasharray="10 8" /> : null}
        {!bareCanvas ? <text x={78} y={178} fontSize="12.5" fontWeight="700" fill="#284b78">North-south edge / WAN transport domain</text> : null}
        {!bareCanvas ? <text x={78} y={198} fontSize="11" fill="#607791">Internet, firewall, DMZ, hybrid edge, and upstream transport stay grouped here so the physical view immediately reads as a real network diagram.</text> : null}
        {!bareCanvas ? <rect x={48} y={336} width={width - 96} height={Math.max(388, fabricSectionBottom - 336)} rx={40} fill="rgba(255,255,255,0.48)" stroke="#d5e1f2" strokeDasharray="10 8" /> : null}
        {!bareCanvas ? <text x={78} y={366} fontSize="12.5" fontWeight="700" fill="#284b78">Primary and branch site fabrics</text> : null}
        {!bareCanvas ? <text x={78} y={386} fontSize="11" fill="#607791">Site containers expose edge, switching, service, wireless, and boundary elements in a more diagram-like blueprint layout rather than isolated cards.</text> : null}
        {!bareCanvas ? chip(78, 410, 118, `Sites ${sites.length}`, "blue") : null}
        {!bareCanvas ? chip(208, 410, 122, `VLANs ${totalVlanCount}`, "green") : null}
        {!bareCanvas ? chip(342, 410, 166, `Topology ${synthesized.topology.topologyLabel}`, "purple") : null}
        {!bareCanvas ? chip(520, 410, 128, `Services ${synthesized.servicePlacements.length}`, "orange") : null}

        {!bareCanvas ? <rect x={centerX - 196} y={98} width={392} height={92} rx={26} fill="rgba(245,249,255,0.78)" stroke="#cad9f2" strokeDasharray="8 6" /> : null}
        {!bareCanvas ? <text x={centerX} y={122} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#284b78">Internet / northbound exchange</text> : null}
        {!bareCanvas ? <text x={centerX} y={140} textAnchor="middle" fontSize="10.5" fill="#607791">Public edge, provider handoff, and upstream routing entry stay centered before the perimeter stack.</text> : null}
        {!bareCanvas ? <rect x={centerX - 188} y={214} width={376} height={88} rx={24} fill="rgba(249,252,255,0.74)" stroke="#d3e0f4" strokeDasharray="8 6" /> : null}
        {!bareCanvas ? <text x={centerX} y={238} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#284b78">Perimeter control stack</text> : null}
        {!bareCanvas ? <text x={centerX} y={256} textAnchor="middle" fontSize="10.5" fill="#607791">Firewall, DMZ publication, and routed handoff into the internal fabric.</text> : null}

        {!bareCanvas ? <rect x={centerX - 316} y={332} width={632} height={384} rx={34} fill="rgba(242,247,255,0.58)" stroke="#cad9f2" strokeDasharray="8 6" /> : null}
        {!bareCanvas ? <text x={centerX} y={356} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#284b78">Primary hub backbone zone</text> : null}
        {!bareCanvas ? <text x={centerX} y={374} textAnchor="middle" fontSize="10.5" fill="#607791">Core routing, campus switching, shared services, and user access stay visually grouped in one central engineering zone.</text> : null}
        {!bareCanvas && branchSites.length ? Array.from({ length: branchRows }).map((_, rowIndex) => {
          const rowY = siteRowStartY + rowIndex * siteRowGap;
          return (
            <g key={`branch-corridor-${rowIndex}`}>
              <rect x={58} y={rowY - 34} width={width - 116} height={388} rx={30} fill="rgba(248,251,255,0.48)" stroke="#d9e4f4" strokeDasharray="8 7" />
              <text x={centerX} y={rowY - 14} textAnchor="middle" fontSize="10.8" fontWeight="700" fill="#4a6587">Branch corridor {rowIndex + 1} • attached access + local services + WAN uplink</text>
            </g>
          );
        }) : null}

        {!bareCanvas ? <g opacity="0.9">
          <rect x={sectionRailX} y={160} width="8" height={Math.max(520, fabricSectionBottom - 130)} rx="4" fill="#d9e7fb" />
          <rect x={sectionRailX - 12} y={168} width="118" height="24" rx="12" fill="#eef5ff" stroke="#bfd2f3" />
          <text x={sectionRailX + 47} y={184} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#284b78">TRANSPORT</text>
          <rect x={sectionRailX - 12} y={352} width="118" height="24" rx="12" fill="#f4f8ff" stroke="#ccd8ed" />
          <text x={sectionRailX + 47} y={368} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#284b78">SITE FABRIC</text>
          {flowOverlays.length ? <><rect x={sectionRailX - 12} y={flowLaneStartY - 28} width="118" height="24" rx="12" fill="#fff4e8" stroke="#ffc98e" /><text x={sectionRailX + 47} y={flowLaneStartY - 12} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#9a3412">FLOW LANE</text></> : null}
        </g> : null}

        <g>
          <path d={`M ${Math.max(120, centerX - 430)} ${transportSpineY} L ${Math.min(width - 120, centerX + 430)} ${transportSpineY}`} stroke="#8fb0eb" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
          <path d={`M ${Math.max(120, centerX - 430)} ${transportSpineY} L ${Math.min(width - 120, centerX + 430)} ${transportSpineY}`} stroke="#ffffff" strokeWidth="1.4" strokeDasharray="8 10" opacity="0.9" />
          {!bareCanvas ? <text x={centerX} y={transportSpineY - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#365d93">WAN / transport spine</text> : null}
          {branchAnchorBlueprint.map((entry) => (
            <g key={`${entry.site.id}-spine-node`}>
              <line x1={entry.anchorX} y1={transportSpineY} x2={entry.anchorX} y2={entry.anchorY - 18} stroke="#d0ddf2" strokeWidth="2.4" strokeDasharray="7 7" opacity={bareCanvas ? 0.45 : 1} />
              {!bareCanvas ? <circle cx={entry.anchorX} cy={transportSpineY} r="8" fill="#ffffff" stroke="#7ea3e1" strokeWidth="3" /> : null}
              {!bareCanvas ? <text x={entry.anchorX} y={transportSpineY - 16} textAnchor="middle" fontSize="10" fill="#5e7691">{entry.site.name}</text> : null}
            </g>
          ))}
          {!bareCanvas ? transportCapsuleVisibleSites.map((site, index) => {
            const x = transportCapsuleStartX + index * (transportCapsuleWidth + transportCapsuleGap);
            const isPrimaryTransportSite = site.id === primarySite?.id;
            return (
              <g key={`${site.id}-transport-capsule`}>
                <rect x={x} y={transportSpineY + 18} width={transportCapsuleWidth} height="42" rx="18" fill={isPrimaryTransportSite ? "rgba(236, 251, 242, 0.98)" : "rgba(255,255,255,0.94)"} stroke={isPrimaryTransportSite ? "#a7d8b6" : "#d6e3f5"} filter="url(#diagram-soft-shadow)" />
                <text x={x + transportCapsuleWidth / 2} y={transportSpineY + 34} textAnchor="middle" fontSize="10.2" fontWeight="700" fill={isPrimaryTransportSite ? "#17603b" : "#365d93"}>{site.name} • {siteWanLabel(site.id)}</text>
                <text x={x + transportCapsuleWidth / 2} y={transportSpineY + 48} textAnchor="middle" fontSize="9.8" fill="#607791">{isPrimaryTransportSite ? "Primary hub" : "Attached site"} • VLANs {siteVlanCount(site)} • Services {siteServiceCount(site.name)}</text>
              </g>
            );
          }) : null}
        </g>

        {!bareCanvas ? Array.from({ length: branchRows }).map((_, rowIndex) => {
          const rowY = siteRowStartY + rowIndex * siteRowGap;
          return (
            <g key={`branch-row-${rowIndex}`}>
              <rect x={116} y={rowY - 26} width={154} height="20" rx="10" fill="#eef5ff" stroke="#bfd2f3" />
              <text x={193} y={rowY - 12} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#284b78">Branch fabric row {rowIndex + 1}</text>
            </g>
          );
        }) : null}

        <DeviceIcon x={centerX - 65} y={104} kind="internet" label={showDeviceLabels ? "Internet / WAN" : ""} sublabel={synthesized.topology.internetBreakout} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("internet")} />
        {renderPath([[centerX, 170], [centerX, 222]], "internet", synthesized.topology.topologyType === "hub-spoke" ? "Internet + branch WAN" : "North-south edge")}
        <DeviceIcon x={centerX - 60} y={226} kind="firewall" label={showDeviceLabels ? "Perimeter Firewall" : ""} sublabel={synthesized.topology.redundancyModel} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("firewall")} />
        {(showServices || showSecurity) && primaryDmzService(synthesized, primarySite?.name) ? <g><rect x={centerX + 126} y={246} width="120" height="28" rx="14" fill="#eef6ff" stroke="#9ab9ef" /><text x={centerX + 186} y={264} textAnchor="middle" fontSize="11" fill="#24446f">DMZ subnet</text><DeviceIcon x={centerX + 270} y={232} kind="server" label={showDeviceLabels ? "DMZ Host" : ""} sublabel={primaryDmzService(synthesized, primarySite?.name)?.subnetCidr || "Published service"} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("server")} /></g> : null}
        {(showServices || showSecurity) && primaryDmzService(synthesized, primarySite?.name) ? <><g>{renderPath([[centerX + 58, 262], [centerX + 126, 262]], "internet", "dmz", primaryDmzService(synthesized, primarySite?.name)?.ingressInterface || undefined)}</g><g>{renderPath([[centerX + 246, 262], [centerX + 270, 262]], "trunk", "dmz host", primaryDmzService(synthesized, primarySite?.name)?.subnetCidr || undefined)}</g></> : null}
        {renderPath([[centerX, 278], [centerX, 340]], "routed", "inside / routed core", synthesized.routingPlan.find((item) => item.siteId === primarySite?.id)?.summaryAdvertisement || undefined)}

        {!bareCanvas ? <rect x={centerX - 186} y={320} width="372" height="20" rx="10" fill="#eef4ff" stroke="#bfd2f3" /> : null}
        {!bareCanvas ? <text x={centerX} y={334} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#284b78">PRIMARY HUB • POLICY EXCHANGE • SHARED SERVICES BACKBONE</text> : null}

        <rect x={primaryCardX} y={primaryCardY} width={primaryCardWidth} height={primaryCardHeight} rx={28} fill={primarySiteValidationTone.fill} stroke={primarySiteValidationTone.stroke} strokeWidth="2.5" filter="url(#diagram-soft-shadow)" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => primarySite && onSelectTarget?.("SITE", primarySite.id)} />
        <text x={primaryContainer.titleX} y={primaryContainer.titleY} fontSize="19" fontWeight="700" fill="#16263d" opacity={labelFocusOpacity(labelFocus, "topology")}>{primarySite?.name || project.name}</text>
        {!bareCanvas ? <text x={primaryContainer.subtitleX} y={primaryContainer.subtitleY} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "topology")}>Primary site / policy hub</text> : null}
        {showAddressing ? <text x={primaryContainer.addressX} y={primaryContainer.addressY} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "addressing")}>{primarySite?.defaultAddressBlock || "No site summary block assigned"}</text> : null}
        {!bareCanvas ? taskBadge(primaryContainer.taskBadgeX, primaryContainer.taskBadgeY, primarySiteTaskCount) : null}
        {!bareCanvas && primarySiteValidation.length > 0 ? chip(primaryContainer.validationChipX, primaryContainer.validationChipY, 148, `Validation ${primarySiteValidation.length}`, primarySiteValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null}

        {!bareCanvas ? <rect x={primaryContainer.clusterRects.routing.x} y={primaryContainer.clusterRects.routing.y} width={primaryContainer.clusterRects.routing.width} height={primaryContainer.clusterRects.routing.height} rx={22} fill="rgba(241,247,255,0.96)" stroke="#c7d8f7" strokeDasharray="7 5" /> : null}
        {!bareCanvas ? <text x={primaryContainer.clusterRects.routing.titleX} y={primaryContainer.clusterRects.routing.titleY} fontSize="10.5" fontWeight="700" fill="#284b78">Core routing cluster</text> : null}
        {!bareCanvas ? <text x={primaryContainer.clusterRects.routing.textX} y={primaryContainer.clusterRects.routing.textY} fontSize="10" fill="#607791">Summaries, north-south control, inter-site path selection.</text> : null}
        {!bareCanvas ? <rect x={primaryContainer.clusterRects.switching.x} y={primaryContainer.clusterRects.switching.y} width={primaryContainer.clusterRects.switching.width} height={primaryContainer.clusterRects.switching.height} rx={22} fill="rgba(245,249,255,0.96)" stroke="#d1def4" strokeDasharray="7 5" /> : null}
        {!bareCanvas ? <text x={primaryContainer.clusterRects.switching.titleX} y={primaryContainer.clusterRects.switching.titleY} fontSize="10.5" fontWeight="700" fill="#284b78">Core switching cluster</text> : null}
        {!bareCanvas ? <text x={primaryContainer.clusterRects.switching.textX} y={primaryContainer.clusterRects.switching.textY} fontSize="10" fill="#607791">SVIs, trunks, campus switching, local segmentation.</text> : null}
        {!bareCanvas ? <rect x={primaryContainer.clusterRects.services.x} y={primaryContainer.clusterRects.services.y} width={primaryContainer.clusterRects.services.width} height={primaryContainer.clusterRects.services.height} rx={22} fill="rgba(247,250,255,0.98)" stroke="#c9d7ee" strokeDasharray="7 5" /> : null}
        {!bareCanvas ? <text x={primaryContainer.clusterRects.services.titleX} y={primaryContainer.clusterRects.services.titleY} fontSize="10.5" fontWeight="700" fill="#284b78">Shared services cluster</text> : null}
        {!bareCanvas ? <text x={primaryContainer.clusterRects.services.textX} y={primaryContainer.clusterRects.services.textY} fontSize="10" fill="#607791">Server roles, management anchors, shared applications.</text> : null}
        {!bareCanvas ? <rect x={primaryContainer.clusterRects.access.x} y={primaryContainer.clusterRects.access.y} width={primaryContainer.clusterRects.access.width} height={primaryContainer.clusterRects.access.height} rx={24} fill="rgba(249,252,255,0.96)" stroke="#d7e5f8" strokeDasharray="7 5" /> : null}
        {!bareCanvas ? <text x={primaryContainer.clusterRects.access.titleX} y={primaryContainer.clusterRects.access.titleY} fontSize="10.5" fontWeight="700" fill="#284b78">User access and wireless fabric</text> : null}
        {!bareCanvas ? <text x={primaryContainer.clusterRects.access.textX} y={primaryContainer.clusterRects.access.textY} fontSize="10" fill="#607791">Access switching, edge closets, PoE, and staff / guest wireless coverage.</text> : null}

        <DeviceIcon x={primaryRouterPos.x} y={primaryRouterPos.y} kind="router" label={showDeviceLabels ? "Core Routing" : ""} sublabel="Summaries / north-south" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("router")} />
        <DeviceIcon x={primarySwitchPos.x} y={primarySwitchPos.y} kind="core-switch" label={showDeviceLabels ? "Core Switch" : ""} sublabel="Inter-VLAN / trunks" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("core-switch")} />
        <DeviceIcon x={primaryServerPos.x} y={primaryServerPos.y} kind="server" label={showDeviceLabels ? "Shared Services" : ""} sublabel="Server / management" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("server")} />
        <DeviceIcon x={primaryAccessPos.x} y={primaryAccessPos.y} kind="access-switch" label={showDeviceLabels ? "Access Layer" : ""} sublabel="Users / closets / PoE" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("access-switch")} />
        <DeviceIcon x={primaryWirelessPos.x} y={primaryWirelessPos.y} kind="access-point" label={showDeviceLabels ? "Wireless" : ""} sublabel="Staff / guest" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("access-point")} />

        {renderPath([primaryHubLinks.routerToSwitch.from, primaryHubLinks.routerToSwitch.to], "routed", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "router")) || "SVI / routed handoff", synthesized.routingPlan.find((item) => item.siteId === primarySite?.id)?.loopbackCidr || undefined)}
        {renderPath([primaryHubLinks.switchToServices.from, primaryHubLinks.switchToServices.to], "trunk", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "server")) || "Server / service trunk", synthesized.servicePlacements.find((item) => item.siteName === primarySite?.name)?.subnetCidr || undefined)}
        {renderPath([primaryHubLinks.accessToWireless.from, primaryHubLinks.accessToWireless.to], "trunk", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "access-point")) || "Edge access / AP uplink", (requirements.wireless || requirements.guestWifi) ? "Staff + guest SSIDs" : undefined)}

        {showOverlayNotes ? overlayRowsForSite(primarySite || sites[0], synthesized, enabledOverlays, 5).map((row, index) => labelFocusMatchesCategory(labelFocus, row.category) ? chip(centerX - 238, 630 + index * 28, 476, row.text, row.tone) : null) : null}

        {cloudNeeded ? (
          <g>
            <rect x={width - 348} y={148} width="268" height="146" rx="28" fill="rgba(244,239,255,0.74)" stroke="#cdb7ff" strokeDasharray="9 7" />
            <text x={width - 324} y={174} fontSize="11.5" fontWeight="700" fill="#5a34a3">Hybrid / cloud edge domain</text>
            <text x={width - 324} y={192} fontSize="10.5" fill="#6e5a97">Cloud attachment, edge termination, and policy exchange stay visually grouped here.</text>
            <DeviceIcon x={width - 250} y={132} kind="cloud" label={showDeviceLabels ? "Cloud" : ""} sublabel={synthesized.topology.cloudConnected ? "Connected" : "Optional"} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("cloud")} />
            <DeviceIcon x={width - 256} y={224} kind="cloud-edge" label={showDeviceLabels ? "Cloud Edge" : ""} sublabel="VNet / VPN / route filters" showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("cloud-edge")} />
            {renderPath([[centerX + 58, 262], [width - 220, 262]], "vpn", "Hybrid / cloud transport", requirements.cloudConnectivity || undefined)}
          </g>
        ) : null}

        {branchSites.length ? (
          <g>
            {branchTransportRails.leftHubToRail ? renderPath(orthogonalHV(branchTransportRails.leftHubToRail.from, branchTransportRails.leftHubToRail.to, branchTransportRails.leftHubToRail.elbowX), branchRouteType, undefined, undefined) : null}
            {branchTransportRails.rightHubToRail ? renderPath(orthogonalHV(branchTransportRails.rightHubToRail.from, branchTransportRails.rightHubToRail.to, branchTransportRails.rightHubToRail.elbowX), branchRouteType, undefined, undefined) : null}
            {branchTransportRails.leftRailSpan ? renderPath([branchTransportRails.leftRailSpan.from, branchTransportRails.leftRailSpan.to], branchRouteType, undefined, undefined) : null}
            {branchTransportRails.rightRailSpan ? renderPath([branchTransportRails.rightRailSpan.from, branchTransportRails.rightRailSpan.to], branchRouteType, undefined, undefined) : null}
            {branchAnchorBlueprint.map((entry) => {
              const wanLink = synthesized.wanLinks.find((link) => link.endpointASiteId === entry.site.id || link.endpointBSiteId === entry.site.id);
              const trunkX = entry.left ? leftSpineX : rightSpineX;
              return (
                <g key={`branch-route-${entry.site.id}`}>
                  {renderPath(
                    [[trunkX, entry.anchorY], [entry.anchorX, entry.anchorY]],
                    branchRouteType,
                    wanLink?.linkName || (synthesized.topology.topologyType === "hub-spoke" ? "WAN / hub-spoke" : "Inter-site path"),
                    wanLink?.subnetCidr || undefined,
                  )}
                </g>
              );
            })}
          </g>
        ) : null}

        {branchSites.map((site, index) => {
          const left = index % 2 === 0;
          const row = Math.floor(index / 2);
          const x = left ? 76 : width - 76 - branchCardWidth;
          const y = siteRowStartY + row * siteRowGap;
          const boxWidth = branchCardWidth;
          const branchContainer = physicalBranchSiteContainer({ x, y, boxWidth, siteCardHeight, bareCanvas });
          const anchorX = left ? x + boxWidth : x;
          const anchorY = branchContainer.anchorY;
          const branchLinks = branchFabricLinkAnchors({ x, y, bareCanvas });
          const siteTaskCount = openTaskCount(comments, "SITE", site.id);
          const siteValidation = siteValidationItems(site, validations);
          const siteValidationTone = validationSeverityTone(siteValidation);
          const edgePlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "firewall" || placement.deviceType === "router"));
          const switchPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "core-switch" || placement.deviceType === "access-switch" || placement.deviceType === "distribution-switch"));
          const serverPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && placement.deviceType === "server");
          const wirelessPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "access-point" || placement.deviceType === "wireless-controller"));
          const edgeDevice = edgePlacement?.deviceType || "router";
          const localOverlay = overlayRowsForSite(site, synthesized, enabledOverlays, 2);
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
              <rect x={x} y={y} width={boxWidth} height={siteCardHeight} rx={24} fill={siteValidationTone.fill} stroke={siteValidationTone.stroke} strokeWidth="2.3" style={{ cursor: onSelectTarget ? "pointer" : "default" }} onClick={() => onSelectTarget?.("SITE", site.id)} />
              <text x={x + 20} y={y + 30} fontSize="17" fontWeight="700" fill="#16263d" opacity={labelFocusOpacity(labelFocus, "topology")}>{site.name}</text>
              {showAddressing ? <text x={x + 20} y={y + 49} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "addressing")}>{site.defaultAddressBlock || "No site block assigned"}</text> : null}
              {!bareCanvas ? <text x={x + 20} y={y + 64} fontSize="10.5" fill="#526984" opacity={labelFocusOpacity(labelFocus, "topology")}>{siteRoleSummary(site.name, synthesized)}</text> : null}
              {!bareCanvas ? <text x={x + 20} y={y + 78} fontSize="10.2" fill="#5b708d" opacity={labelFocusOpacity(labelFocus, "topology")}>VLANs {siteVlanCount(site)} • Services {siteServiceCount(site.name)} • WAN {siteWanLabel(site.id)}</text> : null}
              {!bareCanvas ? <circle cx={x + boxWidth - 48} cy={y + 54} r="13" fill="#eef5ff" stroke="#bfd2f3" /> : null}
              {!bareCanvas ? <text x={x + boxWidth - 48} y={y + 58} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#284b78">{index + 1}</text> : null}
              {!bareCanvas ? chip(x + 18, y + 18, 106, left ? `Row ${row + 1} left` : `Row ${row + 1} right`, "blue") : null}
              {!bareCanvas ? chip(x + 182, y + 46, 110, site.name === synthesized.topology.primarySiteName ? "Primary hub" : "Attached site", siteTierTone(site.name, synthesized)) : null}
              {!bareCanvas ? taskBadge(x + boxWidth - 28, y + 24, siteTaskCount) : null}
              {!bareCanvas && siteValidation.length > 0 ? chip(x + 150, y + 18, 132, `Validation ${siteValidation.length}`, siteValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null}

              {!bareCanvas ? <rect x={x + 8} y={y + 86} width={112} height={92} rx={16} fill="#f8fbff" stroke="#c7d8f7" strokeDasharray="6 4" /> : null}
              {!bareCanvas ? <text x={x + 20} y={y + 100} fontSize="10.5" fill="#526984">Perimeter / edge zone group</text> : null}
              {!bareCanvas ? <rect x={x + 118} y={y + 90} width={122} height={88} rx={16} fill="#f9fcff" stroke="#d6e4fb" strokeDasharray="6 4" /> : null}
              {!bareCanvas ? <text x={x + 130} y={y + 104} fontSize="10.5" fill="#526984">Core / access zone group</text> : null}
                            {!bareCanvas && site.name === synthesized.topology.primarySiteName ? <rect x={x + 8} y={y + 58} width={boxWidth - 16} height="12" rx="6" fill="#eef4ff" stroke="#bfd2f3" /> : null}
              {!bareCanvas && site.name === synthesized.topology.primarySiteName ? <text x={x + boxWidth / 2} y={y + 67} textAnchor="middle" fontSize="10" fontWeight="700" fill="#284b78" opacity={labelFocusOpacity(labelFocus, "topology")}>PRIMARY / SHARED-SERVICE / POLICY HUB</text> : null}

              <DeviceIcon x={branchContainer.edge.x} y={branchContainer.edge.y} kind={edgeDevice} label={showDeviceLabels ? (edgePlacement?.deviceName || deviceLabel(edgeDevice)) : ""} sublabel={`${edgePlacement?.role || "Site edge / VPN"}${edgePlacement?.uplinkTarget ? ` • uplink ${edgePlacement.uplinkTarget}` : ""}`} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice(edgeDevice)} />
              <DeviceIcon x={branchContainer.switching.x} y={branchContainer.switching.y} kind={switchPlacement?.deviceType || "access-switch"} label={showDeviceLabels ? (switchPlacement?.deviceName || deviceLabel(switchPlacement?.deviceType || "access-switch")) : ""} sublabel={`${switchPlacement?.role || "Users / trunks"}${switchPlacement?.uplinkTarget ? ` • uplink ${switchPlacement.uplinkTarget}` : ""}`} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice(switchPlacement?.deviceType || "access-switch")} />
              {wirelessPlacement ? <DeviceIcon x={branchContainer.wireless.x} y={branchContainer.wireless.y} kind={wirelessPlacement.deviceType} label={showDeviceLabels ? wirelessPlacement.deviceName : ""} sublabel={`${wirelessPlacement.role}${wirelessPlacement.uplinkTarget ? ` • uplink ${wirelessPlacement.uplinkTarget}` : ""}`} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice(wirelessPlacement.deviceType)} /> : null}
              {(!bareCanvas || showServices) && serverPlacement ? <DeviceIcon x={branchContainer.services.x} y={branchContainer.services.y} kind="server" label={showDeviceLabels ? serverPlacement.deviceName : ""} sublabel={serverPlacement.connectedSubnets[0] || serverPlacement.role} showSublabel={showDeviceSublabels} emphasized={emphasizeDevice("server")} /> : null}
              {renderPath([branchLinks.edgeToSwitch.from, branchLinks.edgeToSwitch.to], "routed", firstInterfaceLabel(edgePlacement) || "Inside", synthesized.addressingPlan.find((row) => row.siteId === site.id)?.gatewayIp || undefined)}
              {wirelessPlacement ? renderPath(orthogonalVH(branchLinks.switchToWireless.from, branchLinks.switchToWireless.to, branchLinks.switchToWireless.elbowY), "trunk", firstInterfaceLabel(wirelessPlacement) || "Wireless / access", localOverlay[0]?.text || undefined) : null}

              {showAddressing || showRedundancy ? edgeStack.map((item, itemIndex) => chip(x + 18, branchContainer.chips.edgeY + itemIndex * 24, boxWidth - 36, item, "green")) : null}
              {showAddressing || showRedundancy ? switchStack.map((item, itemIndex) => chip(x + 18, branchContainer.chips.switchY + itemIndex * 24, boxWidth - 36, item, "blue")) : null}
              {showSecurity ? zoneLabels.slice(0, 1).map((item, itemIndex) => chip(x + 18, branchContainer.chips.securityY + itemIndex * 24, boxWidth - 36, item, "purple")) : null}
              {showOverlayNotes ? localOverlay.slice(0, 2).map((item, itemIndex) => labelFocusMatchesCategory(labelFocus, item.category) ? chip(x + 18, branchContainer.chips.overlayY + itemIndex * 24, boxWidth - 36, item.text, item.tone) : null) : null}
              {showSecurity && dmzBoundary ? <text x={x + 18} y={branchContainer.notes.dmzY} fontSize="10.2" fill="#5a34a3" opacity={labelFocusOpacity(labelFocus, "zones")}>DMZ boundary: {dmzBoundary.attachedDevice}{dmzBoundary.attachedInterface ? ` • ${dmzBoundary.attachedInterface}` : ''}</text> : null}
              {showSecurity && managementBoundary ? <text x={x + 18} y={branchContainer.notes.managementY} fontSize="10.2" fill="#24446f" opacity={labelFocusOpacity(labelFocus, "zones")}>Management boundary: {managementBoundary.controlPoint}</text> : null}

              {!bareCanvas ? edgeInterfaceValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-edge-if-validation-${itemIndex}`} x={x + 18} y={branchContainer.notes.edgeInterfaceY + itemIndex * 14} fontSize="10.2" fill="#9a3412">Edge interface: {item.title}</text>) : null}
              {!bareCanvas ? switchInterfaceValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-switch-if-validation-${itemIndex}`} x={x + 18} y={branchContainer.notes.switchInterfaceY + itemIndex * 14} fontSize="10.2" fill="#9a3412">Switch interface: {item.title}</text>) : null}
              {!bareCanvas ? pathValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-path-validation-${itemIndex}`} x={x + 18} y={branchContainer.notes.pathY + itemIndex * 14} fontSize="10.2" fill="#9a3412">Path/link: {item.title}</text>) : null}
              {!bareCanvas ? edgeValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-edge-validation-${itemIndex}`} x={x + 18} y={branchContainer.notes.edgeValidationY + itemIndex * 14} fontSize="10.2" fill="#9a3412">Edge role: {item.title}</text>) : null}
              {!bareCanvas ? switchValidation.slice(0, 1).map((item, itemIndex) => <text key={`${site.id}-switch-validation-${itemIndex}`} x={x + 18} y={branchContainer.notes.switchValidationY + itemIndex * 14} fontSize="10.2" fill="#9a3412">Switching role: {item.title}</text>) : null}

              {showSecurity ? zoneRects.slice(0, 2).map((zone, zoneIndex) => <text key={`${site.id}-zone-rect-${zoneIndex}`} x={x + 214} y={branchContainer.notes.zoneStartY + zoneIndex * 14} fontSize="10.2" fill="#5a34a3">{zone.label}: {zone.anchor}</text>) : null}
              {(showServices || showSecurity) && dmzService ? <g>{renderPath([branchLinks.publishedServicePath.from, branchLinks.publishedServicePath.to], 'internet', 'Published-service path', dmzService.ingressInterface || dmzService.subnetCidr || undefined)}<rect x={x + 234} y={y + 28} width="68" height="18" rx="9" fill="#eef6ff" stroke="#9ab9ef" /><text x={x + 268} y={y + 40} textAnchor="middle" fontSize="10" fill="#24446f">DMZ subnet</text>{renderPath([branchLinks.dmzSubnetDrop.from, branchLinks.dmzSubnetDrop.to], 'trunk', 'Published host', dmzService.subnetCidr || undefined)}{showSecurity && managementBoundary ? renderPath([branchLinks.managementToDmz.from, branchLinks.managementToDmz.to], 'ha', 'Management-only path', managementBoundary.attachedInterface || managementBoundary.zoneName) : null}</g> : null}
            </g>
          );
        })}

        {labelFocusMatchesCategory(labelFocus, "flows") && flowOverlays.length && !bareCanvas ? (
          <g>
            <rect x={48} y={flowLaneStartY - 42} width={width - 96} height={flowLaneHeight + 40} rx={32} fill="rgba(255, 247, 237, 0.82)" stroke="#fdba74" strokeDasharray="10 8" />
            <text x={78} y={flowLaneStartY - 14} fontSize="12.5" fontWeight="700" fill="#9a3412">Critical flow review lane</text>
            <text x={78} y={flowLaneStartY + 4} fontSize="11" fill="#9a3412">When flow labels are enabled, traffic paths move below the site fabric so larger enterprise layouts can keep growing downward without overlap.</text>
          </g>
        ) : null}

        {labelFocusMatchesCategory(labelFocus, "flows") ? flowOverlays.map((flow, index) => {
          const baseY = flowLaneStartY + index * 84;
          return (
            <g key={flow.id}>
              {renderPath([[86, baseY], [width - 86, baseY]], "flow", `${flow.flowLabel} • ${flow.sourceZone} → ${flow.destinationZone}`)}
              {!bareCanvas ? <text x={92} y={baseY + 22} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "flows")}>Path: {flow.path.join(" → ")}</text> : null}
              {!bareCanvas ? <text x={92} y={baseY + 40} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "flows")}>Control points: {flow.controlPoints.join(", ")}</text> : null}
              {!bareCanvas ? <text x={92} y={baseY + 58} fontSize="11" fill="#6a7d97" opacity={labelFocusOpacity(labelFocus, "flows")}>NAT / policy: {flow.natBehavior} • {flow.enforcementPolicy}</text> : null}
            </g>
          );
        }) : null}


        {!bareCanvas ? (
          <>
            <g>
              <rect x={48} y={legendDockY} width="316" height="122" rx="20" fill="rgba(255,255,255,0.92)" stroke="#d5e1f2" filter="url(#diagram-soft-shadow)" />
              <text x={72} y={legendDockY + 24} fontSize="12.5" fontWeight="700" fill="#284b78">Site index</text>
              <text x={72} y={legendDockY + 42} fontSize="10.8" fill="#607791">Primary plus the first attached sites visible on this canvas.</text>
              {siteIndexItems.map((site, index) => (
                <g key={`${site.id}-site-index`}>
                  <circle cx={74} cy={legendDockY + 64 + index * 14} r="3.6" fill={index === 0 ? "#1d7f4c" : "#4d6fa8"} />
                  <text x={84} y={legendDockY + 68 + index * 14} fontSize="10.6" fill="#34506f">{site.name}</text>
                  <text x={186} y={legendDockY + 68 + index * 14} fontSize="10.2" fill="#607791">{site.defaultAddressBlock || "No summary block"}</text>
                </g>
              ))}
            </g>
            <g>
              <rect x={width - 322} y={legendDockY} width="274" height="122" rx="20" fill="rgba(255,255,255,0.9)" stroke="#d5e1f2" filter="url(#diagram-soft-shadow)" />
              <text x={width - 298} y={legendDockY + 24} fontSize="12.5" fontWeight="700" fill="#284b78">Physical legend</text>
              <text x={width - 298} y={legendDockY + 42} fontSize="10.8" fill="#607791">Read top-down: transport → primary hub → branches → flows.</text>
              <line x1={width - 292} y1={legendDockY + 66} x2={width - 228} y2={legendDockY + 66} stroke="#85a7e6" strokeWidth="3" />
              <text x={width - 220} y={legendDockY + 70} fontSize="10.5" fill="#4d6280">Routed / inside</text>
              <line x1={width - 292} y1={legendDockY + 88} x2={width - 228} y2={legendDockY + 88} stroke="#1d7f4c" strokeWidth="3" strokeDasharray="10 5" />
              <text x={width - 220} y={legendDockY + 92} fontSize="10.5" fill="#4d6280">VPN / WAN overlay</text>
              <line x1={width - 292} y1={legendDockY + 110} x2={width - 228} y2={legendDockY + 110} stroke="#ff7a59" strokeWidth="3" />
              <text x={width - 220} y={legendDockY + 114} fontSize="10.5" fill="#4d6280">Critical flow</text>
            </g>
          </>
        ) : null}
        </g>
      </svg>
    </div>
  );
}
