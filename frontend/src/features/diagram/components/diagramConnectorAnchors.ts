export type DiagramPoint = [number, number];

export function primaryHubLinkAnchors({
  primaryRouterX,
  primaryRouterY,
  primarySwitchX,
  primarySwitchY,
  primaryServicesX,
  primaryServicesY,
  primaryAccessX,
  primaryAccessY,
  primaryWirelessX,
  primaryWirelessY,
}: {
  primaryRouterX: number;
  primaryRouterY: number;
  primarySwitchX: number;
  primarySwitchY: number;
  primaryServicesX: number;
  primaryServicesY: number;
  primaryAccessX: number;
  primaryAccessY: number;
  primaryWirelessX: number;
  primaryWirelessY: number;
}) {
  return {
    routerToSwitch: {
      from: [primaryRouterX + 92, primaryRouterY + 30] as DiagramPoint,
      to: [primarySwitchX, primarySwitchY + 30] as DiagramPoint,
    },
    switchToServices: {
      from: [primarySwitchX + 122, primarySwitchY + 26] as DiagramPoint,
      to: [primaryServicesX, primaryServicesY + 26] as DiagramPoint,
    },
    accessToWireless: {
      from: [primaryAccessX + 112, primaryAccessY + 26] as DiagramPoint,
      to: [primaryWirelessX, primaryWirelessY + 26] as DiagramPoint,
    },
  };
}

export function branchFabricLinkAnchors({ x, y, bareCanvas }: { x: number; y: number; bareCanvas: boolean }) {
  return {
    edgeToSwitch: {
      from: (bareCanvas ? [x + 146, y + 112] : [x + 118, y + 125]) as DiagramPoint,
      to: (bareCanvas ? [x + 176, y + 112] : [x + 132, y + 125]) as DiagramPoint,
    },
    switchToWireless: {
      from: (bareCanvas ? [x + 232, y + 112] : [x + 244, y + 125]) as DiagramPoint,
      to: (bareCanvas ? [x + 176, y + 212] : [x + 254, y + 125]) as DiagramPoint,
      elbowY: y + (bareCanvas ? 168 : 142),
    },
    publishedServicePath: {
      from: [x + 66, y + 118] as DiagramPoint,
      to: [x + 252, y + 74] as DiagramPoint,
    },
    dmzSubnetDrop: {
      from: [x + 268, y + 46] as DiagramPoint,
      to: [x + 268, y + 62] as DiagramPoint,
    },
    managementToDmz: {
      from: [x + 184, y + 122] as DiagramPoint,
      to: [x + 268, y + 62] as DiagramPoint,
    },
  };
}

export function branchTransportRailGeometry({
  leftBranchEntries,
  rightBranchEntries,
  primaryCardX,
  primaryCardWidth,
  branchMidY,
  leftSpineX,
  rightSpineX,
}: {
  leftBranchEntries: Array<{ anchorY: number }>;
  rightBranchEntries: Array<{ anchorY: number }>;
  primaryCardX: number;
  primaryCardWidth: number;
  branchMidY: number;
  leftSpineX: number;
  rightSpineX: number;
}) {
  const leftAnchorYs = leftBranchEntries.map((entry) => entry.anchorY);
  const rightAnchorYs = rightBranchEntries.map((entry) => entry.anchorY);

  return {
    leftHubToRail: leftAnchorYs.length
      ? { from: [primaryCardX, branchMidY] as DiagramPoint, to: [leftSpineX, Math.min(...leftAnchorYs)] as DiagramPoint, elbowX: primaryCardX - 30 }
      : null,
    rightHubToRail: rightAnchorYs.length
      ? { from: [primaryCardX + primaryCardWidth, branchMidY] as DiagramPoint, to: [rightSpineX, Math.min(...rightAnchorYs)] as DiagramPoint, elbowX: primaryCardX + primaryCardWidth + 30 }
      : null,
    leftRailSpan: leftAnchorYs.length
      ? { from: [leftSpineX, Math.min(...leftAnchorYs)] as DiagramPoint, to: [leftSpineX, Math.max(...leftAnchorYs)] as DiagramPoint }
      : null,
    rightRailSpan: rightAnchorYs.length
      ? { from: [rightSpineX, Math.min(...rightAnchorYs)] as DiagramPoint, to: [rightSpineX, Math.max(...rightAnchorYs)] as DiagramPoint }
      : null,
  };
}
