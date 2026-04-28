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

  const plannedSiteCount = Math.max(1, num(profile.siteCount, sites.length || 1));
  const expectedUsersPerSite = Math.max(1, num(profile.usersPerSite, 50));
  const configuredSiteBlocks = sites.filter((site) => site.defaultAddressBlock?.trim()).length;
  const configuredVlans = vlans.length;
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

  if (sites.length === 0) {
    missingInfo.push({
      id: 'no-sites',
      level: 'critical',
      title: 'No real sites are configured yet',
      detail: 'The design engine can propose placeholder sites, but site-by-site design is still weak until actual sites are added.',
      fixPath: `/projects/${project?.id ?? ''}/sites`,
      actionLabel: 'Add site details',
    });
  } else if (sites.length < plannedSiteCount) {
    missingInfo.push({
      id: 'site-gap',
      level: 'warning',
      title: 'Planned site count is ahead of configured site records',
      detail: `Requirements expect about ${plannedSiteCount} site(s), but only ${sites.length} site record(s) exist right now.`,
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
  } else if (configuredSiteBlocks < sites.length) {
    missingInfo.push({
      id: 'partial-site-blocks',
      level: 'warning',
      title: 'Some sites still rely on assumed addressing',
      detail: `${sites.length - configuredSiteBlocks} site(s) are missing an explicit default address block.`,
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
  } else if (configuredVlans < sites.length) {
    missingInfo.push({
      id: 'thin-vlan-model',
      level: 'warning',
      title: 'Configured segments look too thin for the number of sites',
      detail: `There are ${configuredVlans} VLAN records across ${sites.length} configured site(s), which suggests the low-level model is still incomplete.`,
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

  const penalties = missingInfo.reduce((total, item) => total + (item.level === 'critical' ? 18 : 8), 0)
    + contradictions.reduce((total, item) => total + (item.level === 'critical' ? 20 : 10), 0)
    + validationErrorCount * 6
    + validationWarningCount * 2;

  const baseStrength = 52
    + Math.min(12, configuredSiteBlocks * 3)
    + Math.min(10, configuredVlans)
    + Math.min(8, design.trafficFlows.length)
    + Math.min(8, design.securityBoundaries.length)
    + Math.min(10, design.routingPlan.length);

  const score = Math.max(0, Math.min(100, baseStrength - penalties));

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
    ? 'The design has a stronger factual base, but validation should still be re-run after every major change.'
    : status === 'medium'
      ? 'The design is reviewable, but some planning assumptions and contradictions still weaken implementation trust.'
      : 'The design still depends on assumptions or conflicting inputs, so implementation-ready outputs would be premature.';

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
