import type { TopologySite, TopologyProjectInput } from './types.js';

export function normalizeIdentifierSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'unnamed';
}

export function siteDisplayCode(site: { name: string; siteCode?: string | null }) {
  return site.siteCode?.trim() || normalizeIdentifierSegment(site.name).toUpperCase();
}

export function chooseHubSite(project: TopologyProjectInput) {
  const headquarters = project.sites.find((site) => {
    const text = `${site.name} ${site.siteCode ?? ''}`.toLowerCase();
    return text.includes('hq') || text.includes('headquarter') || text.includes('head office');
  });

  return headquarters ?? project.sites[0] ?? null;
}

export function buildTopologySites(project: TopologyProjectInput): TopologySite[] {
  return project.sites.map((site) => {
    const hasAddressBlock = Boolean(site.defaultAddressBlock?.trim());
    return {
      id: site.id,
      name: site.name,
      siteCode: site.siteCode,
      defaultAddressBlock: site.defaultAddressBlock,
      truthState: 'configured',
      status: hasAddressBlock ? 'verified' : 'requires_review',
      sourceObjectIds: [site.id],
      evidence: [
        {
          source: 'project.sites',
          sourceObjectId: site.id,
          sourceObjectType: 'site',
          detail: hasAddressBlock ? 'Site has a default address block.' : 'Site exists but has no default address block.',
        },
      ],
      reviewReason: hasAddressBlock ? undefined : 'Add a site address block or explicitly mark addressing as externally managed.',
      notes: [
        'Site topology object is copied from project data and does not invent location, device, or circuit details.',
      ],
    } satisfies TopologySite;
  });
}
