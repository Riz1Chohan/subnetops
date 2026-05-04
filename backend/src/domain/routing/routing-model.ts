import { cidrsOverlap, parseCidr } from "../addressing/cidr.js";
import type { ParsedCidr } from "../addressing/cidr.js";
import type {
  NetworkInterface,
  NetworkLink,
  NetworkObjectTruthState,
  PolicyRule,
  RouteDomain,
  RouteDomainRoutingTable,
  RouteIntent,
  RouteTableEntry,
  RoutingConflictReview,
  RoutingSegmentationModel,
  RoutingSegmentationReachabilityFinding,
  SecurityZone,
  SegmentationFlowExpectation,
  SiteSummarizationReview,
  SiteToSiteReachabilityCheck,
  TransitPlanRow,
} from "./types.js";

type RoutingNetworkObjectModel = {
  routeDomains: RouteDomain[];
  securityZones: SecurityZone[];
  devices: Array<{ id: string; name: string; siteId: string; deviceRole: "core-layer3-switch" | "branch-edge-router" | "security-firewall" | "routing-identity" | "unknown" }>;
  interfaces: NetworkInterface[];
  links: NetworkLink[];
  policyRules: PolicyRule[];
};

type RouteAdministrativeState = "present" | "proposed" | "missing" | "review";
type RouteMatchState = "reachable" | "missing" | "review";

type RoutingProject = {
  sites: Array<{
    id: string;
    name: string;
    siteCode?: string | null;
  }>;
};

function normalizeIdentifierSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unnamed";
}

function routeIntentId(parts: string[]) {
  return `route-intent-${parts.map(normalizeIdentifierSegment).join("-")}`;
}

function reviewId(parts: string[]) {
  return `routing-review-${parts.map(normalizeIdentifierSegment).join("-")}`;
}

function findInterfaceForSubnet(interfaces: NetworkInterface[], subnetCidr: string) {
  return interfaces.find((networkInterface) => networkInterface.subnetCidr === subnetCidr);
}

function findSiteName(project: RoutingProject, siteId?: string) {
  if (!siteId) return "Project";
  const site = project.sites.find((item) => item.id === siteId);
  if (!site) return siteId;
  return site.siteCode ? `${site.name} (${site.siteCode})` : site.name;
}

function chooseHubSite(project: RoutingProject) {
  return project.sites.find((site) => `${site.name} ${site.siteCode ?? ""}`.toLowerCase().includes("hq")) ?? project.sites[0];
}

function routeParsed(routeIntent: RouteIntent): ParsedCidr | null {
  try {
    return parseCidr(routeIntent.destinationCidr);
  } catch {
    return null;
  }
}

function destinationParsed(destinationCidr?: string): ParsedCidr | null {
  if (!destinationCidr) return null;
  try {
    return parseCidr(destinationCidr);
  } catch {
    return null;
  }
}

function routeCoversDestination(routeIntent: RouteIntent, destinationCidr?: string) {
  if (!destinationCidr) return false;
  const route = routeParsed(routeIntent);
  const destination = destinationParsed(destinationCidr);
  if (!route || !destination) return false;
  return destination.network >= route.network && destination.broadcast <= route.broadcast;
}

function routeAdministrativeDistance(routeKind: RouteIntent["routeKind"]) {
  switch (routeKind) {
    case "connected":
      return 0;
    case "static":
      return 1;
    case "summary":
      return 5;
    case "default":
      return 10;
    default:
      return 255;
  }
}

function routePathScope(routeIntent: RouteIntent): RouteTableEntry["pathScope"] {
  if (routeIntent.routeKind === "connected") return "local";
  if (routeIntent.routeKind === "summary") return "site-summary";
  if (routeIntent.routeKind === "static") return "inter-site";
  if (routeIntent.routeKind === "default") return "internet-edge";
  return "review";
}

function routeEntryState(routeIntent: RouteIntent): RouteTableEntry["routeState"] {
  if (routeIntent.administrativeState === "present") return "active";
  if (routeIntent.administrativeState === "proposed") return "proposed";
  if (routeIntent.administrativeState === "missing") return "missing";
  return "review";
}

function nextHopObjectExists(routeIntent: RouteIntent, model: RoutingNetworkObjectModel) {
  if (!routeIntent.nextHopObjectId) return false;
  if (routeIntent.nextHopType === "connected-interface") return model.interfaces.some((item) => item.id === routeIntent.nextHopObjectId);
  if (routeIntent.nextHopType === "transit-link") return model.links.some((item) => item.id === routeIntent.nextHopObjectId);
  if (routeIntent.nextHopType === "site-gateway" || routeIntent.nextHopType === "security-boundary") return model.devices.some((item) => item.id === routeIntent.nextHopObjectId);
  return false;
}

function buildRouteEntries(routeIntents: RouteIntent[]) {
  return routeIntents
    .map<RouteTableEntry>((routeIntent) => {
      const parsed = routeParsed(routeIntent);
      return {
        id: `route-entry-${normalizeIdentifierSegment(routeIntent.id)}`,
        routeDomainId: routeIntent.routeDomainId,
        routeDomainName: routeIntent.routeDomainName,
        siteId: routeIntent.siteId,
        sourceRouteIntentId: routeIntent.id,
        routeKind: routeIntent.routeKind,
        destinationCidr: routeIntent.destinationCidr,
        destinationPrefix: parsed?.prefix ?? -1,
        nextHopType: routeIntent.nextHopType,
        nextHopObjectId: routeIntent.nextHopObjectId,
        administrativeDistance: routeAdministrativeDistance(routeIntent.routeKind),
        pathScope: routePathScope(routeIntent),
        routeState: routeEntryState(routeIntent),
        evidence: [...routeIntent.evidence],
        notes: [
          `Backend route-table simulation entry derived from ${routeIntent.id}.`,
          `Administrative distance is neutral-planning metadata (${routeAdministrativeDistance(routeIntent.routeKind)}), not a vendor command value.`,
          ...routeIntent.notes,
        ],
      };
    })
    .sort((left, right) => {
      const domain = left.routeDomainId.localeCompare(right.routeDomainId);
      if (domain !== 0) return domain;
      const site = (left.siteId ?? "").localeCompare(right.siteId ?? "");
      if (site !== 0) return site;
      const prefix = right.destinationPrefix - left.destinationPrefix;
      if (prefix !== 0) return prefix;
      const distance = left.administrativeDistance - right.administrativeDistance;
      if (distance !== 0) return distance;
      return left.id.localeCompare(right.id);
    });
}

function buildConnectedRouteIntents(routeDomain: RouteDomain, model: RoutingNetworkObjectModel): RouteIntent[] {
  const routeIntents: RouteIntent[] = [];
  const seenDestinations = new Set<string>();

  for (const subnetCidr of [...routeDomain.subnetCidrs].sort()) {
    if (seenDestinations.has(subnetCidr)) continue;
    seenDestinations.add(subnetCidr);

    const owningInterface = findInterfaceForSubnet(model.interfaces, subnetCidr);
    const truthState: NetworkObjectTruthState = owningInterface?.truthState ?? routeDomain.truthState;

    routeIntents.push({
      id: routeIntentId([routeDomain.id, "connected", subnetCidr]),
      name: `Connected route for ${subnetCidr}`,
      routeDomainId: routeDomain.id,
      routeDomainName: routeDomain.name,
      siteId: owningInterface?.siteId,
      routeKind: "connected",
      destinationCidr: subnetCidr,
      nextHopType: "connected-interface",
      nextHopObjectId: owningInterface?.id,
      administrativeState: owningInterface ? "present" : "review",
      truthState,
      routePurpose: "Make a directly attached subnet explicit in the backend routing table model.",
      evidence: owningInterface
        ? [`Interface ${owningInterface.name} owns ${subnetCidr}.`]
        : [`Route domain ${routeDomain.name} carries ${subnetCidr}, but no owning interface was found.`],
      notes: [
        owningInterface
          ? "Connected route inferred from a modeled routed interface."
          : "Connected route requires review because the subnet has route-domain membership but no modeled interface owner.",
      ],
    });
  }

  return routeIntents;
}

function buildDefaultRouteIntents(project: RoutingProject, routeDomain: RouteDomain, model: RoutingNetworkObjectModel): RouteIntent[] {
  if (routeDomain.defaultRouteState === "not-required") return [];

  const securityBoundaryDevice = model.devices.find((device) => device.deviceRole === "security-firewall");
  const wideAreaZone = model.securityZones.find((zone) => zone.zoneRole === "wan");
  const administrativeState: RouteAdministrativeState = securityBoundaryDevice && wideAreaZone ? "proposed" : "review";

  return project.sites.map((site) => ({
    id: routeIntentId([routeDomain.id, site.id, "default-route"]),
    name: `${findSiteName(project, site.id)} default route intent`,
    routeDomainId: routeDomain.id,
    routeDomainName: routeDomain.name,
    siteId: site.id,
    routeKind: "default",
    destinationCidr: "0.0.0.0/0",
    nextHopType: securityBoundaryDevice ? "security-boundary" : "engineer-review",
    nextHopObjectId: securityBoundaryDevice?.id,
    administrativeState,
    truthState: "proposed",
    routePurpose: "Provide an explicit egress/default-route intent for internet and upstream WAN access.",
    evidence: [
      `Route domain default route state is ${routeDomain.defaultRouteState}.`,
      securityBoundaryDevice ? `Security boundary candidate: ${securityBoundaryDevice.name}.` : "No security boundary device is modeled yet.",
    ],
    notes: [
      "This is not a vendor route statement yet. It is a neutral route intent that future implementation stages can translate after edge device details are confirmed.",
    ],
  }));
}

function buildSummaryRouteIntents(
  project: RoutingProject,
  routeDomain: RouteDomain,
  siteSummaries: SiteSummarizationReview[],
): RouteIntent[] {
  const routeIntents: RouteIntent[] = [];

  for (const summary of siteSummaries) {
    const destinationCidr = summary.currentSiteBlock ?? summary.minimumRequiredSummary;
    if (!destinationCidr) continue;

    const administrativeState: RouteAdministrativeState = summary.status === "good"
      ? "present"
      : summary.status === "review"
        ? "review"
        : "missing";

    routeIntents.push({
      id: routeIntentId([routeDomain.id, summary.siteId, "site-summary", destinationCidr]),
      name: `${findSiteName(project, summary.siteId)} site summary route`,
      routeDomainId: routeDomain.id,
      routeDomainName: routeDomain.name,
      siteId: summary.siteId,
      routeKind: "summary",
      destinationCidr,
      nextHopType: "site-gateway",
      nextHopObjectId: `device-${summary.siteId}-layer3-gateway`,
      administrativeState,
      truthState: summary.status === "good" ? "configured" : "proposed",
      routePurpose: "Represent the site-level aggregate that should be advertised or reviewed at routing boundaries.",
      evidence: [
        `Summarization review status is ${summary.status}.`,
        summary.minimumRequiredSummary ? `Minimum required summary is ${summary.minimumRequiredSummary}.` : "Minimum required summary could not be calculated.",
      ],
      notes: summary.notes.length > 0
        ? [...summary.notes]
        : ["Review whether this summary should be advertised, statically routed, or kept local."],
    });
  }

  return routeIntents;
}

function buildHubAndSpokeStaticRouteIntents(
  project: RoutingProject,
  routeDomain: RouteDomain,
  siteSummaries: SiteSummarizationReview[],
  transitPlan: TransitPlanRow[],
): RouteIntent[] {
  if (project.sites.length <= 1) return [];
  const hubSite = chooseHubSite(project);
  if (!hubSite) return [];

  const transitBySiteId = new Map(transitPlan.map((row) => [row.siteId, row]));
  const summaryBySiteId = new Map(siteSummaries.map((summary) => [summary.siteId, summary]));
  const hubSummary = summaryBySiteId.get(hubSite.id);
  const hubDestinationCidr = hubSummary?.currentSiteBlock ?? hubSummary?.minimumRequiredSummary;
  const routeIntents: RouteIntent[] = [];

  for (const summary of siteSummaries) {
    if (summary.siteId === hubSite.id) continue;
    const branchSite = project.sites.find((site) => site.id === summary.siteId);
    const branchDestinationCidr = summary.currentSiteBlock ?? summary.minimumRequiredSummary;
    if (!branchSite || !branchDestinationCidr) continue;

    const transit = transitBySiteId.get(summary.siteId);
    const hasTransit = Boolean(transit?.subnetCidr);
    const administrativeState: RouteAdministrativeState = hasTransit ? "proposed" : "missing";
    const transitLinkId = hasTransit ? `link-${summary.siteId}-wan-transit-${normalizeIdentifierSegment(transit?.subnetCidr ?? "pending")}` : undefined;

    routeIntents.push({
      id: routeIntentId([routeDomain.id, hubSite.id, "to", summary.siteId, branchDestinationCidr]),
      name: `${findSiteName(project, hubSite.id)} route to ${findSiteName(project, summary.siteId)}`,
      routeDomainId: routeDomain.id,
      routeDomainName: routeDomain.name,
      siteId: hubSite.id,
      routeKind: "static",
      destinationCidr: branchDestinationCidr,
      nextHopType: hasTransit ? "transit-link" : "engineer-review",
      nextHopObjectId: transitLinkId,
      administrativeState,
      truthState: "proposed",
      routePurpose: "Represent hub-side reachability to a branch summary block in the neutral implementation model.",
      evidence: [
        hasTransit
          ? `Transit plan exists for ${findSiteName(project, summary.siteId)}.`
          : `No transit plan exists for ${findSiteName(project, summary.siteId)}.`,
      ],
      notes: [
        "V1 validates this route against the backend transit-link object before treating it as usable route-table evidence.",
      ],
    });

    if (hubDestinationCidr) {
      routeIntents.push({
        id: routeIntentId([routeDomain.id, summary.siteId, "return-to", hubSite.id, hubDestinationCidr]),
        name: `${findSiteName(project, summary.siteId)} return route to ${findSiteName(project, hubSite.id)}`,
        routeDomainId: routeDomain.id,
        routeDomainName: routeDomain.name,
        siteId: summary.siteId,
        routeKind: "static",
        destinationCidr: hubDestinationCidr,
        nextHopType: hasTransit ? "transit-link" : "engineer-review",
        nextHopObjectId: transitLinkId,
        administrativeState,
        truthState: "proposed",
        routePurpose: "Represent branch-side return reachability to the hub summary block so path simulation can check bidirectional routing.",
        evidence: [
          hasTransit
            ? `Transit plan exists for ${findSiteName(project, summary.siteId)}; return path to hub can be reviewed.`
            : `No transit plan exists for ${findSiteName(project, summary.siteId)}; return path cannot be claimed.`,
        ],
        notes: [
          "Return route is explicit because V1 must not assume bidirectional reachability from a one-way hub route.",
        ],
      });
    }
  }

  return routeIntents;
}

function buildRouteConflictReviews(params: {
  model: RoutingNetworkObjectModel;
  routeIntents: RouteIntent[];
}): RoutingConflictReview[] {
  const reviews: RoutingConflictReview[] = [];
  const byDomainSiteDestination = new Map<string, RouteIntent[]>();

  for (const routeIntent of params.routeIntents) {
    const key = `${routeIntent.routeDomainId}|${routeIntent.siteId ?? "project"}|${routeIntent.destinationCidr}`;
    const current = byDomainSiteDestination.get(key) ?? [];
    current.push(routeIntent);
    byDomainSiteDestination.set(key, current);

    if ((routeIntent.nextHopType === "connected-interface" || routeIntent.nextHopType === "site-gateway" || routeIntent.nextHopType === "transit-link" || routeIntent.nextHopType === "security-boundary") && !nextHopObjectExists(routeIntent, params.model)) {
      reviews.push({
        id: reviewId([routeIntent.routeDomainId, routeIntent.id, "next-hop-missing"]),
        severity: routeIntent.administrativeState === "missing" ? "ERROR" : "WARNING",
        code: "ROUTING_NEXT_HOP_OBJECT_MISSING",
        title: "Route intent references a missing next-hop object",
        detail: `${routeIntent.name} points to ${routeIntent.nextHopObjectId ?? "no object"}, but that object is not present in the backend network model.`,
        routeDomainId: routeIntent.routeDomainId,
        affectedRouteIntentIds: [routeIntent.id],
        remediation: "Confirm the route next-hop as a modeled interface, transit link, site gateway, or security boundary before implementation planning.",
      });
    }
  }

  for (const routes of byDomainSiteDestination.values()) {
    if (routes.length <= 1) continue;
    const activeLike = routes.filter((route) => route.administrativeState !== "missing");
    if (activeLike.length <= 1) continue;
    reviews.push({
      id: reviewId([routes[0]?.routeDomainId ?? "domain", routes[0]?.siteId ?? "project", routes[0]?.destinationCidr ?? "destination", "duplicate"]),
      severity: "WARNING",
      code: "ROUTING_DUPLICATE_DESTINATION_INTENT",
      title: "Multiple route intents target the same destination from the same scope",
      detail: `${activeLike.length} route intents target ${routes[0]?.destinationCidr} from ${routes[0]?.siteId ?? "project"} in ${routes[0]?.routeDomainName ?? "a route domain"}.`,
      routeDomainId: routes[0]?.routeDomainId ?? "unknown",
      affectedRouteIntentIds: activeLike.map((route) => route.id),
      remediation: "Keep the best route intent and mark backup, floating, or intentionally duplicated routes explicitly before vendor translation.",
    });
  }

  const routeDomains = new Set(params.routeIntents.map((routeIntent) => routeIntent.routeDomainId));
  for (const routeDomainId of routeDomains) {
    const domainRoutes = params.routeIntents.filter((routeIntent) => routeIntent.routeDomainId === routeDomainId);
    for (let index = 0; index < domainRoutes.length; index += 1) {
      const current = domainRoutes[index];
      if (!current || current.administrativeState === "missing") continue;
      const currentParsed = routeParsed(current);
      if (!currentParsed) continue;
      for (let compareIndex = index + 1; compareIndex < domainRoutes.length; compareIndex += 1) {
        const other = domainRoutes[compareIndex];
        if (!other || other.administrativeState === "missing") continue;
        if (current.siteId !== other.siteId) continue;
        if (current.routeKind === "connected" && other.routeKind === "summary") continue;
        if (current.routeKind === "summary" && other.routeKind === "connected") continue;
        const otherParsed = routeParsed(other);
        if (!otherParsed || !cidrsOverlap(currentParsed, otherParsed)) continue;
        if (current.destinationCidr === other.destinationCidr) continue;

        reviews.push({
          id: reviewId([routeDomainId, current.id, other.id, "overlap"]),
          severity: "INFO",
          code: "ROUTING_OVERLAPPING_DESTINATION_REVIEW",
          title: "Overlapping route destinations require longest-prefix review",
          detail: `${current.destinationCidr} overlaps ${other.destinationCidr} within ${current.routeDomainName}. This can be valid, but the preferred path must be intentional.`,
          routeDomainId,
          affectedRouteIntentIds: [current.id, other.id],
          remediation: "Confirm whether longest-prefix preference is intended, especially where summaries, defaults, and statics interact.",
        });
      }
    }
  }

  return reviews.sort((left, right) => `${left.severity}-${left.code}-${left.detail}`.localeCompare(`${right.severity}-${right.code}-${right.detail}`));
}

function buildRouteArtifacts(params: {
  project: RoutingProject;
  model: RoutingNetworkObjectModel;
  siteSummaries: SiteSummarizationReview[];
  transitPlan: TransitPlanRow[];
}) {
  const routeIntents: RouteIntent[] = [];

  for (const routeDomain of params.model.routeDomains) {
    routeIntents.push(...buildConnectedRouteIntents(routeDomain, params.model));
    routeIntents.push(...buildDefaultRouteIntents(params.project, routeDomain, params.model));
    routeIntents.push(...buildSummaryRouteIntents(params.project, routeDomain, params.siteSummaries));
    routeIntents.push(...buildHubAndSpokeStaticRouteIntents(params.project, routeDomain, params.siteSummaries, params.transitPlan));
  }

  const sortedRouteIntents = routeIntents.sort((left, right) => left.id.localeCompare(right.id));
  const routeEntries = buildRouteEntries(sortedRouteIntents);
  const routeConflictReviews = buildRouteConflictReviews({ model: params.model, routeIntents: sortedRouteIntents });
  const siteReachabilityChecks = buildSiteReachabilityChecks({
    project: params.project,
    routeDomains: params.model.routeDomains,
    siteSummaries: params.siteSummaries,
    routeIntents: sortedRouteIntents,
  });

  const routeTables: RouteDomainRoutingTable[] = params.model.routeDomains.map((routeDomain) => {
    const domainRoutes = sortedRouteIntents.filter((routeIntent) => routeIntent.routeDomainId === routeDomain.id);
    const domainEntries = routeEntries.filter((entry) => entry.routeDomainId === routeDomain.id);
    const domainConflicts = routeConflictReviews.filter((review) => review.routeDomainId === routeDomain.id);
    const domainReachabilityChecks = siteReachabilityChecks.filter((check) => check.routeDomainId === routeDomain.id);
    return {
      routeDomainId: routeDomain.id,
      routeDomainName: routeDomain.name,
      connectedRouteCount: domainRoutes.filter((routeIntent) => routeIntent.routeKind === "connected").length,
      defaultRouteCount: domainRoutes.filter((routeIntent) => routeIntent.routeKind === "default").length,
      staticRouteCount: domainRoutes.filter((routeIntent) => routeIntent.routeKind === "static").length,
      summaryRouteCount: domainRoutes.filter((routeIntent) => routeIntent.routeKind === "summary").length,
      missingRouteCount: domainRoutes.filter((routeIntent) => routeIntent.administrativeState === "missing").length,
      routeEntryCount: domainEntries.length,
      conflictCount: domainConflicts.length,
      reachabilityCheckCount: domainReachabilityChecks.length,
      routeIntents: domainRoutes,
      routeEntries: domainEntries,
      conflictReviews: domainConflicts,
      reachabilityChecks: domainReachabilityChecks,
      notes: [
        "V1 route table is a backend neutral control-plane simulation. It is still not a vendor RIB/FIB dump.",
        "Entries are ordered by domain, site, longest prefix, and neutral administrative distance to expose default/static/summary interactions before implementation.",
      ],
    };
  });

  return { routeIntents: sortedRouteIntents, routeEntries, routeConflictReviews, siteReachabilityChecks, routeTables };
}

function bestRoutesForDestination(params: {
  sourceSiteId: string;
  destinationCidr?: string;
  routeDomainId: string;
  routeIntents: RouteIntent[];
}) {
  const candidates = params.routeIntents.filter((routeIntent) => {
    if (routeIntent.routeDomainId !== params.routeDomainId) return false;
    if (routeIntent.siteId !== params.sourceSiteId) return false;
    if (routeIntent.administrativeState === "missing") return false;
    if (routeIntent.routeKind === "default") return false;
    return routeCoversDestination(routeIntent, params.destinationCidr);
  });

  return candidates.sort((left, right) => {
    const leftParsed = routeParsed(left);
    const rightParsed = routeParsed(right);
    const prefix = (rightParsed?.prefix ?? -1) - (leftParsed?.prefix ?? -1);
    if (prefix !== 0) return prefix;
    const distance = routeAdministrativeDistance(left.routeKind) - routeAdministrativeDistance(right.routeKind);
    if (distance !== 0) return distance;
    return left.id.localeCompare(right.id);
  });
}

function routeMatchState(routes: RouteIntent[]): RouteMatchState {
  if (routes.length === 0) return "missing";
  return routes.some((route) => route.administrativeState === "present" || route.administrativeState === "proposed") ? "reachable" : "review";
}

function combineRouteLegStates(states: RouteMatchState[]): RouteMatchState {
  if (states.some((state) => state === "missing")) return "missing";
  if (states.some((state) => state === "review")) return "review";
  return "reachable";
}

function hubTransitPathForDestination(params: {
  sourceSiteId: string;
  destinationSiteId: string;
  hubSiteId?: string;
  sourceSummaryCidr?: string;
  destinationSummaryCidr?: string;
  hubSummaryCidr?: string;
  routeDomainId: string;
  routeIntents: RouteIntent[];
}) {
  if (!params.hubSiteId || params.sourceSiteId === params.hubSiteId || params.destinationSiteId === params.hubSiteId) {
    return null;
  }

  const sourceToHubRoutes = bestRoutesForDestination({
    sourceSiteId: params.sourceSiteId,
    destinationCidr: params.hubSummaryCidr,
    routeDomainId: params.routeDomainId,
    routeIntents: params.routeIntents,
  });
  const hubToDestinationRoutes = bestRoutesForDestination({
    sourceSiteId: params.hubSiteId,
    destinationCidr: params.destinationSummaryCidr,
    routeDomainId: params.routeDomainId,
    routeIntents: params.routeIntents,
  });
  const destinationToHubRoutes = bestRoutesForDestination({
    sourceSiteId: params.destinationSiteId,
    destinationCidr: params.hubSummaryCidr,
    routeDomainId: params.routeDomainId,
    routeIntents: params.routeIntents,
  });
  const hubToSourceRoutes = bestRoutesForDestination({
    sourceSiteId: params.hubSiteId,
    destinationCidr: params.sourceSummaryCidr,
    routeDomainId: params.routeDomainId,
    routeIntents: params.routeIntents,
  });

  const forwardState = combineRouteLegStates([routeMatchState(sourceToHubRoutes), routeMatchState(hubToDestinationRoutes)]);
  const returnState = combineRouteLegStates([routeMatchState(destinationToHubRoutes), routeMatchState(hubToSourceRoutes)]);

  return {
    forwardState,
    returnState,
    forwardRoutes: [...sourceToHubRoutes, ...hubToDestinationRoutes],
    returnRoutes: [...destinationToHubRoutes, ...hubToSourceRoutes],
  };
}

function buildSiteReachabilityChecks(params: {
  project: RoutingProject;
  routeDomains: RouteDomain[];
  siteSummaries: SiteSummarizationReview[];
  routeIntents: RouteIntent[];
}): SiteToSiteReachabilityCheck[] {
  const checks: SiteToSiteReachabilityCheck[] = [];
  if (params.project.sites.length <= 1) return checks;

  const summaryBySiteId = new Map(params.siteSummaries.map((summary) => [summary.siteId, summary]));
  const hubSite = chooseHubSite(params.project);
  const hubSummary = hubSite ? summaryBySiteId.get(hubSite.id) : undefined;
  const hubSummaryCidr = hubSummary?.currentSiteBlock ?? hubSummary?.minimumRequiredSummary;

  for (const routeDomain of params.routeDomains) {
    for (const sourceSite of params.project.sites) {
      for (const destinationSite of params.project.sites) {
        if (sourceSite.id === destinationSite.id) continue;
        const destinationSummary = summaryBySiteId.get(destinationSite.id);
        const sourceSummary = summaryBySiteId.get(sourceSite.id);
        const destinationSummaryCidr = destinationSummary?.currentSiteBlock ?? destinationSummary?.minimumRequiredSummary;
        const sourceSummaryCidr = sourceSummary?.currentSiteBlock ?? sourceSummary?.minimumRequiredSummary;
        const forwardRoutes = bestRoutesForDestination({
          sourceSiteId: sourceSite.id,
          destinationCidr: destinationSummaryCidr,
          routeDomainId: routeDomain.id,
          routeIntents: params.routeIntents,
        });
        const returnRoutes = bestRoutesForDestination({
          sourceSiteId: destinationSite.id,
          destinationCidr: sourceSummaryCidr,
          routeDomainId: routeDomain.id,
          routeIntents: params.routeIntents,
        });
        let effectiveForwardRoutes = forwardRoutes;
        let effectiveReturnRoutes = returnRoutes;
        let forwardState = routeMatchState(forwardRoutes);
        let returnState = routeMatchState(returnRoutes);
        const hubTransitPath = hubTransitPathForDestination({
          sourceSiteId: sourceSite.id,
          destinationSiteId: destinationSite.id,
          hubSiteId: hubSite?.id,
          sourceSummaryCidr,
          destinationSummaryCidr,
          hubSummaryCidr,
          routeDomainId: routeDomain.id,
          routeIntents: params.routeIntents,
        });

        if (hubTransitPath && forwardState === "missing" && hubTransitPath.forwardState !== "missing") {
          forwardState = hubTransitPath.forwardState;
          effectiveForwardRoutes = hubTransitPath.forwardRoutes;
        }
        if (hubTransitPath && returnState === "missing" && hubTransitPath.returnState !== "missing") {
          returnState = hubTransitPath.returnState;
          effectiveReturnRoutes = hubTransitPath.returnRoutes;
        }

        const overallState: SiteToSiteReachabilityCheck["overallState"] = forwardState === "missing"
          ? "missing-forward"
          : returnState === "missing"
            ? "missing-return"
            : forwardState === "review" || returnState === "review"
              ? "review"
              : "satisfied";

        checks.push({
          id: `site-reachability-${normalizeIdentifierSegment(routeDomain.id)}-${normalizeIdentifierSegment(sourceSite.id)}-to-${normalizeIdentifierSegment(destinationSite.id)}`,
          routeDomainId: routeDomain.id,
          routeDomainName: routeDomain.name,
          sourceSiteId: sourceSite.id,
          sourceSiteName: findSiteName(params.project, sourceSite.id),
          destinationSiteId: destinationSite.id,
          destinationSiteName: findSiteName(params.project, destinationSite.id),
          destinationSummaryCidr,
          forwardState,
          returnState,
          overallState,
          forwardRouteIntentIds: effectiveForwardRoutes.map((route) => route.id),
          returnRouteIntentIds: effectiveReturnRoutes.map((route) => route.id),
          notes: [
            destinationSummaryCidr
              ? `Destination summary checked: ${destinationSummaryCidr}.`
              : "Destination summary is missing, so forward-path proof is not possible.",
            sourceSummaryCidr
              ? `Return summary checked: ${sourceSummaryCidr}.`
              : "Source summary is missing, so return-path proof is not possible.",
            hubTransitPath && (forwardState !== routeMatchState(forwardRoutes) || returnState !== routeMatchState(returnRoutes))
              ? `V1 hub-transit reconciliation: direct branch-to-branch route was absent, but path evidence exists through ${hubSite ? findSiteName(params.project, hubSite.id) : "the hub"}.`
              : null,
          ].filter(Boolean) as string[],
        });
      }
    }
  }

  return checks.sort((left, right) => left.id.localeCompare(right.id));
}

function addReachabilityFinding(
  findings: RoutingSegmentationReachabilityFinding[],
  finding: RoutingSegmentationReachabilityFinding,
) {
  if (findings.some((item) => item.code === finding.code && item.detail === finding.detail)) return;
  findings.push(finding);
}

function buildReachabilityFindings(params: {
  project: RoutingProject;
  model: RoutingNetworkObjectModel;
  routeIntents: RouteIntent[];
  routeConflictReviews: RoutingConflictReview[];
  siteReachabilityChecks: SiteToSiteReachabilityCheck[];
  siteSummaries: SiteSummarizationReview[];
  transitPlan: TransitPlanRow[];
}) {
  const findings: RoutingSegmentationReachabilityFinding[] = [];

  for (const routeDomain of params.model.routeDomains) {
    const connectedRoutes = params.routeIntents.filter((routeIntent) => routeIntent.routeDomainId === routeDomain.id && routeIntent.routeKind === "connected");
    const missingConnectedRoutes = connectedRoutes.filter((routeIntent) => routeIntent.administrativeState === "review" || !routeIntent.nextHopObjectId);

    for (const routeIntent of missingConnectedRoutes) {
      addReachabilityFinding(findings, {
        severity: "ERROR",
        code: "ROUTING_SUBNET_WITHOUT_INTERFACE_OWNER",
        title: "Routed subnet has no interface owner",
        detail: `${routeIntent.destinationCidr} is carried by ${routeDomain.name}, but no modeled routed interface owns it.`,
        routeDomainId: routeDomain.id,
        affectedObjectIds: [routeIntent.id, routeIntent.destinationCidr],
        remediation: "Attach every routed subnet to a modeled gateway, loopback, or transit interface before implementation planning.",
      });
    }

    if (routeDomain.defaultRouteState === "required") {
      const hasDefaultRoute = params.routeIntents.some((routeIntent) => routeIntent.routeDomainId === routeDomain.id && routeIntent.routeKind === "default" && routeIntent.administrativeState !== "missing");
      if (!hasDefaultRoute) {
        addReachabilityFinding(findings, {
          severity: "WARNING",
          code: "ROUTING_DEFAULT_ROUTE_REQUIRED_BUT_NOT_MODELED",
          title: "Default route intent is required but not modeled",
          detail: `${routeDomain.name} requires a default route for upstream/WAN access, but no usable default-route intent was generated.`,
          routeDomainId: routeDomain.id,
          affectedObjectIds: [routeDomain.id],
          remediation: "Confirm edge firewall/router ownership and add a default-route implementation target.",
        });
      }
    }
  }

  if (params.project.sites.length > 1) {
    const transitSiteIds = new Set(params.transitPlan.map((row) => row.siteId));
    const hubSite = chooseHubSite(params.project);

    for (const site of params.project.sites) {
      if (site.id === hubSite?.id) continue;
      if (!transitSiteIds.has(site.id)) {
        addReachabilityFinding(findings, {
          severity: "ERROR",
          code: "ROUTING_BRANCH_WITHOUT_TRANSIT_PATH",
          title: "Branch site has no modeled transit path",
          detail: `${findSiteName(params.project, site.id)} is part of a multi-site design but has no existing or proposed WAN transit plan.`,
          affectedObjectIds: [site.id],
          remediation: "Add a WAN transit link, SD-WAN edge, routed VPN, or explicit deferred-state note before claiming branch reachability.",
        });
      }
    }
  }

  for (const summary of params.siteSummaries) {
    if (summary.status === "missing") {
      addReachabilityFinding(findings, {
        severity: "WARNING",
        code: "ROUTING_SITE_SUMMARY_MISSING",
        title: "Site summary is missing",
        detail: `${findSiteName(params.project, summary.siteId)} does not have a confirmed site summary route boundary.`,
        affectedObjectIds: [summary.siteId],
        remediation: "Confirm a site summary block so route advertisements and static route targets do not become fragmented.",
      });
    }

    if (summary.status === "review") {
      addReachabilityFinding(findings, {
        severity: "WARNING",
        code: "ROUTING_SITE_SUMMARY_REQUIRES_REVIEW",
        title: "Site summary requires routing review",
        detail: `${findSiteName(params.project, summary.siteId)} has a site summary issue that can affect route aggregation.`,
        affectedObjectIds: [summary.siteId],
        remediation: "Review the current site block against the minimum required summary before advertising or documenting route summaries.",
      });
    }
  }

  for (const conflict of params.routeConflictReviews) {
    if (conflict.severity === "INFO") continue;
    addReachabilityFinding(findings, {
      severity: conflict.severity,
      code: conflict.code,
      title: conflict.title,
      detail: conflict.detail,
      routeDomainId: conflict.routeDomainId,
      affectedObjectIds: conflict.affectedRouteIntentIds,
      remediation: conflict.remediation,
    });
  }

  for (const check of params.siteReachabilityChecks) {
    if (check.overallState === "satisfied") continue;
    addReachabilityFinding(findings, {
      severity: check.overallState === "review" ? "WARNING" : "ERROR",
      code: check.overallState === "missing-forward" ? "ROUTING_SITE_TO_SITE_FORWARD_PATH_MISSING" : check.overallState === "missing-return" ? "ROUTING_SITE_TO_SITE_RETURN_PATH_MISSING" : "ROUTING_SITE_TO_SITE_PATH_REVIEW",
      title: check.overallState === "missing-forward" ? "Site-to-site forward path is missing" : check.overallState === "missing-return" ? "Site-to-site return path is missing" : "Site-to-site path requires review",
      detail: `${check.sourceSiteName} to ${check.destinationSiteName} in ${check.routeDomainName}: forward=${check.forwardState}, return=${check.returnState}.`,
      routeDomainId: check.routeDomainId,
      affectedObjectIds: [check.sourceSiteId, check.destinationSiteId, ...check.forwardRouteIntentIds, ...check.returnRouteIntentIds],
      remediation: "Model both forward and return route intents before claiming bidirectional site reachability.",
    });
  }

  return findings.sort((left, right) => `${left.severity}-${left.code}-${left.detail}`.localeCompare(`${right.severity}-${right.code}-${right.detail}`));
}

function findZoneByRole(securityZones: SecurityZone[], zoneRole: "internal" | "guest" | "management" | "dmz" | "voice" | "iot" | "wan" | "transit" | "unknown") {
  return securityZones.find((zone) => zone.zoneRole === zoneRole);
}

function findPolicyActionForExpectation(policyRules: PolicyRule[], sourceZoneId: string, destinationZoneId: string, expectedAction: "allow" | "deny" | "review") {
  const pairRules = policyRules.filter((rule) => rule.sourceZoneId === sourceZoneId && rule.destinationZoneId === destinationZoneId);
  if (pairRules.length === 0) return undefined;
  if (expectedAction === "deny") return pairRules.find((rule) => rule.action === "deny")?.action ?? pairRules[0].action;
  if (expectedAction === "allow") return pairRules.find((rule) => rule.action === "allow")?.action ?? pairRules[0].action;
  return pairRules.find((rule) => rule.action === "review")?.action ?? pairRules[0].action;
}

function segmentationExpectationState(expectedAction: "allow" | "deny" | "review", policyAction?: "allow" | "deny" | "review"): "satisfied" | "missing-policy" | "conflict" | "review" {
  if (!policyAction) return expectedAction === "review" ? "review" : "missing-policy";
  if (expectedAction === "review") return "review";
  if (policyAction === expectedAction) return "satisfied";
  return "conflict";
}

function createSegmentationFlowExpectation(params: {
  id: string;
  name: string;
  sourceZone: SecurityZone;
  destinationZone: SecurityZone;
  expectedAction: "allow" | "deny" | "review";
  services: string[];
  rationale: string;
  policyRules: PolicyRule[];
  severityIfMissing: "ERROR" | "WARNING";
}): SegmentationFlowExpectation {
  const observedPolicyAction = findPolicyActionForExpectation(params.policyRules, params.sourceZone.id, params.destinationZone.id, params.expectedAction);
  const state = segmentationExpectationState(params.expectedAction, observedPolicyAction);

  return {
    id: params.id,
    name: params.name,
    sourceZoneId: params.sourceZone.id,
    sourceZoneName: params.sourceZone.name,
    destinationZoneId: params.destinationZone.id,
    destinationZoneName: params.destinationZone.name,
    expectedAction: params.expectedAction,
    observedPolicyAction,
    services: params.services,
    state,
    severityIfMissing: params.severityIfMissing,
    rationale: params.rationale,
    notes: [
      observedPolicyAction
        ? `Observed policy action is ${observedPolicyAction}.`
        : "No matching policy rule is modeled for this zone-to-zone expectation.",
    ],
  };
}

function buildSegmentationExpectations(model: RoutingNetworkObjectModel) {
  const expectations: SegmentationFlowExpectation[] = [];
  const internalZone = findZoneByRole(model.securityZones, "internal");
  const guestZone = findZoneByRole(model.securityZones, "guest");
  const managementZone = findZoneByRole(model.securityZones, "management");
  const dmzZone = findZoneByRole(model.securityZones, "dmz");
  const wideAreaNetworkZone = findZoneByRole(model.securityZones, "wan");

  if (guestZone && internalZone) {
    expectations.push(createSegmentationFlowExpectation({
      id: "segmentation-expectation-deny-guest-to-internal",
      name: "Guest must not reach corporate internal networks",
      sourceZone: guestZone,
      destinationZone: internalZone,
      expectedAction: "deny",
      services: ["any"],
      rationale: "Guest isolation is a baseline segmentation requirement.",
      policyRules: model.policyRules,
      severityIfMissing: "ERROR",
    }));
  }

  if (guestZone && wideAreaNetworkZone) {
    expectations.push(createSegmentationFlowExpectation({
      id: "segmentation-expectation-allow-guest-to-internet",
      name: "Guest internet access should be explicit",
      sourceZone: guestZone,
      destinationZone: wideAreaNetworkZone,
      expectedAction: "allow",
      services: ["dns", "http", "https"],
      rationale: "Guest access should be internet-only unless a specific exception is documented.",
      policyRules: model.policyRules,
      severityIfMissing: "WARNING",
    }));
  }

  if (managementZone) {
    expectations.push(createSegmentationFlowExpectation({
      id: "segmentation-expectation-allow-management-to-management",
      name: "Management plane access should be explicit",
      sourceZone: managementZone,
      destinationZone: managementZone,
      expectedAction: "allow",
      services: ["ssh", "https", "snmp", "icmp"],
      rationale: "Device administration should originate from a controlled management zone.",
      policyRules: model.policyRules,
      severityIfMissing: "WARNING",
    }));
  }

  if (dmzZone && internalZone) {
    expectations.push(createSegmentationFlowExpectation({
      id: "segmentation-expectation-review-dmz-to-internal",
      name: "DMZ to internal access must be application-specific",
      sourceZone: dmzZone,
      destinationZone: internalZone,
      expectedAction: "review",
      services: ["application-specific"],
      rationale: "DMZ systems should not have broad trust into internal networks.",
      policyRules: model.policyRules,
      severityIfMissing: "WARNING",
    }));
  }

  if (internalZone && managementZone) {
    expectations.push(createSegmentationFlowExpectation({
      id: "segmentation-expectation-review-internal-to-management",
      name: "Internal user networks should not broadly administer devices",
      sourceZone: internalZone,
      destinationZone: managementZone,
      expectedAction: "deny",
      services: ["ssh", "https", "snmp"],
      rationale: "Management access should be limited to management sources, not all internal users.",
      policyRules: model.policyRules,
      severityIfMissing: "WARNING",
    }));
  }

  return expectations.sort((left, right) => left.id.localeCompare(right.id));
}

function buildSegmentationFindings(expectations: SegmentationFlowExpectation[]) {
  return expectations
    .filter((expectation) => expectation.state === "missing-policy" || expectation.state === "conflict")
    .map<RoutingSegmentationReachabilityFinding>((expectation) => ({
      severity: expectation.state === "conflict" || expectation.severityIfMissing === "ERROR" ? "ERROR" : "WARNING",
      code: expectation.state === "conflict" ? "SEGMENTATION_POLICY_CONFLICT" : "SEGMENTATION_POLICY_MISSING",
      title: expectation.state === "conflict" ? "Segmentation policy conflicts with expectation" : "Segmentation policy is missing",
      detail: `${expectation.name}: expected ${expectation.expectedAction} from ${expectation.sourceZoneName} to ${expectation.destinationZoneName}, observed ${expectation.observedPolicyAction ?? "no rule"}.`,
      affectedObjectIds: [expectation.id, expectation.sourceZoneId, expectation.destinationZoneId],
      remediation: expectation.state === "conflict"
        ? "Correct the policy action or change the stated segmentation requirement before implementation."
        : "Add an explicit policy rule or mark the flow as intentionally deferred for engineer review.",
    }));
}

export function buildRoutingSegmentationModel(params: {
  project: RoutingProject;
  networkObjectModel: RoutingNetworkObjectModel;
  siteSummaries: SiteSummarizationReview[];
  transitPlan: TransitPlanRow[];
}): RoutingSegmentationModel {
  const { routeIntents, routeEntries, routeConflictReviews, siteReachabilityChecks, routeTables } = buildRouteArtifacts({
    project: params.project,
    model: params.networkObjectModel,
    siteSummaries: params.siteSummaries,
    transitPlan: params.transitPlan,
  });
  const routingFindings = buildReachabilityFindings({
    project: params.project,
    model: params.networkObjectModel,
    routeIntents,
    routeConflictReviews,
    siteReachabilityChecks,
    siteSummaries: params.siteSummaries,
    transitPlan: params.transitPlan,
  });
  const segmentationExpectations = buildSegmentationExpectations(params.networkObjectModel);
  const segmentationFindings = buildSegmentationFindings(segmentationExpectations);
  const reachabilityFindings = [...routingFindings, ...segmentationFindings].sort((left, right) => `${left.severity}-${left.code}-${left.detail}`.localeCompare(`${right.severity}-${right.code}-${right.detail}`));
  const missingRouteCount = routeIntents.filter((routeIntent) => routeIntent.administrativeState === "missing").length;
  const missingPolicyCount = segmentationExpectations.filter((expectation) => expectation.state === "missing-policy").length;
  const conflictingPolicyCount = segmentationExpectations.filter((expectation) => expectation.state === "conflict").length;
  const blockingFindingCount = reachabilityFindings.filter((finding) => finding.severity === "ERROR").length;
  const missingForwardPathCount = siteReachabilityChecks.filter((check) => check.overallState === "missing-forward").length;
  const missingReturnPathCount = siteReachabilityChecks.filter((check) => check.overallState === "missing-return").length;
  const nextHopReviewCount = routeConflictReviews.filter((review) => review.code === "ROUTING_NEXT_HOP_OBJECT_MISSING").length;
  const routeConflictCount = routeConflictReviews.filter((review) => review.severity !== "INFO").length;

  return {
    summary: {
      routeIntentCount: routeIntents.length,
      routeTableCount: routeTables.length,
      connectedRouteCount: routeIntents.filter((routeIntent) => routeIntent.routeKind === "connected").length,
      defaultRouteCount: routeIntents.filter((routeIntent) => routeIntent.routeKind === "default").length,
      staticRouteCount: routeIntents.filter((routeIntent) => routeIntent.routeKind === "static").length,
      summaryRouteCount: routeIntents.filter((routeIntent) => routeIntent.routeKind === "summary").length,
      missingRouteCount,
      segmentationExpectationCount: segmentationExpectations.length,
      satisfiedSegmentationExpectationCount: segmentationExpectations.filter((expectation) => expectation.state === "satisfied").length,
      missingPolicyCount,
      conflictingPolicyCount,
      reachabilityFindingCount: reachabilityFindings.length,
      blockingFindingCount,
      routeEntryCount: routeEntries.length,
      routeConflictCount,
      siteReachabilityCheckCount: siteReachabilityChecks.length,
      missingForwardPathCount,
      missingReturnPathCount,
      nextHopReviewCount,
      routingReadiness: blockingFindingCount > 0 || missingRouteCount > 0 || missingForwardPathCount > 0 || missingReturnPathCount > 0 ? "blocked" : reachabilityFindings.length > 0 || routeConflictReviews.length > 0 ? "review" : "ready",
      segmentationReadiness: conflictingPolicyCount > 0 ? "blocked" : missingPolicyCount > 0 ? "review" : "ready",
      notes: [
        "V1 upgrades backend routing from basic intent to a neutral route-table and reachability simulation foundation.",
        "The engine validates next-hop object references, route overlaps, duplicate destinations, and bidirectional site reachability without generating vendor commands yet.",
      ],
    },
    routeTables,
    routeIntents,
    routeEntries,
    routeConflictReviews,
    siteReachabilityChecks,
    segmentationExpectations,
    reachabilityFindings,
  };
}
