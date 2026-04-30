import type { Project, Site, Vlan } from './types';
import type { RequirementsProfile } from './requirementsProfile';
import type { SynthesizedLogicalDesign } from './designSynthesis.types';

export interface ValidationTrustSignal {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  fixPath: string;
  actionLabel: string;
}

export interface ValidationReadinessSummary {
  score: number;
  status: 'high' | 'medium' | 'low';
  label: string;
  summary: string;
  missingInfo: ValidationTrustSignal[];
  contradictions: ValidationTrustSignal[];
  strengths: string[];
  nextActions: Array<{ label: string; path: string }>;
}

function num(value: string | number | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dedupeByTitle(items: ValidationTrustSignal[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.level}:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildValidationReadinessSummary(
  project: Project | undefined,
  sites: Site[],
  vlans: Vlan[],
  profile: RequirementsProfile,
  design: SynthesizedLogicalDesign,
  validationErrorCount: number,
  validationWarningCount: number,
): ValidationReadinessSummary {
  const missingInfo: ValidationTrustSignal[] = [];
  const contradictions: ValidationTrustSignal[] = [];
  const strengths: string[] = [];

  const backendSiteEvidenceCount = Math.max(design.siteHierarchy.length, design.siteSummaries.length, new Set(design.addressingPlan.map((row) => row.siteId)).size);
  const backendAddressingEvidenceCount = design.addressingPlan.length;
  const backendConfiguredBlockCount = Math.max(
    design.siteHierarchy.filter((site) => site.siteBlockCidr?.trim()).length,
    design.siteSummaries.filter((site) => site.siteBlockCidr?.trim()).length,
  );
  const backendSegmentEvidenceCount = Math.max(
    design.segmentModel.reduce((sum, segment) => sum + segment.configuredCount + segment.proposedCount, 0),
    backendAddressingEvidenceCount,
  );
  const plannedSiteCount = Math.max(1, num(profile.siteCount, sites.length || backendSiteEvidenceCount || 1));
  const expectedUsersPerSite = Math.max(1, num(profile.usersPerSite, 50));
  const effectiveSiteCount = Math.max(sites.length, backendSiteEvidenceCount);
  const configuredSiteBlocks = Math.max(sites.filter((site) => site.defaultAddressBlock?.trim()).length, backendConfiguredBlockCount);
  const configuredVlans = Math.max(vlans.length, backendSegmentEvidenceCount);
  const hasMaterializedBackendEvidence = effectiveSiteCount > 0 && backendAddressingEvidenceCount > 0;
  const hasCloudEnvironment = profile.environmentType !== 'On-prem';

  if (!project?.basePrivateRange?.trim()) {
    missingInfo.push({
      id: 'org-block-assumed',
      level: 'warning',
      title: 'Organization addressing block is still assumed',
      detail: 'The current design can synthesize a block, but the base private range is not explicitly locked yet.',
      fixPath: `/projects/${project?.id ?? ''}/requirements#requirements-addressing`,
      actionLabel: 'Set organization block',
    });
  } else {
    strengths.push('Organization base private range is explicitly defined.');
  }

  if (effectiveSiteCount === 0) {
    missingInfo.push({
      id: 'no-sites',
      level: 'critical',
      title: 'No real sites are configured yet',
      detail: 'The design engine can propose placeholder sites, but site-by-site design is still weak until actual sites are added.',
      fixPath: `/projects/${project?.id ?? ''}/sites`,
      actionLabel: 'Add site details',
    });
  } else if (effectiveSiteCount < plannedSiteCount) {
    missingInfo.push({
      id: 'site-gap',
      level: 'warning',
      title: 'Planned site count is ahead of configured site records',
      detail: `Requirements expect about ${plannedSiteCount} site(s), but only ${effectiveSiteCount} loaded site evidence row(s) exist right now.`,
      fixPath: `/projects/${project?.id ?? ''}/sites`,
      actionLabel: 'Complete site list',
    });
  } else {
    strengths.push('Configured site records are present for the current plan.');
  }

  if (configuredSiteBlocks === 0) {
    missingInfo.push({
      id: 'no-site-blocks',
      level: 'critical',
      title: 'No site blocks are explicitly assigned',
      detail: 'Addressing can be synthesized, but site summarization and routing intent remain lower-confidence until real site blocks are set.',
      fixPath: `/projects/${project?.id ?? ''}/sites`,
      actionLabel: 'Assign site blocks',
    });
  } else if (configuredSiteBlocks < effectiveSiteCount) {
    missingInfo.push({
      id: 'partial-site-blocks',
      level: 'warning',
      title: 'Some sites still rely on assumed addressing',
      detail: `${effectiveSiteCount - configuredSiteBlocks} site(s) are missing an explicit default address block.`,
      fixPath: `/projects/${project?.id ?? ''}/sites`,
      actionLabel: 'Finish site addressing',
    });
  } else {
    strengths.push('Each configured site has an explicit site block.');
  }

  if (configuredVlans === 0) {
    missingInfo.push({
      id: 'no-vlans',
      level: 'critical',
      title: 'No real VLANs or segments are configured yet',
      detail: 'The design engine can recommend segments, but low-level design remains weak until actual VLAN records exist.',
      fixPath: `/projects/${project?.id ?? ''}/vlans`,
      actionLabel: 'Add VLAN records',
    });
  } else if (configuredVlans < effectiveSiteCount) {
    missingInfo.push({
      id: 'thin-vlan-model',
      level: 'warning',
      title: 'Configured segments look too thin for the number of sites',
      detail: `There are ${configuredVlans} VLAN/segment evidence row(s) across ${effectiveSiteCount} loaded site(s), which suggests the low-level model is still incomplete.`,
      fixPath: `/projects/${project?.id ?? ''}/vlans`,
      actionLabel: 'Deepen segment model',
    });
  } else {
    strengths.push('Real VLAN or segment records exist for the design review.');
  }

  if (design.stats.rowsOutsideSiteBlocks > 0) {
    contradictions.push({
      id: 'outside-site-blocks',
      level: 'critical',
      title: 'Some configured subnets fall outside their site block',
      detail: `${design.stats.rowsOutsideSiteBlocks} addressing row(s) are outside the assigned site block, so routing and summarization confidence drops.`,
      fixPath: `/projects/${project?.id ?? ''}/addressing`,
      actionLabel: 'Review addressing plan',
    });
  }

  if (design.stats.missingSiteBlocks > 0) {
    contradictions.push({
      id: 'design-missing-blocks',
      level: 'warning',
      title: 'The synthesized design still has sites without a real block',
      detail: `${design.stats.missingSiteBlocks} site summary row(s) still rely on inferred addressing instead of explicit blocks.`,
      fixPath: `/projects/${project?.id ?? ''}/sites`,
      actionLabel: 'Fix site addressing',
    });
  }

  if (hasCloudEnvironment && !profile.cloudConnected) {
    contradictions.push({
      id: 'cloud-env-mismatch',
      level: 'warning',
      title: 'Environment says cloud or hybrid, but cloud connection is off',
      detail: `The environment is set to ${profile.environmentType}, but the cloud-connected flag is disabled.`,
      fixPath: `/projects/${project?.id ?? ''}/requirements#requirements-scenario`,
      actionLabel: 'Review cloud branch',
    });
  }

  if (!hasCloudEnvironment && profile.cloudConnected) {
    contradictions.push({
      id: 'cloud-flag-mismatch',
      level: 'warning',
      title: 'Cloud branch is active while the environment is still on-prem',
      detail: 'This may be intentional, but it often means the top-level scenario and the branch flags are no longer aligned.',
      fixPath: `/projects/${project?.id ?? ''}/requirements#requirements-scenario`,
      actionLabel: 'Align scenario flags',
    });
  }

  if (!profile.wireless && num(profile.apCount, 0) > 0) {
    contradictions.push({
      id: 'wireless-mismatch',
      level: 'warning',
      title: 'Access point count exists while wireless is disabled',
      detail: `Wireless is off, but the requirements still mention about ${profile.apCount} access point(s).`,
      fixPath: `/projects/${project?.id ?? ''}/requirements#requirements-summary`,
      actionLabel: 'Review wireless inputs',
    });
  }

  if (!profile.voice && num(profile.phoneCount, 0) > 0) {
    contradictions.push({
      id: 'voice-mismatch',
      level: 'warning',
      title: 'Phone count exists while voice is disabled',
      detail: `Voice is off, but the requirements still mention about ${profile.phoneCount} phone(s).`,
      fixPath: `/projects/${project?.id ?? ''}/requirements#requirements-summary`,
      actionLabel: 'Review voice inputs',
    });
  }

  if (profile.dualIsp && profile.resilienceTarget.toLowerCase().includes('single isp')) {
    contradictions.push({
      id: 'resilience-mismatch',
      level: 'warning',
      title: 'Dual ISP is enabled but the resilience target still says single ISP acceptable',
      detail: 'These inputs can push the design in different directions and should be aligned before implementation planning.',
      fixPath: `/projects/${project?.id ?? ''}/requirements#requirements-summary`,
      actionLabel: 'Review resilience target',
    });
  }

  if (profile.management && !design.securityZones.some((zone) => zone.zoneName.toLowerCase().includes('management'))) {
    contradictions.push({
      id: 'mgmt-zone-missing',
      level: 'warning',
      title: 'Management was requested but is not clearly visible in the zone model',
      detail: 'This suggests the security boundary view is still weaker than the planning intent.',
      fixPath: `/projects/${project?.id ?? ''}/security`,
      actionLabel: 'Review security design',
    });
  }

  if (hasMaterializedBackendEvidence) {
    strengths.push(`Backend materialized evidence is loaded: ${effectiveSiteCount} site(s), ${backendAddressingEvidenceCount} addressing row(s), and ${configuredVlans} segment evidence row(s).`);
  }

  if (design.wanLinks.length > 0) {
    strengths.push(`WAN/transit evidence is present with ${design.wanLinks.length} link or transit row(s).`);
  }

  if (design.routePolicies.length > 0) {
    strengths.push(`Routing policy evidence is present with ${design.routePolicies.length} route policy row(s).`);
  }

  if (design.configurationTemplates.length > 0) {
    strengths.push(`Implementation-template evidence exists with ${design.configurationTemplates.length} vendor-neutral template artifact(s).`);
  }

  if (design.trafficFlows.length > 0) {
    strengths.push(`Traffic-flow modeling is present with ${design.trafficFlows.length} synthesized path(s).`);
  }
  if (design.securityBoundaries.length > 0) {
    strengths.push(`Security boundary detail exists for ${design.securityBoundaries.length} boundary item(s).`);
  }
  if (design.routingPlan.length > 0) {
    strengths.push(`Routing intent exists for ${design.routingPlan.length} site routing row(s).`);
  }
  const requiredFlowCoverage = design.flowCoverage.filter((item) => item.required);
  const missingRequiredFlowCoverage = requiredFlowCoverage.filter((item) => item.status !== 'ready');
  if (missingRequiredFlowCoverage.length > 0) {
    contradictions.push({
      id: 'required-flow-coverage-gap',
      level: missingRequiredFlowCoverage.length >= 2 ? 'critical' : 'warning',
      title: 'Required traffic-path coverage is still incomplete',
      detail: `${missingRequiredFlowCoverage.length} required flow category${missingRequiredFlowCoverage.length === 1 ? ' is' : 'ies are'} still missing from the current generated flow model.`,
      fixPath: `/projects/${project?.id ?? ''}/routing`,
      actionLabel: 'Review flow coverage',
    });
  } else if (requiredFlowCoverage.length > 0) {
    strengths.push(`Required flow coverage is complete for ${requiredFlowCoverage.length} scenario path type(s).`);
  }

  const inferredRouteDomains = design.designTruthModel.routeDomains.filter((item) => item.sourceModel === 'inferred').length;
  const inferredBoundaryDomains = design.designTruthModel.boundaryDomains.filter((item) => item.sourceModel === 'inferred').length;
  if (inferredRouteDomains + inferredBoundaryDomains > 0) {
    contradictions.push({
      id: 'inferred-core-objects',
      level: inferredRouteDomains + inferredBoundaryDomains >= 4 ? 'warning' : 'info',
      title: 'Core model still depends on inferred route or boundary objects',
      detail: `${inferredRouteDomains} route domain(s) and ${inferredBoundaryDomains} boundary domain(s) are still inferred instead of generated from stronger explicit design records.`,
      fixPath: `/projects/${project?.id ?? ''}/core-model`,
      actionLabel: 'Review core model authority',
    });
  } else {
    strengths.push('Core route and boundary objects are explicit instead of inferred.');
  }

  if (design.designTruthModel.unresolvedReferences.length > 0) {
    contradictions.push({
      id: 'unresolved-truth-links',
      level: design.designTruthModel.unresolvedReferences.length > 4 ? 'critical' : 'warning',
      title: 'The unified model still has unresolved cross-object references',
      detail: `${design.designTruthModel.unresolvedReferences.length} unresolved reference(s) still exist between placements, routes, services, boundaries, or flows.`,
      fixPath: `/projects/${project?.id ?? ''}/core-model`,
      actionLabel: 'Inspect unresolved references',
    });
  }

  const warningPenaltyCap = hasMaterializedBackendEvidence && validationErrorCount === 0 ? 18 : Number.POSITIVE_INFINITY;
  const validationWarningPenalty = Math.min(validationWarningCount * 1.25, warningPenaltyCap);
  const penalties = missingInfo.reduce((total, item) => total + (item.level === 'critical' ? 18 : 8), 0)
    + contradictions.reduce((total, item) => total + (item.level === 'critical' ? 20 : 10), 0)
    + validationErrorCount * 8
    + validationWarningPenalty;

  const baseStrength = 52
    + Math.min(14, configuredSiteBlocks * 2)
    + Math.min(16, configuredVlans / 5)
    + Math.min(8, design.trafficFlows.length)
    + Math.min(8, design.securityBoundaries.length)
    + Math.min(10, design.routingPlan.length)
    + Math.min(8, design.routePolicies.length / 10)
    + Math.min(6, design.wanLinks.length / 2)
    + Math.min(6, design.configurationTemplates.length / 25);

  const rawScore = Math.max(0, Math.min(100, baseStrength - penalties));
  const evidenceFloor = hasMaterializedBackendEvidence && validationErrorCount === 0 && missingInfo.every((item) => item.level !== 'critical') ? 58 : 0;
  const score = Math.max(evidenceFloor, rawScore);

  let status: 'high' | 'medium' | 'low' = 'low';
  let label = 'Low confidence';
  if (score >= 75) {
    status = 'high';
    label = 'High confidence';
  } else if (score >= 50) {
    status = 'medium';
    label = 'Medium confidence';
  }

  const summary = status === 'high'
    ? 'The design has a stronger factual base for design review, while implementation execution may still need separate blocker cleanup.'
    : status === 'medium'
      ? 'The design is reviewable, but warnings and assumptions should still be cleaned up before implementation execution.'
      : 'The design still depends on assumptions or conflicting inputs. Do not confuse this design-review score with implementation execution readiness.';

  const nextActions = dedupeByTitle([...missingInfo, ...contradictions])
    .slice(0, 4)
    .map((item) => ({ label: item.actionLabel, path: item.fixPath }));

  return {
    score,
    status,
    label,
    summary,
    missingInfo: dedupeByTitle(missingInfo),
    contradictions: dedupeByTitle(contradictions),
    strengths: Array.from(new Set(strengths)).slice(0, 6),
    nextActions,
  };
}
