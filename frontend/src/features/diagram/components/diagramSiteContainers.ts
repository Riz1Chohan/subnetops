export type LogicalSiteLane = {
  key: 'perimeter' | 'fabric' | 'services';
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  titleX: number;
  textX: number;
  titleY: number;
  textY: number;
  fill: string;
  stroke: string;
  titleColor: string;
  textColor: string;
};

export function logicalSiteContainer({
  x,
  y,
  cardWidth,
  cardHeight,
}: {
  x: number;
  y: number;
  cardWidth: number;
  cardHeight: number;
}) {
  const innerX = x + 16;
  const innerWidth = cardWidth - 32;
  const titleX = innerX + 14;
  const textX = innerX + 14;
  const laneHeight = 38;
  const lanes: LogicalSiteLane[] = [
    {
      key: 'perimeter',
      title: 'Perimeter / WAN / breakout',
      x: innerX,
      y: y + 74,
      width: innerWidth,
      height: laneHeight,
      titleX,
      textX,
      titleY: y + 89,
      textY: y + 103,
      fill: '#eef5ff',
      stroke: '#bfd2f4',
      titleColor: '#234878',
      textColor: '#526984',
    },
    {
      key: 'fabric',
      title: 'Local access / switching domain',
      x: innerX,
      y: y + 122,
      width: innerWidth,
      height: laneHeight,
      titleX,
      textX,
      titleY: y + 137,
      textY: y + 151,
      fill: '#f5f1ff',
      stroke: '#d6c6ff',
      titleColor: '#5a34a3',
      textColor: '#5f5680',
    },
    {
      key: 'services',
      title: 'Services / trust / anchor posture',
      x: innerX,
      y: y + 170,
      width: innerWidth,
      height: laneHeight,
      titleX,
      textX,
      titleY: y + 185,
      textY: y + 199,
      fill: '#f2fff8',
      stroke: '#b8e0c7',
      titleColor: '#1d7f4c',
      textColor: '#496660',
    },
  ];

  return {
    headerTitleX: x + 20,
    headerTitleY: y + 32,
    headerDetailX: x + 20,
    headerDetailY: y + 50,
    headerAddressX: x + 20,
    headerAddressY: y + 66,
    footerSummaryX: x + 20,
    footerSummaryY: y + cardHeight - 34,
    footerMetaX: x + 20,
    footerMetaY: y + cardHeight - 20,
    lanes,
  };
}

export function physicalPrimarySiteContainer({
  centerX,
  primaryCardX,
  primaryCardY,
  primaryCardWidth,
  bareCanvas,
}: {
  centerX: number;
  primaryCardX: number;
  primaryCardY: number;
  primaryCardWidth: number;
  bareCanvas: boolean;
}) {
  return {
    titleX: primaryCardX + 34,
    titleY: primaryCardY + 36,
    subtitleX: primaryCardX + 34,
    subtitleY: primaryCardY + 56,
    addressX: primaryCardX + 34,
    addressY: primaryCardY + 74,
    taskBadgeX: primaryCardX + primaryCardWidth - 34,
    taskBadgeY: primaryCardY + 28,
    validationChipX: primaryCardX + primaryCardWidth - 188,
    validationChipY: primaryCardY + 16,
    headerRailX: centerX - 186,
    headerRailY: 320,
    headerRailWidth: 372,
    clusterRects: {
      routing: { x: centerX - 236, y: 438, width: 142, height: 118, titleX: centerX - 220, titleY: 458, textX: centerX - 220, textY: 474 },
      switching: { x: centerX - 86, y: 442, width: 144, height: 112, titleX: centerX - 70, titleY: 462, textX: centerX - 70, textY: 478 },
      services: { x: centerX + 74, y: 438, width: 166, height: 118, titleX: centerX + 90, titleY: 458, textX: centerX + 90, textY: 474 },
      access: { x: centerX - 42, y: 552, width: 300, height: 108, titleX: centerX - 26, titleY: 572, textX: centerX - 26, textY: 588 },
    },
    compactBounds: bareCanvas
      ? {
          clusterTop: primaryCardY + 94,
          clusterBottom: primaryCardY + 330,
        }
      : undefined,
  };
}

export function physicalBranchSiteContainer({
  x,
  y,
  boxWidth,
  siteCardHeight,
  bareCanvas,
}: {
  x: number;
  y: number;
  boxWidth: number;
  siteCardHeight: number;
  bareCanvas: boolean;
}) {
  return {
    anchorY: y + siteCardHeight / 2 - 8,
    titleX: x + 18,
    titleY: y + 28,
    subtitleX: x + 18,
    subtitleY: y + 46,
    addressX: x + 18,
    addressY: y + 62,
    taskBadgeX: x + boxWidth - 24,
    taskBadgeY: y + 24,
    edge: { x: bareCanvas ? x + 28 : x + 16, y: bareCanvas ? y + 78 : y + 96 },
    switching: { x: bareCanvas ? x + 176 : x + 132, y: bareCanvas ? y + 78 : y + 98 },
    wireless: { x: bareCanvas ? x + 120 : x + 254, y: bareCanvas ? y + 198 : y + 102 },
    services: { x: bareCanvas ? x + 234 : x + 214, y: bareCanvas ? y + 28 : y + 26 },
    chips: {
      edgeY: y + 178,
      switchY: y + 226,
      securityY: y + 274,
      overlayY: y + 298,
    },
    notes: {
      dmzY: y + 320,
      managementY: y + 334,
      edgeInterfaceY: y + 352,
      switchInterfaceY: y + 366,
      pathY: y + 380,
      edgeValidationY: y + 394,
      switchValidationY: y + 408,
      zoneStartY: y + 186,
    },
  };
}
