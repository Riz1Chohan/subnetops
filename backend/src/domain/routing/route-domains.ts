import type { RouteDomain, RouteIntent } from './types.js';

export function routeDomainHasSubnet(routeDomain: RouteDomain, subnetCidr: string): boolean {
  return routeDomain.subnetCidrs.includes(subnetCidr);
}

export function routeIntentsForDomain(routeIntents: RouteIntent[], routeDomainId: string): RouteIntent[] {
  return routeIntents.filter((intent) => intent.routeDomainId === routeDomainId);
}

export function routeDomainReadiness(routeDomain: RouteDomain, routeIntents: RouteIntent[]): 'ready' | 'review' | 'blocked' {
  if (routeDomain.summarizationState === 'blocked') return 'blocked';
  if (routeDomain.summarizationState === 'review') return 'review';
  if (routeIntents.some((intent) => intent.administrativeState === 'missing')) return 'blocked';
  if (routeIntents.some((intent) => intent.administrativeState === 'review')) return 'review';
  return 'ready';
}
