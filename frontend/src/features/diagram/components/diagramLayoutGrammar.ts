import type { DiagramScope } from "../diagramTypes";
import type { SitePoint, SiteWithVlans } from "./diagramRendererShared";
import type { SynthesizedLogicalDesign } from "../../../lib/designSynthesis.types";
import { sitePositionMap } from "./diagramRendererShared";

export type DiagramCanvasMode = "logical" | "physical";

export function logicalCardSize(bareCanvas: boolean) {
  return {
    cardWidth: bareCanvas ? 280 : 304,
    cardHeight: bareCanvas ? 222 : 250,
    startX: 64,
    gap: 36,
    minWidth: 1600,
    minHeight: 1100,
    framePadding: 120,
    layoutShiftY: bareCanvas ? -112 : 0,
    topBandY: 146,
    cloudY: 154,
    siteFallbackY: 178,
  };
}

export function buildLogicalSiteLayout({
  sites,
  synthesized,
  primarySiteId,
  scope,
  bareCanvas,
}: {
  sites: SiteWithVlans[];
  synthesized: SynthesizedLogicalDesign;
  primarySiteId?: string;
  scope: DiagramScope;
  bareCanvas: boolean;
}) {
  const config = logicalCardSize(bareCanvas);
  const basePositions = sitePositionMap(sites, synthesized, config.cardWidth, config.startX, config.gap);
  if (!(synthesized.topology.topologyType === "hub-spoke" && primarySiteId && scope === "global" && sites.length > 1)) {
    return { positions: basePositions, config };
  }

  const primary = sites.find((site) => site.id === primarySiteId) || sites[0];
  if (!primary) return { positions: basePositions, config };

  const branches = sites.filter((site) => site.id !== primary.id);
  if (!branches.length) return { positions: basePositions, config };

  const positions: Record<string, SitePoint> = {};
  const centerX = 800;
  positions[primary.id] = { x: centerX - config.cardWidth / 2, y: 188 };

  if (branches.length <= 4) {
    const branchGap = 38;
    const branchY = 500;
    const totalWidth = branches.length * config.cardWidth + Math.max(0, branches.length - 1) * branchGap;
    const rowStartX = centerX - totalWidth / 2;
    branches.forEach((site, index) => {
      positions[site.id] = { x: rowStartX + index * (config.cardWidth + branchGap), y: branchY };
    });
    return { positions, config };
  }

  return { positions: basePositions, config };
}

export function logicalCanvasFrame(sitePositions: Record<string, SitePoint>, bareCanvas: boolean) {
  const config = logicalCardSize(bareCanvas);
  const occupiedXs = Object.values(sitePositions).map((point) => point.x);
  const occupiedYs = Object.values(sitePositions).map((point) => point.y);
  const width = Math.max(config.minWidth, Math.max(...occupiedXs, 0) + config.cardWidth + config.framePadding);
  const height = Math.max(config.minHeight, Math.max(...occupiedYs, 0) + config.cardHeight + config.framePadding);
  return { width, height, config };
}

export function logicalGlobalAnchors({
  width,
  primarySitePoint,
  bareCanvas,
}: {
  width: number;
  primarySitePoint?: SitePoint;
  bareCanvas: boolean;
}) {
  const config = logicalCardSize(bareCanvas);
  return {
    globalInternetX: primarySitePoint ? primarySitePoint.x + config.cardWidth / 2 - 61 : Math.max(80, width / 2 - 61),
    globalInternetY: config.topBandY,
    cloudX: width - 250,
    cloudY: config.cloudY,
    layoutShiftY: config.layoutShiftY,
  };
}

export function physicalLayoutConfig(bareCanvas: boolean) {
  return {
    branchCardWidth: bareCanvas ? 382 : 334,
    siteCardHeight: bareCanvas ? 316 : 340,
    siteRowGap: bareCanvas ? 334 : 246,
    siteRowStartY: bareCanvas ? 430 : 392,
    primaryCardWidth: bareCanvas ? 680 : 570,
    primaryCardHeight: bareCanvas ? 420 : 360,
    primaryCardY: bareCanvas ? 332 : 344,
    minWidth: bareCanvas ? 1640 : 1480,
    baseWidth: bareCanvas ? 1260 : 1180,
    cloudWidthBump: 150,
    minHeight: bareCanvas ? 1220 : 1160,
    flowLaneFloorY: 774,
    bottomPadding: 180,
    flowLanePadding: 64,
    transportSpineY: 308,
    sectionRailX: 56,
    layoutShiftY: bareCanvas ? -124 : 0,
  };
}

export function physicalCanvasFrame({
  bareCanvas,
  branchSiteCount,
  cloudNeeded,
  flowOverlayCount,
  branchRows,
}: {
  bareCanvas: boolean;
  branchSiteCount: number;
  cloudNeeded: boolean;
  flowOverlayCount: number;
  branchRows: number;
}) {
  const config = physicalLayoutConfig(bareCanvas);
  const width = Math.max(config.minWidth, config.baseWidth + branchSiteCount * 120 + (cloudNeeded ? config.cloudWidthBump : 0));
  const centerX = width / 2;
  const primaryCardX = centerX - config.primaryCardWidth / 2;
  const primarySiteBottom = config.primaryCardY + config.primaryCardHeight;
  const branchSectionBottom = branchSiteCount
    ? config.siteRowStartY + (Math.max(branchRows - 1, 0) * config.siteRowGap) + config.siteCardHeight
    : primarySiteBottom;
  const flowLaneStartY = Math.max(config.flowLaneFloorY, branchSectionBottom + 76);
  const flowLaneHeight = flowOverlayCount ? Math.max(0, flowOverlayCount - 1) * 84 + 96 : 0;
  const fabricSectionBottom = Math.max(primarySiteBottom, branchSectionBottom) + 28;
  const height = Math.max(config.minHeight, flowLaneStartY + flowLaneHeight + config.flowLanePadding, fabricSectionBottom + config.bottomPadding);
  return {
    width,
    height,
    centerX,
    primaryCardX,
    primaryCardY: config.primaryCardY,
    primaryCardWidth: config.primaryCardWidth,
    primaryCardHeight: config.primaryCardHeight,
    primarySiteBottom,
    branchSectionBottom,
    flowLaneStartY,
    flowLaneHeight,
    fabricSectionBottom,
    config,
  };
}

export function physicalBranchAnchors({
  branchSites,
  width,
  bareCanvas,
}: {
  branchSites: SiteWithVlans[];
  width: number;
  bareCanvas: boolean;
}) {
  const config = physicalLayoutConfig(bareCanvas);
  return branchSites.map((site, index) => {
    const left = index % 2 === 0;
    const row = Math.floor(index / 2);
    const x = left ? 76 : width - 76 - config.branchCardWidth;
    const y = config.siteRowStartY + row * config.siteRowGap;
    return {
      site,
      index,
      row,
      left,
      x,
      y,
      anchorX: left ? x + config.branchCardWidth : x,
      anchorY: y + config.siteCardHeight / 2 - 8,
      topX: x + config.branchCardWidth / 2,
      topY: y,
    };
  });
}

export function physicalHubDevicePositions({
  bareCanvas,
  centerX,
  primaryCardX,
  primaryCardY,
}: {
  bareCanvas: boolean;
  centerX: number;
  primaryCardX: number;
  primaryCardY: number;
}) {
  return {
    primaryRouterPos: bareCanvas ? { x: primaryCardX + 104, y: primaryCardY + 138 } : { x: centerX - 216, y: 448 },
    primarySwitchPos: bareCanvas ? { x: primaryCardX + 328, y: primaryCardY + 138 } : { x: centerX - 66, y: 452 },
    primaryServerPos: bareCanvas ? { x: primaryCardX + 542, y: primaryCardY + 132 } : { x: centerX + 96, y: 448 },
    primaryAccessPos: bareCanvas ? { x: primaryCardX + 256, y: primaryCardY + 278 } : { x: centerX - 20, y: 564 },
    primaryWirelessPos: bareCanvas ? { x: primaryCardX + 560, y: primaryCardY + 272 } : { x: centerX + 178, y: 564 },
  };
}
