import type { AddressingPlanRow, SynthesizedLogicalDesign } from "./designSynthesis";
import type { DesignCoreAddressRow, DesignCoreSnapshot } from "./designCoreSnapshot";
import { subnetFacts } from "./networkValidators";

function effectiveSubnet(row: DesignCoreAddressRow) {
  return row.canonicalSubnetCidr || row.proposedSubnetCidr || row.sourceSubnetCidr;
}

function effectiveGateway(row: DesignCoreAddressRow) {
  return row.effectiveGatewayIp || row.proposedGatewayIp || row.sourceGatewayIp || "";
}

function toAddressingPlanRow(row: DesignCoreAddressRow): AddressingPlanRow {
  const subnetCidr = effectiveSubnet(row);
  const facts = subnetFacts(subnetCidr, row.role);
  const usableHosts = row.usableHosts ?? facts?.usableAddresses ?? 0;
  const estimatedHosts = row.estimatedHosts ?? 0;
  const utilization = usableHosts > 0 ? Math.min(1, estimatedHosts / usableHosts) : 0;

  return {
    id: row.id,
    siteId: row.siteId,
    siteName: row.siteName,
    siteCode: row.siteCode || undefined,
    siteBlockCidr: row.siteBlockCidr || undefined,
    source: row.truthState === "configured" ? "configured" : "proposed",
    vlanId: row.vlanId,
    segmentName: row.vlanName,
    purpose: row.vlanName,
    role: row.role,
    roleLabel: row.role.replace(/_/g, " "),
    subnetCidr,
    mask: facts?.dottedMask || "",
    gatewayIp: effectiveGateway(row),
    dhcpEnabled: row.dhcpEnabled,
    usableHosts,
    estimatedHosts,
    headroom: Math.max(0, usableHosts - estimatedHosts),
    utilization,
    insideSiteBlock: row.inSiteBlock,
    notes: [
      ...row.notes,
      row.truthState !== "configured" ? "Backend design-core proposal; engineer review required before implementation." : "Backend design-core checked configured input.",
    ],
  };
}

export function applyDesignCoreSnapshotToSynthesis(
  localDesign: SynthesizedLogicalDesign,
  snapshot?: DesignCoreSnapshot | null,
): SynthesizedLogicalDesign {
  if (!snapshot) return localDesign;

  const backendCheckedAddressingPlan = snapshot.addressingRows
    .map(toAddressingPlanRow)
    .filter((row) => row.subnetCidr);

  return {
    ...localDesign,
    organizationBlock: snapshot.organizationBlock?.canonicalCidr || localDesign.organizationBlock,
    organizationBlockAssumed: snapshot.organizationBlock?.validationState === "missing" || localDesign.organizationBlockAssumed,
    addressingPlan: backendCheckedAddressingPlan.length > 0 ? backendCheckedAddressingPlan : localDesign.addressingPlan,
    stats: {
      ...localDesign.stats,
      configuredSegments: snapshot.summary.validSubnetCount,
      proposedSegments: snapshot.summary.proposalCount,
      missingSiteBlocks: snapshot.siteBlocks.filter((item) => !item.canonicalCidr && !item.proposedCidr).length,
      rowsOutsideSiteBlocks: snapshot.addressingRows.filter((item) => item.inSiteBlock === false).length,
    },
    openIssues: snapshot.issues
      .filter((issue) => issue.severity !== "INFO")
      .map((issue) => `${issue.title}: ${issue.detail}`),
    designReview: [
      ...localDesign.designReview,
      {
        kind: snapshot.summary.readyForBackendAuthority ? "decision" : "risk",
        title: snapshot.summary.readyForBackendAuthority ? "Backend design-core snapshot is review-ready" : "Backend design-core snapshot has blockers",
        detail: `${snapshot.summary.validSubnetCount}/${snapshot.summary.vlanCount} subnet rows are valid in the backend design-core snapshot.`,
      },
    ],
  };
}
